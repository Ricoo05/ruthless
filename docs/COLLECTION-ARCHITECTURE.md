# Collection implementation contract

Decision date: 5 October 2026. The local collector is implemented. v0.16 adds the report-review UI, inert text extraction and explicit passage adapter described in `COLLECTION-REVIEW.md`. Scheduled collection is not implemented. Statements below marked future remain design requirements; the hosted UI does not run the collector.

## First working boundary

`node scripts/collect-advisory.mjs --collect` makes one unauthenticated request to the fixed GOV.UK Content API endpoint for the India travel advisory. It retains three sections: warnings and insurance, safety and security, and regional risks. These are the UK publisher's travel-advice perspective, not a comprehensive India incident feed or independently verified intelligence.

The command writes an exclusive, flushed JSON report under ignored `.collection-runtime/`. It records the endpoint, local observation time, publisher update time, response hash, selected-content hash, attribution and original section HTML. Source HTML remains inert data and must never be inserted into a browser with innerHTML. Unselected sections, attachments and outbound links are not retained or followed. The response hash identifies the received bytes but cannot reconstruct the full response, which is not retained.

Successful collection means a bounded response passed this connector's schema checks. It does not mean a threat was detected, evidence accepted, or publisher content independently verified. Records carry `synthetic:false` and `disposition:quarantined`. There is no automatic import into the synthetic backend, no model invocation and no changes to case judgments. Local files are editable and unencrypted; their hashes are not authenticated audit receipts. No unattended process, deletion timer or retention enforcement is installed.

The collector denies redirects and arbitrary URLs, requires JSON/expected page/language/schema, rejects withdrawn pages and missing or repeated required sections, limits decoded bytes to 2 MiB and the request to 15 seconds, and records generic failures. It does not retry 429 responses. The fixed hostname uses ordinary system DNS/TLS; a production deployment still needs controlled network egress. Repeated manual invocation has no rate or disk quota yet and is not ready for scheduled production use.

## Source decisions and primary references

