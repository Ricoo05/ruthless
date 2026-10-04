const fail=m=>{throw new Error(m);};
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const identifier=v=>{if(typeof v!=='string'||!/^[a-zA-Z0-9_-]{1,60}$/.test(v))fail('Invalid proposal identifier.');return v;};
const text=(v,label,max,empty=false)=>{if(typeof v!=='string'||(!empty&&!v.trim())||v.length>max)fail(`Invalid ${label}.`);return v;};
const date=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)fail('Invalid proposal date.');return v;};
const keys=(v,allowed,label)=>{if(!object(v)||Object.keys(v).some(k=>!allowed.includes(k)))fail(`Unexpected fields in ${label}; executable and tool fields are not allowed.`);};
const caseKeys=['id','title','area','scope','asOf','question','judgment','gaps','confidence','priority','status','reviewNote','citedEvidence','reviewedRevisionIds'];
const documentKeys=['id','assessmentId','title','publisher','originGroup','url','reportedAt','recordedAt','language','locator','accessNote','excerpt','synthetic'];
export function proposalSnapshot(assessment,document){return {assessment:structuredClone(assessment),document:Object.fromEntries(documentKeys.map(k=>[k,document[k]]))};}
const splitSurrogate=(s,i)=>i>0&&i<s.length&&s.charCodeAt(i-1)>=0xD800&&s.charCodeAt(i-1)<=0xDBFF&&s.charCodeAt(i)>=0xDC00&&s.charCodeAt(i)<=0xDFFF;
export function validateSourceCitations(input,documents){
  if(!Array.isArray(input)||!input.length||input.length>4)fail('Each proposal requires 1–4 exact source citations.');
  const seen=new Set();return input.map(c=>{
    keys(c,['documentId','start','end','quote'],'citation');const d=documents.find(d=>d.id===c.documentId);if(!d)fail('Citation refers to an unselected document.');
    const source=d.excerpt;if(!Number.isInteger(c.start)||!Number.isInteger(c.end)||c.start<0||c.end<=c.start||c.end>source.length||splitSurrogate(source,c.start)||splitSurrogate(source,c.end))fail('Citation offsets must be valid UTF-16 boundaries.');
    const quote=text(c.quote,'source quote',4000);if(source.slice(c.start,c.end)!==quote)fail('Citation quote does not match the retained source span.');
    const key=`${c.documentId}:${c.start}:${c.end}`;if(seen.has(key))fail('Duplicate source citation.');seen.add(key);return {documentId:c.documentId,start:c.start,end:c.end,quote};
  });
}
export function proposalIsCurrent(workspace,run){
  const c=workspace.assessments.find(c=>c.id===run.assessmentId),d=workspace.documents.find(d=>d.id===run.snapshot.document.id);
  if(workspace.documents.some(d=>d.supersedesDocumentId===run.snapshot.document.id))return false;
  return !!c&&!!d&&JSON.stringify(proposalSnapshot(c,d))===JSON.stringify(run.snapshot);
}
export function validateProposalRuns(input,normalizeAssessment,normalizeDocument){
  if(!Array.isArray(input)||input.length>40)fail('Workspace limit: 40 proposal runs.');
  const runIDs=new Set(),proposalIDs=new Set();
  return input.map(v=>{
    keys(v,['id','assessmentId','kind','provider','model','promptVersion','createdAt','snapshot','proposals','abstention'],'proposal run');
    const id=identifier(v.id),assessmentId=identifier(v.assessmentId);if(runIDs.has(id))fail('Duplicate proposal run identifier.');runIDs.add(id);
    if(v.kind!=='Synthetic fixture'||v.provider!=='Local deterministic fixture'||v.model!=='None'||v.promptVersion!=='fixture-v1')fail('Only local synthetic fixture runs are supported. No AI provider is connected.');
    const createdAt=date(v.createdAt);keys(v.snapshot,['assessment','document'],'proposal snapshot');keys(v.snapshot.assessment,caseKeys,'assessment snapshot');keys(v.snapshot.document,documentKeys,'document snapshot');
    const snapshot=proposalSnapshot(normalizeAssessment(v.snapshot.assessment),normalizeDocument({...v.snapshot.document,reviewNote:''}));
    if(snapshot.assessment.id!==assessmentId||snapshot.document.assessmentId!==assessmentId||!snapshot.document.synthetic)fail('Fixture snapshots require a synthetic document in the same assessment.');
    if(createdAt<snapshot.document.recordedAt)fail('Proposal creation cannot precede its recorded source.');
    if(!Array.isArray(v.proposals)||v.proposals.length>8)fail('Proposal run limit: 8 proposals.');
    const abstention=text(v.abstention,'abstention',2000,true);if((!v.proposals.length&&!abstention)||(v.proposals.length&&abstention))fail('A run needs proposals or an abstention, not both.');
    const proposals=v.proposals.map(p=>{
      keys(p,['id','assessmentId','draftStatement','limitations','citations','status','reviewNote','reviewedAt','evidenceId'],'proposal');
      const pid=identifier(p.id);if(proposalIDs.has(pid))fail('Duplicate proposal identifier.');proposalIDs.add(pid);
      if(p.assessmentId!==assessmentId)fail('Proposal assessment does not match the run.');
      const citations=validateSourceCitations(p.citations,[snapshot.document]);
      if(!['Proposed','Accepted','Rejected'].includes(p.status))fail('Invalid proposal review state.');
      const reviewNote=text(p.reviewNote,'proposal review note',2000,true),reviewedAt=text(p.reviewedAt,'proposal review date',10,true),evidenceId=p.evidenceId?identifier(p.evidenceId):'';
      if(p.status==='Proposed'&&(reviewNote||reviewedAt||evidenceId))fail('Unreviewed proposals cannot claim review or evidence.');
      if(p.status!=='Proposed'&&(!reviewNote.trim()||date(reviewedAt)<createdAt))fail('Reviewed proposals require a note and a valid review date.');
      if((p.status==='Accepted'&&!evidenceId)||(p.status==='Rejected'&&evidenceId))fail('Only accepted proposals link to evidence.');
      return {id:pid,assessmentId,draftStatement:text(p.draftStatement,'draft statement',4000),limitations:text(p.limitations,'limitations note',2000),citations,status:p.status,reviewNote,reviewedAt,evidenceId};
    });
    return {id,assessmentId,kind:v.kind,provider:v.provider,model:v.model,promptVersion:v.promptVersion,createdAt,snapshot,proposals,abstention};
  });
}
export function fixtureRun(assessment,document,runId,proposalId,at){
  let end=Math.min(document.excerpt.length,1800);if(splitSurrogate(document.excerpt,end))end--;
  const quote=document.excerpt.slice(0,end);
  return {id:runId,assessmentId:assessment.id,kind:'Synthetic fixture',provider:'Local deterministic fixture',model:'None',promptVersion:'fixture-v1',createdAt:at,snapshot:proposalSnapshot(assessment,document),abstention:'',proposals:[{id:proposalId,assessmentId:assessment.id,draftStatement:`${document.publisher} reports: “${quote}”`,limitations:'Deterministic training proposal, not AI output. Attribution, source conditions, relevance and uncertainty require analyst review.',citations:[{documentId:document.id,start:0,end,quote}],status:'Proposed',reviewNote:'',reviewedAt:'',evidenceId:''}]};
}
