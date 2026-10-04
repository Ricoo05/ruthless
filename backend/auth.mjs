import {createHash, timingSafeEqual} from 'node:crypto';

export class BackendError extends Error {
  constructor(status, code) { super(code); this.status=status; this.code=code; }
}
export const reject=(status,code)=>{ throw new BackendError(status,code); };
export const validId=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,60}$/.test(value);
const roles=new Set(['reader','analyst','reviewer','auditor']);

// A local integration adapter. Production authentication must supply verified IdP
// identities and server-side memberships; browser claims never enter this map.
export function localTokenAuthenticator(grants,{now=()=>Date.now()}={}) {
  if(!Array.isArray(grants)||!grants.length||grants.length>128) throw new Error('Invalid local grants.');
  const records=grants.map(g=>{
    if(!g||Object.keys(g).sort().join(',')!=='expiresAt,role,subject,tenantId,tokenHash,workspaceIds'||
      !/^[a-f0-9]{64}$/.test(g.tokenHash)||!validId(g.subject)||!validId(g.tenantId)||!roles.has(g.role)||
      !Number.isSafeInteger(g.expiresAt)||!Array.isArray(g.workspaceIds)||!g.workspaceIds.length||
      g.workspaceIds.length>100||!g.workspaceIds.every(validId)||new Set(g.workspaceIds).size!==g.workspaceIds.length)
      throw new Error('Invalid local grant.');
    return Object.freeze({...g,workspaceIds:Object.freeze([...g.workspaceIds]),hash:Buffer.from(g.tokenHash,'hex')});
  });
  if(new Set(records.map(r=>r.tokenHash)).size!==records.length) throw new Error('Duplicate local credential.');
  return authorization=>{
    if(typeof authorization!=='string'||!/^Bearer [A-Za-z0-9_-]{43}$/.test(authorization)) reject(401,'unauthenticated');
    const digest=createHash('sha256').update(authorization.slice(7)).digest();
    const record=records.find(r=>timingSafeEqual(r.hash,digest));
    if(!record||record.expiresAt<=now()) reject(401,'unauthenticated');
    return Object.freeze({subject:record.subject,tenantId:record.tenantId,role:record.role,workspaceIds:record.workspaceIds,expiresAt:record.expiresAt});
  };
}

export function authorize(principal,tenantId,workspaceId,action,now=Date.now()) {
  if(!principal||!validId(principal.subject)||!validId(principal.tenantId)||
    !Number.isSafeInteger(principal.expiresAt)||principal.expiresAt<=now) reject(401,'unauthenticated');
  const allowed={read:['reader','analyst','reviewer'],write:['analyst'],review:['reviewer'],audit:['auditor']}[action]??[];
  if(!validId(workspaceId)||principal.tenantId!==tenantId||!allowed.includes(principal.role)||
    !Array.isArray(principal.workspaceIds)||!principal.workspaceIds.includes(workspaceId)) reject(403,'forbidden');
}
