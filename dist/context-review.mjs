import {knownCandidates} from './linkage-lab-core.mjs';
import {sha256} from './semantic-run.mjs';
const fail=m=>{throw new Error(m);};
const fields=['reviewer','note','leftPlaceQuote','rightPlaceQuote','leftTimeQuote','rightTimeQuote','placeRelation','timeRelation','conclusion','reportRelationship'];
export function contextPair(c,candidateId){const candidate=knownCandidates(c.query,c.candidates,c.asOf).find(r=>r.id===candidateId);if(!candidate)fail('The selected candidate is not available at this date.');return {caseId:c.id,asOf:c.asOf,left:{id:c.query.id,text:c.query.text,reportedAt:c.query.reportedAt,recordedAt:c.query.recordedAt},right:{id:candidate.id,text:candidate.text,reportedAt:candidate.reportedAt,recordedAt:candidate.recordedAt}};}
function quoteSpan(source,value){if(value==='')return null;if(typeof value!=='string'||value.length<3||value.length>300)fail('Use an exact source quotation between 3 and 300 characters.');const start=source.indexOf(value);if(start<0)fail('A quotation does not match its original source exactly.');if(source.indexOf(value,start+1)>=0)fail('A quotation is ambiguous. Include more context to identify one passage.');return {quote:value,start,end:start+value.length};}
export async function createContextReview(pair,input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==fields.length||Object.keys(input).some(k=>!fields.includes(k)))fail('Invalid context-review fields.');
 for(const [key,max] of [['reviewer',120],['note',2000]])if(typeof input[key]!=='string'||!input[key].trim()||input[key].length>max)fail('A reviewer label and explanatory note are required.');
 for(const key of ['placeRelation','timeRelation'])if(!['Matches','Conflicts','Unknown'].includes(input[key]))fail('Invalid context relationship.');
 if(!['Same event proposed','Different event proposed','Insufficient context'].includes(input.conclusion)||!['Repost','Contradictory account','Other related account','Unknown'].includes(input.reportRelationship))fail('Invalid proposed conclusion or reporting relationship.');
 const citations={leftPlace:quoteSpan(pair.left.text,input.leftPlaceQuote),rightPlace:quoteSpan(pair.right.text,input.rightPlaceQuote),leftTime:quoteSpan(pair.left.text,input.leftTimeQuote),rightTime:quoteSpan(pair.right.text,input.rightTimeQuote)};
 if(input.placeRelation!=='Unknown'&&(!citations.leftPlace||!citations.rightPlace))fail('A place relationship needs exact quotations from both reports.');
 if(input.timeRelation!=='Unknown'&&(!citations.leftTime||!citations.rightTime))fail('An event-time relationship needs exact quotations from both reports.');
 if(input.conclusion==='Same event proposed'&&(input.placeRelation!=='Matches'||input.timeRelation!=='Matches'))fail('Proposing the same event requires quoted, reviewed place and event-time matches.');
 if(input.conclusion==='Different event proposed'&&input.placeRelation!=='Conflicts'&&input.timeRelation!=='Conflicts')fail('Proposing different events requires at least one quoted context conflict.');
 if(input.conclusion==='Different event proposed'&&input.reportRelationship!=='Unknown')fail('Reporting relationship stays Unknown when proposing different events.');
 return {format:'ruthless-context-review',version:1,sourceBinding:await sha256(JSON.stringify(pair)),caseId:pair.caseId,leftId:pair.left.id,rightId:pair.right.id,asOf:pair.asOf,status:'Analyst proposal',reviewer:input.reviewer.trim(),note:input.note.trim(),placeRelation:input.placeRelation,timeRelation:input.timeRelation,conclusion:input.conclusion,reportRelationship:input.reportRelationship,citations};
}
export async function contextReviewIsCurrent(review,pair){
 if(!review||review.format!=='ruthless-context-review'||review.version!==1||review.sourceBinding!==await sha256(JSON.stringify(pair))||review.caseId!==pair.caseId||review.leftId!==pair.left.id||review.rightId!==pair.right.id||review.asOf!==pair.asOf)return false;
 try{const input={reviewer:review.reviewer,note:review.note,leftPlaceQuote:review.citations.leftPlace?.quote??'',rightPlaceQuote:review.citations.rightPlace?.quote??'',leftTimeQuote:review.citations.leftTime?.quote??'',rightTimeQuote:review.citations.rightTime?.quote??'',placeRelation:review.placeRelation,timeRelation:review.timeRelation,conclusion:review.conclusion,reportRelationship:review.reportRelationship};const checked=await createContextReview(pair,input);return JSON.stringify(checked)===JSON.stringify(review);}catch{return false;}
}
