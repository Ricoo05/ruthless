# Project Ruthless — Exposure Intelligence v0.2

A working research prototype for prioritizing existing asset/CVE findings using public exploitation evidence. Synthetic demo assets are clearly marked. This is not a scanner or a production-accredited defense system.

## Run locally

Requires Node.js 20 or later. No dependency installation or API key is required.

```powershell
cd C:\Users\arhit\Documents\Codex\2026-10-02\ca\outputs\ruthless
node serve.mjs
```

Open http://127.0.0.1:4173/exposure.html. The server binds only to loopback. To use a different port, set `PORT` before starting it. Stop with Ctrl+C. Opening index.html directly with a file URL will not load JavaScript modules/catalog reliably; use the local server.

## Try the workflow

1. Review the synthetic demo and inspect a finding's evidence and score.
2. Import findings from the provided CSV template. Required columns: `asset,cve,criticality,internet_exposed`. Optional: `owner,mission`. Criticality is an integer 1–5; exposure is `true` or `false`. Supply one row per asset/CVE pair. Maximum 2,000 findings and 2 MB.
3. Apply a decision and supporting note. Remediated, Accepted risk, and Not applicable require a note.
4. Export the filtered CSV or a full Markdown brief.
5. Choose Save project to download JSON. Open project restores findings, decisions, history, and the exact catalog snapshot. The shared 12 MB UTF-8 limit is checked before accepting changes so a saved project can be reopened. Closing the browser clears unsaved work. Files are not encrypted.
6. In Sources & method, refresh from the official CISA mirror or open an offline catalog JSON.

## Data boundaries

There are no customer-data uploads, analytics, AI API calls, or browser-storage persistence in the application code. The only external data request is an explicit public catalog refresh. Opening source links navigates to the publisher. Hosting the application still involves ordinary web delivery and hosting access controls; a private URL is not security certification.

Imported CVEs are matched exactly, not guessed from product names. Presence in KEV is evidence of exploitation somewhere, not proof that your specific system is vulnerable or compromised. Absence from KEV does not establish safety. The score is an unvalidated triage heuristic. CISA due dates are not Indian legal deadlines.

Project files can be edited outside the app. The UI and reports distinguish the bundled snapshot, a public mirror fetched in this session, and imported files with unverified provenance. Verify externally supplied catalogs against CISA. Review history is not tamper-evident. Use synthetic or approved non-sensitive data for evaluation. A production service would need customer-specific security design and independent review.

## Verification

```powershell
node tests/core.test.mjs
node --check dist/app.mjs
```

See `docs/RESEARCH-AND-PLAN.md` for sources, commercial hypotheses, discovery questions, and the product roadmap. See `docs/VERIFICATION.md` for tested behaviors and remaining limitations.

## Public data attribution

The bundled catalog is from the [official CISA KEV mirror](https://github.com/cisagov/kev-data), provided under CC0. The upstream version and release date are displayed in the app. The bundled snapshot is not an automatic live feed.

## Earlier release status

v0.2 is locally verified and packaged. Private publication is being resumed after source synchronization was restored. The latest confirmed deployment and exact source commit are recorded in the sibling `ruthless-release-v0.2.json`; absence of that receipt means publication is not confirmed. See `CHECKPOINT.md` for continuation details.
