import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {extractContextMentions,compareContextMentions} from '../dist/context-hints.mjs';
import {contextOrderedEvaluation} from '../dist/context-order.mjs';
import {validateSemanticRun,semanticEvaluation} from '../dist/semantic-run.mjs';
import {linkageFixtures} from '../dist/linkage-fixtures.mjs';
import {contextPair,createContextReview} from '../dist/context-review.mjs';
const retained=await validateSemanticRun(JSON.parse(await fs.readFile(new URL('../dist/semantic-run.json',import.meta.url),'utf8')));
const pair=(left,right)=>({left:{text:left},right:{text:right}});
test('English, Hindi and ISO date mentions retain exact source offsets including emoji prefixes',()=>{
 for(const text of ['🔎 Report on 4 October 2026.','सूचना ४ अक्टूबर २०२६ को मिली।','Source: 2026-10-04.']){const r=extractContextMentions(text);assert.equal(r.dateState,'Single');assert.equal(r.dates[0].day,4);assert.equal(r.dates[0].month,10);assert.equal(r.dates[0].year,2026);for(const s of r.dates)assert.equal(text.slice(s.start,s.end),s.quote);}
 assert.equal(extractContextMentions('4th October').dates[0].year,null);assert.equal(extractContextMentions('14 Octoberx').dateState,'Missing');
});
test('invalid calendar dates and multiple mentions cannot supply a unique comparison',()=>{
 for(const text of ['31 April 2026','29 February 1900','2026-13-04','0 October','2026-00-00'])assert.equal(extractContextMentions(text).dateState,'Invalid');assert.equal(extractContextMentions('29 February 2000').dateState,'Single');assert.equal(extractContextMentions('29 February').dateState,'Single');
 for(const text of ['4 October and 5 October','4 October repeated as 4 October','4 October and 31 April'])assert.equal(compareContextMentions(pair(text,'4 July')).date.relation,'Unknown');
});
test('missing year, relative time and unsupported numeric formats are not resolved against publication dates',()=>{
 const same=compareContextMentions(pair('4 October','4 October 2026'));assert.equal(same.date.relation,'Compatible');assert.equal(same.left.dates[0].year,null);assert.match(same.date.reason,/missing year/);
 for(const text of ['last year','last winter','yesterday','04/10/2026','October'])assert.equal(extractContextMentions(text).dateState,'Missing');
 assert.equal(compareContextMentions(pair('4 October 2025','4 October 2026')).date.relation,'Mismatch');
});
test('fictional place parser normalizes centre spelling but makes no cross-script alias claims',()=>{
 const a=compareContextMentions(pair('The fictional Amber learning centre closed.','At the fictional Amber learning center staff checked a notice.'));assert.equal(a.place.relation,'Compatible');assert.equal(a.deferred,false);
 const b=compareContextMentions(pair('The fictional Amber gallery closed.','The fictional Teja gallery closed.'));assert.equal(b.place.relation,'Mismatch');assert.equal(b.flags[0].field,'place');
 const c=compareContextMentions(pair('The fictional Mira archive closed.','काल्पनिक मीरा अभिलेखागार बंद था।'));assert.equal(c.place.relation,'Unknown');assert.equal(c.deferred,false);
 for(const r of [a,b,c])for(const side of ['left','right'])for(const s of r[side].places)assert.ok(s.quote.startsWith('fictional')||s.quote.startsWith('काल्पनिक'));
});
test('real sites, unsupported syntax and multiple fictional places remain unresolved',()=>{
 assert.equal(extractContextMentions('A report from Amber school.').placeState,'Missing');assert.equal(extractContextMentions('fictional Amber schoolhouse').placeState,'Missing');
 const r=compareContextMentions(pair('fictional Amber school and fictional Teja school','fictional Reva school'));assert.equal(r.left.placeState,'Multiple');assert.equal(r.place.relation,'Unknown');
 assert.throws(()=>extractContextMentions(''));assert.throws(()=>extractContextMentions('a'.repeat(4001)));assert.throws(()=>compareContextMentions(null));
});
test('quotation suggestions enter manual review only as source spans without interpretation approval',async()=>{
 const c=linkageFixtures.find(c=>c.id==='eval-date'),p=contextPair(c,'eval-date-b7'),h=compareContextMentions(p);
 const r=await createContextReview(p,{reviewer:'Authored reviewer',note:'Review the extracted mentions and event attachment manually.',leftPlaceQuote:h.left.places[0].quote,rightPlaceQuote:h.right.places[0].quote,leftTimeQuote:h.left.dates[0].quote,rightTimeQuote:h.right.dates[0].quote,placeRelation:'Unknown',timeRelation:'Unknown',conclusion:'Insufficient context',reportRelationship:'Unknown'});
 assert.equal(r.status,'Analyst proposal');assert.equal(r.timeRelation,'Unknown');assert.equal(r.conclusion,'Insufficient context');assert.equal(r.citations.rightTime.quote,'4 July');
});
test('context ordering moves mention mismatches later without changing scores, removing candidates or mutating inputs',()=>{
 const base=semanticEvaluation('evaluation',retained),before=JSON.stringify(base),r=contextOrderedEvaluation(base),date=r.rows.find(c=>c.id==='eval-date');assert.equal(date.ranking[0].id,'eval-date-a2');assert.equal(date.ranking.at(-1).id,'eval-date-b7');assert.equal(date.ranking.at(-1).deferred,true);
 for(const row of r.rows){const original=base.rows.find(b=>b.id===row.id);assert.deepEqual(row.ranking.map(s=>s.id).sort(),original.ranking.map(s=>s.id).sort());for(const score of row.ranking)assert.equal(score.score,original.ranking.find(s=>s.id===score.id).score);}
 assert.equal(JSON.stringify(base),before);assert.equal(r.metrics.queries,8);assert.equal(r.metrics.correctTop1+r.metrics.falseTop1+r.metrics.unresolvedTop1+r.metrics.noResults,8);assert.throws(()=>contextOrderedEvaluation({id:'other',rows:[]}));
});
test('context ranking ignores authored labels, availability dates do not become date mentions, and changed text recomputes hints',()=>{
 const base=semanticEvaluation('evaluation',retained),modified=structuredClone(base);for(const row of modified.rows)for(const c of row.candidates){c.label=c.label==='Related'?'Unrelated':'Related';c.reason='Changed rationale.';}
 assert.deepEqual(contextOrderedEvaluation(base).rows.map(r=>r.ranking),contextOrderedEvaluation(modified).rows.map(r=>r.ranking));
 const date=base.rows.find(r=>r.id==='eval-date');date.candidates.find(c=>c.id==='eval-date-b7').text='A fire alarm at the fictional Reva school on 4 October.';assert.equal(contextOrderedEvaluation(base).rows.find(r=>r.id==='eval-date').contexts.find(c=>c.id==='eval-date-b7').hints.deferred,false);
 const undated=compareContextMentions({left:{text:'Undated source.',reportedAt:'2026-10-04'},right:{text:'Undated source.',reportedAt:'2026-07-04'}});assert.equal(undated.date.relation,'Unknown');
});
test('known-by filtering rejects future ranked candidates and never examines unavailable unranked text',()=>{
 const base=semanticEvaluation('evaluation',retained),row=base.rows[0];row.candidates.push({id:'future',text:'fictional Future school on 5 October',reportedAt:'2026-10-05',recordedAt:'2026-10-06',label:'Unrelated',reason:'Future.'});const r=contextOrderedEvaluation(base);assert.equal(r.rows[0].contexts.some(c=>c.id==='future'),false);row.ranking.push({id:'future',score:.99});assert.throws(()=>contextOrderedEvaluation(base),/Unknown candidate/);
});
test('a date correction can concern the same event despite a mismatch flag: heuristic does not infer truth',()=>{
 const h=compareContextMentions(pair('An alarm at the fictional Reva school on 4 July.','A correction states that the fictional Reva school alarm occurred on 4 October.'));assert.equal(h.date.relation,'Mismatch');assert.equal(h.deferred,true);assert.match(h.date.reason,/unverified/);assert.equal('sameEvent' in h,false);assert.equal('approved' in h,false);
});
