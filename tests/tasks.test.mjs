import test from 'node:test';
import assert from 'node:assert/strict';
import {demoWorkspace,addTask,updateTask,searchTasks,parseWorkspace,serializeWorkspace,validateWorkspace,exportAssessment,stageDocument,incorporateDocument} from '../dist/threat-core.mjs';
const at='2026-10-04',caseID='training-domestic';
const task={id:'TASK-001',assessmentId:caseID,title:'Review conflicting accounts',scope:'Compare supplied synthetic reports and record unresolved gaps.',owner:'',dueAt:'2026-10-03'};
const start=()=>addTask(demoWorkspace(),task,at);
const complete={owner:'Training analyst',status:'Completed',resultNote:'Compared the alternative explanation; attribution remains unresolved.',linkedEvidence:['SYN-001','SYN-003']};

test('task creation is open, bounded and ignores spoofed completion claims',()=>{
  const w=demoWorkspace(),next=addTask(w,{...task,status:'Completed',resultNote:'forged',approvedByAgency:true},at),t=next.tasks[0];
  assert.equal(t.status,'Open');assert.equal(t.resultNote,'');assert.equal(t.approvedByAgency,undefined);assert.deepEqual(t.linkedEvidence,[]);assert.equal(w.tasks.length,0);
  assert.throws(()=>addTask(next,task,at),/already exists/);
  for(const patch of [{scope:''},{assessmentId:'missing'},{dueAt:'2026-02-30'},{owner:'x'.repeat(121)}])assert.throws(()=>addTask(w,{...task,...patch},at));
  assert.throws(()=>validateWorkspace({...next,tasks:Array.from({length:501},(_,i)=>({...t,id:`task-${i}`}))}),/500 research/);
});
test('task state requirements reject updates atomically and completed work does not approve a case',()=>{
  const w=start(),raw=serializeWorkspace(w);
  for(const change of [{status:'In progress'},{status:'Blocked'},{status:'Cancelled'},{status:'Completed'},{...complete,resultNote:''},{...complete,linkedEvidence:[]},{...complete,owner:''}])assert.throws(()=>updateTask(w,task.id,change,at));
  assert.equal(serializeWorkspace(w),raw);
  const next=updateTask(w,task.id,complete,at);assert.equal(next.tasks[0].status,'Completed');assert.equal(next.assessments[0].status,'Draft');assert.equal(next.assessments[0].judgment,'');
  assert.equal(next.history.at(-1).action,'Research task updated');
});
test('task evidence must exist, be unique and belong to the same assessment',()=>{
  const w=start();for(const linkedEvidence of [['missing'],['SYN-004'],['SYN-001','SYN-001']])assert.throws(()=>updateTask(w,task.id,{...complete,linkedEvidence},at));
});
test('completion dates cannot precede output evidence and update dates cannot move backwards',()=>{
  const w=start();assert.throws(()=>updateTask(w,task.id,complete,'2026-10-03'),/backwards/);
  const changed=structuredClone(w);changed.evidence[0].recordedAt='2026-10-05';assert.throws(()=>updateTask(changed,task.id,{...complete,linkedEvidence:['SYN-001']},at),/completion cannot precede/);
  const next=updateTask(w,task.id,{owner:'Training analyst',status:'In progress'},'2026-10-05');assert.throws(()=>updateTask(next,task.id,{status:'Open'},at),/backwards/);
});
test('blocked and cancelled work require explanations; reopening needs a new note and retains prior result',()=>{
  const blocked=updateTask(start(),task.id,{status:'Blocked',note:'Awaiting an authorized reference.'},at);assert.equal(blocked.tasks[0].status,'Blocked');
  const done=updateTask(blocked,task.id,complete,at);assert.throws(()=>updateTask(done,task.id,{status:'In progress'},at),/new progress note/);
  const reopened=updateTask(done,task.id,{status:'In progress',note:'New contradictory source requires another comparison.'},at);assert.equal(reopened.tasks[0].status,'In progress');assert.equal(reopened.tasks[0].resultNote,complete.resultNote);
  const cancelled=updateTask(start(),task.id,{status:'Cancelled',note:'Duplicate follow-up.'},at);assert.throws(()=>updateTask(cancelled,task.id,{status:'Open'},at),/new progress note/);
});
test('task filters combine text, state, assessment and overdue dates; finished tasks are excluded from overdue',()=>{
  let w=start();w=addTask(w,{...task,id:'TASK-002',assessmentId:'training-global',title:'Global context',owner:'Second analyst',dueAt:at},at);w=addTask(w,{...task,id:'TASK-003',dueAt:'2026-10-01'},at);w=updateTask(w,'TASK-003',complete,at);
  assert.deepEqual(searchTasks(w,{overdueOnly:true,asOf:at}).map(t=>t.id),['TASK-001']);
  assert.equal(searchTasks(w,{query:'Second',assessmentId:'training-global',status:'Open'}).length,1);
  assert.equal(searchTasks(w,{query:'absent'}).length,0);assert.throws(()=>searchTasks(w,{overdueOnly:true,asOf:'bad'}),/real date/);
});
test('v1 and v2 migration invent no tasks and preserve v2 incorporated sources',()=>{
  const legacy1={...demoWorkspace(),version:1};delete legacy1.documents;delete legacy1.tasks;assert.deepEqual(parseWorkspace(JSON.stringify(legacy1)).tasks,[]);
  const d={id:'DOC-1',assessmentId:caseID,title:'Training',publisher:'Fictional',originGroup:'training-original-A',url:'',reportedAt:at,recordedAt:at,language:'English',locator:'Paragraph 1',accessNote:'Synthetic author text.',excerpt:'Fictional uncertainty.',synthetic:true};
  const current=incorporateDocument(stageDocument(demoWorkspace(),d,at),d.id,{id:'EV-1',statement:'A fictional statement.',claimState:'Reported',relation:'Context',reviewNote:'Attribution preserved.',accessAcknowledged:true},at);
  const legacy2={...current,version:2};delete legacy2.tasks;const migrated=parseWorkspace(JSON.stringify(legacy2));assert.deepEqual(migrated.documents,current.documents);assert.deepEqual(migrated.evidence,current.evidence);assert.deepEqual(migrated.tasks,[]);assert.equal(migrated.version,7);
  assert.throws(()=>validateWorkspace({...migrated,tasks:undefined}),/500 research/);
});
test('task round trips retain results but drop trust claims; briefs include tasks with unverified owner labels',()=>{
  const w=updateTask(start(),task.id,complete,at);assert.deepEqual(parseWorkspace(serializeWorkspace(w)),w);
  const external=structuredClone(w);external.tasks[0].authenticatedOwner=true;external.tasks[0].id='TASK-NEW';external.tasks[0].assessmentId='missing';assert.throws(()=>parseWorkspace(JSON.stringify(external)),/unknown assessment/);
  external.tasks[0].assessmentId=caseID;assert.equal(parseWorkspace(JSON.stringify(external)).tasks[0].authenticatedOwner,undefined);
  const brief=exportAssessment(w,caseID);for(const text of ['TASK-001','Research follow-up tasks','Owner label (unverified): Training analyst',complete.resultNote])assert.ok(brief.includes(text));
  assert.equal(exportAssessment(w,'training-global').includes('TASK-001'),false);
});
