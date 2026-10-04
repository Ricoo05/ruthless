# Verification record — 3 October 2026

## Earlier v0.1 checks

- `node --test tests/core.test.mjs`: 10 tests passed, 0 failed. Covers official catalog validation, exact matching, score factors, CSV quoting/BOM/newlines, malformed rows, duplicate rejection, maximum finding count, required closure notes, immutable review updates, project round trips, invalid project/catalog structures, filters, spreadsheet formula neutralization, and brief caveats.
- `node --check dist/app.mjs` and `node --check dist/core.mjs`: passed.
- Local HTTP server served the application and its assets. The initial path-normalization defect was corrected before browser testing.
- Browser displayed six synthetic findings, five KEV matches, three internet-exposed assets, and the 1,733-entry catalog version 2026.10.02.
- Search produced a useful empty state, then restored results when cleared.
- Remediated without a note showed a validation error; the same decision with a note updated counts and review history.
- Save project produced a 1,505,770-byte JSON file. The core validator accepted the actual browser-downloaded file.
- A malformed pasted CSV was rejected with a row-specific error. A valid one-row CSV replaced the active session and was labeled imported.
- Open project restored the browser-downloaded six-finding project, its Remediated decision, supporting note, and source snapshot.
- Filtered CSV download contained two Log4j findings plus its header. The downloaded full Markdown brief contained all six findings.
- Public catalog refresh completed from the official CISA GitHub mirror and retained 1,733 records.
- Browser WebMCP search registered with the expected schema and annotations. A valid CVE query returned and displayed two matching findings; a numeric query failed intentionally.

## Earlier v0.1 verification limits

- Browser automation later became unresponsive while resetting the synthetic demo. Final screenshot capture and explicit desktop/mobile viewport checks could not be completed. Responsive CSS is implemented but has not received full visual QA.
- A small final change prevents a slow catalog refresh from replacing a changed workspace or discarding an in-progress review draft. Its syntax was checked; the browser race path has not been exercised.
- Project round trips were tested in the local in-app browser. Browser-specific download behavior elsewhere has not been verified.
- Refresh timeout/failure handling and offline catalog import are implemented but have not been exercised end-to-end in the browser.
- No independent security review, penetration test, customer pilot, accessibility audit, procurement assessment, or compliance certification has been performed.
- No authentication, shared database, multi-tenant isolation, encrypted project format, or tamper-evident audit trail is included. These are future production requirements, not advertised properties of this prototype.

## v0.2 review — 3 October 2026

- `node tests/core.test.mjs`: 17 passed, 0 failed. Includes all previous tests plus UTF-8 byte limits, a near-12-MB save/open round trip, atomic rejection of oversized reviews, stale workspace/draft guards, older/oversized catalog rejection, invalid calendar/ransomware values and report provenance. Direct execution uses Node's test runner in process; `node --test` child-process startup was blocked by this environment with EPERM.
- App/core syntax checks passed.
- Browser loaded v0.2 with six synthetic findings and the bundled-source label. Applying Investigating with a synthetic note succeeded; pending-review count became five and the unsaved marker appeared.
- Public refresh succeeded under the Content Security Policy and changed provenance to “Official CISA mirror fetched this session”, retaining the applied review and 1,733 catalog entries. No errors or warnings were reported by the browser log query.
- WebMCP search registration was observed in v0.2. Functional invocation was previously tested in v0.1; no new invocation test is claimed.
- Desktop and 390×844 mobile viewport checked. Mobile document scroll width equaled client width (375 CSS px after scrollbar), with stacked navigation/actions/stats. Screenshots saved as sibling `ruthless-desktop-v0.2.png` and `ruthless-mobile-v0.2.png`. Temporary viewport override was reset. These checks are not a complete accessibility or cross-browser audit.
- Browser permission policy denied file import. No bypass was attempted. New browser offline-import/provenance and save/reopen flows remain unverified, although core round-trip and catalog-update regression tests pass. Actual delayed browser file/network races and timeout handling remain unverified.
- Source synchronization was restored after terminal access changed. Deployment status is tracked in sibling `ruthless-release-v0.2.json`. Hosted v0.2 browser CSP/platform compatibility is not independently verified; successful deployment alone is not browser QA.

## Next gate

Use GPT-6.1 Sol High for routine work after this review. Finish the blocked browser file checks and private publication when the supported tools permit them. Before a customer pilot, validate the workflow with analysts and scope a separate production security design. No independent security certification is implied.

