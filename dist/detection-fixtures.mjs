import {demoWorkspace,addAssessment,stageDocument} from './threat-core.mjs';
import {detectionTimeline} from './detection-core.mjs';
export const REPLAY_DAYS=Object.freeze(['2026-10-01','2026-10-02','2026-10-03','2026-10-04','2026-10-05','2026-10-06','2026-10-07','2026-10-08']);
export function detectionExercise(){
  const workspace=demoWorkspace();workspace.assessments=[];workspace.evidence=[];workspace.history=[];
  const definitions=[['detect-aerial','Aerial warning exercise','Fictional Sector R-7 / India','Domestic'],['detect-object','Suspicious-object false-alarm control','Fictional Sector B-2 / India','Domestic'],['detect-missed','Missed-signal control','Fictional Sector M-3 / India','Domestic'],['detect-routine','Routine and advisory controls','Fictional overseas context','International']];
  let next=workspace;
  for(const [id,title,area,scope] of definitions)next=addAssessment(next,{id,title,area,scope,asOf:'2026-10-08',question:'Do the retained fictional reports support early verification? Compare unresolved warning, routine explanations and source dependence.',judgment:'',gaps:'Authored exercise; no real event, actor or target.',confidence:'Insufficient',priority:'Routine',status:'Draft',reviewNote:'',citedEvidence:[]},'2026-10-01');
  const rows=[
    ['a-warning','detect-aerial','Source A: unverified warning','group-a','2026-10-01','FICTIONAL: The exercise helpdesk received an unverified threat report concerning Sector R-7. Event identity and timing remain unknown.'],
    ['a-repost','detect-aerial','Source A repost','group-a','2026-10-02','FICTIONAL: A repost repeated the unverified threat report concerning Sector R-7. This uses the same underlying source.'],
    ['a-observation','detect-aerial','Source B: aerial-object observation','group-b','2026-10-03','FICTIONAL: An exercise observer reported a drone in Sector R-7 on 3 October 2026. Its purpose is unknown and the object may have a benign explanation.'],
    ['a-denial','detect-aerial','Source C: alternative explanation','group-c','2026-10-04','FICTIONAL: Another operator reported no drone associated with hostile activity. Routine maintenance offers an alternative explanation; neither account is verified.'],
    ['b-object','detect-object','Source D: object report','group-d','2026-10-02','FICTIONAL: A facilities desk reported a suspicious package in Sector B-2. Its contents are unknown.'],
    ['b-warning','detect-object','Source E: unverified warning','group-e','2026-10-03','FICTIONAL: A separate exercise desk received an unverified threat report concerning Sector B-2. The reports may be unrelated.'],
    ['b-correction','detect-object','Source E: warning withdrawn','group-e','2026-10-04','FICTIONAL: The earlier threat report was withdrawn as a false alarm. The object was ordinary equipment.','b-warning'],
    ['m-observation','detect-missed','Ambiguous observation','group-m','2026-10-01','FICTIONAL: An unusual pattern was logged in Sector M-3. This passage deliberately contains no supported security-signal phrase.'],
    ['routine-en','detect-routine','Routine observation','group-r','2026-10-01','FICTIONAL: No drone was observed. The reported threat was withdrawn as a false alarm.'],
    ['routine-hi','detect-routine','Hindi denial control','group-h','2026-10-02','काल्पनिक: ड्रोन नहीं देखा गया। बम की धमकी झूठी सूचना थी।'],
    ['advice','detect-routine','General safety advisory','group-advice','2026-10-03','General guidance: If an explosive threat is reported, consult established procedures. This is travel advice, not a new incident report.']
  ];
  for(const [id,assessmentId,title,originGroup,at,excerpt,parent] of rows)next=stageDocument(next,{id,assessmentId,title,originGroup,publisher:'Authored fictional source',url:'',reportedAt:at,recordedAt:at,language:id==='routine-hi'?'Hindi':'English',locator:'Authored replay paragraph',accessNote:'Synthetic prototype exercise. No real source, event, person or facility.',excerpt,synthetic:true,supersedesDocumentId:parent??'',revisionNote:parent?'Authored withdrawal; earlier passage remains retained.':'',accessAcknowledged:!!parent},at);
  return next;
}
// Later outcomes are kept outside detector inputs and never passed to extraction.
export const AUTHORED_OUTCOMES=Object.freeze([
  {assessmentId:'detect-aerial',incident:true,eventAt:'2026-10-07',knownAt:'2026-10-08',description:'Authored public-safety incident; no attack mechanics are simulated.'},
  {assessmentId:'detect-object',incident:false,eventAt:null,knownAt:'2026-10-08',description:'Ordinary equipment and withdrawn warning; no incident in this authored window.'},
  {assessmentId:'detect-missed',incident:true,eventAt:'2026-10-07',knownAt:'2026-10-08',description:'Authored incident with no recognized earlier signal.'},
  {assessmentId:'detect-routine',incident:false,eventAt:null,knownAt:'2026-10-08',description:'Authored uneventful period.'}
]);
export function evaluateDetectionExercise(){
  const timeline=detectionTimeline(detectionExercise(),{from:REPLAY_DAYS[0],to:REPLAY_DAYS.at(-1)});
  const results=AUTHORED_OUTCOMES.map(outcome=>{
    const first=timeline.find(t=>t.knownBy<outcome.knownAt&&(!outcome.incident||t.knownBy<outcome.eventAt)&&t.cases.some(c=>c.assessmentId===outcome.assessmentId&&c.warning));
    return {...outcome,firstWarning:first?.knownBy??null,result:outcome.incident?(first?'Timely warning':'Missed incident'):(first?'False warning':'No rule warning'),leadDays:outcome.incident&&first?(Date.parse(outcome.eventAt)-Date.parse(first.knownBy))/86400000:null};
  });
  const timely=results.filter(r=>r.result==='Timely warning').length,falseWarnings=results.filter(r=>r.result==='False warning').length,missed=results.filter(r=>r.result==='Missed incident').length;
  return {kind:'authored_detection_check',results,timely,falseWarnings,missed,uneventful:results.filter(r=>r.result==='No rule warning').length,precision:timely/(timely+falseWarnings),recall:timely/(timely+missed),limitation:'Four visible authored controls, not an independent performance estimate or evidence of prevention effectiveness.'};
}
