import {parseCollectionReport,COLLECTION_SOURCE} from './collection-core.mjs';
const MAX_CATALOG=4*1024*1024+4096;
export function localCollectionOrigin(origin){try{const u=new URL(origin);return u.protocol==='http:'&&u.hostname==='127.0.0.1'&&!!u.port&&u.origin===origin;}catch{return false;}}
export async function parseCollectionCatalog(raw,{extractText,at=new Date()}={}){
  if(typeof raw!=='string'||new TextEncoder().encode(raw).length>MAX_CATALOG)throw new Error('Collection catalog exceeds its size limit.');
  const c=JSON.parse(raw),keys=['format','version','sourceId','reportCount','lastAttempt','lastSuccess'];
  if(!c||Array.isArray(c)||Object.keys(c).length!==keys.length||keys.some(k=>!Object.hasOwn(c,k))||c.format!=='ruthless-collection-catalog'||c.version!==1||c.sourceId!==COLLECTION_SOURCE.id||!Number.isInteger(c.reportCount)||c.reportCount<0||c.reportCount>100)throw new Error('Unsupported collection catalog.');
  if(c.reportCount===0){if(c.lastAttempt!==null||c.lastSuccess!==null)throw new Error('Invalid empty collection catalog.');return {...c};}
  const lastAttempt=await parseCollectionReport(JSON.stringify(c.lastAttempt),{extractText,at});
  let lastSuccess=null;
  if(lastAttempt.status==='collected'){if(c.lastSuccess!==null)throw new Error('Unexpected redundant success report.');lastSuccess=lastAttempt;}
  else if(c.lastSuccess!==null){lastSuccess=await parseCollectionReport(JSON.stringify(c.lastSuccess),{extractText,at});if(lastSuccess.status!=='collected'||Date.parse(lastSuccess.checkedAt)>Date.parse(lastAttempt.checkedAt)||lastSuccess.id===lastAttempt.id||c.reportCount<2)throw new Error('Invalid retained success report.');}
  return {...c,lastAttempt,lastSuccess};
}
export async function loadLocalCaptures({origin=location.origin,fetchImpl=fetch,extractText,at=new Date()}={}){
  if(!localCollectionOrigin(origin))throw new Error('Local capture loading is available only on the loopback review server.');
  const response=await fetchImpl(`${origin}/api/collection/latest`,{method:'POST',headers:{'Content-Type':'application/json','X-Ruthless-Request':'collection-review-v1'},body:'{}',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok){await response.body?.cancel();throw new Error(response.status===422?'Local capture validation failed; no source context changed. Inspect the collection directory.':'Local capture loading is unavailable. Start node scripts/serve-collection.mjs and open its address.');}
  if(response.url!==`${origin}/api/collection/latest`||!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')??'')||Number(response.headers.get('content-length'))>MAX_CATALOG){await response.body?.cancel();throw new Error('Unexpected collection response.');}
  const reader=response.body.getReader(),chunks=[];let size=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_CATALOG)throw new Error('Collection response exceeds its size limit.');chunks.push(value);}}
  catch(e){await reader.cancel();throw e;}finally{reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return parseCollectionCatalog(new TextDecoder('utf-8',{fatal:true}).decode(bytes),{extractText,at});
}
