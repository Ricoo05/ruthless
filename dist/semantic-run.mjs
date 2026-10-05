import {linkageFixtures,LINKAGE_SUITE_VERSION} from './linkage-fixtures.mjs';
import {knownCandidates,validateSuite,summarizeRankings} from './linkage-lab-core.mjs';
export const SEMANTIC_MODEL={id:'Xenova/paraphrase-multilingual-MiniLM-L12-v2',revision:'2c4055b12046f11709e9df2c122e59ffbdc2f900',dtype:'q8',pooling:'mean',normalize:true,maxLength:128,dimensions:384,runtime:'@huggingface/transformers',runtimeVersion:'3.8.1'};
const fail=m=>{throw new Error(m);};
export async function sha256(value){const bytes=new TextEncoder().encode(value);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');}
export function semanticInputs(suite=linkageFixtures){
 validateSuite(suite);
 return suite.map(c=>({caseId:c.id,asOf:c.asOf,query:{id:c.query.id,text:c.query.text,reportedAt:c.query.reportedAt,recordedAt:c.query.recordedAt},candidates:knownCandidates(c.query,c.candidates,c.asOf).map(r=>({id:r.id,text:r.text,reportedAt:r.reportedAt,recordedAt:r.recordedAt})).sort((a,b)=>a.id.localeCompare(b.id))})).sort((a,b)=>a.caseId.localeCompare(b.caseId));
}
export async function semanticInputHash(suite=linkageFixtures){return sha256(JSON.stringify(semanticInputs(suite)));}
export async function validateSemanticRun(run,suite=linkageFixtures){
 const inputs=semanticInputs(suite);if(!run||run.format!=='ruthless-saved-semantic-run'||run.version!==1||run.suiteVersion!==LINKAGE_SUITE_VERSION||run.inputHash!==await semanticInputHash(suite))fail('Saved model run is stale or bound to different reports.');
 if(JSON.stringify(run.model)!==JSON.stringify(SEMANTIC_MODEL))fail('Saved model configuration is not the pinned experiment.');
 if(typeof run.executedAt!=='string'||!Number.isFinite(Date.parse(run.executedAt))||!Number.isFinite(run.durationMs)||run.durationMs<0||run.durationMs>86400000)fail('Invalid run timing.');
 if(!Array.isArray(run.assets)||run.assets.length<3||run.assets.length>10||run.assets.some(a=>!a||typeof a.file!=='string'||a.file.length>300||!Number.isSafeInteger(a.bytes)||a.bytes<=0||!/^[a-f0-9]{64}$/.test(a.sha256)))fail('Invalid retained model-asset hashes.');
 if(!run.assets.some(a=>a.file.endsWith('model_quantized.onnx')))fail('Retained model weights are missing.');
 if(!Array.isArray(run.rows)||run.rows.length!==inputs.length)fail('Saved run must cover every fixture case.');
 const seen=new Set();for(const row of run.rows){const source=inputs.find(c=>c.caseId===row.caseId);if(!source||seen.has(row.caseId)||row.queryId!==source.query.id)fail('Unknown or duplicate model-run case.');seen.add(row.caseId);
  if(!Array.isArray(row.scores)||row.scores.length!==source.candidates.length)fail('Every eligible candidate needs one score.');const candidateIds=new Set();for(const r of row.scores){if(!source.candidates.some(c=>c.id===r.id)||candidateIds.has(r.id)||!Number.isFinite(r.cosine)||r.cosine<-1||r.cosine>1)fail('Malformed model-run score.');candidateIds.add(r.id);}
 }
 const expected=inputs.flatMap(c=>[c.query,...c.candidates]);if(!Array.isArray(run.sources)||run.sources.length!==expected.length)fail('Every model input needs its source binding.');const sourceIds=new Set();for(const s of run.sources){const original=expected.find(r=>r.id===s.id);if(!original||sourceIds.has(s.id)||s.sha256!==await sha256(original.text)||!Number.isSafeInteger(s.tokens)||s.tokens<1||s.tokens>SEMANTIC_MODEL.maxLength||s.truncated!==false)fail('Invalid source hash or truncation record.');sourceIds.add(s.id);}
 return structuredClone(run);
}
export function semanticEvaluation(split,checkedRun,suite=linkageFixtures){
 if(!['development','evaluation'].includes(split))fail('Unknown evaluation partition.');
 // Call only with the result of validateSemanticRun. This function is a pure
 // evaluator; hashes identify inputs but do not authenticate a run's author.
 const rows=suite.filter(c=>c.split===split).map(c=>{const source=checkedRun.rows.find(r=>r.caseId===c.id);if(!source)fail('Missing saved model case.');const candidates=knownCandidates(c.query,c.candidates,c.asOf);return {id:c.id,category:c.category,query:c.query,asOf:c.asOf,candidates,excluded:c.candidates.length-candidates.length,ranking:source.scores.filter(r=>r.cosine>0).map(r=>({id:r.id,score:r.cosine})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))};});
 return {id:'multilingual',name:'Multilingual MiniLM · saved run',metrics:summarizeRankings(rows),rows};
}
