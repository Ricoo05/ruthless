import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {demoWorkspace,stageDocument,incorporateDocument,validateWorkspace,parseWorkspace,serializeWorkspace} from '../dist/threat-core.mjs';
import {linkReviewPair,retainLinkReview,linkReviewStates} from '../dist/link-review-core.mjs';
import {exactLinkQuote} from '../dist/link-review-records.mjs';
import {openWorkspaceStore} from '../backend/store.mjs';
const at='2026-10-05';
const doc=(id,excerpt,extra={})=>({id,assessmentId:'training-domestic',title:`Authored ${id}`,publisher:'Authored publisher',originGroup:'authored-group',url:'',reportedAt:'2026-10-03',recordedAt:'2026-10-03',language:'English',locator:'Paragraph 1',accessNote:'Authored fictional test.',excerpt,synthetic:true,...extra});
function fixture(){let w=demoWorkspace();w=stageDocument(w,doc('left','🔎 Routine observation at fictional Cedar depot on 3 October 2026.'),at);return stageDocument(w,doc('right','Routine observation at fictional Cedar depot on 4 October 2026.'),at);}
const data=(w,extra={})=>({id:'review-a',asOf:at,snapshot:linkReviewPair(w,'source_excerpt:left','source_excerpt:right',at),reviewer:'Analyst label',note:'Dates may describe different observations; source independence remains unverified.',leftPlaceQuote:'fictional Cedar depot',rightPlaceQuote:'fictional Cedar depot',leftTimeQuote:'3 October 2026',rightTimeQuote:'4 October 2026',placeRelation:'Matches',timeRelation:'Conflicts',conclusion:'Different events proposed',reportRelationship:'Unknown',...extra});
const reviewed=()=>{const w=fixture();return retainLinkReview(w,data(w),at);};

