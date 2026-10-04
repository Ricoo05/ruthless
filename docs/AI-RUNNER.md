# First synthetic model integration — v0.9

Implemented 4 October 2026. No real provider call has been made. Transport, validation and console results were tested with authored mocked outputs; they do not measure AI quality. Key creation stopped after the local save destination was declined. No secret was created, written or retried. OpenAI Developers is installed. The next live experiment needs approved credential provisioning, a literal API model identifier and an authorized test allowance.

## What executes

The CLI and optional loopback service POST to the fixed OpenAI Responses endpoint. Only bundled fictional questions and selected documents are accepted; authored controls, rubric guidance, workspace files and customer inputs are excluded. A strict JSON schema requests attributed drafts with exact quotes and UTF-16 spans, or an explained abstention. The local validator enforces eight proposals and four citations per proposal. The prompt preserves uncertainty, denials, corrections, shared origins and contradictory accounts, and treats source instructions as data. This is a prompt specification, not a demonstrated model safety or accuracy guarantee.

No tools, arbitrary URLs, retries, background jobs or assessment writes are enabled. Provider refusals, incomplete outputs and executable fields cannot become drafts. Each request has a 60-second timeout and a 2 MB response bound. HTTP/transport errors are summarized without echoing provider diagnostic bodies. Failed requests consume the local attempt allowance. The server binds only to 127.0.0.1, checks Host and same-origin JSON headers, pins model/token configuration and serializes execution. It is a local development service, not a production authenticated API.

## Offline preview first

Run from the project directory. Replace `API_MODEL` with a selected, supported API model identifier; Codex chat model names are not automatically API identifiers. Output files must be new. This command requires no key and makes no network request:

```powershell
node scripts/run-ai.mjs plan --model API_MODEL --max-cases 1 --max-output-tokens 4000 --out ../ruthless-ai-plan.json
```

The plan lists the endpoint, prompt, schema and complete fictional payload. Model availability and actual Structured Outputs compatibility remain unverified until a real request. Start with one development case; expand after reviewing its result. `--split holdout` selects the visible reserved fixtures, not independently blinded material.

## Authorized execution after provisioning

Use the OpenAI Developers key workflow for supported provisioning. Do not paste keys into chat, browser fields, command arguments or source files. The runner reads `OPENAI_API_KEY` from its process environment. `.env` and `.env.*` are ignored by Git; no such file was created for this release. If the user subsequently approves a local `.env.local` destination, Node 20.6+ supports loading it without putting the key in command arguments:

```powershell
node --env-file=.env.local scripts/run-ai.mjs run --model API_MODEL --max-cases 1 --max-output-tokens 4000 --out ../ruthless-ai-execution.json --allow-api
```

For the local browser console:

```powershell
node --env-file=.env.local serve.mjs --enable-ai --model API_MODEL --max-requests 1 --max-output-tokens 4000
```

Open http://127.0.0.1:4173/ai.html, inspect the chosen input, acknowledge the single request, then generate. The default `node serve.mjs` disables execution. The private hosted static preview also disables execution and contains no credential or backend. The browser sends only a bundled case ID/split/acknowledgement to the local service; the key stays in the Node process. Browser results are transient and separate from the workspace. Use the CLI for a durable execution report.

The allowance is 1–6 attempts per process session and resets on server restart. Output tokens are bounded to 512–8,000 per request. These controls do not establish a monetary spending cap, account budget or total reasoning-token guarantee. Provider-level billing and an agreed paid experiment allowance remain separate decisions. No charge was incurred by the mocked tests.

## Review and retention

Execution reports retain requested/returned model, prompt version, source-input fingerprint, editable timestamps, response identifier, reported token counts, candidate outputs and structural evaluation. Metadata is not a protected provider identity or audit trail. Missing cases remain in the six-case denominator, so a one-case run cannot pass the full suite. Valid citations never grant semantic approval. Extract the report's `candidates` envelope for the existing offline checker and manual review template described in `EVALUATION.md`. Record failures and reviewer reasoning before expanding the experiment.

The request uses `store:false`, which disables stored Responses application state; this does **not** establish zero retention. OpenAI documents default abuse-monitoring retention and separately approved retention controls. Only authored fictional data is permitted in this runner. Official references: [Responses migration](https://developers.openai.com/api/docs/guides/migrate-to-responses), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), and [data controls](https://developers.openai.com/api/docs/guides/your-data).

Independent unseen multilingual evaluation, practitioner review, approved customer data, authenticated roles, protected audit, recovery and deployment security remain necessary before operational/customer use. Stay on Sol 6.1 High for this implementation stage.
