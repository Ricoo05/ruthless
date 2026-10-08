import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {demoWorkspace,stageDocument,serializeWorkspace,parseWorkspace} from '../dist/threat-core.mjs';
import {detectWarnings,detectionTimeline} from '../dist/detection-core.mjs';
import {evaluateDetectionChallenges} from '../dist/detection-challenge-core.mjs';
import {explosiveExercise,explosiveOutcomeCheck,EXPLOSIVE_CASE} from '../dist/explosive-exercise.mjs';
import {warningSceneData,sceneProjection} from '../dist/warning-scene.mjs';
const data=JSON.parse(readFileSync(new URL('../dist/detection-challenges.json',import.meta.url),'utf8'));
const settings={knownBy:'2026-10-09',lookbackDays:7,scope:'All'};
const doc=(extra={})=>({id:'original',assessmentId:'training-domestic',title:'Authored report',publisher:'Fictional publisher',originGroup:'group-a',url:'',reportedAt:'2026-09-28',recordedAt:'2026-09-28',language:'English',locator:'Authored paragraph',accessNote:'Fictional testing input.',excerpt:'An unverified threat report was received.',synthetic:true,...extra});
const selected=r=>r.cases.find(c=>c.assessmentId==='training-domestic');
test('authored challenge comparison retains actual baseline failures and exact current source spans',()=>{
  const r=evaluateDetectionChallenges(data);assert.equal(r.baselinePassed,13);assert.equal(r.passed,24);assert.equal(r.total,24);
  for(const c of r.results)for(const s of c.actual){assert.equal(c.text.slice(s.start,s.end),s.quote);assert.equal(c.text.slice(s.clause.start,s.clause.end),s.clause.quote);}
  assert.equal(r.results.find(c=>c.id==='no-injuries').baselinePass,false);assert.equal(r.results.find(c=>c.id==='separate-withdrawal').pass,true);
});
test('challenge bounds and unsupported labels reject rather than masquerading as a valid evaluation',()=>{
  assert.throws(()=>evaluateDetectionChallenges({...data,cases:[...data.cases,...data.cases]}));assert.throws(()=>evaluateDetectionChallenges({...data,baselineVersion:'invented'}));
  const bad=structuredClone(data);bad.cases[0].expected[0].polarity='Confirmed terrorist';assert.throws(()=>evaluateDetectionChallenges(bad));bad.cases[0].expected[0].polarity='Reported claim';bad.cases[0].text='x'.repeat(4001);assert.throws(()=>evaluateDetectionChallenges(bad));
});
test('a paraphrased same-group repost cannot renew a claim outside the publication window',()=>{
  let w=stageDocument(demoWorkspace(),doc(),'2026-09-28');w=stageDocument(w,doc({id:'repost',title:'Authored repost',reportedAt:'2026-10-08',recordedAt:'2026-10-08',excerpt:'A second outlet reported the same unverified threat allegation.'}),'2026-10-08');w=stageDocument(w,doc({id:'new-object',originGroup:'group-b',reportedAt:'2026-10-08',recordedAt:'2026-10-08',excerpt:'An observer reported a drone.'}),'2026-10-08');
  const c=selected(detectWarnings(w,settings));assert.equal(c.state,'Watch');assert.equal(c.positiveGroups.length,1);const repost=c.records.find(r=>r.id==='repost');assert.deepEqual(repost.staleClaimCodes,['warning']);assert.equal(repost.claimAnchors[0].recordKey,'source_excerpt:original');assert.equal(repost.claimAnchors[0].reportedAt,'2026-09-28');assert.ok(!c.records.some(r=>r.id==='original'));
});
test('a mislabeled exact-text repost also stays suppressed when its original is outside the arrival window',()=>{
  let w=stageDocument(demoWorkspace(),doc(),'2026-09-28');w=stageDocument(w,doc({id:'copy',publisher:'Another fictional outlet',originGroup:'wrong-group',reportedAt:'2026-10-08',recordedAt:'2026-10-08'}),'2026-10-08');
  const c=selected(detectWarnings(w,settings));assert.equal(c.positiveCount,0);assert.equal(c.records.find(r=>r.id==='copy').duplicateOf,'source_excerpt:original');
});
test('a known source correction can carry new current information while the historical parent remains retained',()=>{
  let w=stageDocument(demoWorkspace(),doc(),'2026-09-28');w=stageDocument(w,doc({id:'correction',reportedAt:'2026-10-08',recordedAt:'2026-10-08',excerpt:'A new unverified threat report was received after the earlier account changed.',supersedesDocumentId:'original',revisionNote:'Authored new source statement.',accessAcknowledged:true}),'2026-10-08');w=stageDocument(w,doc({id:'other',originGroup:'group-b',reportedAt:'2026-10-08',recordedAt:'2026-10-08',excerpt:'An observer reported a drone.'}),'2026-10-08');
  const c=selected(detectWarnings(w,settings));assert.equal(c.state,'Warning candidate');assert.equal(c.records.find(r=>r.id==='correction').staleClaimCodes.length,0);assert.ok(w.documents.some(d=>d.id==='original'));
});
test('a later-discovered older claim changes current context without retroactively changing an earlier as-of warning',()=>{
  let w=stageDocument(demoWorkspace(),doc({id:'recent',reportedAt:'2026-10-08',recordedAt:'2026-10-08'}),'2026-10-08');w=stageDocument(w,doc({id:'other',originGroup:'group-b',reportedAt:'2026-10-08',recordedAt:'2026-10-08',excerpt:'An observer reported a drone.'}),'2026-10-08');const earlier=detectWarnings(w,{...settings,knownBy:'2026-10-08'});
  w=stageDocument(w,doc({id:'late-history',reportedAt:'2026-09-28',recordedAt:'2026-10-09',excerpt:'An earlier outlet reported an unverified threat.'}),'2026-10-09');assert.deepEqual(detectWarnings(w,{...settings,knownBy:'2026-10-08'}),earlier);assert.equal(selected(detectWarnings(w,settings)).state,'Watch');
});
test('fresh categories are not discarded merely because another category in that group is old',()=>{
  let w=stageDocument(demoWorkspace(),doc(),'2026-09-28');w=stageDocument(w,doc({id:'new-aerial',reportedAt:'2026-10-08',recordedAt:'2026-10-08',excerpt:'A drone was observed.'}),'2026-10-08');w=stageDocument(w,doc({id:'alarm',originGroup:'group-b',reportedAt:'2026-10-08',recordedAt:'2026-10-08',excerpt:'A security alarm was reported.'}),'2026-10-08');
  const c=selected(detectWarnings(w,settings));assert.equal(c.state,'Warning candidate');assert.deepEqual(new Set(c.activeCodes),new Set(['aerial','security']));
});
test('explosive exercise is driven by known reports, detects before the authored attempt and preserves correction timing',()=>{
  const w=explosiveExercise(),before=serializeWorkspace(w),timeline=detectionTimeline(w,{from:'2026-10-01',to:'2026-10-08'});
  assert.equal(timeline[0].cases[0].state,'Watch');assert.equal(timeline[1].cases[0].positiveGroupCount,1);assert.equal(timeline[2].cases[0].state,'Warning candidate');assert.equal(timeline[3].cases[0].state,'Contested warning candidate');assert.equal(timeline[4].cases[0].state,'Warning candidate');assert.equal(timeline[7].cases[0].state,'Watch');
  const outcome=explosiveOutcomeCheck();assert.equal(outcome.firstWarning,'2026-10-03');assert.equal(outcome.leadDays,4);assert.equal('probability' in outcome,false);assert.equal(serializeWorkspace(w),before);assert.deepEqual(parseWorkspace(before),w);
});
test('3D snapshot contains source-report markers from detector output without future outcomes or attacker trajectories',()=>{
  const r=detectWarnings(explosiveExercise(),{knownBy:'2026-10-01'}),s=warningSceneData(r,EXPLOSIVE_CASE);assert.equal(s.state,'Watch');assert.equal(s.nodes.length,1);assert.equal(s.groups,1);assert.ok(!JSON.stringify(s).includes('2026-10-07'));assert.ok(s.nodes.every(n=>Object.keys(n).sort().join(',')==='category,date,id,label,position'));
  r.cases[0].records[0].synthetic=false;assert.throws(()=>warningSceneData(r,EXPLOSIVE_CASE),/fictional/);assert.throws(()=>warningSceneData(r,'missing'));
});
test('perspective projection reacts to camera orbit, supports mobile scale and rejects invalid geometry',()=>{
  const center=sceneProjection([0,0,0],{width:390,height:300});assert.equal(center.x,195);assert.equal(center.y,186);assert.equal(center.depth,19);
  assert.notDeepEqual(sceneProjection([6,1,3],{yaw:0}),sceneProjection([6,1,3],{yaw:1}));assert.equal(sceneProjection([0,0,-100],{yaw:0,pitch:0}),null);assert.throws(()=>sceneProjection([NaN,1,2]));assert.throws(()=>sceneProjection([0,1,2],{distance:1}));
});