## v0.3 threat analysis workbench — 3 October 2026

- 29 core tests pass across both modules: 17 cyber tests and 12 threat-workspace tests. Threat tests cover repost source groups, required review evidence, contradictions, assessment chronology, reopening reviewed cases, cross-case/orphan references, duplicate IDs, source URL validation, real dates, round trips, untrusted metadata, bounded UTF-8 size, filters, and brief caveats.
- Threat app/core syntax checks passed.
- Browser checks passed: initial three synthetic assessments/four evidence records; review blocked without conflict acknowledgement; cited review changed pending count; new evidence reopened a reviewed case; international scope filter; no-match search; new question creation.
- Revised save flow was checked: a download request retains the unsaved marker; acknowledgement becomes available; subsequent changes invalidate the old acknowledgement. The receipt acknowledgement was not falsely clicked during testing.
- Download receipt remains unverified: the browser download event timed out after eight seconds; requested JSON/Markdown files were absent from the expected Downloads directory. Core serialization/restore is tested, but a successful real v0.3 browser save/reopen round trip is not claimed. Browser file import was previously denied, and no bypass was attempted.
- Desktop and 390×844 mobile screenshots captured. Mobile scroll width equaled client width at 375 CSS px. Viewport override reset. No errors/warnings were reported by the browser log query during the new-workflow checks.
- The retained cyber page loaded at `/exposure.html` and the link back to the threat desk worked.
- After a later small change, opening a workspace clears any stale save acknowledgement; that file-import branch remains browser-unverified because of the existing permission restriction.
- Screenshots are sibling files `ruthless-threat-desktop-v0.3.png` and `ruthless-threat-mobile-v0.3.png`. Browser testing used synthetic records only.
- Hosted publication status and exact commit are recorded in sibling `ruthless-release-v0.3.json`. No independent security assessment, live source connector, validated attack forecast or government acceptance is claimed.


## v0.4 document intake — 4 October 2026

- 37 tests passed: 17 cyber, 12 assessment and 8 intake tests. New coverage includes version 1-to-2 migration, source provenance, staged text remaining data, source conditions, duplicates and limits, atomic rejection, mandatory acknowledgement, review reopening, conflicting/cross-case document links and Markdown/HTML escaping.
- Syntax checks passed for all four app/core modules. This environment has Node but no `npm` command on PATH; checks were run directly with Node.
- Browser synthetic workflow: empty intake queue; staging retained an excerpt without increasing evidence count; a cited case was marked Reviewed; incorporation without access acknowledgement was blocked; valid incorporation increased evidence to five and reopened the case to Needs review with its prior judgment preserved.
- Source text containing script markup and embedded instructions was displayed literally. This is an HTML rendering check, not an AI prompt-injection evaluation: no model executes in this prototype.
- Draft preview was blocked; Discard unapplied changes restored the last applied judgment; the read-only brief preview contained linked source metadata. A later core change preserves excerpt wording using Markdown escaping rather than stripping markup characters; the escaping path passed the new core test. It has not been separately checked in a rendered Markdown viewer.
- A Hindi synthetic excerpt retained its original wording. No translation quality or multilingual semantic extraction claim is made.
- The first mobile check exposed navigation overflow (433 vs 375 CSS px). After correction, the final build at 390×844 had equal client/scroll width of 375 CSS px. Viewport override was reset. No browser errors/warnings were reported during the main intake test.
- JSON download event timed out after eight seconds. Receipt was not acknowledged. Browser file restore remains unverified, and the earlier file-upload permission denial was not bypassed. Core serialization/migration/restore tests pass. Before using the prototype for sustained work, verify an actual file receipt and recovery in an approved browser.
- The unsaved synthetic QA session resisted reload; a fresh tab in the same in-app browser was used to check the final CSS build. No alternate browser or upload workaround was used.
- Screenshots are sibling `ruthless-intake-desktop-v0.4.png` (incorporated synthetic source) and `ruthless-intake-mobile-v0.4.png` (Hindi synthetic document awaiting review). QA documents are session-only and are not bundled into the release.
- Exact source/deployment status is in sibling `ruthless-release-v0.4.json`. Private publication is not a hosted browser compatibility or independent security assessment.


## v0.5 research-task queue — 4 October 2026

