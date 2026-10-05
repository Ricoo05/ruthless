// Explicit synthetic-only local experiment; no credentials or agency feeds.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {SEMANTIC_MODEL,semanticInputs,semanticInputHash,validateSemanticRun,sha256} from '../dist/semantic-run.mjs';
import {LINKAGE_SUITE_VERSION} from '../dist/linkage-fixtures.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(process.argv.slice(2).some(a=>a!=='--run')||!process.argv.includes('--run')){console.log('Run the fixed synthetic-only experiment explicitly: node scripts/run-semantic-linkage.mjs --run');process.exit(process.argv.length>2?1:0);}
const require=createRequire(path.join(root,'tools/semantic/package.json'));
const imported=await import(pathToFileURL(require.resolve('@huggingface/transformers')).href);
const {pipeline,env}=imported.default??imported;
const cache=path.join(root,'.semantic-runtime/cache');await fs.mkdir(cache,{recursive:true});env.cacheDir=cache;
const started=Date.now();console.log('Loading pinned local multilingual encoder. Public model assets may be downloaded; report text is processed locally.');
const extractor=await pipeline('feature-extraction',SEMANTIC_MODEL.id,{revision:SEMANTIC_MODEL.revision,dtype:SEMANTIC_MODEL.dtype,device:'cpu'});
const inputs=semanticInputs(),vectors=new Map(),sources=[];
for(const record of inputs.flatMap(c=>[c.query,...c.candidates])){
 const tokens=await extractor.tokenizer(record.text,{truncation:false,padding:false});const tokenCount=tokens.input_ids.data.length;if(tokenCount>SEMANTIC_MODEL.maxLength)throw new Error(`Synthetic record ${record.id} exceeds the model's 128-token limit; no truncated score is retained.`);
 const encoded=await extractor(record.text,{pooling:SEMANTIC_MODEL.pooling,normalize:true,truncation:true,max_length:SEMANTIC_MODEL.maxLength});
 const vector=Array.from(encoded.data);if(vector.length!==SEMANTIC_MODEL.dimensions||vector.some(n=>!Number.isFinite(n)))throw new Error('Invalid embedding dimensions.');vectors.set(record.id,vector);sources.push({id:record.id,sha256:await sha256(record.text),tokens:tokenCount,truncated:false});
 if(sources.length%16===0)console.log(`Encoded ${sources.length} / 64 fictional reports locally.`);
}
await extractor.dispose();
const rows=inputs.map(c=>({caseId:c.caseId,queryId:c.query.id,scores:c.candidates.map(r=>{const a=vectors.get(c.query.id),b=vectors.get(r.id);const norm=Math.hypot(...a)*Math.hypot(...b);return {id:r.id,cosine:Math.max(-1,Math.min(1,a.reduce((s,n,i)=>s+n*b[i],0)/norm))};})}));
const assets=[];async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())await walk(file);else if(e.isFile()){const bytes=await fs.readFile(file);assets.push({file:path.relative(cache,file).split(path.sep).join('/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}await walk(cache);assets.sort((a,b)=>a.file.localeCompare(b.file));
const run={format:'ruthless-saved-semantic-run',version:1,suiteVersion:LINKAGE_SUITE_VERSION,inputHash:await semanticInputHash(),model:SEMANTIC_MODEL,executedAt:new Date().toISOString(),durationMs:Date.now()-started,assets,sources,rows};
await validateSemanticRun(run);const target=path.join(root,'dist/semantic-run.json'),temporary=target+'.tmp';await fs.writeFile(temporary,JSON.stringify(run,null,2)+'\n',{flag:'w'});await fs.rename(temporary,target);
console.log(JSON.stringify({status:'completed',records:sources.length,dimensions:SEMANTIC_MODEL.dimensions,durationMs:run.durationMs,inputHash:run.inputHash,output:'dist/semantic-run.json',paidApiCalls:0}));
