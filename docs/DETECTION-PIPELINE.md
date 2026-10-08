# Detection pipeline — v0.26

The main console now computes warnings from report content, rather than only exposing manual review gaps or shared words. This is a deterministic first engine for earlier public-safety/security verification. It does not classify people or organizations as terrorists, infer private intent, confirm attacks or execute protective/offensive operations.

## Executable path

1. The existing collection adapter or Document intake retains original passages and provenance. The console analyzes the workspace on opening or explicit Run detection. Root and #detection open the console; #desk retains the assessment view.
2. Newly recorded originals within a rolling 3/7/14/30-day arrival window are selected. Both publication and recorded dates must be no later than Known by. A correction supersedes an original only once it is available. Source-derived analyst paraphrases are not counted as another original.
3. English/Hindi patterns identify threat/attack wording, aerial objects, explosives/suspicious objects, armed violence and security alerts. The rules return exact UTF-16 hit and clause spans. Limited punctuation/contrast splitting, denial/withdrawal cues, epistemic uncertainty, conditional/training cues and advisory-title cues yield Reported claim, Unverified report, Denied / withdrawn or Context only. Reported claim means an attributed statement, not confirmation.
4. Per-case normalized identical text is counted once for positive escalation even if group labels differ. Other reposts still require correctly recorded underlying source groups. Group labels are case-insensitive; distinct labels do not establish independence. No automatic cross-case event merger is performed.
5. A warning candidate requires active reports in at least two recorded source groups and either threat/attack wording or two different security-signal categories. A same-category denial leaves the candidate contested. One positive group stays Watch. Older publications remain visible but cannot escalate current warnings. Missing records produce No report coverage; no active threshold produces No rule warning, without a safety conclusion.
6. A timeline reruns the engine for each known-by day without later observations or corrections. Workspace timeline shows seven days; the isolated authored replay shows its elapsed days. Prepare warning verification task retains current typed source references in the existing editable task form. No operational alert, external message, case judgment or evidence acceptance is automated.

There is no threat percentage. Cases remain in existing case order; there is no validated severity rank. Task references are editable handoff text, not protected snapshots. Warning states are recomputed views, not an authenticated historical alert ledger. The existing retained-context review remains separately available.

## Report-arrival demonstration and outcomes

The isolated replay contains four fictional cases and eleven authored reports, including a same-group repost, a withdrawal/correction, a competing aerial explanation, Hindi denials and conditional general advice. The workspace is unchanged when opening, stepping or playing it. Playback stops at its final day or when leaving the console; it is not a background collector.

The aerial case has one group on 1/2 October, then a second source/category on 3 October. It becomes contested on 4 October after a denial. Its separately authored incident is dated 7 October, so the first candidate provides four days of fictional lead time. The object case first warns on 3 October, then returns to Watch after a known withdrawal on 4 October. The ambiguous-control case never warns, despite a separately authored later incident. The routine/advisory case never meets the rule.

Outcomes are stored separately from detector inputs. Reveal authored outcomes is enabled only at the final 8 October day, when those outcomes are declared known. The check retains one timely warning, one false warning, one missed incident and one uneventful control: precision 50%, recall 50%. These visible authored cases are not a blinded or independent benchmark. They show failure accounting and temporal behavior, not real prediction, calibration, warning lead time or prevention effectiveness. The separate logistic forecasting experiment and 3D authored replay are unchanged and are not inputs to this engine.

## Live source boundary

The existing bounded GOV.UK India advisory collector was refreshed on 5 October at 17:53:17 UTC. It retrieved the same three permitted sections; the publisher update was 9 July. Browser QA staged a short attributed public-sector passage using the existing licence/provenance adapter, recovered it in a fresh tab and analyzed it locally. Its advisory classification and older publication context produced no warning escalation. The source was not sent to an AI provider or the synthetic backend. This is a collector/adapter/engine integration check, not broad incident coverage or confirmation of any current threat.

Hosted production remains static and owner-private. It exposes report analysis, replay and manual workspace recovery; no hosted ingestion worker, new source credential, autonomous monitoring schedule, social connector or camera access was added.

## Known failures and next model work

Patterns miss unfamiliar wording, transliteration, unsupported languages and indirect signals. Clause rules can mishandle negation, conditional scope, reported speech, satire or unrelated claims; source-group labels and existing case assignments can be wrong. A date mention is not attached reliably to an event. Reports within one case and time window can describe different events. Publication is not event time. A source with an old publication may report a future concern, which this conservative rule will exclude from positive escalation. Exact-text duplicates are suppressed, while paraphrased duplicates can still inflate the result if groups are mislabeled. A repost can refresh an older claim's apparent report window; the rule does not reconstruct the underlying claim's original event time.

Maximum original text is 4,000 characters, extraction retains at most 80 hits per report and declares truncation. Workspace bounds remain 100 cases, 200 documents and 1,000 evidence records; no new workspace schema is required. Timeline helper accepts at most 31 days. HTML is escaped when displaying source text and labels.

The engine has thirteen focused tests for quotation offsets/Unicode, English/Hindi denials and uncertainty, contrast clauses, report arrival, source dependence, identical duplicates, correction timing, no cross-case pooling, publication/ingestion windows, original-versus-paraphrase handling, authored outcomes/lead time and task recovery. Full-suite and browser evidence are in VERIFICATION.md.

The next substantive model decision is a labeled, independently reviewed relevance/event corpus, then a learned text/event model evaluated against this rule baseline. Chronological untouched tests must measure misses, false-warning workload, language/region variation and lead time together. Sol 6.1 High is sufficient for current implementation; Astra High is useful if that model/evaluation design has unresolved tradeoffs. No paid inference or wider model-input scope is authorized by this release.
