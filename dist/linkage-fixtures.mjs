// Authored development controls, not independent historical ground truth.
export const LINKAGE_SUITE_VERSION='2026-10-05.1';
const make=(id,split,category,query,rows)=>({id,split,family:id,category,asOf:'2026-10-05',query:{id:`${id}-q`,text:query,reportedAt:'2026-10-05',recordedAt:'2026-10-05'},candidates:rows.map(([text,label,reason],i)=>({id:`${id}-${['b7','a2','d9','c4'][i]}`,text,reportedAt:'2026-10-05',recordedAt:'2026-10-05',label,reason}))});
export const linkageFixtures=[
 make('dev-repost','development','Repost and boilerplate','A helpdesk received an unverified alert about a light above the fictional Nila depot on 2 October. Independent corroboration is not available.',[
  ['The fictional Nila depot light alert on 2 October was repeated by another newsletter quoting the same helpdesk.','Related','Repost of the same allegation; it supplies no independent corroboration.'],
  ['Independent corroboration is not available for an unverified report about a water leak at the fictional Tara library.','Unrelated','Shared qualification language, different event.'],
  ['A notice describes new opening hours at the fictional Nila depot.','Unrelated','Same place, different subject.']]),
 make('dev-date','development','Different event dates','A brief power failure affected the fictional Kaveri clinic on 3 October.',[
  ['A brief power failure affected the fictional Kaveri clinic on 3 September.','Unrelated','A separate earlier outage despite almost identical wording.'],
  ['Electricity at the fictional Kaveri clinic was restored after the 3 October interruption.','Related','Follow-up to the same outage.'],
  ['The fictional Kaveri clinic received new chairs on 3 October.','Unrelated','Same place and day, unrelated event.']]),
 make('dev-denial','development','Contradictory account','An alert alleged a loud explosion near the fictional Bela hall on 1 October.',[
  ['A review found no explosion near the fictional Bela hall on 1 October; the noise was a scheduled sound test.','Related','Denial and alternative explanation of the same report; not confirmation.'],
  ['A scheduled sound test at the fictional Ketu hall occurred on 1 October.','Unrelated','Different site.'],
  ['The fictional Bela hall expanded its library collection.','Unrelated','Unrelated activity at the same location.']]),
 make('dev-hindi','development','Hindi wording','काल्पनिक नील केंद्र में 2 अक्टूबर को बिजली बंद होने की सूचना मिली।',[
  ['काल्पनिक नील केंद्र में 2 अक्टूबर की बिजली समस्या दूर कर दी गई।','Related','Follow-up to the same authored outage.'],
  ['काल्पनिक नील केंद्र में 2 सितंबर को बिजली बंद होने की सूचना मिली।','Unrelated','Different month and event.'],
  ['काल्पनिक पीपल केंद्र में नए पुस्तकालय का उद्घाटन हुआ।','Unrelated','Different location and subject.']]),
 make('dev-translation','development','English–Hindi','A temporary closure affected the fictional Luma reading room after water entered the building.',[
  ['काल्पनिक लूमा वाचनालय में पानी भरने के कारण उसे कुछ समय के लिए बंद किया गया।','Related','Authored Hindi translation of the same event.'],
  ['A temporary closure affected the fictional Luma reading room last year during roof painting.','Unrelated','Same place and closure wording, different event.'],
  ['The fictional Luma reading room announced a poetry competition.','Unrelated','Unrelated announcement.']]),
 make('dev-paraphrase','development','Paraphrase','Aerial light reports prompted a temporary pause at the fictional Mahi learning centre.',[
  ['The fictional Mahi learning centre suspended its evening session while staff checked an object seen overhead.','Related','Different wording for the same authored report.'],
  ['Aerial light reports prompted a temporary pause at the fictional Pala learning centre.','Unrelated','Identical event language at a different fictional site.'],
  ['Staff at the fictional Mahi learning centre are preparing a timetable.','Unrelated','Routine administration.']]),
 make('dev-insufficient','development','Insufficient context','A noise alert was logged at the fictional Sora museum on 4 October.',[
  ['An alert was logged at a museum; the date and location were omitted.','Unresolved','Insufficient information to decide whether it is the same report.'],
  ['Staff checked the fictional Sora museum noise alert from 4 October.','Related','Explicit same date, site and report.'],
  ['A noise alert was logged at the fictional Sora museum on 4 August.','Unrelated','Separate earlier event.']]),
 make('dev-spelling','development','Spelling variation','The fictional Harini transit centre reported a sensor fault and paused entry for an inspection.',[
  ['A sensor fault at the fictional Harini transit center led to an inspection and paused entry.','Related','Spelling variant of the same report.'],
  ['The fictional Harini transit centre paused entry for floor repairs last month.','Unrelated','Same site, different reason and date.'],
  ['A sensor catalogue was delivered to the fictional Purna office.','Unrelated','Routine delivery.']]),
 make('eval-repost','evaluation','Repost and boilerplate','An unverified observation near the fictional Veda pavilion was reported by a helpdesk on 3 October. Repetition does not establish independent corroboration.',[
  ['Repetition does not establish independent corroboration of an unverified observation about a leak at the fictional Ojas store.','Unrelated','Different event with repeated disclaimer wording.'],
  ['A second bulletin quotes the 3 October helpdesk observation near the fictional Veda pavilion.','Related','Same underlying source and observation.'],
  ['The fictional Veda pavilion opened a new art class.','Unrelated','Same location, unrelated activity.']]),
 make('eval-date','evaluation','Different event dates','A fire alarm interrupted a session at the fictional Reva school on 4 October.',[
  ['A fire alarm interrupted a session at the fictional Reva school on 4 July.','Unrelated','Separate earlier alarm.'],
  ['The 4 October session at the fictional Reva school resumed after staff checked the alarm.','Related','Follow-up to the same alarm.'],
  ['The fictional Reva school scheduled examinations for November.','Unrelated','Unrelated schedule.']]),
 make('eval-denial','evaluation','Contradictory account','A public report described an unidentified object above the fictional Tavi observatory on 2 October.',[
  ['The unidentified object above the fictional Tavi observatory on 2 October was identified as a research balloon. No hostile activity was confirmed.','Related','Alternative explanation of the same sighting.'],
  ['A public report described an unidentified object above the fictional Pihu observatory on 2 October.','Unrelated','Different site and event.'],
  ['A new telescope arrived at the fictional Tavi observatory.','Unrelated','Unrelated delivery.']]),
 make('eval-hindi','evaluation','Hindi wording','काल्पनिक रोशन सभागार में 3 अक्टूबर को धुएँ की सूचना के बाद कार्यक्रम रोका गया।',[
  ['काल्पनिक रोशन सभागार में 3 अगस्त को धुएँ की सूचना के बाद कार्यक्रम रोका गया।','Unrelated','Different date despite nearly identical text.'],
  ['काल्पनिक रोशन सभागार में 3 अक्टूबर की धुएँ संबंधी सूचना की जाँच पूरी हुई और कार्यक्रम फिर शुरू हुआ।','Related','Same event and follow-up in Hindi.'],
  ['काल्पनिक उजाला सभागार में पुस्तक प्रदर्शनी लगाई गई।','Unrelated','Unrelated event elsewhere.']]),
 make('eval-translation','evaluation','English–Hindi','The fictional Mira archive temporarily closed after a ceiling panel fell during maintenance.',[
  ['काल्पनिक मीरा अभिलेखागार में मरम्मत के दौरान छत का एक पैनल गिरा, जिसके बाद उसे कुछ समय के लिए बंद कर दिया गया।','Related','Authored Hindi account of the same event.'],
  ['The fictional Mira archive temporarily closed for a festival last winter.','Unrelated','Same closure wording, different cause and period.'],
  ['A new exhibition opened at the fictional Mira archive.','Unrelated','Unrelated programme.']]),
 make('eval-paraphrase','evaluation','Paraphrase','An unusual sound prompted staff to suspend the evening programme at the fictional Ambar gallery.',[
  ['The fictional Ambar gallery paused its night session while attendants investigated a loud noise.','Related','Authored paraphrase of the same event.'],
  ['An unusual sound prompted staff to suspend the evening programme at the fictional Teja gallery.','Unrelated','Different site despite identical wording.'],
  ['A programme of landscape paintings was announced by the fictional Ambar gallery.','Unrelated','Unrelated programme announcement.']]),
 make('eval-insufficient','evaluation','Insufficient context','A sensor alert was recorded at the fictional Ira laboratory on 1 October.',[
  ['A sensor alert was recorded at a laboratory, with no date or site supplied.','Unresolved','Omitted context prevents a supported event-link label.'],
  ['The sensor alert recorded at the fictional Ira laboratory on 1 October was checked by staff.','Related','Explicit same report.'],
  ['The fictional Ira laboratory replaced office furniture.','Unrelated','Unrelated routine activity.']]),
 make('eval-spelling','evaluation','Spelling variation','The fictional Malini community centre cancelled a session because of a faulty alarm.',[
  ['The fictional Malini community center canceled a session because of a faulty alarm.','Related','Spelling variant of the same account.'],
  ['The fictional Malini community centre cancelled a session because of a holiday in June.','Unrelated','Different reason and time.'],
  ['The fictional Hema community centre launched an art workshop.','Unrelated','Different site and event.']])
];
