import {day, documentIsCurrent} from './threat-core.mjs';
import {validateSourceBatch} from './source-import.mjs';

export const COLLECTION_SOURCE = Object.freeze({id:'govuk-fcdo-india',
  endpoint:'https://www.gov.uk/api/content/foreign-travel-advice/india',
  page:'https://www.gov.uk/foreign-travel-advice/india',
  publisher:'Foreign, Commonwealth & Development Office (UK)',
  licence:'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
  attribution:'Contains public sector information licensed under the Open Government Licence v3.0.'});
export const EXTRACTION_VERSION='html-text-v1';
const slugs=['warnings-and-insurance','safety-and-security','regional-risks'];
const fail=m=>{throw new Error(m);};
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v,keys)=>{if(!object(v)||Object.keys(v).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(v,k)))fail('Unexpected or missing collection fields.');};
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const sha=v=>typeof v==='string'&&/^[0-9a-f]{64}$/.test(v);
function instant(v){if(!text(v,40)||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(v)||!Number.isFinite(Date.parse(v)))fail('Invalid collection timestamp.');day(v.slice(0,10));return Date.parse(v);}
export async function digest(value){const data=new TextEncoder().encode(value);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');}
export async function parseCollectionReport(raw,{at=new Date(),extractText}={}){
  if(typeof raw!=='string'||new TextEncoder().encode(raw).length>2*1024*1024)fail('Collection report exceeds 2 MB in UTF-8.');
  let r;try{r=JSON.parse(raw);}catch{fail('Collection report is not valid JSON.');}
  exact(r,['format','version','id','sourceId','endpoint','checkedAt','scope','status','reason','bytesRead','httpStatus','snapshot']);
  if(r.format!=='ruthless-collection-run'||r.version!==1||r.sourceId!==COLLECTION_SOURCE.id||r.endpoint!==COLLECTION_SOURCE.endpoint||!text(r.id,100)||!text(r.scope,300))fail('Unsupported collection source or format.');
  if(!Number.isFinite(at.getTime())||instant(r.checkedAt)>at.getTime())fail('Collection timestamp is in the future.');
  if(!Number.isSafeInteger(r.bytesRead)||r.bytesRead<0||r.bytesRead>2*1024*1024+65536||!(r.httpStatus===null||Number.isInteger(r.httpStatus)&&r.httpStatus>=100&&r.httpStatus<=599))fail('Invalid transport metadata.');
  if(r.status==='failed'){
    if(r.snapshot!==null||!['schema_mismatch','publisher_withdrawn','section_missing_or_invalid','unexpected_response_url','rate_limited','http_error','unexpected_content_type','response_too_large','empty_response','invalid_json_or_encoding','network_or_timeout'].includes(r.reason))fail('Invalid failed collection report.');
    return {...r,sections:[]};
  }
  if(r.status!=='collected'||r.reason!==null||r.httpStatus!==200)fail('Invalid collection outcome.');
  const s=r.snapshot;exact(s,['synthetic','disposition','publisher','sourceUrl','contentId','title','publisherUpdatedAt','language','responseSha256','selectedContentSha256','licenceUrl','attribution','parts','limitations']);
  if(s.synthetic!==false||s.disposition!=='quarantined'||s.publisher!==COLLECTION_SOURCE.publisher||s.sourceUrl!==COLLECTION_SOURCE.page||s.licenceUrl!==COLLECTION_SOURCE.licence||s.attribution!==COLLECTION_SOURCE.attribution||s.language!=='en'||!text(s.title,300)||!text(s.contentId,100)||!sha(s.responseSha256)||!sha(s.selectedContentSha256)||instant(s.publisherUpdatedAt)>instant(r.checkedAt)||!Array.isArray(s.limitations)||s.limitations.length>10||s.limitations.some(l=>!text(l,500)))fail('Invalid source snapshot.');
  if(!Array.isArray(s.parts)||s.parts.length!==3||typeof extractText!=='function')fail('Three source sections and a text extractor are required.');
  const parts=s.parts.map((p,i)=>{exact(p,['slug','title','sourceUrl','originalHtml']);if(p.slug!==slugs[i]||p.sourceUrl!==`${COLLECTION_SOURCE.page}/${p.slug}`||!text(p.title,300)||!text(p.originalHtml,2*1024*1024))fail('Invalid selected source section.');return {slug:p.slug,title:p.title,sourceUrl:p.sourceUrl,originalHtml:p.originalHtml};});
  if(await digest(JSON.stringify(parts))!==s.selectedContentSha256)fail('Selected source content does not match its recorded hash.');
  const sections=parts.map(p=>{const originalText=extractText(p.originalHtml);if(!text(originalText,2*1024*1024))fail('Source section has no usable text.');return {...p,originalText};});
  return {...r,snapshot:{...s,parts},sections};
}
export function collectionCoverage(lastAttempt,lastSuccess,at=new Date()){
  if(!lastAttempt)return {status:'Not collected',checkedAt:null,publisherUpdatedAt:null,canStage:false};
  const stale=at.getTime()-instant(lastAttempt.checkedAt)>24*60*60*1000;
  const status=lastAttempt.status==='failed'?'Latest attempt failed':stale?'Stale capture':'Recent capture';
  return {status,reason:lastAttempt.reason,checkedAt:lastAttempt.checkedAt,
    retainedAt:lastSuccess?.checkedAt??null,publisherUpdatedAt:lastSuccess?.snapshot.publisherUpdatedAt??null,
    canStage:!!lastSuccess,lastCaptureStale:!!lastSuccess&&at.getTime()-instant(lastSuccess.checkedAt)>24*60*60*1000};
}
export function collectionParents(workspace,assessmentId,slug){
  const batches=new Map(workspace.importBatches.map(b=>[b.id,b]));
  return workspace.documents.filter(d=>d.assessmentId===assessmentId&&batches.get(d.importBatchId)?.sourceSystem===COLLECTION_SOURCE.id&&d.url===`${COLLECTION_SOURCE.page}/${slug}`&&documentIsCurrent(workspace,d.id));
}
export async function passageBatch(workspace,report,{assessmentId,slug,excerpt,parentId='',revisionNote='',permissionNote='',at,acknowledged=false}){
  day(at);if(acknowledged!==true)fail('Confirm source rights, authenticity limitations and retained-content conditions.');
  if(!text(permissionNote,900))fail('Record your access and reuse review (maximum 900 characters).');
  if(report?.status!=='collected'||!report.sections?.length)fail('Load a successful source capture first.');
  if(!workspace.assessments.some(c=>c.id===assessmentId))fail('Select an existing assessment.');
  const section=report.sections.find(s=>s.slug===slug);if(!section)fail('Select a retained source section.');
  const quote=typeof excerpt==='string'?excerpt.trim():'';
  if(!quote||quote.length>4000)fail('Choose an exact source passage of 1–4,000 characters.');
  const start=section.originalText.indexOf(quote);
  if(start<0||section.originalText.indexOf(quote,start+1)>=0)fail('The passage must occur exactly once in the displayed source text.');
  const recordedAt=new Date(report.checkedAt).toISOString().slice(0,10),reportedAt=new Date(report.snapshot.publisherUpdatedAt).toISOString().slice(0,10);
  if(recordedAt>at)fail('Staging cannot precede the collection date.');
  const hash=await digest(JSON.stringify({assessmentId,contentId:report.snapshot.contentId,slug,title:section.title,
    reportedAt,extractionVersion:EXTRACTION_VERSION,excerpt:quote}));
  const externalRecordId=`fcdo-${hash.slice(0,40)}`;
  const batchMap=new Map(workspace.importBatches.map(b=>[b.id,b]));
  const existing=workspace.documents.find(d=>d.externalRecordId===externalRecordId&&batchMap.get(d.importBatchId)?.sourceSystem===COLLECTION_SOURCE.id);
  const parent=parentId?collectionParents(workspace,assessmentId,slug).find(d=>d.id===parentId):null;
  if(parentId&&!parent)fail('The earlier excerpt is not a current source from this section and assessment.');
  if(parent&&parent.externalRecordId===externalRecordId)fail('An unchanged passage cannot supersede itself.');
  if(parent&&(!text(revisionNote,2000)||reportedAt<parent.reportedAt||recordedAt<parent.recordedAt))fail('A correction requires a note and dates no earlier than its parent.');
  if(!parent&&revisionNote.trim())fail('Select an earlier excerpt before recording a correction.');
  if(existing&&(existing.assessmentId!==assessmentId||existing.excerpt!==quote||existing.url!==section.sourceUrl||existing.reportedAt!==reportedAt||existing.publisher!==COLLECTION_SOURCE.publisher||existing.synthetic!==false))fail('Stored source identity conflict.');
  if(existing&&!documentIsCurrent(workspace,existing.id))fail('This passage was superseded. Do not restore an obsolete capture as current.');
  const record=existing?{externalRecordId,assessmentId:existing.assessmentId,title:existing.title,publisher:existing.publisher,originGroup:existing.originGroup,url:existing.url,reportedAt:existing.reportedAt,recordedAt:existing.recordedAt,language:existing.language,locator:existing.locator,accessNote:existing.accessNote,excerpt:existing.excerpt,synthetic:false,supersedesExternalRecordId:workspace.documents.find(d=>d.id===existing.supersedesDocumentId)?.externalRecordId??'',revisionNote:existing.revisionNote}:{
    externalRecordId,assessmentId,title:`India advisory · ${section.title}`.slice(0,200),publisher:COLLECTION_SOURCE.publisher,
    originGroup:'FCDO India travel advisory',url:section.sourceUrl,reportedAt,recordedAt,language:'English',
    locator:`${slug} / ${EXTRACTION_VERSION} / text [${start}, ${start+quote.length})`,
    accessNote:`${COLLECTION_SOURCE.attribution} ${COLLECTION_SOURCE.licence} Analyst review: ${permissionNote.trim()} Capture ${report.id}; selected-content SHA-256 ${report.snapshot.selectedContentSha256}; section text is parsed, not raw HTML. Local report/rights claims are unverified.`,
    excerpt:quote,synthetic:false,supersedesExternalRecordId:parent?.externalRecordId??'',revisionNote:parent?revisionNote.trim():''};
  return validateSourceBatch({format:'ruthless-source-batch',version:1,sourceSystem:COLLECTION_SOURCE.id,
    label:'Selected official India advisory passage',permissionNote:`Analyst review: ${permissionNote.trim()} Capture identity and licence claims remain unverified.`,records:[record]});
}
