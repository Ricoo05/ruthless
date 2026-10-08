import {publicURL,COUNTRIES} from './osint-core.mjs';
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function csvCell(value){let s=String(value??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(s)||/^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
export function exportPublicSource(capture,format){
  if(capture?.format!=='ruthless-public-source'||capture.version!==1||capture.synthetic!==false||!Object.hasOwn(COUNTRIES,capture.country))throw new Error('Choose a collected public source.');
  if(format==='json')return {text:JSON.stringify(capture,null,2),type:'application/json'};
  const rows=capture.provider==='govuk'?capture.sections.map(s=>({title:s.title,url:s.sourceURL,text:s.originalText,time:capture.publisherUpdatedAt,timeType:'Advisory updated',publisher:capture.publisher})):capture.articles.map(a=>({title:a.title,url:a.url,text:'',time:a.firstSeenAt,timeType:'Index first seen (not publication or event time)',publisher:a.publisherDomain}));
  if(format==='csv'){
    const columns=['Country','Publisher','Title','Source URL','Source time','Time meaning','Fetched at','Source text'];
    return {type:'text/csv;charset=utf-8',text:'\uFEFF'+[columns,...rows.map(r=>[COUNTRIES[capture.country],r.publisher,r.title,publicURL(r.url)??'',r.time,r.timeType,capture.checkedAt,r.text])].map(r=>r.map(csvCell).join(',')).join('\r\n')};
  }
  if(format!=='html')throw new Error('Unsupported export format.');
  return {type:'text/html;charset=utf-8',text:`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; form-action 'none'"><title>Ruthless public-source report</title><h1>Ruthless public-source report</h1><p>Country: ${escapeHTML(COUNTRIES[capture.country])} · fetched ${escapeHTML(capture.checkedAt)}</p><p>Source material for analyst review. No threat finding or independent corroboration is established.</p>${rows.map(r=>`<article><h2>${escapeHTML(r.title)}</h2><p>${escapeHTML(r.publisher)} · ${escapeHTML(r.timeType)}: ${escapeHTML(r.time)}</p>${publicURL(r.url)?`<p><a href="${escapeHTML(r.url)}" rel="noopener noreferrer">Original source</a></p>`:''}<pre>${escapeHTML(r.text)}</pre></article>`).join('')}${capture.provider==='govuk'?'<p>Contains public sector information licensed under the Open Government Licence v3.0. https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/</p>':'<p>GDELT index metadata. Linked article content remains with the original publisher.</p>'}</html>`};
}
