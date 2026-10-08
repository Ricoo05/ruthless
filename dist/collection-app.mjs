import {COLLECTION_SOURCE,parseCollectionReport,collectionCoverage,collectionParents,passageBatch} from './collection-core.mjs';
import {extractSourceText} from './collection-text.mjs';
import {loadLocalCaptures,localCollectionOrigin} from './collection-client.mjs';
import {importSourceBatch} from './source-import.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function collectionDesk({getWorkspace,applyWorkspace,canChange,uid,today,feedback}){
  const $=id=>document.getElementById(id);
  let lastAttempt=null,lastSuccess=null,input='',busy=false,edited=false,lastError='';
  let catalogCount=null;
  let fields={assessmentId:'',slug:'warnings-and-insurance',excerpt:'',parentId:'',revisionNote:'',permissionNote:''};
  function section(){return lastSuccess?.sections.find(s=>s.slug===fields.slug);}
  function chooseSection(){fields.excerpt='';fields.parentId='';fields.revisionNote='';}
  function render(){
    const w=getWorkspace(),coverage=collectionCoverage(lastAttempt,lastSuccess);
    if(!w.assessments.some(c=>c.id===fields.assessmentId))fields.assessmentId='';
    const s=section(),parents=s?collectionParents(w,fields.assessmentId,fields.slug):[];
    if(!parents.some(p=>p.id===fields.parentId))fields.parentId='';
    $('content').innerHTML=`<section class="panel"><div class="panel-heading"><div><h2>Saved collection review</h2><span class="muted">Public advisory · selected passages · explicit analyst intake</span></div><span class="chip">${esc(coverage.status)}</span></div><div class="case-body">
      <div class="collection-coverage"><div><p class="small-label">CONFIGURED SOURCE</p><h3>Official India travel advisory</h3><p>${esc(COLLECTION_SOURCE.publisher)}</p><p>One publisher, English, three selected sections. Linked sites, attachments, incident feeds and social platforms are outside this capture.</p><a href="${COLLECTION_SOURCE.page}" target="_blank" rel="noopener noreferrer">Open publisher reference</a></div><dl><dt>Latest reported attempt</dt><dd>${esc(coverage.checkedAt??'None loaded')}</dd><dt>Last successful report loaded</dt><dd>${esc(coverage.retainedAt??'None')}</dd><dt>Publisher content updated</dt><dd>${esc(coverage.publisherUpdatedAt??'Unknown')}</dd><dt>Threat judgment</dt><dd>Not assessed by collection</dd></dl></div>
      <details class="coverage-inventory"><summary>Source coverage: web, social platforms and authorized cameras</summary><div class="reference-grid"><div><h3>Public websites and feeds</h3><span class="chip">1 LOCAL COLLECTOR</span><p>The fixed official India advisory endpoint is implemented. Use Public-source OSINT for on-demand advisory and news-index requests. Comprehensive web search and continuous collection are not connected.</p></div><div><h3>Social platforms</h3><span class="chip">NOT CONNECTED</span><p>No social data is being collected. Each platform needs approved access and terms that permit the intended use; private accounts and messages are outside public collection.</p></div><div><h3>Authorized CCTV and incident feeds</h3><span class="chip">NOT CONNECTED</span><p>Planned for organization-owned or explicitly authorized feeds at named sites, with scoped incident review. No cameras, biometric identification or tracking across cameras are connected.</p></div><div><h3>Agency and contractor data</h3><span class="chip">MANUAL PROTOTYPE INTAKE</span><p>Authorized excerpts can be staged for analyst review. Production agency connectors and organizational identity integration are not deployed.</p></div></div><p>Coverage is the set of configured, permitted sources and observed attempts. It is never a claim that the entire internet or every accessible camera was scanned.</p></details>
      ${lastAttempt?.status==='failed'?`<p class="error">Latest reported collection failed: ${esc(lastAttempt.reason)}.${lastSuccess?' Earlier source text remains available; it is not a successful latest attempt.':''}</p>`:''}
      ${coverage.lastCaptureStale?'<p class="notice">Retained capture is older than 24 hours. Review freshness before relying on it.</p>':''}
      <p class="notice">Imported reports are editable and unverified. A matching content hash detects inconsistency; it does not authenticate the publisher or establish that the area is safe.</p>
      <div class="collection-local"><h3>Local capture connection</h3>${localCollectionOrigin(location.origin)?`<p>Load validated reports from this server's local collector directory. This reads existing captures; it does not fetch the publisher or change a case.</p><button id="collection-local-load" class="primary"${busy?' disabled':''}>${busy?'Loading…':'Load local captures'}</button><p class="muted">${catalogCount===null?'No directory scan requested this session.':`${catalogCount} validated local report(s) in the last scan.`} The review server requires node scripts/serve-collection.mjs.</p>`:'<p>This hosted edition reviews pasted collector reports. Direct capture loading runs on your computer at the local review server; no cloud collector is deployed.</p><p class="muted">Start node scripts/serve-collection.mjs, then open http://127.0.0.1:4175/ and choose Load local captures.</p>'}</div>
      <details id="collection-input-panel"${input||!lastAttempt?' open':''}><summary>Load a local collection report</summary><p>Paste the JSON produced by the local advisory collector. Loading it changes no case. The hosted prototype does not run a collector.</p><form id="collection-load-form"><label for="collection-json">Collection report JSON (maximum 2 MB)</label><textarea id="collection-json" rows="5" maxlength="2097152" spellcheck="false"${busy?' disabled':''}>${esc(input)}</textarea><div class="actions"><button type="submit" class="primary"${busy?' disabled':''}>${busy?'Validating…':'Validate & inspect report'}</button><button type="button" id="collection-clear-input"${busy?' disabled':''}>Clear pasted JSON</button></div></form></details>
      ${s?`<div class="collection-layout"><section><h3>Retained source text</h3><label for="collection-section">Source section</label><select id="collection-section"${busy?' disabled':''}>${lastSuccess.sections.map(p=>`<option value="${p.slug}"${p.slug===fields.slug?' selected':''}>${esc(p.title)}</option>`).join('')}</select><p class="muted">Plain text parsed from retained HTML. Scripts and embedded elements are excluded; whitespace and block boundaries are normalized. No translation or inference is applied.</p><blockquote id="collection-original" class="source-excerpt collection-original">${esc(s.originalText)}</blockquote><a href="${s.sourceUrl}" target="_blank" rel="noopener noreferrer">Inspect this section at the publisher</a><details><summary>Capture provenance and reuse</summary><p>Capture: ${esc(lastSuccess.id)}</p><p>Response SHA-256: ${lastSuccess.snapshot.responseSha256}</p><p>Selected-content SHA-256: ${lastSuccess.snapshot.selectedContentSha256}</p><p>${esc(COLLECTION_SOURCE.attribution)} <a href="${COLLECTION_SOURCE.licence}" target="_blank" rel="noopener noreferrer">Open licence reference</a></p><p>Public advice is not independently verified intelligence. All sections share one reporting group. Check publisher exceptions and your authorized purpose.</p></details></section><section><h3>Stage an exact passage</h3><form id="collection-stage-form"><label for="collection-assessment">Target assessment</label><select id="collection-assessment" required${busy?' disabled':''}><option value="">Choose an assessment</option>${w.assessments.map(c=>`<option value="${esc(c.id)}"${c.id===fields.assessmentId?' selected':''}>${esc(c.title)}</option>`).join('')}</select><label for="collection-excerpt">Exact passage from the displayed text</label><textarea id="collection-excerpt" rows="6" maxlength="4000" required${busy?' disabled':''}>${esc(fields.excerpt)}</textarea><p class="muted">Copy 1–4,000 characters that occur once in the displayed section. The application will preserve this passage; it adds no analyst statement automatically.</p><label for="collection-parent">Earlier excerpt to supersede (optional)</label><select id="collection-parent"${busy?' disabled':''}><option value="">New passage; no correction</option>${parents.map(p=>`<option value="${p.id}"${p.id===fields.parentId?' selected':''}>${esc(p.title)} / ${p.reportedAt} / ${esc(p.externalRecordId)}</option>`).join('')}</select><label for="collection-revision">Correction explanation (required when superseding)</label><textarea id="collection-revision" rows="2" maxlength="2000"${busy?' disabled':''}>${esc(fields.revisionNote)}</textarea><label for="collection-permission">Access and reuse review</label><textarea id="collection-permission" rows="3" maxlength="900" required${busy?' disabled':''}>${esc(fields.permissionNote)}</textarea><label class="checkline"><input id="collection-ack" type="checkbox"><span>I reviewed the source conditions and am authorized to retain this passage. I understand the imported report and its authenticity remain unverified.</span></label><p class="muted">Real-source passages remain outside the synthetic-only AI runner and local backend. Retain them using the workspace JSON workflow. Source reports and selections are session-only.</p><div class="actions"><button type="submit" class="primary"${busy?' disabled':''}>Stage passage for review</button><button type="button" id="collection-discard-selection"${busy?' disabled':''}>Discard passage selection</button></div></form></section></div>`:'<p class="empty">No successful capture loaded. Collect an official advisory locally, then paste its report to inspect the source.</p>'}
      <p id="collection-error" class="error" role="alert">${esc(lastError)}</p><p class="muted">Capture freshness describes when the source was checked. It is not incident freshness or a threat probability. Missing coverage or no matching words does not prove absence of a threat.</p>
    </div></section>`;
  }
  document.addEventListener('input',event=>{
    const e=event.target;if(busy)return;
    if(e.id==='collection-json'){input=e.value;return;}
    const key={'collection-excerpt':'excerpt','collection-revision':'revisionNote','collection-permission':'permissionNote'}[e.id];
    if(key){fields[key]=e.value;edited=true;}
  });
  document.addEventListener('change',event=>{
    const e=event.target;if(busy)return;
    if(e.id==='collection-section'){if(fields.excerpt.trim()||fields.revisionNote.trim()){e.value=fields.slug;lastError='Stage or discard the current passage before changing its source section.';$('collection-error').textContent=lastError;return;}fields.slug=e.value;chooseSection();edited=true;render();}
    if(e.id==='collection-assessment'){if(fields.parentId||fields.revisionNote.trim()){e.value=fields.assessmentId;lastError='Stage or discard the current correction before changing its assessment.';$('collection-error').textContent=lastError;return;}fields.assessmentId=e.value;fields.parentId='';fields.revisionNote='';edited=true;render();}
    if(e.id==='collection-parent'){fields.parentId=e.value;edited=true;}
  });
  document.addEventListener('click',async event=>{
    const id=event.target.closest('button')?.id;if(busy)return;
    if(id==='collection-local-load'){
      if(!canChange())return;
      if(edited||input.trim()){$('collection-error').textContent='Stage or discard the passage selection, and validate or clear pasted JSON before loading local captures.';return;}
      busy=true;lastError='';render();
      try{
        const catalog=await loadLocalCaptures({extractText:extractSourceText});
        if(!catalog.lastAttempt){catalogCount=0;feedback('No local reports found. Run node scripts/collect-advisory.mjs --collect first. Existing source context was retained.');}
        else{
          if(lastAttempt&&Date.parse(catalog.lastAttempt.checkedAt)<Date.parse(lastAttempt.checkedAt))throw new Error('Local captures predate the latest loaded attempt. Current source context was retained.');
          lastAttempt=catalog.lastAttempt;lastSuccess=catalog.lastSuccess;catalogCount=catalog.reportCount;chooseSection();
          feedback(lastAttempt.status==='collected'?'Local capture loaded. Inspect a passage; no case has changed.':'Latest local attempt failed. Any earlier successful capture remains separately labeled.');
        }
      }catch(e){lastError=e.message;feedback(e.message,true);}
      finally{busy=false;render();}
      return;
    }
    if(id==='collection-clear-input'){input='';$('collection-json').value='';}
    if(id==='collection-discard-selection'){chooseSection();fields.permissionNote='';edited=false;lastError='';render();feedback('Passage selection discarded. The retained source report is unchanged.');}
  });
  document.addEventListener('submit',async event=>{
    if(!['collection-load-form','collection-stage-form'].includes(event.target.id))return;
    event.preventDefault();if(busy||!canChange())return;
    const kind=event.target.id,base=getWorkspace();
    if(kind==='collection-load-form'&&edited){$('collection-error').textContent='Stage or discard the current passage selection before loading another report.';return;}
    const source=input,report=lastSuccess,selection={...fields,acknowledged:$('collection-ack')?.checked===true,at:today()};
    busy=true;lastError='';render();
    try{
      if(kind==='collection-load-form'){
        const parsed=await parseCollectionReport(source,{extractText:extractSourceText});
        if(lastAttempt&&Date.parse(parsed.checkedAt)<Date.parse(lastAttempt.checkedAt))throw new Error('This report predates the latest loaded attempt. Current source context was retained.');
        lastAttempt=parsed;if(parsed.status==='collected'){lastSuccess=parsed;chooseSection();}
        input='';feedback(parsed.status==='collected'?'Source report inspected. Select a passage; no case has changed.':'Failed collection report recorded. No successful latest capture is claimed.');
      }else{
        const batch=await passageBatch(base,report,selection);
        if(getWorkspace()!==base)throw new Error('Workspace changed during validation. Retry against the current case.');
        const result=importSourceBatch(base,batch,{batchId:uid('batch'),idForRecord:()=>uid('doc'),at:selection.at,accessAcknowledged:true});
        if(result.added.length)applyWorkspace(result.workspace);
        chooseSection();fields.permissionNote='';edited=false;
        feedback(result.added.length?'Passage staged in Document intake. Save the workspace to retain it; incorporation remains a separate review.':'Unchanged passage skipped. No workspace record was added.');
      }
    }catch(error){lastError=error.message;feedback(error.message,true);}
    finally{busy=false;render();}
  });
  return {render,isBusy:()=>busy,hasDraft:()=>!!input.trim()||edited,
    reset:()=>{input='';edited=false;fields={assessmentId:'',slug:'warnings-and-insurance',excerpt:'',parentId:'',revisionNote:'',permissionNote:''};}};
}
