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
