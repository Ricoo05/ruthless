import test from 'node:test';
import assert from 'node:assert/strict';
import {warningReview,warningTaskContext} from '../dist/warning-core.mjs';
import {demoWorkspace,stageDocument,incorporateDocument,addTask,parseWorkspace,serializeWorkspace} from '../dist/threat-core.mjs';
import {regionalScenario} from '../dist/signals-scenario.mjs';
const window={from:'2026-10-01',to:'2026-10-05',scope:'All'};
const doc=(extra={})=>({id:'dated-source',assessmentId:'training-domestic',title:'Fictional dated report',publisher:'Authored publisher',originGroup:'Authored group',url:'',reportedAt:'2026-10-03',recordedAt:'2026-10-03',language:'English',locator:'Paragraph 1',accessNote:'Fictional text authored for testing.',excerpt:'Routine observation on 3 October 2026.',synthetic:true,...extra});

test('proactive review scans every current record with no keyword input and preserves workspace',()=>{
  const w=regionalScenario(demoWorkspace()),before=serializeWorkspace(w),r=warningReview(w,window);
  assert.equal(serializeWorkspace(w),before);assert.equal(r.recordsScanned,8);
  const c=r.cases.find(c=>c.assessmentId==='regional-training-r7');assert.equal(c.recordCount,3);assert.equal(c.groups.length,2);
  assert.ok(c.rules.find(r=>r.code==='pending-intake').count===3);
  assert.equal(c.rules.find(r=>r.code==='source-dependence').count,1);
  assert.ok(c.timeline.some(r=>r.text.includes('no threat was observed')));
  assert.equal('probability' in c,false);assert.equal('actor' in c,false);assert.equal('eventId' in c,false);
});
test('known-by boundary excludes later intake and replaces original only after correction is known',()=>{
  let w=stageDocument(demoWorkspace(),doc(),'2026-10-03');
  w=stageDocument(w,doc({id:'dated-correction',reportedAt:'2026-10-04',recordedAt:'2026-10-05',excerpt:'Correction: routine observation on 4 October 2026.',supersedesDocumentId:'dated-source',revisionNote:'Corrected observation date.',accessAcknowledged:true}),'2026-10-05');
  const earlier=warningReview(w,{...window,to:'2026-10-04'}).cases.find(c=>c.assessmentId==='training-domestic');
  assert.ok(earlier.timeline.some(r=>r.id==='dated-source'));assert.ok(!earlier.timeline.some(r=>r.id==='dated-correction'));
  const later=warningReview(w,window).cases.find(c=>c.assessmentId==='training-domestic');
  assert.ok(!later.timeline.some(r=>r.id==='dated-source'));assert.ok(later.timeline.some(r=>r.id==='dated-correction'));
  assert.ok(w.documents.some(d=>d.id==='dated-source'));
});
test('incorporation removes intake gap, avoids duplicate source counting and keeps assigned challenge',()=>{
  let w=stageDocument(demoWorkspace(),doc(),'2026-10-03');
  w=incorporateDocument(w,'dated-source',{id:'dated-evidence',accessAcknowledged:true,statement:'Analyst interpreted the original report.',claimState:'Context',relation:'Challenges',reviewNote:'Original report offers an alternative.'},'2026-10-05');
  const c=warningReview(w,window).cases.find(c=>c.assessmentId==='training-domestic');
  assert.equal(c.recordCount,4);assert.ok(!c.rules.some(r=>r.code==='pending-intake'));
  assert.ok(c.rules.find(r=>r.code==='challenging-evidence').recordKeys.includes('source_excerpt:dated-source'));
  assert.equal(c.timeline.find(r=>r.id==='dated-source').text,doc().excerpt);
  assert.ok(!c.timeline.some(r=>r.id==='dated-evidence'));
});

test('later analyst incorporation does not rewrite earlier pending-intake or challenging-evidence review',()=>{
  let w=stageDocument(demoWorkspace(),doc(),'2026-10-03');
  w=incorporateDocument(w,'dated-source',{id:'dated-evidence',accessAcknowledged:true,statement:'A later interpretation.',claimState:'Disputed',relation:'Challenges',reviewNote:'Reviewed later than the historical cutoff.'},'2026-10-05');
  const earlier=warningReview(w,{...window,to:'2026-10-04'}).cases.find(c=>c.assessmentId==='training-domestic');
  assert.ok(earlier.rules.find(r=>r.code==='pending-intake').recordKeys.includes('source_excerpt:dated-source'));
  assert.ok(!earlier.rules.find(r=>r.code==='challenging-evidence').recordKeys.includes('source_excerpt:dated-source'));
  const source=earlier.timeline.find(r=>r.id==='dated-source');assert.equal(source.evidenceId,'');assert.equal(source.reviewNote,'');
  const current=warningReview(w,window).cases.find(c=>c.assessmentId==='training-domestic');
  assert.ok(!current.rules.some(r=>r.code==='pending-intake'));
  assert.ok(current.rules.find(r=>r.code==='challenging-evidence').recordKeys.includes('source_excerpt:dated-source'));
});