- 45 tests passed: 17 cyber, 12 assessment, 8 intake and 8 task tests. Task coverage includes creation bounds, state requirements, atomic rejection, same-assessment evidence, chronology, explanations/reopening, overdue filters, legacy v1/v2 migration and brief/round-trip provenance. All four app/core modules passed syntax checks.
- Browser: empty queue; created an unassigned overdue synthetic follow-up; completion without result/evidence blocked; valid completion excluded from overdue and left the linked assessment in Draft; reopening without a new note blocked; documented reopening retained the prior result; View assessment navigated to the correct case.
- Read-only brief preview contained the task, unverified owner label and reopening note. Search produced an explicit empty state and restored the task when cleared.
- At 390×844, client and scroll width were both 375 CSS px. Viewport override reset. No errors/warnings were reported during task checks. Desktop/mobile screenshots are sibling `ruthless-tasks-desktop-v0.5.png` and `ruthless-tasks-mobile-v0.5.png`; synthetic QA tasks are not bundled into the release.
- File save/reopen remains browser-unverified from the previous release. No new file upload attempt or bypass was made. Workspace v3 task/source round trips pass core tests, but this does not establish durable browser storage.
- The task queue is session-local and records analyst labels; it provides no authenticated identity, shared assignment, protected audit, automated execution or AI calls. Exact private publication state is in sibling `ruthless-release-v0.5.json`.


## v0.6 local proposal review — 4 October 2026

- 56 tests passed: 17 cyber, 12 assessment, 8 intake, 8 tasks and 11 proposal tests. Proposal coverage includes atomic mutation, synthetic-only staging, pending duplicates, source chronology, unexpected tool fields, fabricated IDs, exact quotes, UTF-16 boundaries/Hindi/emoji, output limits, abstention, acceptance/rejection, stale snapshots, reviewed-case reopening, reciprocal lineage and schema v3 migration. Syntax checks passed for the three changed/new threat modules; existing cyber modules were unchanged.
- Browser: staged a mixed Hindi/English synthetic excerpt; local fixture created one pending proposal with evidence still at four. Acceptance without source acknowledgement returned an error. Acknowledged acceptance added one source-linked evidence record and retained run/proposal references. The read-only brief preview contained fixture lineage. Synthetic instructions remained displayed source text; no model or external action executed.
- A second synthetic proposal became stale after an applied assessment edit. The acceptance control was disabled. Rejection with a reason changed the proposal to Rejected while evidence remained at five. Case reopening after acceptance was verified in the core test; this release's browser flow used a Draft assessment.
- At 390×844, client and scroll width both measured 375 CSS px. Viewport override was reset. No browser warnings/errors were reported. Screenshot siblings: `ruthless-proposals-desktop-v0.6.png` (accepted fixture with evidence link) and `ruthless-proposals-mobile-v0.6.png` (accepted and rejected fixtures). QA documents/runs remain session-only and are not bundled into the release.
- No browser file upload/recovery retry or workaround was attempted. Actual file receipt and save/reopen remain unverified from prior releases; serialization, lineage and legacy migration pass core tests. No paid AI/provider integration, semantic accuracy evaluation, live gathering, shared authentication or protected audit is claimed.
- Exact pushed source/private publication state is in sibling `ruthless-release-v0.6.json`. Hosted deployment success is separate from local browser QA and independent security evaluation.


## v0.7 synthetic evaluation harness — 4 October 2026

- 66 tests passed: previous 56 plus 10 evaluation tests. Coverage includes separate input-only splits, authored controls, exact quotes versus semantics, explicit missing responses, strict output fields, Unicode/UTF-8 limits, full manual criteria/notes, structural failures that cannot be overridden, stale review fingerprints, async snapshot isolation and CLI file/exit behavior. After a criterion wording refinement, evaluation tests were rerun; the shared citation refactor already passed the full regression suite.
- Browser: faithful controls returned six structurally valid cases needing semantic review. Misleading controls also returned six structurally valid cases with zero reviewer checks satisfied. Invalid-quote controls blocked all six cases. Reserved Hindi/mixed-script examples loaded with preserved wording; no translation accuracy is claimed.
- Read-only evaluation report contained counts, candidate label and 64-character SHA-256 fingerprint. No file upload or download was performed. Evaluation left evidence count at four, pending assessments at three and the assessment save button unchanged. Unapplied assessment edits blocked navigation; explicit discard allowed returning to the lab.
- At 390×844, client and scroll width were both 375 CSS px. Viewport override reset. Browser log query returned no warnings/errors. Sibling screenshots: `ruthless-evaluation-review-v0.7.png` (misleading candidate remains pending review), `ruthless-evaluation-mobile-v0.7.png` (mobile lab), and `ruthless-evaluation-desktop-v0.7.png` (control selector/summary). These are authored synthetic controls, not model evaluation evidence.
- A later small error-recovery change reenables the Run control after evaluation errors; it was syntax checked. The supported browser WebCrypto success path was checked again after reloading the final build. Forced browser cryptography failure was not simulated.
- No independent held-out semantic review, live provider evaluation, real-source collection or protected reviewer identity/audit is claimed. Existing browser file receipt/recovery restriction remains unresolved and was not bypassed. Current private source/deployment receipt is sibling `ruthless-release-v0.7.json`.


