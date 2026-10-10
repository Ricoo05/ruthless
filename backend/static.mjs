import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../dist/',import.meta.url));
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',mjs:'text/javascript; charset=utf-8',json:'application/json; charset=utf-8',png:'image/png'};
export async function serveFrontend(req,res) {
  if(!['GET','HEAD'].includes(req.method))return false;
  const pathname=req.url==='/'?'/index.html':req.url;
  if(!/^\/(?:examples\/)?[a-zA-Z0-9_-]+\.(html|css|mjs|json)$/.test(pathname)&&!/^\/assets\/[a-zA-Z0-9_-]+\.png$/.test(pathname))return false;
  let data;try{data=await readFile(path.join(root,pathname.slice(1)));}catch{return false;}
  const connectSources=pathname==='/index.html'?"'self' https://www.gov.uk https://api.gdeltproject.org https://earthquake.usgs.gov https://raw.githubusercontent.com https://eonet.gsfc.nasa.gov https://images-api.nasa.gov":"'self'";
  res.writeHead(200,{'Content-Type':types[path.extname(pathname).slice(1)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':`default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https://images-assets.nasa.gov; media-src https://images-assets.nasa.gov; connect-src ${connectSources}; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`});
  res.end(req.method==='HEAD'?undefined:data);return true;
}
