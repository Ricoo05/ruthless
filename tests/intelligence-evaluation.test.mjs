import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateIntelligenceReplay} from '../dist/intelligence-evaluation.mjs';

// Authored protocol fixtures, not real operational or historical findings.
const date=(day,hour=0)=>`2025-01-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:00:00Z`;
const candidate=(id,kind='changed_guidance')=>({id,kind,sourceURL:'https://www.gov.uk/foreign-travel-advice/india/safety-and-security',publisherUpdatedAt:date(2),capturedAt:date(3)});
const attempt=(id,at=date(3),candidates=[candidate(`${id}-change`)],pageChanged=true)=>({id,firstObservedAt:at,run:{id:`capture-${id}`,status:'collected',checkedAt:at,snapshot:{publisherUpdatedAt:date(2)}},analysis:{candidates,pageChanged,topicAvailable:true}});
const label=(id,start,end,expectedChange=true,patch={})=>({id,start:date(start),end:date(end),expectedChange,complete:true,outcomeSourceURL:'https://www.gov.uk/foreign-travel-advice/india',reviewedAt:date(12),...patch});
const protocol={developmentEnd:date(1),evaluationStart:date(2),evaluationEnd:date(10),independentLabels:true};
const evaluate=(attempts,labels=[],patch={})=>evaluateIntelligenceReplay(attempts,{...protocol,labels,...patch});

test('unlabelled research cannot produce apparent performance and protocol claims remain declarations',()=>{
  const withoutLabels=evaluate([attempt('a')]);assert.equal(withoutLabels.metrics,null);assert.match(withoutLabels.reason,/no complete/);assert.equal(withoutLabels.sampleSizes.unlabelledObservations,1);
  const undeclared=evaluate([attempt('a')],[label('one',2,4)],{independentLabels:false});assert.equal(undeclared.metrics,null);assert.match(undeclared.reason,/not been declared/);
  assert.equal(undeclared.sampleSizes.scoredIntervals,0);assert.equal(undeclared.intervals[0].scored,false);
  assert.equal(undeclared.attackPredictionMetrics,null);assert.equal(undeclared.confidenceCalibration,null);assert.equal(undeclared.protocol.untouchedEvaluationIndependentlyVerified,false);
  assert.equal(undeclared.protocol.protocolTuningIndependentlyVerified,false);
});

test('independent labels change scores without changing already-generated detections or inputs',()=>{
  const attempts=[attempt('a')],before=structuredClone(attempts),yes=evaluate(attempts,[label('one',2,4)]),no=evaluate(attempts,[label('one',2,4,false)]);
  assert.deepEqual(yes.observations,no.observations);assert.deepEqual(attempts,before);assert.equal(yes.metrics.engine.truePositives,1);assert.equal(no.metrics.engine.falsePositives,1);
});

test('baseline context never counts as a changed-guidance warning and baseline comparison stays transparent',()=>{
  const r=evaluate([attempt('a',date(3),[candidate('background','baseline_context')],true)],[label('one',2,4)]);
  assert.equal(r.metrics.engine.falseNegatives,1);assert.equal(r.metrics.engine.truePositives,0);assert.equal(r.metrics.anyPageChangeBaseline.truePositives,1);
  assert.equal(r.sampleSizes.baselineContextCandidatesIgnored,1);assert.equal(r.metrics.workload.engineCandidateAlerts,0);assert.equal(r.metrics.workload.baselineAlertObservations,1);
});

test('TP FP FN TN are counted per independent interval with equal engine/baseline samples',()=>{
  const rows=[attempt('tp',date(3)),attempt('fp',date(5)),attempt('fn',date(7),[],false),attempt('tn',date(9),[],false)];
  const labels=[label('p1',2,4),label('n1',4,6,false),label('p2',6,8),label('n2',8,10,false)],r=evaluate(rows,labels);
  for(const field of ['truePositives','falsePositives','falseNegatives','trueNegatives'])assert.equal(r.metrics.engine[field],1);
  assert.equal(r.metrics.engine.precision,.5);assert.equal(r.metrics.engine.recall,.5);assert.equal(r.metrics.engine.falsePositiveRate,.5);
  assert.equal(r.metrics.engine.intervals,4);assert.equal(r.metrics.anyPageChangeBaseline.intervals,4);assert.equal(r.metrics.workload.observationsReviewed,4);
  assert.equal(r.metrics.observationLatency.samples,2);assert.equal(r.metrics.observationLatency.minMs,86400000);
});

