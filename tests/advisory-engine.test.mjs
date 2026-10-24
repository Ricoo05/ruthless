import test from 'node:test';
import assert from 'node:assert/strict';
import {collectAdvisory} from '../collection/govuk-advisory.mjs';
import {ADVISORY_RULE,advisoryBlocks,advisoryPlainText,analyzeAdvisory,replayAdvisories,stageAdvisoryCandidate} from '../dist/advisory-engine.mjs';
import {demoWorkspace,serializeWorkspace} from '../dist/threat-core.mjs';

test('unknown HTML entities cannot resolve JavaScript object prototype properties into source quotations',()=>{assert.equal(advisoryBlocks('<p>&constructor; &toString; &unknown; &amp;</p>')[0].text,'&constructor; &toString; &unknown; &');});

// All publisher-shaped text in this file is authored for deterministic tests.
// These fixtures are never represented as captured reports or real incidents.
const observed='2026-10-05T12:00:00Z',publisherDate='2026-10-01T09:00:00Z';
const at=new Date('2026-10-24T23:00:00Z');
const terrorism='<h2>Terrorism</h2><p>Authored standing guidance: review official information.</p><h2>Road travel</h2><p>Authored unrelated road guidance.</p>';
async function capture({html=terrorism,checkedAt=observed,updatedAt=publisherDate,warnings='<p>Authored general warning information.</p>',title='Authored fixture only'}={}){
  const payload={base_path:'/foreign-travel-advice/india',schema_name:'travel_advice',document_type:'travel_advice',locale:'en',content_id:'authored-advisory-engine-control',title,public_updated_at:updatedAt,withdrawn_notice:null,
    details:{parts:[{slug:'warnings-and-insurance',title:'Authored warning section',body:warnings},{slug:'safety-and-security',title:'Authored safety section',body:html},{slug:'regional-risks',title:'Authored regional section',body:'<p>Authored regional context.</p>'}]}};
  const run=await collectAdvisory({now:()=>new Date(checkedAt),fetchImpl:async()=>new Response(JSON.stringify(payload),{headers:{'content-type':'application/json'}})});
  assert.equal(run.status,'collected');return run;
}
const analyze=(run,previous=null)=>analyzeAdvisory(run,previous,{at});
const stageOptions={assessmentId:'training-domestic',id:'real-advisory-source',at:'2026-10-24',acknowledged:true};

test('terrorism extraction respects peer heading boundaries and retains subordinate paragraphs and list items',async()=>{
  const html='<p>Authored text before the topic.</p><h2>Terrorism</h2><p>Authored first topic paragraph.</p><h3>Public advice</h3><ul><li>Authored subordinate advice.</li></ul><h2>Road travel</h2><p>Authored excluded road paragraph.</p><h1>Other page</h1><p>Also excluded.</p>';
  const r=await analyze(await capture({html}));
  assert.equal(r.ruleVersion,ADVISORY_RULE);assert.equal(r.topicAvailable,true);assert.equal(r.candidates.length,1);
  assert.equal(r.candidates[0].excerpt,'Authored first topic paragraph.\n\nAuthored subordinate advice.');
  assert.ok(!r.candidates[0].excerpt.includes('before'));assert.ok(!r.candidates[0].excerpt.includes('road'));assert.ok(!r.candidates[0].excerpt.includes('Other page'));
});

