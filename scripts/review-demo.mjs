import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {mkdtemp,rm,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {localTokenAuthenticator} from '../backend/auth.mjs';
import {openWorkspaceStore} from '../backend/store.mjs';
import {createBackendServer} from '../backend/http.mjs';
import {demoWorkspace,updateAssessment} from '../dist/threat-core.mjs';

// Synthetic, short-lived API demonstration. No keys/credentials enter argv,
// logs or files. This does not create a permanent grant or agency approval.
const directory=await mkdtemp(path.join(tmpdir(),'ruthless-review-demo-'));
const file=path.join(directory,'demo.sqlite'),key=randomBytes(32);
const grants=['analyst','reviewer','auditor'].map(role=>{const token=randomBytes(32).toString('base64url');return {token,grant:{tokenHash:createHash('sha256').update(token).digest('hex'),subject:`synthetic-${role}`,tenantId:'fictional-review-organization',role,workspaceIds:['training-desk'],expiresAt:Date.now()+60_000}};});
let store,server;
async function stop(){if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));server=null;}if(store){store.close();store=null;}}
async function start(){store=openWorkspaceStore({file,key,tenantId:grants[0].grant.tenantId});server=createBackendServer({store,authenticate:localTokenAuthenticator(grants.map(g=>g.grant))});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return `http://127.0.0.1:${server.address().port}/api/workspaces/training-desk`;}
const headers=(role,revision)=>({Authorization:`Bearer ${grants.find(g=>g.grant.role===role).token}`,...(revision===undefined?{}:{'Content-Type':'application/json','If-Match':`"${revision}"`})});
const decision={assessmentId:'training-domestic',decision:'approve',note:'Synthetic reviewer retained conflicting evidence and documented the remaining source gap.',sourcesConsidered:true};
try{
  let url=await start();
  const workspace=updateAssessment(demoWorkspace(),'training-domestic',{judgment:'These fictional reports do not establish cause or attribution.',gaps:'Independent original reporting is missing.',confidence:'Low',status:'Reviewed',reviewNote:'Retain the conflicting explanation and unresolved attribution.',citedEvidence:['SYN-001','SYN-003'],challengesAcknowledged:true},'2026-10-05');
  assert.equal((await fetch(url,{method:'PUT',headers:headers('analyst',0),body:JSON.stringify({workspace})})).status,200);
  const empty=await fetch(url+'/reviews',{headers:headers('reviewer')});assert.deepEqual((await empty.json()).decisions,[]);
  assert.equal((await fetch(url+'/reviews',{method:'POST',headers:headers('analyst',1),body:JSON.stringify(decision)})).status,403);
  const approved=await fetch(url+'/reviews',{method:'POST',headers:headers('reviewer',1),body:JSON.stringify(decision)});assert.equal(approved.status,200);assert.equal((await approved.json()).actor,'synthetic-reviewer');
  assert.equal((await fetch(url+'/reviews',{method:'POST',headers:headers('reviewer',1),body:JSON.stringify(decision)})).status,409);
  await stop();url=await start();
  const recovered=await fetch(url+'/reviews',{headers:headers('reviewer')});const receipt=(await recovered.json()).decisions[0];assert.equal(receipt.note,decision.note);assert.equal(receipt.current,true);
  assert.equal((await fetch(url,{method:'PUT',headers:headers('analyst',1),body:JSON.stringify({workspace})})).status,200);
  const changed=await fetch(url+'/reviews',{headers:headers('reviewer')});assert.equal((await changed.json()).decisions[0].current,false);
  assert.equal((await fetch(url+'/reviews',{method:'POST',headers:headers('reviewer',1),body:JSON.stringify(decision)})).status,409);
  const audit=await fetch(url+'/audit',{headers:headers('auditor')});const ledger=await audit.json();assert.equal(ledger.reviewEvents.length,1);assert.equal(JSON.stringify(ledger).includes(decision.note),false);
  console.log(JSON.stringify({mode:'synthetic revision-bound review API demonstration',analystCannotApprove:true,importedLabelGrantsNoApproval:true,reviewerReceiptRecoveredAfterReopen:true,duplicateDecisionRejected:true,newSaveInvalidatesApproval:true,auditorReceivesNoRationale:true,realIdentityVerified:false,rollbackProtection:false,paidApiCalls:0}));
}finally{await stop();key.fill(0);await rm(file,{force:true});await rmdir(directory);}
