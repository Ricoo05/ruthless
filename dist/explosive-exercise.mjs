import {demoWorkspace,addAssessment,stageDocument} from './threat-core.mjs';
import {detectionTimeline} from './detection-core.mjs';
export const EXPLOSIVE_CASE='explosive-training-e7';
export function explosiveExercise(){
  let w=demoWorkspace();w.assessments=[];w.evidence=[];w.history=[];
  w=addAssessment(w,{id:EXPLOSIVE_CASE,title:'Fictional suicide-bombing warning exercise',area:'Fictional training Sector E-7 / India',scope:'Domestic',asOf:'2026-10-08',question:'Do the supplied fictional reports justify early verification of an alleged explosive threat? No person, intent, event identity or target is established.',judgment:'',gaps:'Separate the allegation, repeated reporting, unrelated object observation and limited denial. All are authored exercise inputs.',confidence:'Insufficient',priority:'Routine',status:'Draft',reviewNote:'',citedEvidence:[]},'2026-10-01');
  const rows=[
    ['e7-allegation','2026-10-01','Authored helpdesk allegation','e7-original-a','FICTIONAL: A helpdesk received an unverified report alleging a planned suicide bombing in training Sector E-7. No person or event time is confirmed.'],
    ['e7-repost','2026-10-02','Repost of the same allegation','e7-original-a','FICTIONAL: A second exercise outlet repeated the same unverified suicide bombing report. It supplies no independent observation.'],
    ['e7-object','2026-10-03','Authored object observation','e7-original-b','FICTIONAL: Another exercise helpdesk reported a suspicious package in training Sector E-7 on 3 October 2026. Its contents and connection to the allegation remain unknown.'],
    ['e7-denial','2026-10-04','Authored limited inspection account','e7-original-c','FICTIONAL: An operator reported no explosive was found. The inspection scope and timing are unverified.'],
    ['e7-clarification','2026-10-05','Inspection timing clarification','e7-original-c','FICTIONAL: The earlier inspection account concerns a different authored day. No current object observation is supplied.','e7-denial']
  ];
  for(const [id,at,title,originGroup,excerpt,parent] of rows)w=stageDocument(w,{id,assessmentId:EXPLOSIVE_CASE,title,originGroup,publisher:'Authored fictional exercise source',url:'',reportedAt:at,recordedAt:at,language:'English',locator:'Authored exercise paragraph',accessNote:'Fictional prototype inputs; no actual person, location, source or threat. No execution mechanics.',excerpt,synthetic:true,supersedesDocumentId:parent??'',revisionNote:parent?'Authored clarification of the earlier inspection scope.':'',accessAcknowledged:!!parent},at);
  return w;
}
// The authored later attempt is never a detector feature or a 3D scene input.
export function explosiveOutcomeCheck(){
  const eventAt='2026-10-07',knownAt='2026-10-08',timeline=detectionTimeline(explosiveExercise(),{from:'2026-10-01',to:knownAt});
  const first=timeline.find(t=>t.knownBy<eventAt&&t.cases.some(c=>c.assessmentId===EXPLOSIVE_CASE&&c.warning));
  return {synthetic:true,eventAt,knownAt,firstWarning:first?.knownBy??null,leadDays:first?(Date.parse(eventAt)-Date.parse(first.knownBy))/86400000:null,description:'An attempted suicide bombing is separately authored for 7 October. No execution, casualty or prevention outcome is modeled.',limitation:'One visible authored example demonstrates rule timing only. It does not validate attack prediction, identify a bomber or prove that an intervention prevented an attack.'};
}