test('late collection of old reports and future checked/publication metadata are excluded',()=>{
  const late=attempt('late',date(11));late.run.checkedAt=date(3);
  const futureCapture=attempt('future-capture',date(3));futureCapture.run.checkedAt=date(4);
  const futurePublisher=attempt('future-publisher',date(3));futurePublisher.run.snapshot.publisherUpdatedAt=date(4);
  const corrected=attempt('corrected',date(11));corrected.run.checkedAt=date(3);corrected.run.snapshot.publisherUpdatedAt=date(2);
  const futureCandidate=attempt('future-candidate',date(3),[{...candidate('c'),capturedAt:date(4)}]);
  const r=evaluate([late,futureCapture,futurePublisher,corrected,futureCandidate],[label('one',2,4)]);
  assert.equal(r.metrics,null);assert.equal(r.observations.length,0);assert.equal(r.exclusions.length,5);assert.equal(r.sampleSizes.afterEvaluationAttempts,2);assert.equal(r.sampleSizes.invalidAttempts,3);
  assert.ok(r.exclusions.some(e=>e.reason.includes('old publisher date')));
});

test('unknown dates, invalid calendar dates, unsafe URLs and invalid capture IDs cannot become negatives',()=>{
  const noFirst=attempt('missing');delete noFirst.firstObservedAt;
  const invalidDate=attempt('invalid','2025-02-30T00:00:00Z');
  const missingCaptureId=attempt('missing-capture-id');delete missingCaptureId.run.id;
  const unsafe=attempt('unsafe',date(3),[{...candidate('u'),sourceURL:'http://www.gov.uk/advice'}]);
  const missingPublisher=attempt('missing-publisher');delete missingPublisher.run.snapshot.publisherUpdatedAt;
  const r=evaluate([noFirst,invalidDate,missingCaptureId,unsafe,missingPublisher],[label('negative',2,4,false)]);
  assert.equal(r.metrics,null);assert.equal(r.sampleSizes.invalidAttempts,5);assert.equal(r.sampleSizes.intervalsWithoutObservations,1);
});

test('negative reviewed intervals count but unlabelled and incomplete intervals do not',()=>{
  const r=evaluate([attempt('negative',date(3),[],false),attempt('unlabelled',date(5)),attempt('incomplete',date(7))],[label('quiet',2,4,false),label('unfinished',6,8,false,{complete:false})]);
  assert.equal(r.metrics.engine.trueNegatives,1);assert.equal(r.metrics.engine.falsePositives,0);assert.equal(r.metrics.engine.intervals,1);
  assert.equal(r.sampleSizes.unlabelledObservations,1);assert.equal(r.sampleSizes.incompleteLabelObservations,1);assert.equal(r.sampleSizes.incompleteLabelIntervals,1);
  assert.equal(r.metrics.workload.engineCandidateAlerts,0);
});

test('collection failure is a coverage gap; it does not establish a successful negative or a miss',()=>{
  const failure={id:'failed',firstObservedAt:date(3),run:{id:'failed',checkedAt:date(3),status:'failed'},analysis:null};
  const r=evaluate([failure],[label('quiet',2,4,false)]);
  assert.equal(r.metrics,null);assert.equal(r.intervals[0].scored,false);assert.deepEqual(r.intervals[0].failedAttemptIds,['failed']);assert.equal(r.sampleSizes.failedCollectionAttempts,1);
  assert.match(r.intervals[0].exclusionReason,/not a safe negative/);
  const partial=evaluate([failure,attempt('observed',date(3,1),[],false)],[label('quiet',2,4,false)]);
  assert.equal(partial.metrics.engine.trueNegatives,1);assert.equal(partial.metrics.workload.intervalsWithCollectionFailures,1);assert.equal(partial.intervals[0].partialCollectionFailure,true);
});