test('a known past incorporation keeps its identity without inventing a historical evidence stance',()=>{
  let w=stageDocument(demoWorkspace(),doc(),'2026-10-03');
  w=incorporateDocument(w,'dated-source',{id:'dated-evidence',accessAcknowledged:true,statement:'An interpretation.',claimState:'Disputed',relation:'Challenges',reviewNote:'Current intake note.'},'2026-10-03');
  w=addTask(w,{id:'later-history',assessmentId:'training-domestic',title:'Later follow-up',scope:'Later activity establishes a historical query.',owner:'',dueAt:'2026-10-05'},'2026-10-05');
  const earlier=warningReview(w,{...window,to:'2026-10-04'}).cases.find(c=>c.assessmentId==='training-domestic');
  assert.ok(!earlier.rules.some(r=>r.code==='pending-intake'));
  assert.ok(!earlier.rules.find(r=>r.code==='challenging-evidence').recordKeys.includes('source_excerpt:dated-source'));
  const source=earlier.timeline.find(r=>r.id==='dated-source');assert.equal(source.evidenceId,'dated-evidence');assert.equal(source.relation,'Unknown');assert.equal(source.claimState,'Unknown');
});
test('date context distinguishes publication from mentions without filling years or choosing among dates',()=>{
  const w=demoWorkspace();w.evidence[0].statement='🔎 On ३ अक्टूबर २०२६, routine observation.';w.evidence[1].statement='Routine activity on 3 October.';w.evidence[2].statement='Correction from 3 October 2026 to 4 October 2026.';w.evidence[3].statement='Routine activity on 31 February 2026.';
  const r=warningReview(w,window),rows=r.cases.flatMap(c=>c.timeline),dateRule=r.cases[0].rules.find(r=>r.code==='date-context');
  assert.ok(!dateRule.recordKeys.includes('analyst_statement:SYN-001'));assert.ok(dateRule.recordKeys.includes('analyst_statement:SYN-002'));assert.ok(dateRule.recordKeys.includes('analyst_statement:SYN-003'));
  assert.equal(rows.find(r=>r.id==='SYN-004').dateMentions.dateState,'Invalid');
  for(const r of rows)for(const s of [...r.dateMentions.dates,...r.dateMentions.invalidDates])assert.equal(r.text.slice(s.start,s.end),s.quote);
  assert.equal(rows.find(r=>r.id==='SYN-002').dateMentions.dates[0].year,null);
  assert.ok(rows.every(r=>!('eventAt' in r)));
});
test('single-group review and case scopes use recorded labels rather than invented independent corroboration',()=>{
  const w=demoWorkspace();w.evidence[1].originGroup=w.evidence[0].originGroup.toUpperCase();w.evidence[2].originGroup=w.evidence[0].originGroup;
  const r=warningReview(w,{...window,scope:'Domestic'});assert.equal(r.cases.length,1);
  assert.equal(r.cases[0].groups.length,1);assert.ok(r.cases[0].rules.some(r=>r.code==='single-group'));
  assert.deepEqual(r.cases.map(c=>c.assessmentId),['training-domestic']);
});
test('timeline display is bounded while reason counts include older records and sorting uses known dates',()=>{
  let w=demoWorkspace();for(let i=0;i<33;i++)w=stageDocument(w,doc({id:`source-${i}`,excerpt:`Routine observation ${i}.`,recordedAt:i%2?'2026-10-05':'2026-10-04'}),'2026-10-05');
  const c=warningReview(w,window).cases.find(c=>c.assessmentId==='training-domestic');
  assert.equal(c.recordCount,36);assert.equal(c.timeline.length,30);assert.equal(c.hiddenTimelineCount,6);assert.equal(c.rules.find(r=>r.code==='pending-intake').count,33);
  assert.ok(c.timeline.every((r,i)=>i===0||c.timeline[i-1].recordedAt<=r.recordedAt));
  const task=warningTaskContext(w,window,c.assessmentId);assert.match(task.scope,/8 of 36/);assert.ok(task.scope.length<=1500);
});
test('task handoff recomputes current references and recovery retains the explicitly created task',()=>{
  let w=stageDocument(demoWorkspace(),doc(),'2026-10-03');
  w=stageDocument(w,doc({id:'dated-correction',excerpt:'Routine observation after correction.',supersedesDocumentId:'dated-source',revisionNote:'Correction.',recordedAt:'2026-10-05',accessAcknowledged:true}),'2026-10-05');
  const context=warningTaskContext(w,window,'training-domestic');assert.ok(context.scope.includes('source_excerpt:dated-correction'));assert.ok(!context.scope.includes('source_excerpt:dated-source'));
  const next=addTask(w,{...context,id:'warning-task',owner:'Researcher',dueAt:'2026-10-05'},'2026-10-05');
  const restored=parseWorkspace(serializeWorkspace(next));assert.equal(restored.tasks.at(-1).scope,context.scope);assert.equal(restored.evidence.length,w.evidence.length);assert.deepEqual(restored.assessments,w.assessments);
  assert.equal(warningTaskContext(w,{...window,from:'2026-10-05'},'training-domestic'),null);
});
test('bad dates, scopes and malformed workspace cannot silently widen review',()=>{
  for(const bad of [{from:'2026-10-06'},{to:'2026-02-30'},{scope:'Everywhere'}])assert.throws(()=>warningReview(demoWorkspace(),{...window,...bad}));
  const w=demoWorkspace();w.evidence[0].reportedAt='2026-10-06';assert.throws(()=>warningReview(w,window));
  const empty=warningReview(demoWorkspace(),{...window,from:'2026-10-05'});assert.equal(empty.cases.length,0);assert.equal(empty.reviewCaseCount,0);
});
test('supported context with distinct groups and no assigned challenges produces no review task',()=>{
  const w=demoWorkspace();w.evidence=w.evidence.slice(0,2).map((e,i)=>({...e,originGroup:`Authored independent label ${i}`,statement:'Routine observation on 3 October 2026.',relation:'Context'}));
  const r=warningReview(w,window);assert.equal(r.recordsScanned,2);assert.equal(r.cases.length,1);assert.equal(r.cases[0].rules.length,0);assert.equal(r.reviewCaseCount,0);assert.equal(warningTaskContext(w,window,'training-domestic'),null);
});