- **GOV.UK: selected for a narrow prototype.** The [Content API](https://content-api.publishing.service.gov.uk/) documents public access without authentication and limits what content it exposes. The [reuse guidance](https://www.gov.uk/help/reuse-govuk-content) points to the Open Government Licence, except where otherwise stated. Keep the source link, attribution and [licence link](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/); check third-party exceptions before broader redistribution. The licence endpoint itself returned 403 during this review, so this is not a claim of a completed commercial legal review. No logos, photographs or attachments are collected.
- **Reddit: excluded for the proposed government-intelligence product.** Its [Public Content Policy](https://support.reddithelp.com/hc/en-us/articles/26410290525844-Public-Content-Policy) restricts licensees from supplying public content for surveillance, intelligence or law-enforcement purposes, and requires respecting deletions. Public visibility is not permission for this use.
- **X: excluded under the reviewed standard terms.** [Master License Agreement sections 14.2–14.3](https://legal.x.com/data-terms/us/mla.html) restrict intelligence uses and provision to government intelligence end users. An ordinary API subscription is insufficient. Do not implement scraping or broker/export workarounds.
- **Other social platforms: not reviewed, not connected.** Facebook, Instagram, YouTube, Telegram, LinkedIn and others each need a separate use-case and access review. A public institutional account is not automatically a licensed feed. No claim of access or blanket prohibition is made for these platforms.
- **Indian official publishers: pending permission.** Existing NIA/MHA reproduction-policy findings are in `PLATFORM-DIRECTION.md`. Link visibility and customer authorization do not by themselves authorize republication. Obtain suitable rights before adding those content connectors.

These are engineering source-selection decisions based on the linked policies, not permission grants. Recheck terms before customer use or expanding scope. The project does not offer blanket monitoring or profiling of private people.

## Pipeline and trust boundaries

1. **Source registry:** a reviewed source ID maps to a fixed endpoint, publisher, allowed purpose/content categories, rights reference, attribution, geographic/language scope, owner, review date, retention/deletion obligations and configuration state. Only the single hard-coded GOV.UK source exists today. An unreviewed source remains disabled; a user-entered URL is not a new connector.
2. **Bounded collection:** a server-side worker obtains one permitted snapshot. Future scheduling needs per-source minimum intervals, jitter, Retry-After handling, bounded retry budgets, concurrency/disk quotas and cancellation. No browser credentials, cookies or model tools participate.
3. **Quarantine:** validate transport and source schema; preserve original language, exact source bytes/locators for selected content and publisher versus observation timestamps. Failures and omissions remain visible. Collection does not confer evidentiary status.
4. **Deterministic normalization:** future adapter uses an HTML parser to extract visible text, with links kept as metadata and scripts/styles discarded. Retain the original and version the extraction algorithm. Reject oversized excerpts rather than silently truncate; require explicit section/paragraph selection to fit the existing 4,000-character excerpt bound.
5. **Analyst intake:** show publisher, licence, original text, date, selected scope, content changes and source-group relationship before the analyst selects an assessment and stages a batch. Use existing `ruthless-source-batch` validation, immutable revisions and rights acknowledgement. Same publisher/reposts do not become independent confirmation. Page update time is not an incident time.
6. **Analysis and follow-up:** run existing indicator queries over staged excerpts, retain benign/negated matches, examine contradictions and create bounded verification tasks. Source instructions cannot authorize tool calls or approvals. Human review remains explicit.

For stable external IDs, use publisher content ID plus section identity plus a revision hash, bounded to the existing 60-character identifier limit. Keep full identity/hash in collection metadata, map a changed section to a new external record, link the superseded version explicitly, and validate collisions. Observation time must not rewrite publisher dates. Historical queries cannot infer versions that were never collected.

## Coverage semantics

The implemented helper distinguishes `not_collected`, `unavailable`, `current_snapshot` and `stale` using a prototype 24-hour collection-freshness threshold. The selected page's publication age is separate. Neither a recent fetch nor zero indicator matches supports a conclusion that an area is safe.

The future desk must show every configured source, including failed and disabled sources, the last attempt and last successful capture separately, geographic/language scope, sections included/omitted, and collection window. When the newest attempt fails, an earlier success can remain inspectable but cannot be displayed as a successful newest attempt. Partial pagination and unsupported sections must never count as full coverage. Internet-wide recall cannot be measured from this inventory.

Corrections must reopen dependent review. Publisher withdrawals, licence expiry and deletion requests need a tombstone/retention workflow before adding sources with such obligations; encrypted history must not become an excuse to retain content indefinitely. The current prototype only rejects a newly received withdrawn page and does not retroactively delete old local files.

## Acceptance for the next implementation stage

Use Sol 6.1 High for the review UI and deterministic adapter. Keep the current AI runner synthetic-only; connecting real content to an external model is a separate decision.

- Display collected/failed/stale source status with scope and both timestamps. Do not add a geographic risk percentage.
- Render extracted source text safely; test malicious HTML, encoded markup, Hindi, Unicode, links, headings and negations. Never execute document instructions.
- Choose an excerpt and target assessment explicitly, then stage through the existing batch contract. Test exact-text provenance, unchanged replay, correction, identifier collision and atomic rejection.
- Keep real public content out of the synthetic-only backend/API experiment. Test that attempts to cross this boundary fail.
- Run fixture-based failure/recovery tests, a bounded live source smoke test, desktop/mobile review, and regression tests. A successful fetch is a connector test, not validation of detection effectiveness.

Subsequent evaluation should use a fixed, held-out authorized corpus with independently annotated relevant and irrelevant items, duplicates, benign wording and corrections. Report retrieval recall/precision against that corpus, analyst false-alarm burden, citation fidelity, collection latency and source gaps separately. No precision/recall or attack-prevention performance number exists yet. Escalate to Astra High for unresolved cross-source identity, multilingual fidelity, permission or production-deployment design; return to Sol after a concrete decision.
