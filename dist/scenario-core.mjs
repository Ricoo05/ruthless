import {addAssessment,stageDocument,demoWorkspace,serializeWorkspace} from './threat-core.mjs';

export const SCENARIO=Object.freeze({id:'india-civilian-aerial-exercise-v1',title:'Unidentified aerial object — fictional India facility',site:'Training Site IN-01',end:8,lastPositionStep:4,
  observations:[
    {id:'OBS-01',step:0,title:'Initial operator report',group:'exercise-operator-A',channel:'Authored operator log',text:'FICTIONAL EXERCISE: An operator reports a small aerial object near Training Site IN-01. Its identity, purpose and relevance are not established.',position:[-7,3,-4]},
    {id:'OBS-02',step:2,title:'Same-source social repost',group:'exercise-operator-A',channel:'Authored social-post control',text:'FICTIONAL EXERCISE: A social-post control repeats the initial operator report. It provides no new direct observation and no independent confirmation.',position:null},
    {id:'OBS-03',step:4,title:'Camera observation control',group:'exercise-camera-B',channel:'Authored camera-event metadata',text:'FICTIONAL EXERCISE: An authorized-camera control reports a small object in several frames. Appearance alone does not establish identity, intent, equipment or a threat.',position:[-3,3.4,-2]},
    {id:'OBS-04',step:6,title:'Possible benign explanation',group:'exercise-schedule-C',channel:'Authored schedule record',text:'FICTIONAL EXERCISE: A schedule record lists routine aerial inspection activity. Whether it explains the reported object remains unresolved; verify the operator and observation context.',position:null}
  ],
  hypotheses:[
    {id:'routine',label:'Routine inspection remains possible',description:'The schedule record offers a benign explanation. It does not identify the observed object. The animated continuation is an authored illustration.',supports:['OBS-04'],gaps:'Verify the scheduled operator and whether its activity matches the observations.',endPosition:[-5,3.4,3]},
    {id:'unresolved',label:'Possible safety incident — assumed',description:'The reports leave the object unidentified. The animation represents an unresolved continuation; it does not infer hostile intent or an attack.',supports:['OBS-01','OBS-03'],gaps:'Seek authorized corroboration, verify timing and assess alternative explanations.',endPosition:[1,3.4,-3]}
  ]});
export const EXPLOSIVE_REPORT_SCENARIO=Object.freeze({id:'india-public-safety-report-exercise-v1',title:'Unverified explosive-threat report — fictional India site',site:'Training Site IN-01',end:8,lastPositionStep:4,
  observations:[
    {id:'OBS-01',step:0,title:'Unverified threat allegation',group:'exercise-report-A',channel:'Authored helpdesk control',text:'FICTIONAL EXERCISE: A helpdesk receives an unverified allegation of a possible explosive threat near a fictional site. The source, equipment, intent and credibility are not established.',position:[-6,.5,3]},
    {id:'OBS-02',step:2,title:'Recycled allegation',group:'exercise-report-A',channel:'Authored social-post control',text:'FICTIONAL EXERCISE: A social-post control repeats the same helpdesk allegation without a new observation. This is not independent corroboration.',position:null},
    {id:'OBS-03',step:4,title:'Ambiguous activity report',group:'exercise-camera-B',channel:'Authored camera-event metadata',text:'FICTIONAL EXERCISE: A camera-event control describes ordinary activity near the fictional site. It identifies no explosive device, hostile intent or confirmed link to the allegation.',position:[-6,.5,3]},
    {id:'OBS-04',step:6,title:'Alternative explanation',group:'exercise-operations-C',channel:'Authored operations log',text:'FICTIONAL EXERCISE: An operations log describes routine deliveries. It may explain the observed activity, but does not independently resolve the original allegation.',position:null}
  ],
  hypotheses:[
    {id:'routine',label:'Mistaken or recycled report remains possible',description:'Routine activity and shared-source reporting provide an alternative explanation. The illustration does not establish that the allegation is false.',supports:['OBS-02','OBS-04'],gaps:'Verify the original source, timing and whether reported activity is related at all.',endPosition:[-6,.5,3]},
    {id:'unresolved',label:'Possible safety incident — assumed',description:'The allegation remains unverified. A stationary marker identifies an authored report area, not a person, attack route or device.',supports:['OBS-01'],gaps:'Follow authorized incident-review procedures and pass a documented concern to the designated human team.',endPosition:[-6,.5,3]}
  ]});
