import {access,open} from 'node:fs/promises';
import {resolve} from 'node:path';
import {executionPlan,runSyntheticEvaluation,validateExecutionAccess} from './ai-runner-core.mjs';
const help=`Synthetic-only AI runner. Default plan makes no API call.
node scripts/run-ai.mjs plan --model API_MODEL [--split development|holdout] [--max-cases 1..6] [--max-output-tokens 512..8000] --out NEW_FILE
node scripts/run-ai.mjs run --model API_MODEL [same options] --out NEW_FILE --allow-api
Run requires OPENAI_API_KEY in the process environment and explicit --allow-api. Never supply keys in arguments or the browser. One request per selected bundled fictional case, no retries, maximum six requests. Review the plan and authorize the chosen model/budget before running. No custom files or agency data accepted. Reports require human semantic review. Output files cannot be overwritten. Exit 0: plan saved or full structurally valid run; 2: failed/incomplete/structurally invalid evaluation; 1: invocation or file error.`;
try{
  const [command,...args]=process.argv.slice(2);if(!command||command==='--help')console.log(help);else{
    if(!['plan','run'].includes(command))throw new Error('Choose plan or run. Use --help.');
    const opts={};for(let i=0;i<args.length;i++){const k=args[i];if(Object.hasOwn(opts,k))throw new Error('Duplicate argument.');if(k==='--allow-api'&&command==='run')opts[k]=true;else{if(!['--model','--split','--max-cases','--max-output-tokens','--out'].includes(k)||!args[i+1]||args[i+1].startsWith('--'))throw new Error('Invalid arguments. Use --help.');opts[k]=args[++i];}}
    if(!opts['--out'])throw new Error('Choose a new --out file.');
    const options={model:opts['--model'],split:opts['--split']??'development',maxCases:opts['--max-cases']===undefined?1:Number(opts['--max-cases']),maxOutputTokens:opts['--max-output-tokens']===undefined?4000:Number(opts['--max-output-tokens'])};
    executionPlan(options);if(command==='run')validateExecutionAccess(process.env.OPENAI_API_KEY,opts['--allow-api']===true);const path=resolve(opts['--out']);try{await access(path);throw new Error('Output file exists; choose a new file.');}catch(e){if(e.code!=='ENOENT')throw e;}
    // Reserve the exclusive output before any paid request; a competing writer cannot waste a run.
    const file=await open(path,'wx');try{
      const result=command==='plan'?executionPlan(options):await runSyntheticEvaluation(options,{apiKey:process.env.OPENAI_API_KEY,allowApi:opts['--allow-api']===true});
      await file.writeFile(JSON.stringify(result)+'\n','utf8');await file.sync();
      console.log(JSON.stringify({saved:path,apiCalls:result.executions?.length??0,...(result.report?{counts:result.report.counts}:{}),semanticApproval:false}));if(result.report&&(result.report.counts.structurallyInvalid||result.executions.some(e=>e.status==='Failed')))process.exitCode=2;
    }finally{await file.close();}
  }
}catch(e){console.error(e.message);process.exitCode=1;}
