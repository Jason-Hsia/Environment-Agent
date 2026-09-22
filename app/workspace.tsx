"use client";
import { useEffect,useRef,useState } from 'react';
import { Waves,MessageSquare,Library,History,ArrowUp,ArrowUpRight,Plus,Search,ChevronRight,RefreshCw,Check,X,ExternalLink,LoaderCircle,ThumbsUp,Download,Info } from 'lucide-react';
import type { Document,Medium,Region } from '../lib/knowledge';
import { appliesTo,medium,status,today } from '../lib/knowledge';
type Citation={number:number;id:string;title:string;code:string;page:number|null;type?:string;text:string;source:string;pdf?:string;status:string};
type Answer={id:string;question:string;answer:string;mode:string;warning?:string;citations:Citation[];date:string;region?:string;topic:string;created:string};
type SourceCheck={id:string;doc_id:string;state:string;detail:string;created:string;reviewed:number};
type HistoryItem={id:string;question:string;response:Answer;created:string};
const modeText:Record<string,string>={retrieval:'原文检索',ai:'AI 依据问答',clarification:'需要补充条件',insufficient:'证据不足',version:'版本核对'};
export default function Workspace({initialDocuments,count}:{initialDocuments:Document[];count:number}) {
 const [view,setView]=useState('问答助手'),[documents,setDocuments]=useState(initialDocuments),[history,setHistory]=useState<HistoryItem[]>([]),[checks,setChecks]=useState<SourceCheck[]>([]);
 const [question,setQuestion]=useState(''),[region,setRegion]=useState('浙江省'),[topic,setTopic]=useState('城镇污水'),[date,setDate]=useState(today()),[model,setModel]=useState(false),[answer,setAnswer]=useState<Answer|null>(null),[busy,setBusy]=useState(false),[checking,setChecking]=useState(false),[loaded,setLoaded]=useState(false);
 const [error,setError]=useState(''),[toast,setToast]=useState(''),[search,setSearch]=useState(''),[libraryRegion,setLibraryRegion]=useState<Region>('浙江省'),[libraryMedium,setLibraryMedium]=useState<Medium>('水'),[detail,setDetail]=useState<Document|null>(null),[scope,setScope]=useState(false);
 const input=useRef<HTMLTextAreaElement>(null);
 async function load(){
   try{const r=await fetch('/api/workspace');const d=await r.json() as {error?:string;documents:Document[];history:HistoryItem[];checks:SourceCheck[];modelConfigured:boolean};if(!r.ok)throw new Error(d.error);setDocuments(d.documents);setHistory(d.history);setChecks(d.checks);setModel(d.modelConfigured);setLoaded(true);}
   catch(e){setError(e instanceof Error?e.message:'加载失败，请重试。');}
 }
 useEffect(()=>{void load();},[]);
 useEffect(()=>{if(toast){const timer=setTimeout(()=>setToast(''),3500);return()=>clearTimeout(timer);}},[toast]);
 useEffect(()=>{if(detail||scope){
   const previous=document.activeElement as HTMLElement|null;
   const listener=(e:KeyboardEvent)=>{
     if(e.key==='Escape'){setDetail(null);setScope(false);}
     if(e.key==='Tab'){
       const nodes=Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"] button,[role="dialog"] a[href]'));
       const first=nodes[0],last=nodes[nodes.length-1];
       if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
       else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
     }
   };
   window.addEventListener('keydown',listener);
   return()=>{window.removeEventListener('keydown',listener);previous?.focus();};
 }},[detail,scope]);
 async function post(data:unknown){const r=await fetch('/api/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const value=await r.json() as any;if(!r.ok)throw new Error(value.error||'操作未完成，请重试。');return value;}
 async function ask(value=question,nextTopic=topic){
   if(busy||!value.trim())return;setBusy(true);setError('');setView('问答助手');setTopic(nextTopic);
   try{const result=await post({action:'chat',question:value,date,region,topic:nextTopic});setAnswer(result);setQuestion('');await load();}
   catch(e){setQuestion(value);setError(e instanceof Error?e.message:'查询失败，请重试。');}
   finally{setBusy(false);}
 }
 async function check(){
   setChecking(true);setError('');
   try{await post({action:'check'});await load();setToast('来源检查已完成，记录已保存。');}
   catch(e){setError(e instanceof Error?e.message:'检查失败');}finally{setChecking(false);}
 }
 async function review(id:string){
   try{await post({action:'review',id,decision:'保留现有版本'});await load();setToast('已记录人工核对，保留现有知识库版本。');}
   catch(e){setError(e instanceof Error?e.message:'审核失败');}
 }
 async function feedback(reason:string){
   if(!answer)return;try{await post({action:'feedback',id:answer.id,reason});setToast('感谢反馈，已保存。');}catch(e){setError(e instanceof Error?e.message:'反馈失败');}
 }
 function download(){
   if(!answer)return;const text=answer.question+'\n\n'+answer.answer+'\n\n'+answer.citations.map(c=>'['+c.number+'] '+c.title+' '+c.code+' PDF页码 '+(c.page||'不适用')+'\n'+c.source+'\n'+c.text).join('\n\n');
   const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='环规查询记录.txt';a.click();URL.revokeObjectURL(url);
 }
 const regions:Region[]=['北京市','上海市','浙江省','江苏省'];
 const media:{id:Medium;label:string}[]=[{id:'水',label:'水与水样'},{id:'土壤',label:'土壤'},{id:'气体',label:'气体'}];
 const needle=search.toLowerCase().replace(/\s/g,'');
 const listed=documents.filter(d=>appliesTo(d,libraryRegion)&&medium(d)===libraryMedium&&(!needle||[d.title,d.code,d.region,...(d.codes||[])].join('').toLowerCase().replace(/\s/g,'').includes(needle))).sort((a,b)=>Number(b.region!=='全国')-Number(a.region!=='全国')||a.code.localeCompare(b.code,'zh-CN'));
 const groups=[{label:'地方与区域规范',items:listed.filter(d=>d.region!=='全国')},{label:'全国通用规范',items:listed.filter(d=>d.region==='全国')}].filter(group=>group.items.length);
 const substantive=documents.filter(d=>d.pdf).length;
 const prompts=[
   {label:`${region}城镇污水厂适用哪些标准？`,query:`${region}城镇污水处理厂适用范围和主要污染物执行依据是什么？`,tag:'适用标准',topic:'城镇污水'},
   {label:'土壤样品如何采集和流转？',query:'HJ 166-2026 对土壤样品采集、流转和保存有哪些要求？',tag:'土壤采样',topic:'土壤采样'},
   {label:'水样应当怎样保存？',query:'HJ 493-2009 对水样容器、保护剂、运输和保存有哪些要求？',tag:'水样保存',topic:'水样采集'},
   {label:'固定源 VOC 应当怎样采样？',query:'HJ 732-2025 对固定污染源废气 VOC 气袋采样有哪些要求？',tag:'气体采样',topic:'气体采样'},
 ];
 return <div className="app-shell">
   <aside className="sidebar">
     <a className="brand" href="/" aria-label="环规首页"><span className="brand-icon"><Waves size={25}/></span><span>环规<small>HUANGUI</small></span></a>
     <div className="workspace-label">环境规范查询</div>
     <button className="new-chat" onClick={()=>{setView('问答助手');setAnswer(null);setQuestion('');setError('');input.current?.focus();}}><Plus size={18}/>新建查询</button>
     <nav aria-label="主导航">{[[MessageSquare,'问答助手'],[Library,'标准知识库']].map(([Icon,label]:any)=><button key={label} className={view===label?'nav-item active':'nav-item'} onClick={()=>{setView(label);setError('');}}><Icon size={19}/>{label}</button>)}</nav>
     <div className="recent-label">最近查询</div>
     <div className="recent-list">{history.length?history.slice(0,3).map(h=><button key={h.id} onClick={()=>{setAnswer(h.response);setDate(h.response.date);setRegion(h.response.region||'浙江省');setTopic(h.response.topic);setView('问答助手');}} title={h.question}><MessageSquare size={14}/><span>{h.question}</span></button>):<p>暂无记录</p>}</div>
     <div className="sidebar-bottom"><button className="maintenance" onClick={()=>{setView('更新与审核');setError('');}}><History size={16}/>数据维护{checks.some(c=>c.state==='changed'&&!c.reviewed)&&<span className="nav-dot"/>}</button><button className="maintenance" onClick={()=>setScope(true)}><Info size={16}/>收录范围</button></div>
   </aside>
   <div className="content-shell">
     {error&&<div role="alert" className="error-banner">{error}<button onClick={()=>{setError('');void load();}}>重试</button><button onClick={()=>setError('')} aria-label="关闭错误"><X size={16}/></button></div>}
     <main className={view==='问答助手'?'main-grid':'main-single'}>
       <section className="primary">
         {view==='问答助手'?<>
           <div className="page-heading"><div><h1>查环境规范</h1><p>输入问题，返回适用版本、原文页码和官方来源。</p></div><button className="scope-link" onClick={()=>setScope(true)}>收录范围</button></div>
           <div className="query-filters"><label><span>地区</span><select value={region} onChange={e=>{setRegion(e.target.value);setAnswer(null);}} aria-label="查询地区">{regions.map(x=><option key={x}>{x}</option>)}</select></label><label><span>场景</span><select value={topic} onChange={e=>setTopic(e.target.value)} aria-label="查询场景"><optgroup label="水与水样">{['城镇污水','农村污水','水样采集','企业纳管','监测管理'].map(t=><option key={t}>{t}</option>)}</optgroup><optgroup label="土壤"><option>土壤采样</option></optgroup><optgroup label="气体"><option>气体采样</option></optgroup></select></label><label><span>适用日期</span><input aria-label="适用日期" type="date" value={date} onChange={e=>setDate(e.target.value)} required/></label></div>
           <form className="composer" onSubmit={e=>{e.preventDefault();void ask();}}><textarea ref={input} value={question} onChange={e=>setQuestion(e.target.value)} maxLength={1500} rows={3} placeholder="输入标准编号或具体问题" aria-label="规范问题" onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void ask();}}}/><div className="composer-bottom"><span>{model?'基于知识库回答':'按原文检索'}</span><div><small>Enter 发送</small><button type="submit" disabled={busy||!question.trim()||!date} aria-label="发送查询">{busy?<LoaderCircle className="spin" size={19}/>:<ArrowUp size={20}/>}</button></div></div></form>
           {busy&&<div className="loading" role="status"><LoaderCircle className="spin" size={18}/>{model?'正在生成依据回答…':'正在检索原文…'}</div>}
           {answer?<div className="conversation" aria-live="polite"><div className="question-message"><div><span className="message-label">{answer.region||region} · {answer.date} · {answer.topic}</span><h2>{answer.question}</h2></div></div><article className="answer-message"><div className="answer-header"><strong>查询结果</strong><span className={'mode-chip '+(answer.mode==='ai'?'ai':'')}>{modeText[answer.mode]}</span></div>{answer.warning&&<p className="notice">{answer.warning}</p>}{answer.mode==='retrieval'?<p className="result-summary">找到 {answer.citations.length} 处相关原文，展开依据查看具体条款。</p>:<div className="answer-text">{answer.answer}</div>}{answer.citations.length>0&&<><h3 className="evidence-heading">依据 <span>{answer.citations.length}</span></h3><div className="evidence-list">{answer.citations.map(c=><details key={c.id}><summary><span className="cite-num">{c.number}</span><div><strong>{c.title}</strong><small>{c.code} · {c.page?'PDF 第 '+c.page+' 页':c.type==='metadata'?'版本元数据':'公告正文'}</small></div><ChevronRight size={16}/></summary><div className="evidence-body"><p className="metadata">{c.status} · 自动提取原文，表格请核对 PDF</p><pre>{c.text}</pre><div className="source-actions"><a href={c.source} target="_blank" rel="noopener noreferrer">官方来源<ExternalLink size={14}/></a>{c.pdf&&<a href={c.pdf+(c.page?'#page='+c.page:'')} target="_blank" rel="noopener noreferrer">{c.page?"PDF 第 "+c.page+" 页":"PDF 全文"}<ArrowUpRight size={14}/></a>}</div></div></details>)}</div></>}<div className="answer-footer"><button onClick={()=>feedback('有帮助')}><ThumbsUp size={15}/>有帮助</button><select aria-label="提交问题反馈" value="" onChange={e=>{if(e.target.value)void feedback(e.target.value);}}><option value="">反馈问题</option>{['引用错误','版本错误','未解决问题'].map(x=><option key={x}>{x}</option>)}</select><button onClick={download}><Download size={15}/>导出</button></div></article></div>:<div className="welcome-panel"><span className="examples-label">常见问题</span><div className="prompt-list">{prompts.map(p=><button key={p.tag} disabled={busy} onClick={()=>ask(p.query,p.topic)}><span className="prompt-tag">{p.tag}</span><span>{p.label}</span></button>)}</div></div>}
           {!answer&&(topic==='气体采样'?<div className="version-note"><History size={14}/><span>HJ 1405-2024 将于 2027-01-01 实施</span><button onClick={()=>setDetail(documents.find(d=>d.id==='hj-outlet-site')!)}>查看依据</button></div>:<div className="version-note"><History size={14}/><span>GB 18918 修改单已于 2026-03-01 实施</span><button onClick={()=>setDetail(documents.find(d=>d.id==='gb-amendment')!)}>查看依据</button></div>)}
           <p className="composer-note">资料核验：2026-09-20 · 结果需结合项目实际和官方原文核对</p>
         </>:view==='标准知识库'?<>
           <div className="page-heading"><div><h1>标准知识库</h1><p>先选地区，再查看水、土壤或气体规范。</p><small className="library-meta">{documents.length} 条记录 · {substantive} 份全文 · {count} 个证据片段</small></div></div>
           <div className="region-tabs" role="group" aria-label="知识库地区">{regions.map(x=><button key={x} className={libraryRegion===x?'active':''} aria-pressed={libraryRegion===x} onClick={()=>setLibraryRegion(x)}>{x.replace(/[省市]$/,'')}</button>)}</div>
           <div className="medium-tabs" role="group" aria-label="知识库门类">{media.map(item=>{const total=documents.filter(d=>appliesTo(d,libraryRegion)&&medium(d)===item.id).length;return <button key={item.id} className={libraryMedium===item.id?'active':''} aria-pressed={libraryMedium===item.id} onClick={()=>setLibraryMedium(item.id)}><span>{item.label}</span><small>{total} 项</small></button>;})}</div>
           <div className="library-toolbar"><div className="search-input"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`在${libraryRegion.replace(/[省市]$/,'')} · ${media.find(x=>x.id===libraryMedium)?.label}中搜索`} aria-label="搜索标准"/></div></div>
           {groups.length?groups.map(group=><section className="document-group" key={group.label}><h2>{group.label}<span>{group.items.length}</span></h2><div className="document-list">{group.items.map(d=><button className="document-row" key={d.id} onClick={()=>setDetail(d)}><div className="document-title"><div><span className="document-code">{d.code}</span>{(d.end||!d.available)&&<span className={'status-badge '+(d.end?'archived':'pending')}>{d.end?'已替代':'全文待补充'}</span>}</div><h2>{d.title}</h2><p>{d.region} · {d.kind} · {d.effective||'日期待核验'}</p></div><ChevronRight size={17}/></button>)}</div></section>):<div className="empty-state"><Search size={28}/><p>没有匹配的文件</p></div>}
           <p className="footnote">收录不等于适用，具体项目请核对许可证和官方原文。</p>
         </>:<>
           <div className="page-heading"><div><h1>版本与来源</h1><p>维护已收录文件的状态。</p></div><button className="solid-button" disabled={checking||!loaded} onClick={check}>{checking?<LoaderCircle className="spin" size={17}/>:<RefreshCw size={17}/>} {checking?'正在检查…':'检查来源'}</button></div>
           <p className="update-notice">来源变化需人工核验；链接失效不会自动废止标准。</p>
           <div className="section-title"><h2>来源检查记录</h2><span>{checks.length} 条</span></div>
           {checks.length?<div className="check-list">{checks.map(c=>{const d=documents.find(x=>x.id===c.doc_id);return <article key={c.id} className="check-row"><span className={'check-symbol '+c.state}>{c.state==='unchanged'||c.reviewed?<Check size={19}/>:<Info size={19}/>}</span><div><div className="check-title"><h3>{d?.code}</h3><span className={'status-badge '+(c.state==='changed'?'pending':'')}>{c.reviewed?'已核对 · 保留版本':{unchanged:'内容未变化',changed:'变更待审核',error:'访问失败',reachable:'页面可访问'}[c.state]}</span></div><p>{c.detail}</p><small>{new Date(c.created).toLocaleString('zh-CN')}</small><div className="check-actions"><a href={d?.source} target="_blank" rel="noopener noreferrer">核对官方来源<ArrowUpRight size={14}/></a>{!c.reviewed&&c.state==='changed'&&<button onClick={()=>review(c.id)}>已人工核对，保留现有版本</button>}</div></div></article>})}</div>:<div className="empty-check"><RefreshCw size={27}/><h3>还没有来源检查记录</h3><p>点击“检查官方来源”，结果将保存到更新日志。</p></div>}
           <details className="version-relations"><summary>查看已核实的版本关系</summary><div className="version-timeline"><div><span className="timeline-date">2026.06.01</span><h3>HJ 166-2026 代替 HJ/T 166-2004</h3><p>新版已进入默认检索，旧版保留追溯关系。</p><button onClick={()=>setDetail(documents.find(d=>d.id==='hj-soil')!)}>查看依据<ArrowUpRight size={14}/></button></div><div><span className="timeline-date">2026.03.01</span><h3>GB 18918-2002 修改单实施</h3><p>修改单与原标准关联，原标准未整体废止。</p><button onClick={()=>setDetail(documents.find(d=>d.id==='gb-amendment')!)}>查看依据<ArrowUpRight size={14}/></button></div><div><span className="timeline-date">2022.01.01</span><h3>DB33/973-2021 代替 DB33/973-2015</h3><p>旧版退出默认检索并保留追溯关系。</p><button onClick={()=>setDetail(documents.find(d=>d.id==='zj-rural-old')!)}>查看依据<ArrowUpRight size={14}/></button></div></div></details>
         </>}
       </section>
     </main>
   </div>
   {(detail||scope)&&<div className="modal-backdrop" onClick={()=>{setDetail(null);setScope(false);}}><section role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="detail-modal" onClick={e=>e.stopPropagation()}><button className="close-modal" autoFocus onClick={()=>{setDetail(null);setScope(false);}} aria-label="关闭详情"><X size={20}/></button>{detail?<><p className="document-code">{detail.code}</p><h2 id="dialog-title">{detail.title}</h2><span className={'status-badge '+(detail.end?'archived':'')}>{status(detail,date)}</span><p className="detail-meta">{detail.region} · {detail.kind} · {detail.effective?'实施 '+detail.effective:'日期待核验'} · {detail.available?(detail.pages?detail.pages+' 页全文':'公告正文'):'仅版本记录'}</p><p className="notice">{detail.note}</p><div className="modal-actions"><a className="solid-button" href={detail.source} target="_blank" rel="noopener noreferrer">官方来源<ExternalLink size={16}/></a>{detail.pdf&&<a className="outline-button" href={detail.pdf} target="_blank" rel="noopener noreferrer">PDF 全文<ArrowUpRight size={16}/></a>}{detail.statusSource&&<a className="outline-button" href={detail.statusSource} target="_blank" rel="noopener noreferrer">状态依据<ArrowUpRight size={16}/></a>}</div><small className="modal-footnote">资料核验：{detail.checked}{detail.end?' · 替代日期：'+detail.end:''}</small></>:<><h2 id="dialog-title">收录范围</h2><p>知识库按北京、上海、浙江、江苏四地组织，每地分为水与水样、土壤、气体三个门类。</p><p className="scope-count">{documents.length} 条记录 · {substantive} 份全文 · {count} 个证据片段</p><p className="notice">全国标准在四地共同展示，地方标准只归入发布地区。跨地区协同标准仅保存一份，并在详情中标明实际适用范围。尚未完整覆盖各市县政策、行业纳管要求和地方大气排放限值。</p><button className="solid-button" onClick={()=>{setScope(false);setView('标准知识库');}}>查看知识库<ChevronRight size={16}/></button><small className="modal-footnote">资料核验：2026-09-20 · {model?'已接入模型问答':'当前按原文检索'}</small></>}</section></div>}
   {toast&&<div className="toast" role="status"><Check size={18}/>{toast}</div>}
 </div>;
}
