import {CATALOG_URL,SOURCE_URL,STATUSES,MAX_PROJECT_BYTES,MAX_CSV_BYTES,utf8Bytes,replaceCatalog,parseCSV,validateCatalog,analyze,filterFindings,reviewFinding,makeProject,parseProject,serializeProject,exportCSV,exportBrief,TEMPLATE,DEMO_CSV} from './core.mjs';
const $=id=>document.getElementById(id);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let project=null,items=[],selected=null,view='queue',dirty=false,draft=false,page=0;
let catalogOrigin='Bundled public snapshot';
let filters={query:'',status:'all',evidence:'all'};
const PAGE_SIZE=50;
function feedback(message,error=false){$('feedback').textContent=message;$('feedback').classList.toggle('error',error);}
function setDirty(value=true){dirty=value;$('save-project').textContent=value?'Save project •':'Save project';}
function canLeaveDraft(){if(!draft)return true;if(!confirm('Discard the unsaved review note?'))return false;draft=false;return true;}
function canReplace(){if(!canLeaveDraft())return false;return !dirty||confirm('Replace this session? Download a project file first if you want to keep its changes.');}
function download(name,body,type){const url=URL.createObjectURL(new Blob([body],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function validRows(){return filterFindings(items,filters);}
function recalculate(){items=analyze(project.findings,project.catalog);if(!items.some(x=>x.id===selected))selected=items[0]?.id||null;}
function drawStats(){
  const open=items.filter(x=>!['Remediated','Not applicable','Accepted risk'].includes(x.status));
  $('stats').innerHTML=[['Findings in scope',items.length,''],['Known exploited',items.filter(x=>x.evidence).length,'hot'],['Internet exposed',items.filter(x=>x.internet_exposed).length,''],['Pending review',items.filter(x=>x.status==='Unreviewed').length,'accent']].map(([name,n,tone])=>`<div><span>${name}</span><strong class="${tone}">${n.toLocaleString()}</strong></div>`).join('');
  $('mode').textContent=project.mode==='demo'?'DEMO WORKSPACE':'IMPORTED WORKSPACE';
  $('session-notice').textContent=(project.mode==='demo'?'Demo assets are fictional. ':'Imported findings are analyst supplied; software applicability is not independently verified. ')+`${open.length} findings remain open. Catalog: ${catalogOrigin}. Save a project file to keep your changes; closing this tab clears the session.`;
  const days=Math.floor((Date.now()-Date.parse(project.catalog.dateReleased))/86400000);
  $('catalog-stamp').textContent=`CISA KEV · ${project.catalog.count.toLocaleString()} entries · released ${project.catalog.dateReleased.slice(0,10)}${days>7?' · Snapshot over 7 days old':''}`;
}
function render(){if(!project)return;drawStats();document.querySelectorAll('.nav').forEach(x=>{x.classList.toggle('active',x.dataset.view===view);if(x.dataset.view===view)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current');});if(view==='queue')drawQueue();else if(view==='sources')drawSources();else drawHistory();}
function drawQueue(){
  $('content').innerHTML=`<div class="layout"><section class="panel" aria-label="Priority queue"><div class="panel-heading"><h2>Priority queue</h2><span class="muted">Ranked by exposure evidence</span></div><div class="filters"><label class="sr-only" for="search">Search findings</label><input type="search" id="search" placeholder="Search asset, CVE, owner…" value="${escape(filters.query)}"><label class="sr-only" for="status-filter">Review status</label><select id="status-filter"><option value="all">All statuses</option>${STATUSES.map(s=>`<option ${filters.status===s?'selected':''}>${s}</option>`).join('')}</select><label class="sr-only" for="evidence-filter">Exploitation evidence</label><select id="evidence-filter"><option value="all">All evidence</option><option value="kev" ${filters.evidence==='kev'?'selected':''}>Known exploited</option><option value="unknown" ${filters.evidence==='unknown'?'selected':''}>No KEV match</option></select></div><div class="list" id="finding-list"></div><div class="panel-foot"><span id="result-count"></span><div class="actions"><button id="previous" aria-label="Previous page">Previous</button><button id="next" aria-label="Next page">Next</button></div></div><div class="panel-foot"><button id="export-csv">Export filtered CSV</button><button id="export-brief">Export full brief</button></div></section><section class="panel" id="detail" aria-label="Selected finding"></section></div>`;
  drawList();drawDetail();
}
function drawList(){
  const rows=validRows();page=Math.min(page,Math.max(0,Math.ceil(rows.length/PAGE_SIZE)-1));
  if(!rows.some(x=>x.id===selected)&&!draft)selected=rows[0]?.id||null;
  $('finding-list').innerHTML=rows.length?rows.slice(page*PAGE_SIZE,(page+1)*PAGE_SIZE).map(f=>`<button class="finding ${selected===f.id?'selected':''}" data-finding="${escape(encodeURIComponent(f.id))}" aria-pressed="${selected===f.id}"><span class="score ${f.priority==='High'?'high':''}" aria-label="Priority score ${f.score}">${f.score}</span><span class="finding-main"><strong>${escape(f.asset)}</strong><span class="finding-meta" style="display:block">${f.cve} · ${escape(f.evidence?.product||'No catalog match')}</span><span class="tags"><span class="tag ${f.evidence?'kev':''}">${f.evidence?'Known exploited':'No KEV match'}</span>${f.internet_exposed?'<span class="tag">Internet exposed</span>':''}<span class="tag state">${f.status}</span></span></span></button>`).join(''):'<p class="empty">No findings match these filters.<br>Try another asset, CVE, or review status.</p>';
  $('result-count').textContent=rows.length?`${page*PAGE_SIZE+1}–${Math.min(rows.length,(page+1)*PAGE_SIZE)} of ${rows.length} findings`:'0 findings';
  $('previous').disabled=page===0;$('next').disabled=(page+1)*PAGE_SIZE>=rows.length;
}
function drawDetail(){
  const f=items.find(x=>x.id===selected);if(!f){$('detail').innerHTML='<div class="detail-empty"><h2>No finding selected</h2><p class="muted">Select a finding to inspect its evidence and record your assessment.</p></div>';return;}
  const e=f.evidence;
  $('detail').innerHTML=`<div class="panel-heading"><h2>Evidence & assessment</h2><span class="chip">${f.priority.toUpperCase()} / ${f.score}</span></div><div class="detail-body"><span class="small-label">${f.cve}</span><h2>${escape(f.asset)}</h2><p class="muted">${escape(e?.vulnerabilityName||'CVE not present in this KEV snapshot')}</p><dl class="facts"><div><dt>Mission / workflow</dt><dd>${escape(f.mission)}</dd></div><div><dt>Responsible team</dt><dd>${escape(f.owner)}</dd></div><div><dt>Business criticality</dt><dd>${f.criticality} / 5</dd></div><div><dt>Internet exposure</dt><dd>${f.internet_exposed?'Yes — analyst supplied':'No — analyst supplied'}</dd></div></dl><div class="evidence"><h3>${e?'CISA exploitation evidence':'Evidence gap'}</h3><p>${escape(e?.shortDescription||'No match in the selected catalog. This does not establish that the asset is safe or that exploitation has not occurred.')}</p>${e?`<p class="muted">Added ${e.dateAdded} · Ransomware campaign use: ${escape(e.knownRansomwareCampaignUse)}</p><h3>Published action</h3><p>${escape(e.requiredAction)}</p>`:''}<a href="https://www.cve.org/CVERecord?id=${f.cve}" target="_blank" rel="noopener noreferrer">CVE record</a> · <a href="${SOURCE_URL}" target="_blank" rel="noopener noreferrer">CISA source</a></div><h3>Why this score</h3><div class="score-breakdown">${f.factors.map(x=>`<span>${x.label}</span><span>+${x.points}</span>`).join('')}</div><p class="muted">A transparent triage heuristic, not an exploit probability. Verify versions and applicability before action.</p><form id="review-form"><label for="review-status">Analyst decision</label><select id="review-status">${STATUSES.map(s=>`<option ${s===f.status?'selected':''}>${s}</option>`).join('')}</select><label for="review-notes">Supporting note</label><textarea id="review-notes" rows="4" maxlength="4000" placeholder="Record validation, action, or justification…">${escape(f.notes)}</textarea><p id="review-error" class="error" role="alert"></p><div class="actions"><button class="primary" type="submit">Apply review</button><span class="muted" id="draft-state">Saved in this session</span></div></form></div>`;
  draft=false;
}
function drawSources(){
  $('content').innerHTML=`<section class="panel"><div class="panel-heading"><h2>Sources & scoring method</h2><div class="actions"><button id="offline-catalog">Open catalog JSON</button><button id="refresh-catalog" class="primary">Refresh public catalog</button></div></div><div class="page-copy"><h3>CISA Known Exploited Vulnerabilities</h3><p><strong>Current origin:</strong> ${escape(catalogOrigin)}.</p><p>This workspace matches exact CVE identifiers against a KEV-format catalog. The publisher reference is the official <a href="${SOURCE_URL}" target="_blank" rel="noopener noreferrer">CISA GitHub mirror</a>. Loaded snapshot: <strong>${escape(project.catalog.catalogVersion)}</strong>, released ${escape(project.catalog.dateReleased)}, ${project.catalog.count.toLocaleString()} entries.</p><p>Refresh downloads the public catalog from GitHub. Your assets, findings, and review notes are not included in that request. For offline operation, open a catalog JSON obtained from the official mirror. Imported project catalogs should be checked against the original source before relying on them.</p><h3>Score, explained</h3><ul><li>50 points: the CVE appears in this KEV snapshot.</li><li>5–25 points: analyst-supplied business criticality, multiplied by five.</li><li>20 points: analyst marks the asset as internet exposed.</li><li>5 points: CISA reports known ransomware campaign use.</li></ul><p>High: 75–100. Elevated: 50–74. Standard: below 50. These thresholds are product assumptions, not a validated risk model. Scores do not change when a finding is closed; use status filters to distinguish open work.</p><h3>What the evidence establishes</h3><p>KEV membership records exploitation of the vulnerability in the wild. It does not prove compromise of your asset, verify the installed version, identify an attacker, or establish targeting of India or the defense sector. A missing entry does not establish safety. CISA remediation due dates apply in their stated US federal context and are not presented as Indian legal deadlines here.</p><h3>India context</h3><p><a href="https://www.cert-in.org.in/s2cMainServlet?pageid=PUBADVLIST" target="_blank" rel="noopener noreferrer">CERT-In advisories</a> are a separate primary reference for Indian analysts. This version links to them; it does not claim automated CERT-In ingestion or regulatory compliance.</p><h3>Project files & data handling</h3><p>Analysis runs in this browser. There are no analytics scripts, AI API calls, customer-data uploads, or automatic saves. Save project downloads the findings, full catalog snapshot, and review history to a JSON file (maximum 12 MB). Open project restores that file and labels its provenance unverified; trust labels in external files are never accepted. Treat exported files according to your organization's data rules. Review history is editable and is not a tamper-evident audit log.</p><h3>Intended use</h3><p>Research prototype for evaluating an analyst workflow. No scanning, exploitation, automatic remediation, production authentication, multi-user collaboration, or security accreditation is provided. Validate with synthetic or approved non-sensitive findings first.</p><button id="load-demo">Load synthetic demo</button><input type="file" id="catalog-file" accept=".json,application/json" hidden></div></section>`;
}
function drawHistory(){
  $('content').innerHTML=`<section class="panel"><div class="panel-heading"><h2>Review history</h2><span class="muted">${project.history.length} recorded decisions</span></div><div class="page-copy"><p>Decisions applied in the workspace and retained in saved project files. This history is editable project data, not a secure audit trail.</p></div>${project.history.length?[...project.history].reverse().slice(0,200).map(h=>`<article class="history-item"><span class="small-label">${escape(new Date(h.at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'}))} IST</span><h3 style="margin-top:10px">${escape(h.asset)} · ${h.cve}</h3><p>${h.from} → ${h.to}</p><p class="muted">${escape(h.notes)||'No supporting note'}</p></article>`).join(''):'<p class="empty">No decisions recorded yet.<br>Apply a review from the exposure queue.</p>'}${project.history.length>200?'<p class="empty">Showing the latest 200. The saved project retains the full history.</p>':''}</section>`;
}
function openProject(next,origin=catalogOrigin){project=next;catalogOrigin=origin;filters={query:'',status:'all',evidence:'all'};selected=null;page=0;view='queue';draft=false;recalculate();render();}
async function loadFile(file,max){if(!file)throw new Error('Choose a file.');if(file.size>max)throw new Error(`File exceeds the ${max/1_000_000} MB limit.`);return file.text();}
async function refreshCatalog(){
  const original=project;
  const button=$('refresh-catalog');button.disabled=true;button.textContent='Refreshing…';
  try{
    const response=await fetch(CATALOG_URL,{cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw new Error(`Catalog server returned ${response.status}.`);
    const raw=await response.text();
    if(utf8Bytes(raw)>MAX_PROJECT_BYTES)throw new Error('Catalog exceeds size limit.');
    project=replaceCatalog(project,original,JSON.parse(raw),draft);
    catalogOrigin='Official CISA mirror fetched this session';
    recalculate();setDirty();render();
    feedback(`Catalog refreshed: ${project.catalog.count.toLocaleString()} entries. Save the project to retain this snapshot.`);
  }catch(e){feedback(`Refresh failed. Current evidence retained. ${e.message}`,true);if(button.isConnected){button.disabled=false;button.textContent='Refresh public catalog';}}
}
document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;
  try{
    if(button.dataset.close){$(button.dataset.close).close();return;}
    if(!project&&button.id!=='retry-load')return;
    if(button.dataset.view){if(!canLeaveDraft())return;view=button.dataset.view;render();return;}
    if(button.dataset.finding){if(!canLeaveDraft())return;selected=decodeURIComponent(button.dataset.finding);drawList();drawDetail();return;}
    switch(button.id){
      case 'import': $('import-error').textContent='';$('import-dialog').showModal();break;
      case 'template':download('ruthless-findings-template.csv',TEMPLATE,'text/csv');break;
      case 'save-project':if(draft){feedback('Apply or discard the review draft before saving the project.',true);return;}download('ruthless-project.json',serializeProject(project),'application/json');setDirty(false);feedback('Project download started. Keep that file to reopen your work.');break;
      case 'open-project':$('project-file').click();break;
      case 'previous':if(!canLeaveDraft())return;page--;selected=validRows()[page*PAGE_SIZE]?.id;drawList();drawDetail();break;
      case 'next':if(!canLeaveDraft())return;page++;selected=validRows()[page*PAGE_SIZE]?.id;drawList();drawDetail();break;
      case 'export-csv':if(draft){feedback('Apply the review draft before exporting.',true);return;}download('ruthless-filtered-findings.csv',exportCSV(validRows(),project.catalog,catalogOrigin),'text/csv');feedback(`Exported ${validRows().length} filtered findings.`);break;
      case 'export-brief':if(draft){feedback('Apply the review draft before exporting.',true);return;}download('ruthless-exposure-brief.md',exportBrief(project,items,catalogOrigin),'text/markdown');feedback(`Exported the full ${items.length}-finding brief.`);break;
      case 'refresh-catalog':await refreshCatalog();break;
      case 'offline-catalog':$('catalog-file').click();break;
      case 'load-demo':if(canReplace()){openProject(makeProject(parseCSV(DEMO_CSV),project.catalog,'demo'));setDirty(false);feedback('Synthetic demo loaded.');}break;
      case 'retry-load':await boot();break;
    }
  }catch(e){feedback(e.message,true);}
});
document.addEventListener('input',event=>{
  if(event.target.id==='search'){
    if(draft){event.target.value=filters.query;feedback('Apply the review draft before changing filters.',true);return;}
    filters.query=event.target.value;page=0;drawList();drawDetail();
  }
  if(['review-notes','review-status'].includes(event.target.id)){draft=true;$('draft-state').textContent='Unapplied changes';$('draft-state').classList.add('save-state');}
});
document.addEventListener('change',async event=>{
  const el=event.target;
  try{
    if(['status-filter','evidence-filter'].includes(el.id)){
      const key=el.id==='status-filter'?'status':'evidence';if(!canLeaveDraft()){el.value=filters[key];return;}filters[key]=el.value;page=0;drawList();drawDetail();
    }
    if(el.id==='review-status'){draft=true;$('draft-state').textContent='Unapplied changes';}
    if(el.id==='csv-file'){
      const priorText=$('csv-text').value;
      try{const raw=await loadFile(el.files[0],MAX_CSV_BYTES);if(!$('import-dialog').open||$('csv-text').value!==priorText)throw new Error('Import changed while the file was loading. Select the file again.');$('csv-text').value=raw;$('import-error').textContent='';}catch(e){$('import-error').textContent=e.message;}finally{el.value='';}
    }
    if(el.id==='project-file'){const next=parseProject(await loadFile(el.files[0],MAX_PROJECT_BYTES));if(canReplace()){openProject(next,'Project file — unverified provenance');setDirty(false);feedback('Project restored. Its catalog provenance is unverified until refreshed from CISA.');}el.value='';}
    if(el.id==='catalog-file'){
      const original=project;
      const raw=await loadFile(el.files[0],MAX_PROJECT_BYTES);
      project=replaceCatalog(project,original,JSON.parse(raw),draft);
      catalogOrigin='Catalog file — unverified provenance';
      recalculate();setDirty();render();feedback('Catalog file loaded. Verify its provenance against the official CISA mirror.');
    }
  }catch(e){feedback(e.message,true);if(el.type==='file')el.value='';}
});
document.addEventListener('submit',event=>{
  if(event.target.id==='import-form'){
    event.preventDefault();try{const findings=parseCSV($('csv-text').value);if(!canReplace())return;openProject(makeProject(findings,project.catalog));setDirty();$('import-dialog').close();feedback(`Imported ${findings.length} findings. No data was uploaded.`);}catch(e){$('import-error').textContent=e.message;}
  }
  if(event.target.id==='review-form'){
    event.preventDefault();try{project=reviewFinding(project,selected,$('review-status').value,$('review-notes').value);draft=false;recalculate();setDirty();drawStats();drawList();drawDetail();feedback('Review applied to this session. Save project to retain it.');}catch(e){$('review-error').textContent=e.message;}
  }
});
window.addEventListener('beforeunload',e=>{if(dirty||draft){e.preventDefault();e.returnValue='';}});
async function boot(){
  for(const id of ['import','save-project','open-project'])$(id).disabled=true;
  try{const response=await fetch('./kev.json');if(!response.ok)throw new Error(`Bundled catalog returned ${response.status}.`);const catalog=validateCatalog(await response.json());openProject(makeProject(parseCSV(DEMO_CSV),catalog,'demo'));setDirty(false);registerTools();}
  catch(e){$('content').innerHTML=`<section class="panel"><div class="empty"><h2>Evidence catalog unavailable</h2><p>${escape(e.message)}</p><button id="retry-load">Retry</button></div></section>`;for(const id of ['import','save-project','open-project'])$(id).disabled=true;}
}
let toolLifecycle;
function registerTools(){
  for(const id of ['import','save-project','open-project'])$(id).disabled=false;
  const context=document.modelContext;if(!context?.registerTool||toolLifecycle)return;
  toolLifecycle=new AbortController();
  const definition={name:'search_exposure_findings',title:'Search exposure findings',description:'Filter and display findings already loaded in this browser workspace. Returns up to 50 summaries; does not scan systems or modify review decisions.',inputSchema:{type:'object',properties:{query:{type:'string',maxLength:200}},required:['query'],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute(input){if(!input||typeof input.query!=='string'||input.query.length>200||Object.keys(input).some(x=>x!=='query'))throw new Error('Provide only a query string up to 200 characters.');if(draft)throw new Error('Apply or discard the review draft first.');filters={query:input.query,status:'all',evidence:'all'};page=0;view='queue';render();const found=validRows();return {count:found.length,findings:found.slice(0,50).map(({asset,cve,score,status})=>({asset,cve,score,status}))};}};
  try{Promise.resolve(context.registerTool(definition,{signal:toolLifecycle.signal})).catch(()=>{});}catch{/* Browser support is optional. */}
}
await boot();
