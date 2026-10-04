import {validateSourceCitations} from './proposal-core.mjs';
import {SUITE_ID,SUITE_VERSION,CRITERIA,EVALUATION_CASES,exportedInputs} from './evaluation-fixtures.mjs';
export const EVALUATION_MAX_BYTES=2_000_000;
const fail=m=>{throw new Error(m);};
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v,fields,label)=>{if(!object(v)||Object.keys(v).some(k=>!fields.includes(k))||fields.some(k=>!Object.hasOwn(v,k)))fail(`Unexpected or missing ${label} fields.`);};
const text=(v,label,max=4000,empty=false)=>{if(typeof v!=='string'||v.length>max||(!empty&&!v.trim()))fail(`Invalid ${label}.`);return v;};
const id=v=>{if(typeof v!=='string'||!/^[a-zA-Z0-9_-]{1,60}$/.test(v))fail('Invalid candidate identifier.');return v;};
const unique=(values,label)=>{if(new Set(values).size!==values.length)fail(`Duplicate ${label}.`);};
export function evaluationJSON(v){const raw=JSON.stringify(v);if(new TextEncoder().encode(raw).length>EVALUATION_MAX_BYTES)fail('Evaluation file exceeds 2 MB in UTF-8.');return raw;}
export function parseEvaluation(raw){if(typeof raw!=='string'||new TextEncoder().encode(raw).length>EVALUATION_MAX_BYTES)fail('Evaluation file exceeds 2 MB in UTF-8.');try{return JSON.parse(raw);}catch{fail('Evaluation file is not valid JSON.');}}
function canonical(v){if(Array.isArray(v))return v.map(canonical);if(object(v))return Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])]));return v;}
export async function evaluationFingerprint(v){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(evaluationJSON(canonical(v))));return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');}
export function validateCandidateOutput(output,documents){
  exact(output,['proposals','abstention'],'candidate output');if(!Array.isArray(output.proposals)||output.proposals.length>8)fail('Candidate limit: 8 proposals.');
  const abstention=text(output.abstention,'abstention',2000,true);if((!output.proposals.length&&!abstention.trim())||(output.proposals.length&&abstention))fail('Supply proposals or an explained abstention, not both.');
  const proposals=output.proposals.map(p=>{exact(p,['id','draftStatement','limitations','citations'],'candidate proposal');return {id:id(p.id),draftStatement:text(p.draftStatement,'draft statement'),limitations:text(p.limitations,'limitations',2000),citations:validateSourceCitations(p.citations,documents)};});
  unique(proposals.map(p=>p.id),'proposal identifier');return {proposals,abstention};
}
function candidatesEnvelope(v){
  evaluationJSON(v);exact(v,['format','version','suiteId','suiteVersion','split','candidateLabel','responses'],'candidate file');
  if(v.format!=='ruthless-evaluation-candidates'||v.version!==1||v.suiteId!==SUITE_ID||v.suiteVersion!==SUITE_VERSION)fail('Unsupported evaluation candidates or suite version.');
  exportedInputs(v.split);text(v.candidateLabel,'candidate label',200);
  if(!Array.isArray(v.responses)||v.responses.length>12)fail('Candidate limit: 12 case responses.');
  const cases=EVALUATION_CASES.filter(c=>c.split===v.split);
  for(const response of v.responses){exact(response,['caseId','output'],'case response');if(!cases.some(c=>c.id===response.caseId))fail('Candidate response refers to an unknown case or wrong split.');}
  unique(v.responses.map(r=>r.caseId),'case response');return cases;
}
export async function evaluateCandidates(input,annotations=null){
  // Snapshot before awaiting hashes; concurrent edits cannot change evaluated data.
  const candidates=structuredClone(input),cases=candidatesEnvelope(candidates),review=annotations===null?null:structuredClone(annotations);
  const inputFingerprint=await evaluationFingerprint({inputs:exportedInputs(candidates.split),rubric:cases.map(c=>({id:c.id,criteria:c.criteria,guidance:c.guidance})),criteria:CRITERIA});
  const candidateFingerprint=await evaluationFingerprint(candidates);
  const rows=cases.map(c=>{const response=candidates.responses.find(r=>r.caseId===c.id);let output=null,error='';
    try{if(!response)fail('Missing case response.');output=validateCandidateOutput(response.output,c.documents);}catch(e){error=e.message;}
    return {caseId:c.id,category:c.category,structuralValid:!error,error,output,criteria:c.criteria.map(id=>({id,result:'Not assessed',note:''})),outcome:error?'Structurally invalid':'Needs semantic review'};
  });
  let reviewerLabel='';
  if(review!==null){
    evaluationJSON(review);exact(review,['format','version','suiteId','suiteVersion','split','inputFingerprint','candidateFingerprint','reviewerLabel','reviews'],'review file');
    if(review.format!=='ruthless-evaluation-review'||review.version!==1||review.suiteId!==SUITE_ID||review.suiteVersion!==SUITE_VERSION||review.split!==candidates.split||review.inputFingerprint!==inputFingerprint||review.candidateFingerprint!==candidateFingerprint)fail('Stale or mismatched review: inputs or candidate outputs changed.');
    reviewerLabel=text(review.reviewerLabel,'reviewer label',120,true);
    if(!Array.isArray(review.reviews)||review.reviews.length!==rows.length)fail('Review must include every case in the selected split.');unique(review.reviews.map(r=>r.caseId),'review case');
    for(const r of review.reviews){
      exact(r,['caseId','criteria'],'case review');const row=rows.find(row=>row.caseId===r.caseId);if(!row)fail('Unknown review case.');
      if(!Array.isArray(r.criteria)||r.criteria.length!==row.criteria.length)fail('Review must include every applicable criterion.');unique(r.criteria.map(c=>c.id),'review criterion');
      row.criteria=r.criteria.map(c=>{exact(c,['id','result','note'],'criterion review');if(!row.criteria.some(required=>required.id===c.id))fail('Unknown review criterion.');if(!['Pass','Fail','Not assessed'].includes(c.result))fail('Invalid review result.');const note=text(c.note,'criterion note',2000,true);if(c.result!=='Not assessed'&&(!note.trim()||!reviewerLabel.trim()))fail('Assessed criteria require a reviewer label and an explanatory note.');return {id:c.id,result:c.result,note};});
      row.outcome=!row.structuralValid?'Structurally invalid':row.criteria.some(c=>c.result==='Fail')?'Semantic review failed':row.criteria.some(c=>c.result==='Not assessed')?'Needs semantic review':'Reviewer checks satisfied';
    }
  }
  const counts={cases:rows.length,structurallyValid:rows.filter(r=>r.structuralValid).length,structurallyInvalid:rows.filter(r=>!r.structuralValid).length,needsSemanticReview:rows.filter(r=>r.outcome==='Needs semantic review').length,semanticReviewFailed:rows.filter(r=>r.outcome==='Semantic review failed').length,reviewerChecksSatisfied:rows.filter(r=>r.outcome==='Reviewer checks satisfied').length};
  return {format:'ruthless-evaluation-report',version:1,suiteId:SUITE_ID,suiteVersion:SUITE_VERSION,split:candidates.split,candidateLabel:candidates.candidateLabel,inputFingerprint,candidateFingerprint,reviewerLabel,counts,rows,notice:'Synthetic evaluation only. Citation matches do not establish semantic fidelity. Reviewer labels and local files are editable, not authenticated or tamper protected. No model was called by this checker; candidate labels are unverified. This report does not authorize provider integration or operational use.'};
}
export function reviewTemplate(report){return {format:'ruthless-evaluation-review',version:1,suiteId:report.suiteId,suiteVersion:report.suiteVersion,split:report.split,inputFingerprint:report.inputFingerprint,candidateFingerprint:report.candidateFingerprint,reviewerLabel:'',reviews:report.rows.map(row=>({caseId:row.caseId,criteria:row.criteria.map(c=>({id:c.id,result:'Not assessed',note:''}))}))};}
