import {readFile,writeFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {MAX_BYTES,parseWorkspace,serializeWorkspace} from '../dist/threat-core.mjs';
import {parseSourceBatch,importSourceBatch} from '../dist/source-import.mjs';
const help='Offline source intake; no network requests.\nnode scripts/import-documents.mjs --workspace FILE --batch FILE --out NEW_FILE --at YYYY-MM-DD --acknowledge-source-conditions\nReview every source access/reuse condition and the batch permission note first. Acknowledgement is an analyst assertion, not verified permission. Existing files are never overwritten. No evidence is incorporated automatically.';
async function load(file){const path=resolve(file);if((await stat(path)).size>MAX_BYTES)throw new Error('Input exceeds 2 MB.');return readFile(path,'utf8');}
try{
  const args=process.argv.slice(2);if(!args.length||args.includes('--help'))console.log(help);else{
    const options={};for(let i=0;i<args.length;i++){const key=args[i];if(Object.hasOwn(options,key))throw new Error('Duplicate argument.');if(key==='--acknowledge-source-conditions')options[key]=true;else{if(!['--workspace','--batch','--out','--at'].includes(key)||!args[i+1]||args[i+1].startsWith('--'))throw new Error('Invalid arguments. Use --help.');options[key]=args[++i];}}
    if(['--workspace','--batch','--out','--at'].some(k=>!options[k]))throw new Error('Missing arguments. Use --help.');
    const result=importSourceBatch(parseWorkspace(await load(options['--workspace'])),parseSourceBatch(await load(options['--batch'])),{batchId:`batch-${randomUUID()}`,idForRecord:()=>`doc-${randomUUID()}`,at:options['--at'],accessAcknowledged:options['--acknowledge-source-conditions']===true});
    await writeFile(resolve(options['--out']),serializeWorkspace(result.workspace)+'\n',{encoding:'utf8',flag:'wx'});console.log(JSON.stringify({saved:resolve(options['--out']),added:result.added,skipped:result.skipped,evidenceAutomaticallyAdded:0}));
  }
}catch(e){console.error(e.message);process.exitCode=1;}
