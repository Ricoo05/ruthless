import {DatabaseSync} from 'node:sqlite';
import {createCipheriv,createDecipheriv,createHash,createHmac,hkdfSync,randomBytes,timingSafeEqual} from 'node:crypto';
import {parseWorkspace,serializeWorkspace} from '../dist/threat-core.mjs';
import {authorize,validId,reject} from './auth.mjs';

export const MAX_SAVED_VERSIONS=64;
const hash=value=>createHash('sha256').update(value).digest('hex');
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&/^[a-f0-9]{64}$/.test(a)&&/^[a-f0-9]{64}$/.test(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const integrity=()=>reject(503,'storage_integrity_failure');
const encode=value=>JSON.stringify(value);

export function openWorkspaceStore({file,tenantId,key,now=()=>Date.now()}) {
  if(!validId(tenantId)||!Buffer.isBuffer(key)||key.length!==32||typeof file!=='string'||!file) throw new Error('Invalid store configuration.');
  const encryptionKey=Buffer.from(hkdfSync('sha256',key,tenantId,'ruthless-snapshot-v1',32));
  const auditKey=Buffer.from(hkdfSync('sha256',key,tenantId,'ruthless-audit-v1',32));
  const mac=value=>createHmac('sha256',auditKey).update(value).digest('hex');
  const seal=mac(encode(['ruthless-store',1,tenantId]));
  const db=new DatabaseSync(file,{timeout:3000});
  let closed=false;
  function transaction(fn) {
    db.exec('BEGIN IMMEDIATE');
    try { const result=fn(); db.exec('COMMIT'); return result; }
    catch(error) { if(db.isTransaction) db.exec('ROLLBACK'); throw error; }
  }
  function envelope(row) {
    return encode([tenantId,row.workspace_id,row.revision,Buffer.from(row.nonce).toString('hex'),Buffer.from(row.ciphertext).toString('hex'),Buffer.from(row.tag).toString('hex')]);
  }
  function eventPayload(row) {
    return encode([row.seq,row.tenant_id,row.workspace_id,row.revision,row.actor,row.at,row.digest,row.previous]);
  }
  function verify() {
    const metadata=db.prepare('SELECT tenant_id,seal FROM metadata').all();
    if(metadata.length!==1||metadata[0].tenant_id!==tenantId||!same(metadata[0].seal,seal)) integrity();
    const events=db.prepare('SELECT * FROM audit ORDER BY seq').all();
    const versions=db.prepare('SELECT * FROM versions ORDER BY workspace_id,revision').all();
    if(events.length!==versions.length||events.length>MAX_SAVED_VERSIONS) integrity();
    let previous=seal;
    const expected=new Map(),seen=new Map();
    for(const event of events) {
      if(event.seq!==expected.size+1||event.tenant_id!==tenantId||event.previous!==previous||!same(event.mac,mac(eventPayload(event)))) integrity();
      const revision=(seen.get(event.workspace_id)??0)+1;
      if(event.revision!==revision) integrity();
      seen.set(event.workspace_id,revision);
      expected.set(`${event.workspace_id}:${event.revision}`,event.digest);
      previous=event.mac;
    }
    for(const row of versions) if(row.tenant_id!==tenantId||!same(expected.get(`${row.workspace_id}:${row.revision}`),hash(envelope(row)))) integrity();
    return events;
  }
  try {
    db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; PRAGMA trusted_schema=OFF;');
    const version=db.prepare('PRAGMA user_version').get().user_version;
    if(version===0) transaction(()=>{
      db.exec(`CREATE TABLE metadata(tenant_id TEXT NOT NULL PRIMARY KEY,seal TEXT NOT NULL) STRICT;
        CREATE TABLE versions(tenant_id TEXT NOT NULL,workspace_id TEXT NOT NULL,revision INTEGER NOT NULL CHECK(revision>0),nonce BLOB NOT NULL,ciphertext BLOB NOT NULL,tag BLOB NOT NULL,PRIMARY KEY(workspace_id,revision)) STRICT;
        CREATE TABLE audit(seq INTEGER PRIMARY KEY,tenant_id TEXT NOT NULL,workspace_id TEXT NOT NULL,revision INTEGER NOT NULL,actor TEXT NOT NULL,at TEXT NOT NULL,digest TEXT NOT NULL,previous TEXT NOT NULL,mac TEXT NOT NULL,UNIQUE(workspace_id,revision)) STRICT;
        PRAGMA user_version=1;`);
      db.prepare('INSERT INTO metadata VALUES(?,?)').run(tenantId,seal);
    });
    else if(version!==1) throw new Error('Unsupported backend schema.');
    verify();
  } catch(error) { db.close(); encryptionKey.fill(0); auditKey.fill(0); throw error; }
  function current(workspaceId) { return db.prepare('SELECT * FROM versions WHERE workspace_id=? ORDER BY revision DESC LIMIT 1').get(workspaceId); }
  function readRow(row) {
    try {
      const decipher=createDecipheriv('aes-256-gcm',encryptionKey,row.nonce);
      decipher.setAAD(Buffer.from(encode([tenantId,row.workspace_id,row.revision])));
      decipher.setAuthTag(row.tag);
      return parseWorkspace(Buffer.concat([decipher.update(row.ciphertext),decipher.final()]).toString('utf8'));
    } catch { integrity(); }
  }
  return Object.freeze({
    tenantId,
    checkAccess(principal,workspaceId,action) { authorize(principal,tenantId,workspaceId,action,now()); },
    read(principal,workspaceId) {
      authorize(principal,tenantId,workspaceId,'read',now());
      return transaction(()=>{verify(); const row=current(workspaceId); if(!row) reject(404,'workspace_not_found'); return {revision:row.revision,workspace:readRow(row),reviewAuthority:'client_assertions_only'};});
    },
    save(principal,workspaceId,expectedRevision,input) {
      authorize(principal,tenantId,workspaceId,'write',now());
      if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0) reject(400,'invalid_revision');
      let workspace,raw;
      try { workspace=parseWorkspace(serializeWorkspace(input)); raw=serializeWorkspace(workspace); }
      catch { reject(400,'invalid_workspace'); }
      if(workspace.evidence.some(e=>!e.synthetic)||workspace.documents.some(d=>!d.synthetic)) reject(400,'synthetic_records_required');
      return transaction(()=>{
        authorize(principal,tenantId,workspaceId,'write',now());
        const events=verify(),existing=current(workspaceId);
        if((existing?.revision??0)!==expectedRevision) reject(409,'revision_conflict');
        if(events.length>=MAX_SAVED_VERSIONS) reject(507,'prototype_storage_limit');
        const revision=expectedRevision+1,nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',encryptionKey,nonce);
        cipher.setAAD(Buffer.from(encode([tenantId,workspaceId,revision])));
        const ciphertext=Buffer.concat([cipher.update(raw,'utf8'),cipher.final()]),tag=cipher.getAuthTag();
        const row={workspace_id:workspaceId,revision,nonce,ciphertext,tag};
        const event={seq:events.length+1,tenant_id:tenantId,workspace_id:workspaceId,revision,actor:principal.subject,at:new Date(now()).toISOString(),digest:hash(envelope(row)),previous:events.at(-1)?.mac??seal};
        const eventMac=mac(eventPayload(event));
        db.prepare('INSERT INTO versions VALUES(?,?,?,?,?,?)').run(tenantId,workspaceId,revision,nonce,ciphertext,tag);
        db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?,?,?,?)').run(event.seq,tenantId,workspaceId,revision,event.actor,event.at,event.digest,event.previous,eventMac);
        return {revision,reviewAuthority:'client_assertions_only'};
      });
    },
    audit(principal,workspaceId) {
      authorize(principal,tenantId,workspaceId,'audit',now());
      return transaction(()=>({events:verify().filter(e=>e.workspace_id===workspaceId).map(e=>({sequence:e.seq,workspaceId:e.workspace_id,revision:e.revision,actor:e.actor,at:e.at,action:'workspace.saved',digest:e.digest})),integrity:'verified_local_chain',rollbackProtection:false}));
    },
    close() { if(!closed) { db.close(); encryptionKey.fill(0); auditKey.fill(0); closed=true; } }
  });
}
