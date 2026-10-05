const fail=m=>{throw new Error(m);};
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const id=v=>{if(typeof v!=='string'||!/^[a-zA-Z0-9_-]{1,60}$/.test(v))fail('Invalid link-review identifier.');return v;};
const text=(v,max,required=true)=>{if(typeof v!=='string'||v.length>max||(required&&!v.trim()))fail('Invalid bounded link-review text.');return v;};
const choice=(v,values)=>{if(!values.includes(v))fail('Invalid link-review interpretation.');return v;};
export const LINK_CONTEXT=['Matches','Conflicts','Unknown'];
export const LINK_CONCLUSIONS=['Same event proposed','Different events proposed','Insufficient context'];
export const LINK_RELATIONSHIPS=['Repost','Contradictory account','Other related account','Unknown'];
const snapshotFields=['recordKey','id','kind','assessmentId','title','publisher','originGroup','url','reportedAt','recordedAt','synthetic','text','locator','accessNote'];
export function linkSourceSnapshot(row){return Object.fromEntries(snapshotFields.map(k=>[k,row[k]??'']));}
function sourceRecord(v,context,{day,sourceURL}){
  if(!object(v)||Object.keys(v).length!==snapshotFields.length||Object.keys(v).some(k=>!snapshotFields.includes(k)))fail('Invalid link-review source snapshot.');
  const kind=choice(v.kind,['source_excerpt','analyst_statement']),sourceId=id(v.id),assessmentId=id(v.assessmentId);
  if(v.recordKey!==`${kind}:${sourceId}`||!context.assessments.some(c=>c.id===assessmentId))fail('Invalid typed source reference in link review.');
  const retained=(kind==='source_excerpt'?context.documents:context.evidence).find(r=>r.id===sourceId);
  if(!retained||retained.assessmentId!==assessmentId||kind==='analyst_statement'&&retained.sourceDocumentId)fail('Link review must reference retained original records.');
  const reportedAt=day(v.reportedAt),recordedAt=day(v.recordedAt),url=sourceURL(v.url);
  if(recordedAt<reportedAt||typeof v.synthetic!=='boolean'||!v.synthetic&&!url)fail('Invalid link-review source provenance.');
  return {recordKey:v.recordKey,id:sourceId,kind,assessmentId,title:text(v.title,200),publisher:text(v.publisher,150),originGroup:text(v.originGroup,150),url,reportedAt,recordedAt,synthetic:v.synthetic,text:text(v.text,4000),locator:text(v.locator,200,false),accessNote:text(v.accessNote,1500,false)};
}
export function exactLinkQuote(source,value){
  if(value==='')return null;
  text(value,300);if(value.length<3)fail('Use an exact quotation of 3–300 characters.');
  const start=source.indexOf(value);if(start<0)fail('A quotation does not match its original source exactly.');
  if(source.indexOf(value,start+1)>=0)fail('A quotation is ambiguous. Include more context.');
  const end=start+value.length;
  const splits=i=>i>0&&i<source.length&&/[\uD800-\uDBFF]/.test(source[i-1])&&/[\uDC00-\uDFFF]/.test(source[i]);
  if(splits(start)||splits(end))fail('A quotation cannot split a Unicode character.');
  return {quote:value,start,end};
}
export function linkReviewRecord(v,context,helpers){
  if(!object(v)||!object(v.snapshot)||Object.keys(v.snapshot).sort().join(',')!=='left,right'||!object(v.citations)||Object.keys(v.citations).sort().join(',')!=='leftPlace,leftTime,rightPlace,rightTime')fail('Invalid link-review record.');
  const asOf=helpers.day(v.asOf),createdAt=helpers.day(v.createdAt),left=sourceRecord(v.snapshot.left,context,helpers),right=sourceRecord(v.snapshot.right,context,helpers);
  if(asOf>createdAt||[left,right].some(r=>r.reportedAt>asOf||r.recordedAt>asOf)||left.recordKey===right.recordKey)fail('Link review cannot precede its sources or compare a record with itself.');
  const placeRelation=choice(v.placeRelation,LINK_CONTEXT),timeRelation=choice(v.timeRelation,LINK_CONTEXT),conclusion=choice(v.conclusion,LINK_CONCLUSIONS),reportRelationship=choice(v.reportRelationship,LINK_RELATIONSHIPS);
  const citations={};
  for(const key of ['leftPlace','rightPlace','leftTime','rightTime']){
    const supplied=v.citations[key];if(supplied!==null&&(!object(supplied)||Object.keys(supplied).sort().join(',')!=='end,quote,start'))fail('Invalid link-review quotation fields.');
    const checked=exactLinkQuote(key.startsWith('left')?left.text:right.text,supplied?.quote??'');
    if(JSON.stringify(checked)!==JSON.stringify(supplied)){
      if(!checked||!supplied||supplied.quote!==checked.quote||supplied.start!==checked.start||supplied.end!==checked.end)fail('Invalid link-review quotation offsets.');
    }
    citations[key]=checked;
  }
  if(!(citations.leftPlace||citations.leftTime)||!(citations.rightPlace||citations.rightTime))fail('Retain at least one exact context quotation from each source.');
  if(placeRelation!=='Unknown'&&(!citations.leftPlace||!citations.rightPlace)||timeRelation!=='Unknown'&&(!citations.leftTime||!citations.rightTime))fail('A reviewed relationship requires quotations from both sources.');
  if(conclusion==='Same event proposed'&&(placeRelation!=='Matches'||timeRelation!=='Matches'))fail('A same-event proposal requires reviewed place and time matches.');
  if(conclusion==='Different events proposed'&&placeRelation!=='Conflicts'&&timeRelation!=='Conflicts')fail('A different-event proposal requires a reviewed context conflict.');
  if(conclusion==='Different events proposed'&&reportRelationship!=='Unknown')fail('Reporting relationship stays Unknown for a different-event proposal.');
  return {id:id(v.id),asOf,createdAt,reviewer:text(v.reviewer,120).trim(),note:text(v.note,2000).trim(),placeRelation,timeRelation,conclusion,reportRelationship,snapshot:{left,right},citations};
}
export function validateLinkReviews(list,context,helpers){
  if(!Array.isArray(list)||list.length>40)fail('Workspace limit: 40 retained link reviews.');
  const reviews=list.map(v=>linkReviewRecord(v,context,helpers));if(new Set(reviews.map(v=>v.id)).size!==reviews.length)fail('Duplicate link-review identifiers.');return reviews;
}