test('inert extraction excludes scripts, hidden content, comments and executable attributes while decoding text entities',()=>{
  const html='<h2>Terrorism</h2><p onclick="throw new Error(1)">Visible &amp; quoted &#x1F50E; &#2325; &lt;script&gt;literal&lt;/script&gt;.</p>'+ 
    '<script><p>Injected script paragraph.</p></script><style>body{display:none}</style><template><p>Injected template.</p></template><noscript><p>Fallback hidden.</p></noscript>'+
    '<div hidden><p>Hidden attribute.</p></div><section aria-hidden="true"><p>ARIA hidden.</p></section><div style="display: none"><p>CSS hidden.</p></div><svg><text>SVG hidden.</text></svg><!-- <p>Comment hidden.</p> -->'+
    '<p>Visible <span title="A > B">tail</span><br>after break &unknown;.</p>';
  const text=advisoryPlainText(html);
  assert.equal(text,'Terrorism\n\nVisible & quoted 🔎 क <script>literal</script>.\n\nVisible tail after break &unknown;.');
  assert.ok(!text.includes('Injected'));assert.ok(!text.includes('Hidden attribute'));assert.ok(!text.includes('throw new Error'));
  assert.equal(advisoryPlainText('<p>&#0; &#xD800; &#1114112; &#38; &#x26;</p>'),'� � � & &');
});

test('each quoted paragraph retains a raw HTML span that reconstructs its inert text',async()=>{
  const html='<h2>Terrorism</h2><p>Authored &amp; attributed <strong>paragraph</strong> 🔎.</p><ul><li>Authored second item.</li></ul><h2>Other</h2><p>Excluded.</p>';
  const run=await capture({html}),analysis=await analyze(run),candidate=analysis.candidates[0];
  assert.equal(candidate.rawSpans.length,2);
  const backed=candidate.rawSpans.map(span=>{
    assert.ok(Number.isInteger(span.start)&&Number.isInteger(span.end));assert.ok(span.start>=0&&span.end>span.start&&span.end<=html.length);
    return advisoryPlainText(html.slice(span.start,span.end));
  });
  assert.equal(backed.join('\n\n'),candidate.excerpt);assert.equal(candidate.sourceHash,run.snapshot.selectedContentSha256);
  assert.equal(candidate.sourceURL,'https://www.gov.uk/foreign-travel-advice/india/safety-and-security#terrorism');
});

test('baseline and unchanged retrievals do not claim newly changed guidance',async()=>{
  const first=await analyze(await capture()),second=await analyze(await capture({checkedAt:'2026-10-06T12:00:00Z'}),first);
  for(const r of [first,second]){assert.equal(r.pageChanged,false);assert.equal(r.topicChanged,false);assert.equal(r.candidates[0].kind,'baseline_context');assert.equal(r.candidates[0].priority,'Context');assert.deepEqual(r.candidates[0].added,[]);assert.deepEqual(r.candidates[0].removed,[]);}
  assert.equal(second.topicHash,first.topicHash);assert.equal(second.sourceHash,first.sourceHash);
});

test('publisher metadata changes and unrelated page edits are distinct from terrorism passage changes',async()=>{
  const first=await analyze(await capture());
  const metadata=await analyze(await capture({checkedAt:'2026-10-06T12:00:00Z',updatedAt:'2026-10-06T09:00:00Z',title:'Authored changed page title'}),first);
  assert.equal(metadata.pageChanged,false);assert.equal(metadata.topicChanged,false);assert.equal(metadata.candidates[0].priority,'Context');
  const unrelated=await analyze(await capture({warnings:'<p>Authored revised non-terrorism warning section.</p>'}),first);
  assert.equal(unrelated.pageChanged,true);assert.equal(unrelated.topicChanged,false);assert.equal(unrelated.candidates[0].priority,'Context');assert.equal(unrelated.topicHash,first.topicHash);
});

