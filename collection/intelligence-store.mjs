import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {existsSync,lstatSync,realpathSync} from 'node:fs';
import path from 'node:path';

export const INTELLIGENCE_LIMITS=Object.freeze({attempts:1000,reviews:5000,audit:10000,bytes:128*1024*1024,payload:8*1024*1024,raw:2*1024*1024});
const HOUR=3600000,DAY=24*HOUR,GENESIS=createHash('sha256').update('ruthless-public-intelligence-journal-v1').digest('hex');
// Reserve for the largest permitted run, analysis and raw response plus bounded
// attempt/completion audit records. Other writes cannot consume an active hold.
const AUDIT_HEADROOM=4096,COLLECTION_HEADROOM=2*INTELLIGENCE_LIMITS.payload+INTELLIGENCE_LIMITS.raw+AUDIT_HEADROOM;
const dispositions=['Needs verification','Context only','Reviewed warning','Dismissed'];
const hash=value=>createHash('sha256').update(value).digest('hex');
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
const fail=(status,code)=>{const error=new Error(code);error.status=status;error.code=code;throw error;};
const integrity=()=>fail(503,'intelligence_journal_integrity_failure');
function instant(value){const n=value instanceof Date?value.getTime():typeof value==='number'?value:typeof value==='string'?Date.parse(value):NaN;if(!Number.isFinite(n)||n<0)fail(400,'invalid_intelligence_time');return n;}
function json(value,max=INTELLIGENCE_LIMITS.payload){let encoded;try{encoded=JSON.stringify(value);}catch{fail(400,'invalid_intelligence_payload');}if(typeof encoded!=='string'||Buffer.byteLength(encoded)>max)fail(413,'intelligence_payload_too_large');return encoded;}
function parse(value){try{return JSON.parse(value);}catch{integrity();}}
function sourceTime(run){return run.snapshot?.publisherUpdatedAt??null;}

