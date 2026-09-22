import corpus from '../data/knowledge.json';
export type Region = '北京市'|'上海市'|'浙江省'|'江苏省';
export type Medium = '水'|'土壤'|'气体';
export type Document = { id:string; code:string; codes?:string[]; title:string; region:string; regions?:Region[]; topic:string; published:string|null; effective:string|null; end:string|null; kind:string; source:string; statusSource?:string; note:string; url:string|null; checked:string; available:boolean; hash?:string; pdf?:string; pages?:number; error?:string };
export type Chunk = { id:string; docId:string; page:number|null; text:string };
export const documents = corpus.documents as Document[];
export const chunks = corpus.chunks as Chunk[];
export const today = () => new Date().toISOString().slice(0,10);
export function status(doc:Document,date:string) {
  if(doc.end && date >= doc.end) return '已替代';
  if(doc.effective && date < doc.effective) return '尚未实施';
  if(!doc.effective) return '历史信息';
  return '已实施 · 状态需持续核验';
}
export function applicable(doc:Document,date:string) {
  return !!doc.effective && doc.effective<=date && (!doc.end || doc.end>date) && doc.available;
}
export function appliesTo(doc:Document,region:string) {
  return doc.region==='全国' || doc.region===region || !!doc.regions?.includes(region as Region);
}
export function medium(doc:Document):Medium {
  return doc.topic==='土壤采样'?'土壤':doc.topic==='气体采样'?'气体':'水';
}
export function validDate(value:unknown): value is string {
  if(typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(value);return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10)===value;
}
const aliases:[RegExp,string][] = [[/cod/gi,'化学需氧量'],[/nh3[-－]?n/gi,'氨氮'],[/\btn\b/gi,'总氮'],[/\btp\b/gi,'总磷'],[/\bss\b/gi,'悬浮物']];
export function normalize(input:string) {
  let text=input.toLowerCase(); for(const [pattern,replacement] of aliases)text=text.replace(pattern,replacement);
  return text.replace(/[\s/·—－\-]/g,'');
}
const codeVariants=(doc:Document)=>doc.codes||[doc.code.split(' · ')[0]];
export function retrieve(question:string,date:string,topic:string,region='浙江省') {
  const query=normalize(question);
  const explicit=documents.find(d=>codeVariants(d).some(code=>query.includes(normalize(code))))
    || documents.find(d=>codeVariants(d).some(value=>{const code=normalize(value).replace(/\d{4}$/,'');return code.length>3&&query.includes(code);}));
  const terms=['化学需氧量','氨氮','总氮','总磷','悬浮物','瞬时值','日均值','采样','布点','保存','保护剂','容器','流转','制备','质量控制','地表水','地下水','土壤','环境空气','固定源','废气','挥发性有机物','voc','气袋','罐采样','吸收管','吸附管','烟道','排气筒','无组织','采样孔','监测点位','流量校准','气密性','监测','自行监测','修改单','回用','排放限值','新建','现有','农村','城镇','适用范围','许可证'].filter(x=>query.includes(x));
  const grams=[...new Set(Array.from(query).slice(0,-1).map((_,i)=>query.slice(i,i+2)))].filter(x=>!['污水','处理','标准','什么','怎么','要求','多少','浙江','江苏','上海','北京','可以','哪些'].includes(x));
  const scored=chunks.flatMap(chunk=>{
    const doc=documents.find(x=>x.id===chunk.docId)!;
    if(!applicable(doc,date)) return [];
    if(!appliesTo(doc,region))return [];
    if(['土壤采样','水样采集','气体采样'].includes(topic) && doc.topic!==topic)return [];
    if(topic==='农村污水' && doc.topic==='城镇污水')return [];
    if(topic==='城镇污水' && doc.topic==='农村污水')return [];
    if(explicit && doc.id!==explicit.id)return [];
    const text=normalize(chunk.text), metadata=normalize(doc.code+doc.title);
    let score=terms.reduce((n,t)=>n+(text.includes(t)?3:0),0)+grams.reduce((n,t)=>n+(text.includes(t)?0.4:0),0);
    if(codeVariants(doc).some(code=>query.includes(normalize(code))))score+=10;
    if(metadata.includes(query) && query.length>3) score+=6;
    if(/适用|执行依据/.test(query) && /1\s*(适用范围|范围)/.test(chunk.text))score+=9;
    if(chunk.text.length<400)score*=0.4;
    if(chunk.text.includes('规范性引用文件') && !/适用|范围/.test(query) && chunk.text.length<1800)score*=0.7;
    if(score<=2.2)return [];
    if(doc.region===region)score+=12;
    if(topic===doc.topic)score+=1;
    return [{...chunk,document:doc,score}];
  });
  return scored.sort((a,b)=>b.score-a.score).slice(0,6);
}
export function lookupVersion(question:string,date:string) {
  if(!/版本|现行|废止|替代|实施|还能用|有效/.test(question))return null;
  const query=normalize(question);
  let docs=documents.filter(d=>codeVariants(d).some(code=>query.includes(normalize(code))));
  if(query.includes('gb18918') || /2025.*修改单/.test(question))docs=documents.filter(d=>d.id==='gb-amendment'||d.id==='gb-urban');
  if(!docs.length)return null;
  return {
    answer:'按查询日期 '+date+' 核对：\n\n'+docs.map((d,i)=>d.code+'：'+status(d,date)+'。'+(d.effective?'本记录版本实施日期为 '+d.effective+'。':'')+d.note+' ['+(i+1)+']').join('\n\n')+'\n\n以上为已核验的版本信息；具体项目适用性仍需核对原文及许可证。',
    citations:docs.map((d,i)=>({number:i+1,id:d.id+'-metadata',docId:d.id,title:d.title,code:d.code,page:null,text:'【版本元数据，非条款原文】\n实施日期：'+(d.effective||'未核验')+'\n替代生效日期：'+(d.end||'未收录')+'\n核验日期：'+d.checked+'\n'+d.note,source:d.statusSource||d.source,pdf:d.pdf,status:status(d,date),type:'metadata'}))
  };
}
export function clarify(question:string,topic:string,region='浙江省'):string|null {
  if(topic==='气体采样' && /限值|达标|超标|排放标准/.test(question))return '当前气体知识库收录的是环境空气与固定污染源废气的采样、监测和点位规范，尚未覆盖完整的行业及地方大气污染物排放限值。请补充行业、污染物、排放形式和许可证要求后，再核对对应排放标准。';
  if((topic==='企业纳管' || /纳管|企业.*废水|工业.*废水|下水道/.test(question)) && !['上海市','北京市'].includes(region))return '企业纳管与污水处理厂尾水排放是不同场景。当前地区尚未收录完整的综合排放和行业间接排放标准，无法据此确定企业纳管限值。请补充行业、废水类别、接管条件及排污许可证。';
  if((topic==='农村污水' || /农村/.test(question)) && region==='浙江省')return '已核实 DB33/973-2021 替代旧版的关系，但官方全文下载链接目前失效，尚未完成全文入库。暂不能据此回答具体限值，请先查看标准信息和官方来源。';
  if((topic==='农村污水' || /农村/.test(question)) && region==='上海市' && /限值|多少|达标|超标|排放标准/.test(question))return '上海 DB31/T 1163-2019 已于2025年7月18日废止；本次核验尚未确认新的强制性农村污水排放标准发布。当前仅收录2026年治理技术指南，不能据此给出排放限值。';
  if(/限值|多少|达标|超标/.test(question) && !/瞬时|日均/.test(question))return '请补充限值类型（日均值或瞬时值），以及设施属于现有还是新建、出水去向和排污许可证要求。你可以继续输入这些条件后查询依据。';
  return null;
}
