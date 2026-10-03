import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MAX_PROJECT_BYTES,MAX_CSV_BYTES,utf8Bytes,replaceCatalog,parseCSV,validateCatalog,analyze,filterFindings,reviewFinding,makeProject,parseProject,serializeProject,exportCSV,exportBrief,DEMO_CSV,TEMPLATE} from '../dist/core.mjs';
const catalog=validateCatalog(JSON.parse(readFileSync(new URL('../dist/kev.json',import.meta.url),'utf8')));
const findings=parseCSV(DEMO_CSV);
test('official snapshot validates and exact matching never invents KEV evidence',()=>{
  assert.ok(catalog.count>1000);const rows=analyze(findings,catalog);
  assert.equal(rows.length,6);assert.equal(rows.filter(x=>x.evidence).length,5);
  assert.equal(rows.find(x=>x.cve==='CVE-2024-3094').evidence,null);
  assert.ok(rows.every(x=>x.score>=0&&x.score<=100));
  for(let i=1;i<rows.length;i++)assert.ok(rows[i-1].score>=rows[i].score);
});
test('criticality and exposure change priority independently of catalog membership',()=>{
  const f=findings[0];const rows=analyze([{...f,criticality:1,internet_exposed:false},{...f,criticality:5,internet_exposed:true}],catalog);
  assert.equal(rows[0].score-rows[1].score,40);
});
test('CSV accepts quoted commas, embedded newlines, escaped quotes, BOM and CRLF',()=>{
  const result=parseCSV('\uFEFFasset,cve,criticality,internet_exposed,owner,mission\r\n"Gateway, A",cve-2024-3400,5,TRUE,"Team ""Alpha""","line 1\nline 2"\r\n');
  assert.equal(result[0].asset,'Gateway, A');assert.equal(result[0].owner,'Team "Alpha"');assert.equal(result[0].cve,'CVE-2024-3400');assert.equal(result[0].mission,'line 1\nline 2');
});
test('CSV rejects invalid rows atomically instead of silently dropping findings',()=>{
  const header='asset,cve,criticality,internet_exposed\n';
  for(const row of ['asset,garbage,5,true','asset,CVE-2024-3400,0,true','asset,CVE-2024-3400,5,yes','asset,CVE-2024-3400,5.0,true','asset,CVE-2024-3400,5,true,extra','"unclosed,CVE-2024-3400,5,true','"asset"junk,CVE-2024-3400,5,true'])assert.throws(()=>parseCSV(header+row));
  assert.throws(()=>parseCSV(header+'A,CVE-2024-3400,5,true\na,CVE-2024-3400,4,false'),/Duplicate/);
  assert.throws(()=>parseCSV('asset,asset,cve,criticality,internet_exposed\na,b,CVE-2024-3400,5,true'),/duplicate column/);
  assert.throws(()=>parseCSV(header+Array.from({length:2001},(_,i)=>`Asset ${i},CVE-2024-3400,5,true`).join('\n')),/Maximum/);
  assert.equal(parseCSV(TEMPLATE).length,1);
});
test('review requires justification for closure and preserves the original project',()=>{
  const p=makeProject(findings,catalog);assert.throws(()=>reviewFinding(p,findings[0].id,'Remediated',''),/supporting note/);
  assert.throws(()=>reviewFinding(p,findings[0].id,'Accepted risk',''),/supporting note/);
  assert.throws(()=>reviewFinding(p,findings[0].id,'Not applicable',''),/supporting note/);
  const next=reviewFinding(p,findings[0].id,'Remediated','Patch verified','2026-10-03T10:00:00Z');
  assert.equal(p.findings[0].status,'Unreviewed');assert.equal(next.findings[0].status,'Remediated');assert.equal(next.history.length,1);
  assert.equal(reviewFinding(next,findings[0].id,'Remediated','Patch verified'),next);
});
test('project export/import restores decisions and an identical evidence snapshot',()=>{
  const p=reviewFinding(makeProject(findings,catalog),findings[0].id,'Investigating','Check with owner');
  const restored=parseProject(serializeProject(p));assert.deepEqual(restored,p);assert.deepEqual(analyze(restored.findings,restored.catalog),analyze(p.findings,p.catalog));
});
test('project and catalog validation reject malformed or inconsistent state',()=>{
  const p=makeProject(findings,catalog);
  for(const change of [{version:2},{findings:[]},{history:[{at:'bad'}]},{mode:'production'},{findings:[...findings,findings[0]]}])assert.throws(()=>parseProject(JSON.stringify({...p,...change})));
  assert.throws(()=>validateCatalog({...catalog,count:0}),/count/);
  assert.throws(()=>validateCatalog({...catalog,vulnerabilities:[catalog.vulnerabilities[0],catalog.vulnerabilities[0]],count:2}),/duplicate/);
  assert.throws(()=>parseProject('{oops'),/valid JSON/);
});
test('filters combine query, exact status and evidence; no-match is explicit',()=>{
  const rows=analyze(findings,catalog);assert.equal(filterFindings(rows,{query:'network',evidence:'kev',status:'Unreviewed'}).length,2);assert.equal(filterFindings(rows,{query:'missing'}).length,0);assert.equal(filterFindings(rows,{evidence:'unknown'}).length,1);
});
test('CSV exports neutralize formula injection and quote embedded text',()=>{
  const f={...analyze(findings,catalog)[0],asset:'=1+1',notes:'"quoted", note'};
  const csv=exportCSV([f]);assert.ok(csv.includes('"\'=1+1"'));assert.ok(csv.includes('""quoted""'));assert.equal(csv.split('\r\n').length,2);
});
test('brief includes caveats, traceable evidence and all selected findings',()=>{
  const p=makeProject(findings,catalog,'demo'),brief=exportBrief(p);
  assert.ok(brief.includes('SYNTHETIC DEMO'));assert.ok(brief.includes('not exploit probabilities'));assert.ok(brief.includes('not Indian legal deadlines'));assert.equal((brief.match(/^## /gm)||[]).length,6);
});

function nearLimitProject(){
  const p=makeProject(findings,catalog);
  const entry={at:'2026-10-03T10:00:00Z',asset:findings[0].asset,cve:findings[0].cve,from:'Unreviewed',to:'Investigating',notes:'x'.repeat(4000)};
  const room=MAX_PROJECT_BYTES-utf8Bytes(serializeProject(p))-1000;
  const count=Math.floor(room/(utf8Bytes(JSON.stringify(entry))+1));
  p.history=Array.from({length:count},()=>({...entry}));
  return p;
}
test('a near-limit project remains exportable and reopenable',()=>{
  const p=nearLimitProject();const raw=serializeProject(p);
  assert.ok(utf8Bytes(raw)<MAX_PROJECT_BYTES);
  assert.ok(MAX_PROJECT_BYTES-utf8Bytes(raw)<6000);
  const restored=parseProject(raw);assert.equal(restored.history.length,p.history.length);
  assert.equal(serializeProject(restored),raw);
});
test('oversize review is rejected atomically using UTF-8 bytes',()=>{
  const p=nearLimitProject();const before=serializeProject(p);
  assert.throws(()=>reviewFinding(p,findings[0].id,'Investigating','अ'.repeat(4000)),/12 MB/);
  assert.equal(serializeProject(p),before);
  assert.equal(p.findings[0].status,'Unreviewed');
});
test('UTF-8 input limits cover non-ASCII files, not only character count',()=>{
  const tooBig='अ'.repeat(Math.floor(MAX_PROJECT_BYTES/3)+1);
  assert.ok(tooBig.length<MAX_PROJECT_BYTES);
  assert.throws(()=>parseProject(tooBig),/UTF-8/);
  assert.throws(()=>parseCSV('अ'.repeat(Math.floor(MAX_CSV_BYTES/3)+1)),/UTF-8/);
  assert.equal(utf8Bytes('भारत'),12);
});
test('catalog updates reject stale workspaces and drafts without modifying data',()=>{
  const original=makeProject(findings,catalog);
  const changed=reviewFinding(original,findings[0].id,'Investigating','Draft applied');
  assert.throws(()=>replaceCatalog(changed,original,catalog),/Workspace changed/);
  assert.throws(()=>replaceCatalog(original,original,catalog,true),/Workspace changed/);
  assert.equal(changed.findings[0].notes,'Draft applied');
  assert.equal(original.findings[0].status,'Unreviewed');
  const next=replaceCatalog(original,original,catalog);
  assert.notEqual(next,original);assert.deepEqual(next.catalog,catalog);
});
test('catalog updates reject older evidence and oversized results',()=>{
  const p=nearLimitProject();
  assert.throws(()=>replaceCatalog(p,p,{...catalog,dateReleased:'2000-01-01T00:00:00Z'}),/older/);
  const huge={...catalog,vulnerabilities:catalog.vulnerabilities.map((x,i)=>i<10?{...x,shortDescription:'अ'.repeat(10000)}:x)};
  assert.throws(()=>replaceCatalog(p,p,huge),/12 MB/);
  assert.equal(p.catalog,catalog);
});
test('calendar dates and ransomware evidence must be valid',()=>{
  for(const changed of [{dateAdded:'2026-02-30'},{knownRansomwareCampaignUse:'Definitely'}]){
    assert.throws(()=>validateCatalog({...catalog,count:1,vulnerabilities:[{...catalog.vulnerabilities[0],...changed}]}));
  }
});
test('reports carry source version and provenance without trusting file metadata',()=>{
  const p=makeProject(findings,catalog),rows=analyze(findings,catalog),label='Project file — unverified provenance';
  assert.ok(exportCSV(rows,catalog,label).includes('catalog_origin'));
  assert.ok(exportCSV(rows,catalog,label).includes(label));
  assert.ok(exportBrief(p,rows,label).includes(label));
  const restored=parseProject(JSON.stringify({...p,catalogOrigin:'Official verified data'}));
  assert.equal(Object.hasOwn(restored,'catalogOrigin'),false);
});
