import {validateProposalRuns,proposalIsCurrent,fixtureRun} from './proposal-core.mjs';
export {proposalIsCurrent} from './proposal-core.mjs';
export const FORMAT='ruthless-threat-workspace';
export const WORKSPACE_VERSION=5;
export const MAX_BYTES=2_000_000;
export const SCOPES=['Domestic','Cross-border','International'];
export const STATES=['Draft','Needs review','Reviewed'];
export const CONFIDENCE=['Insufficient','Low','Moderate','High'];
export const PRIORITIES=['Routine','Priority review'];
export const RELATIONS=['Supports','Challenges','Context'];
export const CLAIM_STATES=['Unverified','Reported','Disputed','Context'];
export const TASK_STATES=['Open','In progress','Blocked','Completed','Cancelled'];
const fail=m=>{throw new Error(m);};
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const str=(v,label,max=4000,required=true)=>{if(typeof v!=='string')fail(`${label} must be text.`);const s=v.trim();if((required&&!s)||s.length>max)fail(`${label} must contain ${required?'1':'0'}–${max} characters.`);return s;};
const choice=(v,choices,label)=>{if(!choices.includes(v))fail(`Invalid ${label}.`);return v;};
const id=v=>{if(typeof v!=='string'||!/^[a-zA-Z0-9_-]{1,60}$/.test(v))fail('Invalid record identifier.');return v;};
export function day(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)fail('Use a real date in YYYY-MM-DD format.');return v;}
export function sourceURL(v){const s=str(v,'Source URL',2000,false);if(!s)return '';let u;try{u=new URL(s);}catch{fail('Source URL must be a valid HTTPS URL.');}if(u.protocol!=='https:'||u.username||u.password)fail('Source URL must use HTTPS without embedded credentials.');return u.href;}
export function serializeWorkspace(v){const raw=JSON.stringify(v);if(new TextEncoder().encode(raw).length>MAX_BYTES)fail('Workspace exceeds the 2 MB save/open limit. Current work is unchanged.');return raw;}
function caseRecord(v){
  if(!object(v))fail('Invalid assessment record.');
  if(!Array.isArray(v.citedEvidence)||v.citedEvidence.length>1000)fail('Invalid evidence citations.');
  const citedEvidence=v.citedEvidence.map(id);if(new Set(citedEvidence).size!==citedEvidence.length)fail('Duplicate evidence citations.');
  const revisionIDs=v.reviewedRevisionIds??[];if(!Array.isArray(revisionIDs)||revisionIDs.length>200)fail('Invalid reviewed revision identifiers.');const reviewedRevisionIds=revisionIDs.map(id);if(new Set(reviewedRevisionIds).size!==reviewedRevisionIds.length)fail('Duplicate reviewed revision identifiers.');
  return {id:id(v.id),title:str(v.title,'Title',180),area:str(v.area,'Area',150),scope:choice(v.scope,SCOPES,'scope'),asOf:day(v.asOf),question:str(v.question,'Intelligence question',1500),judgment:str(v.judgment,'Assessment',4000,false),gaps:str(v.gaps,'Information gaps',2000,false),confidence:choice(v.confidence,CONFIDENCE,'confidence'),priority:choice(v.priority,PRIORITIES,'review priority'),status:choice(v.status,STATES,'review status'),reviewNote:str(v.reviewNote,'Review note',2000,false),citedEvidence,reviewedRevisionIds};
}
function evidenceRecord(v){
  if(!object(v)||typeof v.synthetic!=='boolean')fail('Invalid evidence record.');
  const reportedAt=day(v.reportedAt),recordedAt=day(v.recordedAt);if(recordedAt<reportedAt)fail('Recorded date cannot precede report date.');
  const url=sourceURL(v.url);if(!v.synthetic&&!url)fail('Non-synthetic evidence requires a source URL.');
  return {id:id(v.id),assessmentId:id(v.assessmentId),title:str(v.title,'Evidence title',200),publisher:str(v.publisher,'Publisher',150),originGroup:str(v.originGroup,'Underlying source group',150),url,reportedAt,recordedAt,statement:str(v.statement,'Evidence statement',4000),claimState:choice(v.claimState,CLAIM_STATES,'claim state'),relation:choice(v.relation,RELATIONS,'relation'),synthetic:v.synthetic,sourceDocumentId:v.sourceDocumentId?id(v.sourceDocumentId):'',proposalRunId:v.proposalRunId?id(v.proposalRunId):'',proposalId:v.proposalId?id(v.proposalId):''};
}
function documentRecord(v){
  if(!object(v)||typeof v.synthetic!=='boolean')fail('Invalid source document.');
  const reportedAt=day(v.reportedAt),recordedAt=day(v.recordedAt),url=sourceURL(v.url);
  if(recordedAt<reportedAt)fail('Recorded date cannot precede report date.');
  if(!v.synthetic&&!url)fail('Non-synthetic documents require a source URL.');
  return {id:id(v.id),assessmentId:id(v.assessmentId),title:str(v.title,'Document title',200),publisher:str(v.publisher,'Publisher',150),originGroup:str(v.originGroup,'Underlying source group',150),url,reportedAt,recordedAt,language:str(v.language,'Original language',80),locator:str(v.locator,'Excerpt location',200),accessNote:str(v.accessNote,'Access and reuse conditions',1500),excerpt:str(v.excerpt,'Source excerpt',4000),synthetic:v.synthetic,reviewNote:str(v.reviewNote??'','Intake review note',2000,false),supersedesDocumentId:v.supersedesDocumentId?id(v.supersedesDocumentId):'',revisionNote:str(v.revisionNote??'','Source revision note',2000,false),importBatchId:v.importBatchId?id(v.importBatchId):'',externalRecordId:v.externalRecordId?id(v.externalRecordId):''};
}
export function normalizeSourceDocument(input){return documentRecord(input);}
function importBatchRecord(v){
  if(!object(v)||!Array.isArray(v.documentIds)||!v.documentIds.length||v.documentIds.length>50)fail('Invalid import batch: 1–50 new documents required.');const documentIds=v.documentIds.map(id);if(new Set(documentIds).size!==documentIds.length)fail('Duplicate import document identifiers.');
  return {id:id(v.id),sourceSystem:id(v.sourceSystem),label:str(v.label,'Import label',200),stagedAt:day(v.stagedAt),permissionNote:str(v.permissionNote,'Import permission review',1500),documentIds};
}
export function documentIsCurrent(workspace,documentId){return workspace.documents.some(d=>d.id===documentId)&&!workspace.documents.some(d=>d.supersedesDocumentId===documentId);}
export function requiredRevisionIds(workspace,c){
  const starts=workspace.evidence.filter(e=>c.citedEvidence.includes(e.id)&&e.sourceDocumentId).map(e=>e.sourceDocumentId),ids=new Set();
  for(const start of starts){let current=start;const visited=new Set([start]);while(true){const next=workspace.documents.find(d=>d.supersedesDocumentId===current);if(!next)break;if(visited.has(next.id))fail('Source revision cycle.');visited.add(next.id);ids.add(next.id);current=next.id;}}
  return [...ids].sort();
}
function taskRecord(v){
  if(!object(v)||!Array.isArray(v.linkedEvidence)||v.linkedEvidence.length>1000)fail('Invalid research task.');
  const linkedEvidence=v.linkedEvidence.map(id);if(new Set(linkedEvidence).size!==linkedEvidence.length)fail('Duplicate task evidence links.');
  const createdAt=day(v.createdAt),updatedAt=day(v.updatedAt);if(updatedAt<createdAt)fail('Task update date cannot precede creation.');
  const result={id:id(v.id),assessmentId:id(v.assessmentId),title:str(v.title,'Task title',180),scope:str(v.scope,'Permitted research scope',1500),owner:str(v.owner,'Owner label',120,false),dueAt:day(v.dueAt),createdAt,updatedAt,status:choice(v.status,TASK_STATES,'task status'),note:str(v.note,'Task progress note',2000,false),resultNote:str(v.resultNote,'Task result note',2000,false),linkedEvidence};
  if(['In progress','Completed'].includes(result.status)&&!result.owner)fail('In progress and Completed tasks require an owner label.');
  if(['Blocked','Cancelled'].includes(result.status)&&!result.note)fail('Blocked and Cancelled tasks require a progress note.');
  if(result.status==='Completed'&&(!result.resultNote||!linkedEvidence.length))fail('Completed tasks require a result note and linked evidence.');
  return result;
}
function unique(records){if(new Set(records.map(v=>v.id)).size!==records.length)fail('Duplicate record identifiers.');}
function assertReview(c,evidence){
  if(c.status!=='Reviewed')return;
  if(!c.judgment||!c.gaps||!c.reviewNote||!c.citedEvidence.length)fail('Reviewed assessments require a judgment, information gaps, supporting citations and review note.');
  if(c.confidence==='Insufficient')fail('Insufficient confidence assessments must remain open for review.');
  if(evidence.some(e=>c.citedEvidence.includes(e.id)&&e.reportedAt>c.asOf))fail('Reviewed assessments cannot cite reports later than their as-of date.');
}
export function validateWorkspace(v){
  if(!object(v)||v.format!==FORMAT||![1,2,3,4,WORKSPACE_VERSION].includes(v.version))fail('Unsupported threat workspace format.');
  if(!Array.isArray(v.assessments)||!v.assessments.length||v.assessments.length>100||!Array.isArray(v.evidence)||v.evidence.length>1000||!Array.isArray(v.history)||v.history.length>2000)fail('Workspace limits: 1–100 assessments, 1,000 evidence records, 2,000 history entries.');
  if(v.version>=2&&(!Array.isArray(v.documents)||v.documents.length>200))fail('Workspace limit: 200 source documents.');
  if(v.version>=3&&(!Array.isArray(v.tasks)||v.tasks.length>500))fail('Workspace limit: 500 research tasks.');
  const normalizeCase=c=>caseRecord({...c,...(v.version<5?{reviewedRevisionIds:[]}:{})});
  const assessments=v.assessments.map(normalizeCase),evidence=v.evidence.map(e=>evidenceRecord({...e,...(v.version===1?{sourceDocumentId:''}:{}),...(v.version<4?{proposalRunId:'',proposalId:''}:{})})),documents=v.version===1?[]:v.documents.map(d=>documentRecord({...d,...(v.version<5?{supersedesDocumentId:'',revisionNote:'',importBatchId:'',externalRecordId:''}:{})}));unique(assessments);unique(evidence);unique(documents);
  const tasks=v.version>=3?v.tasks.map(taskRecord):[];unique(tasks);
  const proposalRuns=v.version>=4?validateProposalRuns(v.proposalRuns,normalizeCase,documentRecord):[];
  if(v.version>=5&&(!Array.isArray(v.importBatches)||v.importBatches.length>40))fail('Workspace limit: 40 import batches.');const importBatches=v.version>=5?v.importBatches.map(importBatchRecord):[];unique(importBatches);
  const caseIDs=new Set(assessments.map(c=>c.id)),evidenceIDs=new Map(evidence.map(e=>[e.id,e.assessmentId]));
  for(const e of evidence)if(!caseIDs.has(e.assessmentId))fail('Evidence refers to an unknown assessment.');
  for(const d of documents)if(!caseIDs.has(d.assessmentId))fail('Document refers to an unknown assessment.');
  const documentIDs=new Map(documents.map(d=>[d.id,d])),linked=new Set();
  const parents=new Set();
  for(const d of documents){
    if(!d.supersedesDocumentId){if(d.revisionNote)fail('Revision notes require an earlier source document.');continue;}
    const parent=documentIDs.get(d.supersedesDocumentId);if(!parent||parent.id===d.id||parent.assessmentId!==d.assessmentId)fail('A source revision requires an earlier document in the same assessment.');
    if(parents.has(parent.id))fail('Source revisions cannot branch.');parents.add(parent.id);
    if(['publisher','originGroup','synthetic'].some(k=>d[k]!==parent[k]))fail('Source revisions must retain publisher, underlying source group and synthetic status.');
    if(d.reportedAt<parent.reportedAt||d.recordedAt<parent.recordedAt||!d.revisionNote||d.excerpt===parent.excerpt)fail('Source revisions require changed wording, a note and nondecreasing source dates.');
    const visited=new Set([d.id]);let current=parent;while(current){if(visited.has(current.id))fail('Source revision cycle.');visited.add(current.id);current=documentIDs.get(current.supersedesDocumentId);}
  }
  const batchIDs=new Map(importBatches.map(b=>[b.id,b])),externalKeys=new Set();
  for(const b of importBatches)for(const documentId of b.documentIds){const d=documentIDs.get(documentId);if(!d||d.importBatchId!==b.id||!d.externalRecordId||b.stagedAt<d.recordedAt)fail('Import batch must match its retained source documents and dates.');}
  for(const d of documents)if(d.importBatchId||d.externalRecordId){const b=batchIDs.get(d.importBatchId);if(!b||!b.documentIds.includes(d.id)||!d.externalRecordId)fail('Document import lineage is inconsistent.');const key=`${b.sourceSystem}:${d.externalRecordId}`;if(externalKeys.has(key))fail('Duplicate external source record identity.');externalKeys.add(key);}
  for(const e of evidence)if(e.sourceDocumentId){
    const d=documentIDs.get(e.sourceDocumentId);if(!d||d.assessmentId!==e.assessmentId)fail('Evidence must reference a document in the same assessment.');
    if(linked.has(d.id))fail('A source document can be incorporated only once.');linked.add(d.id);
    if(!d.reviewNote)fail('Incorporated documents require an intake review note.');
    if(['publisher','originGroup','url','reportedAt','recordedAt','synthetic'].some(k=>e[k]!==d[k]))fail('Evidence provenance must match its source document.');
  }
  for(const c of assessments){if(c.citedEvidence.some(e=>evidenceIDs.get(e)!==c.id))fail('Citations must refer to evidence in the same assessment.');if(c.reviewedRevisionIds.some(id=>documentIDs.get(id)?.assessmentId!==c.id||!documentIDs.get(id)?.supersedesDocumentId))fail('Reviewed revisions must belong to this assessment.');assertReview(c,evidence);if(c.status==='Reviewed'){const required=requiredRevisionIds({documents,evidence},c);if(required.some(id=>!c.reviewedRevisionIds.includes(id)))fail('Reviewed assessments must acknowledge revisions to their cited sources.');if(required.some(id=>documentIDs.get(id).reportedAt>c.asOf))fail('Reviewed assessments cannot acknowledge source revisions later than their as-of date.');}}
  for(const t of tasks){
    if(!caseIDs.has(t.assessmentId))fail('Task refers to an unknown assessment.');
    if(t.linkedEvidence.some(e=>evidenceIDs.get(e)!==t.assessmentId))fail('Task evidence must belong to the same assessment.');
    if(t.status==='Completed'&&evidence.some(e=>t.linkedEvidence.includes(e.id)&&(e.reportedAt>t.updatedAt||e.recordedAt>t.updatedAt)))fail('Task completion cannot precede its linked evidence.');
  }
  const proposalLinks=new Map();
  for(const r of proposalRuns){
    if(!caseIDs.has(r.assessmentId)||!documentIDs.has(r.snapshot.document.id)||documentIDs.get(r.snapshot.document.id).assessmentId!==r.assessmentId)fail('Proposal run refers to an unknown assessment or source.');
    for(const p of r.proposals){proposalLinks.set(`${r.id}:${p.id}`,{r,p});if(p.status==='Accepted'){
      const e=evidence.find(e=>e.id===p.evidenceId);if(!e||e.proposalRunId!==r.id||e.proposalId!==p.id||e.sourceDocumentId!==r.snapshot.document.id||e.assessmentId!==r.assessmentId||e.statement!==p.draftStatement)fail('Accepted proposal must match its linked evidence.');
      const d=documentIDs.get(e.sourceDocumentId);if(Object.keys(r.snapshot.document).some(k=>d[k]!==r.snapshot.document[k]))fail('Accepted proposal source must match the retained document.');
    }}
  }
  for(const e of evidence)if(e.proposalRunId||e.proposalId){const link=proposalLinks.get(`${e.proposalRunId}:${e.proposalId}`);if(!link||link.p.status!=='Accepted'||link.p.evidenceId!==e.id)fail('Evidence proposal lineage is inconsistent.');}
  const history=v.history.map(h=>{if(!object(h)||!caseIDs.has(h.assessmentId))fail('Invalid history reference.');return {assessmentId:id(h.assessmentId),at:day(h.at),action:str(h.action,'History action',150),note:str(h.note,'History note',2000,false)};});
  const result={format:FORMAT,version:WORKSPACE_VERSION,assessments,evidence,documents,tasks,proposalRuns,importBatches,history};serializeWorkspace(result);return result;
}
export function parseWorkspace(raw){if(typeof raw!=='string'||new TextEncoder().encode(raw).length>MAX_BYTES)fail('Workspace must be no larger than 2 MB in UTF-8.');let v;try{v=JSON.parse(raw);}catch{fail('Workspace is not valid JSON.');}return validateWorkspace(v);}
export function evidenceSummary(workspace,assessmentId){const rows=workspace.evidence.filter(e=>e.assessmentId===assessmentId),superseded=e=>e.sourceDocumentId&&!documentIsCurrent(workspace,e.sourceDocumentId);return {records:rows.length,supersededRecords:rows.filter(superseded).length,sourceGroups:new Set(rows.filter(e=>e.relation==='Supports'&&!superseded(e)).map(e=>e.originGroup.toLowerCase())).size,challenging:rows.filter(e=>e.relation==='Challenges').length,unverified:rows.filter(e=>e.claimState==='Unverified').length,timeline:[...rows].sort((a,b)=>a.reportedAt.localeCompare(b.reportedAt)||a.id.localeCompare(b.id))};}
export function updateAssessment(workspace,assessmentId,changes,at){
  day(at);const original=workspace.assessments.find(c=>c.id===assessmentId);if(!original)fail('Assessment no longer exists.');
  let next=caseRecord({...original,...changes,id:original.id});
  const revisions=requiredRevisionIds(workspace,next);if(next.status==='Reviewed'){if(revisions.length&&changes.revisionsAcknowledged!==true)fail('Acknowledge revisions to cited sources before marking Reviewed.');next={...next,reviewedRevisionIds:revisions};}
  const previousEvidence=workspace.evidence.filter(e=>e.assessmentId===assessmentId);
  if(next.status==='Reviewed'&&previousEvidence.some(e=>e.relation==='Challenges')&&!changes.challengesAcknowledged)fail('Acknowledge that conflicting evidence was considered before marking Reviewed.');
  const result={...workspace,assessments:workspace.assessments.map(c=>c.id===assessmentId?next:c),history:[...workspace.history,{assessmentId,at,action:'Assessment updated',note:`${original.status} → ${next.status}; ${next.confidence} confidence (analyst assigned)`}]};
  return validateWorkspace(result);
}
export function addEvidence(workspace,input,at){
  day(at);const evidence=evidenceRecord(input);if(workspace.evidence.some(e=>e.id===evidence.id))fail('Evidence identifier already exists.');
  return validateWorkspace({...workspace,evidence:[...workspace.evidence,evidence],assessments:workspace.assessments.map(c=>c.id===evidence.assessmentId?{...c,status:c.status==='Reviewed'?'Needs review':c.status}:c),history:[...workspace.history,{assessmentId:evidence.assessmentId,at,action:'Evidence added',note:`${evidence.id}: prior reviewed conclusions reopened`} ]});
}
export function addAssessment(workspace,input,at){day(at);return validateWorkspace({...workspace,assessments:[...workspace.assessments,caseRecord(input)],history:[...workspace.history,{assessmentId:input.id,at,action:'Assessment created',note:'Analyst-defined intelligence question'}]});}
export function stageDocument(workspace,input,at){
  day(at);const d=documentRecord({...input,reviewNote:''});
  if(d.importBatchId||d.externalRecordId)fail('Stage external records through the validated import adapter.');
  if(d.supersedesDocumentId){if(input.accessAcknowledged!==true)fail('Confirm access and reuse conditions before staging a source revision.');if(!documentIsCurrent(workspace,d.supersedesDocumentId))fail('Revise the latest source document; an earlier revision cannot branch.');if(d.recordedAt>at)fail('Source revision staging cannot precede its recorded date.');}
  if(workspace.documents.some(x=>x.id===d.id))fail('Document identifier already exists.');
  if(workspace.documents.some(x=>x.assessmentId===d.assessmentId&&x.url===d.url&&x.excerpt===d.excerpt&&x.publisher===d.publisher))fail('This source excerpt is already in the intake queue for this assessment.');
  return validateWorkspace({...workspace,documents:[...workspace.documents,d],assessments:workspace.assessments.map(c=>c.id===d.assessmentId&&d.supersedesDocumentId&&c.status==='Reviewed'?{...c,status:'Needs review'}:c),history:[...workspace.history,{assessmentId:d.assessmentId,at,action:d.supersedesDocumentId?'Source revision staged':'Document staged',note:d.supersedesDocumentId?`${d.supersedesDocumentId} → ${d.id}: earlier source retained; reviewed conclusion reopened`:`${d.id}: awaiting analyst intake review`} ]});
}
export function incorporateDocument(workspace,documentId,input,at){
  day(at);const d=workspace.documents.find(x=>x.id===documentId);if(!d)fail('Unknown source document.');
  if(!documentIsCurrent(workspace,d.id))fail('This source is superseded. Review its latest revision instead.');
  if(workspace.evidence.some(e=>e.sourceDocumentId===d.id))fail('This document has already been incorporated.');
  if(input.accessAcknowledged!==true)fail('Confirm the source access and reuse conditions before incorporation.');
  const reviewNote=str(input.reviewNote,'Intake review note',2000);
  const result=addEvidence({...workspace,documents:workspace.documents.map(x=>x.id===d.id?{...x,reviewNote}:x)},{...d,id:input.id,sourceDocumentId:d.id,statement:input.statement,claimState:input.claimState,relation:input.relation,proposalRunId:input.proposalRunId,proposalId:input.proposalId},at);
  result.history[result.history.length-1]={assessmentId:d.assessmentId,at,action:'Document incorporated',note:`${d.id} → ${input.id}: analyst reviewed source conditions and statement; not independent verification`};
  return validateWorkspace(result);
}
export function createFixtureProposal(workspace,documentId,runId,proposalId,at){
  day(at);const d=workspace.documents.find(d=>d.id===documentId),c=workspace.assessments.find(c=>c.id===d?.assessmentId);
  if(!d||!c||!d.synthetic)fail('Select a staged synthetic document for the local fixture.');
  if(!documentIsCurrent(workspace,d.id))fail('This source is superseded. Select its latest revision.');
  if(workspace.evidence.some(e=>e.sourceDocumentId===documentId))fail('This document has already been incorporated.');
  if(workspace.proposalRuns.some(r=>r.snapshot.document.id===documentId&&r.proposals.some(p=>p.status==='Proposed')))fail('Review or reject the pending proposal for this source first.');
  const run=fixtureRun(c,d,runId,proposalId,at);
  return validateWorkspace({...workspace,proposalRuns:[...workspace.proposalRuns,run],history:[...workspace.history,{assessmentId:c.id,at,action:'Fixture proposal created',note:`${runId}: local deterministic fixture; no AI called; evidence unchanged`} ]});
}
export function reviewProposal(workspace,runId,proposalId,input,at){
  day(at);const r=workspace.proposalRuns.find(r=>r.id===runId),p=r?.proposals.find(p=>p.id===proposalId);
  if(!p)fail('Unknown proposal.');if(p.status!=='Proposed')fail('This proposal has already been reviewed.');
  if(at<r.createdAt)fail('Proposal review cannot precede creation.');
  const status=choice(input.status,['Accepted','Rejected'],'proposal decision'),reviewNote=str(input.reviewNote,'Proposal review note',2000);
  if(status==='Accepted'&&!proposalIsCurrent(workspace,r))fail('Stale proposal: the assessment or source changed. Reject it and create a new fixture.');
  const evidenceId=status==='Accepted'?id(input.evidenceId):'';
  const result={...workspace,proposalRuns:workspace.proposalRuns.map(run=>run.id===r.id?{...run,proposals:run.proposals.map(proposal=>proposal.id===p.id?{...proposal,status,reviewNote,reviewedAt:at,evidenceId}:proposal)}:run)};
  if(status==='Rejected')return validateWorkspace({...result,history:[...workspace.history,{assessmentId:r.assessmentId,at,action:'Proposal rejected',note:`${r.id} / ${p.id}: ${reviewNote}`} ]});
  const next=incorporateDocument(result,r.snapshot.document.id,{id:evidenceId,statement:p.draftStatement,claimState:input.claimState,relation:input.relation,reviewNote,accessAcknowledged:input.accessAcknowledged,proposalRunId:r.id,proposalId:p.id},at);
  next.history[next.history.length-1]={assessmentId:r.assessmentId,at,action:'Proposal accepted as evidence',note:`${r.id} / ${p.id} → ${evidenceId}: analyst reviewed local fixture; not independent verification`};
  return validateWorkspace(next);
}
export function addTask(workspace,input,at){
  day(at);const task=taskRecord({...input,createdAt:at,updatedAt:at,status:'Open',note:'',resultNote:'',linkedEvidence:[]});
  if(workspace.tasks.some(t=>t.id===task.id))fail('Task identifier already exists.');
  return validateWorkspace({...workspace,tasks:[...workspace.tasks,task],history:[...workspace.history,{assessmentId:task.assessmentId,at,action:'Research task created',note:`${task.id}: ${task.title}; owner label ${task.owner||'Unassigned'}`} ]});
}
export function updateTask(workspace,taskId,changes,at){
  day(at);const original=workspace.tasks.find(t=>t.id===taskId);if(!original)fail('Unknown research task.');
  if(at<original.updatedAt)fail('Task update date cannot move backwards.');
  const next=taskRecord({...original,owner:changes.owner??original.owner,dueAt:changes.dueAt??original.dueAt,status:changes.status??original.status,note:changes.note??original.note,resultNote:changes.resultNote??original.resultNote,linkedEvidence:changes.linkedEvidence??original.linkedEvidence,updatedAt:at});
  if(['Completed','Cancelled'].includes(original.status)&&next.status!==original.status&&(!next.note||next.note===original.note))fail('Reopening a finished task requires a new progress note.');
  return validateWorkspace({...workspace,tasks:workspace.tasks.map(t=>t.id===taskId?next:t),history:[...workspace.history,{assessmentId:next.assessmentId,at,action:'Research task updated',note:`${taskId}: ${original.status} → ${next.status}; owner label ${original.owner||'Unassigned'} → ${next.owner||'Unassigned'}`} ]});
}
export function searchTasks(workspace,{query='',status='All',assessmentId='All',overdueOnly=false,asOf}={}){
  if(overdueOnly)day(asOf);const q=query.trim().toLowerCase();
  return workspace.tasks.filter(t=>(status==='All'||t.status===status)&&(assessmentId==='All'||t.assessmentId===assessmentId)&&(!q||[t.title,t.owner,t.scope].join(' ').toLowerCase().includes(q))&&(!overdueOnly||(!['Completed','Cancelled'].includes(t.status)&&t.dueAt<asOf))).sort((a,b)=>a.dueAt.localeCompare(b.dueAt)||a.id.localeCompare(b.id));
}
export function searchAssessments(workspace,{query='',scope='All',status='All'}={}){const q=query.toLowerCase().trim();return workspace.assessments.filter(c=>(scope==='All'||c.scope===scope)&&(status==='All'||c.status===status)&&(!q||[c.title,c.area,c.question].join(' ').toLowerCase().includes(q)));}
export function exportAssessment(workspace,assessmentId){
  const c=workspace.assessments.find(c=>c.id===assessmentId);if(!c)fail('Unknown assessment.');const s=evidenceSummary(workspace,c.id);const clean=v=>String(v).replace(/[\r\n]+/g,' ').replace(/[\\`*_{}\[\]<>#]/g,'');
  const quote=v=>String(v).replace(/[\\`*_{}\[\]#]/g,'\\$&').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\r?\n/g,'\n> ');
  const lines=['# Ruthless — analyst assessment',`Title: ${clean(c.title)}`,`Area: ${clean(c.area)} | Scope: ${c.scope} | As of: ${c.asOf}`,`Status: ${c.status} | Confidence: ${c.confidence} (analyst assigned) | Priority: ${c.priority}`,`Synthetic records: ${s.timeline.filter(e=>e.synthetic).length}/${s.records}`,'','Prototype analyst workspace. This report is not an attack forecast, designation, determination of guilt, or instruction for operational action. Source labels and review status are analyst-supplied; external files and history are editable. Reviewed does not mean independent agency approval.','',`Question: ${clean(c.question)}`,`Judgment: ${clean(c.judgment)||'Not recorded'}`,`Information gaps: ${clean(c.gaps)||'Not recorded'}`,`Review note: ${clean(c.reviewNote)||'Not recorded'}`,`Cited evidence IDs: ${c.citedEvidence.join(', ')||'None'}`,'','## Evidence timeline',`${s.sourceGroups} analyst-assigned supporting source groups. This count does not establish independence or truth.`,''];
  for(const e of s.timeline){lines.push(`### ${e.id} — ${clean(e.title)}`,`${e.reportedAt} | ${e.synthetic?'SYNTHETIC':'Analyst-entered public reference'} | ${e.claimState} | ${e.relation}`,`Publisher: ${clean(e.publisher)} | Underlying source group: ${clean(e.originGroup)}`,`Statement: ${clean(e.statement)}`,`Source URL (unverified by application): ${e.url||'Synthetic training record; no publisher claim'}`);
    if(e.sourceDocumentId&&!documentIsCurrent(workspace,e.sourceDocumentId))lines.push('SOURCE SUPERSEDED: earlier evidence retained as history; inspect source revisions before relying on this statement.');
    if(e.proposalRunId)lines.push(`Proposal lineage: ${e.proposalRunId} / ${e.proposalId} — local synthetic fixture, no AI called; analyst accepted`);
    const d=workspace.documents.find(d=>d.id===e.sourceDocumentId);if(d)lines.push(`Source document: ${d.id} | Language: ${clean(d.language)} | Excerpt location: ${clean(d.locator)}`,'Retained excerpt (escaped for Markdown display; original preserved in workspace):',`> ${quote(d.excerpt)}`,`Access/reuse conditions (analyst recorded): ${clean(d.accessNote)}`,`Intake review note: ${clean(d.reviewNote)}`);lines.push('');
  }
  lines.push('## Source revisions','Staged corrections are source records, not automatically incorporated evidence. Earlier excerpts and judgments are retained.',`Acknowledged revision IDs (analyst supplied): ${c.reviewedRevisionIds.join(', ')||'None'}`,'');
  for(const d of workspace.documents.filter(d=>d.assessmentId===assessmentId&&d.supersedesDocumentId))lines.push(`### ${d.id} — ${clean(d.title)}`,`Supersedes: ${d.supersedesDocumentId} | Reported ${d.reportedAt} | ${documentIsCurrent(workspace,d.id)?'Latest retained revision':'Superseded revision'}`,`Revision note: ${clean(d.revisionNote)}`,'Retained revised excerpt:',`> ${quote(d.excerpt)}`,`Access/reuse conditions (analyst recorded): ${clean(d.accessNote)}`,'');
  lines.push('## Research follow-up tasks','Owner labels and task completion are analyst-supplied; they do not establish verified identity or approve an assessment.','');
  for(const t of workspace.tasks.filter(t=>t.assessmentId===assessmentId))lines.push(`### ${t.id} — ${clean(t.title)}`,`Status: ${t.status} | Due: ${t.dueAt} | Owner label (unverified): ${clean(t.owner)||'Unassigned'}`,`Permitted research scope: ${clean(t.scope)}`,`Progress note: ${clean(t.note)||'Not recorded'}`,`Result note: ${clean(t.resultNote)||'Not recorded'}`,`Linked evidence: ${t.linkedEvidence.join(', ')||'None'}`,'');
  for(const t of workspace.tasks.filter(t=>t.assessmentId===assessmentId&&workspace.evidence.some(e=>t.linkedEvidence.includes(e.id)&&e.sourceDocumentId&&!documentIsCurrent(workspace,e.sourceDocumentId))))lines.push(`Task ${t.id}: linked evidence has a superseded source; the previous task state/result is retained for analyst follow-up.`);
  return lines.join('\n');
}
export function demoWorkspace(){
  const base={judgment:'',gaps:'',confidence:'Insufficient',priority:'Routine',status:'Draft',reviewNote:'',citedEvidence:[],asOf:'2026-10-03'};
  return validateWorkspace({format:FORMAT,version:1,assessments:[
    {...base,id:'training-domestic',title:'Domestic incident report — training case',area:'India / fictional district',scope:'Domestic',question:'What is established by these reports, and which claims still need corroboration?',priority:'Priority review'},
    {...base,id:'training-crossborder',title:'Cross-border reporting — training case',area:'India and a fictional neighboring region',scope:'Cross-border',question:'Does the supplied evidence establish any connection between these separately reported incidents?'},
    {...base,id:'training-global',title:'International context — training case',area:'Global / fictional region',scope:'International',question:'What additional evidence would be needed before assessing relevance to India?'}
  ],evidence:[
    {id:'SYN-001',assessmentId:'training-domestic',title:'Initial local report',publisher:'Fictional publisher A',originGroup:'training-original-A',url:'',reportedAt:'2026-10-01',recordedAt:'2026-10-03',statement:'A fictional public incident was reported. Its cause and attribution are not established.',claimState:'Reported',relation:'Supports',synthetic:true},
    {id:'SYN-002',assessmentId:'training-domestic',title:'Repost of the initial report',publisher:'Fictional publisher B',originGroup:'training-original-A',url:'',reportedAt:'2026-10-02',recordedAt:'2026-10-03',statement:'This fictional report repeats the same underlying source. It is not independent corroboration.',claimState:'Unverified',relation:'Supports',synthetic:true},
    {id:'SYN-003',assessmentId:'training-domestic',title:'Conflicting explanation',publisher:'Fictional publisher C',originGroup:'training-original-C',url:'',reportedAt:'2026-10-03',recordedAt:'2026-10-03',statement:'A fictional alternative account disputes the initial interpretation. Analysts must keep this contradiction visible.',claimState:'Disputed',relation:'Challenges',synthetic:true},
    {id:'SYN-004',assessmentId:'training-crossborder',title:'Separate regional report',publisher:'Fictional publisher D',originGroup:'training-original-D',url:'',reportedAt:'2026-10-02',recordedAt:'2026-10-03',statement:'A separate fictional incident is reported elsewhere. Geographic proximity alone does not establish a shared actor or cause.',claimState:'Unverified',relation:'Context',synthetic:true}
  ],history:[]});
}
