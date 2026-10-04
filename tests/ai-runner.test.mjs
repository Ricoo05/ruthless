import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,existsSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {executionPlan,runSyntheticEvaluation,responseOutput,API_ENDPOINT} from '../scripts/ai-runner-core.mjs';
import {controlCandidates,exportedInputs} from '../dist/evaluation-fixtures.mjs';
const options={model:'test-model',maxCases:6},key='synthetic-test-key-not-real';
const response=output=>({status:'completed',id:'resp_test',model:'test-model',usage:{input_tokens:100,output_tokens:50,total_tokens:150},output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(output)}]}]});
const mock=(kind='faithful',split='development')=>async(url,req)=>{assert.equal(url,API_ENDPOINT);assert.equal(req.redirect,'error');const body=JSON.parse(req.body),id=JSON.parse(body.input).caseId;return new Response(JSON.stringify(response(controlCandidates(split,kind).responses.find(r=>r.caseId===id).output)),{headers:{'Content-Type':'application/json'}});};

test('AI plans contain only selected synthetic inputs, strict output schema, no tools and no control answers',()=>{
  for(const split of ['development','holdout']){const plan=executionPlan({...options,split});assert.equal(plan.requests.length,6);assert.equal(plan.maxOutputTokens,4000);for(const r of plan.requests){const c=exportedInputs(split).cases.find(c=>c.id===r.caseId);assert.ok(c);assert.deepEqual(JSON.parse(r.body.input),{caseId:c.id,question:c.question,documents:c.documents});assert.equal(r.body.store,false);assert.equal(r.body.text.format.strict,true);assert.equal(r.body.tools,undefined);assert.equal(JSON.parse(r.body.input).guidance,undefined);assert.equal(JSON.parse(r.body.input).controls,undefined);}}
});
test('API plan bounds and selected case prevent unknown models, cases and over-budget runs',()=>{
  for(const bad of [{model:''},{model:'bad model'},{maxCases:0},{maxCases:7},{maxCases:1.5},{maxOutputTokens:511},{maxOutputTokens:8001},{split:'private'},{caseId:'missing'},{caseId:'dev-allegation',maxCases:6}])assert.throws(()=>executionPlan({...options,...bad}));
  const c=exportedInputs('holdout').cases[1];assert.equal(executionPlan({model:'test-model',split:'holdout',caseId:c.id}).requests[0].caseId,c.id);
});
test('API execution requires explicit acknowledgement/key before any request',async()=>{
  let calls=0;const fetchImpl=async()=>{calls++;throw new Error();};for(const bad of [{apiKey:key},{apiKey:'',allowApi:true},{apiKey:'bad\r\nkey',allowApi:true}])await assert.rejects(runSyntheticEvaluation(options,{...bad,fetchImpl}));assert.equal(calls,0);
});
test('mocked faithful responses reach exact-citation validation and remain semantically unreviewed',async()=>{
  const result=await runSyntheticEvaluation(options,{apiKey:key,allowApi:true,fetchImpl:mock()});assert.equal(result.executions.length,6);assert.equal(result.report.counts.structurallyValid,6);assert.equal(result.report.counts.reviewerChecksSatisfied,0);assert.equal(result.report.counts.needsSemanticReview,6);assert.equal(result.executions[0].usage.total_tokens,150);assert.equal(result.requestFingerprint.length,64);assert.ok(!JSON.stringify(result).includes(key));
});
test('mocked misleading statements keep valid citations and never gain semantic approval',async()=>{
  const r=await runSyntheticEvaluation(options,{apiKey:key,allowApi:true,fetchImpl:mock('misleading')});assert.equal(r.report.counts.structurallyValid,6);assert.equal(r.report.counts.reviewerChecksSatisfied,0);
});
test('invented model quotes remain structural failures across every executed case',async()=>{
  const r=await runSyntheticEvaluation(options,{apiKey:key,allowApi:true,fetchImpl:mock('malformed')});assert.equal(r.report.counts.structurallyInvalid,6);assert.equal(r.executions.length,6);assert.ok(r.report.rows.every(row=>row.error));
});
test('Hindi, emoji, withdrawn reports and unsupported predictions retain input fidelity and abstention',async()=>{
  const r=await runSyntheticEvaluation({...options,split:'holdout'},{apiKey:key,allowApi:true,fetchImpl:mock('faithful','holdout')});assert.equal(r.report.counts.structurallyValid,6);assert.ok(r.candidates.responses.at(-1).output.abstention);assert.ok(executionPlan({...options,split:'holdout'}).requests.some(r=>r.body.input.includes('😀')||/[\u0900-\u097f]/.test(r.body.input)));
});
test('one-case execution retains missing cases instead of passing the complete suite',async()=>{
  const r=await runSyntheticEvaluation({...options,maxCases:1},{apiKey:key,allowApi:true,fetchImpl:mock()});assert.equal(r.executions.length,1);assert.equal(r.report.counts.cases,6);assert.equal(r.report.counts.structurallyInvalid,5);
});
test('HTTP failure stops subsequent requests, never echoes provider error content or retries',async()=>{
  let calls=0;const r=await runSyntheticEvaluation(options,{apiKey:key,allowApi:true,fetchImpl:async()=>{calls++;return new Response('sensitive provider error '+key,{status:401});}});assert.equal(calls,1);assert.equal(r.executions.length,1);assert.match(r.executions[0].error,/HTTP 401/);assert.equal(r.report.counts.structurallyInvalid,6);assert.ok(!JSON.stringify(r).includes(key));
});
test('refusal, incomplete output, tools, invalid JSON and multiple messages cannot become drafts',()=>{
  const base=response({proposals:[],abstention:'No support.'});for(const v of [{...base,status:'incomplete'},{...base,output:[{type:'function_call'}]},{...base,output:[{type:'message',role:'assistant',status:'completed',content:[{type:'refusal',refusal:'Declined.'}]}]},{...base,output:[...base.output,...base.output]},{...base,output:[{...base.output[0],content:[{type:'output_text',text:'{bad'}]}]}])assert.throws(()=>responseOutput(v));
});
test('response size and UTF-8 validity are bounded before model output is trusted',async()=>{
  for(const fetchImpl of [async()=>new Response('{}',{headers:{'content-length':'2000001'}}),async()=>new Response('x'.repeat(2000001)),async()=>new Response(new Uint8Array([0xff,0xfe]))]){const r=await runSyntheticEvaluation(options,{apiKey:key,allowApi:true,fetchImpl});assert.equal(r.executions.length,1);assert.equal(r.executions[0].status,'Failed');assert.equal(r.report.counts.structurallyInvalid,6);}
});
test('timeouts and network errors stop the run and redact transport diagnostics',async()=>{
  const timeout=await runSyntheticEvaluation(options,{apiKey:key,allowApi:true,timeoutMs:5,fetchImpl:async(url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error(key))))});assert.match(timeout.executions[0].error,/timed out/);const network=await runSyntheticEvaluation(options,{apiKey:key,allowApi:true,fetchImpl:async()=>{throw new Error(key);}});assert.match(network.executions[0].error,/request failed/);assert.ok(!JSON.stringify(network).includes(key));
});
test('response-stream diagnostics cannot expose credentials or trigger subsequent calls',async()=>{
  let calls=0;const r=await runSyntheticEvaluation(options,{apiKey:key,allowApi:true,fetchImpl:async()=>{calls++;return new Response(new ReadableStream({start(c){c.error(new Error(key));}}));}});assert.equal(calls,1);assert.match(r.executions[0].error,/stream failed/);assert.ok(!JSON.stringify(r).includes(key));
});
test('offline CLI plan is complete, excludes credentials and never overwrites or creates failed run files',()=>{
  const dir=mkdtempSync(join(tmpdir(),'ruthless-ai-')),out=join(dir,'plan.json'),failed=join(dir,'failed.json'),cli=fileURLToPath(new URL('../scripts/run-ai.mjs',import.meta.url));const run=args=>execFileSync(process.execPath,[cli,...args],{encoding:'utf8',env:{...process.env,OPENAI_API_KEY:''},stdio:['ignore','pipe','pipe']});
  try{const result=JSON.parse(run(['plan','--model','test-model','--out',out]));assert.equal(result.apiCalls,0);const saved=readFileSync(out,'utf8'),plan=JSON.parse(saved);assert.ok(plan.requests[0].caseId);assert.throws(()=>run(['plan','--model','test-model','--out',out]));assert.equal(readFileSync(out,'utf8'),saved);assert.throws(()=>run(['run','--model','test-model','--out',failed,'--allow-api']));assert.equal(existsSync(failed),false);}finally{unlinkSync(out);rmdirSync(dir);}
});
