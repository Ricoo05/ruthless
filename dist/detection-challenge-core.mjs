import {extractSecuritySignals,SIGNAL_RULES,DETECTION_VERSION} from './detection-core.mjs';
const polarities=['Reported claim','Unverified report','Denied / withdrawn','Context only'];
const canon=hits=>JSON.stringify(hits.map(({code,polarity})=>({code,polarity})).sort((a,b)=>a.code.localeCompare(b.code)||a.polarity.localeCompare(b.polarity)));
export function evaluateDetectionChallenges(data){
  if(data?.kind!=='authored_detection_challenges'||data.version!==1||data.baselineVersion!=='report-signals-1'||!Array.isArray(data.cases)||!data.cases.length||data.cases.length>32||!/^[a-f0-9]{40}$/.test(data.baselineCommit)||!/^[a-f0-9]{64}$/.test(data.baselineSourceSha256))throw Error('Invalid bounded detector challenge file.');
  const ids=new Set(),results=data.cases.map(c=>{
    if(c?.synthetic!==true||typeof c.id!=='string'||!/^[a-z0-9-]{1,60}$/.test(c.id)||ids.has(c.id)||typeof c.text!=='string'||!c.text.trim()||c.text.length>4000||typeof c.title!=='string'||c.title.length>200||typeof c.rationale!=='string'||c.rationale.length>500)throw Error('Invalid fictional challenge case.');ids.add(c.id);
    for(const hits of [c.expected,c.baseline])if(!Array.isArray(hits)||hits.length>80||hits.some(h=>!SIGNAL_RULES.some(r=>r.code===h.code)||!polarities.includes(h.polarity)))throw Error('Invalid retained challenge labels.');
    const actual=extractSecuritySignals(c.text,{title:c.title}).signals;
    return {id:c.id,text:c.text,title:c.title,rationale:c.rationale,expected:c.expected,baseline:c.baseline,actual,baselinePass:canon(c.expected)===canon(c.baseline),pass:canon(c.expected)===canon(actual)};
  });
  return {version:DETECTION_VERSION,baselineVersion:data.baselineVersion,total:results.length,baselinePassed:results.filter(r=>r.baselinePass).length,passed:results.filter(r=>r.pass).length,results,limitation:'Visible authored development checks designed around inspected failures. These do not establish independent model accuracy or attack prediction.'};
}