export const SCENARIOS=Object.freeze([SCENARIO,EXPLOSIVE_REPORT_SCENARIO]);
export function scenarioFrame(step,hypothesisId='routine',scenarioId=SCENARIO.id){
  const scenario=SCENARIOS.find(s=>s.id===scenarioId);if(!scenario)throw new Error('Unknown exercise.');
  if(!Number.isFinite(step)||step<0||step>scenario.end)throw new Error('Exercise step must be between 0 and 8.');
  const hypothesis=scenario.hypotheses.find(h=>h.id===hypothesisId);if(!hypothesis)throw new Error('Unknown scenario hypothesis.');
  const observations=scenario.observations.filter(o=>o.step<=step),a=scenario.observations[0].position,b=scenario.observations[2].position;
  const future=step>scenario.lastPositionStep,t=future?(step-4)/4:step/4;
  const start=future?b:a,end=future?hypothesis.endPosition:b;
  const availableSupports=hypothesis.supports.filter(id=>observations.some(o=>o.id===id)),missingSupports=hypothesis.supports.filter(id=>!observations.some(o=>o.id===id));
  return {scenario,step,hypothesis,observations,sourceGroups:new Set(observations.map(o=>o.group)).size,
    position:start.map((v,i)=>v+(end[i]-v)*t),possibleDisruption:hypothesisId==='unresolved'&&step>=6,mode:future?'Authored hypothesis':step===0||step===4?'Authored observation marker':'Illustrative interpolation',
    availableSupports,missingSupports,
    explanation:missingSupports.length?'This is an authored alternative to test. Its full listed support is not available at this exercise step; no conclusion is established.':hypothesis.description,
    verification:missingSupports.length?'Verify currently available reports and source context. Revisit this explanation when additional support becomes available.':hypothesis.gaps,
    lastPositionStep:observations.filter(o=>o.position).at(-1)?.step??null};
}
export function scenarioWorkspace(step,hypothesisId='routine',scenarioId=SCENARIO.id){
  const frame=scenarioFrame(step,hypothesisId,scenarioId),scenario=frame.scenario,at='2026-10-05',id='scenario-india-civilian-exercise';
  let w=addAssessment(demoWorkspace(),{id,title:scenario.title,area:'Fictional civilian training site / India context',scope:'Domestic',question:'Which explanation fits these fictional reports, and what authorized verification is still needed?',asOf:at,judgment:'',gaps:`3D replay is authored illustration, not a prediction. Selected hypothesis: ${frame.hypothesis.label}. Possible disruption is an authored branch, not an observed event. ${frame.verification} Only observations available by exercise step ${step.toFixed(1)} are staged.`,confidence:'Insufficient',priority:'Routine',status:'Needs review',reviewNote:'',citedEvidence:[]},at);
  for(const o of frame.observations)w=stageDocument(w,{id:`scenario-${o.id.toLowerCase()}`,assessmentId:id,title:o.title,publisher:o.channel,originGroup:o.group,url:'',reportedAt:at,recordedAt:at,language:'English',locator:`Authored exercise step ${o.step} / ${o.id}`,accessNote:'Authored fictional prototype control. No real camera, social account, person, facility, event or agency is represented. The scenario is not validated prediction.',excerpt:o.text,synthetic:true},at);
  return {workspace:w,json:serializeWorkspace(w),assessmentId:id,observationCount:frame.observations.length};
}

// Perspective projection of genuine XYZ scene geometry. Coordinates are arbitrary
// authored display units, never geographic locations or sensor measurements.
export function projectPoint(point,{yaw=.65,pitch=.7,distance=26,focal=600,cx=400,cy=260}={}){
  if(!Array.isArray(point)||point.length!==3||point.some(v=>!Number.isFinite(v)))throw new Error('Invalid scene point.');
  const [x,y,z]=point,rx=Math.cos(yaw)*x+Math.sin(yaw)*z,rz=-Math.sin(yaw)*x+Math.cos(yaw)*z;
  const ry=Math.cos(pitch)*(y-1)+Math.sin(pitch)*rz,depth=distance-Math.sin(pitch)*(y-1)+Math.cos(pitch)*rz;
  if(depth<=.1)return null;
  return {x:cx+rx*focal/depth,y:cy-ry*focal/depth,depth};
}
