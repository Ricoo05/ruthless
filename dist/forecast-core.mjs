export const FEATURE_NAMES=Object.freeze(['warningGroups','reposts','contradictingGroups','coverage']);
const DAY=86400000,HORIZON=7*DAY;
const fail=m=>{throw new Error(m);};
const sigmoid=x=>1/(1+Math.exp(-Math.max(-30,Math.min(30,x))));
function date(v){if(typeof v!=='string'||!/^\d{4}-\d\d-\d\d$/.test(v)||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)fail('Invalid forecast date.');return Date.parse(v+'T00:00:00Z');}
function features(f){if(!f||Array.isArray(f)||Object.keys(f).length!==4||FEATURE_NAMES.some(k=>!Object.hasOwn(f,k)))fail('Four known forecast features are required.');const x=FEATURE_NAMES.map(k=>f[k]);if(x.some(v=>!Number.isFinite(v))||!Number.isInteger(x[0])||x[0]<0||x[0]>4||!Number.isInteger(x[1])||x[1]<0||x[1]>12||!Number.isInteger(x[2])||x[2]<0||x[2]>3||x[3]<0||x[3]>1)fail('Forecast features are outside the authored training range.');return x;}
export function validateForecastInput(row){
  if(!row||row.synthetic!==true||!/^training-region-IN-[1-5]$/.test(row.region)||date(row.featuresAsOf)>date(row.issuedAt))fail('Only synthetic regional inputs available by issuance are supported.');
  return features(row.features);
}
function labeled(row){validateForecastInput(row);if(![0,1].includes(row.outcome)||date(row.outcomeKnownAt)!==date(row.issuedAt)+HORIZON)fail('A binary synthetic outcome known seven days later is required.');return row;}
export function authoredForecastData(){
  let state=718281;const random=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;};
  const day=n=>new Date(Date.UTC(2021,0,1)+n*DAY).toISOString().slice(0,10);
  return Array.from({length:240},(_,i)=>{
    const warningGroups=Math.floor(random()*5),reposts=Math.floor(random()*13),contradictingGroups=Math.floor(random()*4),coverage=Math.round((.2+.8*random())*100)/100;
    // Authored data-generating rule, not a model of actual attacks. Outcome noise
    // is deliberate. Reposts have no causal role in this toy generator.
    const p=sigmoid(-3+.7*warningGroups-.55*contradictingGroups+.4*coverage);
    return {id:`forecast-control-${i+1}`,synthetic:true,region:`training-region-IN-${i%5+1}`,issuedAt:day(i*7),featuresAsOf:day(i*7),features:{warningGroups,reposts,contradictingGroups,coverage},outcomeKnownAt:day(i*7+7),outcome:random()<p?1:0};
  });
}
export function chronologicalSplit(rows){
  if(!Array.isArray(rows)||rows.length<180||rows.length>500)fail('Use 180–500 chronological synthetic rows.');
  rows.forEach(labeled);const ids=new Set();for(let i=0;i<rows.length;i++){if(typeof rows[i].id!=='string'||ids.has(rows[i].id)||(i&&date(rows[i].issuedAt)<=date(rows[i-1].issuedAt)))fail('Rows require unique IDs and strictly increasing issue dates.');ids.add(rows[i].id);}
  const train=rows.slice(0,160),purged=[rows[160]],test=rows.slice(161),cutoff=train.at(-1).outcomeKnownAt;
  if(train.some(r=>date(r.outcomeKnownAt)>date(cutoff))||date(cutoff)>=date(test[0].issuedAt))fail('Training outcomes overlap later forecast issuance.');
  return {train,purged,test,cutoff};
}
export function fitForecastBaseline(train,cutoff){
  if(!Array.isArray(train)||train.length<20||train.length>500)fail('Training rows must be bounded.');
  train.forEach(r=>{labeled(r);if(date(r.outcomeKnownAt)>date(cutoff))fail('Training outcome was unavailable at the cutoff.');});
  const xs=train.map(r=>features(r.features)),mean=FEATURE_NAMES.map((_,j)=>xs.reduce((s,x)=>s+x[j],0)/xs.length),scale=mean.map((m,j)=>Math.sqrt(xs.reduce((s,x)=>s+(x[j]-m)**2,0)/xs.length)||1);
  const normalized=xs.map(x=>x.map((v,j)=>(v-mean[j])/scale[j])),prevalence=train.reduce((s,r)=>s+r.outcome,0)/train.length;
  if(prevalence===0||prevalence===1)fail('Training requires both synthetic outcome classes.');
  let intercept=Math.log(prevalence/(1-prevalence));const weights=[0,0,0,0];
  for(let epoch=0;epoch<600;epoch++){
    const gradient=[0,0,0,0];let bias=0;
    normalized.forEach((x,i)=>{const error=sigmoid(intercept+x.reduce((s,v,j)=>s+v*weights[j],0))-train[i].outcome;bias+=error;x.forEach((v,j)=>gradient[j]+=error*v);});
    intercept-=.08*bias/train.length;weights.forEach((_,j)=>weights[j]-=.08*(gradient[j]/train.length+.02*weights[j]));
  }
  return {format:'ruthless-synthetic-forecast-model',version:1,synthetic:true,horizonDays:7,trainedThrough:cutoff,trainingRows:train.length,mean,scale,weights,intercept,prevalence};
}
function validModel(m){if(!m||m.format!=='ruthless-synthetic-forecast-model'||m.version!==1||m.synthetic!==true||m.horizonDays!==7||![m.mean,m.scale,m.weights].every(a=>Array.isArray(a)&&a.length===4&&a.every(Number.isFinite))||m.scale.some(v=>v<=0)||!Number.isFinite(m.intercept)||!Number.isFinite(m.prevalence)||m.prevalence<=0||m.prevalence>=1)fail('Invalid synthetic forecast model.');date(m.trainedThrough);}
export function forecastSynthetic(model,input){
  validModel(model);const x=validateForecastInput(input);
  if(date(input.issuedAt)<=date(model.trainedThrough))fail('Forecast issuance must follow the training outcome cutoff.');
  const common={synthetic:true,region:input.region,issuedAt:input.issuedAt,horizonDays:7,modelTrainedThrough:model.trainedThrough};
  if(input.features.coverage<.4)return {...common,status:'abstained',probability:null,reason:'Authored coverage is below the fixed 0.40 gate. Missing coverage is not safety.'};
  const contributions=x.map((v,j)=>(v-model.mean[j])/model.scale[j]*model.weights[j]);
  return {...common,status:'forecast',probability:sigmoid(model.intercept+contributions.reduce((a,b)=>a+b,0)),contributions:FEATURE_NAMES.map((name,j)=>({feature:name,logitContribution:contributions[j]})),reason:'Synthetic model estimate only; not calibrated or validated for real incidents.'};
}
export function forecastMetrics(records,threshold=.35){
  if(!Number.isFinite(threshold)||threshold<=0||threshold>=1||!Array.isArray(records)||records.length>500)fail('Invalid forecast evaluation inputs.');
  let tp=0,fp=0,tn=0,fn=0,brier=0,logLoss=0,abstained=0,abstainedIncidents=0;const bins=Array.from({length:5},(_,i)=>({from:i/5,to:(i+1)/5,count:0,probabilitySum:0,positives:0}));
  for(const r of records){if(![0,1].includes(r.outcome))fail('Unknown evaluation outcome.');if(r.probability===null){abstained++;abstainedIncidents+=r.outcome;continue;}const p=r.probability;if(!Number.isFinite(p)||p<0||p>1)fail('Invalid forecast probability.');const positive=p>=threshold;
    if(positive&&r.outcome)tp++;else if(positive)fp++;else if(r.outcome)fn++;else tn++;
    brier+=(p-r.outcome)**2;const bounded=Math.max(1e-12,Math.min(1-1e-12,p));logLoss-=r.outcome*Math.log(bounded)+(1-r.outcome)*Math.log(1-bounded);
    const bin=bins[Math.min(4,Math.floor(p*5))];bin.count++;bin.probabilitySum+=p;bin.positives+=r.outcome;
  }
  const scored=tp+fp+tn+fn;
  return {total:records.length,scored,abstained,abstainedIncidents,threshold,truePositives:tp,falseAlarms:fp,trueNegatives:tn,missedIncidents:fn,precision:tp+fp?tp/(tp+fp):null,recall:tp+fn?tp/(tp+fn):null,brier:scored?brier/scored:null,logLoss:scored?logLoss/scored:null,
    bins:bins.map(b=>({from:b.from,to:b.to,count:b.count,meanForecast:b.count?b.probabilitySum/b.count:null,observedRate:b.count?b.positives/b.count:null}))};
}
export function runForecastExperiment(rows=authoredForecastData()){
  const split=chronologicalSplit(rows),model=fitForecastBaseline(split.train,split.cutoff);
  const forecasts=split.test.map(r=>({...forecastSynthetic(model,r),id:r.id,outcome:r.outcome,outcomeKnownAt:r.outcomeKnownAt}));
  const baseline=forecasts.map(r=>({...r,probability:r.probability===null?null:model.prevalence}));
  return {format:'ruthless-forecast-experiment',version:1,synthetic:true,target:'Authored regional incident outcome within seven days',model,trainingCount:split.train.length,purgedCount:split.purged.length,firstTestIssuedAt:split.test[0].issuedAt,forecasts,metrics:forecastMetrics(forecasts),baselineMetrics:forecastMetrics(baseline),limitations:['All features and outcomes are authored controls, not historical India intelligence.','Held-out outcomes are visible in the source; this is not independent or blinded evaluation.','Scores measure the toy data generator, not attack prediction, calibration in deployment, or prevention effectiveness.','No real data, person profiling, source collection, operational alert, AI provider or agency decision is connected.']};
}
