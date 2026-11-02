import {execFileSync} from 'node:child_process';
const git=(args,input)=>execFileSync('git',args,{input,maxBuffer:128*1024*1024});
const entries=git(['rev-list','--objects','--all']).toString().trim().split('\n').filter(Boolean);
const paths=new Map(entries.map(line=>[line.split(' ')[0],line.slice(41)]));
const objects=git(['cat-file','--batch'],entries.map(line=>line.split(' ')[0]).join('\n')+'\n');
const patterns=[/sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{35,}/,/gh[pousr]_[A-Za-z0-9]{30,}/,/github_pat_[A-Za-z0-9_]{30,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/https:\/\/[^\s/@:]+:[^\s/@]{12,}@/];
let offset=0,scannedBlobs=0;const findings=[];
while(offset<objects.length){
  const end=objects.indexOf(10,offset);if(end<0)throw new Error('Truncated object header');
  const [id,type,sizeText]=objects.subarray(offset,end).toString().split(' '),size=Number(sizeText);
  if(!Number.isSafeInteger(size)||size<0||end+1+size>=objects.length)throw new Error('Invalid object length');
  const data=objects.subarray(end+1,end+1+size);offset=end+size+2;
  if(type!=='blob')continue;
  scannedBlobs++;if(patterns.some(pattern=>pattern.test(data.toString('utf8'))))findings.push({object:id,path:paths.get(id)});
}
console.log(JSON.stringify({scannedBlobs,potentialSecrets:findings,limitation:'Pattern scan only; not comprehensive secret detection.'},null,2));
if(findings.length)process.exitCode=1;