test('changed terrorism wording produces review differences without claiming an incident or attack probability',async()=>{
  const first=await analyze(await capture()),newParagraph='Authored revision: verify the current official notice before travel.';
  const run=await capture({html:`<h2>Terrorism</h2><p>${newParagraph}</p><h2>Road travel</h2><p>Other advice.</p>`}),r=await analyze(run,first),c=r.candidates[0];
  assert.equal(r.pageChanged,true);assert.equal(r.topicChanged,true);assert.equal(c.kind,'changed_guidance');assert.equal(c.priority,'Verify change');
  assert.deepEqual(c.added,[newParagraph]);assert.deepEqual(c.removed,['Authored standing guidance: review official information.']);assert.equal(c.independentSourceGroups,1);
  assert.match(c.confidence,/Uncalibrated/);assert.ok(!Object.hasOwn(c,'attackProbability'));assert.ok(!Object.hasOwn(c,'confirmedIncident'));
  const subsequent=await analyze(await capture({html:run.snapshot.parts[1].originalHtml,checkedAt:'2026-10-07T12:00:00Z'}),r);
  assert.equal(subsequent.topicChanged,false);assert.equal(subsequent.candidates[0].priority,'Context');
});

test('missing, empty and oversized terrorism topics remain coverage gaps rather than alerts',async()=>{
  const prior=await analyze(await capture());
  for(const html of ['<h2>Road travel</h2><p>Other topic.</p>','<h2>Terrorism</h2><h2>Other</h2><p>Other topic.</p>',`<h2>Terrorism</h2><p>${'x'.repeat(4001)}</p>`]){
    const r=await analyze(await capture({html}),prior);assert.equal(r.topicAvailable,false);assert.equal(r.topicHash,null);assert.equal(r.topicChanged,false);assert.deepEqual(r.candidates,[]);assert.deepEqual(r.paragraphs,[]);assert.match(r.coverage,/missing, empty or over/);
  }
});

test('bounded tokenizer rejects non-text input, excess markup, excess depth and malformed unclosed structures',()=>{
  for(const input of [null,{},42,'x'.repeat(2*1024*1024+1)])assert.throws(()=>advisoryBlocks(input),/Invalid advisory HTML/);
  assert.throws(()=>advisoryBlocks('<br>'.repeat(100001)),/token limit/);
  assert.throws(()=>advisoryBlocks('<div>'.repeat(101)+'<p>Too deep.</p>'),/nesting/);
  for(const html of ['<!-- unfinished','<p title="unfinished>'])assert.throws(()=>advisoryBlocks(html),/Unclosed/);
  assert.equal(advisoryPlainText('<p title="A > B">Safe quoted attribute.</p>'),'Safe quoted attribute.');
});

test('a failed collection cannot become a candidate, and altered retained HTML fails its hash binding',async()=>{
  const failed=await collectAdvisory({now:()=>new Date(observed),fetchImpl:async()=>new Response('',{status:503})});
  assert.equal(await analyze(failed),null);
  const run=await capture();run.snapshot.parts[1].originalHtml='<h2>Terrorism</h2><p>Altered source.</p>';
  await assert.rejects(()=>analyze(run),/hash/);
});

test('replay gates old publisher content on first observation and excludes future correction captures',async()=>{
  const old=await capture({updatedAt:'2020-01-01T09:00:00Z'}),later=await capture({html:'<h2>Terrorism</h2><p>Authored later correction.</p>',checkedAt:'2026-10-07T12:00:00Z',updatedAt:'2026-10-07T09:00:00Z'});
  const attempts=[{id:'later',firstObservedAt:'2026-10-07T12:00:02Z',run:later},{id:'old',firstObservedAt:'2026-10-05T12:00:02Z',run:old}];
  assert.deepEqual(replayAdvisories(attempts,'2026-10-05T12:00:01Z'),[]);
  assert.deepEqual(replayAdvisories(attempts,'2026-10-06T12:00:00Z').map(a=>a.id),['old']);
  assert.deepEqual(replayAdvisories(attempts,'2026-10-07T12:00:02Z').map(a=>a.id),['old','later']);
  assert.deepEqual(replayAdvisories([{...attempts[1],firstObservedAt:'invalid'}],'2026-10-08T00:00:00Z'),[]);
  assert.throws(()=>replayAdvisories(attempts,'invalid'),/timestamp/);
});

