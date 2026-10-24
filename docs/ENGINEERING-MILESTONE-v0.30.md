# RUTHLESS v0.30 — official India advisory change review

Engineering milestone: 24 October 2026. Mission: preserve and prioritize changes to publicly issued official terrorism-related guidance about India for an authorized human analyst. This is guidance-change review, not detection of hidden plans, confirmation of a suspect, or demonstrated attack prevention.

## 1. Baseline and gap assessment

The inspected checkout was clean at `c2c7124a4bea57cf33c33af63b7122c3cb85b857`; Sites confirmed hosted version 30. The unmodified regression suite passed 355 tests. The prior 266-record collection is a documented October 10 observation, not a fresh October 24 measurement; the repository does not contain enough archived watch responses to independently reproduce that count today.

The existing dependency-free Node 24/static browser architecture, workspace format v8, emblem, design system, five watch adapters, media review, detection experiments and 3D exercises were retained. The encrypted workspace backend intentionally rejects real documents/evidence. That boundary was preserved; new public-source persistence uses a separate journal.

Primary gaps were durable collection and review, source-version preservation, exact first-observation replay, independent real outcome labels, and production identity/operations. No verified historical page-body dataset or independent incident labels were available.

## 2. Exact implemented capabilities

- A bounded, fixed-source GOV.UK India collector preserves the original successful HTTP response bytes, selected HTML sections, source and topic hashes, publisher update time, capture time, and server first-observation time.
- An inert bounded HTML tokenizer extracts the terrorism section and retained text/raw offsets. It never executes or inserts publisher HTML. Source text remains data.
- First and unchanged observations produce `baseline_context`. A changed terrorism passage produces `changed_guidance` with exact added/absent paragraphs, uncertainty, alternative explanations and lawful verification questions. Changes elsewhere in the guide do not become terrorism-guidance changes. Absent text is not declared resolved.
- SQLite persists attempts, failed attempts, append-only review events and a locally verified SHA256 audit chain. Storage is bounded to 1,000 attempts, 5,000 reviews, 10,000 audit entries and 128 MiB; limits reject writes rather than silently erase evidence. Collection reserves conservative space and audit capacity before network access; concurrent reviews/configuration cannot consume this hold. Lower-only operational caps can reduce the configured bounds.
- Opt-in monitoring runs hourly in the local research process. Eligibility is reserved durably before network access; retries back off, respect bounded Retry-After values and survive restart. Manual collection cannot bypass cooldown. Disabling monitoring prevents further scheduled collection. Shutdown waits for an active capture before closing storage.
- Strict loopback/Host/Origin/request-marker checks protect local collection/query/scheduling/review routes. Requests are bounded to 16 KiB. No arbitrary fetch URL, source HTML execution, paid model call or external alert route was added.
- Source collection now contains the working Official warning review section. Analysts can inspect exact evidence, replay a UTC cutoff, append a source-bound disposition, and stage the passage through existing Document intake. Optimistic journal heads and superseded-capture checks reject stale reviews.
- Hosted static clients can explicitly inspect one dated real public capture. This export excludes reviewer notes, raw full response, credentials, and active scheduling state. The hosted site does not run the journal worker.
- A reproducible evaluator compares changed-guidance review with an any-page-change baseline over declared chronological periods and independently reviewed complete intervals. Unknown/unlabelled intervals and missing topic coverage do not become safe negatives. Labels never enter candidate generation. Predictive attack metrics/calibration remain null.
- An existing historical metadata leak was fixed: later source incorporation and analyst labels no longer appear as if known at earlier day cutoffs. Labels without a historical snapshot become Unknown.

## 3. Architecture and changed components

New modules: `dist/advisory-engine.mjs`, `dist/intelligence-evaluation.mjs`, `dist/intelligence-app.mjs`, `collection/intelligence-store.mjs`, `collection/intelligence-service.mjs`, and `scripts/intelligence-journal.mjs`.

Integration changes: the GOV.UK collector exposes validated response bytes; the existing strict collection server composes the journal service; `scripts/serve-research.mjs` opens and drains it. Existing Source collection and main workspace callbacks host the new workflow. `dist/signals-core.mjs` contains the temporal metadata fix. Package scripts, runtime ignores, the main release label, and minimal styles were updated. Existing analytical engines and branding were preserved.

## 4. Real sources and access findings

