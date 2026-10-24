import {publicURL} from './osint-core.mjs';

const SCOPE='Official India terrorism advisory change review';
const LIMITATIONS=Object.freeze([
  'This evaluates review of changes to official guidance, not attack prediction, prevention, incident probability, or comprehensive intelligence coverage.',
  'Publisher edition time is not the time an incident occurred or the time a warning became externally accessible.',
  'Ground-truth labels must come from independent interval review. Their independence, protocol tuning, and untouched evaluation status are declarations, not independently guaranteed by this function.',
  'Unlabelled intervals and intervals without an eligible successful observation are excluded; collection failures are coverage gaps and never establish a safe negative.',
  'A current page collected late cannot be used as a historical snapshot merely because its publisher timestamp is old.',
  'Confidence calibration and attack precision are unavailable because the detector supplies no validated predictive probabilities or attack outcome labels.'
]);

function time(value,name){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value))throw new Error(`${name} must be a valid ISO timestamp with timezone.`);
  const day=Date.parse(`${value.slice(0,10)}T00:00:00Z`),ms=Date.parse(value);
  if(!Number.isFinite(ms)||!Number.isFinite(day)||new Date(day).toISOString().slice(0,10)!==value.slice(0,10))throw new Error(`${name} must be a valid ISO timestamp with timezone.`);
  return ms;
}
const idOK=value=>typeof value==='string'&&value.trim().length>0&&value.length<=200;
const iso=ms=>new Date(ms).toISOString();
const inside=(at,interval)=>at>=interval.startMs&&at<interval.endMs;

function validateLabels(labels,start,end){
  if(!Array.isArray(labels))throw new Error('Labels must be an array.');
  const seen=new Set();let previousEnd=-Infinity;
  return labels.map(label=>{
    if(!label||!idOK(label.id)||seen.has(label.id))throw new Error('Labels require unique, nonempty IDs.');
    seen.add(label.id);
    const startMs=time(label.start,'Label start'),endMs=time(label.end,'Label end'),reviewedMs=time(label.reviewedAt,'Label reviewedAt');
    if(startMs>=endMs||startMs<start||endMs>end)throw new Error('Each label interval must have positive duration within the evaluation period.');
    if(startMs<previousEnd)throw new Error('Label intervals must be chronological and must not overlap.');
    previousEnd=endMs;
    if(typeof label.expectedChange!=='boolean'||typeof label.complete!=='boolean')throw new Error('Label expectedChange and complete must be booleans.');
    const outcomeSourceURL=publicURL(label.outcomeSourceURL);
    if(!outcomeSourceURL)throw new Error('Each label requires a public HTTPS outcome source URL.');
    if(reviewedMs<endMs)throw new Error('A label cannot be independently reviewed before its interval ends.');
    return {id:label.id,start:iso(startMs),end:iso(endMs),startMs,endMs,expectedChange:label.expectedChange,complete:label.complete,outcomeSourceURL,reviewedAt:iso(reviewedMs)};
  });
}

function confusion(rows,key){
  const result={intervals:rows.length,truePositives:0,falsePositives:0,falseNegatives:0,trueNegatives:0};
  for(const row of rows){
    if(row.expectedChange)result[row[key]?'truePositives':'falseNegatives']++;
    else result[row[key]?'falsePositives':'trueNegatives']++;
  }
  const {truePositives:tp,falsePositives:fp,falseNegatives:fn,trueNegatives:tn}=result;
  return {...result,precision:tp+fp?tp/(tp+fp):null,recall:tp+fn?tp/(tp+fn):null,falsePositiveRate:fp+tn?fp/(fp+tn):null,accuracy:rows.length?(tp+tn)/rows.length:null};
}

function latency(observations){
  const values=observations.filter(o=>o.changedCandidateIds.length).map(o=>o.firstObservedMs-o.publisherMs).sort((a,b)=>a-b),n=values.length;
  return {meaning:'Publisher edition age at first system observation for changed-guidance alert observations; not event lead time or source publication delivery latency.',samples:n,minMs:n?values[0]:null,maxMs:n?values[n-1]:null,meanMs:n?values.reduce((a,b)=>a+b,0)/n:null,medianMs:n?(n%2?values[(n-1)/2]:(values[n/2-1]+values[n/2])/2):null};
}

