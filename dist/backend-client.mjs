import {MAX_BYTES,parseWorkspace,serializeWorkspace} from './threat-core.mjs';

const id=v=>typeof v==='string'&&/^[a-zA-Z0-9_-]{1,60}$/.test(v);
const messages={401:'Local credential expired or was rejected. Your work is retained; reconnect.',403:'This identity cannot access that workspace or action. Your work is retained.',404:'No stored workspace exists for this identifier.',409:'A newer server revision exists. Your local work is retained. Inspect the stored version before reconciling.',400:'The server rejected the workspace or request. Your local work is retained.',413:'The request exceeds the workspace size limit.',507:'The local prototype has reached its stored-version limit.'};
export class ConnectionError extends Error {
  constructor(code,status=0){super(messages[status]??({unavailable:'Local backend unavailable. Your work is retained.',invalid_response:'The server response could not be verified. Your work is retained.',connection_changed:'Connection changed; the previous result was ignored.',busy:'Wait for the current server request.',not_bound:'Load or explicitly create a stored workspace before saving.',unsafe_origin:'Open the configured backend at its loopback address to connect.',invalid_credential:'Enter a local workspace credential, not an API key.'}[code]??'Backend request failed. Your work is retained.'));this.code=code;this.status=status;}
}
const fail=(code,status=0)=>{throw new ConnectionError(code,status);};
export function workspaceConnection({origin,fetcher=fetch,timeoutMs=10_000}={}) {
  let token='',profile=null,binding=null,busy=false,epoch=0,active=null,conflict=false,uncertain=false;
  const local=()=>{try{const u=new URL(origin);return u.origin===origin&&u.protocol==='http:'&&u.hostname==='127.0.0.1';}catch{return false;}};
  async function request(route,{method='GET',body,revision}={}) {
    const generation=epoch,credential=token,controller=new AbortController();active=controller;
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try {
      let response;
      try{response=await fetcher(route,{method,credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',headers:{Authorization:`Bearer ${credential}`,...(body?{'Content-Type':'application/json','If-Match':`"${revision}"`}:{})},body,signal:controller.signal});}catch{fail('unavailable');}
      if(generation!==epoch)fail('connection_changed');
      if(!response.ok){if(response.status===401){token='';profile=null;binding=null;}fail('server_rejected',response.status);}
      if(!response.headers.get('content-type')?.startsWith('application/json'))fail('invalid_response');
      const raw=await response.text();if(generation!==epoch)fail('connection_changed');
      if(new TextEncoder().encode(raw).length>MAX_BYTES+16_384)fail('invalid_response');
      let data;try{data=JSON.parse(raw);}catch{fail('invalid_response');}
      return {data,etag:response.headers.get('etag')};
    } catch(error) {if(generation!==epoch)fail('connection_changed');if(error instanceof ConnectionError)throw error;fail('unavailable');}
    finally {clearTimeout(timer);if(generation===epoch)active=null;}
  }
  async function run(fn) {if(busy)fail('busy');busy=true;const generation=epoch;try{return await fn();}finally{if(generation===epoch)busy=false;}}
  function reset(){epoch++;active?.abort();active=null;token='';profile=null;binding=null;busy=false;conflict=false;uncertain=false;}
  function validateSnapshot(data,etag) {
    if(!Number.isSafeInteger(data?.revision)||data.revision<1||data.revision>64||etag!==`"${data.revision}"`||data.reviewAuthority!=='client_assertions_only')fail('invalid_response');
    let workspace;try{workspace=parseWorkspace(serializeWorkspace(data.workspace));}catch{fail('invalid_response');}
    return {workspace,revision:data.revision};
  }
  return Object.freeze({
    state(){return {profile:profile?{...profile,workspaceIds:[...profile.workspaceIds]}:null,binding:binding?{workspaceId:binding.workspaceId,revision:binding.revision}:null,busy,conflict,uncertain,available:local()};},
    matches(workspace){return !!binding&&binding.base===serializeWorkspace(workspace);},
    connect(credential){if(busy)fail('busy');reset();if(!local())fail('unsafe_origin');if(typeof credential!=='string'||!/^[-_A-Za-z0-9]{43}$/.test(credential))fail('invalid_credential');token=credential;return run(async()=>{try{const {data}=await request('/api/session');if(!id(data?.subject)||!id(data.tenantId)||!['reader','analyst','auditor'].includes(data.role)||data.mode!=='local_credential_adapter'||!['temporary_test_database','encrypted_local_database'].includes(data.storageMode)||!Number.isSafeInteger(data.expiresAt)||!Array.isArray(data.workspaceIds)||!data.workspaceIds.length||data.workspaceIds.length>100||!data.workspaceIds.every(id)||new Set(data.workspaceIds).size!==data.workspaceIds.length)fail('invalid_response');profile={subject:data.subject,tenantId:data.tenantId,role:data.role,expiresAt:data.expiresAt,storageMode:data.storageMode,workspaceIds:[...data.workspaceIds]};return {...profile,workspaceIds:[...profile.workspaceIds]};}catch(e){if(e.code!=='connection_changed'){token='';profile=null;}if(e.status===404)fail('unavailable');throw e;}});},
    inspect(workspaceId){if(!profile||!profile.workspaceIds.includes(workspaceId)||profile.role==='auditor')fail('server_rejected',403);return run(async()=>{const {data,etag}=await request(`/api/workspaces/${workspaceId}`);return {...validateSnapshot(data,etag),workspaceId,epoch};});},
    accept(snapshot){if(busy)fail('busy');if(!profile||snapshot.epoch!==epoch||!profile.workspaceIds.includes(snapshot.workspaceId))fail('connection_changed');const checked=validateSnapshot({...snapshot,reviewAuthority:'client_assertions_only'},`"${snapshot.revision}"`);binding={workspaceId:snapshot.workspaceId,revision:snapshot.revision,base:serializeWorkspace(checked.workspace)};conflict=false;uncertain=false;return checked.workspace;},
    prepareCreate(workspaceId){if(busy)fail('busy');if(!profile||profile.role!=='analyst'||!profile.workspaceIds.includes(workspaceId))fail('server_rejected',403);binding={workspaceId,revision:0,base:null};conflict=false;uncertain=false;},
    save(workspace){if(!profile||profile.role!=='analyst')fail('server_rejected',403);if(!binding||conflict||uncertain)fail('not_bound');const expected=binding.revision,workspaceId=binding.workspaceId;let raw;try{raw=serializeWorkspace(parseWorkspace(serializeWorkspace(workspace)));}catch{fail('server_rejected',400);}return run(async()=>{try{const {data,etag}=await request(`/api/workspaces/${workspaceId}`,{method:'PUT',body:`{"workspace":${raw}}`,revision:expected});if(data?.revision!==expected+1||etag!==`"${data.revision}"`||data.reviewAuthority!=='client_assertions_only')fail('invalid_response');binding={workspaceId,revision:data.revision,base:raw};return {revision:data.revision,workspaceId};}catch(e){if(e.code!=='connection_changed'){if(e.status===409)conflict=true;else if(!e.status||e.status>=500)uncertain=true;}throw e;}});},
    detach(){if(busy)fail('busy');binding=null;conflict=false;uncertain=false;},
    disconnect:reset
  });
}
