import test from 'node:test';
import assert from 'node:assert/strict';
import {demoWorkspace,serializeWorkspace,parseWorkspace,validateWorkspace,evidenceSummary,updateAssessment,addEvidence,addAssessment,searchAssessments,exportAssessment,sourceURL,day,MAX_BYTES} from '../dist/threat-core.mjs';
const clone=v=>JSON.parse(JSON.stringify(v));
const caseID='training-domestic';
const review={status:'Reviewed',confidence:'Low',judgment:'The available synthetic reports do not establish cause or attribution.',gaps:'Independent primary records and verification of the alternative explanation are missing.',reviewNote:'The conflicting account prevents a firm attribution.',citedEvidence:['SYN-001','SYN-003'],challengesAcknowledged:true};
const source={id:'new-source',assessmentId:caseID,title:'Independent follow-up',publisher:'Synthetic publisher',originGroup:'training-follow-up',url:'',reportedAt:'2026-10-03',recordedAt:'2026-10-03',statement:'Fictional follow-up evidence for testing.',claimState:'Reported',relation:'Supports',synthetic:true};
test('training data is explicitly synthetic and reposts are not independent source groups',()=>{
  const w=demoWorkspace(),s=evidenceSummary(w,caseID);assert.equal(s.records,3);assert.equal(s.sourceGroups,1);assert.equal(s.challenging,1);assert.ok(w.evidence.every(e=>e.synthetic));assert.deepEqual(s.timeline.map(e=>e.id),['SYN-001','SYN-002','SYN-003']);
});
test('review requires cited reasoning and uncertainty, and rejects empty or insufficient assessments atomically',()=>{
  const w=demoWorkspace(),raw=serializeWorkspace(w);assert.throws(()=>updateAssessment(w,caseID,{status:'Reviewed'},'2026-10-03'));
  assert.throws(()=>updateAssessment(w,caseID,{...review,confidence:'Insufficient'},'2026-10-03'));
  assert.throws(()=>updateAssessment(w,caseID,{...review,citedEvidence:[]},'2026-10-03'));
  assert.equal(serializeWorkspace(w),raw);
  const changed=updateAssessment(w,caseID,review,'2026-10-03');assert.equal(changed.assessments[0].status,'Reviewed');assert.equal(w.assessments[0].status,'Draft');assert.equal(changed.history.length,1);
});
test('challenging evidence requires explicit consideration before review',()=>{
  assert.throws(()=>updateAssessment(demoWorkspace(),caseID,{...review,challengesAcknowledged:false},'2026-10-03'),/conflicting evidence/);
});
test('reviewed assessments cannot use future reports relative to the assessment date',()=>{
  assert.throws(()=>updateAssessment(demoWorkspace(),caseID,{...review,asOf:'2026-10-01'},'2026-10-03'),/as-of date/);
});
test('new evidence reopens a reviewed judgment without silently rewriting it',()=>{
  const reviewed=updateAssessment(demoWorkspace(),caseID,review,'2026-10-03');const changed=addEvidence(reviewed,source,'2026-10-03');assert.equal(changed.assessments[0].status,'Needs review');assert.equal(changed.assessments[0].judgment,review.judgment);assert.equal(reviewed.evidence.length,4);assert.equal(changed.evidence.length,5);
});
test('cross-case citations, orphan records and duplicate identifiers are rejected',()=>{
  const w=demoWorkspace();assert.throws(()=>updateAssessment(w,caseID,{citedEvidence:['SYN-004']},'2026-10-03'),/same assessment/);
  assert.throws(()=>addEvidence(w,{...source,assessmentId:'missing'},'2026-10-03'),/unknown assessment/);
  assert.throws(()=>addEvidence(w,{...source,id:'SYN-001'},'2026-10-03'),/already exists/);
  assert.throws(()=>validateWorkspace({...w,assessments:[...w.assessments,w.assessments[0]]}),/Duplicate/);
});
test('source links reject scripts and credentials; actual records require references',()=>{
  for(const u of ['javascript:alert(1)','http://example.com','https://name:secret@example.com'])assert.throws(()=>sourceURL(u),/HTTPS/);
  assert.equal(sourceURL('https://nia.gov.in/press-releases'),'https://nia.gov.in/press-releases');
  assert.throws(()=>addEvidence(demoWorkspace(),{...source,synthetic:false},'2026-10-03'),/source URL/);
});
test('chronology rejects impossible dates and recording before publication',()=>{
  for(const d of ['2026-02-30','2026-13-01','Oct 3 2026'])assert.throws(()=>day(d));
  assert.throws(()=>addEvidence(demoWorkspace(),{...source,recordedAt:'2026-10-01'},'2026-10-03'),/precede/);
});
test('save/open restores review and source snapshot while discarding unknown trust claims',()=>{
  const w=updateAssessment(demoWorkspace(),caseID,review,'2026-10-03');assert.deepEqual(parseWorkspace(serializeWorkspace(w)),w);
  const spoof=clone(w);spoof.officiallyApproved=true;spoof.evidence[0].verifiedByGovernment=true;const parsed=parseWorkspace(JSON.stringify(spoof));assert.equal(parsed.officiallyApproved,undefined);assert.equal(parsed.evidence[0].verifiedByGovernment,undefined);
});
test('workspace bounds and UTF-8 size limit reject data without modifying existing state',()=>{
  const w=demoWorkspace(),raw=serializeWorkspace(w);assert.throws(()=>parseWorkspace('界'.repeat(MAX_BYTES/3+1)),/2 MB/);
  const full=clone(w);full.history=Array.from({length:2000},()=>({assessmentId:caseID,at:'2026-10-03',action:'Record',note:''}));assert.throws(()=>addEvidence(full,source,'2026-10-03'),/2,000 history/);
  assert.equal(serializeWorkspace(w),raw);
});
test('new questions, geographic filters and empty results behave explicitly',()=>{
  const w=demoWorkspace();const c={...w.assessments[2],id:'new-case',title:'New question'};const changed=addAssessment(w,c,'2026-10-03');assert.equal(changed.assessments.length,4);assert.equal(w.assessments.length,3);assert.equal(searchAssessments(changed,{scope:'Cross-border'}).length,1);assert.equal(searchAssessments(changed,{query:'missing'}).length,0);
});
test('brief preserves contradictory records, source attribution and the limits of review labels',()=>{
  const w=updateAssessment(demoWorkspace(),caseID,review,'2026-10-03'),brief=exportAssessment(w,caseID);assert.match(brief,/SYNTHETIC/);assert.match(brief,/SYN-003/);assert.match(brief,/does not establish independence or truth/);assert.match(brief,/not an attack forecast/);assert.match(brief,/Low \(analyst assigned\)/);assert.match(brief,/Reviewed does not mean independent agency approval/);
});
