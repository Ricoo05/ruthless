import {validateWorkspace, stageDocument} from './threat-core.mjs';

export const COUNTRIES = Object.freeze({india:'India', pakistan:'Pakistan', bangladesh:'Bangladesh', nepal:'Nepal', 'sri-lanka':'Sri Lanka', 'united-arab-emirates':'United Arab Emirates'});
export const NEWS_SCOPES = Object.freeze({world:'Worldwide',...COUNTRIES,'united-states':'United States','united-kingdom':'United Kingdom',france:'France',germany:'Germany',australia:'Australia',japan:'Japan',indonesia:'Indonesia',singapore:'Singapore','south-africa':'South Africa',brazil:'Brazil',ukraine:'Ukraine',israel:'Israel'});
export const TOPICS = Object.freeze({safety:{label:'Public safety advisories',query:'("public safety" OR "travel advisory" OR "security advisory")'},security:{label:'Reported security incidents',query:'("security incident" OR "terrorist attack" OR "terrorism warning" OR "bomb threat")'},disaster:{label:'Disaster and emergency response',query:'(flood OR earthquake OR "emergency response")'},cyber:{label:'Cybersecurity advisories',query:'(cybersecurity OR "cyber incident" OR "security vulnerability")'}});
export const OGL='https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/';
const LIMIT=2_000_000;
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const fail=message=>{throw new Error(message);};
const own=(obj,key)=>Object.hasOwn(obj,key);
function timestamp(v){return typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v.slice(0,10)).toISOString().slice(0,10)===v.slice(0,10);}
export function publicURL(value){
  if(!text(value,2000))return null;
  try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname.includes('.')||!/[a-z]$/i.test(u.hostname)||/(?:^|\.)(localhost|local|internal|test|invalid)$/i.test(u.hostname))return null;return u.href;}catch{return null;}
}
export function sourceRequest({provider,country,topic='safety'}){
  if(!own(provider==='gdelt'?NEWS_SCOPES:COUNTRIES,country)||!own(TOPICS,topic))fail('Choose a configured country and topic.');
  if(provider==='govuk')return `https://www.gov.uk/api/content/foreign-travel-advice/${country}`;
  if(provider!=='gdelt')fail('Unknown public source.');
  const url=new URL('https://api.gdeltproject.org/api/v2/doc/doc');
  url.search=new URLSearchParams({query:`${country==='world'?'':`"${NEWS_SCOPES[country]}" `}${TOPICS[topic].query}`,mode:'artlist',format:'json',maxrecords:'20',timespan:'7d',sort:'datedesc'}).toString();
  return url.href;
}
export function parsePublicSource(payload,{provider,country,topic='safety',checkedAt,extractText}){
  const requestURL=sourceRequest({provider,country,topic});
  if(!timestamp(checkedAt)||!payload||typeof payload!=='object'||Array.isArray(payload))fail('Invalid source response.');
  const base={format:'ruthless-public-source',version:1,synthetic:false,provider,country,topic:provider==='govuk'?null:topic,checkedAt,requestURL};
  if(provider==='govuk'){
    const path=`/foreign-travel-advice/${country}`;
    if(payload.base_path!==path||payload.schema_name!=='travel_advice'||payload.document_type!=='travel_advice'||payload.locale!=='en'||!text(payload.title,300)||!timestamp(payload.public_updated_at)||Date.parse(payload.public_updated_at)>Date.parse(checkedAt)||!Array.isArray(payload.details?.parts)||payload.details.parts.length>50||typeof extractText!=='function')fail('The advisory response does not match the configured source.');
    if(payload.withdrawn_notice!=null&&Object.keys(payload.withdrawn_notice).length)fail('The publisher has withdrawn this advisory.');
    const sections=[];
    for(const slug of ['warnings-and-insurance','safety-and-security','regional-risks']){
      const parts=payload.details.parts.filter(p=>p?.slug===slug);
      if(parts.length>1)fail('The advisory contains duplicate sections.');
      if(!parts.length)continue;
      const part=parts[0];if(!text(part.title,300)||!text(part.body,LIMIT))fail('Invalid advisory section.');
      const originalText=extractText(part.body);if(!text(originalText,200000))fail('Advisory section text is missing or too large.');
      sections.push({slug,title:part.title,sourceURL:`https://www.gov.uk${path}/${slug}`,originalText});
    }
    if(!sections.length)fail('No supported advisory sections are available.');
    return {...base,title:payload.title,publisher:'Foreign, Commonwealth & Development Office (UK)',publisherUpdatedAt:payload.public_updated_at,sourceURL:`https://www.gov.uk${path}`,licenceURL:OGL,sections};
  }
  if(!Array.isArray(payload.articles)||payload.articles.length>250)fail('The news index returned an invalid article list.');
  const articles=[],seen=new Set();let omitted=0;
  for(const a of payload.articles){
    const url=publicURL(a?.url),date=a?.seendate;
    const iso=typeof date==='string'&&/^\d{8}T\d{6}Z$/.test(date)?`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T${date.slice(9,11)}:${date.slice(11,13)}:${date.slice(13,15)}Z`:'';
    if(!url||!text(a.title,500)||!timestamp(iso)||Date.parse(iso)>Date.parse(checkedAt)||Date.parse(iso)<Date.parse(checkedAt)-8*86400000){omitted++;continue;}
    const key=new URL(url);key.hash='';for(const p of [...key.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(p))key.searchParams.delete(p);
    if(seen.has(key.href)||articles.length===20){omitted++;continue;}seen.add(key.href);
    articles.push({title:a.title.trim(),url,publisherDomain:new URL(url).hostname,firstSeenAt:iso,language:text(a.language,80)?a.language:'Unknown'});
  }
  articles.sort((a,b)=>b.firstSeenAt.localeCompare(a.firstSeenAt));
  return {...base,publisher:'GDELT news index',articles,omitted,scope:'Up to 20 indexed links matching the selected country and topic in the last seven days. First-seen time is not publication or event time.'};
}
export async function fetchPublicSource({provider,country,topic='safety',extractText,fetchImpl=globalThis.fetch,now=()=>new Date(),signal}){
  const url=sourceRequest({provider,country,topic});let reader;
  try{
    const r=await fetchImpl(url,{method:'GET',mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000),headers:{Accept:'application/json'}});
    if(r.status===429)fail('The publisher is rate-limiting requests. Wait before retrying; no replacement data was generated.');
    if(!r.ok)fail(`Public source returned HTTP ${r.status}. No data was substituted.`);
    if(r.url&&r.url!==url)fail('The source returned an unexpected destination.');
    if(!/^application\/json(?:\s*;|$)/i.test(r.headers.get('content-type')??''))fail('The source did not return JSON.');
    const size=r.headers.get('content-length');if(size!==null&&(!/^\d+$/.test(size)||Number(size)>LIMIT))fail('Source response exceeds the 2 MB limit.');
    reader=r.body?.getReader();if(!reader)fail('The source returned no body.');
    const decoder=new TextDecoder('utf-8',{fatal:true});let raw='',bytes=0;
    while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>LIMIT)fail('Source response exceeds the 2 MB limit.');raw+=decoder.decode(value,{stream:true});}
    raw+=decoder.decode();let payload;try{payload=JSON.parse(raw);}catch{fail('The source returned invalid JSON.');}
    return parsePublicSource(payload,{provider,country,topic,checkedAt:now().toISOString(),extractText});
  }catch(error){if(signal?.aborted)fail('Request cancelled. Any earlier capture is retained.');if(error instanceof TypeError||error?.name==='TimeoutError'||error?.name==='AbortError')fail('Source unavailable: network, browser access policy, or timeout. No replacement data was generated.');throw error;}
  finally{if(reader){try{await reader.cancel();}catch{}reader.releaseLock();}}
}
export function researchWorkspace(at){
  return validateWorkspace({format:'ruthless-threat-workspace',version:8,assessments:[{id:'public-safety-research',title:'Public safety source review',area:'India',scope:'Domestic',asOf:at,question:'What do the collected public sources establish, and what remains unverified?',judgment:'',gaps:'',confidence:'Insufficient',priority:'Routine',status:'Draft',reviewNote:'',citedEvidence:[]}],evidence:[],documents:[],tasks:[],proposalRuns:[],importBatches:[],analysisRuns:[],linkReviews:[],history:[]});
}
export function stagePublicPassage(workspace,snapshot,{slug,excerpt,assessmentId,id,at,acknowledged}){
  if(snapshot?.provider!=='govuk'||snapshot.synthetic!==false||!own(COUNTRIES,snapshot.country))fail('Choose a collected official advisory.');
  const section=snapshot.sections.find(s=>s.slug===slug),quote=String(excerpt??'').trim();
  if(!section||!quote||quote.length>4000||!section.originalText.includes(quote))fail('Use an exact passage of 1–4,000 characters from the displayed section.');
  if(acknowledged!==true)fail('Review the source and licence before retaining the passage.');
  if(!timestamp(snapshot.checkedAt)||!timestamp(snapshot.publisherUpdatedAt)||at<snapshot.checkedAt.slice(0,10))fail('Invalid capture or intake date.');
  return stageDocument(workspace,{id,assessmentId,title:`${COUNTRIES[snapshot.country]} advisory: ${section.title}`.slice(0,200),publisher:snapshot.publisher,originGroup:`govuk-fcdo-${snapshot.country}`,url:section.sourceURL,reportedAt:snapshot.publisherUpdatedAt.slice(0,10),recordedAt:at,language:'English',locator:section.title.slice(0,200),accessNote:`Contains public sector information licensed under the Open Government Licence v3.0 (${OGL}). Fetched ${snapshot.checkedAt}. Advisory update date is not an incident date. Analyst reviewed reuse conditions.`,excerpt:quote,synthetic:false},at);
}
