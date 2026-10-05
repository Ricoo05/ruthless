import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {sha256,semanticInputs,semanticInputHash,validateSemanticRun,semanticEvaluation,SEMANTIC_MODEL} from '../dist/semantic-run.mjs';
import {contextPair,createContextReview,contextReviewIsCurrent} from '../dist/context-review.mjs';
import {linkageFixtures} from '../dist/linkage-fixtures.mjs';
const retained=JSON.parse(await fs.readFile(new URL('../dist/semantic-run.json',import.meta.url),'utf8'));
const reviewInput=extra=>({reviewer:'Authored QA reviewer',note:'Check exact event date and fictional location; this remains a proposal.',leftPlaceQuote:'',rightPlaceQuote:'',leftTimeQuote:'',rightTimeQuote:'',placeRelation:'Unknown',timeRelation:'Unknown',conclusion:'Insufficient context',reportRelationship:'Unknown',...extra});
test('retained real inference is bound to all 64 inputs and the pinned model configuration',async()=>{
 const run=await validateSemanticRun(retained);assert.equal(run.sources.length,64);assert.equal(run.rows.length,16);assert.equal(run.model.dimensions,384);assert.deepEqual(run.model,SEMANTIC_MODEL);assert.ok(run.sources.every(r=>r.truncated===false&&r.tokens<=128));assert.equal(await sha256('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');assert.notEqual(run,retained);
});
test('model input fingerprint ignores labels and rationale but changes with source text or known dates',async()=>{
 const changed=structuredClone(linkageFixtures);for(const c of changed){const positive=c.candidates.find(r=>r.label==='Related'),negative=c.candidates.find(r=>r.label==='Unrelated');positive.label='Unrelated';negative.label='Related';for(const r of c.candidates)r.reason='Changed authored evaluation rationale';}
 assert.equal(await semanticInputHash(changed),await semanticInputHash());const checked=await validateSemanticRun(retained,changed);assert.deepEqual(semanticEvaluation('evaluation',checked,changed).rows.map(r=>r.ranking),semanticEvaluation('evaluation',retained).rows.map(r=>r.ranking));
 for(const patch of [{text:'Changed original paragraph'},{recordedAt:'2026-10-04'}]){const s=structuredClone(linkageFixtures);Object.assign(s[0].query,patch);await assert.rejects(validateSemanticRun(retained,s),/stale/);}
 assert.ok(semanticInputs().every(c=>!('label' in c.query)&&c.candidates.every(r=>!('reason' in r))));
});
test('future candidate additions cannot affect saved embeddings, input fitting or ranking',async()=>{
 const s=structuredClone(linkageFixtures);s[0].candidates.push({id:'future-only',text:'Different future-only authored paragraph',reportedAt:'2026-10-05',recordedAt:'2026-10-06',label:'Unrelated',reason:'Unavailable at issuance.'});assert.equal(await semanticInputHash(s),await semanticInputHash());await validateSemanticRun(retained,s);assert.deepEqual(semanticEvaluation('development',retained,s).rows[0].ranking,semanticEvaluation('development',retained).rows[0].ranking);assert.equal(semanticEvaluation('development',retained,s).rows[0].excluded,1);
});
test('stale sources, truncation, malformed scores, duplicate IDs and model changes reject atomically',async()=>{
 const changes=[r=>r.sources[0].sha256='0'.repeat(64),r=>r.sources[0].truncated=true,r=>r.sources[0].tokens=129,r=>r.rows[0].scores[0].cosine=NaN,r=>r.rows[0].scores[0].cosine=1.01,r=>r.rows[0].scores[1].id=r.rows[0].scores[0].id,r=>r.model.revision='0'.repeat(40),r=>r.rows.pop(),r=>r.assets=[]];for(const change of changes){const r=structuredClone(retained);change(r);await assert.rejects(validateSemanticRun(r));}
});
test('semantic ranking can retrieve a related Hindi account without shared English tokens and preserves inputs',async()=>{
 const checked=await validateSemanticRun(retained),before=JSON.stringify(checked),report=semanticEvaluation('evaluation',checked),row=report.rows.find(r=>r.id==='eval-translation');assert.ok(row.ranking.some(r=>r.id==='eval-translation-b7'));assert.equal(report.metrics.queries,8);assert.equal(report.metrics.correctTop1+report.metrics.falseTop1+report.metrics.unresolvedTop1+report.metrics.noResults,8);assert.equal(JSON.stringify(checked),before);assert.throws(()=>semanticEvaluation('invalid',checked));
});
test('different event dates require exact bilateral quotations and produce source-bound proposals',async()=>{
 const c=linkageFixtures.find(c=>c.id==='eval-date'),pair=contextPair(c,'eval-date-b7'),input=reviewInput({leftPlaceQuote:'fictional Reva school',rightPlaceQuote:'fictional Reva school',leftTimeQuote:'4 October',rightTimeQuote:'4 July',placeRelation:'Matches',timeRelation:'Conflicts',conclusion:'Different event proposed'}),before=JSON.stringify(pair);const review=await createContextReview(pair,input);assert.equal(review.status,'Analyst proposal');assert.equal(review.citations.rightTime.quote,'4 July');assert.equal(pair.right.text.slice(review.citations.rightTime.start,review.citations.rightTime.end),'4 July');assert.equal(await contextReviewIsCurrent(review,pair),true);assert.equal(JSON.stringify(pair),before);assert.equal('approved' in review,false);
});
test('same-event proposals retain contradiction separately from event relatedness',async()=>{
 const c=linkageFixtures.find(c=>c.id==='eval-denial'),pair=contextPair(c,'eval-denial-b7'),review=await createContextReview(pair,reviewInput({leftPlaceQuote:'fictional Tavi observatory',rightPlaceQuote:'fictional Tavi observatory',leftTimeQuote:'2 October',rightTimeQuote:'2 October',placeRelation:'Matches',timeRelation:'Matches',conclusion:'Same event proposed',reportRelationship:'Contradictory account'}));assert.equal(review.reportRelationship,'Contradictory account');assert.equal(await contextReviewIsCurrent(review,pair),true);assert.equal('corroborated' in review,false);
});
test('missing event context stays unresolved; invalid quotes, fabricated context and unsupported conclusions reject',async()=>{
 const c=linkageFixtures.find(c=>c.id==='eval-insufficient'),pair=contextPair(c,'eval-insufficient-b7');assert.equal((await createContextReview(pair,reviewInput())).conclusion,'Insufficient context');for(const patch of [{leftPlaceQuote:'Fabricated place'},{conclusion:'Same event proposed'},{conclusion:'Different event proposed'},{placeRelation:'Matches'},{reviewer:''},{note:''},{leftTimeQuote:'1'}])await assert.rejects(createContextReview(pair,reviewInput(patch)));
 const repeated={...pair,left:{...pair.left,text:'Place and time then Place and time again'}};await assert.rejects(createContextReview(repeated,reviewInput({leftPlaceQuote:'Place'})),/ambiguous/);
});
test('source edits, availability changes and altered citation offsets invalidate earlier reviews',async()=>{
 const c=linkageFixtures.find(c=>c.id==='eval-date'),pair=contextPair(c,'eval-date-b7'),review=await createContextReview(pair,reviewInput({leftTimeQuote:'4 October',rightTimeQuote:'4 July',timeRelation:'Conflicts',conclusion:'Different event proposed'}));for(const changed of [{...pair,asOf:'2026-10-06'},{...pair,right:{...pair.right,text:pair.right.text+' Correction.'}},{...pair,left:{...pair.left,recordedAt:'2026-10-04'}}])assert.equal(await contextReviewIsCurrent(review,changed),false);const altered=structuredClone(review);altered.citations.leftTime.start++;assert.equal(await contextReviewIsCurrent(altered,pair),false);const future=structuredClone(c);future.candidates[0].recordedAt='2026-10-06';assert.throws(()=>contextPair(future,future.candidates[0].id),/not available/);
});
