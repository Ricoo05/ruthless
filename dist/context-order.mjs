import {knownCandidates,summarizeRankings} from './linkage-lab-core.mjs';
import {compareContextMentions} from './context-hints.mjs';
export function contextOrderedEvaluation(semanticReport){
 if(!semanticReport||semanticReport.id!=='multilingual'||!Array.isArray(semanticReport.rows))throw Error('Use the validated multilingual comparison first.');
 const rows=semanticReport.rows.map(row=>{
  const eligible=knownCandidates(row.query,row.candidates,row.asOf),contexts=eligible.map(candidate=>({id:candidate.id,hints:compareContextMentions({left:row.query,right:candidate})}));
  const ranking=row.ranking.map(item=>{const context=contexts.find(c=>c.id===item.id);if(!context)throw Error('Unknown candidate in the saved ranking.');return {...item,deferred:context.hints.deferred};}).sort((a,b)=>Number(a.deferred)-Number(b.deferred)||b.score-a.score||a.id.localeCompare(b.id));
  return {...row,candidates:eligible,excluded:(row.excluded??0)+row.candidates.length-eligible.length,contexts,ranking};
 });
 const flags=rows.flatMap(row=>row.ranking.filter(r=>r.deferred));
 return {id:'context-order',name:'MiniLM + quoted-context ordering',metrics:summarizeRankings(rows),rows,deferredCandidates:flags.length};
}