## v0.8 validated intake and source corrections — 4 October 2026

- 83 tests passed: prior 66, eight correction tests and nine batch/CLI tests. Added coverage includes preserved evidence/judgment, immediate review reopening, rights/chronology guards, unbranched revision chains, stale proposals, review acknowledgements/as-of dates, forged lineage, historical accepted proposals, v4 migration, atomic malformed batches, identifiers/duplicates, mixed skip/new imports linked to earlier batches, Unicode limits and exclusive CLI outputs. Final syntax checks passed across all ten JavaScript modules in the package check list.
- Browser synthetic import: unchecked source acknowledgement blocked staging. Acknowledged import retained three excerpts and one batch while evidence stayed at four. Original marked Superseded; shared-source repost and Hindi correction remained visible. Repeating returned three skipped records and kept one batch/three documents.
- Browser correction path: explicitly incorporated the fictional repost, reviewed the case with a citation and challenge consideration, then staged its correction. Missing correction acknowledgement blocked staging. Acknowledged correction reopened the case to Needs review, retained five total evidence records/earlier judgment, and excluded the superseded source from supporting groups. Marking Reviewed without revision acknowledgement failed. A documented acknowledgement allowed re-review; read-only brief preview retained old evidence and original excerpt, revision IDs, Hindi revised text and superseded warning. Corrections remained pending incorporation.
- At 390×844, document scroll width was 375 CSS px; the import dialog scroll/client widths both measured 320 CSS px. Viewport override reset. Browser warnings/errors query returned none. Sibling proof images: `ruthless-source-corrections-v0.8.png` and `ruthless-import-mobile-v0.8.png`. QA source records remain session-only and are not bundled into the release.
- No browser file upload/download/recovery retry or workaround was attempted. Actual workspace-file receipt/recovery remains unverified. CLI exclusive-write and core restore tests do not establish successful browser recovery. No source URL is fetched, no model is called and no operational action is executed. Rights notes and identity/review labels remain unverified local content.
- Pushed source and private deployment status are recorded in sibling `ruthless-release-v0.8.json`. Hosted deployment success is separate from local browser QA, production security or practitioner validation.


## v0.9 synthetic AI integration — 4 October 2026

- 103 tests passed: previous 83 plus 14 runner and six local-service tests. Coverage includes input-only requests, strict output shape, explicit acknowledgement/key gate, model/case/token bounds, exact citations versus misleading semantics, Hindi/emoji and abstention, missing-case denominator, HTTP/refusal/incomplete/tool/malformed output, size/UTF-8 bounds, timeout and stream diagnostic redaction, exclusive CLI writes, default-disabled execution, origin/Host guards, pinned configuration, concurrent requests and overlapping body reads, and failed-attempt consumption.
- Fifteen package-listed JavaScript modules passed syntax checks. Git whitespace validation passed.
- Default local console: generation disabled, fictional source selection and source-only preview work, reserved Hindi text retained. No answers/rubric guidance in preview.
- Browser provider integration used an explicit mock-only helper outside the source checkout. Unchecked acknowledgement blocked generation without consuming an attempt. Acknowledged authored output rendered an attributed draft, limitation, exact quote and UTF-16 citation, stayed Needs semantic review and consumed one of two attempts. Selecting the reserved unsupported-prediction case cleared the previous result/acknowledgement. Acknowledged output displayed explained abstention; zero remaining attempts disabled generation. No API request went to OpenAI.
- At 390×844, client and scroll width both measured 375 CSS px. Viewport reset. Browser warning/error query returned none. Proof images are siblings `ruthless-ai-mock-v0.9.png` and `ruthless-ai-mobile-v0.9.png`; both explicitly label mocked provider results. They are not evidence of model performance. QA tabs and test servers were closed afterwards.
- No browser file upload/download or recovery retry was attempted. No credential was created, written or retried after the destination decline. No real model call, charge, semantic accuracy measurement or customer-source processing occurred. Static hosting provides input inspection only; optional local execution remains unconfigured. Workspace schema stays v5.
- Source/private deployment status is recorded in sibling `ruthless-release-v0.9.json`. Publication success is separate from model quality, production security and practitioner validation.


