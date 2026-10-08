import test from 'node:test';
import assert from 'node:assert/strict';
import {extractSecuritySignals,detectWarnings,detectionTimeline,detectionTaskContext,dateOffset} from '../dist/detection-core.mjs';
import {detectionExercise,evaluateDetectionExercise} from '../dist/detection-fixtures.mjs';
import {demoWorkspace,stageDocument,serializeWorkspace,parseWorkspace,incorporateDocument,addTask} from '../dist/threat-core.mjs';
const settings={knownBy:'2026-10-05',lookbackDays:7,scope:'All'};
const source=(extra={})=>({id:'detect-source',assessmentId:'training-domestic',title:'Fictional report',publisher:'Authored publisher',originGroup:'group-1',url:'',reportedAt:'2026-10-03',recordedAt:'2026-10-03',language:'English',locator:'Paragraph 1',accessNote:'Authored fictional control.',excerpt:'A desk received an unverified threat report.',synthetic:true,...extra});
const caseOf=(r,id)=>r.cases.find(c=>c.assessmentId===id);

test('original multilingual signal and clause offsets preserve Unicode source wording',()=>{
  const text='🔎 An observer reported a drone. काल्पनिक: ड्रोन नहीं देखा गया। अपुष्ट बम की धमकी की रिपोर्ट प्राप्त हुई।';
  const r=extractSecuritySignals(text);assert.equal(r.truncated,false);
  for(const s of r.signals){assert.equal(text.slice(s.start,s.end),s.quote);assert.equal(text.slice(s.clause.start,s.clause.end),s.clause.quote);}
  assert.equal(r.signals.find(s=>s.quote==='drone').polarity,'Reported claim');
  assert.equal(r.signals.find(s=>s.quote==='ड्रोन').polarity,'Denied / withdrawn');
  assert.ok(r.signals.some(s=>s.code==='warning'&&s.polarity==='Unverified report'));
});
test('limited negation, uncertainty, guidance and training controls remain distinguishable',()=>{
  for(const text of ['No drone was observed.','The threat report was withdrawn as a false alarm.','An explosive was not found.','ड्रोन नहीं देखा गया।'])assert.ok(extractSecuritySignals(text).signals.every(s=>s.polarity==='Denied / withdrawn'));
  for(const text of ['If a threat is reported, follow procedures.','A scheduled drill reported a drone.'])assert.ok(extractSecuritySignals(text).signals.every(s=>s.polarity==='Context only'));
  assert.ok(extractSecuritySignals('A drone was reported.',{title:'General safety advisory'}).signals.every(s=>s.polarity==='Context only'));
  assert.equal(extractSecuritySignals('A threat report was received but is not confirmed.').signals[0].polarity,'Unverified report');
  assert.equal(extractSecuritySignals('The drone has a benign explanation.').signals[0].polarity,'Context only');
});
test('contrast clauses avoid denying a separate report and preserve epistemic uncertainty',()=>{
  const text='No drone was observed, but an explosive was reported.';const r=extractSecuritySignals(text).signals;
  assert.equal(r.find(s=>s.code==='aerial').polarity,'Denied / withdrawn');assert.equal(r.find(s=>s.code==='explosive').polarity,'Reported claim');for(const s of r)assert.equal(text.slice(s.clause.start,s.clause.end),s.clause.quote);
  assert.equal(extractSecuritySignals('A not independently verified threat report was received.').signals[0].polarity,'Unverified report');
  assert.equal(extractSecuritySignals('बम की धमकी की पुष्टि नहीं हुई।').signals.find(s=>s.code==='warning').polarity,'Unverified report');
  assert.equal(extractSecuritySignals('Not only a drone was reported; an attack was also reported.').signals.find(s=>s.code==='aerial').polarity,'Reported claim');
});
test('reposts do not escalate a watch; separate source category produces a pre-incident candidate',()=>{
  const w=detectionExercise(),before=serializeWorkspace(w);
  assert.equal(caseOf(detectWarnings(w,{...settings,knownBy:'2026-10-01'}),'detect-aerial').state,'Watch');
  assert.equal(caseOf(detectWarnings(w,{...settings,knownBy:'2026-10-02'}),'detect-aerial').positiveGroups.length,1);
  const r=detectWarnings(w,{...settings,knownBy:'2026-10-03'}),c=caseOf(r,'detect-aerial');assert.equal(c.state,'Warning candidate');assert.equal(c.positiveGroups.length,2);assert.equal(r.warningCount,2);
  assert.equal(serializeWorkspace(w),before);assert.equal('probability' in c,false);assert.equal('actor' in c,false);
});
test('known corrections replace active report only when available and retain prior warning history',()=>{
  const w=detectionExercise();
  const old=caseOf(detectWarnings(w,{...settings,knownBy:'2026-10-03'}),'detect-object');assert.equal(old.state,'Warning candidate');assert.ok(old.records.some(r=>r.id==='b-warning'));assert.ok(!old.records.some(r=>r.id==='b-correction'));
  const later=caseOf(detectWarnings(w,{...settings,knownBy:'2026-10-04'}),'detect-object');assert.equal(later.state,'Watch');assert.ok(later.records.some(r=>r.id==='b-correction'));assert.ok(!later.records.some(r=>r.id==='b-warning'));
  const aerial=caseOf(detectWarnings(w,{...settings,knownBy:'2026-10-04'}),'detect-aerial');assert.equal(aerial.state,'Contested warning candidate');assert.equal(aerial.denialCount,1);
  const history=detectionTimeline(w,{from:'2026-10-01',to:'2026-10-04'});assert.equal(history[2].cases.find(c=>c.assessmentId==='detect-object').state,'Warning candidate');assert.equal(history[3].cases.find(c=>c.assessmentId==='detect-object').state,'Watch');
});
test('identical text under another group cannot inflate positive-group escalation',()=>{
  let w=stageDocument(demoWorkspace(),source(),'2026-10-03');w=stageDocument(w,source({id:'duplicate',publisher:'Another authored publisher',originGroup:'group-2',excerpt:'A desk received an unverified threat report.  '}),'2026-10-03');
  const c=caseOf(detectWarnings(w,settings),'training-domestic');assert.equal(c.state,'Watch');assert.equal(c.positiveGroups.length,1);assert.equal(c.duplicateCount,1);
});
test('no cross-case evidence pooling and no warning from missing or out-of-window reports',()=>{
  let w=stageDocument(demoWorkspace(),source(),'2026-10-03');w=stageDocument(w,source({id:'other-case',assessmentId:'training-crossborder',originGroup:'group-2'}),'2026-10-03');
  assert.equal(detectWarnings(w,settings).warningCount,0);
  const r=detectWarnings(w,{...settings,knownBy:'2026-10-10',lookbackDays:3});assert.equal(r.recordsScanned,0);assert.equal(r.coverageGapCount,3);
  assert.equal(detectWarnings(w,{...settings,scope:'International'}).cases.length,1);
});
test('publication and ingestion dates both gate availability; future text cannot change earlier states',()=>{
  let w=stageDocument(demoWorkspace(),source({recordedAt:'2026-10-05'}),'2026-10-05');
  const earlier=detectWarnings(w,{...settings,knownBy:'2026-10-04'});w.documents[0].excerpt='An observer reported a drone and received an explosive threat report.';
  assert.deepEqual(detectWarnings(w,{...settings,knownBy:'2026-10-04'}),earlier);
  assert.equal(caseOf(detectWarnings(w,settings),'training-domestic').positiveGroups.length,1);
});
test('old publication arriving recently stays visible as context without escalating a current warning',()=>{
  let w=stageDocument(demoWorkspace(),source({reportedAt:'2026-07-09',recordedAt:'2026-10-05'}),'2026-10-05');w=stageDocument(w,source({id:'fresh',originGroup:'group-2',excerpt:'A drone was reported.',reportedAt:'2026-10-05',recordedAt:'2026-10-05'}),'2026-10-05');
  const c=caseOf(detectWarnings(w,settings),'training-domestic');assert.equal(c.state,'Watch');assert.equal(c.positiveGroups.length,1);assert.ok(c.records.find(r=>r.id==='detect-source').outsidePublicationWindow);assert.equal(c.contextCount,1);
});
test('incorporated reports retain original extraction and do not count a paraphrase twice',()=>{
  let w=stageDocument(demoWorkspace(),source(),'2026-10-03');w=incorporateDocument(w,'detect-source',{id:'analyst-added',accessAcknowledged:true,statement:'A reported drone and explosive threat.',claimState:'Context',relation:'Context',reviewNote:'Fictional test interpretation; retained original is authoritative input.'},'2026-10-05');
  const c=caseOf(detectWarnings(w,settings),'training-domestic');assert.equal(c.records.filter(r=>r.id==='detect-source').length,1);assert.ok(!c.records.some(r=>r.id==='analyst-added'));assert.ok(!c.activeCodes.includes('aerial'));
});
test('authored outcome check exposes false warning and missed incident, with day lead time',()=>{
  const r=evaluateDetectionExercise();assert.equal(r.timely,1);assert.equal(r.falseWarnings,1);assert.equal(r.missed,1);assert.equal(r.uneventful,1);assert.equal(r.precision,.5);assert.equal(r.recall,.5);assert.equal(r.results.find(r=>r.assessmentId==='detect-aerial').leadDays,4);
  const routine=caseOf(detectWarnings(detectionExercise(),settings),'detect-routine');assert.equal(routine.state,'No rule warning');assert.equal(routine.positiveCount,0);assert.ok(routine.records.some(r=>r.id==='routine-hi'));
});
test('task handoff references current source records and survives normal workspace recovery',()=>{
  let w=stageDocument(demoWorkspace(),source(),'2026-10-03');w=stageDocument(w,source({id:'second',originGroup:'group-2',excerpt:'An observer reported a drone.'}),'2026-10-03');const context=detectionTaskContext(w,settings,'training-domestic');assert.ok(context.scope.includes('source_excerpt:detect-source'));assert.ok(context.scope.includes('source_excerpt:second'));
  const next=addTask(w,{...context,id:'detection-task',owner:'',dueAt:'2026-10-06',note:''},'2026-10-05');assert.deepEqual(parseWorkspace(serializeWorkspace(next)).tasks,next.tasks);assert.equal(next.evidence.length,w.evidence.length);
  assert.throws(()=>detectionTaskContext(w,settings,'training-global'),/current watch/);
});
test('invalid windows and oversized extraction reject; extraction limits remain explicit',()=>{
  assert.throws(()=>detectWarnings(demoWorkspace(),{...settings,lookbackDays:31}),/Invalid detection/);assert.throws(()=>detectWarnings(demoWorkspace(),{...settings,scope:'Unknown'}),/Invalid detection/);assert.throws(()=>detectionTimeline(demoWorkspace(),{from:'2026-10-05',to:'2026-10-01'}),/31 ordered/);assert.throws(()=>detectionTimeline(demoWorkspace(),{from:'2026-01-01',to:'2026-10-01'}),/31 ordered/);
  assert.throws(()=>extractSecuritySignals('x'.repeat(4001)),/bounded/);assert.throws(()=>dateOffset('bad',1));assert.throws(()=>dateOffset('2026-10-01',.5));
  const r=extractSecuritySignals('A drone was reported. '.repeat(100));assert.equal(r.signals.length,80);assert.equal(r.truncated,true);
});
