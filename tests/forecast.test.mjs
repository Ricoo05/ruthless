import test from 'node:test';
import assert from 'node:assert/strict';
import {authoredForecastData,chronologicalSplit,fitForecastBaseline,forecastSynthetic,forecastMetrics,runForecastExperiment} from '../dist/forecast-core.mjs';

test('chronological experiment separates known training outcomes from later issuance with an explicit gap',()=>{
  const split=chronologicalSplit(authoredForecastData());assert.equal(split.train.length,160);assert.equal(split.purged.length,1);assert.equal(split.test.length,79);assert.ok(Date.parse(split.cutoff)<Date.parse(split.test[0].issuedAt));
  const reversed=authoredForecastData().reverse();assert.throws(()=>chronologicalSplit(reversed),/increasing/);
  const duplicate=authoredForecastData();duplicate[10].id=duplicate[0].id;assert.throws(()=>chronologicalSplit(duplicate),/unique/);
});
test('held-out labels never change fitted weights, scaling or forecast probabilities',()=>{
  const rows=authoredForecastData(),first=runForecastExperiment(rows),changed=structuredClone(rows);changed.slice(161).forEach(r=>r.outcome=1-r.outcome);const second=runForecastExperiment(changed);
  assert.deepEqual(first.model,second.model);assert.deepEqual(first.forecasts.map(r=>r.probability),second.forecasts.map(r=>r.probability));assert.notDeepEqual(first.metrics,second.metrics);
});
test('future feature snapshots, unknown dates, real inputs and premature label knowledge reject',()=>{
  const split=chronologicalSplit(authoredForecastData()),model=fitForecastBaseline(split.train,split.cutoff),row=split.test[0];
  for(const patch of [{synthetic:false},{featuresAsOf:row.outcomeKnownAt},{issuedAt:model.trainedThrough},{region:'real-location'},{issuedAt:'2026-02-30'}])assert.throws(()=>forecastSynthetic(model,{...row,...patch}));
  assert.throws(()=>fitForecastBaseline(split.train,'2021-01-01'),/unavailable/);
  const rows=authoredForecastData();rows[0].outcomeKnownAt=rows[0].issuedAt;assert.throws(()=>chronologicalSplit(rows),/seven days/);
});
test('coverage abstention does not become a zero-risk score or a successful negative',()=>{
  const r=runForecastExperiment(),row=authoredForecastData()[161],f=forecastSynthetic(r.model,{...row,features:{...row.features,coverage:.39}});assert.equal(f.status,'abstained');assert.equal(f.probability,null);
  const metrics=forecastMetrics([{probability:null,outcome:1},{probability:.1,outcome:0}]);assert.equal(metrics.total,2);assert.equal(metrics.scored,1);assert.equal(metrics.abstained,1);assert.equal(metrics.abstainedIncidents,1);assert.equal(metrics.trueNegatives,1);assert.equal(metrics.recall,null);
});
test('probability and alert metrics count false alarms and missed outcomes correctly',()=>{
  const m=forecastMetrics([{probability:.8,outcome:1},{probability:.7,outcome:0},{probability:.1,outcome:1},{probability:.2,outcome:0}],.5);assert.equal(m.truePositives,1);assert.equal(m.falseAlarms,1);assert.equal(m.missedIncidents,1);assert.equal(m.trueNegatives,1);assert.equal(m.precision,.5);assert.equal(m.recall,.5);assert.ok(Math.abs(m.brier-(.04+.49+.81+.04)/4)<1e-12);assert.equal(m.bins.reduce((n,b)=>n+b.count,0),4);
  assert.ok(Number.isFinite(forecastMetrics([{probability:0,outcome:1},{probability:1,outcome:0}]).logLoss));assert.equal(forecastMetrics([]).brier,null);
  assert.throws(()=>forecastMetrics([{probability:1.1,outcome:0}]));assert.throws(()=>forecastMetrics([{probability:.5,outcome:2}]));
});
test('fixed experiment compares the model to base rate over identical scored rows and exposes poor recall',()=>{
  const r=runForecastExperiment();assert.equal(r.metrics.scored,r.baselineMetrics.scored);assert.equal(r.metrics.abstained,r.baselineMetrics.abstained);assert.ok(r.metrics.scored+r.metrics.abstained===r.metrics.total);assert.ok(r.metrics.missedIncidents>0);assert.ok(r.metrics.falseAlarms>0);assert.ok(r.metrics.recall<1);assert.ok(r.limitations.some(l=>l.includes('not attack prediction')));
});
test('malformed models, unsupported features and one-class training cannot emit a forecast',()=>{
  const rows=authoredForecastData(),r=runForecastExperiment(),input=rows[161];
  for(const patch of [{weights:[NaN,0,0,0]},{scale:[0,1,1,1]},{synthetic:false},{horizonDays:1}])assert.throws(()=>forecastSynthetic({...r.model,...patch},input));
  assert.throws(()=>forecastSynthetic(r.model,{...input,features:{...input.features,warningGroups:100}}));assert.throws(()=>forecastSynthetic(r.model,{...input,features:{...input.features,actor:'person'}}));
  assert.throws(()=>fitForecastBaseline(rows.slice(0,30).map(r=>({...r,outcome:0})),rows[30].outcomeKnownAt),/both/);
});
