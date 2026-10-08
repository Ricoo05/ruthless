import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceRequest,parsePublicSource,fetchPublicSource,publicURL,researchWorkspace,stagePublicPassage} from '../dist/osint-core.mjs';
import {exportPublicSource} from '../dist/osint-export.mjs';
const checkedAt='2026-10-09T08:00:00Z';
const advisory=()=>({base_path:'/foreign-travel-advice/india',schema_name:'travel_advice',document_type:'travel_advice',locale:'en',title:'India travel advice',public_updated_at:'2026-10-01T12:00:00Z',details:{parts:[{slug:'warnings-and-insurance',title:'Warnings and insurance',body:'Official source passage for a parser test.'}]}});
const options={provider:'govuk',country:'india',checkedAt,extractText:s=>s};
test('requests accept only configured countries, topics and providers',()=>{
  assert.equal(sourceRequest({provider:'govuk',country:'india'}),'https://www.gov.uk/api/content/foreign-travel-advice/india');
  const u=new URL(sourceRequest({provider:'gdelt',country:'india',topic:'safety'}));assert.equal(u.hostname,'api.gdeltproject.org');assert.equal(u.searchParams.get('maxrecords'),'20');assert.equal(u.searchParams.get('timespan'),'7d');
  for(const input of [{provider:'govuk',country:'../../private'},{provider:'gdelt',country:'india',topic:'person-name'},{provider:'__proto__',country:'india'},{provider:'govuk',country:'constructor'}])assert.throws(()=>sourceRequest(input));
});
test('link validation rejects embedded credentials, local hosts, literal IPs and active schemes',()=>{
  for(const url of ['http://example.com','javascript:alert(1)','https://name:pass@example.com','https://localhost/a','https://127.0.0.1/a','https://[::1]/','https://source.local/x','https://example.com:8443'])assert.equal(publicURL(url),null);
  assert.equal(publicURL('https://www.bbc.com/news/example'),'https://www.bbc.com/news/example');
});
test('advisory provenance, withdrawal, sections and future updates are validated',()=>{
  const out=parsePublicSource(advisory(),options);assert.equal(out.synthetic,false);assert.equal(out.sections.length,1);assert.equal(out.publisherUpdatedAt,'2026-10-01T12:00:00Z');
  for(const patch of [{base_path:'/foreign-travel-advice/nepal'},{public_updated_at:'2026-10-10T00:00:00Z'},{withdrawn_notice:{explanation:'withdrawn'}},{details:{parts:[]}}])assert.throws(()=>parsePublicSource({...advisory(),...patch},options));
  const a=advisory();a.details.parts.push(a.details.parts[0]);assert.throws(()=>parsePublicSource(a,options),/duplicate/);
});
test('news results retain first-seen semantics, deduplicate URLs and omit bad dates and unsafe links',()=>{
  const a={title:'Public advisory',url:'https://news.example.com/story?utm_source=one',seendate:'20261008T120000Z',language:'English'};
  const out=parsePublicSource({articles:[a,{...a,url:'https://news.example.com/story?utm_source=two'},{...a,url:'https://127.0.0.1'},{...a,url:'https://news.example.com/future',seendate:'20261010T120000Z'}]},{provider:'gdelt',country:'india',topic:'safety',checkedAt});
  assert.equal(out.articles.length,1);assert.equal(out.omitted,3);assert.equal(out.articles[0].firstSeenAt,'2026-10-08T12:00:00Z');assert.equal('publishedAt' in out.articles[0],false);assert.equal('socialimage' in out.articles[0],false);
  assert.equal(parsePublicSource({articles:[]},{provider:'gdelt',country:'india',checkedAt}).articles.length,0);
});
test('fetch omits credentials and workspace data, bounds input and reports API failures',async()=>{
  let call;const result=await fetchPublicSource({...options,now:()=>new Date(checkedAt),fetchImpl:async(url,opts)=>{call={url,opts};return new Response(JSON.stringify(advisory()),{headers:{'content-type':'application/json'}});}});
  assert.equal(result.synthetic,false);assert.equal(call.opts.credentials,'omit');assert.equal(call.opts.redirect,'error');assert.equal(call.opts.method,'GET');assert.equal(call.opts.body,undefined);
  for(const [response,pattern] of [[new Response('limited',{status:429}),/rate-limiting/],[new Response('<html/>',{headers:{'content-type':'text/html'}}),/JSON/],[new Response('{}',{headers:{'content-type':'application/json','content-length':'2000001'}}),/2 MB/],[new Response('{broken',{headers:{'content-type':'application/json'}}),/invalid JSON/]])await assert.rejects(fetchPublicSource({...options,fetchImpl:async()=>response}),pattern);
  await assert.rejects(fetchPublicSource({...options,fetchImpl:async()=>{throw new TypeError('fetch failed');}}),/Source unavailable/);
});
test('streamed responses over the cap are rejected without a content-length header',async()=>{
  const response=new Response(new Uint8Array(2_000_001),{headers:{'content-type':'application/json'}});
  await assert.rejects(fetchPublicSource({...options,fetchImpl:async()=>response}),/2 MB/);
});
test('new research workspace has no fictional reports; exact public passages retain provenance',()=>{
  const w=researchWorkspace('2026-10-09'),snapshot=parsePublicSource(advisory(),options),input={slug:'warnings-and-insurance',excerpt:'Official source passage',assessmentId:w.assessments[0].id,id:'real-source-1',at:'2026-10-09',acknowledged:true};
  assert.equal(w.documents.length,0);assert.equal(w.evidence.length,0);
  const next=stagePublicPassage(w,snapshot,input);assert.equal(next.documents[0].synthetic,false);assert.equal(next.documents[0].reportedAt,'2026-10-01');assert.match(next.documents[0].accessNote,/2026-10-09T08:00:00Z/);assert.equal(w.documents.length,0);assert.equal(next.evidence.length,0);
  assert.throws(()=>stagePublicPassage(w,snapshot,{...input,excerpt:'Invented claim'}),/exact passage/);
  assert.throws(()=>stagePublicPassage(w,snapshot,{...input,acknowledged:false}),/Review the source/);
  assert.throws(()=>stagePublicPassage(next,snapshot,{...input,id:'duplicate'}),/already in/);
});
test('caller cancellation aborts an in-flight request without producing a capture',async()=>{
  const controller=new AbortController();let received;
  const task=fetchPublicSource({...options,signal:controller.signal,fetchImpl:async(url,{signal})=>{received=signal;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));}});
  controller.abort();await assert.rejects(task,/Request cancelled/);assert.equal(received.aborted,true);
});
test('exports preserve provenance, escape source markup and prevent CSV formula interpretation',()=>{
  const snapshot=parsePublicSource(advisory(),options);snapshot.sections[0].title='=1+1';snapshot.sections[0].originalText='<script>alert(1)</script>';
  const csv=exportPublicSource(snapshot,'csv');assert.match(csv.text,/'=1\+1/);assert.match(csv.text,/Advisory updated/);
  const html=exportPublicSource(snapshot,'html');assert.equal(html.text.includes('<script>'),false);assert.match(html.text,/&lt;script&gt;/);assert.match(html.text,/default-src 'none'/);
  assert.equal(JSON.parse(exportPublicSource(snapshot,'json').text).synthetic,false);
  assert.throws(()=>exportPublicSource(snapshot,'exe'),/Unsupported/);
});
