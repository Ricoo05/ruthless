import {MAX_BYTES,day,normalizeSourceDocument,stageDocument,validateWorkspace} from './threat-core.mjs';
const fail=m=>{throw new Error(m);};
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v,fields,label)=>{if(!object(v)||Object.keys(v).some(k=>!fields.includes(k))||fields.some(k=>!Object.hasOwn(v,k)))fail(`Unexpected or missing ${label} fields.`);};
const identifier=v=>{if(typeof v!=='string'||!/^[a-zA-Z0-9_-]{1,60}$/.test(v))fail('Invalid import identifier.');return v;};
const text=(v,label,max)=>{if(typeof v!=='string'||!v.trim()||v.trim().length>max)fail(`Invalid ${label}.`);return v.trim();};
const sourceFields=['assessmentId','title','publisher','originGroup','url','reportedAt','recordedAt','language','locator','accessNote','excerpt','synthetic'];
export function validateSourceBatch(v){
  if(new TextEncoder().encode(JSON.stringify(v)).length>MAX_BYTES)fail('Source batch exceeds 2 MB in UTF-8.');
  exact(v,['format','version','sourceSystem','label','permissionNote','records'],'source batch');if(v.format!=='ruthless-source-batch'||v.version!==1)fail('Unsupported source batch format.');
  if(!Array.isArray(v.records)||!v.records.length||v.records.length>50)fail('Source batch limit: 1–50 records.');
  const seen=new Set(),records=v.records.map((r,i)=>{exact(r,['externalRecordId',...sourceFields,'supersedesExternalRecordId','revisionNote'],`source row ${i+1}`);const externalRecordId=identifier(r.externalRecordId);if(seen.has(externalRecordId))fail('Duplicate external record identifier in this batch.');seen.add(externalRecordId);if(r.supersedesExternalRecordId)identifier(r.supersedesExternalRecordId);else if(r.supersedesExternalRecordId!=='')fail('Invalid earlier external record identifier.');if(typeof r.revisionNote!=='string'||r.revisionNote.length>2000)fail('Invalid revision note.');return structuredClone(r);});
  return {format:v.format,version:1,sourceSystem:identifier(v.sourceSystem),label:text(v.label,'batch label',200),permissionNote:text(v.permissionNote,'batch permission review',1500),records};
}
export function parseSourceBatch(raw){if(typeof raw!=='string'||new TextEncoder().encode(raw).length>MAX_BYTES)fail('Source batch exceeds 2 MB in UTF-8.');let v;try{v=JSON.parse(raw);}catch{fail('Source batch is not valid JSON.');}return validateSourceBatch(v);}
export function importSourceBatch(workspace,input,{batchId,idForRecord,at,accessAcknowledged}){
  day(at);if(accessAcknowledged!==true)fail('Confirm source access and reuse conditions before staging an import.');const batch=validateSourceBatch(input);identifier(batchId);
  if(workspace.importBatches.some(b=>b.id===batchId))fail('Import batch identifier already exists.');if(typeof idForRecord!=='function')fail('An import document ID factory is required.');
  const oldBatches=new Map(workspace.importBatches.map(b=>[b.id,b]));
  const known=new Map(workspace.documents.filter(d=>oldBatches.get(d.importBatchId)?.sourceSystem===batch.sourceSystem).map(d=>[d.externalRecordId,d]));
  let next=workspace;const added=[],skipped=[];
  for(let i=0;i<batch.records.length;i++){
    const r=batch.records[i];try{
      const parent=r.supersedesExternalRecordId?known.get(r.supersedesExternalRecordId):null;if(r.supersedesExternalRecordId&&!parent)fail('Earlier external record must already exist or appear earlier in this batch.');
      const d=normalizeSourceDocument({...r,id:known.get(r.externalRecordId)?.id??idForRecord(r,i),supersedesDocumentId:parent?.id??'',reviewNote:'',importBatchId:'',externalRecordId:''});
      if(d.recordedAt>at)fail('Import staging cannot precede a source recorded date.');
      const existing=known.get(r.externalRecordId);
      if(existing){if([...sourceFields,'supersedesDocumentId','revisionNote'].some(k=>existing[k]!==d[k]))fail('Existing external record changed. Use a new external ID linked to its earlier revision.');skipped.push({externalRecordId:r.externalRecordId,documentId:existing.id});continue;}
      next=stageDocument(next,{...d,accessAcknowledged:true},at);const staged=next.documents.find(x=>x.id===d.id);known.set(r.externalRecordId,staged);added.push({externalRecordId:r.externalRecordId,documentId:staged.id});
    }catch(e){fail(`Row ${i+1} (${r.externalRecordId}): ${e.message}`);}
  }
  if(!added.length)return {workspace,added,skipped};
  const imported=new Map(added.map(x=>[x.documentId,x.externalRecordId]));
  const documentIds=added.map(x=>x.documentId),affected=new Set(next.documents.filter(d=>imported.has(d.id)).map(d=>d.assessmentId));
  next=validateWorkspace({...next,documents:next.documents.map(d=>imported.has(d.id)?{...d,importBatchId:batchId,externalRecordId:imported.get(d.id)}:d),importBatches:[...next.importBatches,{id:batchId,sourceSystem:batch.sourceSystem,label:batch.label,stagedAt:at,permissionNote:batch.permissionNote,documentIds}],history:[...next.history,...[...affected].map(assessmentId=>({assessmentId,at,action:'Source batch staged',note:`${batchId}: ${added.length} new source records; ${skipped.length} unchanged records skipped. Permission review is analyst-supplied; no source verified.`}))]});
  return {workspace:next,added,skipped};
}
export function trainingSourceBatch(assessmentId,at){
  day(at);const base={assessmentId,publisher:'Fictional integration desk',originGroup:'fictional-integration-original',url:'',reportedAt:at,recordedAt:at,language:'English / Hindi',locator:'Paragraph 1',accessNote:'Synthetic text authored for this prototype; no real publisher material.',synthetic:true,supersedesExternalRecordId:'',revisionNote:''};
  return {format:'ruthless-source-batch',version:1,sourceSystem:'ruthless-training-import-v1',label:'Synthetic integration training batch',permissionNote:'Authored fictional material; attribution and uncertainty still require analyst review.',records:[
    {...base,externalRecordId:'training-original',title:'Initial fictional account',excerpt:'A preliminary fictional account alleges deliberate damage. The cause remains unconfirmed.'},
    {...base,externalRecordId:'training-repost',title:'Repost of the fictional account',publisher:'Fictional repost desk',excerpt:'This fictional desk repeats the original account. It supplies no separate evidence.'},
    {...base,externalRecordId:'training-correction',title:'Correction to the fictional account',excerpt:'Correction: the allegation of deliberate damage is withdrawn. कारण अज्ञात है। The cause remains unknown.',supersedesExternalRecordId:'training-original',revisionNote:'The publisher withdraws the earlier allegation; the earlier excerpt remains retained.'}
  ]};
}
