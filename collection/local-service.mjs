import http from 'node:http';
import path from 'node:path';
import {lstat,opendir,open} from 'node:fs/promises';
import {parseCollectionReport,COLLECTION_SOURCE} from '../dist/collection-core.mjs';

const MAX_FILE=2*1024*1024,MAX_TOTAL=16*1024*1024,MAX_FILES=100;
const filename=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.json$/i;
const sameFile=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mtimeMs===b.mtimeMs;
const clean=r=>{const {sections,...report}=r;return report;};
export async function readCollectionCatalog(directory,{at=new Date()}={}){
  const root=path.resolve(directory);
  const empty=()=>({format:'ruthless-collection-catalog',version:1,sourceId:COLLECTION_SOURCE.id,reportCount:0,lastAttempt:null,lastSuccess:null});
  let directoryStat;
  try{directoryStat=await lstat(root);}catch(e){if(e.code==='ENOENT')return empty();throw e;}
  if(!directoryStat.isDirectory()||directoryStat.isSymbolicLink())throw new Error('Invalid collection directory.');
  const entries=[];
  for await(const entry of await opendir(root)){entries.push(entry);if(entries.length>MAX_FILES)throw new Error('Collection directory exceeds the review limit.');}
  const reports=[];let total=0;
  for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){
    if(!filename.test(entry.name))continue;
    const file=path.join(root,entry.name),before=await lstat(file);
    if(!before.isFile()||before.isSymbolicLink()||before.size>MAX_FILE)throw new Error('Invalid or oversized collection report.');
    total+=before.size;if(total>MAX_TOTAL)throw new Error('Collection scan exceeds the review limit.');
    const handle=await open(file,'r');
    let raw;
    try{
      if(!sameFile(before,await handle.stat()))throw new Error('Collection report changed during loading.');
      const bytes=Buffer.alloc(before.size+1);let used=0;
      while(used<bytes.length){const result=await handle.read(bytes,used,bytes.length-used,null);if(!result.bytesRead)break;used+=result.bytesRead;}
      if(used!==before.size||!sameFile(before,await handle.stat())||!sameFile(before,await lstat(file)))throw new Error('Collection report changed during loading.');
      raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,used));
    }finally{await handle.close();}
    const report=await parseCollectionReport(raw,{at,extractText:s=>s});
    if(`${report.id}.json`.toLowerCase()!==entry.name.toLowerCase())throw new Error('Collection report identity differs from its filename.');
    reports.push(clean(report));
  }
  const after=await lstat(root);
  if(directoryStat.dev!==after.dev||directoryStat.ino!==after.ino||directoryStat.mtimeMs!==after.mtimeMs)throw new Error('Collection directory changed during loading.');
  reports.sort((a,b)=>Date.parse(b.checkedAt)-Date.parse(a.checkedAt)||(a.status===b.status?0:a.status==='failed'?-1:1)||a.id.localeCompare(b.id));
  const lastAttempt=reports[0]??null;
  return {...empty(),reportCount:reports.length,lastAttempt,lastSuccess:lastAttempt?.status==='failed'?(reports.find(r=>r.status==='collected')??null):null};
}

export function createCollectionServer({directory,serveAssets=async()=>false,now=()=>new Date()}){
  let active=false;
  const send=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
  const server=http.createServer(async(req,res)=>{
    try{
      const port=server.address()?.port,host=`127.0.0.1:${port}`,origin=`http://${host}`;
      const count=name=>req.rawHeaders.filter((_,i)=>i%2===0&&req.rawHeaders[i].toLowerCase()===name).length;
      if(req.socket.localAddress!=='127.0.0.1'||req.socket.remoteAddress!=='127.0.0.1'||req.headers.host!==host||count('host')!==1||!['same-origin','none',undefined].includes(req.headers['sec-fetch-site']))return send(res,403,{error:'local_origin_required'});
      if(req.url==='/api/collection/status'&&req.method==='GET')return send(res,200,{enabled:true,mode:'read-only',sourceId:COLLECTION_SOURCE.id});
      if(req.url==='/api/collection/latest'&&req.method==='POST'){
        if(req.headers.origin!==origin||count('origin')!==1||count('x-ruthless-request')!==1||req.headers['x-ruthless-request']!=='collection-review-v1'||req.headers['content-type']!=='application/json'||req.headers.authorization||req.headers.cookie)return send(res,403,{error:'same_origin_review_required'});
        if(req.headers['content-length']&&Number(req.headers['content-length'])>16)return send(res,413,{error:'empty_review_request_required'});
        let body='';for await(const chunk of req){body+=chunk.toString('utf8');if(body.length>16)return send(res,413,{error:'empty_review_request_required'});}
        if(body.trim()!=='{}')return send(res,400,{error:'empty_review_request_required'});
        if(active)return send(res,409,{error:'collection_review_busy'});
        active=true;
        try{return send(res,200,await readCollectionCatalog(directory,{at:now()}));}
        catch{return send(res,422,{error:'collection_catalog_invalid',message:'Local captures could not be validated. Inspect the collection directory; no report was loaded.'});}
        finally{active=false;}
      }
      if(req.url.startsWith('/api/'))return send(res,404,{error:'service_unavailable'});
      if(await serveAssets(req,res))return;
      send(res,404,{error:'not_found'});
    }catch{if(!res.headersSent)send(res,400,{error:'request_failed'});else res.destroy();}
  });
  server.requestTimeout=10000;server.headersTimeout=10000;server.timeout=15000;
  return server;
}
