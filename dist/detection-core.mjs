import {day,validateWorkspace} from './threat-core.mjs';
import {currentReportRecords} from './signals-core.mjs';
import {extractContextMentions} from './context-hints.mjs';

export const DETECTION_VERSION='report-signals-1';
export const SIGNAL_RULES=Object.freeze([
  {code:'warning',label:'Threat / attack report',pattern:'\\b(?:threat(?:s)?|attack(?:s)?|bomb warning)\\b|हमले की धमकी|बम की धमकी|धमकी|आतंकी हमला|आतंकवादी हमला'},
  {code:'aerial',label:'Aerial-object report',pattern:'\\b(?:drone(?:s)?|uav(?:s)?|unmanned aircraft)\\b|ड्रोन|यूएवी'},
  {code:'explosive',label:'Explosive / suspicious-object report',pattern:'\\b(?:explosive(?:s)?|suspicious package|unattended package|bomb(?:s|ing)?)\\b|विस्फोटक|विस्फोट|संदिग्ध पैकेट|बम'},
  {code:'violence',label:'Armed-violence report',pattern:'\\b(?:shooting|gunfire|armed violence)\\b|गोलीबारी'},
  {code:'security',label:'Security-alert report',pattern:'\\b(?:security alarm|perimeter alert|security disruption)\\b|सुरक्षा अलार्म|सुरक्षा चेतावनी'}
]);
const DENIAL=/\b(?:no|without|never|not)\b.{0,35}$/iu;
const WITHDRAWAL=/\b(?:withdrawn|retracted|false alarm|hoax|denied)\b|झूठी सूचना|खारिज|वापस ली गई/iu;
const CONTEXT=/\b(?:if|in case of|in the event of|historical|training exercise|scheduled drill|simulation|general guidance|travel advice|risk of)\b|यदि|अभ्यास|दिशानिर्देश|सामान्य सलाह/iu;
const UNCERTAIN=/\b(?:unverified|alleged|allegation|rumou?r|unconfirmed|not confirmed|not verified|not independently verified|possible|may|might|could)\b|अपुष्ट|अफवाह|संभावित|पुष्टि\s+नहीं/iu;
const REPORTED=/\b(?:reported|observed|received|detected|logged|reports|report)\b|देखा|रिपोर्ट|सूचना|प्राप्त/iu;
const advisory=row=>/advisory|guidance|travel advice|दिशानिर्देश|यात्रा सलाह/iu.test(row.title);
const normalize=s=>s.normalize('NFKC').toLocaleLowerCase('en-US').replace(/\s+/gu,' ').trim();
const DAY=86400000;
export const dateOffset=(date,offset)=>{day(date);if(!Number.isInteger(offset)||Math.abs(offset)>365)throw Error('Invalid detection day offset.');return new Date(Date.parse(date+'T00:00:00Z')+offset*DAY).toISOString().slice(0,10);};
function sourceClauses(text){
  const clauses=[];
  for(const sentence of text.matchAll(/[^.!?。।;\n]+[.!?。।;]?/gu)){
    let start=0;const uncertainty=UNCERTAIN.test(sentence[0]);
    for(const separator of sentence[0].matchAll(/\b(?:but|however|whereas)\b|लेकिन|परंतु/giu)){
      if(separator.index>start)clauses.push({quote:sentence[0].slice(start,separator.index),start:sentence.index+start,uncertainty});start=separator.index+separator[0].length;
    }
    if(start<sentence[0].length)clauses.push({quote:sentence[0].slice(start),start:sentence.index+start,uncertainty});
  }
  return clauses;
}

// Bounded, inspectable lexical rules. Clause scope reduces some negation errors;
// it is not a learned classifier or a reliable parser of arbitrary language.
export function extractSecuritySignals(text,{title=''}={}){
  if(typeof text!=='string'||text.length>4000||typeof title!=='string'||title.length>200)throw Error('Detection requires a bounded original passage.');
  const signals=[];
  for(const clause of sourceClauses(text)){
    const body=clause.quote;
    for(const rule of SIGNAL_RULES)for(const m of body.matchAll(new RegExp(rule.pattern,'giu'))){
      const start=clause.start+m.index,end=start+m[0].length;
      const before=body.slice(Math.max(0,m.index-70),m.index),after=body.slice(m.index+m[0].length,m.index+m[0].length+65);
      const denied=WITHDRAWAL.test(body)||DENIAL.test(before.replace(/\bnot (?:only|(?:independently )?(?:confirmed|verified))\b/giu,''))||/^.{0,30}\b(?:was|were|is|are)?\s*(?:not observed|not found|not detected|absent)\b/iu.test(after)||/नहीं|नही/u.test(after.replace(/पुष्टि\s+नहीं/gu,''));
      const polarity=advisory({title})||CONTEXT.test(body)?'Context only':denied?'Denied / withdrawn':clause.uncertainty?'Unverified report':REPORTED.test(body)?'Reported claim':'Context only';
      signals.push({code:rule.code,label:rule.label,quote:m[0],start,end,clause:{quote:body,start:clause.start,end:clause.start+body.length},polarity});
      if(signals.length>=80)return {signals,truncated:true};
    }
  }
  return {signals,truncated:false};
}