test('staging requires acknowledgement and verified source/candidate bindings and adds only an intake document',async()=>{
  const run=await capture(),analysis=await analyze(run),attempt={id:'authored-attempt',firstObservedAt:observed,run,analysis},candidate=analysis.candidates[0],workspace=demoWorkspace(),before=serializeWorkspace(workspace);
  await assert.rejects(()=>stageAdvisoryCandidate(workspace,attempt,candidate.id,{...stageOptions,acknowledged:false}),/Review/);
  await assert.rejects(()=>stageAdvisoryCandidate(workspace,attempt,'unknown-candidate',stageOptions),/binding/);
  await assert.rejects(()=>stageAdvisoryCandidate(workspace,{...attempt,analysis:{...analysis,sourceHash:'0'.repeat(64)}},candidate.id,stageOptions),/binding/);
  await assert.rejects(()=>stageAdvisoryCandidate(workspace,attempt,candidate.id,{...stageOptions,at:'2026-10-04'}),/binding/);
  const result=await stageAdvisoryCandidate(workspace,attempt,candidate.id,stageOptions),doc=result.documents.at(-1);
  assert.equal(serializeWorkspace(workspace),before);assert.deepEqual(result.evidence,workspace.evidence);assert.deepEqual(result.assessments,workspace.assessments);assert.equal(result.documents.length,workspace.documents.length+1);
  assert.equal(doc.synthetic,false);assert.equal(doc.excerpt,candidate.excerpt);assert.equal(doc.url,candidate.sourceURL);assert.equal(doc.originGroup,'FCDO India travel advisory');assert.equal(doc.recordedAt,'2026-10-24');assert.match(doc.accessNote,/not incident time/);assert.ok(doc.accessNote.includes(candidate.sourceHash));
  const forged=structuredClone(attempt);forged.analysis.candidates[0].excerpt='Injected unsupported conclusion.';
  const safe=await stageAdvisoryCandidate(workspace,forged,candidate.id,stageOptions);assert.equal(safe.documents.at(-1).excerpt,candidate.excerpt);
});

test('staging requires literal boolean consent rather than truthy imported acknowledgement values',async()=>{
  const run=await capture(),analysis=await analyze(run),attempt={id:'authored-attempt',firstObservedAt:observed,run,analysis};
  for(const acknowledged of ['false','yes',1,{}])await assert.rejects(()=>stageAdvisoryCandidate(demoWorkspace(),attempt,analysis.candidates[0].id,{...stageOptions,acknowledged}),/Review|acknowledg|consent/i);
});

test('staging cannot use an invalid observation timestamp to backdate evidence before the capture',async()=>{
  const run=await capture(),analysis=await analyze(run),attempt={id:'authored-attempt',firstObservedAt:'2026-10-03T12:00:00Z',run,analysis};
  await assert.rejects(()=>stageAdvisoryCandidate(demoWorkspace(),attempt,analysis.candidates[0].id,{...stageOptions,at:'2026-10-04'}),/binding|observ|captur|timestamp/i);
  for(const firstObservedAt of ['not-a-date','2026-02-30T12:00:00Z'])await assert.rejects(()=>stageAdvisoryCandidate(demoWorkspace(),{...attempt,firstObservedAt},analysis.candidates[0].id,stageOptions),/binding|observ|captur|timestamp/i);
});

test('source mentions of nationality or religion remain quoted context and never become profiling verdicts',async()=>{
  const r=await analyze(await capture({html:'<h2>Terrorism</h2><p>Authored control mentioning Indian nationality and Hindu and Muslim religions. This is ordinary quoted context.</p>'})),c=r.candidates[0];
  assert.equal(c.kind,'baseline_context');assert.equal(c.priority,'Context');assert.equal(c.independentSourceGroups,1);
  for(const key of ['suspects','terrorists','nationalityScore','religionScore','target','guilt','intent','attackProbability'])assert.ok(!Object.hasOwn(c,key));
  assert.ok(r.limitations.some(l=>l.includes('community profiling')));assert.match(c.excerpt,/Authored control/);
});
