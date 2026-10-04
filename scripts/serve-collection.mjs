import {fileURLToPath} from 'node:url';
import {createCollectionServer} from '../collection/local-service.mjs';
import {serveFrontend} from '../backend/static.mjs';
const port=Number(process.env.RUTHLESS_COLLECTION_PORT??4175);
if(process.argv.length!==2||!Number.isInteger(port)||port<1024||port>65535){console.error('Use node scripts/serve-collection.mjs with a valid RUTHLESS_COLLECTION_PORT.');process.exitCode=2;}
else{
  const server=createCollectionServer({directory:fileURLToPath(new URL('../.collection-runtime/',import.meta.url)),serveAssets:serveFrontend});
  server.on('error',()=>{console.error('Local source review could not start. Check the port.');process.exitCode=1;});
  server.listen(port,'127.0.0.1',()=>console.log(`Source review: http://127.0.0.1:${port} · read-only local captures · no AI provider`));
  const stop=()=>{server.closeAllConnections();server.close();};
  process.once('SIGINT',stop);process.once('SIGTERM',stop);
}
