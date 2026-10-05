import test from 'node:test';
import assert from 'node:assert/strict';
import {rankBM25,rankWorkbench,knownCandidates,validateSuite,summarizeRankings,runLinkageEvaluation} from '../dist/linkage-lab-core.mjs';
import {linkageFixtures} from '../dist/linkage-fixtures.mjs';
const rec=(id,text,extra={})=>({id,text,reportedAt:'2026-10-03',recordedAt:'2026-10-03',...extra}),asOf='2026-10-05';
test('BM25 matches the formula with length normalization and unique query terms',()=>{
 const q=rec('q','alpha beta gamma'),docs=[rec('a','alpha beta gamma'),rec('b','alpha beta gamma delta')],r=rankBM25(q,docs,asOf);
 const idf=Math.log(1+.5/2.5),expected=3*idf*2.2/(1+1.2*(.25+.75*3/3.5));assert.equal(r[0].id,'a');assert.ok(Math.abs(r[0].score-expected)<1e-12);assert.deepEqual(rankBM25({...q,text:'alpha alpha beta gamma'},docs,asOf),r);
});
test('unavailable candidates do not affect corpus weighting or either ranking',()=>{
 const q=rec('q','alpha beta gamma'),docs=[rec('a','alpha beta gamma'),rec('b','alpha beta gamma delta')];for(const rank of [rankBM25,rankWorkbench]){const base=rank(q,docs,asOf);for(const patch of [{recordedAt:'2026-10-06'},{reportedAt:'2026-10-06'}])assert.deepEqual(rank(q,[...docs,rec('future','alpha beta gamma alpha alpha',patch)],asOf),base);}
});
test('ranking ignores answer labels and rationales, preserving inputs and deterministic tie order',()=>{
 const q=rec('q','alpha beta gamma'),docs=[rec('z','alpha beta gamma',{label:'Related',reason:'secret answer'}),rec('a','alpha beta gamma',{label:'Unrelated'})],before=JSON.stringify(docs);
 for(const rank of [rankBM25,rankWorkbench]){const base=rank(q,docs,asOf);assert.equal(base[0].id,'a');assert.deepEqual(rank(q,[...docs].reverse().map(r=>({...r,label:'Unresolved',reason:'changed answer'})),asOf),base);}assert.equal(JSON.stringify(docs),before);
});
test('absent lexical overlap produces no fabricated cross-language relationship',()=>{
 const q=rec('q','The reading room was closed after water entered'),docs=[rec('a','वाचनालय में पानी भरने के कारण उसे बंद किया गया')];assert.deepEqual(rankBM25(q,docs,asOf),[]);assert.deepEqual(rankWorkbench(q,docs,asOf),[]);
});
test('retrieval metrics keep wrong, unresolved and empty first results separate',()=>{
 const candidates=[{id:'p',label:'Related'},{id:'n',label:'Unrelated'},{id:'u',label:'Unresolved'}],ranking=ids=>ids.map(id=>({id,score:1}));
 const m=summarizeRankings([['p','n'],['n','p'],['u','n','p'],[]].map(ids=>({candidates,ranking:ranking(ids)})));assert.equal(m.correctTop1,1);assert.equal(m.falseTop1,1);assert.equal(m.unresolvedTop1,1);assert.equal(m.noResults,1);assert.equal(m.top1Success,.25);assert.equal(m.recallAt3,.75);assert.ok(Math.abs(m.mrr-(1+.5+1/3)/4)<1e-12);assert.equal(m.unrelatedTop3,3);assert.equal(m.unresolvedTop3,1);assert.equal(summarizeRankings([]).recallAt3,null);assert.throws(()=>summarizeRankings([{candidates,ranking:ranking(['p','p'])}]));
});
test('suite rejects story-family and exact-text leakage across partitions',()=>{
 validateSuite(linkageFixtures);for(const type of ['family','text']){const s=structuredClone(linkageFixtures),target=s.find(c=>c.split==='evaluation');if(type==='family')target.family=s[0].family;else target.query.text=s[0].query.text;assert.throws(()=>validateSuite(s),/crosses/);}
});
test('both partitions are reproducible without tuning or workspace mutation',()=>{
 const before=JSON.stringify(linkageFixtures);for(const split of ['development','evaluation']){const report=runLinkageEvaluation(split);assert.equal(report.results.length,2);for(const m of report.results){assert.equal(m.metrics.queries,8);assert.equal(m.rows.length,8);assert.equal(m.metrics.correctTop1+m.metrics.falseTop1+m.metrics.unresolvedTop1+m.metrics.noResults,8);}assert.deepEqual(runLinkageEvaluation(split),report);}assert.equal(JSON.stringify(linkageFixtures),before);
});
test('malformed dates, IDs, settings and labels fail before evaluation',()=>{
 const q=rec('q','alpha beta gamma'),docs=[rec('a','alpha beta gamma')];for(const change of [{recordedAt:'2026-10-06'},{reportedAt:'2026-02-30'},{text:'x'.repeat(4001)}])assert.throws(()=>knownCandidates({...q,...change},docs,asOf));assert.throws(()=>knownCandidates(q,[q],asOf));assert.throws(()=>rankBM25(q,docs,asOf,{k1:NaN}));assert.throws(()=>rankBM25(q,docs,asOf,{b:1.1}));assert.throws(()=>runLinkageEvaluation('unknown'));const s=structuredClone(linkageFixtures);s[0].candidates[0].label='Safe';assert.throws(()=>validateSuite(s));
});
