// Narrow source-mention parser for the authored linkage lab, not event extraction.
export const CONTEXT_HINT_VERSION='2026-10-05.1';
const fail=message=>{throw new Error(message);};
const monthGroups=[['January','जनवरी'],['February','फरवरी','फ़रवरी'],['March','मार्च'],['April','अप्रैल'],['May','मई'],['June','जून'],['July','जुलाई'],['August','अगस्त'],['September','सितंबर','सितम्बर'],['October','अक्टूबर','अक्तूबर'],['November','नवंबर','नवम्बर'],['December','दिसंबर','दिसम्बर']];
const months=new Map(monthGroups.flatMap((names,i)=>names.map(name=>[name.toLowerCase(),i+1])));
const digits='[0-9०-९]',monthPattern=[...months.keys()].sort((a,b)=>b.length-a.length).join('|');
const toNumber=value=>Number(value.replace(/[०-९]/g,c=>String(c.charCodeAt(0)-0x0966)));
const span=(text,start,end,extra={})=>({quote:text.slice(start,end),start,end,...extra});
const validDay=(day,month,year)=>day>=1&&month>=1&&month<=12&&day<=[31,year===null||year%4===0&&(year%100!==0||year%400===0)?29:28,31,30,31,30,31,31,30,31,30,31][month-1];
const supportedText=text=>{if(typeof text!=='string'||!text.trim()||text.length>4000)fail('Use a nonempty source paragraph of at most 4000 characters.');};
export function extractContextMentions(text){
 supportedText(text);const dates=[],invalidDates=[],places=[];
 const addDate=(m,day,month,year)=>{const item=span(text,m.index,m.index+m[0].length,{day,month,year,precision:year===null?'day-month':'date'});if((year!==null&&(year<1||year>9999))||!validDay(day,month,year))invalidDates.push(item);else dates.push(item);};
 const named=new RegExp(`(?<![\\p{L}\\p{N}])(${digits}{1,2})(?:st|nd|rd|th)?\\s+(${monthPattern})(?:,?\\s+(${digits}{4}))?(?![\\p{L}\\p{N}])`,'giu');
 for(const m of text.matchAll(named))addDate(m,toNumber(m[1]),months.get(m[2].toLowerCase()),m[3]?toNumber(m[3]):null);
 const iso=new RegExp(`(?<![\\p{L}\\p{N}])(${digits}{4})-(${digits}{2})-(${digits}{2})(?![\\p{L}\\p{N}])`,'gu');
 for(const m of text.matchAll(iso))addDate(m,toNumber(m[3]),toNumber(m[2]),toNumber(m[1]));
 const latin=/\bfictional\s+([\p{L}\p{M}]+(?:\s+[\p{L}\p{M}]+){0,3}?)\s+(reading room|learning cent(?:re|er)|community cent(?:re|er)|transit cent(?:re|er)|observatory|laboratory|depot|library|clinic|hall|cent(?:re|er)|pavilion|store|school|archive|gallery|museum|office)(?![\p{L}\p{N}])/giu;
 const hindi=/काल्पनिक\s+([\p{L}\p{M}]+(?:\s+[\p{L}\p{M}]+){0,3}?)\s+(वाचनालय|अभिलेखागार|सभागार|केन्द्र|केंद्र|विद्यालय|पुस्तकालय|संग्रहालय|कार्यालय|चिकित्सालय)(?![\p{L}\p{N}])/gu;
 for(const [pattern,language] of [[latin,'Latin'],[hindi,'Devanagari']])for(const m of text.matchAll(pattern))places.push(span(text,m.index,m.index+m[0].length,{language,key:(m[1]+' '+m[2]).normalize('NFKC').toLowerCase().replace(/\s+/g,' ').replace(/centre/g,'center').replace(/केन्द्र/g,'केंद्र')}));
 dates.sort((a,b)=>a.start-b.start);invalidDates.sort((a,b)=>a.start-b.start);places.sort((a,b)=>a.start-b.start);
 return {dates,invalidDates,places,dateState:invalidDates.length?'Invalid':dates.length===1?'Single':dates.length?'Multiple':'Missing',placeState:places.length===1?'Single':places.length?'Multiple':'Missing'};
}
export function compareContextMentions(pair){
 if(!pair||!pair.left||!pair.right)fail('A source pair is required.');const left=extractContextMentions(pair.left.text),right=extractContextMentions(pair.right.text);
 const date={relation:'Unknown',reason:'A unique valid explicit date mention is needed in each report.'},place={relation:'Unknown',reason:'A unique supported fictional-place mention in the same script is needed in each report.'};
 if(left.dateState==='Single'&&right.dateState==='Single'){
  const a=left.dates[0],b=right.dates[0];date.left=a;date.right=b;
  if(a.day!==b.day||a.month!==b.month||a.year!==null&&b.year!==null&&a.year!==b.year){date.relation='Mismatch';date.reason='Explicit date mentions differ; event-time attachment is unverified.';}
  else{date.relation='Compatible';date.reason=a.year===null||b.year===null?'Day/month mentions agree; a missing year is not inferred.':'Explicit date mentions agree; they may refer to different events.';}
 }
 if(left.placeState==='Single'&&right.placeState==='Single'){
  const a=left.places[0],b=right.places[0];place.left=a;place.right=b;
  if(a.language===b.language){place.relation=a.key===b.key?'Compatible':'Mismatch';place.reason=place.relation==='Mismatch'?'Fictional-place mentions differ; aliases and event attachment are unverified.':'Fictional-place wording agrees; this does not establish the same event.';}
  else place.reason='Cross-script place aliases require manual review; no transliteration is assumed.';
 }
 const flags=[['date',date],['place',place]].filter(([,c])=>c.relation==='Mismatch').map(([field,c])=>({field,left:c.left,right:c.right,reason:c.reason}));
 return {version:CONTEXT_HINT_VERSION,left,right,date,place,flags,deferred:flags.length>0};
}
