import {collectAdvisory,SOURCE} from './govuk-advisory.mjs';
import {analyzeAdvisory,ADVISORY_RULE} from '../dist/advisory-engine.mjs';
import {evaluateIntelligenceReplay} from '../dist/intelligence-evaluation.mjs';

const marker='official-warning-v1';
const fail=(status,code)=>{const e=new Error(code);e.status=status;e.code=code;throw e;};
export function createIntelligenceService({store,fetchImpl=fetch,now=()=>new Date()}={}){
  let busy=false,timer=null,lastError=null,activeDone=null,resolveDone=null;
  function snapshot(asOf=now().toISOString()){
    if(typeof asOf!=='string'||!/^\d{4}-\d\d-\d\dT(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(asOf)||!Number.isFinite(Date.parse(asOf))||new Date(asOf.slice(0,10)).toISOString().slice(0,10)!==asOf.slice(0,10)||Date.parse(asOf)>now().getTime())fail(400,'invalid_replay_cutoff');
    const attempts=store.attempts({asOf}),reviews=store.listReviews({asOf}),first=attempts[0]?.firstObservedAt??asOf;
    const evaluation=evaluateIntelligenceReplay(attempts,{developmentEnd:new Date(Date.parse(first)-1).toISOString(),evaluationStart:first,evaluationEnd:asOf,labels:[],independentLabels:false});
    return {format:'ruthless-official-journal',version:1,generatedAt:now().toISOString(),asOf,source:SOURCE,ruleVersion:ADVISORY_RULE,attempts:attempts.slice(-48),reviews:reviews.slice(-100),retainedCount:attempts.length,omittedAttempts:Math.max(0,attempts.length-48),omittedReviews:Math.max(0,reviews.length-100),head:store.head(),state:store.state(),integrity:store.verify(),busy,lastError,evaluation,
      operationalMetadataBasis:'head, state, integrity, busy and lastError describe CURRENT service operations at generatedAt; they are not historical knowledge. Only attempts, reviews and evaluation use asOf.',
      security:'Loopback single-user public-data journal. Reviewer labels are not authenticated identities. Hash chaining is not external attestation.'};
  }
  async function collect({manual=false}={}){
    if(busy)fail(409,'intelligence_collection_busy');
    if(!store.reserveCollection({at:now().getTime(),manual}))fail(429,'intelligence_collection_cooldown');
    busy=true;activeDone=new Promise(resolve=>{resolveDone=resolve;});lastError=null;let retryAfterMs=0,failed=true;
    try{
      let rawResponse=null;
      const run=await collectAdvisory({now,fetchImpl:async(url,options)=>{const r=await fetchImpl(url,options),header=r.headers.get('retry-after');if(header){const delay=/^\d+$/.test(header)?Number(header)*1000:Date.parse(header)-now().getTime();if(Number.isFinite(delay))retryAfterMs=Math.round(Math.min(86400000,Math.max(0,delay)));}return r;},onValidatedResponse:raw=>{rawResponse=raw;}});
      const previous=store.attempts().filter(a=>a.run.status==='collected'&&a.analysis?.topicAvailable).at(-1)?.analysis??null;
      let analysis=null;if(run.status==='collected'){try{analysis=await analyzeAdvisory(run,previous,{at:now()});}catch{analysis={version:1,ruleVersion:ADVISORY_RULE,sourceId:SOURCE.id,sourceHash:run.snapshot.selectedContentSha256,topicAvailable:false,topicHash:null,pageChanged:false,topicChanged:false,candidates:[],paragraphs:[],coverage:'Source extraction failed; inspect retained raw capture.'};}}
      const attempt=store.appendAttempt({run,analysis,rawResponse});failed=run.status!=='collected'||!analysis?.topicAvailable;return attempt;
    }catch(e){lastError=e.code??'intelligence_collection_failed';throw e;}
    finally{try{store.finishCollection({at:now().getTime(),failed,retryAfterMs});}finally{busy=false;resolveDone?.();activeDone=null;resolveDone=null;}}
  }
  async function tick(){try{if(busy||!store.state().enabled||now().getTime()<store.state().nextAt)return;await collect();}catch(e){lastError=e.code??'intelligence_collection_failed';}}
  function start(){if(!timer){timer=setInterval(()=>{void tick();},10000);timer.unref?.();void tick();}}
  function stop(){if(timer)clearInterval(timer);timer=null;return activeDone??Promise.resolve();}
  async function handle(req,res,origin){
    if(!req.url.startsWith('/api/intelligence/'))return false;
    const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));return true;};
    if(req.url==='/api/intelligence/status'&&req.method==='GET'){try{return send(200,{enabled:true,mode:'loopback-public-journal',sourceId:SOURCE.id,busy,monitoring:store.state().enabled,lastError});}catch{return send(503,{error:'intelligence_journal_unavailable'});}}
    const count=name=>req.rawHeaders.filter((_,i)=>i%2===0&&req.rawHeaders[i].toLowerCase()===name).length;
    if(req.method!=='POST'||req.headers.origin!==origin||count('origin')!==1||count('x-ruthless-request')!==1||req.headers['x-ruthless-request']!==marker||req.headers['content-type']!=='application/json'||req.headers.cookie||req.headers.authorization)return send(403,{error:'same_origin_intelligence_review_required'});
    try{
      let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>16384)return send(413,{error:'intelligence_request_too_large'});chunks.push(chunk);}
      const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));if(!body||typeof body!=='object'||Array.isArray(body))fail(400,'invalid_intelligence_request');
      const only=keys=>{if(Object.keys(body).some(k=>!keys.includes(k)))fail(400,'unexpected_intelligence_fields');};
      if(req.url==='/api/intelligence/query'){only(['asOf']);return send(200,snapshot(body.asOf));}
      if(req.url==='/api/intelligence/collect'){only([]);await collect({manual:true});return send(200,snapshot());}
      if(req.url==='/api/intelligence/schedule'){only(['enabled']);store.configure(body);start();return send(200,snapshot());}
      if(req.url==='/api/intelligence/review'){only(['attemptId','candidateId','disposition','note','reviewer','expectedHead']);store.review(body);return send(200,snapshot());}
      return send(404,{error:'unknown_intelligence_route'});
    }catch(e){const status=Number.isInteger(e.status)?e.status:400;return send(status,{error:e.code??'intelligence_request_failed',message:e.code==='intelligence_journal_capacity_reached'?'Journal quota is reached or reserved for an active capture. Preserve the journal and review storage capacity before resuming.':status===429?'Hourly source cooldown is active. Retained evidence remains available.':status===503?'Journal validation failed. Collection and review are blocked until the storage problem is investigated.':'Request could not be applied. Reload the journal and check current source bindings.'});}
  }
  return {handle,snapshot,collect,start,stop,tick};
}
