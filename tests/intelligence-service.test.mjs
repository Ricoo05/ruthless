import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createCollectionServer} from '../collection/local-service.mjs';
import {createIntelligenceService} from '../collection/intelligence-service.mjs';
import {openIntelligenceStore} from '../collection/intelligence-store.mjs';
import {SOURCE} from '../collection/govuk-advisory.mjs';

// These are authored protocol fixtures, not real intelligence or historical findings.
const START=Date.parse('2026-10-24T08:00:00.000Z'),HOUR=3600000;
function sourceJSON({paragraph='Authored protocol fixture for standing official guidance.',updatedAt='2026-10-23T08:00:00Z',topic=true}={}){
  return {base_path:'/foreign-travel-advice/india',schema_name:'travel_advice',document_type:'travel_advice',locale:'en',content_id:'authored-service-protocol-fixture',title:'India protocol fixture',public_updated_at:updatedAt,withdrawn_notice:{},details:{parts:[
    {slug:'warnings-and-insurance',title:'Warnings and insurance',body:'<p>Authored public-guidance protocol context.</p>'},
    {slug:'safety-and-security',title:'Safety and security',body:`${topic?`<h2 id="terrorism">Terrorism</h2><p>${paragraph}</p>`:''}<h2 id="crime">Crime</h2><p>Unrelated authored context.</p>`},
    {slug:'regional-risks',title:'Regional risks',body:'<p>Authored regional protocol context.</p>'}
  ]}};
}
const jsonResponse=payload=>new Response(JSON.stringify(payload),{headers:{'Content-Type':'application/json; charset=utf-8'}});

test('service shutdown drains an in-flight collection before its journal may be closed',async()=>{
  const now=()=>new Date(START),store=openIntelligenceStore({file:':memory:',now});
  let begin,release;const started=new Promise(resolve=>{begin=resolve;}),pending=new Promise(resolve=>{release=resolve;});
  const service=createIntelligenceService({store,now,fetchImpl:async()=>{begin();await pending;return jsonResponse(sourceJSON());}});
  try{const running=service.collect({manual:true});await started;let stopped=false;const closing=service.stop().then(()=>{stopped=true;});await Promise.resolve();assert.equal(stopped,false);release();await running;await closing;assert.equal(stopped,true);assert.equal(store.verify().attempts,1);}finally{await service.stop();store.close();}
});