function windowSettings({knownBy,lookbackDays=7,scope='All'}={}){
  day(knownBy);if(!Number.isInteger(lookbackDays)||lookbackDays<1||lookbackDays>30||!['All','Domestic','Cross-border','International'].includes(scope))throw Error('Invalid detection window.');
  return {knownBy,lookbackDays,scope,from:dateOffset(knownBy,1-lookbackDays)};
}
function summarize(c,records){
  const positive=records.filter(r=>r.activeCodes.length&&!r.duplicateOf&&!r.outsidePublicationWindow),denials=records.filter(r=>r.deniedCodes.length&&!r.outsidePublicationWindow),contexts=records.filter(r=>r.signals.length&&(!r.activeCodes.length&&!r.deniedCodes.length||r.outsidePublicationWindow));
  const groups=[...new Set(positive.map(r=>normalize(r.originGroup)))],codes=[...new Set(positive.flatMap(r=>r.activeCodes))];
  const threshold=groups.length>=2&&(codes.includes('warning')||codes.length>=2);
  const overlap=denials.some(r=>r.deniedCodes.some(code=>codes.includes(code)));
  const state=threshold?(overlap?'Contested warning candidate':'Warning candidate'):positive.length?'Watch':records.length?'No rule warning':'No report coverage';
  const reason=threshold?`${groups.length} recorded source groups contain active reports with ${codes.length} signal categories. ${overlap?'At least one matching category also has a denial; the candidate remains contested.':'Verify event identity and source independence before escalation.'}`:positive.length?'Active report(s) found; the multi-group rule is not met.':records.length?'No active multi-group rule is met. This does not establish safety.':'No current reports in this window. Coverage is unknown.';
  return {assessmentId:c.id,title:c.title,area:c.area,scope:c.scope,state,warning:threshold,reason,positiveGroups:groups,activeCodes:codes,positiveCount:positive.length,denialCount:denials.length,contextCount:contexts.length,duplicateCount:records.filter(r=>r.duplicateOf).length,records,synthetic:records.every(r=>r.synthetic),limitations:records.length?['Case assignment and source groups are supplied metadata; no common event or independent corroboration is established.']:['No source observations are available.']};
}

export function detectWarnings(input,settings){
  const workspace=validateWorkspace(input),window=windowSettings(settings),rows=currentReportRecords(workspace,{from:'0001-01-01',to:window.knownBy,scope:window.scope}).filter(r=>r.recordedAt>=window.from),seen=new Map();
  const records=rows.sort((a,b)=>a.recordedAt.localeCompare(b.recordedAt)||a.reportedAt.localeCompare(b.reportedAt)||a.recordKey.localeCompare(b.recordKey)).map(row=>{
    const key=row.assessmentId+'\n'+normalize(row.text),duplicateOf=seen.get(key)??'';if(!duplicateOf)seen.set(key,row.recordKey);
    const extracted=extractSecuritySignals(row.text,{title:row.title}),activeCodes=[...new Set(extracted.signals.filter(s=>['Reported claim','Unverified report'].includes(s.polarity)).map(s=>s.code))],deniedCodes=[...new Set(extracted.signals.filter(s=>s.polarity==='Denied / withdrawn').map(s=>s.code))];
    return {...row,...extracted,activeCodes,deniedCodes,duplicateOf,outsidePublicationWindow:row.reportedAt<window.from,dateMentions:extractContextMentions(row.text)};
  });
  const cases=workspace.assessments.filter(c=>window.scope==='All'||c.scope===window.scope).map(c=>summarize(c,records.filter(r=>r.assessmentId===c.id)));
  return {kind:'rule_warning_detection',version:DETECTION_VERSION,window,recordsScanned:records.length,signalCount:records.reduce((n,r)=>n+r.signals.length,0),warningCount:cases.filter(c=>c.warning).length,watchCount:cases.filter(c=>c.state==='Watch').length,coverageGapCount:cases.filter(c=>!c.records.length).length,cases};
}

export function detectionTimeline(input,{from,to,scope='All',lookbackDays=7}){
  day(from);day(to);const length=(Date.parse(to+'T00:00:00Z')-Date.parse(from+'T00:00:00Z'))/DAY+1;
  if(!Number.isInteger(length)||length<1||length>31)throw Error('Replay at most 31 ordered days.');
  return Array.from({length},(_,i)=>{const knownBy=dateOffset(from,i),r=detectWarnings(input,{knownBy,scope,lookbackDays});return {knownBy,warningCount:r.warningCount,watchCount:r.watchCount,cases:r.cases.map(c=>({assessmentId:c.assessmentId,state:c.state,warning:c.warning,positiveGroupCount:c.positiveGroups.length,signalCategories:c.activeCodes}))};});
}

export function detectionTaskContext(input,settings,assessmentId){
  const r=detectWarnings(input,settings),c=r.cases.find(c=>c.assessmentId===assessmentId);
  if(!c||!['Watch','Warning candidate','Contested warning candidate'].includes(c.state))throw Error('Prepare a task from a current watch or warning candidate.');
  return {assessmentId,title:`Verify warning signals: ${c.title}`.slice(0,180),scope:`Detection ${r.version}, known by ${r.window.knownBy}, ${r.window.lookbackDays}-day window. ${c.state}. References: ${c.records.filter(r=>r.signals.length).slice(0,10).map(r=>r.recordKey).join(', ')}. Check exact source clauses, publication versus event dates, report independence, corrections and denials. Seek permitted independent confirmation and consult the authorized duty analyst about existing protective-response procedures. Record alternatives and unresolved information. Rule candidates are not confirmed attacks or approved operational decisions.`.slice(0,1500)};
}
