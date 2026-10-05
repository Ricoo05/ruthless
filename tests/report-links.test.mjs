import test from 'node:test';
import assert from 'node:assert/strict';
import {compareReports,reportTokens} from '../dist/report-links.mjs';
import {demoWorkspace,stageDocument,incorporateDocument} from '../dist/threat-core.mjs';
import {regionalScenario} from '../dist/signals-scenario.mjs';
const window={from:'2026-10-01',to:'2026-10-05',scope:'All'};
const empty=()=>({...demoWorkspace(),evidence:[]});
const doc=(id,text,extra={})=>({id,assessmentId:'training-domestic',title:'Authored control',publisher:`Authored publisher ${id}`,originGroup:id,url:'',reportedAt:'2026-10-03',recordedAt:'2026-10-03',language:'English',locator:'Paragraph 1',accessNote:'Synthetic authored control',excerpt:text,synthetic:true,...extra});
function sourcePair(a,b){let w=empty();w=stageDocument(w,doc('doc-a',a),'2026-10-03');return stageDocument(w,doc('doc-b',b),'2026-10-03');}

test('lexical weights agree with a hand-calculated smoothed IDF cosine and do not mutate the workspace',()=>{
  const w=sourcePair('alpha beta gamma delta','alpha beta gamma epsilon'),before=JSON.stringify(w),r=compareReports(w,window);
  const rare=1+Math.log(3/2),expected=3/(3+rare*rare);assert.equal(r.pairs.length,1);assert.ok(Math.abs(r.pairs[0].similarity-expected)<1e-12);assert.deepEqual(r.pairs[0].sharedTerms,['alpha','beta','gamma']);assert.equal(JSON.stringify(w),before);assert.equal(r.kind,'lexical_report_comparison');
});
test('negated and contrary accounts remain visible as similarity, never as corroboration or merged evidence',()=>{
  const w=sourcePair('A drone alert near the facility remains unverified','No drone alert near the facility was confirmed'),r=compareReports(w,window);assert.equal(r.pairs.length,1);assert.ok(r.pairs[0].left.text.includes('drone'));assert.ok(r.pairs[0].right.text.includes('drone'));assert.equal(w.evidence.length,0);assert.equal('probability' in r.pairs[0],false);assert.ok(r.limitations.some(t=>t.includes('Negations')));
});
test('same recorded groups and cross-case reporting labels do not become inferred actor links',()=>{
  const w=regionalScenario(demoWorkspace()),r=compareReports(w,window);assert.ok(r.pairs.some(p=>p.sameRecordedGroup&&p.crossCase));assert.ok(r.pairs.some(p=>!p.sameRecordedGroup));assert.ok(r.pairs.every(p=>!('actor' in p)&&!('independent' in p)));assert.equal(w.documents.length,4);
});
test('future recording and scope boundaries exclude data from both comparisons and vocabulary fitting',()=>{
  const w=sourcePair('alpha beta gamma delta','alpha beta gamma epsilon'),baseline=compareReports(w,window);const later=stageDocument(w,doc('future','alpha alpha alpha beta gamma epsilon',{reportedAt:'2026-10-05',recordedAt:'2026-10-06'}),'2026-10-06');assert.deepEqual(compareReports(later,window),baseline);
  const cross=stageDocument(w,doc('cross','alpha beta gamma delta',{assessmentId:'training-crossborder'}),'2026-10-03');assert.equal(compareReports(cross,{...window,scope:'Domestic'}).comparedRecords,2);
});
test('known corrections supersede originals even when the replacement is outside the lower date boundary',()=>{
  let w=sourcePair('alpha beta gamma old','alpha beta gamma original');w=stageDocument(w,doc('revised','entirely different revised words',{reportedAt:'2026-10-03',recordedAt:'2026-10-04',publisher:'Authored publisher doc-a',originGroup:'doc-a',supersedesDocumentId:'doc-a',revisionNote:'Authored correction',accessAcknowledged:true}),'2026-10-04');
  const early=compareReports(w,{...window,to:'2026-10-03'});assert.ok(early.pairs.some(p=>[p.left.id,p.right.id].includes('doc-a')));const current=compareReports(w,window);assert.ok(current.pairs.every(p=>p.left.id!=='doc-a'&&p.right.id!=='doc-a'));assert.equal(compareReports(w,{...window,from:'2026-10-04'}).comparedRecords,0);
});
test('incorporated paraphrases are not counted again and source/evidence identities remain distinct',()=>{
  let w=sourcePair('alpha beta gamma delta','alpha beta gamma epsilon');w=incorporateDocument(w,'doc-a',{id:'evidence-a',title:'Analyst paraphrase',statement:'alpha beta gamma changed',claimState:'Reported',relation:'Supports',reviewNote:'Authored intake review',accessAcknowledged:true},'2026-10-03');assert.equal(compareReports(w,window).comparedRecords,2);
  w.evidence.push({...w.evidence[0],id:'doc-b',sourceDocumentId:'',statement:'alpha beta gamma epsilon'});const r=compareReports(w,window);assert.equal(r.comparedRecords,3);assert.ok(r.pairs.some(p=>p.left.id===p.right.id&&p.left.recordKey!==p.right.recordKey));
});
test('Unicode tokens preserve Hindi marks and normalized comparison does not replace original text',()=>{
  assert.deepEqual(reportTokens('जोखिम क्षेत्र घटना NO threat'),['जोखिम','क्षेत्र','घटना','no','threat']);const w=sourcePair('जोखिम क्षेत्र घटना', 'जोखिम क्षेत्र घटना');const p=compareReports(w,window).pairs[0];assert.ok(Math.abs(p.similarity-1)<1e-12);assert.equal(p.left.text,'जोखिम क्षेत्र घटना');assert.deepEqual(reportTokens('ＡＬＰＨＡ Beta'),['alpha','beta']);assert.throws(()=>reportTokens('x'.repeat(4001)));
});
test('empty, boilerplate-only and insufficient-overlap corpora produce no spurious pairs',()=>{
  assert.equal(compareReports(empty(),window).pairsEvaluated,0);assert.equal(compareReports(sourcePair('fictional authored exercise','training fictional control'),window).pairs.length,0);assert.equal(compareReports(sourcePair('alpha beta','alpha beta'),window).pairs.length,0);for(const patch of [{minSimilarity:NaN},{minSimilarity:.09},{minSimilarity:1.1},{from:'2026-10-06'},{to:'2026-02-30'},{scope:'Unknown'}])assert.throws(()=>compareReports(empty(),{...window,...patch}));
});
test('comparison bounds show excluded records and cap retained pairs with deterministic ordering',()=>{
  const w=demoWorkspace(),base=w.evidence[0];w.evidence=Array.from({length:201},(_,i)=>({...base,id:`bounded-${String(i).padStart(3,'0')}`,statement:'alpha beta gamma delta'}));const r=compareReports(w,window);assert.equal(r.eligibleRecords,201);assert.equal(r.comparedRecords,200);assert.equal(r.excludedRecords,1);assert.equal(r.pairsEvaluated,19900);assert.equal(r.qualifyingPairs,19900);assert.equal(r.pairs.length,40);assert.ok(r.pairs.every(p=>p.left.id!=='bounded-200'&&p.right.id!=='bounded-200'));assert.deepEqual(compareReports({...w,evidence:[...w.evidence].reverse()},window),r);
});
