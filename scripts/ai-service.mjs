import {runSyntheticEvaluation,executionPlan} from './ai-runner-core.mjs';
export function aiService({enabled=false,apiKey='',model='',maxRequests=1,maxOutputTokens=4000,mock=false,run=runSyntheticEvaluation}={}){
  if(!Number.isInteger(maxRequests)||maxRequests<1||maxRequests>6)throw new Error('AI service budget must be 1–6 requests per server session.');
  if(enabled){executionPlan({model,maxOutputTokens});if(!apiKey.trim())throw new Error('API execution requires a configured key.');}
  let remaining=maxRequests,busy=false;
  return async function(req,res,origin){
    const pathname=new URL(req.url,origin).pathname;if(!pathname.startsWith('/api/ai/'))return false;
    const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));return true;};
    if(req.headers.host!==new URL(origin).host)return send(403,{error:'Local host mismatch.'});
    if(pathname==='/api/ai/status'&&req.method==='GET')return send(200,{enabled,model:enabled?model:'',maxOutputTokens,remaining:enabled?remaining:0,busy,mock,notice:mock?'Integration test: mocked provider. No AI called.':enabled?'Synthetic-only API execution enabled for this local server session.':'API execution is disabled. Source inspection and request preview still work.'});
    if(pathname!=='/api/ai/analyze'||req.method!=='POST')return send(404,{error:'Unknown AI route or method.'});
    if(req.headers.origin!==origin||req.headers['x-ruthless-request']!=='ai-console-v1'||req.headers['content-type']!=='application/json')return send(403,{error:'A same-origin console request is required.'});
    if(!enabled)return send(503,{error:'API execution is not configured on this server.'});
    if(busy)return send(409,{error:'An analysis request is already running.'});
    if(remaining<=0)return send(429,{error:'This server session has reached its request allowance.'});
    let size=0,parts=[];try{for await(const part of req){size+=part.length;if(size>1024)return send(413,{error:'Request exceeds the permitted size.'});parts.push(part);}const body=JSON.parse(Buffer.concat(parts).toString('utf8'));
      if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='allowApi,caseId,split'||body.allowApi!==true)throw new Error('Approve one synthetic request and select a case.');
      const options={model,split:body.split,caseId:body.caseId,maxCases:1,maxOutputTokens};executionPlan(options);
      // Body reads yield; recheck the shared session allowance before acquiring it.
      if(busy)return send(409,{error:'An analysis request is already running.'});
      if(remaining<=0)return send(429,{error:'This server session has reached its request allowance.'});
      busy=true;remaining--;
      try{const result=await run(options,{apiKey,allowApi:true});return send(200,{...result,mode:mock?'Mocked integration test':'API execution',remaining});}finally{busy=false;}
    }catch{return send(400,{error:'Request or execution could not be completed. Inspect the configuration and selected case; no automatic retry.'});}
  };
}