/** Score already-generated advisory candidates. Labels never enter candidate generation. */
export function evaluateIntelligenceReplay(attempts,{developmentEnd,evaluationStart,evaluationEnd,labels=[],independentLabels=false}={}){
  if(!Array.isArray(attempts))throw new Error('Attempts must be an array of server journal entries.');
  const dev=time(developmentEnd,'developmentEnd'),start=time(evaluationStart,'evaluationStart'),end=time(evaluationEnd,'evaluationEnd');
  if(dev>=start||start>end)throw new Error('Require ordered cutoffs: developmentEnd < evaluationStart <= evaluationEnd.');
  if(typeof independentLabels!=='boolean')throw new Error('independentLabels must be a boolean declaration.');
  const reviewedLabels=validateLabels(labels,start,end),exclusions=[],observations=[],failures=[],seen=new Set(),seenRuns=new Set();
  const counts={attemptsReceived:attempts.length,developmentAttempts:0,gapPeriodAttempts:0,afterEvaluationAttempts:0,invalidAttempts:0,failedCollectionAttempts:0,topicUnavailableAttempts:0,eligibleObservations:0,unlabelledObservations:0,incompleteLabelObservations:0,completeLabelIntervals:reviewedLabels.filter(l=>l.complete).length,incompleteLabelIntervals:reviewedLabels.filter(l=>!l.complete).length,intervalsWithoutObservations:0,scoredIntervals:0,baselineContextCandidatesIgnored:0};
  const exclude=(entry,reason)=>{exclusions.push({id:idOK(entry?.id)?entry.id:null,reason});};
  for(const entry of attempts){
    if(!entry||!idOK(entry.id)||seen.has(entry.id)){counts.invalidAttempts++;exclude(entry,'Invalid or duplicate server journal entry ID.');continue;}
    seen.add(entry.id);
    if(!idOK(entry.run?.id)||seenRuns.has(entry.run.id)){counts.invalidAttempts++;exclude(entry,'Capture IDs must be nonempty, bounded, and unique; journal and capture IDs may differ.');continue;}
    seenRuns.add(entry.run.id);
    let observed;
    try{observed=time(entry.firstObservedAt,'firstObservedAt');}catch(error){counts.invalidAttempts++;exclude(entry,error.message);continue;}
    if(observed<=dev){counts.developmentAttempts++;exclude(entry,'Observed during development; excluded from evaluation.');continue;}
    if(observed<start){counts.gapPeriodAttempts++;exclude(entry,'Observed in the gap between development and evaluation.');continue;}
    if(observed>end){counts.afterEvaluationAttempts++;exclude(entry,'First system observation is after the evaluation cutoff; an old publisher date cannot backdate collection.');continue;}
    let checked;
    try{checked=time(entry.run?.checkedAt,'run.checkedAt');}catch(error){counts.invalidAttempts++;exclude(entry,error.message);continue;}
    if(checked>observed||checked>end){counts.invalidAttempts++;exclude(entry,'Capture is later than its first system observation or evaluation cutoff.');continue;}
    if(entry.run.status==='failed'){
      counts.failedCollectionAttempts++;failures.push({id:entry.id,firstObservedAt:iso(observed),firstObservedMs:observed});exclude(entry,'Collection failed: coverage gap, not a negative observation.');continue;
    }
    if(entry.run.status!=='collected'||!entry.analysis||!Array.isArray(entry.analysis.candidates)||typeof entry.analysis.pageChanged!=='boolean'){
      counts.invalidAttempts++;exclude(entry,'A successful capture and already-generated analysis are required.');continue;
    }
    const sourceHash=entry.analysis.sourceHash,captureHash=entry.run.snapshot?.selectedContentSha256;
    if((sourceHash!==undefined||captureHash!==undefined)&&(!/^[a-f\d]{64}$/i.test(sourceHash??'')||sourceHash!==captureHash)){
      counts.invalidAttempts++;exclude(entry,'Analysis source hash does not match its retained selected capture content.');continue;
    }
    if(entry.analysis.topicAvailable!==true){
      counts.topicUnavailableAttempts++;failures.push({id:entry.id,firstObservedAt:iso(observed),firstObservedMs:observed});exclude(entry,'Terrorism guidance section is unavailable or unconfirmed: topic coverage gap, not a negative observation.');continue;
    }
    let publisher;
    try{publisher=time(entry.run.snapshot?.publisherUpdatedAt,'snapshot.publisherUpdatedAt');}catch(error){counts.invalidAttempts++;exclude(entry,error.message);continue;}
    if(publisher>checked||publisher>end){counts.invalidAttempts++;exclude(entry,'Publisher edition timestamp is after capture or evaluation cutoff.');continue;}
    const candidateIds=new Set(),changedCandidateIds=[];let baselineCount=0,invalidCandidate=false;
    for(const candidate of entry.analysis.candidates){
      if(!candidate||!idOK(candidate.id)||candidateIds.has(candidate.id)||!['baseline_context','changed_guidance'].includes(candidate.kind)){invalidCandidate=true;break;}
      candidateIds.add(candidate.id);
      try{
        if(candidate.publisherUpdatedAt!==undefined&&time(candidate.publisherUpdatedAt,'candidate.publisherUpdatedAt')>checked)invalidCandidate=true;
        if(candidate.capturedAt!==undefined&&time(candidate.capturedAt,'candidate.capturedAt')>checked)invalidCandidate=true;
        if(candidate.sourceURL!==undefined&&!publicURL(candidate.sourceURL))invalidCandidate=true;
        if(candidate.sourceHash!==undefined&&candidate.sourceHash!==sourceHash)invalidCandidate=true;
      }catch{invalidCandidate=true;}
      if(candidate.kind==='baseline_context')baselineCount++;
      else changedCandidateIds.push(candidate.id);
    }
    if(invalidCandidate){counts.invalidAttempts++;exclude(entry,'Candidate identity, source URL, kind, or source timestamp is invalid; excluded instead of counting as a negative.');continue;}
    counts.baselineContextCandidatesIgnored+=baselineCount;
    observations.push({id:entry.id,runId:entry.run.id,firstObservedAt:iso(observed),checkedAt:iso(checked),publisherUpdatedAt:iso(publisher),firstObservedMs:observed,publisherMs:publisher,changedCandidateIds,baselineContextCandidatesIgnored:baselineCount,pageChanged:entry.analysis.pageChanged});
  }
  observations.sort((a,b)=>a.firstObservedMs-b.firstObservedMs||a.id.localeCompare(b.id));
  counts.eligibleObservations=observations.length;
  const intervals=reviewedLabels.map(label=>{
    const rows=observations.filter(o=>inside(o.firstObservedMs,label)),gaps=failures.filter(f=>inside(f.firstObservedMs,label));
    const eligibleForScoring=label.complete&&rows.length>0,scored=independentLabels&&eligibleForScoring;
    if(label.complete&&!rows.length)counts.intervalsWithoutObservations++;
    const {startMs,endMs,...metadata}=label;
    return {...metadata,eligibleForScoring,scored,exclusionReason:!label.complete?'Independent review interval is incomplete.':!rows.length?'No eligible successful observation; collection gap is not a safe negative.':!independentLabels?'Independent interval labels have not been declared.':null,observationIds:rows.map(o=>o.id),failedAttemptIds:gaps.map(f=>f.id),partialCollectionFailure:gaps.length>0,engineAlert:rows.some(o=>o.changedCandidateIds.length>0),anyPageChangeAlert:rows.some(o=>o.pageChanged),engineCandidateAlerts:rows.reduce((n,o)=>n+o.changedCandidateIds.length,0),engineAlertObservations:rows.filter(o=>o.changedCandidateIds.length).length,baselineAlertObservations:rows.filter(o=>o.pageChanged).length};
  });
  for(const observation of observations){
    const label=reviewedLabels.find(l=>inside(observation.firstObservedMs,l));
    if(!label)counts.unlabelledObservations++;
    else if(!label.complete)counts.incompleteLabelObservations++;
  }
  const scoreable=intervals.filter(i=>i.eligibleForScoring);counts.scoredIntervals=independentLabels?scoreable.length:0;
  let reason=null;
  if(!independentLabels)reason='Scoring is unavailable: independent interval labels have not been declared.';
  else if(!counts.completeLabelIntervals)reason='Scoring is unavailable: no complete independently reviewed label intervals.';
  else if(!scoreable.length)reason='Scoring is unavailable: complete label intervals have no eligible successful observations.';
  const scoredIds=new Set(scoreable.flatMap(i=>i.observationIds)),scoredObservations=observations.filter(o=>scoredIds.has(o.id));
  const metrics=reason?null:{
    engine:confusion(scoreable,'engineAlert'),anyPageChangeBaseline:confusion(scoreable,'anyPageChangeAlert'),
    workload:{scoredIntervals:scoreable.length,observationsReviewed:scoredObservations.length,engineCandidateAlerts:scoreable.reduce((n,i)=>n+i.engineCandidateAlerts,0),engineAlertObservations:scoreable.reduce((n,i)=>n+i.engineAlertObservations,0),engineAlertIntervals:scoreable.filter(i=>i.engineAlert).length,baselineAlertObservations:scoreable.reduce((n,i)=>n+i.baselineAlertObservations,0),baselineAlertIntervals:scoreable.filter(i=>i.anyPageChangeAlert).length,intervalsWithCollectionFailures:scoreable.filter(i=>i.partialCollectionFailure).length},
    observationLatency:latency(scoredObservations)
  };
  return {scope:SCOPE,protocol:{developmentEnd:iso(dev),evaluationStart:iso(start),evaluationEnd:iso(end),labelIntervalConvention:'Half-open [start, end); adjacent intervals are allowed. An observation exactly at an interval end belongs to the next interval, if labelled.',independentLabelsDeclared:independentLabels,protocolTuningIndependentlyVerified:false,untouchedEvaluationIndependentlyVerified:false,baseline:'Alert whenever analysis.pageChanged is true; same eligible observations and labelled intervals as the engine.'},metrics,reason,sampleSizes:counts,exclusions,intervals,observations:observations.map(({firstObservedMs,publisherMs,...row})=>row),attackPredictionMetrics:null,confidenceCalibration:null,limitations:[...LIMITATIONS]};
}
