import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {localTokenAuthenticator} from '../backend/auth.mjs';
import {openWorkspaceStore} from '../backend/store.mjs';
import {createBackendServer} from '../backend/http.mjs';

// Explicit local-only integration server. It does not use OPENAI_API_KEY, serve
// frontend assets, register real users, or enable provider requests.
let store,server;
try {
  if(process.argv.length!==2) throw new Error('No command-line credentials or options accepted.');
  const keyHex=process.env.RUTHLESS_STORE_KEY_HEX??'',tenantId=process.env.RUTHLESS_TENANT_ID??'';
  if(!/^[a-f0-9]{64}$/.test(keyHex)) throw new Error('A 32-byte store key is required.');
  const port=Number(process.env.RUTHLESS_BACKEND_PORT??4174);
  if(!Number.isInteger(port)||port<1024||port>65535) throw new Error('Invalid port.');
  const grants=JSON.parse(process.env.RUTHLESS_LOCAL_GRANTS_JSON??'null');
  if(!Array.isArray(grants)||grants.some(g=>g.tenantId!==tenantId)) throw new Error('Local grants must match the configured tenant.');
  const authenticate=localTokenAuthenticator(grants);
  const directory=fileURLToPath(new URL('../.backend-runtime/',import.meta.url));
  await mkdir(directory,{recursive:true});
  const key=Buffer.from(keyHex,'hex');
  try {store=openWorkspaceStore({file:fileURLToPath(new URL('../.backend-runtime/workspaces.sqlite',import.meta.url)),tenantId,key});}
  finally {key.fill(0);}
  server=createBackendServer({store,authenticate});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  console.log(`Synthetic backend: http://127.0.0.1:${port} · local credential adapter · no frontend connection`);
  let stopping=false;
  const stop=()=>{if(stopping)return;stopping=true;server.closeAllConnections();server.close(()=>{store.close();process.exitCode=0;});};
  process.once('SIGINT',stop);process.once('SIGTERM',stop);
} catch {server?.close();store?.close();console.error('Backend startup failed. Check the local tenant, 32-byte key, expiring grants, database integrity and port configuration. No secret values are logged.');process.exitCode=1;}
