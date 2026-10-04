// Explicit browser QA fixture, never imported by the configured backend runner.
// Public fixture credentials protect only authored synthetic, temporary records.
import {randomBytes,createHash} from 'node:crypto';
import {openWorkspaceStore} from '../../backend/store.mjs';
import {localTokenAuthenticator} from '../../backend/auth.mjs';
import {createBackendServer} from '../../backend/http.mjs';
import {serveFrontend} from '../../backend/static.mjs';
import {demoWorkspace} from '../../dist/threat-core.mjs';
if(process.argv.slice(2).join(' ')!=='--synthetic-ui-test')throw new Error('This runner is only for explicit synthetic UI testing.');
const analyst={tokenHash:createHash('sha256').update('f'.repeat(43)).digest('hex'),subject:'synthetic-ui-analyst',tenantId:'fictional-test-organization',role:'analyst',workspaceIds:['training-desk','new-training-desk'],expiresAt:Date.now()+60*60*1000};
const reader={...analyst,tokenHash:createHash('sha256').update('r'.repeat(43)).digest('hex'),subject:'synthetic-ui-reader',role:'reader'};
const store=openWorkspaceStore({file:':memory:',tenantId:analyst.tenantId,key:randomBytes(32)});
store.save(analyst,'training-desk',0,demoWorkspace());
const server=createBackendServer({store,authenticate:localTokenAuthenticator([analyst,reader]),serveAssets:serveFrontend});
server.listen(4174,'127.0.0.1',()=>console.log('Synthetic UI fixture: http://127.0.0.1:4174 · temporary test database · no AI calls'));
const stop=()=>{server.closeAllConnections();server.close(()=>store.close());};process.once('SIGINT',stop);process.once('SIGTERM',stop);
