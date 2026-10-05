import {currentReportRecords} from './signals-core.mjs';

// A transparent lexical retrieval baseline. Similarity does not establish
// event identity, corroboration, intent or future risk. No automatic merges.
const STOP=new Set('a an and are as at be been both by can does for from had has have in into is it its may of on or our than that the their these they this to was were what which with would fictional exercise authored training control'.split(' '));
export function reportTokens(text){
  if(typeof text!=='string'||text.length>4000)throw new Error('Invalid bounded report text.');
  return (text.normalize('NFKC').toLocaleLowerCase('en-US').match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}]*/gu)??[]).filter(t=>t.length>=2&&!STOP.has(t));
}
export function compareReports(input,{from,to,scope='All',minSimilarity=.18}={}){
  if(!Number.isFinite(minSimilarity)||minSimilarity<.1||minSimilarity>1)throw new Error('Use a lexical similarity threshold between 0.10 and 1.00.');
  const eligible=currentReportRecords(input,{from,to,scope}).sort((a,b)=>b.recordedAt.localeCompare(a.recordedAt)||b.reportedAt.localeCompare(a.reportedAt)||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id));
  const records=eligible.slice(0,200),counts=records.map(r=>{const m=new Map();for(const t of reportTokens(r.text))m.set(t,(m.get(t)??0)+1);return m;}),df=new Map();
  for(const m of counts)for(const t of m.keys())df.set(t,(df.get(t)??0)+1);
  const vectors=counts.map(m=>{const v=new Map();for(const [t,n] of m)v.set(t,(1+Math.log(n))*(1+Math.log((1+records.length)/(1+df.get(t)))));const norm=Math.sqrt([...v.values()].reduce((s,n)=>s+n*n,0));if(norm)for(const [t,n] of v)v.set(t,n/norm);return v;});
  let qualifyingPairs=0;const pairs=[];
  for(let i=0;i<records.length;i++)for(let j=i+1;j<records.length;j++){
    const shared=[];let similarity=0;for(const [t,n] of vectors[i])if(vectors[j].has(t)){const contribution=n*vectors[j].get(t);similarity+=contribution;shared.push({term:t,contribution});}
    similarity=Math.max(0,Math.min(1,similarity));if(shared.length<3||similarity+1e-12<minSimilarity)continue;
    qualifyingPairs++;const left=records[i],right=records[j];shared.sort((a,b)=>b.contribution-a.contribution||a.term.localeCompare(b.term));
    pairs.push({left,right,similarity,sharedTermCount:shared.length,sharedTerms:shared.slice(0,8).map(s=>s.term),sameRecordedGroup:left.originGroup.toLocaleLowerCase('en-US')===right.originGroup.toLocaleLowerCase('en-US'),crossCase:left.assessmentId!==right.assessmentId});
    pairs.sort((a,b)=>b.similarity-a.similarity||a.left.recordKey.localeCompare(b.left.recordKey)||a.right.recordKey.localeCompare(b.right.recordKey));if(pairs.length>40)pairs.pop();
  }
  return {kind:'lexical_report_comparison',window:{from,to,scope},minSimilarity,eligibleRecords:eligible.length,comparedRecords:records.length,excludedRecords:eligible.length-records.length,pairsEvaluated:Math.max(0,records.length*(records.length-1)/2),qualifyingPairs,pairs,
    limitations:['TF-IDF cosine measures shared language, not event identity, threat likelihood or source independence.','Negations, unrelated events and repeated boilerplate may rank highly; inspect both original passages.','No translation, semantic model, automatic merging, evidence mutation or operational alert is performed.','Only the newest 200 eligible records are compared; at least three shared tokens are required; the highest 40 qualifying pairs are shown. Missing pairs do not establish safety or unrelatedness.']};
}
