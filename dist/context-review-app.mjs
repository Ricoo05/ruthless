import {contextPair,createContextReview} from './context-review.mjs';
import {linkageFixtures} from './linkage-fixtures.mjs';
import {compareContextMentions} from './context-hints.mjs';
const $=id=>document.getElementById(id),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function initContextReview(){
 let pair=null,hints=null,dirty=false,saving=false;const reviews=new Map(),key=(a,b)=>JSON.stringify([a,b]);
 const count=()=>{$('context-count').textContent=`${reviews.size} context proposal(s) retained in this tab. Editable analyst proposals, not authenticated approvals. Reloading loses them.`;};
 function open(caseId,candidateId){
  if(saving)return;
  if(pair&&dirty&&key(pair.caseId,pair.right.id)!==key(caseId,candidateId)){$('lab-error').textContent='Complete or clear the current context-review form before opening another pair. Resume context review keeps your entered quotations.';return;}
  if(!pair||key(pair.caseId,pair.right.id)!==key(caseId,candidateId)){
   const c=linkageFixtures.find(c=>c.id===caseId);if(!c)throw Error('Unknown fictional case.');pair=contextPair(c,candidateId);hints=compareContextMentions(pair);$('context-form').reset();dirty=false;$('context-error').textContent='';const previous=reviews.get(key(caseId,candidateId));$('context-receipt').textContent=previous?`Prior proposal in this tab: ${previous.conclusion}. A new retained review replaces that proposal.`:'';
   $('context-originals').innerHTML=`<p>${esc(caseId)} / known by ${esc(pair.asOf)}</p><div class="context-originals-grid">${[pair.left,pair.right].map((r,i)=>`<div><h3>${i?'Candidate':'Query'} / ${esc(r.id)}</h3><p class="muted">Published ${r.reportedAt} · Recorded ${r.recordedAt}. Availability dates do not establish event time.</p><blockquote>${esc(r.text)}</blockquote></div>`).join('')}</div>`;
   $('context-hints').innerHTML=`<h3>Extracted source mentions</h3>${[['Date',hints.date],['Fictional place',hints.place]].map(([label,h])=>`<p><strong>${label}: ${esc(h.relation)}</strong> · ${esc(h.reason)}</p>${h.left&&h.right?`<p class="muted">Query: <q>${esc(h.left.quote)}</q> · Candidate: <q>${esc(h.right.quote)}</q></p>`:''}`).join('')}<p class="muted">Query date/place: ${hints.left.dateState}/${hints.left.placeState}. Candidate date/place: ${hints.right.dateState}/${hints.right.placeState}. A date mention may describe a different event or a correction. These are quotation suggestions, not reviewed event fields.</p>`;
   $('prepare-context-quotes').disabled=![hints.left,hints.right].some(h=>h.dateState==='Single'||h.placeState==='Single');$('context-hint-status').textContent='';
  }
  $('resume-context').disabled=false;$('context-dialog').showModal();
 }
 document.addEventListener('click',event=>{const button=event.target.closest('button[data-context-case]');if(!button)return;try{open(button.dataset.contextCase,button.dataset.contextCandidate);}catch(error){$('lab-error').textContent=error.message;}});
 $('resume-context').addEventListener('click',()=>{if(pair)$('context-dialog').showModal();});
 $('close-context').addEventListener('click',()=>{$('context-dialog').close();});
 $('clear-context').addEventListener('click',()=>{if(saving)return;pair=null;dirty=false;$('context-form').reset();$('context-originals').textContent='';$('resume-context').disabled=true;$('context-error').textContent='';$('context-receipt').textContent='';$('context-dialog').close();});
 $('prepare-context-quotes').addEventListener('click',()=>{if(!pair||!hints||dirty||saving)return;let n=0;for(const [side,prefix] of [['left','left'],['right','right']])for(const [kind,field,state] of [['places','place','placeState'],['dates','time','dateState']]){const h=hints[side];if(h[state]==='Single'&&h[kind][0].quote.length<=300){$(prefix+'-'+field).value=h[kind][0].quote;n++;}}dirty=n>0;$('prepare-context-quotes').disabled=true;$('context-hint-status').textContent=`Prepared ${n} source quotation(s). Review event attachment and choose the relationships yourself. No proposed conclusion or review status was set.`;});
 const changed=()=>{dirty=true;$('prepare-context-quotes').disabled=true;$('context-receipt').textContent='';};$('context-form').addEventListener('input',changed);$('context-form').addEventListener('change',changed);
 $('context-form').addEventListener('submit',async event=>{event.preventDefault();if(!pair||saving)return;saving=true;const selected=pair,submit=$('context-form').querySelector('button[type="submit"]');submit.disabled=true;try{const data=Object.fromEntries(new FormData(event.target)),review=await createContextReview(selected,data);reviews.set(key(selected.caseId,selected.right.id),review);dirty=false;$('context-error').textContent='';$('context-receipt').textContent=`${review.conclusion} retained as an analyst proposal. Source binding ${review.sourceBinding.slice(0,16)}. Exact quotations checked; interpretation remains a reviewer judgment. Session-only; no workspace or approval changed.`;count();}catch(error){$('context-error').textContent=error.message;}finally{saving=false;submit.disabled=false;}});
 count();
}
