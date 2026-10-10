import {fetchPublicSource,publicURL,NEWS_SCOPES,TOPICS} from './osint-core.mjs';
import {stageDocument} from './threat-core.mjs';

export const FEEDS=Object.freeze({
  gdelt:{label:'Global security news',publisher:'GDELT news index',minutes:15,scope:'20 indexed headlines · past 7 days · selected text scope; not verified incident locations'},
  govuk:{label:'India official advisory',publisher:'UK FCDO',minutes:60,scope:'India · up to 3 advisory sections · one publisher'},
  cisa:{label:'Exploited cyber vulnerabilities',publisher:'CISA · official GitHub mirror',minutes:60,url:'https://raw.githubusercontent.com/cisagov/kev-data/develop/known_exploited_vulnerabilities.json',scope:'Latest 200 KEV entries · catalog inclusion is not evidence that your systems are affected'},
  usgs:{label:'Global seismic events',publisher:'USGS',minutes:5,url:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson',scope:'Reported M4.5+ earthquakes · past day · observations, not forecasts'},
  eonet:{label:'Global natural events',publisher:'NASA EONET',minutes:15,url:'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&days=7&limit=100',scope:'Up to 100 open natural events in a 7-day query · source dates may predate this window'}
});
export function watchKey(id,scope='world',topic='security') {if(!Object.hasOwn(FEEDS,id)||!Object.hasOwn(NEWS_SCOPES,scope)||!Object.hasOwn(TOPICS,topic))throw new Error('Unknown watch selection.');return id==='gdelt'?`${id}:${scope}:${topic}`:id;}
const validText=(v,n=500)=>typeof v==='string'&&v.trim().length>0&&v.length<=n;
const iso=(v,at)=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&Date.parse(v)<=Date.parse(at)&&/^\d{4}-\d\d-\d\dT/.test(v);
const day=(v,at)=>typeof v==='string'&&/^\d{4}-\d\d-\d\d$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v&&v<=at.slice(0,10);
const fail=s=>{throw new Error(s);};
export async function sha256(value){const bytes=typeof value==='string'?new TextEncoder().encode(value):value;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');}
function safeSourceURL(value,host){const u=publicURL(value);return u&&new URL(u).hostname===host?u:null;}
export function parseWatchFeed(id,payload,checkedAt){
  if(!Object.hasOwn(FEEDS,id)||!iso(checkedAt,checkedAt)||!payload||typeof payload!=='object')fail('Invalid feed response.');
  let events=[],omitted=0,publisherUpdatedAt=null,total=0;
  if(id==='usgs'){
    if(payload.type!=='FeatureCollection'||!Array.isArray(payload.features)||payload.features.length>3000||!Number.isFinite(payload.metadata?.generated))fail('Invalid USGS feed.');
    publisherUpdatedAt=new Date(payload.metadata.generated).toISOString();if(!iso(publisherUpdatedAt,checkedAt))fail('USGS feed has a future generation time.');
    total=payload.features.length;
    for(const f of payload.features){const p=f?.properties,u=safeSourceURL(p?.url,'earthquake.usgs.gov');
      if(!validText(f?.id,120)||!validText(p?.title)||!u||!Number.isFinite(p.time)||!Number.isFinite(p.updated)||!Number.isFinite(p.mag)||p.mag<4.5||p.type!=='earthquake'||p.time>Date.parse(checkedAt)||p.updated>Date.parse(checkedAt)||p.time<Date.parse(checkedAt)-2*86400000){omitted++;continue;}
      events.push({id:f.id,title:p.title,url:u,category:'Seismic event',sourceTime:new Date(p.time).toISOString(),timeMeaning:'Reported event time',updatedAt:new Date(p.updated).toISOString(),excerpt:`${p.title}. Magnitude ${p.mag}. USGS review status: ${p.status==='reviewed'?'reviewed':'automatic or unspecified'}.`,publisher:FEEDS[id].publisher});
    }
  }else if(id==='cisa'){
    if(!Array.isArray(payload.vulnerabilities)||payload.vulnerabilities.length>10000||payload.count!==payload.vulnerabilities.length||!iso(payload.dateReleased,checkedAt))fail('Invalid CISA catalog.');
    publisherUpdatedAt=payload.dateReleased;total=payload.count;
    for(const v of payload.vulnerabilities){if(!/^CVE-\d{4}-\d{4,10}$/.test(v?.cveID??'')||!day(v.dateAdded,checkedAt)||!validText(v.vulnerabilityName)||!validText(v.shortDescription,6000)||!validText(v.requiredAction,6000)){omitted++;continue;}
      events.push({id:v.cveID,title:`${v.cveID} · ${v.vulnerabilityName.trim()}`,url:`https://www.cisa.gov/known-exploited-vulnerabilities-catalog?search_api_fulltext=${v.cveID}`,category:'Cyber vulnerability',sourceTime:`${v.dateAdded}T00:00:00Z`,timeMeaning:'Date added to catalog (day precision; not exploitation date)',updatedAt:publisherUpdatedAt,excerpt:`${v.shortDescription}\nRequired action (CISA): ${v.requiredAction}`,publisher:FEEDS[id].publisher});
    }
  }else if(id==='eonet'){
    if(!Array.isArray(payload.events)||payload.events.length>1000)fail('Invalid EONET feed.');total=payload.events.length;
    for(const e of payload.events){const url=safeSourceURL(e?.link,'eonet.gsfc.nasa.gov'),geometry=Array.isArray(e?.geometry)?e.geometry.filter(g=>iso(g?.date,checkedAt)).sort((a,b)=>b.date.localeCompare(a.date)):[];
      if(!validText(e?.id,120)||!validText(e.title)||!url||!geometry.length||e.closed!==null){omitted++;continue;}
      const categories=Array.isArray(e.categories)?e.categories.filter(c=>validText(c?.title,80)).map(c=>c.title).join(', '):'Natural event';
      events.push({id:e.id,title:e.title,url,category:categories||'Natural event',sourceTime:geometry[0].date,timeMeaning:'Latest reported event geometry date; may have day precision',updatedAt:null,excerpt:`${e.title}. NASA event categories: ${categories}. Listed as open by EONET at retrieval. Open status is not a real-time safety assessment.`,publisher:FEEDS[id].publisher});
    }
  }else fail('Use the advisory/news adapter for this feed.');
  const seen=new Set();events=events.sort((a,b)=>b.sourceTime.localeCompare(a.sourceTime)||a.id.localeCompare(b.id)).filter(e=>{if(seen.has(e.id)){omitted++;return false;}seen.add(e.id);return true;});
  omitted+=Math.max(0,events.length-200);events=events.slice(0,200).map(e=>({...e,feed:id}));
  return {events,omitted,total,publisherUpdatedAt};
}
async function requestJSON(id,{signal,fetchImpl}){
  const url=FEEDS[id].url;let reader;
  try{
    const response=await fetchImpl(url,{method:'GET',mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000),headers:{Accept:'application/json'}});
    if(!response.ok){const error=new Error(`Source returned HTTP ${response.status}. Earlier results are retained.`);const retry=response.headers.get('retry-after');error.retryAfterMs=/^\d+$/.test(retry??'')?Math.min(86400000,Number(retry)*1000):0;throw error;}
    if(response.url&&response.url!==url)fail('Unexpected source destination.');
    const type=(response.headers.get('content-type')??'').split(';')[0].trim().toLowerCase();
    // Official mirror serves JSON as text; EONET currently labels its JSON RSS.
    if(!['application/json',...(id==='cisa'?['text/plain']:[]),...(id==='eonet'?['application/rss+xml']:[])].includes(type))fail('Unexpected source content type.');
    if(Number(response.headers.get('content-length'))>4000000)fail('Feed exceeds 4 MB.');
    reader=response.body?.getReader();if(!reader)fail('Source returned no body.');let bytes=0,raw='';const decoder=new TextDecoder('utf-8',{fatal:true});
    while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>4000000)fail('Feed exceeds 4 MB.');raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();
    return {payload:JSON.parse(raw),digest:await sha256(raw),bytes};
  }finally{if(reader){try{await reader.cancel();}catch{}reader.releaseLock();}}
}
export async function fetchWatchFeed(id,{scope='world',topic='security',extractText,signal,fetchImpl=globalThis.fetch,now=()=>new Date()}={}){
  const key=watchKey(id,scope,topic);let data,digest,hashBasis,requestURL,checkedAt;
  if(id==='gdelt'||id==='govuk'){
    const capture=await fetchPublicSource({provider:id,country:id==='govuk'?'india':scope,topic,extractText,signal,fetchImpl,now});checkedAt=capture.checkedAt;requestURL=capture.requestURL;digest=await sha256(JSON.stringify(capture));hashBasis='Normalized capture JSON, including retrieval timestamp';
    const events=id==='govuk'?capture.sections.map(s=>({id:s.slug,title:`India advisory · ${s.title}`,url:s.sourceURL,category:'Official advisory',sourceTime:capture.publisherUpdatedAt,timeMeaning:'Advisory update time; not incident time',updatedAt:capture.publisherUpdatedAt,excerpt:s.originalText.slice(0,3000),publisher:capture.publisher,feed:id})):capture.articles.map(a=>({id:a.url.replace(/#.*$/,''),title:a.title,url:a.url,category:TOPICS[topic].label,sourceTime:a.firstSeenAt,timeMeaning:'Index first-seen time; not publication or event time',updatedAt:null,excerpt:a.title,publisher:a.publisherDomain,feed:id}));
    data={events,total:events.length,omitted:capture.omitted??0,publisherUpdatedAt:capture.publisherUpdatedAt??null};
  }else{const r=await requestJSON(id,{signal,fetchImpl});checkedAt=now().toISOString();data=parseWatchFeed(id,r.payload,checkedAt);digest=r.digest;hashBasis='UTF-8 source response body';requestURL=FEEDS[id].url;}
  return {format:'ruthless-watch-capture',version:1,synthetic:false,key,feed:id,checkedAt,requestURL,digest,hashBasis,...data};
}
export function compareCaptures(previous,current){
  if(previous&&previous.key!==current.key)throw new Error('Cannot compare different source queries.');
  const before=new Map(previous?.events.map(e=>[e.id,e])??[]),after=new Set(current.events.map(e=>e.id));
  const comparable=e=>{const {updatedAt,...fields}=e;return JSON.stringify(fields);};
  return {baseline:!previous,added:current.events.filter(e=>!before.has(e.id)).map(e=>e.id),changed:current.events.filter(e=>before.has(e.id)&&comparable(before.get(e.id))!==comparable(e)).map(e=>e.id),absent:[...before.keys()].filter(id=>!after.has(id))};
}
export function restoreWatchCaptures(raw){
  if(typeof raw!=='string'||raw.length>2000000)throw new Error('Watch cache exceeds the recovery limit.');
  const parsed=JSON.parse(raw);if(parsed?.version!==1||!Array.isArray(parsed.captures)||parsed.captures.length>24)throw new Error('Invalid watch cache.');
  for(const c of parsed.captures){
    if(c?.format!=='ruthless-watch-capture'||c.synthetic!==false||!Object.hasOwn(FEEDS,c.feed)||!validText(c.key,150)||!iso(c.checkedAt,c.checkedAt)||!publicURL(c.requestURL)||!/^[a-f0-9]{64}$/.test(c.digest??'')||!validText(c.hashBasis,200)||!Array.isArray(c.events)||c.events.length>200||!Number.isInteger(c.total)||c.total<0||!Number.isInteger(c.omitted)||c.omitted<0)throw new Error('Invalid retained capture.');
    const [feed,scope,topic]=c.key.split(':');if(c.key!==watchKey(feed,scope??'world',topic??'security')||feed!==c.feed)throw new Error('Invalid retained query.');
    for(const e of c.events)if(!validText(e?.id,2000)||!validText(e.title,1000)||!publicURL(e.url)||!validText(e.category,500)||!iso(e.sourceTime,c.checkedAt)||!validText(e.timeMeaning,300)||!validText(e.excerpt,15000)||!validText(e.publisher,500)||e.feed!==c.feed)throw new Error('Invalid retained record.');
  }return parsed.captures.map(c=>({...c,restored:true}));
}
export function nextAttemptAt(id,now,failures=0,retryAfterMs=0){return now+Math.max(FEEDS[id].minutes*60000,Math.min(3600000,FEEDS[id].minutes*60000*2**Math.min(failures,6)),retryAfterMs);}
export function makeWatchStore(){
  const states=new Map(),audit=[];
  const record=r=>{audit.push(r);if(audit.length>200)audit.shift();};
  return {states,audit,
    nextAt(id){return Math.max(0,...[...states.entries()].filter(([key])=>key.split(':')[0]===id).map(([,s])=>s.nextAt??0));},
    restore(capture){const at=Date.parse(capture.checkedAt);states.set(capture.key,{capture:{...capture,restored:true},delta:compareCaptures(null,capture),error:null,failures:0,nextAt:nextAttemptAt(capture.feed,at)});},
    success(capture,at=Date.now()){const old=states.get(capture.key);const state={capture,delta:compareCaptures(old?.capture,capture),error:null,failures:0,attemptedAt:capture.checkedAt,nextAt:nextAttemptAt(capture.feed,at)};states.set(capture.key,state);record({key:capture.key,status:'received',at:capture.checkedAt,digest:capture.digest,count:capture.events.length});return state;},
    failure(key,id,error,at=Date.now()){const old=states.get(key),failures=(old?.failures??0)+1;const state={...old,error:String(error.message??error).slice(0,500),failures,attemptedAt:new Date(at).toISOString(),nextAt:nextAttemptAt(id,at,failures,error.retryAfterMs??0)};states.set(key,state);record({key,status:'failed',at:state.attemptedAt,error:state.error});return state;}
  };
}
export function stageWatchEvent(workspace,capture,eventId,{assessmentId,id,at,acknowledged}){
  if(capture?.format!=='ruthless-watch-capture'||capture.synthetic!==false||!Object.hasOwn(FEEDS,capture.feed)||!/^[a-f0-9]{64}$/.test(capture.digest??''))fail('Choose a collected source record.');
  const e=capture.events.find(e=>e.id===eventId);if(!e||!publicURL(e.url)||!iso(e.sourceTime,capture.checkedAt)||at<capture.checkedAt.slice(0,10))fail('Invalid source record.');
  if(!acknowledged)fail('Review the source and its time meaning before staging.');
  return stageDocument(workspace,{id,assessmentId,title:e.title.slice(0,200),publisher:e.publisher.slice(0,150),originGroup:`watch-${capture.feed}-${new URL(e.url).hostname}`.slice(0,100),url:e.url,reportedAt:e.sourceTime.slice(0,10),recordedAt:at,language:capture.feed==='gdelt'?'Unknown':'English',locator:e.id.slice(0,200),accessNote:`${e.timeMeaning}. Retrieved ${capture.checkedAt}. SHA-256 ${capture.digest} (${capture.hashBasis}). ${capture.feed==='gdelt'?'Headline metadata only; article not read.':capture.feed==='govuk'?'Contains public sector information under Open Government Licence v3.0.':'Normalized publisher metadata, not a verbatim report; analyst reviewed reuse and relevance.'} Not independently verified.`,excerpt:e.excerpt.slice(0,4000),synthetic:false},at);
}
