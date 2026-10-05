import test from 'node:test';
import assert from 'node:assert/strict';
import {warningConnections,selectWarningConnections,warningLinkTaskContext,WARNING_LINK_FILTERS} from '../dist/warning-links.mjs';
import {compareReports} from '../dist/report-links.mjs';
import {demoWorkspace,stageDocument,incorporateDocument,addTask,parseWorkspace,serializeWorkspace} from '../dist/threat-core.mjs';
import {regionalScenario} from '../dist/signals-scenario.mjs';
const window={from:'2026-10-01',to:'2026-10-05',scope:'All'};
const doc=(id,text,extra={})=>({id,assessmentId:'training-domestic',title:`Authored ${id}`,publisher:`Authored ${id}`,originGroup:id,url:'',reportedAt:'2026-10-03',recordedAt:'2026-10-03',language:'English',locator:'Paragraph 1',accessNote:'Fictional development control.',excerpt:text,synthetic:true,...extra});
function pair(a,b){let w={...demoWorkspace(),evidence:[]};w=stageDocument(w,doc('doc-a',a),'2026-10-03');return stageDocument(w,doc('doc-b',b),'2026-10-03');}

test('related-report leads preserve lexical scores/order, original text and unchanged workspace',()=>{
  const w=regionalScenario(demoWorkspace()),before=serializeWorkspace(w),baseline=compareReports(w,window),r=warningConnections(w,window);
  assert.equal(serializeWorkspace(w),before);assert.equal(r.pairs.length,baseline.pairs.length);assert.ok(r.pairs.length);
  assert.deepEqual(r.pairs.map(p=>[p.left.recordKey,p.right.recordKey,p.similarity]),baseline.pairs.map(p=>[p.left.recordKey,p.right.recordKey,p.similarity]));
  assert.ok(r.pairs.every(p=>!('probability' in p)&&!('eventId' in p)&&!('actor' in p)));
});
test('date mismatches remain visible and quotation offsets resolve exactly in original passages',()=>{
  const w=pair('🔎 Routine observation near fictional Cedar depot on 3 October 2026.','Routine observation near fictional Cedar depot on 4 October 2026.');
  const r=warningConnections(w,window),p=r.pairs[0];assert.equal(p.dateContext.relation,'Mismatch');assert.equal(selectWarningConnections(r,'Date mismatch').length,1);
  for(const [row,s] of [[p.left,p.dateContext.left],[p.right,p.dateContext.right]])assert.equal(row.text.slice(s.start,s.end),s.quote);
  assert.equal(p.similarity,compareReports(w,window).pairs[0].similarity);
});
test('date compatibility does not infer missing years or establish event identity; ambiguous corrections stay Unknown',()=>{
  const p=warningConnections(pair('Routine observation 3 October.','Routine observation 3 October 2026.'),window).pairs[0];assert.equal(p.dateContext.relation,'Compatible');assert.ok([p.dateContext.left,p.dateContext.right].some(s=>s.year===null));assert.ok(p.dateContext.reason.includes('missing year'));
  const correction=warningConnections(pair('Routine observation 3 October 2026, corrected to 4 October 2026.','Routine observation 4 October 2026.'),window).pairs[0];assert.equal(correction.dateContext.relation,'Unknown');assert.equal(correction.left.dateMentions.dateState,'Multiple');
});
test('assigned opposing stances are surfaced without automatically classifying negation',()=>{
  let w=pair('A drone alert near the facility remains unverified.','No drone alert near the facility was confirmed.');
  assert.equal(warningConnections(w,window).pairs[0].opposingStances,false);
  w=incorporateDocument(w,'doc-a',{id:'ev-a',statement:'Reported allegation.',claimState:'Unverified',relation:'Supports',reviewNote:'Original allegation retained.',accessAcknowledged:true},'2026-10-03');
  w=incorporateDocument(w,'doc-b',{id:'ev-b',statement:'Reported alternative account.',claimState:'Context',relation:'Challenges',reviewNote:'Original alternative retained.',accessAcknowledged:true},'2026-10-03');
  const r=warningConnections(w,window);assert.equal(r.comparedRecords,2);assert.equal(selectWarningConnections(r,'Opposing evidence stances').length,1);assert.ok(r.pairs[0].right.text.includes('No drone'));
});
test('recorded-group and cross-case filters retain reporting leads without inferred source independence',()=>{
  const r=warningConnections(regionalScenario(demoWorkspace()),window);
  assert.ok(selectWarningConnections(r,'Same source group').some(p=>p.crossCase));assert.ok(selectWarningConnections(r,'Across cases').length);
  for(const filter of WARNING_LINK_FILTERS)assert.ok(selectWarningConnections(r,filter).every(p=>r.pairs.includes(p)));
  assert.throws(()=>selectWarningConnections(r,'Terrorists'));
});
test('later and superseded sources are excluded from fresh handoff without erasing earlier views',()=>{
  let w=pair('alpha beta gamma original','alpha beta gamma alternate');const p=warningConnections(w,window).pairs[0];
  w=stageDocument(w,doc('revision','wholly revised unrelated wording',{publisher:'Authored doc-a',originGroup:'doc-a',supersedesDocumentId:'doc-a',revisionNote:'Authored correction.',recordedAt:'2026-10-05',accessAcknowledged:true}),'2026-10-05');
  assert.equal(warningLinkTaskContext(w,window,p.left.recordKey,p.right.recordKey),null);
  assert.ok(warningLinkTaskContext(w,{...window,to:'2026-10-04'},p.left.recordKey,p.right.recordKey));
  assert.equal(warningConnections(w,{...window,from:'2026-10-05'}).pairs.length,0);
});
test('connection task retains both cases/references through existing explicit creation and recovery',()=>{
  const w=regionalScenario(demoWorkspace()),p=warningConnections(w,window).pairs.find(p=>p.crossCase),context=warningLinkTaskContext(w,window,p.left.recordKey,p.right.recordKey);
  assert.equal(context.assessmentId,p.left.assessmentId);for(const key of [p.left.recordKey,p.right.recordKey,p.left.assessmentId,p.right.assessmentId])assert.ok(context.scope.includes(key));assert.ok(context.scope.includes('each case separately'));assert.ok(context.scope.length<=1500);
  const next=addTask(w,{...context,id:'connection-task',owner:'Researcher',dueAt:'2026-10-05'},'2026-10-05'),restored=parseWorkspace(serializeWorkspace(next));assert.equal(restored.tasks[0].scope,context.scope);assert.deepEqual(restored.evidence,w.evidence);assert.deepEqual(restored.assessments,w.assessments);
});
test('bounded pair counts, exclusions and empty results stay explicit',()=>{
  const w=demoWorkspace(),e=w.evidence[0];w.evidence=Array.from({length:201},(_,i)=>({...e,id:`record-${String(i).padStart(3,'0')}`,statement:'alpha beta gamma delta'}));
  const r=warningConnections(w,window);assert.equal(r.excludedRecords,1);assert.equal(r.pairs.length,40);assert.equal(r.qualifyingPairs,19900);assert.equal(selectWarningConnections(r).length,40);
  assert.equal(warningConnections({...demoWorkspace(),evidence:[]},window).pairs.length,0);
  assert.throws(()=>warningConnections(w,{...window,scope:'Everyone'}));
});