## First live-model experiment — 4 October 2026

Secure key provisioning succeeded after enabling interactive MCP elicitation. User reported billing funded and authorized a $1 total experiment. No billing balance or Codex usage check was performed. gpt-5.4-mini-2026-03-17 first returned exact quotes with incorrect self-counted offsets; the original live-02 record is retained and structurally rejected. ai-attribution-v2 requests only document IDs and unique exact quotes; software derives and validates UTF-16 spans. No text repair, fuzzy match or ambiguous occurrence selection is performed. Raw model outputs remain separate.

103 in-process tests passed using --test-isolation=none. Three existing child-process CLI tests were excluded because the current Windows sandbox rejected child spawning (EPERM). The two evaluation CLI check/template commands and actual AI CLI execution were verified directly. Three new resolver tests cover raw preservation, Unicode, unselected/invented/normalized/repeated/overlapping/surrogate-split quotes and unsupported legacy model offsets. Changed module syntax and Git whitespace checks passed. Prior v0.9 full-suite evidence remains historical, not a claim that all 106 tests were rerun here.

Six development and six visible reserved real model responses passed structural checks. All 12 remain Needs semantic review. Preserved original languages, allegations, denials, contradictory accounts, correction withdrawal, shared source origins and explained abstentions were inspected provisionally by the coding agent; no independent practitioner or fluent reviewer has graded them. Repetitive drafts and wording such as 'explicitly superseded' merit reviewer attention. Small visible fixtures do not establish generalization, multilingual quality, prevention effectiveness or deployment readiness.

Real browser execution of the Hindi case displayed an attributed draft, exact original quote and computed UTF-16 0–62. One attempt consumed the local session allowance and disabled generation. Browser warnings/errors were empty. Proof sibling ruthless-ai-live-hindi-v0.9.png shows a real API result, unlike earlier mock screenshots. Console results are transient; its response token metadata was not saved. CLI response and manual-review templates were written as sibling files. Known CLI generated-token cost estimate is $0.013605 plus the single bounded browser request; conservative combined planning estimate below $0.05 at the documented model pricing, not a provider invoice.

Local source fix synchronization is pending: write_stdin to the Sites workflow was rejected with 'approval required by policy, but AskForApproval::Granular.sandbox_approval is false', including after explicit network/Git permissions and a fresh process. No denial workaround or secret-bearing file was used. Existing private deployment still contains the earlier static input-inspection release. Current local source and safe backup contain the functioning revised runner; the API key is excluded.

## v0.10 — citation correction and semantic-review screen, 4 October 2026

- Full normal Node test run: 112 passed, zero failures/skips, including the three previously blocked CLI tests. 17 module syntax checks and git diff --check passed. Tests use mocked provider calls only.
- Six semantic-review tests cover ignored imported approval claims, exact Hindi candidate preservation, input/output fingerprints, atomic validation, incomplete/failing decisions, reviewer relabeling, stale candidates, invalid/unsupported inputs and size bounds.
- Browser loaded the six saved real synthetic reserved outputs without a new API request. All six remain Needs semantic review. Hindi source wording and UTF-16 citation displayed correctly; earlier/later correction excerpts and source groups remained visible together.
- Missing reviewer label and a Pass without an explanatory note were blocked. Unapplied edits disabled scenario navigation and export; Discard restored Not assessed without changing counts. A UI-only note recorded with all criteria Not assessed retained six unreviewed cases. Read-only review JSON used the same offline checker format and fingerprints. No real output was semantically approved.
- Mobile layout at 390×844 had equal client/scroll width of 375 CSS px. Default desktop layout was inspected; temporary viewport reset. Browser warning/error logs were empty. Screenshot: sibling ruthless-semantic-review-v0.10.png.
- Export receipt remains unverified; no download or file-upload workaround was attempted. Reviews are tab-local/editable and do not authenticate reviewers, write assessment evidence or prove model quality. No additional paid API calls occurred for this release.
- Permission changes permitted a fresh normal Sites source workflow. A process started under an earlier restricted profile remained unusable. Publication is confirmed by Sites status for the exact pushed SHA, not by these local checks.
