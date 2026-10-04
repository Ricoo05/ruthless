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
