import {validateWorkspace,day,sourceURL} from './threat-core.mjs';
import {currentReportRecords} from './signals-core.mjs';
import {linkSourceSnapshot,linkReviewRecord,exactLinkQuote} from './link-review-records.mjs';
const helpers={day,sourceURL};
export function linkReviewPair(workspace,leftKey,rightKey,asOf){
  const rows=currentReportRecords(workspace,{from:'0001-01-01',to:asOf,scope:'All'}),left=rows.find(r=>r.recordKey===leftKey),right=rows.find(r=>r.recordKey===rightKey);
  if(!left||!right||leftKey===rightKey)throw Error('Select two distinct original records available by this date.');
  return {left:linkSourceSnapshot(left),right:linkSourceSnapshot(right)};
}
export function retainLinkReview(input,{id,asOf,snapshot,reviewer,note,placeRelation,timeRelation,conclusion,reportRelationship,leftPlaceQuote='',rightPlaceQuote='',leftTimeQuote='',rightTimeQuote=''},at){
  const workspace=validateWorkspace(input),pair=linkReviewPair(workspace,snapshot.left.recordKey,snapshot.right.recordKey,asOf);day(at);
  if(JSON.stringify(pair)!==JSON.stringify(snapshot))throw Error('Selected source context changed. Open a current review again.');
  const citations=Object.fromEntries([['leftPlace',leftPlaceQuote],['rightPlace',rightPlaceQuote],['leftTime',leftTimeQuote],['rightTime',rightTimeQuote]].map(([key,value])=>[key,exactLinkQuote(key.startsWith('left')?pair.left.text:pair.right.text,value)]));
  const record=linkReviewRecord({id,asOf,createdAt:at,reviewer,note,placeRelation,timeRelation,conclusion,reportRelationship,snapshot:pair,citations},workspace,helpers);
  return validateWorkspace({...workspace,linkReviews:[...workspace.linkReviews,record],history:[...workspace.history,{assessmentId:pair.left.assessmentId,at,action:'Report context reviewed',note:`${id}: ${conclusion}; ${pair.left.recordKey} / ${pair.right.recordKey}; analyst proposal, no merge or approval`} ]});
}
export function linkReviewStates(input,knownBy){
  const workspace=validateWorkspace(input),rows=currentReportRecords(workspace,{from:'0001-01-01',to:knownBy,scope:'All'}),map=new Map(rows.map(r=>[r.recordKey,linkSourceSnapshot(r)]));
  return workspace.linkReviews.map(review=>({review,state:review.createdAt>knownBy?'Not yet recorded':[review.snapshot.left,review.snapshot.right].every(s=>JSON.stringify(s)===JSON.stringify(map.get(s.recordKey)))?'Current source snapshot':'Stale source snapshot'}));
}
