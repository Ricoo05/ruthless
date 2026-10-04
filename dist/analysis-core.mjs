import {EVALUATION_CASES} from './evaluation-fixtures.mjs';
import {validateCandidateOutput} from './evaluation-core.mjs';

const fail=m=>{throw new Error(m);};
const id=v=>{if(typeof v!=='string'||!/^[a-zA-Z0-9_-]{1,60}$/.test(v))fail('Invalid analysis identifier.');return v;};
const text=(v,label,max,empty=false)=>{if(typeof v!=='string'||v.length>max||(!empty&&!v.trim()))fail(`Invalid ${label}.`);return v;};
const exact=(v,keys)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!==[...keys].sort().join(','))fail('Unexpected analysis fields.');};
export function analysisScenario(scenarioId){const c=EVALUATION_CASES.find(c=>c.id===scenarioId);if(!c)fail('Choose a bundled fictional scenario.');return structuredClone({id:c.id,split:c.split,category:c.category,question:c.question,documents:c.documents});}
const sourceKeys=['publisher','originGroup','reportedAt','language','locator','accessNote','excerpt','synthetic'];
export function matchesAnalysisSource(d,source){return d?.synthetic===true&&d.url===''&&sourceKeys.every(k=>d[k]===source[k]);}
export function analysisSourceSnapshot(d){return Object.fromEntries(['id','assessmentId','title','url','recordedAt','supersedesDocumentId','revisionNote',...sourceKeys].map(k=>[k,d[k]]));}
export function analysisIsCurrent(workspace,run){const c=workspace.assessments.find(c=>c.id===run.assessmentId);return !!c&&JSON.stringify(c)===JSON.stringify(run.snapshot.assessment)&&run.snapshot.sources.every(s=>{const d=workspace.documents.find(d=>d.id===s.document.id);return d&&JSON.stringify(analysisSourceSnapshot(d))===JSON.stringify(s.document)&&!workspace.documents.some(x=>x.supersedesDocumentId===d.id);});}
export function validateAnalysisRuns(value,workspace,{caseRecord,documentRecord,day}){
  if(!Array.isArray(value)||value.length>40)fail('Workspace limit: 40 analytical drafts.');
  const runs=value.map(r=>{
    exact(r,['id','assessmentId','scenarioId','createdAt','kind','candidateLabel','snapshot','output','status','reviewNote','reviewedAt']);
    const scenario=analysisScenario(r.scenarioId),assessmentId=id(r.assessmentId),createdAt=day(r.createdAt);
    if(!['Imported candidate','Local API execution','Authored control'].includes(r.kind))fail('Invalid analysis origin.');
    exact(r.snapshot,['assessment','sources']);const assessment=caseRecord(r.snapshot.assessment);
    if(assessment.id!==assessmentId||assessment.question!==scenario.question||!workspace.assessments.some(c=>c.id===assessmentId))fail('Analysis question must match its fictional scenario and assessment.');
    if(!Array.isArray(r.snapshot.sources)||r.snapshot.sources.length!==scenario.documents.length)fail('Analysis must retain every selected source.');
    const seen=new Set(),sourceIDs=new Set();
    const sources=r.snapshot.sources.map(s=>{
      exact(s,['documentId','document']);id(s.documentId);exact(s.document,['id','assessmentId','title','url','recordedAt','supersedesDocumentId','revisionNote',...sourceKeys]);
      const source=scenario.documents.find(d=>d.id===s.documentId),document=documentRecord({...s.document,reviewNote:'',importBatchId:'',externalRecordId:''});
      if(!source||seen.has(s.documentId)||sourceIDs.has(document.id)||document.assessmentId!==assessmentId||!matchesAnalysisSource(document,source)||createdAt<document.recordedAt)fail('Analysis source binding is invalid.');
      const retained=workspace.documents.find(d=>d.id===document.id);if(!retained||JSON.stringify(analysisSourceSnapshot(retained))!==JSON.stringify(analysisSourceSnapshot(document)))fail('Analysis source must match its retained excerpt.');
      seen.add(s.documentId);sourceIDs.add(document.id);return {documentId:s.documentId,document:analysisSourceSnapshot(document)};
    });
    if(!['Pending','Considered','Rejected'].includes(r.status))fail('Invalid analysis review state.');
    const reviewNote=text(r.reviewNote,'analysis review note',2000,true),reviewedAt=r.reviewedAt?day(r.reviewedAt):'';
    if(r.status==='Pending'?(reviewNote!==''||reviewedAt!==''):(!reviewNote.trim()||!reviewedAt||reviewedAt<createdAt))fail('Analysis consideration requires a note and nondecreasing date.');
    return {id:id(r.id),assessmentId,scenarioId:scenario.id,createdAt,kind:r.kind,candidateLabel:text(r.candidateLabel,'candidate label',200),snapshot:{assessment,sources},output:validateCandidateOutput(r.output,scenario.documents),status:r.status,reviewNote,reviewedAt};
  });
  if(new Set(runs.map(r=>r.id)).size!==runs.length)fail('Duplicate analysis identifiers.');return runs;
}
