import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {aiService} from '../scripts/ai-service.mjs';
import {exportedInputs} from '../dist/evaluation-fixtures.mjs';
const caseId=exportedInputs('development').cases[0].id;
async function serverTest(config,check){let origin;const handler=aiService(config),server=http.createServer(async(req,res)=>{if(!await handler(req,res,origin)){res.writeHead(404);res.end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin=`http://127.0.0.1:${server.address().port}`;const post=(body={split:'development',caseId,allowApi:true},headers={})=>fetch(origin+'/api/ai/analyze',{method:'POST',headers:{'Content-Type':'application/json','X-Ruthless-Request':'ai-console-v1',Origin:origin,...headers},body:JSON.stringify(body)});try{await check({origin,post});}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}}
const configured={enabled:true,apiKey:'test-key-not-real',model:'test-model',mock:true};
test('local AI service is disabled by default and exposes no key or executable model',async()=>{
  await serverTest({},async({origin,post})=>{const status=await(await fetch(origin+'/api/ai/status')).json();assert.equal(status.enabled,false);assert.equal(status.model,'');assert.equal(status.remaining,0);assert.equal((await post()).status,503);});assert.throws(()=>aiService({enabled:true,model:'test-model'}),/configured key/);assert.throws(()=>aiService({...configured,maxRequests:7}),/budget/);
});
test('same-origin JSON header and host checks block cross-site or rebound execution before any call',async()=>{
  let calls=0;await serverTest({...configured,run:async()=>{calls++;return {}; }},async({post,origin})=>{for(const headers of [{Origin:'https://example.org'},{'X-Ruthless-Request':''},{'Content-Type':'text/plain'}])assert.equal((await post(undefined,headers)).status,403);const rebound=await new Promise((resolve,reject)=>{const req=http.request(origin+'/api/ai/analyze',{method:'POST',headers:{Host:'example.org',Origin:origin,'Content-Type':'application/json','X-Ruthless-Request':'ai-console-v1'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.end(JSON.stringify({split:'development',caseId,allowApi:true}));});assert.equal(rebound,403);const status=await(await fetch(origin+'/api/ai/status')).json();assert.equal(status.remaining,1);});assert.equal(calls,0);
});
test('unknown fields/cases, missing acknowledgement and oversize inputs leave the allowance unchanged',async()=>{
  let calls=0;await serverTest({...configured,run:async()=>{calls++;return {};}},async({post,origin})=>{for(const body of [{split:'development',caseId,allowApi:false},{split:'development',caseId:'missing',allowApi:true},{split:'development',caseId,allowApi:true,tools:[]},{split:'private',caseId,allowApi:true}])assert.equal((await post(body)).status,400);assert.equal((await post({text:'x'.repeat(1025)})).status,413);assert.equal((await(await fetch(origin+'/api/ai/status')).json()).remaining,1);});assert.equal(calls,0);
});
test('one acknowledged request pins server model/tokens and consumes the attempt allowance',async()=>{
  await serverTest({...configured,maxOutputTokens:2000,run:async(options,auth)=>{assert.equal(options.model,'test-model');assert.equal(options.caseId,caseId);assert.equal(options.maxCases,1);assert.equal(options.maxOutputTokens,2000);assert.equal(auth.allowApi,true);return {executions:[],report:{rows:[]}};}},async({post,origin})=>{const res=await post();assert.equal(res.status,200);const result=await res.json();assert.equal(result.remaining,0);assert.equal(result.mode,'Mocked integration test');assert.equal((await post()).status,429);const status=await(await fetch(origin+'/api/ai/status')).json();assert.equal(status.mock,true);assert.ok(!JSON.stringify(status).includes('test-key-not-real'));});
});
test('concurrent execution is blocked and failures do not refund or expose sensitive diagnostics',async()=>{
  let release,entered;const began=new Promise(resolve=>entered=resolve),blocked=new Promise(resolve=>release=resolve);await serverTest({...configured,maxRequests:2,run:async()=>{entered();await blocked;throw new Error('test-key-not-real');}},async({post,origin})=>{const first=post();await began;assert.equal((await post()).status,409);release();const failed=await first;assert.equal(failed.status,400);assert.ok(!(await failed.text()).includes('test-key-not-real'));const status=await(await fetch(origin+'/api/ai/status')).json();assert.equal(status.busy,false);assert.equal(status.remaining,1);});
});
test('requests whose bodies overlap cannot acquire the same request allowance',async()=>{
  const handler=aiService({...configured,run:async()=>({})});let releaseBody;
  const waiting=new Promise(resolve=>releaseBody=resolve),headers={host:'127.0.0.1:4000',origin:'http://127.0.0.1:4000','content-type':'application/json','x-ruthless-request':'ai-console-v1'};
  const body=Buffer.from(JSON.stringify({split:'development',caseId,allowApi:true}));
  function request(slow){return {url:'/api/ai/analyze',method:'POST',headers,async *[Symbol.asyncIterator](){if(slow)await waiting;yield body;}};}
  function response(){return {status:null,writeHead(status){this.status=status;},end(){}};}
  const slow=response(),fast=response(),pending=handler(request(true),slow,'http://127.0.0.1:4000');await handler(request(false),fast,'http://127.0.0.1:4000');assert.equal(fast.status,200);releaseBody();await pending;assert.equal(slow.status,429);
});
