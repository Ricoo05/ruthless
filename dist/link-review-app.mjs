import {linkReviewPair,retainLinkReview,linkReviewStates} from './link-review-core.mjs';
import {extractContextMentions} from './context-hints.mjs';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function linkReviewController({getWorkspace,applyWorkspace,today,uid,canChange,refresh,feedback}){
  let pair=null,base=null,asOf=null,dirty=false;
  const reset=()=>{pair=null;base=null;dirty=false;$('link-review-form').reset();$('resume-link-review').hidden=true;$('link-review-dialog').close();};
  function open(left,right,date){
    if(pair&&dirty){if(pair.left.recordKey===left&&pair.right.recordKey===right&&asOf===date){$('link-review-dialog').showModal();return;}feedback('Retain or clear the current context-review draft before reviewing another pair.',true);return;}
    if(!canChange())return;
    const selected=linkReviewPair(getWorkspace(),left,right,date);base=getWorkspace();pair=selected;asOf=date;dirty=false;$('link-review-form').reset();$('prepare-link-quotes').disabled=false;$('link-review-error').textContent='';$('resume-link-review').hidden=false;
    $('link-review-originals').innerHTML=`<p>Selected source snapshot known by ${asOf}. Review recorded on ${today()}. Reviewer labels and source provenance remain unverified.</p><div class="report-pair">${[pair.left,pair.right].map((r,i)=>`<article class="warning-source"><h3>${i?'Right':'Left'} / ${esc(r.title)}</h3><p>${esc(r.recordKey)} · Case ${esc(r.assessmentId)}<br>Published ${r.reportedAt} · Recorded ${r.recordedAt}<br>${esc(r.publisher)} · Group ${esc(r.originGroup)}</p><blockquote class="source-excerpt">${esc(r.text)}</blockquote>${r.accessNote?`<p>Source conditions: ${esc(r.accessNote)}</p>`:''}</article>`).join('')}</div>`;
    $('link-review-dialog').showModal();
  }
  $('link-review-form').addEventListener('input',()=>{dirty=true;$('prepare-link-quotes').disabled=true;});
  $('link-review-form').addEventListener('change',()=>{dirty=true;$('prepare-link-quotes').disabled=true;});
  $('close-link-review').addEventListener('click',()=>{$('link-review-dialog').close();});
  $('resume-link-review').addEventListener('click',()=>{if(pair)$('link-review-dialog').showModal();});
  $('clear-link-review').addEventListener('click',reset);
  $('prepare-link-quotes').addEventListener('click',()=>{
    if(!pair||dirty)return;let count=0;
    for(const side of ['left','right']){
      const hints=extractContextMentions(pair[side].text);
      for(const [kind,state,field] of [['places','placeState','Place'],['dates','dateState','Time']])if(hints[state]==='Single'&&hints[kind][0].quote.length<=300){$('link-'+side+'-'+field.toLowerCase()).value=hints[kind][0].quote;count++;}
    }
    if(count)dirty=true;$('prepare-link-quotes').disabled=true;feedback(`Prepared ${count} quotation(s). Choose the interpretation yourself; no relationships were set.`);
  });
  $('link-review-form').addEventListener('submit',event=>{
    event.preventDefault();try{
      if(!pair||getWorkspace()!==base)throw Error('Workspace changed. Clear this draft and open a current review.');
      const data=Object.fromEntries(new FormData(event.target));
      const next=retainLinkReview(base,{...data,id:uid('linkreview'),asOf,snapshot:pair},today());
      applyWorkspace(next);reset();refresh();feedback('Source-linked interpretation retained in this workspace. Save or retain its JSON to recover it. No evidence, case merge or assessment approval was added.');
    }catch(error){$('link-review-error').textContent=error.message;}
  });
  function ledger(knownBy){
    const states=linkReviewStates(getWorkspace(),knownBy),visible=states.filter(s=>s.state!=='Not yet recorded');
    return `<section class="report-link-section"><h3>Retained context reviews</h3><p>${visible.length} review(s) recorded by ${knownBy}; ${states.length-visible.length} later review(s) withheld. This ledger uses Known by only; report-range and scope filters apply to comparisons above. Proposals remain editable local data, not authenticated approvals.</p>${visible.map(({review:r,state})=>`<article class="signal-card"><div class="case-heading"><h4>${esc(r.conclusion)}</h4><span class="chip">${esc(state)}</span></div><p>${esc(r.id)} · Reviewer label ${esc(r.reviewer)} · Recorded ${r.createdAt} · Source snapshot as of ${r.asOf}</p><p>${esc(r.snapshot.left.recordKey)} / ${esc(r.snapshot.right.recordKey)}</p><p>Place: ${esc(r.placeRelation)} · Time: ${esc(r.timeRelation)} · Reporting relationship: ${esc(r.reportRelationship)}</p><p>${esc(r.note)}</p>${state==='Stale source snapshot'?'<p class="notice">A source changed, became superseded or is unavailable at this date. Inspect current sources and retain a new review; this earlier proposal is history.</p>':''}<details><summary>Inspect retained quotations and source snapshots</summary>${Object.entries(r.citations).filter(([,q])=>q).map(([key,q])=>`<p>${esc(key)} · UTF-16 [${q.start}, ${q.end})</p><blockquote class="source-excerpt">${esc(q.quote)}</blockquote>`).join('')}<div class="report-pair">${[r.snapshot.left,r.snapshot.right].map(s=>`<article class="warning-source"><h4>${esc(s.title)}</h4><p>${esc(s.recordKey)} · ${esc(s.publisher)} · Group ${esc(s.originGroup)}<br>Published ${s.reportedAt} · Recorded ${s.recordedAt}</p><blockquote class="source-excerpt">${esc(s.text)}</blockquote></article>`).join('')}</div></details></article>`).join('')||'<p class="empty">No retained context reviews at this date. Open a related-report lead to review exact source quotations.</p>'}</section>`;
  }
  return {open,ledger,reset,hasDraft:()=>dirty};
}
