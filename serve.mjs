import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {aiService} from './scripts/ai-service.mjs';
const root=path.resolve(fileURLToPath(new URL('./dist/',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const args=process.argv.slice(2),aiOptions={enabled:false};
for(let i=0;i<args.length;i++){if(args[i]==='--enable-ai')aiOptions.enabled=true;else if(['--model','--max-requests','--max-output-tokens'].includes(args[i])&&args[i+1]){const key={'--model':'model','--max-requests':'maxRequests','--max-output-tokens':'maxOutputTokens'}[args[i]];aiOptions[key]=key==='model'?args[++i]:Number(args[++i]);}else throw new Error('Unknown server option. AI is disabled by default.');}
const handleAI=aiService({...aiOptions,apiKey:process.env.OPENAI_API_KEY??''});
const server=http.createServer(async(req,res)=>{try{const origin=`http://127.0.0.1:${server.address().port}`;if(await handleAI(req,res,origin))return;const pathname=decodeURIComponent(new URL(req.url,origin).pathname);const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)&&file!==path.join(root,'index.html')){res.writeHead(403);return res.end('Forbidden');}const data=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}});
server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${server.address().port}`));
