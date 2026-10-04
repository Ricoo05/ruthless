import {readFile,writeFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {EVALUATION_MAX_BYTES,parseEvaluation,evaluationJSON,evaluateCandidates,reviewTemplate} from '../dist/evaluation-core.mjs';
import {exportedInputs,controlCandidates} from '../dist/evaluation-fixtures.mjs';
const help=`Offline synthetic evaluation; no network or AI calls.
node scripts/evaluate.mjs inputs --split development|holdout --out FILE
node scripts/evaluate.mjs controls --split development|holdout --kind faithful|misleading|malformed --out FILE
node scripts/evaluate.mjs check --input FILE [--review FILE] [--out REPORT] [--template REVIEW_TEMPLATE]
Output files are created exclusively; existing files are never overwritten. Without --out, JSON is printed.
Exit codes: 0 = structural checks valid; 2 = structural or recorded semantic failure; 1 = invalid invocation/file. Semantic review is required even when exit code is 0.`;
async function load(file){const path=resolve(file);if((await stat(path)).size>EVALUATION_MAX_BYTES)throw new Error('Evaluation file exceeds 2 MB.');return parseEvaluation(await readFile(path,'utf8'));}
async function save(file,value){await writeFile(resolve(file),evaluationJSON(value)+'\n',{encoding:'utf8',flag:'wx'});}
try{
  const [command,...args]=process.argv.slice(2);if(!command||command==='--help'){console.log(help);}else{
    const allowed=command==='inputs'?['--split','--out']:command==='controls'?['--split','--kind','--out']:command==='check'?['--input','--review','--out','--template']:[];
    if(!allowed.length)throw new Error('Unknown command. Use --help.');const opts={};
    for(let i=0;i<args.length;i+=2){if(!allowed.includes(args[i])||Object.hasOwn(opts,args[i])||!args[i+1]||args[i+1].startsWith('--'))throw new Error('Invalid or duplicate arguments. Use --help.');opts[args[i]]=args[i+1];}
    let result;
    if(command==='inputs'||command==='controls'){if(!opts['--split'])throw new Error('Choose --split.');result=command==='inputs'?exportedInputs(opts['--split']):controlCandidates(opts['--split'],opts['--kind']);}
    else {if(!opts['--input'])throw new Error('Supply --input.');result=await evaluateCandidates(await load(opts['--input']),opts['--review']?await load(opts['--review']):null);if(opts['--template'])await save(opts['--template'],reviewTemplate(result));if(result.counts.structurallyInvalid||result.counts.semanticReviewFailed)process.exitCode=2;}
    if(opts['--out']){await save(opts['--out'],result);console.log(JSON.stringify({saved:resolve(opts['--out']),...(result.counts?{counts:result.counts}:{}),semanticApproval:false}));}else console.log(evaluationJSON(result));
  }
}catch(e){console.error(e.message);process.exitCode=1;}
