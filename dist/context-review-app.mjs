import {contextPair,createContextReview} from './context-review.mjs';
import {linkageFixtures} from './linkage-fixtures.mjs';
const $=id=>document.getElementById(id),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function initContextReview(){
 let pair=null,dirty=false,saving=false;const reviews=new Map(),key=(a,b)=>JSON.stringify([a,b]);
 const count=()=>{$('context-count').textContent=`${reviews.size} context proposal(s) retained in this tab. Editable analyst proposals, not authenticated approvals. Reloading loses them.`;};
 function open(caseId,candidateId){
  if(saving)return;
  if(pair&&dirty&&key(pair.caseId,pair.right.id)!==key(caseId,candidateId)){$('lab-error').textContent='Complete or clear the current context-review form before opening another pair. Resume context review keeps your entered quotations.';return;}
  if(!pair||key(pair.caseId,pair.right.id)!==key(caseId,candidateId)){
   const c=linkageFixtures.find(c=>c.id===caseId);if(!c)throw Error('Unknown fictional case.');pair=contextPair(c,candidateId);$('context-form').reset();dirty=false;$('context-error').textContent='';const previous=reviews.get(key(caseId,candidateId));$('context-receipt').textContent=previous?`Prior proposal in this tab: ${previous.conclusion}. A new retained review replaces that proposal.`:'';
   $('context-originals').innerHTML=`<p>${esc(caseId)} / known by ${esc(pair.asOf)}</p><div class="context-originals-grid">${[pair.left,pair.right].map((r,i)=>`<div><h3>${i?'Candidate':'Query'} / ${esc(r.id)}</h3><p class="muted">Published ${r.reportedAt} · Recorded ${r.recordedAt}. Availability dates do not establish event time.</p><blockquote>${esc(r.text)}</blockquote></div>`).join('')}</div>`;
  }
  $('resume-context').disabled=false;$('context-dialog').showModal();
 }
 document.addEventListener('click',event=>{const button=event.target.closest('button[data-context-case]');if(!button)return;try{open(button.dataset.contextCase,button.dataset.contextCandidate);}catch(error){$('lab-error').textContent=error.message;}});
 $('resume-context').addEventListener('click',()=>{if(pair)$('context-dialog').showModal();});
 $('close-context').addEventListener('click',()=>{$('context-dialog').close();});
 $('clear-context').addEventListener('click',()=>{if(saving)return;pair=null;dirty=false;$('context-form').reset();$('context-originals').textContent='';$('resume-context').disabled=true;$('context-error').textContent='';$('context-receipt').textContent='';$('context-dialog').close();});
 const changed=()=>{dirty=true;$('context-receipt').textContent='';};$('context-form').addEventListener('input',changed);$('context-form').addEventListener('change',changed);
 $('context-form').addEventListener('submit',async event=>{event.preventDefault();if(!pair||saving)return;saving=true;const selected=pair,submit=$('context-form').querySelector('button[type="submit"]');submit.disabled=true;try{const data=Object.fromEntries(new FormData(event.target)),review=await createContextReview(selected,data);reviews.set(key(selected.caseId,selected.right.id),review);dirty=false;$('context-error').textContent='';$('context-receipt').textContent=`${review.conclusion} retained as an analyst proposal. Source binding ${review.sourceBinding.slice(0,16)}. Exact quotations checked; interpretation remains a reviewer judgment. Session-only; no workspace or approval changed.`;count();}catch(error){$('context-error').textContent=error.message;}finally{saving=false;submit.disabled=false;}});
 count();
}
