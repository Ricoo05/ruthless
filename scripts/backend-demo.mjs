import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {mkdtemp,rm,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {localTokenAuthenticator} from '../backend/auth.mjs';
import {openWorkspaceStore} from '../backend/store.mjs';
import {createBackendServer} from '../backend/http.mjs';
import {demoWorkspace} from '../dist/threat-core.mjs';

// Self-contained synthetic integration demo: credentials stay in memory, never
// enter argv, logs or files, and expire after this short-lived server is closed.
const directory=await mkdtemp(path.join(tmpdir(),'ruthless-backend-demo-'));
const file=path.join(directory,'demo.sqlite'),key=randomBytes(32),token=randomBytes(32).toString('base64url');
const grant={tokenHash:createHash('sha256').update(token).digest('hex'),subject:'synthetic-analyst',tenantId:'fictional-organization',role:'analyst',workspaceIds:['training-desk'],expiresAt:Date.now()+60_000};
const options={file,key,tenantId:grant.tenantId};
let store,server;
async function stop() {if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));server=null;}if(store){store.close();store=null;}}
async function start() {store=openWorkspaceStore(options);server=createBackendServer({store,authenticate:localTokenAuthenticator([grant])});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return `http://127.0.0.1:${server.address().port}/api/workspaces/training-desk`;}
try {
  let url=await start();
  const workspace=demoWorkspace(),headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json','If-Match':'"0"'};
  const missing=await fetch(url);assert.equal(missing.status,401);
  const saved=await fetch(url,{method:'PUT',headers,body:JSON.stringify({workspace})});assert.equal(saved.status,200);assert.equal(saved.headers.get('etag'),'"1"');
  const stale=await fetch(url,{method:'PUT',headers,body:JSON.stringify({workspace})});assert.equal(stale.status,409);
  await stop();url=await start();
  const recovered=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});assert.equal(recovered.status,200);const result=await recovered.json();assert.deepEqual(result.workspace,workspace);assert.equal(result.revision,1);
  const audit=store.audit({...grant,role:'auditor'},'training-desk');assert.equal(audit.events.length,1);assert.equal(audit.events[0].actor,'synthetic-analyst');
  console.log(JSON.stringify({mode:'synthetic local backend demonstration',authenticationRequired:true,revisionConflictRejected:true,encryptedDatabaseReopened:true,exactWorkspaceRecovered:true,serverSaveReceipts:audit.events.length,clientReviewClaimsVerified:false,rollbackProtection:false,paidApiCalls:0}));
} finally {await stop();key.fill(0);await rm(file,{force:true});await rmdir(directory);}