test('retained review recovers exact snapshots and quotations without changing evidence or case judgments',()=>{
  const w=fixture(),before=serializeWorkspace(w),next=retainLinkReview(w,data(w),at),r=next.linkReviews[0];
  assert.equal(serializeWorkspace(w),before);assert.deepEqual(next.evidence,w.evidence);assert.deepEqual(next.assessments,w.assessments);assert.deepEqual(parseWorkspace(serializeWorkspace(next)),next);assert.equal(next.version,8);
  for(const [key,q] of Object.entries(r.citations))assert.equal(r.snapshot[key.startsWith('left')?'left':'right'].text.slice(q.start,q.end),q.quote);
  assert.equal(linkReviewStates(next,at)[0].state,'Current source snapshot');assert.equal('approval' in r,false);
});
test('quotations reject fabrication, ambiguity, invented offsets and partial Unicode characters',()=>{
  const w=fixture();assert.throws(()=>retainLinkReview(w,data(w,{leftTimeQuote:'invented date'}),at),/exactly/);
  assert.throws(()=>exactLinkQuote('repeat repeat','repeat'),/ambiguous/);assert.throws(()=>exactLinkQuote('aa🔎bb','aa\ud83d'),/Unicode/);
  const saved=reviewed();saved.linkReviews[0].citations.leftTime.start++;assert.throws(()=>validateWorkspace(saved),/offsets/);
});
test('unsupported conclusions and unquoted bilateral relationships fail atomically; unresolved proposals remain supported',()=>{
  const w=fixture();for(const extra of [{conclusion:'Attack confirmed'},{conclusion:'Same event proposed'},{leftPlaceQuote:''},{reportRelationship:'Repost'},{rightPlaceQuote:'',rightTimeQuote:'',placeRelation:'Unknown',timeRelation:'Unknown'}])assert.throws(()=>retainLinkReview(w,data(w,extra),at));
  const next=retainLinkReview(w,data(w,{conclusion:'Insufficient context',placeRelation:'Unknown',timeRelation:'Unknown',reportRelationship:'Unknown'}),at);assert.equal(next.linkReviews[0].conclusion,'Insufficient context');assert.equal(w.linkReviews.length,0);
});
test('changed and corrected source snapshots become stale without rewriting previous interpretation',()=>{
  const w=reviewed(),before=structuredClone(w.linkReviews[0]);const corrected=stageDocument(w,doc('revision','Withdrawn wording; routine activity unresolved.',{supersedesDocumentId:'left',revisionNote:'Authored correction.',recordedAt:at,accessAcknowledged:true}),at);
  assert.equal(linkReviewStates(corrected,at)[0].state,'Stale source snapshot');assert.deepEqual(corrected.linkReviews[0],before);assert.deepEqual(parseWorkspace(serializeWorkspace(corrected)).linkReviews[0],before);
  const changed=structuredClone(w);changed.documents[0].excerpt+=' Additional context.';assert.equal(linkReviewStates(changed,at)[0].state,'Stale source snapshot');
});
test('as-of review availability withholds later interpretation; later correction does not leak into earlier state',()=>{
  const w=fixture(),next=retainLinkReview(w,data(w,{asOf:'2026-10-03'}),at);assert.equal(linkReviewStates(next,'2026-10-04')[0].state,'Not yet recorded');
  const earlier=retainLinkReview(w,data(w,{id:'earlier',asOf:'2026-10-03'}),'2026-10-03'),corrected=stageDocument(earlier,doc('revision','Later correction of routine wording.',{supersedesDocumentId:'left',revisionNote:'Correction.',recordedAt:at,accessAcknowledged:true}),at);
  assert.equal(linkReviewStates(corrected,'2026-10-04')[0].state,'Current source snapshot');assert.equal(linkReviewStates(corrected,at)[0].state,'Stale source snapshot');
});
test('stale preparation, future snapshot, typed identity aliasing and same-record review reject',()=>{
  const w=fixture(),prepared=data(w),changed=structuredClone(w);changed.documents[0].excerpt='Changed source wording.';assert.throws(()=>retainLinkReview(changed,prepared,at),/changed/);
  assert.throws(()=>retainLinkReview(w,data(w,{asOf:'2026-10-06'}),at));assert.throws(()=>linkReviewPair(w,'source_excerpt:left','source_excerpt:left',at));assert.throws(()=>linkReviewPair(w,'analyst_statement:left','source_excerpt:right',at));
  const saved=reviewed();saved.linkReviews[0].snapshot.left.recordKey='analyst_statement:left';assert.throws(()=>validateWorkspace(saved));
});
test('incorporation keeps original snapshot current instead of treating analyst paraphrase as the source',()=>{
  const w=reviewed(),next=incorporateDocument(w,'left',{id:'source-evidence',statement:'Analyst paraphrase.',relation:'Context',claimState:'Context',reviewNote:'Original reviewed.',accessAcknowledged:true},at);
  assert.equal(linkReviewStates(next,at)[0].state,'Current source snapshot');assert.equal(next.linkReviews[0].snapshot.left.text,w.documents[0].excerpt);
});
test('versions 1–7 migrate with empty review ledger; format 8 requires bounded valid retained records',()=>{
  const w=demoWorkspace();for(let version=1;version<=7;version++){const old={...w,version};delete old.linkReviews;assert.deepEqual(validateWorkspace(old).linkReviews,[]);}
  const saved=reviewed();for(const mutate of [x=>delete x.linkReviews,x=>x.linkReviews.push(x.linkReviews[0]),x=>x.linkReviews[0].snapshot.left.id='missing',x=>x.linkReviews[0].createdAt='2026-10-02',x=>x.linkReviews[0].snapshot.left.execute='fetch']){const bad=structuredClone(saved);mutate(bad);assert.throws(()=>validateWorkspace(bad));}
  const full={...saved,linkReviews:Array.from({length:40},(_,i)=>({...saved.linkReviews[0],id:`review-${i}`}))};assert.throws(()=>retainLinkReview(full,data(full,{id:'over-limit'}),at),/40 retained/);
  const assertions=structuredClone(saved);assertions.linkReviews[0].approved=true;assert.equal('approved' in validateWorkspace(assertions).linkReviews[0],false);
});
test('synthetic backend retains reviews and rejects real historical snapshot content before saving a revision',()=>{
  const time=Date.parse('2026-10-05T12:00:00Z'),key=randomBytes(32),store=openWorkspaceStore({file:':memory:',tenantId:'training-a',key,now:()=>time}),principal={subject:'analyst-one',tenantId:'training-a',role:'analyst',workspaceIds:['desk-a'],expiresAt:time+60000};
  try{
    const w=reviewed();store.save(principal,'desk-a',0,w);assert.deepEqual(store.read(principal,'desk-a').workspace.linkReviews,w.linkReviews);
    const altered=structuredClone(w);altered.linkReviews[0].snapshot.left.synthetic=false;altered.linkReviews[0].snapshot.left.url='https://example.org/fictional-control';assert.doesNotThrow(()=>validateWorkspace(altered));
    assert.throws(()=>store.save(principal,'desk-a',1,altered),e=>e.code==='synthetic_records_required');assert.equal(store.read(principal,'desk-a').revision,1);
  }finally{store.close();key.fill(0);}
});