async function harness(t,{responses=[]}={}){
  const temporaryRoot=path.resolve(tmpdir()),directory=await mkdtemp(path.join(temporaryRoot,'ruthless-intelligence-http-')),file=path.join(directory,'journal.sqlite');
  let instant=START;
  const now=()=>new Date(instant),calls=[];
  const store=openIntelligenceStore({file,now});
  const fetchImpl=async(url,options)=>{
    calls.push({url,options});
    const result=responses.length?responses.shift():sourceJSON();
    if(result instanceof Error)throw result;
    return result instanceof Response?result:jsonResponse(typeof result==='function'?result():result);
  };
  const service=createIntelligenceService({store,fetchImpl,now});
  const server=createCollectionServer({directory,now,intelligenceService:service.handle});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const origin=`http://127.0.0.1:${server.address().port}`;
  t.after(async()=>{
    service.stop();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));store.close();
    const resolved=path.resolve(directory);
    if(path.dirname(resolved)!==temporaryRoot||!path.basename(resolved).startsWith('ruthless-intelligence-http-'))throw new Error('Unexpected temporary test cleanup target.');
    await rm(resolved,{recursive:true,force:true});
  });
  async function request(route,body={},headers={},method='POST'){
    const response=await fetch(origin+route,{method,headers:{Origin:origin,'Content-Type':'application/json','X-Ruthless-Request':'official-warning-v1',...headers},...(method==='GET'?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
    const value=await response.json();return {status:response.status,value,headers:response.headers};
  }
  return {origin,file,store,service,calls,request,now,setTime:value=>{instant=value;},advance:value=>{instant+=value;}};
}

async function rawRequest(origin,{route='/api/intelligence/query',headers=[],body='{}',method='POST'}={}){
  const u=new URL(origin);
  return new Promise((resolve,reject)=>{
    const request=http.request({hostname:'127.0.0.1',port:u.port,path:route,method,headers:['Host',u.host,'Origin',origin,'Content-Type','application/json','X-Ruthless-Request','official-warning-v1',...headers]},response=>{
      let raw='';response.setEncoding('utf8');response.on('data',chunk=>raw+=chunk);response.on('end',()=>resolve({status:response.statusCode,value:JSON.parse(raw)}));
    });request.on('error',reject);request.end(body);
  });
}

test('same-origin marker, host, cookie, authorization, duplicate headers and method restrictions protect intelligence routes',async t=>{
  const h=await harness(t);
  const status=await h.request('/api/intelligence/status',{}, {},'GET');assert.equal(status.status,200);assert.equal(status.value.monitoring,false);assert.equal(h.calls.length,0);
  for(const headers of [
    {Origin:'https://foreign.invalid'},{Origin:''},{'X-Ruthless-Request':''},{'X-Ruthless-Request':'collection-review-v1'},
    {'Content-Type':'text/plain'},{'Sec-Fetch-Site':'cross-site'},{Cookie:'session=fixture'},{Authorization:'Bearer fixture'}
  ]){
    const response=await h.request('/api/intelligence/query',{},headers);assert.equal(response.status,403,JSON.stringify(headers));
  }
  assert.equal((await h.request('/api/intelligence/query',{}, {},'GET')).status,403);
  for(const extra of [['Origin',h.origin],['X-Ruthless-Request','official-warning-v1']])assert.equal((await rawRequest(h.origin,{headers:extra})).status,403);
  const foreignHost=await new Promise((resolve,reject)=>{
    const u=new URL(h.origin),request=http.request({hostname:'127.0.0.1',port:u.port,path:'/api/intelligence/query',method:'POST',headers:{Host:'foreign.invalid',Origin:h.origin,'Content-Type':'application/json','X-Ruthless-Request':'official-warning-v1'}},response=>{response.resume();resolve(response.statusCode);});request.on('error',reject);request.end('{}');
  });assert.equal(foreignHost,403);assert.equal(h.calls.length,0);
});

test('request bounds, malformed JSON, unknown fields, custom URLs and path parameters cannot create arbitrary collection',async t=>{
  const h=await harness(t);
  for(const [route,body] of [
    ['/api/intelligence/query',{url:'https://example.org/'}],['/api/intelligence/collect',{endpoint:'https://example.org/'}],
    ['/api/intelligence/collect',{path:'C:/private'}],['/api/intelligence/schedule',{enabled:true,intervalMs:1}],
    ['/api/intelligence/review',{unexpected:'field'}],['/api/intelligence/query','{'],['/api/intelligence/query',[]]
  ])assert.equal((await h.request(route,body)).status,400,route);
  assert.equal((await h.request('/api/intelligence/query',{padding:'x'.repeat(17000)})).status,413);
  for(const route of ['/api/intelligence/query?asOf=2026-10-24','/api/intelligence/collect/https://example.org','/api/intelligence/raw','/api/intelligence/unknown'])assert.equal((await h.request(route)).status,404);
  assert.equal(h.calls.length,0);assert.equal(h.store.attempts().length,0);
});

test('fixed bounded source collection persists raw evidence and source-bound review without exposing raw response',async t=>{
  const h=await harness(t),response=await h.request('/api/intelligence/collect');assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('access-control-allow-origin'),null);
  assert.equal(h.calls.length,1);assert.equal(h.calls[0].url,SOURCE.endpoint);assert.equal(h.calls[0].options.redirect,'error');assert.equal(h.calls[0].options.credentials,'omit');
  const attempt=response.value.attempts[0],candidate=attempt.analysis.candidates[0];
  assert.notEqual(attempt.id,attempt.run.id);assert.equal(attempt.run.status,'collected');assert.equal(attempt.analysis.topicAvailable,true);assert.equal(candidate.kind,'baseline_context');
  assert.equal(attempt.analysis.sourceHash,attempt.run.snapshot.selectedContentSha256);assert.equal(attempt.firstObservedAt,h.now().toISOString());
  assert.equal(response.value.evaluation.metrics,null);assert.equal(response.value.evaluation.sampleSizes.eligibleObservations,1);assert.equal(response.value.evaluation.sampleSizes.baselineContextCandidatesIgnored,1);
  assert.equal(Object.hasOwn(attempt,'rawResponse'),false);assert.equal(Object.hasOwn(attempt.run.snapshot,'rawResponse'),false);
  const raw=h.store.rawResponse(attempt.id);assert.ok(raw.length>0);assert.equal(JSON.parse(raw).content_id,'authored-service-protocol-fixture');
  h.advance(1000);
  const reviewed=await h.request('/api/intelligence/review',{attemptId:attempt.id,candidateId:candidate.id,disposition:'Context only',note:'Reviewed authored standing-guidance fixture.',reviewer:'Authored test reviewer',expectedHead:response.value.head});
  assert.equal(reviewed.status,200);assert.equal(reviewed.value.reviews.length,1);assert.equal(reviewed.value.reviews[0].candidateId,candidate.id);
  const reopened=openIntelligenceStore({file:h.file,now:h.now});
  try{assert.equal(reopened.attempts().length,1);assert.equal(reopened.listReviews().length,1);assert.equal(reopened.verify().ok,true);assert.deepEqual(reopened.rawResponse(attempt.id),raw);}finally{reopened.close();}
});

test('hourly cooldown rejects additional fetches while preserving the latest retained capture',async t=>{
  const h=await harness(t),first=await h.request('/api/intelligence/collect');assert.equal(first.status,200);
  const refused=await h.request('/api/intelligence/collect');assert.equal(refused.status,429);assert.equal(refused.value.error,'intelligence_collection_cooldown');assert.equal(h.calls.length,1);
  const query=await h.request('/api/intelligence/query');assert.equal(query.status,200);assert.equal(query.value.attempts.length,1);assert.equal(query.value.attempts[0].id,first.value.attempts[0].id);assert.deepEqual(query.value.head,first.value.head);
});

test('failed collection and Retry-After retain the prior success with visible gap and persistent cooldown',async t=>{
  const h=await harness(t,{responses:[sourceJSON(),new Response('rate limited',{status:429,headers:{'Retry-After':'7200'}})]});
  const first=await h.request('/api/intelligence/collect');h.advance(HOUR+1);
  const failed=await h.request('/api/intelligence/collect');assert.equal(failed.status,200);assert.equal(h.calls.length,2);
  assert.equal(failed.value.attempts.length,2);assert.equal(failed.value.attempts[0].id,first.value.attempts[0].id);assert.equal(failed.value.attempts[0].run.status,'collected');
  assert.equal(failed.value.attempts[1].run.status,'failed');assert.equal(failed.value.attempts[1].run.reason,'rate_limited');assert.equal(failed.value.attempts[1].run.snapshot,null);
  assert.equal(failed.value.evaluation.sampleSizes.failedCollectionAttempts,1);assert.equal(failed.value.evaluation.metrics,null);assert.equal(failed.value.state.failures,1);
  assert.ok(failed.value.state.nextAt>=h.now().getTime()+2*HOUR);assert.ok(h.store.rawResponse(first.value.attempts[0].id).length>0);
  h.advance(HOUR);assert.equal((await h.request('/api/intelligence/collect')).status,429);assert.equal(h.calls.length,2);
});

test('missing required topic is a coverage failure even when the publisher page retrieval succeeds',async t=>{
  const h=await harness(t,{responses:[sourceJSON({topic:false})]}),response=await h.request('/api/intelligence/collect');assert.equal(response.status,200);
  assert.equal(response.value.attempts[0].run.status,'collected');assert.equal(response.value.attempts[0].analysis.topicAvailable,false);assert.equal(response.value.state.failures,1);
  assert.equal(response.value.evaluation.sampleSizes.topicUnavailableAttempts,1);assert.equal(response.value.evaluation.sampleSizes.eligibleObservations,0);assert.equal(response.value.evaluation.metrics,null);
});

test('monitoring is off until explicitly enabled and disabling it stops due collection',async t=>{
  const h=await harness(t);h.service.start();await h.service.tick();assert.equal(h.store.state().enabled,false);assert.equal(h.calls.length,0);
  const enabled=await h.request('/api/intelligence/schedule',{enabled:true});assert.equal(enabled.status,200);assert.equal(enabled.value.state.enabled,true);
  await h.service.tick();
  for(let i=0;i<100&&h.service.snapshot().busy;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.calls.length,1);assert.equal(h.store.attempts().length,1);assert.equal(h.store.state().enabled,true);
  const disabled=await h.request('/api/intelligence/schedule',{enabled:false});assert.equal(disabled.status,200);assert.equal(disabled.value.state.enabled,false);
  h.advance(2*HOUR);await h.service.tick();assert.equal(h.calls.length,1);
});

test('stale audit head and superseded captures reject review without mutating the journal',async t=>{
  const h=await harness(t,{responses:[sourceJSON(),sourceJSON({paragraph:'Authored revised official-guidance protocol fixture.'})]}),first=await h.request('/api/intelligence/collect'),attempt=first.value.attempts[0],candidateId=attempt.analysis.candidates[0].id;
  const body={attemptId:attempt.id,candidateId,disposition:'Needs verification',note:'Authored protocol change requires analyst verification.',reviewer:'Authored test reviewer'};
  const stale=await h.request('/api/intelligence/review',{...body,expectedHead:{sequence:0,digest:'0'.repeat(64)}});assert.equal(stale.status,409);assert.equal(stale.value.error,'intelligence_review_head_conflict');assert.equal(h.store.listReviews().length,0);assert.deepEqual(h.store.head(),first.value.head);
  h.advance(HOUR+1);const second=await h.request('/api/intelligence/collect');assert.equal(second.status,200);assert.equal(second.value.attempts[1].analysis.candidates[0].kind,'changed_guidance');
  const superseded=await h.request('/api/intelligence/review',{...body,expectedHead:second.value.head});assert.equal(superseded.status,409);assert.equal(superseded.value.error,'intelligence_capture_superseded');assert.equal(h.store.listReviews().length,0);
});

test('asOf replay excludes subsequently collected snapshots and later reviews; future or invalid cutoffs reject',async t=>{
  const h=await harness(t,{responses:[sourceJSON(),sourceJSON({paragraph:'Authored later guidance, unavailable at the earlier observation.'})]}),first=await h.request('/api/intelligence/collect'),attempt=first.value.attempts[0],firstAt=attempt.firstObservedAt;
  h.advance(60000);const reviewed=await h.request('/api/intelligence/review',{attemptId:attempt.id,candidateId:attempt.analysis.candidates[0].id,disposition:'Context only',note:'Authored interval review after the first capture.',reviewer:'Authored test reviewer',expectedHead:first.value.head});assert.equal(reviewed.status,200);
  const reviewAt=reviewed.value.reviews[0].at;
  h.advance(HOUR);const second=await h.request('/api/intelligence/collect');assert.equal(second.status,200);assert.equal(second.value.attempts.length,2);
  const replay=await h.request('/api/intelligence/query',{asOf:firstAt});assert.equal(replay.status,200);assert.deepEqual(replay.value.attempts.map(a=>a.id),[attempt.id]);assert.equal(replay.value.reviews.length,0);assert.equal(replay.value.evaluation.observations.length,1);
  const afterReview=await h.request('/api/intelligence/query',{asOf:reviewAt});assert.equal(afterReview.value.attempts.length,1);assert.equal(afterReview.value.reviews.length,1);
  const before=await h.request('/api/intelligence/query',{asOf:new Date(START-1).toISOString()});assert.equal(before.status,200);assert.equal(before.value.attempts.length,0);assert.equal(before.value.reviews.length,0);
  for(const asOf of [new Date(h.now().getTime()+1).toISOString(),'not-a-date','2026-02-30T00:00:00Z'])assert.equal((await h.request('/api/intelligence/query',{asOf})).status,400);
});
