import {parseCollectionReport,COLLECTION_SOURCE,digest} from './collection-core.mjs';
import {stageDocument} from './threat-core.mjs';

export const ADVISORY_RULE='official-india-advisory-v1';
const ignored=new Set(['script','style','template','noscript','iframe','object','embed','svg','math','head']);
const voids=new Set(['br','hr','img','input','meta','link','source','wbr','area','base','col','param','track']);
const names={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“',ndash:'–',mdash:'—',hellip:'…',pound:'£'};
function entities(text){return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(all,n)=>{if(n[0]!=='#')return Object.hasOwn(names,n.toLowerCase())?names[n.toLowerCase()]:all;const value=n[1].toLowerCase()==='x'?parseInt(n.slice(2),16):Number(n.slice(1));return value>0&&value<=0x10ffff&&!(value>=0xd800&&value<=0xdfff)?String.fromCodePoint(value):'�';});}
const normalize=s=>entities(s).replace(/\s+/gu,' ').trim();
const validInstant=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v.slice(0,10)).toISOString().slice(0,10)===v.slice(0,10);

// Bounded inert tokenizer for the publisher's document fragments. No source
// markup is inserted into the page or evaluated. Unknown entities stay literal.
export function advisoryBlocks(html){
  if(typeof html!=='string'||html.length>2*1024*1024)throw new Error('Invalid advisory HTML.');
  const stack=[],blocks=[];let cursor=0,tokens=0,current=null;
  const flush=end=>{if(current){const text=normalize(current.text);if(text)blocks.push({tag:current.tag,text,rawStart:current.start,rawEnd:end});current=null;}};
  while(cursor<html.length){
    if(++tokens>100000)throw new Error('Advisory markup exceeds token limit.');
    if(html.startsWith('<!--',cursor)){const end=html.indexOf('-->',cursor+4);if(end<0)throw new Error('Unclosed advisory comment.');cursor=end+3;continue;}
    if(html[cursor]!=='<'){let end=html.indexOf('<',cursor);if(end<0)end=html.length;if(current&&!stack.some(x=>x.skip))current.text+=html.slice(cursor,end);cursor=end;continue;}
    let end=cursor+1,quote='';for(;end<html.length;end++){const ch=html[end];if(quote){if(ch===quote)quote='';}else if(ch==='"'||ch==="'")quote=ch;else if(ch==='>')break;}
    if(end>=html.length)throw new Error('Unclosed advisory tag.');
    const raw=html.slice(cursor+1,end),match=/^\s*(\/?)\s*([a-z][a-z0-9:-]*)\b/i.exec(raw);const start=cursor;cursor=end+1;if(!match)continue;
    const closing=!!match[1],tag=match[2].toLowerCase(),semantic=/^(?:h[1-6]|p|li)$/.test(tag);
    if(closing){const index=stack.map(x=>x.tag).lastIndexOf(tag);if(index<0)continue;const suppressed=stack.some(x=>x.skip);if(!suppressed&&semantic)flush(cursor);stack.splice(index);continue;}
    const skip=ignored.has(tag)||/(?:^|\s)hidden(?:\s|=|$)/i.test(raw)||/aria-hidden\s*=\s*["']?true/i.test(raw)||/display\s*:\s*none|visibility\s*:\s*hidden/i.test(raw);
    if(!stack.some(x=>x.skip)&&!skip){if(semantic){flush(start);current={tag,start,text:''};}else if(tag==='br'&&current)current.text+=' ';}
    if(!voids.has(tag)&&!raw.trim().endsWith('/')){stack.push({tag,skip});if(stack.length>100)throw new Error('Advisory markup nesting exceeds limit.');}
  }
  flush(html.length);return blocks;
}
export function advisoryPlainText(html){return advisoryBlocks(html).map(b=>b.text).join('\n\n');}

export async function analyzeAdvisory(input,previous=null,{at=new Date()}={}){
  const {sections,...run}=await parseCollectionReport(JSON.stringify(input),{at,extractText:advisoryPlainText});
  if(run.status!=='collected')return null;
  const part=sections.find(p=>p.slug==='safety-and-security'),blocks=advisoryBlocks(part.originalHtml);
  const start=blocks.findIndex(b=>/^h[1-6]$/.test(b.tag)&&/^terrorism$/i.test(b.text));
  const topic=[];if(start>=0){const rank=Number(blocks[start].tag.slice(1));for(let i=start+1;i<blocks.length;i++){if(/^h[1-6]$/.test(blocks[i].tag)&&Number(blocks[i].tag.slice(1))<=rank)break;topic.push(blocks[i]);}}
  const paragraphs=topic.filter(b=>b.tag==='p'||b.tag==='li'),excerpt=paragraphs.map(b=>b.text).join('\n\n');
  const topicAvailable=!!excerpt&&excerpt.length<=4000,topicHash=topicAvailable?await digest(excerpt):null;
  const prior=previous?.sourceId===run.sourceId&&previous.ruleVersion===ADVISORY_RULE?previous:null;
  const topicChanged=!!(topicAvailable&&prior?.topicAvailable&&prior.topicHash!==topicHash);
  const analysis={version:1,ruleVersion:ADVISORY_RULE,sourceId:run.sourceId,sourceHash:run.snapshot.selectedContentSha256,topicHash,topicAvailable,
    pageChanged:!!(prior&&prior.sourceHash!==run.snapshot.selectedContentSha256),topicChanged,candidates:[],
    coverage:topicAvailable?'Terrorism section retained':'Terrorism section missing, empty or over the review bound',
    limitations:['One travel-advisory publisher; no independent corroboration.','Priority describes review of published guidance, not attack likelihood.','First retrieval is a baseline; publication time is not evidence of earlier system knowledge.','No model inference, suspect identification, community profiling or external escalation.']};
  if(topicAvailable){const old=prior?.paragraphs??[],added=paragraphs.map(b=>b.text).filter(t=>!old.includes(t)),removed=old.filter(t=>!paragraphs.some(b=>b.text===t));
    analysis.candidates.push({id:`advisory-${topicHash.slice(0,32)}`,kind:topicChanged?'changed_guidance':'baseline_context',priority:topicChanged?'Verify change':'Context',
      title:topicChanged?'Changed official India terrorism guidance':'Standing official India terrorism guidance',excerpt,sourceURL:`${COLLECTION_SOURCE.page}/safety-and-security#terrorism`,
      publisher:COLLECTION_SOURCE.publisher,publisherUpdatedAt:run.snapshot.publisherUpdatedAt,capturedAt:run.checkedAt,sourceHash:analysis.sourceHash,topicHash,
      rawSpans:paragraphs.map(({rawStart,rawEnd})=>({start:rawStart,end:rawEnd})),added:topicChanged?added:[],removed:topicChanged?removed:[],
      explanation:topicChanged?'The retained terrorism passage differs from the previous successful capture. Verify the exact changes and context.':'Retained standing advice. No new or imminent incident is established by this first or unchanged observation.',
      confidence:'Uncalibrated; source content not independently verified',independentSourceGroups:1,contradictions:[],
      verificationQuestions:['Does this wording describe a dated development or standing guidance?','Can a separately originated official report corroborate the development?','Does the source describe an incident already underway, a public warning or a pre-incident indicator?'],
      possibleAlternatives:['Routine editorial update or continuing standing advice.','Removal or rewording of text does not establish resolution of a threat.']});
  }
  analysis.paragraphs=topicAvailable?paragraphs.map(b=>b.text):[];return analysis;
}

export function replayAdvisories(attempts,asOf){
  const cutoff=Date.parse(asOf);if(!validInstant(asOf))throw new Error('Choose an exact replay timestamp.');
  return attempts.filter(a=>validInstant(a.firstObservedAt)&&validInstant(a.run?.checkedAt)&&Date.parse(a.firstObservedAt)>=Date.parse(a.run.checkedAt)&&Date.parse(a.firstObservedAt)<=cutoff&&Date.parse(a.run.checkedAt)<=cutoff&&(!a.run.snapshot||validInstant(a.run.snapshot.publisherUpdatedAt)&&Date.parse(a.run.snapshot.publisherUpdatedAt)<=Date.parse(a.run.checkedAt))).sort((a,b)=>Date.parse(a.firstObservedAt)-Date.parse(b.firstObservedAt));
}

export async function stageAdvisoryCandidate(workspace,attempt,candidateId,{assessmentId,id,at,acknowledged}){
  if(acknowledged!==true)throw new Error('Review the source passage and its time meaning before staging.');
  if(!validInstant(attempt?.firstObservedAt)||Date.parse(attempt.firstObservedAt)<Date.parse(attempt.run?.checkedAt)||Date.parse(attempt.firstObservedAt)>Date.now())throw new Error('Invalid first observation time; it cannot precede the capture.');
  const validated=await analyzeAdvisory(attempt.run,null,{at:new Date()});const candidate=validated?.candidates.find(c=>c.id===candidateId);
  if(!candidate||candidate.sourceHash!==attempt.analysis?.sourceHash||at<attempt.firstObservedAt.slice(0,10))throw new Error('Candidate or source binding is invalid.');
  return stageDocument(workspace,{id,assessmentId,title:candidate.title,publisher:candidate.publisher,originGroup:'FCDO India travel advisory',url:candidate.sourceURL,reportedAt:new Date(candidate.publisherUpdatedAt).toISOString().slice(0,10),recordedAt:at,language:'English',locator:`Terrorism section / ${ADVISORY_RULE} / ${candidate.topicHash}`,accessNote:`${COLLECTION_SOURCE.attribution} First observed by journal ${attempt.firstObservedAt}; source checked ${attempt.run.checkedAt}. Publisher update is not incident time. Selected-content SHA-256 ${candidate.sourceHash}. Standing advice is not a confirmed threat.`,excerpt:candidate.excerpt,synthetic:false},at);
}
