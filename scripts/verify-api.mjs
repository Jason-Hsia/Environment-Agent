import assert from 'node:assert/strict';
const origin='http://localhost:5173';
// Local-development-only identity supplied by the starter's loopback auth middleware.
const headers={'Cookie':'__sites_local_auth=1','Content-Type':'application/json','Origin':origin};
async function post(data) {
 const r=await fetch(origin+'/api/workspace',{method:'POST',headers,body:JSON.stringify(data)});
 return {status:r.status,data:await r.json()};
}
const initial=await fetch(origin+'/api/workspace',{headers}).then(r=>r.json());
assert.equal(initial.documents.length,34);assert.equal(initial.chunks,636);
const version=await post({action:'chat',question:'2025年修改单什么时候实施？',date:'2026-02-01',region:'浙江省',topic:'城镇污水'});
assert.equal(version.status,200);assert.equal(version.data.mode,'version');assert.match(version.data.answer,/尚未实施/);
const unknown=await post({action:'chat',question:'量子芯片封装工艺',date:'2026-09-17',region:'浙江省',topic:'城镇污水'});
assert.equal(unknown.data.mode,'insufficient');
const retrieval=await post({action:'chat',question:'浙江城镇污水处理厂适用范围和执行依据',date:'2026-09-17',region:'浙江省',topic:'城镇污水'});
assert.equal(retrieval.status,200);assert.equal(retrieval.data.citations[0].docId,'zj-urban');
assert.ok(retrieval.data.citations.every(x=>x.page>0));
const soil=await post({action:'chat',question:'HJ 166-2026 土壤样品如何采集保存？',date:'2026-09-19',region:'江苏省',topic:'土壤采样'});
assert.equal(soil.status,200);assert.ok(soil.data.citations.some(x=>x.code.includes('HJ 166')));
const water=await post({action:'chat',question:'HJ 493-2009 水样如何保存？',date:'2026-09-19',region:'北京市',topic:'水样采集'});
assert.equal(water.status,200);assert.ok(water.data.citations.some(x=>x.code.includes('HJ 493')));
const jiangsu=await post({action:'chat',question:'江苏城镇污水处理厂适用范围',date:'2026-09-19',region:'江苏省',topic:'城镇污水'});
assert.equal(jiangsu.status,200);assert.ok(jiangsu.data.citations.some(x=>x.docId==='js-urban'));assert.ok(jiangsu.data.citations.every(x=>!['浙江省','上海市','北京市'].includes(initial.documents.find(d=>d.id===x.docId)?.region)));
const beijing=await post({action:'chat',question:'北京农村生活污水处理设施适用范围',date:'2026-09-19',region:'北京市',topic:'农村污水'});
assert.equal(beijing.status,200);assert.ok(beijing.data.citations.some(x=>x.docId==='bj-rural'));
const gas=await post({action:'chat',question:'HJ 732-2025 固定污染源废气 VOC 气袋采样有哪些要求？',date:'2026-09-20',region:'浙江省',topic:'气体采样'});
assert.equal(gas.status,200);assert.ok(gas.data.citations.some(x=>x.docId==='hj-stack-voc'));assert.ok(gas.data.citations.every(x=>initial.documents.find(d=>d.id===x.docId)?.topic==='气体采样'));
const feedback=await post({action:'feedback',id:retrieval.data.id,reason:'有帮助'});
assert.equal(feedback.status,200);
const invalid=await post({action:'chat',question:'采样',date:'2026-02-30',region:'浙江省',topic:'城镇污水'});
assert.equal(invalid.status,400);
const anonymous=await fetch(origin+'/api/workspace');assert.equal(anonymous.status,401);
const alien=await fetch(origin+'/api/workspace',{method:'POST',headers:{...headers,Origin:'https://example.com'},body:JSON.stringify({action:'check'})});assert.equal(alien.status,403);
const after=await fetch(origin+'/api/workspace',{headers}).then(r=>r.json());
assert.ok(after.history.some(x=>x.id===version.data.id),'Query must persist after a second request');
console.log('API checks passed: retrieval, version lookup, persistence, feedback, input validation and access control.');