The [GOV.UK India Content API](https://www.gov.uk/api/content/foreign-travel-advice/india) returned HTTP 200 and 123,115 bytes. It is one FCDO travel-advisory publisher, not comprehensive Indian security intelligence. Reuse attribution and Open Government Licence reference accompany the retained material.

The new journal observed the source at **2026-10-24T10:46:32.026Z**, following capture at **10:46:31.169Z**. The publisher's public edition time is **2026-10-07T10:56:27Z**. This older publication time does not backdate journal knowledge. A different top-level API `updated_at` can reflect dependent-link changes and is not used as an escalation signal.

The existing other watch connectors remain available; they were not all remeasured for this milestone. CERT-In was evaluated but not newly ingested: reproduction permission is required by its published policy, listing requests timed out, and no official RSS endpoint was verified. No permission request or subscription was sent. See [verified source review](INTELLIGENCE-SOURCE-REVIEW.md).

## 5. Automated and integration validation

The final expanded regression suite passed **415 tests**, including graceful draining and three quota-preflight regressions. All **84** configured module syntax checks passed.

New coverage includes exact quote/raw-span binding, hostile/hidden source markup, source/topic deduplication, source metadata changes, future corrections, first-observed leakage, independent label bounds, failure coverage, restart/integrity, raw response hashes, stale reviews, cooldowns, Retry-After, strict local HTTP transport, and graceful draining. Authored unit fixtures are clearly labeled and never supplied as operational fallback data.

Windows denied the test's file-symlink creation. Its rejection branch is present but was not exercised with an actual file symlink; the test reports that diagnostic. This does not certify filesystem hardening against a privileged local adversary.

Browser checks used the actual local service: current source loaded; a pre-observation cutoff showed zero observations despite the older publication date; an explicitly labeled automated engineering context review persisted; collection cooldown rejected a second fetch; scheduling was enabled and then disabled; and a real passage entered Document intake while evidence acceptance remained separate. Server restart retained the source, review and disabled monitor state.

## 6. Actual findings, false alerts and misses

The actual journal contains **one real capture**, **one baseline context item**, **zero changed-guidance candidates**, and **one automated engineering review**, explicitly not an independent human validation. Source capture-to-journal elapsed time for this one observation was approximately **857 ms**, including network, processing and insertion; this is not a scale benchmark.

No genuine historical body was recovered from the attempted archive endpoints. No independently labeled negative intervals, official-change outcomes or incident outcomes were supplied. Thus false-alert rate, missed-incident rate, attack precision/recall, predictive calibration, event lead time and prevention effectiveness are **not measurable**. Zero change candidates on a first observation is not a successful negative outcome or evidence of safety.

## 7. Baseline comparison

For the single initial observation, both topic-change and any-page-change flags are false because there is no earlier journal capture to compare. No superiority claim is supported. The executable comparison harness has been checked with authored protocol fixtures; an untouched real chronological evaluation has not been conducted.

## 8. Security and reliability weaknesses

- Public source data and review notes are stored in plaintext SQLite. This is a loopback single-user research service, without agency authentication, real reviewer identity, RBAC, encrypted real-data storage, external audit anchoring, automated backup or production incident response.
- Append-only tables and hash-chain/head verification detect ordinary local edits and partial deletion; a privileged attacker who rewrites the whole database/head or rolls back a complete copy is outside that guarantee. TLS plus hashes does not independently authenticate a publisher's claims.
- Full journal verification occurs on reads/writes and is intentionally bounded; large-scale throughput has not been evaluated. Storage quotas stop collection when reached. Retention deletion and archival procedures need authorized design before sensitive data use.
- Scheduler persistence requires the local research process to run. It is not an OS-installed service or hosted unattended worker. Monitoring was left **disabled** after checks.
- Parser drift is handled as missing topic coverage. English-only fixed-source extraction cannot establish multilingual retrieval, semantic event resolution, independent corroboration or misinformation detection.
- Historical workspace case geography, assignment and source-group metadata remain current editable values. Direct analyst statement annotations are not a versioned historical ledger. The new journal replay avoids those values; day-based older tools are not suitable for intraday prediction claims.

## 9. Experimental or unimplemented capabilities

Changed wording can be editorial or routine and requires human interpretation. Real alert usefulness, independent source reliability, event association, broader domestic/cross-border case linkage, multilingual semantic extraction, learned warning prioritization, calibration and pre-incident prediction remain unvalidated. Autonomous corroboration-seeking agents, unrestricted crawling, social/CCTV connectors and production organizational data access were not added.

## 10. Next three milestones

1. Obtain verifiable historical page bodies and independently reviewed complete monitoring intervals; lock a protocol and test untouched chronological periods against the baseline, retaining false alerts, misses and coverage gaps.
2. Add a second appropriately permitted official/public reporting source relevant to India, with explicit source dependence and multilingual retrieval evaluation. Resolve CERT-In reproduction permission before copying its material; keep cyber indicators distinct from terrorism warnings.
3. Design an authenticated deployment with real roles, encrypted real-data storage, retention/backup recovery and external integrity anchoring; then evaluate an authorized limited analyst pilot. Practitioner validation is a dependency, not something code can manufacture.

## Reproduce

Node 24 or later, no new dependencies or paid API calls:

```powershell
node scripts/serve-research.mjs
node scripts/intelligence-journal.mjs status
node scripts/intelligence-journal.mjs collect
node scripts/intelligence-journal.mjs replay --as-of 2026-10-24T10:46:31Z
node scripts/intelligence-journal.mjs export-public
```

Open http://127.0.0.1:4181/#collection and connect the local journal. `collect` enforces the same hourly cooldown. `export-public` intentionally publishes only the latest genuine public observation, never local review notes. For independently prepared label files, use:

```powershell
node scripts/intelligence-journal.mjs evaluate --labels YOUR_LABEL_FILE.json --development-end YOUR_ISO_TIME --start YOUR_ISO_TIME --end YOUR_ISO_TIME
```

Label format: `ruthless-independent-labels`, version 1, `independentReviewDeclared:true`, and `labels` containing non-overlapping complete UTC intervals, expected guidance-change status, independent outcome-source URL and later review time. A declaration does not itself verify independence. No operational label file is fabricated in this release.
