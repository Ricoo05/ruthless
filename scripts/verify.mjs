import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const mode=process.argv[2];
if(!['test','check'].includes(mode)||process.argv.length!==3)throw new Error('Use node scripts/verify.mjs test|check');
const manifest=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
for(const command of manifest.scripts[mode].split(' && ')){
  const [runtime,...args]=command.split(' ');
  if(runtime!=='node')throw new Error('Verification only accepts the declared Node commands.');
  const result=spawnSync(process.execPath,args,{cwd:new URL('../',import.meta.url),stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status??1);
}
