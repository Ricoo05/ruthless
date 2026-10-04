import http from 'node:http';
import {BackendError,reject} from './auth.mjs';
import {MAX_BYTES} from '../dist/threat-core.mjs';

export function createBackendServer({store,authenticate,serveAssets=null}) {
  if(!store||typeof authenticate!=='function') throw new Error('Backend authentication is required.');
  const server=http.createServer(async(req,res)=>{
    const send=(status,body,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(body));};
    try {
      const origin=`http://127.0.0.1:${server.address().port}`;
      if(req.socket.localAddress!=='127.0.0.1'||req.socket.remoteAddress!=='127.0.0.1'||req.headers.host!==new URL(origin).host||(req.headers.origin&&req.headers.origin!==origin)||
        (req.headers['sec-fetch-site']&&req.headers['sec-fetch-site']!=='same-origin'&&req.headers['sec-fetch-site']!=='none')) reject(403,'origin_rejected');
      if(!req.url.startsWith('/api/')) {if(serveAssets&&await serveAssets(req,res))return;reject(404,'route_not_found');}
      if(req.headersDistinct.authorization?.length!==1) reject(401,'unauthenticated');
      let principal=authenticate(req.headers.authorization);
      if(req.url==='/api/session'&&req.method==='GET') {
        if(principal.tenantId!==store.tenantId)reject(403,'forbidden');
        return send(200,{subject:principal.subject,tenantId:principal.tenantId,role:principal.role,workspaceIds:[...principal.workspaceIds],expiresAt:principal.expiresAt,mode:'local_credential_adapter',storageMode:store.storageMode});
      }
      const route=/^\/api\/workspaces\/([a-zA-Z0-9_-]{1,60})(\/audit)?$/.exec(req.url);
      if(!route) reject(404,'route_not_found');
      const [,id,audit]=route;
      if(req.method==='GET') {
        const result=audit?store.audit(principal,id):store.read(principal,id);
        return send(200,result,audit?{}:{ETag:`"${result.revision}"`});
      }
      if(req.method!=='PUT'||audit) reject(405,'method_not_allowed');
      store.checkAccess(principal,id,'write');
      if(req.headers['content-type']!=='application/json'||req.headers['content-encoding']) reject(415,'json_required');
      if(!/^"(?:0|[1-9][0-9]{0,8})"$/.test(req.headers['if-match']??'')) reject(428,'revision_required');
      if(Number(req.headers['content-length']??0)>MAX_BYTES+32) reject(413,'body_too_large');
      let size=0;const parts=[];
      for await(const part of req) { size+=part.length; if(size>MAX_BYTES+32) reject(413,'body_too_large'); parts.push(part); }
      let body;
      try { body=JSON.parse(Buffer.concat(parts).toString('utf8')); } catch { reject(400,'invalid_json'); }
      if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).join(',')!=='workspace') reject(400,'invalid_request');
      // Reading the request body yields. Reauthenticate before applying a write.
      principal=authenticate(req.headers.authorization);
      const result=store.save(principal,id,Number(req.headers['if-match'].slice(1,-1)),body.workspace);
      return send(200,result,{ETag:`"${result.revision}"`});
    } catch(error) { if(!res.headersSent) send(error instanceof BackendError?error.status:503,{error:error instanceof BackendError?error.code:'backend_unavailable'}); else res.end(); }
  });
  server.requestTimeout=10_000;server.headersTimeout=5_000;server.timeout=10_000;server.keepAliveTimeout=1_000;server.maxHeadersCount=40;
  return server;
}
