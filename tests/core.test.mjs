import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseCSV,validateCatalog,analyze,filterFindings,reviewFinding,makeProject,parseProject,serializeProject,exportCSV,exportBrief,DEMO_CSV,TEMPLATE} from '../dist/core.mjs';
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
