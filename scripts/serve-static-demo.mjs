// Container preview only. The strict loopback research API is intentionally separate.
import http from 'node:http';
import {serveFrontend} from '../backend/static.mjs';
const server=http.createServer(async(req,res)=>{
  try{if(await serveFrontend(req,res))return;res.writeHead(404);res.end('No local research API in this static preview.');}
  catch{res.writeHead(500);res.end('Preview unavailable.');}
});
server.listen(4173,'0.0.0.0',()=>console.log('Static preview on container port 4173; no journal worker or paid AI.'));
const stop=()=>{server.closeAllConnections();server.close();};
process.once('SIGTERM',stop);process.once('SIGINT',stop);