test('successful page retrieval without the required topic section is a coverage gap',()=>{
  const missing=attempt('missing-topic',date(3),[],false);missing.analysis.topicAvailable=false;
  const r=evaluate([missing],[label('quiet',2,4,false)]);
  assert.equal(r.metrics,null);assert.equal(r.sampleSizes.topicUnavailableAttempts,1);assert.equal(r.sampleSizes.failedCollectionAttempts,0);assert.equal(r.sampleSizes.eligibleObservations,0);
  assert.deepEqual(r.intervals[0].failedAttemptIds,['missing-topic']);assert.match(r.exclusions[0].reason,/topic coverage gap/);
});

test('ordered cutoffs reject development leakage and invalid timestamps',()=>{
  for(const patch of [{developmentEnd:date(2)},{developmentEnd:date(3)},{evaluationStart:date(11)},{evaluationEnd:'2025-02-30T00:00:00Z'},{evaluationStart:'2025-01-02'}])assert.throws(()=>evaluate([],[],patch),/cutoffs|ISO timestamp/);
  const r=evaluate([attempt('development',date(1)),attempt('gap','2025-01-01T12:00:00Z'),attempt('included',date(3))],[label('one',2,4)]);
  assert.equal(r.sampleSizes.developmentAttempts,1);assert.equal(r.sampleSizes.gapPeriodAttempts,1);assert.deepEqual(r.observations.map(o=>o.id),['included']);
});

test('labels require independent chronological complete intervals with valid outcomes and review dates',()=>{
  const invalidLabels=[
    [label('one',2,5),label('two',4,6)],
    [label('two',5,6),label('one',2,4)],
    [label('one',2,4),label('one',5,6)],
    [label('one',1,4)],
    [label('one',2,11)],
    [label('one',2,4,true,{outcomeSourceURL:'http://www.gov.uk/outcome'})],
    [label('one',2,4,true,{outcomeSourceURL:'https://localhost/outcome'})],
    [label('one',2,4,true,{reviewedAt:date(3)})],
    [label('one',2,4,true,{complete:undefined})]
  ];
  for(const labels of invalidLabels)assert.throws(()=>evaluate([],labels));
  const r=evaluate([attempt('boundary',date(4))],[label('before',2,4,false),label('after',4,6)]);
  assert.deepEqual(r.intervals[0].observationIds,[]);assert.deepEqual(r.intervals[1].observationIds,['boundary']);assert.equal(r.metrics.engine.truePositives,1);
});

test('duplicate attempts/candidates cannot inflate review workload or forge confidence',()=>{
  const a=attempt('one'),dupe=attempt('dupe',date(3),[candidate('same'),candidate('same')]);
  const r=evaluate([a,structuredClone(a),dupe],[label('one',2,4)]);
  assert.equal(r.sampleSizes.invalidAttempts,2);assert.equal(r.metrics.workload.engineCandidateAlerts,1);assert.equal(r.observations.length,1);assert.equal(r.confidenceCalibration,null);
});

test('journal and collector IDs may differ while duplicate captures and mismatched content are rejected',()=>{
  const valid=attempt('journal-id');valid.run.id='independent-collector-id';valid.run.snapshot.selectedContentSha256='a'.repeat(64);valid.analysis.sourceHash='a'.repeat(64);
  const duplicate=attempt('another-journal-id');duplicate.run.id=valid.run.id;
  const mismatch=attempt('hash-mismatch');mismatch.run.snapshot.selectedContentSha256='a'.repeat(64);mismatch.analysis.sourceHash='b'.repeat(64);
  const candidateMismatch=attempt('candidate-hash');candidateMismatch.run.snapshot.selectedContentSha256='a'.repeat(64);candidateMismatch.analysis.sourceHash='a'.repeat(64);candidateMismatch.analysis.candidates[0].sourceHash='b'.repeat(64);
  const r=evaluate([valid,duplicate,mismatch,candidateMismatch],[label('one',2,4)]);
  assert.equal(r.observations.length,1);assert.equal(r.observations[0].id,'journal-id');assert.equal(r.observations[0].runId,'independent-collector-id');assert.equal(r.sampleSizes.invalidAttempts,3);
  assert.equal(r.metrics.engine.truePositives,1);assert.ok(r.exclusions.some(e=>e.reason.includes('source hash')));
});
