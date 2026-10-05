import {reportTokens,compareReports} from './report-links.mjs';
import {demoWorkspace,stageDocument} from './threat-core.mjs';
import {linkageFixtures,LINKAGE_SUITE_VERSION} from './linkage-fixtures.mjs';

const fail=message=>{throw new Error(message);};
const day=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
const text=value=>typeof value==='string'&&value.trim().length>0&&value.length<=4000;
function validateRecord(r){if(!r||!text(r.id)||r.id.length>80||!text(r.text)||!day(r.reportedAt)||!day(r.recordedAt))fail('Invalid bounded report record.');}
export function knownCandidates(query,candidates,asOf){
 validateRecord(query);if(!day(asOf)||query.reportedAt>asOf||query.recordedAt>asOf)fail('Query must be known at the evaluation date.');
 if(!Array.isArray(candidates)||candidates.length>200)fail('Use at most 200 candidates.');
 const ids=new Set([query.id]);for(const r of candidates){validateRecord(r);if(ids.has(r.id))fail('Report identities must be unique.');ids.add(r.id);}
 return candidates.filter(r=>r.reportedAt<=asOf&&r.recordedAt<=asOf);
}
// Model input excludes labels, rationale, split and story-family identity.
const inputs=r=>({id:r.id,text:r.text,reportedAt:r.reportedAt,recordedAt:r.recordedAt});
export function rankBM25(query,candidates,asOf,{k1=1.2,b=.75}={}){
 if(!Number.isFinite(k1)||k1<=0||k1>5||!Number.isFinite(b)||b<0||b>1)fail('Invalid BM25 settings.');
 const docs=knownCandidates(query,candidates,asOf),terms=new Set(reportTokens(query.text));
 const counts=docs.map(r=>{const m=new Map();for(const t of reportTokens(r.text))m.set(t,(m.get(t)||0)+1);return m;});
 const lengths=counts.map(m=>[...m.values()].reduce((a,b)=>a+b,0)),avg=lengths.reduce((a,b)=>a+b,0)/Math.max(1,docs.length);
 const df=new Map();for(const m of counts)for(const t of m.keys())df.set(t,(df.get(t)||0)+1);
 return docs.map((r,i)=>{let score=0,shared=0;for(const term of terms){const tf=counts[i].get(term)||0;if(!tf)continue;shared++;const idf=Math.log(1+(docs.length-df.get(term)+.5)/(df.get(term)+.5));score+=idf*tf*(k1+1)/(tf+k1*(1-b+b*lengths[i]/avg));}return {id:r.id,score,shared};})
  .filter(r=>r.shared>=3&&r.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}
export function rankWorkbench(query,candidates,asOf){
 const docs=knownCandidates(query,candidates,asOf);let w={...demoWorkspace(),evidence:[]};
 for(const [i,r] of [query,...docs].entries())w=stageDocument(w,{id:`lab-${i}`,assessmentId:'training-domestic',title:'Authored retrieval control',publisher:`Authored fixture publisher ${i}`,originGroup:`control-${i}`,url:'',reportedAt:r.reportedAt,recordedAt:r.recordedAt,language:'Authored control',locator:'Complete paragraph',accessNote:'Fictional evaluation text; prototype reuse permitted.',excerpt:r.text,synthetic:true},r.recordedAt);
 const result=compareReports(w,{from:'2000-01-01',to:asOf,scope:'All'});
 return result.pairs.filter(p=>p.left.id==='lab-0'||p.right.id==='lab-0').map(p=>{const id=p.left.id==='lab-0'?p.right.id:p.left.id;return {id:docs[Number(id.slice(4))-1].id,score:p.similarity};}).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
}
export function validateSuite(suite){
 if(!Array.isArray(suite)||suite.length<2||suite.length>100)fail('Invalid evaluation suite size.');
 const ids=new Set(),families=new Map(),texts=new Map();
 for(const c of suite){if(!c||!text(c.id)||!text(c.family)||!text(c.category)||!['development','evaluation'].includes(c.split))fail('Invalid evaluation case.');if(ids.has(c.id))fail('Duplicate case identity.');ids.add(c.id);
  if(families.has(c.family)&&families.get(c.family)!==c.split)fail('A story family crosses evaluation splits.');families.set(c.family,c.split);
  const eligible=knownCandidates(c.query,c.candidates,c.asOf);if(!eligible.some(r=>r.label==='Related'))fail('Each case requires an eligible related report.');
  for(const r of [c.query,...c.candidates]){const normalized=r.text.normalize('NFKC').trim().toLowerCase();if(texts.has(normalized)&&texts.get(normalized)!==c.split)fail('Identical report text crosses evaluation splits.');texts.set(normalized,c.split);}
  for(const r of c.candidates)if(!['Related','Unrelated','Unresolved'].includes(r.label)||!text(r.reason))fail('Every candidate needs an authored label and rationale.');
 }
 if(!suite.some(c=>c.split==='development')||!suite.some(c=>c.split==='evaluation'))fail('Both evaluation splits are required.');
 return suite;
}
export function summarizeRankings(rows){
 const n=rows.length;let correctTop1=0,falseTop1=0,unresolvedTop1=0,noResults=0,recall=0,reciprocal=0,unrelatedTop3=0,unresolvedTop3=0;
 for(const row of rows){const labels=new Map(row.candidates.map(r=>[r.id,r.label])),relevant=row.candidates.filter(r=>r.label==='Related').length;if(!relevant)fail('Cannot score a case without an eligible relevant report.');
  const seen=new Set();for(const r of row.ranking){if(!labels.has(r.id)||seen.has(r.id)||!Number.isFinite(r.score)||r.score<0)fail('Malformed ranking.');seen.add(r.id);}
  const top=row.ranking[0];if(!top)noResults++;else if(labels.get(top.id)==='Related')correctTop1++;else if(labels.get(top.id)==='Unrelated')falseTop1++;else unresolvedTop1++;
  const three=row.ranking.slice(0,3);recall+=three.filter(r=>labels.get(r.id)==='Related').length/relevant;unrelatedTop3+=three.filter(r=>labels.get(r.id)==='Unrelated').length;unresolvedTop3+=three.filter(r=>labels.get(r.id)==='Unresolved').length;
  const rank=row.ranking.findIndex(r=>labels.get(r.id)==='Related');reciprocal+=rank<0?0:1/(rank+1);
 }
 return {queries:n,correctTop1,falseTop1,unresolvedTop1,noResults,top1Success:n?correctTop1/n:null,recallAt3:n?recall/n:null,mrr:n?reciprocal/n:null,unrelatedTop3,unresolvedTop3};
}
export function runLinkageEvaluation(split='development',suite=linkageFixtures){
 if(!['development','evaluation'].includes(split))fail('Choose a defined evaluation split.');validateSuite(suite);
 const selected=suite.filter(c=>c.split===split),methods=[{id:'workbench',name:'Current TF-IDF',rank:rankWorkbench},{id:'bm25',name:'BM25 challenger',rank:rankBM25}];
 const results=methods.map(method=>{const rows=selected.map(c=>{const query=inputs(c.query),candidateInputs=c.candidates.map(inputs),ranking=method.rank(query,candidateInputs,c.asOf);return {id:c.id,category:c.category,query:c.query,asOf:c.asOf,candidates:knownCandidates(c.query,c.candidates,c.asOf),excluded:c.candidates.length-knownCandidates(c.query,c.candidates,c.asOf).length,ranking};});return {id:method.id,name:method.name,metrics:summarizeRankings(rows),rows};});
 return {suiteVersion:LINKAGE_SUITE_VERSION,split,results,notice:'Authored synthetic controls. Related means the same described event, including reposts or denials; it does not mean corroboration. Labels and both splits are visible to the developer. No independent or blinded validation, parameter tuning or automatic model promotion is performed.'};
}
