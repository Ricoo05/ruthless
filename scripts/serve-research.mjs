import {fileURLToPath} from 'node:url';
import {createCollectionServer} from '../collection/local-service.mjs';
import {serveFrontend} from '../backend/static.mjs';
import {mediaService} from './media-service.mjs';
const args=process.argv.slice(2),enabled=args.length===1&&args[0]==='--enable-media-ai';
if(args.length&&!enabled)throw new Error('Use no flags, or --enable-media-ai for the authorized selected-media experiment.');
if(enabled){try{process.loadEnvFile(fileURLToPath(new URL('../.env.local',import.meta.url)));}catch{throw new Error('Local API configuration unavailable.');}if(!process.env.OPENAI_API_KEY)throw new Error('Local API key unavailable.');}
const port=Number(process.env.RUTHLESS_RESEARCH_PORT??4181);if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid research port.');
const server=createCollectionServer({directory:fileURLToPath(new URL('../.collection-runtime/',import.meta.url)),serveAssets:serveFrontend,mediaService:mediaService({enabled,apiKey:enabled?process.env.OPENAI_API_KEY:'',directory:fileURLToPath(new URL('../.media-runtime/',import.meta.url))})});
server.on('error',()=>{console.error('Research server could not start. Check the port.');process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Ruthless research: http://127.0.0.1:${port}/ · media AI ${enabled?'enabled for selected public frames':'disabled'} · no automatic paid calls`));
const stop=()=>{server.closeAllConnections();server.close();};process.once('SIGINT',stop);process.once('SIGTERM',stop);
