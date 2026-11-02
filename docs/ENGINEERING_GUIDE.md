# Engineering learning guide

Read this alongside the source. The walkthrough, questions and exercises explain the implemented architecture and its tradeoffs.

## Execution path

`scripts/serve-research.mjs` creates the public SQLite store, advisory service and strict local HTTP server. `collection/govuk-advisory.mjs` fetches a fixed official endpoint. `dist/advisory-engine.mjs` parses bounded inert HTML and compares the terrorism section. `collection/intelligence-store.mjs` persists original responses, hashes, attempts, review events and cooldown reservations. `collection/intelligence-service.mjs` binds commands to HTTP with request bounds and origin checks. `dist/intelligence-app.mjs` renders review controls; staging calls the existing workspace document-intake path in `dist/threat-core.mjs`. The maintained browser source is in dist/; there is no compilation step.

The browser workspace, public-data journal and encrypted synthetic-only backend are distinct stores. Do not confuse a staged document with accepted evidence or a stored public observation with a validated claim.

## Fifteen interview questions with source-backed answers

1. Why retain first-observed time? A publication date cannot prove when the collector knew a report. `replayAdvisories` in advisory-engine.mjs requires publisher, capture and observation eligibility.
2. What is the first capture's alert? Baseline context. With no predecessor it cannot establish changed guidance; see analyzeAdvisory.
3. Does any page change raise a warning? No. The rule compares the terrorism section; unrelated page edits are separate metadata. See advisory-engine tests.
4. Why retain original response bytes? They allow later parsing and hash checks against preserved source material. See the store raw-response binding tests.
5. Does a SHA256 hash authenticate a publisher? No. It detects changes against the retained value; TLS/source trust and independent corroboration are separate concerns.
6. Can a privileged user defeat the audit chain? Yes, by replacing/rewriting the complete database and head. See store verification and SECURITY.md.
7. How is concurrent collection bounded? The journal reserves eligibility, space and audit capacity transactionally before fetching. See reserveCollection and its quota tests.
8. What prevents stale review? Candidate/source binding plus an expected journal head; a later capture can supersede an older review. See intelligence-service tests.
9. How are collection failures interpreted? As coverage gaps. Prior successful material remains retained; failure never means a safe negative.
10. Why reject arbitrary fetch URLs? Fixed-source requests limit SSRF/access scope. See the collector configuration and strict local service tests.
11. How does the parser avoid executing source HTML? It tokenizes bounded inert source text, excludes hidden/embedded material and escapes rendered content. See advisory-engine.mjs and intelligence-app.mjs.
12. Why do prediction metrics remain null? No independent complete outcome intervals establish attack precision, recall or calibration. See intelligence-evaluation.mjs.
13. How is the baseline compared? Changed-topic candidates and any-page-change flags use the same eligible independently labeled time intervals. Unlabeled/incomplete intervals are excluded, not counted as negatives.
14. Does Node's event loop eliminate races? No. Async HTTP requests can overlap. Store transactions, reservations and optimistic versions enforce state boundaries; see store/service tests.
15. What limits scale? Bounded source/storage limits and full integrity verification on journal operations. No throughput benchmark justifies large-scale claims. See the milestone report.

## Hands-on exercises

- Trace Collect due official source from browser click to SQLite insertion and back; draw each boundary and identify every timestamp.
- Add a parser regression for a changed peer heading that must not leak unrelated text into the terrorism section.
- Reproduce the cooldown and stale-review failures using existing service tests, then explain their invariants.
- Introduce an incorrect replay comparison in a disposable branch, observe the failing temporal test and repair it.
- Add a new lawful public source design without implementing arbitrary URL fetching; specify licensing, rate limits and failure semantics first.
- Explain why a source quote about a general risk cannot identify a person or predict a dated incident.
- Run the full tests from a clean clone and account for every skipped test and environmental warning.

No interview proficiency score has been measured. The owner should demonstrate these exercises and explain the code without relying on this guide before claiming independent mastery.