// Plain public-data storage. The hash chain detects local accidental edits and ordinary
// tampering; it does not establish publisher authenticity or an externally anchored log.
// These optional lower-only operational caps cannot increase the journal's hard
// limits and must be supplied again on reopening. Existing data stays readable.
export function openIntelligenceStore({file,now=()=>new Date(),maxCollectionAttempts=INTELLIGENCE_LIMITS.attempts,maxRetainedBytes=INTELLIGENCE_LIMITS.bytes}={}){
  if(!text(file,32767)||typeof now!=='function'||!Number.isSafeInteger(maxCollectionAttempts)||maxCollectionAttempts<1||maxCollectionAttempts>INTELLIGENCE_LIMITS.attempts||!Number.isSafeInteger(maxRetainedBytes)||maxRetainedBytes<1||maxRetainedBytes>INTELLIGENCE_LIMITS.bytes)fail(400,'invalid_intelligence_store_configuration');
  if(file!==':memory:'){
    const resolved=path.resolve(file),directory=path.dirname(resolved);
    if(!existsSync(directory)||lstatSync(directory).isSymbolicLink()||!lstatSync(directory).isDirectory()||realpathSync(directory).toLowerCase()!==directory.toLowerCase())fail(400,'invalid_intelligence_store_directory');
    for(const candidate of [resolved,`${resolved}-journal`,`${resolved}-wal`,`${resolved}-shm`])if(existsSync(candidate)&&(lstatSync(candidate).isSymbolicLink()||!lstatSync(candidate).isFile()))fail(400,'invalid_intelligence_store_file');
  }
  const db=new DatabaseSync(file,{timeout:3000});let closed=false;
  const clock=()=>instant(now());
  const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}};
  const initial=()=>({enabled:false,nextAt:0,failures:0,lastAttemptAt:null,pending:false,pendingAttemptSaved:false});
  const publicState=({pending,pendingAttemptSaved,...state})=>state;
  const eventDigest=row=>hash(JSON.stringify([1,row.sequence,row.at,row.kind,row.payload,row.previous]));
  function attemptBinding(row){return {id:row.id,firstObservedAt:row.first_observed_at,runSha256:hash(row.run_json),analysisSha256:hash(row.analysis_json),rawSha256:row.raw_response===null?null:hash(row.raw_response),rawBytes:row.raw_response===null?0:row.raw_response.byteLength};}
  function attemptObject(row){return {id:row.id,firstObservedAt:row.first_observed_at,run:parse(row.run_json),analysis:parse(row.analysis_json)};}
  function reviewObject(row){return parse(row.review_json);}
  function advance(state,kind,payload){
    if(kind==='configure'){
      if(Object.keys(payload).length!==1||typeof payload.enabled!=='boolean')integrity();
      return {...state,enabled:payload.enabled};
    }
    if(kind==='reserve'){
      if(!Number.isSafeInteger(payload.at)||payload.at<state.nextAt||typeof payload.manual!=='boolean'||(!payload.manual&&!state.enabled))integrity();
      return {...state,nextAt:payload.at+HOUR,lastAttemptAt:new Date(payload.at).toISOString(),pending:true,pendingAttemptSaved:false};
    }
    if(kind==='finish'){
      if(!state.pending||!Number.isSafeInteger(payload.at)||payload.at<instant(state.lastAttemptAt)||typeof payload.failed!=='boolean'||!Number.isSafeInteger(payload.retryAfterMs)||payload.retryAfterMs<0||payload.retryAfterMs>DAY)integrity();
      const failures=payload.failed?state.failures+1:0;
      const delay=payload.failed?Math.min(DAY,HOUR*2**Math.min(failures-1,5)):HOUR;
      return {...state,failures,nextAt:Math.max(state.nextAt,payload.at+delay,payload.at+payload.retryAfterMs),pending:false,pendingAttemptSaved:false};
    }
    return state;
  }
  function checkJournal(){
    if(closed)fail(503,'intelligence_store_closed');
    try{
      const metadata=db.prepare('SELECT * FROM journal_metadata').all();
      if(metadata.length!==1||metadata[0].id!==1||metadata[0].version!==1)integrity();
      const rows=db.prepare('SELECT * FROM journal_audit ORDER BY sequence').all();
      const attempts=db.prepare('SELECT * FROM intelligence_attempts ORDER BY audit_sequence').all();
      const reviews=db.prepare('SELECT * FROM intelligence_reviews ORDER BY audit_sequence').all();
      if(rows.length>INTELLIGENCE_LIMITS.audit||attempts.length>INTELLIGENCE_LIMITS.attempts||reviews.length>INTELLIGENCE_LIMITS.reviews)integrity();
      const byAttempt=new Map(attempts.map(row=>[row.id,row])),byReview=new Map(reviews.map(row=>[row.id,row]));
      let previous=GENESIS,at=-1,state=initial(),attemptCount=0,reviewCount=0,bytes=0;
      for(let i=0;i<rows.length;i++){
        const row=rows[i],time=instant(row.at);bytes+=Buffer.byteLength(row.payload);
        if(row.sequence!==i+1||time<at||row.previous!==previous||row.digest!==eventDigest(row))integrity();
        const payload=parse(row.payload);
        if(row.kind==='attempt'){
          const saved=byAttempt.get(payload.id);
          if(!saved||saved.audit_sequence!==row.sequence||saved.first_observed_at!==row.at||JSON.stringify(payload)!==JSON.stringify(attemptBinding(saved)))integrity();
          const run=parse(saved.run_json),analysis=parse(saved.analysis_json);
          if(saved.run_id!==run.id)integrity();
          validateAttempt(run,analysis,time,saved.raw_response);
          bytes+=Buffer.byteLength(saved.run_json)+Buffer.byteLength(saved.analysis_json)+(saved.raw_response?.byteLength??0);attemptCount++;
          if(state.pending)state={...state,pendingAttemptSaved:true};
        }else if(row.kind==='review'){
          const saved=byReview.get(payload.id);
          if(!saved||saved.audit_sequence!==row.sequence||payload.reviewSha256!==hash(saved.review_json))integrity();
          const review=reviewObject(saved),attempt=byAttempt.get(review.attemptId);
          if(!attempt||review.id!==saved.id||review.at!==row.at||review.head.digest!==row.previous||review.head.sequence!==row.sequence-1||!validReview(review)||!parse(attempt.analysis_json)?.candidates?.some(candidate=>candidate.id===review.candidateId))integrity();
          if(attempt.audit_sequence>=row.sequence)integrity();
          const run=parse(attempt.run_json);
          if(attempts.some(other=>other.audit_sequence>attempt.audit_sequence&&other.audit_sequence<row.sequence&&parse(other.run_json).status==='collected'&&parse(other.run_json).sourceId===run.sourceId))integrity();
          bytes+=Buffer.byteLength(saved.review_json);reviewCount++;
        }else if(['configure','reserve','finish'].includes(row.kind)){
          if(row.kind!=='configure'&&payload.at!==time)integrity();state=advance(state,row.kind,payload);
        }else integrity();
        previous=row.digest;at=time;
      }
      if(attemptCount!==attempts.length||reviewCount!==reviews.length||metadata[0].sequence!==rows.length||metadata[0].digest!==previous||bytes>INTELLIGENCE_LIMITS.bytes)integrity();
      return {head:{sequence:rows.length,digest:previous},state,lastAt:at,bytes,attempts,reviews};
    }catch(error){if(error.code==='intelligence_store_closed'||error.code==='intelligence_journal_integrity_failure')throw error;integrity();}
  }
  // A single read snapshot prevents a concurrent, committed writer from appearing
  // as a partially missing event across separate SELECT statements.
  function verify(){
    if(closed||db.isTransaction)return checkJournal();
    db.exec('BEGIN');
    try{const result=checkJournal();db.exec('COMMIT');return result;}
    catch(error){if(db.isTransaction)db.exec('ROLLBACK');throw error;}
  }
  function validateAttempt(run,analysis,at,rawResponse){
    if(!object(run)||!text(run.id,100)||!text(run.sourceId,100)||!['collected','failed'].includes(run.status)||instant(run.checkedAt)>at)fail(400,'invalid_intelligence_attempt');
    if(run.status==='collected'){
      if(!object(run.snapshot)||run.snapshot.synthetic!==false||!text(run.snapshot.responseSha256,64)||!/^[a-f0-9]{64}$/.test(run.snapshot.responseSha256)||instant(sourceTime(run))>instant(run.checkedAt)||!object(analysis)||!Array.isArray(analysis.candidates)||analysis.candidates.length>500)fail(400,'invalid_intelligence_attempt');
      const ids=new Set();for(const candidate of analysis.candidates){if(!object(candidate)||!text(candidate.id,200)||ids.has(candidate.id))fail(400,'invalid_intelligence_candidate');ids.add(candidate.id);}
    }else if(run.snapshot!==null||analysis!==null||rawResponse!==null)fail(400,'invalid_failed_intelligence_attempt');
    if(rawResponse!==null){if(!(typeof rawResponse==='string'||ArrayBuffer.isView(rawResponse)||rawResponse instanceof ArrayBuffer))fail(400,'invalid_intelligence_raw_response');const raw=typeof rawResponse==='string'?Buffer.from(rawResponse):rawResponse instanceof ArrayBuffer?Buffer.from(rawResponse):Buffer.from(rawResponse.buffer,rawResponse.byteOffset,rawResponse.byteLength);if(raw.byteLength>INTELLIGENCE_LIMITS.raw)fail(413,'intelligence_raw_response_too_large');if(hash(raw)!==run.snapshot.responseSha256)fail(400,'intelligence_raw_response_hash_mismatch');}
  }
  function validReview(value){return text(value.candidateId,200)&&dispositions.includes(value.disposition)&&typeof value.note==='string'&&value.note.trim().length>=10&&value.note.length<=2000&&text(value.reviewer,100);}
  function appendEvent(verified,kind,payload,at,extraBytes=0){
    const encoded=json(payload),sequence=verified.head.sequence+1;
    const pendingAfter=kind==='reserve'||(verified.state.pending&&kind!=='finish');
    const attemptSavedAfter=kind==='reserve'?false:kind==='attempt'?true:verified.state.pendingAttemptSaved;
    const auditHold=pendingAfter?(attemptSavedAfter?1:2):0,byteHold=pendingAfter?(attemptSavedAfter?AUDIT_HEADROOM:COLLECTION_HEADROOM):0;
    if(sequence+auditHold>INTELLIGENCE_LIMITS.audit||verified.bytes+Buffer.byteLength(encoded)+extraBytes+byteHold>maxRetainedBytes)fail(409,'intelligence_journal_capacity_reached');
    if(at<verified.lastAt)fail(409,'intelligence_clock_regression');
    const row={sequence,at:new Date(at).toISOString(),kind,payload:encoded,previous:verified.head.digest};row.digest=eventDigest(row);
    db.prepare('INSERT INTO journal_audit VALUES(?,?,?,?,?,?)').run(row.sequence,row.at,row.kind,row.payload,row.previous,row.digest);
    db.prepare('UPDATE journal_metadata SET sequence=?,digest=? WHERE id=1').run(sequence,row.digest);
    return row;
  }
  try{
    db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; PRAGMA trusted_schema=OFF;');
    const version=db.prepare('PRAGMA user_version').get().user_version;
    if(version===0){
      if(db.prepare("SELECT count(*) AS total FROM sqlite_master WHERE type='table'").get().total!==0)integrity();
      transaction(()=>{db.exec(`CREATE TABLE journal_metadata(id INTEGER PRIMARY KEY CHECK(id=1),version INTEGER NOT NULL,sequence INTEGER NOT NULL,digest TEXT NOT NULL) STRICT;
        CREATE TABLE journal_audit(sequence INTEGER PRIMARY KEY,at TEXT NOT NULL,kind TEXT NOT NULL,payload TEXT NOT NULL,previous TEXT NOT NULL,digest TEXT NOT NULL) STRICT;
        CREATE TABLE intelligence_attempts(id TEXT PRIMARY KEY,run_id TEXT NOT NULL UNIQUE,first_observed_at TEXT NOT NULL,run_json TEXT NOT NULL,analysis_json TEXT NOT NULL,raw_response BLOB,audit_sequence INTEGER NOT NULL UNIQUE REFERENCES journal_audit(sequence)) STRICT;
        CREATE TABLE intelligence_reviews(id TEXT PRIMARY KEY,review_json TEXT NOT NULL,audit_sequence INTEGER NOT NULL UNIQUE REFERENCES journal_audit(sequence)) STRICT;
        PRAGMA user_version=1;`);
        db.prepare('INSERT INTO journal_metadata VALUES(1,1,0,?)').run(GENESIS);
        for(const table of ['journal_audit','intelligence_attempts','intelligence_reviews'])for(const action of ['UPDATE','DELETE'])db.exec(`CREATE TRIGGER ${table}_${action.toLowerCase()} BEFORE ${action} ON ${table} BEGIN SELECT RAISE(ABORT,'append_only_journal'); END;`);
      });
    }else if(version!==1)fail(503,'unsupported_intelligence_store_schema');
    verify();
  }catch(error){db.close();throw error;}
  return {
    appendAttempt({run,analysis,rawResponse=null}){return transaction(()=>{
      const verified=verify(),at=clock();validateAttempt(run,analysis,at,rawResponse);
      if(verified.attempts.length>=maxCollectionAttempts)fail(409,'intelligence_journal_capacity_reached');
      if(verified.state.pending&&verified.state.pendingAttemptSaved)fail(409,'intelligence_collection_already_saved');
      if(verified.attempts.some(row=>row.run_id===run.id))fail(409,'intelligence_attempt_already_saved');
      const runJson=json(run),analysisJson=json(analysis),raw=rawResponse===null?null:typeof rawResponse==='string'?Buffer.from(rawResponse):rawResponse instanceof ArrayBuffer?Buffer.from(rawResponse):Buffer.from(rawResponse.buffer,rawResponse.byteOffset,rawResponse.byteLength);
      const row={id:randomUUID(),first_observed_at:new Date(at).toISOString(),run_json:runJson,analysis_json:analysisJson,raw_response:raw};
      const audit=appendEvent(verified,'attempt',attemptBinding(row),at,Buffer.byteLength(runJson)+Buffer.byteLength(analysisJson)+(raw?.byteLength??0));
      db.prepare('INSERT INTO intelligence_attempts VALUES(?,?,?,?,?,?,?)').run(row.id,run.id,row.first_observed_at,runJson,analysisJson,raw,audit.sequence);
      return attemptObject(row);
    });},
    attempts({asOf=null}={}){const verified=verify(),cutoff=Math.min(clock(),asOf===null?Infinity:instant(asOf));return verified.attempts.filter(row=>{const run=parse(row.run_json);return instant(row.first_observed_at)<=cutoff&&instant(run.checkedAt)<=cutoff&&(sourceTime(run)===null||instant(sourceTime(run))<=cutoff);}).map(attemptObject);},
    rawResponse(attemptId){const row=verify().attempts.find(row=>row.id===attemptId);return row?.raw_response===null||!row?null:Buffer.from(row.raw_response);},
    listReviews({asOf=null}={}){const verified=verify(),cutoff=Math.min(clock(),asOf===null?Infinity:instant(asOf));return verified.reviews.map(reviewObject).filter(review=>instant(review.at)<=cutoff&&verified.attempts.some(row=>row.id===review.attemptId&&instant(row.first_observed_at)<=cutoff));},
    review({attemptId,candidateId,disposition,note,reviewer,expectedHead}){return transaction(()=>{
      const verified=verify(),at=clock(),expected=typeof expectedHead==='string'?{digest:expectedHead}:expectedHead;
      if(!expected||expected.digest!==verified.head.digest||(expected.sequence!==undefined&&expected.sequence!==verified.head.sequence))fail(409,'intelligence_review_head_conflict');
      if(!validReview({candidateId,disposition,note,reviewer})||!text(attemptId,100))fail(400,'invalid_intelligence_review');
      const attempt=verified.attempts.find(row=>row.id===attemptId);
      if(!attempt||!parse(attempt.analysis_json)?.candidates?.some(candidate=>candidate.id===candidateId))fail(409,'intelligence_candidate_not_found');
      const run=parse(attempt.run_json);
      if(verified.attempts.some(row=>row.audit_sequence>attempt.audit_sequence&&parse(row.run_json).status==='collected'&&parse(row.run_json).sourceId===run.sourceId))fail(409,'intelligence_capture_superseded');
      if(verified.reviews.length>=INTELLIGENCE_LIMITS.reviews)fail(409,'intelligence_journal_capacity_reached');
      const review={id:randomUUID(),at:new Date(at).toISOString(),attemptId,candidateId,disposition,note:note.trim(),reviewer:reviewer.trim(),head:verified.head},encoded=json(review);
      const audit=appendEvent(verified,'review',{id:review.id,reviewSha256:hash(encoded)},at,Buffer.byteLength(encoded));
      db.prepare('INSERT INTO intelligence_reviews VALUES(?,?,?)').run(review.id,encoded,audit.sequence);return review;
    });},
    state(){return publicState(verify().state);},
    configure({enabled}){if(typeof enabled!=='boolean')fail(400,'invalid_intelligence_configuration');return transaction(()=>{const verified=verify();if(verified.state.enabled!==enabled)appendEvent(verified,'configure',{enabled},clock());return publicState({...verified.state,enabled});});},
    reserveCollection({at,manual=false}){return transaction(()=>{const verified=verify(),current=clock();if(typeof manual!=='boolean'||instant(at)>current)fail(400,'invalid_intelligence_reservation');if(current<verified.lastAt)fail(409,'intelligence_clock_regression');if(current<verified.state.nextAt||(!manual&&!verified.state.enabled))return false;if(verified.attempts.length>=maxCollectionAttempts)fail(409,'intelligence_journal_capacity_reached');appendEvent(verified,'reserve',{at:current,manual},current);return true;});},
    finishCollection({at,failed,retryAfterMs=0}){return transaction(()=>{const verified=verify(),current=clock();if(instant(at)>current||typeof failed!=='boolean'||!Number.isSafeInteger(retryAfterMs)||retryAfterMs<0||retryAfterMs>DAY)fail(400,'invalid_intelligence_completion');if(!verified.state.pending)fail(409,'intelligence_collection_not_reserved');const payload={at:current,failed,retryAfterMs},next=advance(verified.state,'finish',payload);appendEvent(verified,'finish',payload,current);return publicState(next);});},
    head(){return verify().head;},verify(){const verified=verify();return {ok:true,head:verified.head,attempts:verified.attempts.length,reviews:verified.reviews.length,retainedBytes:verified.bytes};},
    close(){if(!closed){db.close();closed=true;}},
  };
}
