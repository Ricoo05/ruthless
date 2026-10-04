import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIO,SCENARIOS,scenarioFrame,scenarioWorkspace,projectPoint} from '../dist/scenario-core.mjs';
import {demoWorkspace,parseWorkspace} from '../dist/threat-core.mjs';

test('exercise exposes only available observations and counts same-source reposts once',()=>{
  const first=scenarioFrame(0);assert.equal(first.observations.length,1);assert.equal(first.sourceGroups,1);assert.deepEqual(first.availableSupports,[]);assert.deepEqual(first.missingSupports,['OBS-04']);
  const repost=scenarioFrame(2);assert.equal(repost.observations.length,2);assert.equal(repost.sourceGroups,1);assert.equal(repost.mode,'Illustrative interpolation');
  const all=scenarioFrame(8);assert.equal(all.observations.length,4);assert.equal(all.sourceGroups,3);assert.equal(all.mode,'Authored hypothesis');
});
test('alternative continuations agree on observed markers and diverge only after the last position report',()=>{
  for(const step of [0,1,2,3,4])assert.deepEqual(scenarioFrame(step,'routine').position,scenarioFrame(step,'unresolved').position);
  assert.deepEqual(scenarioFrame(4).position,SCENARIO.observations[2].position);assert.notDeepEqual(scenarioFrame(8,'routine').position,scenarioFrame(8,'unresolved').position);
  assert.equal(scenarioFrame(4).mode,'Authored observation marker');assert.equal(scenarioFrame(8).lastPositionStep,4);
});
test('unavailable future reports cannot become the visible basis or verification instruction',()=>{
  const early=scenarioFrame(0,'routine');assert.doesNotMatch(early.explanation,/schedule record/i);assert.doesNotMatch(early.verification,/scheduled operator/i);assert.match(early.explanation,/not available/);
  const late=scenarioFrame(6,'routine');assert.match(late.explanation,/schedule record/);assert.match(late.verification,/scheduled operator/);
  assert.doesNotMatch(scenarioWorkspace(0).workspace.assessments.at(-1).gaps,/scheduled operator/);
});
test('invalid steps, exercise identities and hypotheses reject instead of widening the exercise',()=>{
  for(const step of [-1,9,NaN,Infinity,'4'])assert.throws(()=>scenarioFrame(step));
  assert.throws(()=>scenarioFrame(1,'unknown'));assert.throws(()=>scenarioFrame(1,'routine','unknown'));
});
test('workspace handoff stages available synthetic sources and never adds evidence or a reviewed judgment',()=>{
  for(const scenario of SCENARIOS)for(const step of [0,2,4,8])for(const hypothesis of ['routine','unresolved']){
    const prepared=scenarioWorkspace(step,hypothesis,scenario.id),w=parseWorkspace(prepared.json),original=demoWorkspace();
    assert.equal(w.evidence.length,original.evidence.length);assert.equal(w.assessments.length,original.assessments.length+1);assert.equal(w.documents.length,scenarioFrame(step,'routine',scenario.id).observations.length);
    assert.ok(w.documents.every(d=>d.synthetic===true&&d.url===''));
    const c=w.assessments.find(c=>c.id===prepared.assessmentId);assert.equal(c.status,'Needs review');assert.equal(c.confidence,'Insufficient');assert.equal(c.judgment,'');assert.deepEqual(c.citedEvidence,[]);assert.equal(w.analysisRuns.length,0);
  }
});
test('explosive-threat exercise retains a stationary report-area marker without an actor or attack route',()=>{
  const scenario=SCENARIOS[1],first=scenarioFrame(0,'routine',scenario.id).position;
  for(const step of [0,2,4,6,8])for(const h of ['routine','unresolved'])assert.deepEqual(scenarioFrame(step,h,scenario.id).position,first);
  assert.match(scenario.observations[0].text,/not established/);assert.match(scenario.hypotheses[1].description,/not a person, attack route or device/);
});
test('perspective projection responds to orbit, bounds near-plane points and rejects invalid geometry',()=>{
  const point=[3,2,4],a=projectPoint(point,{yaw:0}),b=projectPoint(point,{yaw:1});assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.y)&&a.depth>0);assert.notEqual(a.x,b.x);
  assert.equal(projectPoint([0,0,-100],{yaw:0,pitch:0}),null);
  for(const p of [[NaN,0,0],[1,2],[1,Infinity,3],null])assert.throws(()=>projectPoint(p));
});
