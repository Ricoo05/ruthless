# Fictional explosive-threat warning exercise — v0.27

The user requested a suicide-bombing threat simulation with intelligence gathering and predictive 3D output. The implemented exercise tests whether report-driven warning rules flag the supplied fictional intelligence before a separately authored attempted bombing. It does not simulate bombing execution, weapon mechanics, target vulnerabilities or a real person's movement/intent.

## Run it

Detection console → Run suicide-bombing warning exercise → Play report arrival. Jump to first warning selects 3 October. Rotate view left/right or move the date slider to inspect the three-dimensional report layout. Reveal authored outcomes becomes available only on the final 8 October day.

The original source passages, typed references, publication and recording dates, exact extracted clauses, source groups and contrary reporting remain inspectable below the animation. The exercise is isolated from the workspace; no evidence, judgment, task, message or protective operation is automatically created.

## Intelligence stream and actual result

- 1 October: authored helpdesk receives an unverified report alleging a planned suicide bombing in fictional training Sector E-7, India. Person, intent and event time are unconfirmed. One recorded positive source group produces Watch.
- 2 October: another fictional outlet repeats the same report and source group. It remains Watch; repetition does not establish independence.
- 3 October: a separately labeled fictional helpdesk reports a suspicious package. Contents and connection to the allegation are unresolved. Two recorded groups meet the implemented rule and produce Warning candidate.
- 4 October: a limited fictional inspection account reports no explosive found. The overlapping-category denial produces Contested warning candidate; it does not erase the allegation.
- 5 October: a linked correction clarifies that the inspection concerned a different authored day. Once known, it supersedes that source for current detection, which returns to Warning candidate. The earlier source remains retained.
- 8 October: the same-source allegation's original publication date has fallen outside the seven-day window. Reposting cannot renew it. The object report still produces Watch. The as-of timeline retains the earlier warning states.

An attempted suicide bombing on 7 October is separately authored as an outcome known on 8 October. It is never passed to the detector or scene. The first warning on 3 October gives four days of authored lead time. This single visible example establishes neither predictive accuracy nor successful prevention. No casualty, execution or intervention outcome is modeled, and no attacker is identified.

## What the 3D animation actually shows

`warningSceneData` takes the detector's current fictional case output. It maps currently available source records to illustrative XYZ markers and maps the computed case state to a colored central beacon. Perspective projection and camera orbit render those three-dimensional coordinates to Canvas 2D. Report markers briefly animate on a date update; autoplay advances available intelligence. Reduced-motion preference uses static updates.

Data links connect reports to their case state. Positions are an abstract source-report layout, not a geographical reconstruction, target map, physical approach, blast radius or predicted attack path. The center is a generic case-context volume without facility details. Report markers are not people or independent sources. A textual state/date/group summary provides the same output outside the canvas.

The component accepts only current fictional report records. Scene snapshots contain no outcome or attacker-trajectory fields. Up to twelve markers are drawn; omissions are counted in its data contract. The fixed exercise has at most four current records, with a correction replacing its parent only once known. Playback and scene animation stop when leaving the view; there is no unattended monitoring.

## Detector changes included

Report-signals-2 narrows negative scope instead of allowing any nearby no/not to negate a signal. It recognizes confirmation uncertainty, explicit had-not-been-seen wording, ruled-out withdrawals, observation synonyms and entertainment context, and limits uncertainty to its clause. Negated hoax/withdrawal terms do not become a withdrawal automatically. Hindi confirmation uncertainty remains separate from a denied report.

For each existing case, recorded source group and signal category, the engine retains the earliest publication among current original reports available by Known by. A paraphrased repost cannot renew that category outside the rolling window. Exact normalized duplicates are also checked against older available originals, even outside the arrival display window. Known corrections can carry new information because superseded parents leave the current-source set. Newly discovered older claims change current review without changing an earlier as-of run where that material was unavailable.

Wrong group metadata can suppress a genuinely new event. A correction can be mislabeled, unknown earlier originals cannot be reconstructed, and clause rules can still misread complex language. No learned semantic model or source authenticity check is added.

## Verification limits

Twenty-four visible authored English/Hindi challenge passages retain actual v0.26 extraction outputs and expected labels. Thirteen baseline cases matched; all twenty-four current cases match after fixes designed around the inspected failures. The baseline commit and source hash are recorded, but the JSON is editable and is not authenticated provenance. This is an executable development comparison, not independent validation or an attack-prediction score.

Ten new tests cover the challenge contract, original/corrected/late claim timing, repost suppression, fresh categories, explosive replay, workspace immutability/recovery, fictional-only scene data and projection. Full-suite/browser proof is recorded in VERIFICATION.md. No new live source, paid API call, pretrained inference, social/CCTV connection, external alert or monitoring schedule was added.
