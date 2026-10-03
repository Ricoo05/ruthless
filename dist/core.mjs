export const CATALOG_URL = 'https://raw.githubusercontent.com/cisagov/kev-data/develop/known_exploited_vulnerabilities.json';
export const SOURCE_URL = 'https://github.com/cisagov/kev-data';
export const STATUSES = ['Unreviewed','Investigating','Remediated','Accepted risk','Not applicable'];
export const MAX_FINDINGS = 2000;
export const MAX_PROJECT_BYTES = 12_000_000;
export const MAX_CSV_BYTES = 2_000_000;
const encoder = new TextEncoder();
export const utf8Bytes = value => encoder.encode(value).byteLength;
const CVE = /^CVE-\d{4}-\d{4,}$/;
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const fail = message => { throw new Error(message); };
function text(value,field,max=200,required=true) {
  if(typeof value!=='string'||value.length>max||(required&&!value.trim())) fail(`${field} must be ${required?'non-empty ':''}text of at most ${max} characters.`);
  return value.trim();
}
export function parseCSV(input) {
  if(typeof input!=='string'||utf8Bytes(input)>MAX_CSV_BYTES) fail('CSV must be text no larger than 2 MB in UTF-8.');
  input=input.replace(/^\uFEFF/,'');
  const rows=[];let row=[],cell='',quoted=false,closed=false;
  const pushCell=()=>{row.push(cell);cell='';closed=false;};
  const pushRow=()=>{pushCell();if(row.some(x=>x.trim()))rows.push(row);row=[];if(rows.length>MAX_FINDINGS+1)fail(`Maximum ${MAX_FINDINGS} findings.`);};
  for(let i=0;i<input.length;i++){
    const c=input[i];
    if(quoted){if(c==='"'){if(input[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
    if(c===','){pushCell();continue;}
    if(c==='\n'||c==='\r'){if(c==='\r'&&input[i+1]==='\n')i++;pushRow();continue;}
    if(closed){if(c===' '||c==='\t')continue;fail('Unexpected character after a closing CSV quote.');}
    if(c==='"'){if(cell.length)fail('A CSV quote must start a field.');quoted=true;}else cell+=c;
  }
  if(quoted)fail('CSV has an unclosed quoted field.');
  if(cell||row.length||closed)pushRow();
  if(rows.length<2)fail('Include a header and at least one finding.');
  const headers=rows.shift().map(x=>x.trim().toLowerCase());
  if(new Set(headers).size!==headers.length)fail('CSV contains duplicate column names.');
  const required=['asset','cve','criticality','internet_exposed'];
  for(const h of required)if(!headers.includes(h))fail(`Missing required column: ${h}.`);
  const allowed=[...required,'owner','mission'];
  for(const h of headers)if(!allowed.includes(h))fail(`Unknown column: ${h}. Use the supplied template.`);
  const findings=rows.map((r,i)=>{
    if(r.length!==headers.length)fail(`Row ${i+2}: expected ${headers.length} columns, received ${r.length}.`);
    const v=Object.fromEntries(headers.map((h,j)=>[h,r[j].trim()]));
    if(!/^[1-5]$/.test(v.criticality))fail(`Row ${i+2}: criticality must be an integer from 1 to 5.`);
    if(!/^(true|false)$/i.test(v.internet_exposed))fail(`Row ${i+2}: internet_exposed must be true or false.`);
    try{return normalizeFinding({...v,cve:v.cve.toUpperCase(),criticality:Number(v.criticality),internet_exposed:v.internet_exposed.toLowerCase()==='true',owner:v.owner||'Unassigned',mission:v.mission||'Unspecified',status:'Unreviewed',notes:''});}catch(e){fail(`Row ${i+2}: ${e.message}`);}
  });
  assertUnique(findings);return findings;
}
export function findingId(asset,cve){return `${asset.toLowerCase()}\u001f${cve}`;}
export function normalizeFinding(v){
  if(!object(v))fail('Invalid finding.');
  const asset=text(v.asset,'asset',150),cve=text(v.cve,'cve',40);
  if(!CVE.test(cve))fail('cve must look like CVE-2024-3400.');
  if(!Number.isInteger(v.criticality)||v.criticality<1||v.criticality>5)fail('criticality must be 1–5.');
  if(typeof v.internet_exposed!=='boolean')fail('internet_exposed must be a boolean.');
  if(!STATUSES.includes(v.status))fail('Unknown review status.');
  const notes=text(v.notes,'notes',4000,false);
  if(['Accepted risk','Not applicable','Remediated'].includes(v.status)&&!notes)fail('This decision requires a supporting note.');
  return {id:findingId(asset,cve),asset,cve,criticality:v.criticality,internet_exposed:v.internet_exposed,owner:text(v.owner,'owner',150),mission:text(v.mission,'mission',200),status:v.status,notes};
}
function assertUnique(findings){const seen=new Set();for(const f of findings){if(seen.has(f.id))fail(`Duplicate asset/CVE pair: ${f.asset} / ${f.cve}.`);seen.add(f.id);}}
export function validateCatalog(c){
  if(!object(c)||!Array.isArray(c.vulnerabilities)||c.vulnerabilities.length===0||c.vulnerabilities.length>30000)fail('Invalid or empty CISA KEV catalog.');
  const catalogVersion=text(c.catalogVersion,'catalogVersion',80),dateReleased=text(c.dateReleased,'dateReleased',80);
  if(!Number.isFinite(Date.parse(dateReleased)))fail('Invalid catalog release date.');
  if(c.count!==c.vulnerabilities.length)fail('Catalog count does not match its entries.');
  const ids=new Set();const vulnerabilities=c.vulnerabilities.map(v=>{
    if(!object(v)||!CVE.test(v.cveID)||ids.has(v.cveID))fail('Catalog has an invalid or duplicate CVE.');ids.add(v.cveID);
    const item={};for(const [key,max] of [['cveID',40],['vendorProject',500],['product',500],['vulnerabilityName',2000],['shortDescription',10000],['requiredAction',10000],['dateAdded',40],['dueDate',40],['knownRansomwareCampaignUse',100]])item[key]=text(v[key],key,max);
    for(const key of ['dateAdded','dueDate'])if(!/^\d{4}-\d{2}-\d{2}$/.test(item[key])||!Number.isFinite(Date.parse(item[key]))||new Date(item[key]).toISOString().slice(0,10)!==item[key])fail('Catalog has an invalid date.');
    if(!['Known','Unknown'].includes(item.knownRansomwareCampaignUse))fail('Catalog has an invalid ransomware evidence value.');
    item.notes=typeof v.notes==='string'?v.notes.slice(0,15000):'';return item;
  });return {catalogVersion,dateReleased,count:vulnerabilities.length,vulnerabilities};
}
export function analyze(findings,catalog){
  const index=new Map(catalog.vulnerabilities.map(x=>[x.cveID,x]));
  return findings.map(f=>{const evidence=index.get(f.cve)||null;const factors=[{label:'Known exploitation (CISA KEV)',points:evidence?50:0},{label:`Business criticality (${f.criticality}/5)`,points:f.criticality*5},{label:'Internet exposed',points:f.internet_exposed?20:0},{label:'CISA reports ransomware use',points:evidence?.knownRansomwareCampaignUse==='Known'?5:0}];const score=factors.reduce((a,x)=>a+x.points,0);return {...f,evidence,factors,score,priority:score>=75?'High':score>=50?'Elevated':'Standard'};}).sort((a,b)=>b.score-a.score||a.asset.localeCompare(b.asset)||a.cve.localeCompare(b.cve));
}
export function filterFindings(items,{query='',status='all',evidence='all'}={}){
  const q=query.trim().toLowerCase();return items.filter(x=>(status==='all'||x.status===status)&&(evidence==='all'||(evidence==='kev'?!!x.evidence:!x.evidence))&&(!q||[x.asset,x.cve,x.owner,x.mission,x.evidence?.vendorProject,x.evidence?.product].join(' ').toLowerCase().includes(q)));
}
export function reviewFinding(project,id,status,notes,now=new Date().toISOString()){
  const index=project.findings.findIndex(x=>x.id===id);if(index<0)fail('Finding no longer exists.');
  const previous=project.findings[index],next=normalizeFinding({...previous,status,notes});
  if(previous.status===next.status&&previous.notes===next.notes)return project;
  if(project.history.length>=10000)fail('History limit reached. Export a brief and start a new project.');
  const updated={...project,findings:project.findings.map((x,i)=>i===index?next:x),history:[...project.history,{at:now,asset:next.asset,cve:next.cve,from:previous.status,to:next.status,notes:next.notes}]};
  serializeProject(updated);
  return updated;
}
export function makeProject(findings,catalog,mode='imported') {
  const project={format:'ruthless-project',version:1,mode,createdAt:new Date().toISOString(),catalog,findings,history:[]};
  serializeProject(project);
  return project;
}
export function replaceCatalog(current,original,catalog,hasDraft=false){
  if(current!==original||hasDraft)fail('Workspace changed during catalog loading. Finish your review and retry.');
  const next=validateCatalog(catalog);
  if(Date.parse(next.dateReleased)<Date.parse(current.catalog.dateReleased))fail('This catalog is older than the current snapshot.');
  const updated={...current,catalog:next};
  serializeProject(updated);
  return updated;
}
export function parseProject(input){
  if(typeof input!=='string'||utf8Bytes(input)>MAX_PROJECT_BYTES)fail('Project must be no larger than 12 MB in UTF-8.');
  let v;try{v=JSON.parse(input);}catch{fail('Project is not valid JSON.');}
  if(!object(v)||v.format!=='ruthless-project'||v.version!==1)fail('Unsupported project format or version.');
  if(!['demo','imported'].includes(v.mode))fail('Invalid project mode.');
  if(typeof v.createdAt!=='string'||!Number.isFinite(Date.parse(v.createdAt)))fail('Invalid project creation date.');
  if(!Array.isArray(v.findings)||!v.findings.length||v.findings.length>MAX_FINDINGS)fail(`Project must contain 1–${MAX_FINDINGS} findings.`);
  const findings=v.findings.map(normalizeFinding);assertUnique(findings);
  if(!Array.isArray(v.history)||v.history.length>10000)fail('Invalid project history.');
  const history=v.history.map(h=>{
    if(!object(h)||!STATUSES.includes(h.from)||!STATUSES.includes(h.to)||typeof h.at!=='string'||!Number.isFinite(Date.parse(h.at)))fail('Invalid history record.');
    const asset=text(h.asset,'history asset',150),cve=text(h.cve,'history cve',40);
    if(!findings.some(f=>f.id===findingId(asset,cve)))fail('History references an unknown finding.');
    return {at:h.at,asset,cve,from:h.from,to:h.to,notes:text(h.notes,'history notes',4000,false)};
  });
  const project={format:v.format,version:1,mode:v.mode,createdAt:v.createdAt,catalog:validateCatalog(v.catalog),findings,history};
  serializeProject(project);
  return project;
}
export function serializeProject(project){
  const serialized=JSON.stringify(project);
  if(utf8Bytes(serialized)>MAX_PROJECT_BYTES)fail('Project would exceed the 12 MB save/open limit. Current work is unchanged. Export a brief and start a smaller project.');
  return serialized;
}
export function exportCSV(items,catalog=null,sourceLabel='Unverified snapshot'){
  const cell=v=>{let s=String(v??'');if(/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  const keys=['asset','cve','score','priority','status','owner','mission','criticality','internet_exposed','known_exploited','notes','catalog_version','catalog_released','catalog_origin'];
  return [keys,...items.map(f=>keys.map(k=>k==='known_exploited'?!!f.evidence:k==='catalog_version'?catalog?.catalogVersion:k==='catalog_released'?catalog?.dateReleased:k==='catalog_origin'?sourceLabel:f[k]))].map(row=>row.map(cell).join(',')).join('\r\n');
}
export function exportBrief(project,items=analyze(project.findings,project.catalog),sourceLabel='Saved catalog snapshot — provenance not independently verified'){
  const clean=x=>String(x).replace(/[\r\n]+/g,' ').replace(/[\\`*_{}\[\]<>#]/g,'');
  const lines=['# Project Ruthless — Exposure brief','',`Generated: ${new Date().toISOString()}`,`Workspace: ${project.mode==='demo'?'SYNTHETIC DEMO ASSETS':'Imported findings (analyst supplied)'}`,`Catalog version: ${clean(project.catalog.catalogVersion)}; released ${clean(project.catalog.dateReleased)}`,`Catalog origin: ${clean(sourceLabel)}`,`Publisher reference: ${SOURCE_URL}`,'',`${items.length} findings in this export. Scores are a prioritization heuristic, not exploit probabilities. Asset/CVE applicability is supplied by the analyst and has not been independently verified. Absence from KEV does not mean safe. CISA due dates are US federal deadlines, not Indian legal deadlines. Review history is editable project data, not a tamper-evident audit log.`,''];
  for(const f of items){lines.push(`## ${clean(f.asset)} / ${f.cve}`,`Priority: ${f.priority} (${f.score}/100) | Status: ${f.status}`,`Owner: ${clean(f.owner)} | Mission: ${clean(f.mission)}`,`Internet exposed: ${f.internet_exposed?'Yes':'No'} | Criticality: ${f.criticality}/5`,...f.factors.map(x=>`- ${x.label}: ${x.points}`),f.evidence?`CISA evidence: ${clean(f.evidence.vulnerabilityName)}; added ${f.evidence.dateAdded}.`:'CISA evidence: No match in this snapshot; broader assessment required.',f.evidence?`CISA required action: ${clean(f.evidence.requiredAction)}`:'Action: Verify applicability and consult the vendor advisory.',`CVE reference: https://www.cve.org/CVERecord?id=${f.cve}`,`Analyst note: ${clean(f.notes)||'None recorded'}`,'');}
  return lines.join('\n');
}
export const TEMPLATE='asset,cve,criticality,internet_exposed,owner,mission\r\nPerimeter gateway,CVE-2024-3400,5,true,Network team,Engineering access\r\n';
export const DEMO_CSV=`asset,cve,criticality,internet_exposed,owner,mission
Engineering perimeter gateway,CVE-2024-3400,5,true,Network operations,Engineering access
Supplier transfer service,CVE-2023-34362,4,true,IT operations,Supplier collaboration
Remote access appliance,CVE-2023-4966,4,true,Network operations,Remote engineering
Build artifact service,CVE-2021-44228,5,false,Platform team,Software delivery
Engineering log service,CVE-2021-44228,3,false,Platform team,Engineering telemetry
Linux validation workstation,CVE-2024-3094,2,false,Lab operations,Test environment`;
