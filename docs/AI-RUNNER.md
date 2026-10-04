# First synthetic model integration — v0.11

Updated 4 October 2026 after live fictional-source tests. User approved secure key creation and a $1 total experiment ceiling; .env.local is configured and Git-ignored. The first real v1 response preserved uncertainty but supplied incorrect citation offsets and was rejected. Prompt ai-attribution-v2 now requests only exact quotes; software derives spans from unique exact occurrences while retaining raw output. Twelve real fixture responses (six development, six visible reserved) passed structural checks. This is not independent semantic validation or an operational readiness claim. A real Hindi result was also checked in the local browser.

## What executes

The CLI and optional loopback service POST to the fixed OpenAI Responses endpoint. Only bundled fictional questions and selected documents are accepted; authored controls, rubric guidance, workspace files and customer inputs are excluded. A strict JSON schema requests attributed drafts with selected document IDs and exact quotes, or an explained abstention. Software derives UTF-16 spans only when a quote occurs exactly once in its selected excerpt. Missing, repeated (including overlapping), normalized-but-not-exact and surrogate-split matches are rejected. Original raw outputs are retained separately; no statements or quotations are repaired. The local validator enforces eight proposals and four citations per proposal. The prompt preserves uncertainty, denials, corrections, shared origins and contradictory accounts, and treats source instructions as data. This is a prompt specification, not a demonstrated model safety or accuracy guarantee.

No tools, arbitrary URLs, retries, background jobs or assessment writes are enabled. Provider refusals, incomplete outputs and executable fields cannot become drafts. Each request has a 60-second timeout and a 2 MB response bound. HTTP/transport errors are summarized without echoing provider diagnostic bodies. Failed requests consume the local attempt allowance. The server binds only to 127.0.0.1, checks Host and same-origin JSON headers, pins model/token configuration and serializes execution. It is a local development service, not a production authenticated API.

## Offline preview first

Run from the project directory. Replace `API_MODEL` with a selected, supported API model identifier; Codex chat model names are not automatically API identifiers. Output files must be new. This command requires no key and makes no network request:

```powershell
node scripts/run-ai.mjs plan --model API_MODEL --max-cases 1 --max-output-tokens 4000 --out ../ruthless-ai-plan.json
```

The plan lists the endpoint, prompt, schema and complete fictional payload. The gpt-5.4-mini-2026-03-17 snapshot was used successfully with this schema in the first live tests; other models remain unverified. Start with one development case; expand after reviewing its result. `--split holdout` selects the visible reserved fixtures, not independently blinded material.

## Authorized execution after provisioning

Use the OpenAI Developers key workflow for supported provisioning. Do not paste keys into chat, browser fields, command arguments or source files. The runner reads `OPENAI_API_KEY` from its process environment. `.env` and `.env.*` are ignored by Git; the approved .env.local exists only locally. Node 20.6+ supports loading it without putting the key in command arguments:

```powershell
node --env-file=.env.local scripts/run-ai.mjs run --model API_MODEL --max-cases 1 --max-output-tokens 4000 --out ../ruthless-ai-execution.json --allow-api
```

For the local browser console:

```powershell
node --env-file=.env.local serve.mjs --enable-ai --model API_MODEL --max-requests 1 --max-output-tokens 4000
```

Open http://127.0.0.1:4173/ai.html, inspect the chosen input, acknowledge the single request, then generate. The default `node serve.mjs` disables execution. The private hosted static preview also disables execution and contains no credential or backend. The browser sends only a bundled case ID/split/acknowledgement to the local service; the key stays in the Node process. Browser results are transient and separate from the workspace. Use the CLI for a durable execution report.

The allowance is 1–6 attempts per process session and resets on server restart. Output tokens are bounded to 512–8,000 per request. These controls do not establish a monetary spending cap, account budget or total reasoning-token guarantee. Provider-level billing and an agreed paid experiment allowance remain separate decisions. Mocked tests make no provider calls. Recorded CLI generated-token cost estimate for this live session is $0.013605, plus one short browser request whose token metadata was not persisted. These are pricing estimates, not a billing receipt. No payment or billing-balance check was performed by the agent.

## Review and retention

Execution reports retain requested/returned model, prompt version, source-input fingerprint, editable timestamps, response identifier, reported token counts, candidate outputs and structural evaluation. Metadata is not a protected provider identity or audit trail. Missing cases remain in the six-case denominator, so a one-case run cannot pass the full suite. Valid citations never grant semantic approval. Extract the report's `candidates` envelope for the existing offline checker and manual review template described in `EVALUATION.md`. Record failures and reviewer reasoning before expanding the experiment.

The request uses `store:false`, which disables stored Responses application state; this does **not** establish zero retention. OpenAI documents default abuse-monitoring retention and separately approved retention controls. Only authored fictional data is permitted in this runner. Official references: [Responses migration](https://developers.openai.com/api/docs/guides/migrate-to-responses), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), and [data controls](https://developers.openai.com/api/docs/guides/your-data).

Independent unseen multilingual evaluation, practitioner review, approved customer data, authenticated roles, protected audit, recovery and deployment security remain necessary before operational/customer use. Stay on Sol 6.1 High for this implementation stage.

## Browser semantic review

The AI console links to `/review.html` and a received result offers a candidate-JSON preview for copying into review. Existing CLI execution v2 or candidate JSON can also be pasted. Only bundled synthetic suite candidates are supported. The page recomputes structural checks and ignores imported report/approval claims. Applicable criteria and source context are shown side by side; recorded decisions require a reviewer label and notes for every assessed criterion. Unapplied edits block navigation and export. Records are compatible with the offline checker and bound to its existing source/rubric and complete-output fingerprints. No network calls, model requests, assessment writes or automatic approvals occur. Download receipt is not verified; closing the tab loses unexported reviews. Browser QA notes are in VERIFICATION.md.

## Resume a recorded review — v0.11

Export resumable session requests a JSON record with format `ruthless-semantic-review-session`, version 1, and exactly `candidates` and `review`. It is bounded to 2 MB UTF-8 and is revalidated before serialization. It intentionally excludes the execution report, raw provider responses and credentials. Record provenance/provider labels remain unverified.

Paste that record into Open or resume a review. The importer rechecks the bundled candidates against the current authored suite, recomputes the source/rubric and candidate fingerprints, validates every review criterion and then replaces state atomically. Altered drafts, wrong suite versions, mismatched hashes, missing notes, injected approval fields and conflicting separate annotations are rejected. Unassessed notes and reviewer labels also trigger loss protection. No restored reviewer label authenticates identity, and no new semantic decision is inferred.

Older separate review exports can be restored by pasting their exact candidates above and the recorded review in the optional field. Keep that field empty for a resumable session. The offline evaluation CLI continues accepting separate candidate/review files; it does not directly ingest the combined session format. Successful loading collapses import inputs while leaving the restore message and review context visible. Browser fresh-tab JSON recovery was checked; actual download receipt/file recovery remains unverified.

## Case analysis integration (v0.12)

The assessment desk now exposes the same bounded local request route in Case analysis, after creation of a matching fictional case and explicit single-request acknowledgement. It shows only the selected bundled reports; arbitrary workspace text is never sent. Validated outputs enter a Pending case-linked draft inbox with exact source bindings, without changing evidence or analyst judgment. The hosted static preview can attach the bundled retained real outputs without an API call. Source and assessment changes mark earlier drafts stale. The original `/ai.html` console remains separate; use the CLI when a raw durable execution record is needed. See `CASE-ANALYSIS.md`.
