# Project Ruthless — Intelligence Workbench v0.5

Ruthless is being developed as terrorism intelligence analysis software for government and government-agency customers, covering domestic, cross-border and international developments relevant to India, with broader geographic support. The intended platform spans threat analysis, intelligence gathering, data integration, operations workflows and AI orchestration. The current release is a manual evidence-analysis, document-intake and research-task prototype using synthetic cases. Prevention effectiveness and customer demand have not been validated.

## Run

Requires Node.js 20 or later, without dependency installation or an API key.

```powershell
node serve.mjs
```

Open http://127.0.0.1:4173/. The local server binds to loopback. The retained cyber exposure module is at `/exposure.html`; its instructions are in `docs/CYBER-EXPOSURE.md`.

## Threat analysis workflow

1. Open a synthetic case or create an assessment with a geographic scope and intelligence question.
2. Stage a source excerpt in Document intake with language, location, access conditions and provenance; review its attribution and retain permission details before incorporating an analyst statement. Direct manual evidence entry is also available. Add dated evidence records with publisher, source URL, underlying source group and a concise attributed statement. Records can support, challenge or provide context for the assessment. Real public references require HTTPS URLs; the app does not fetch or verify them.
3. Compare the timeline and contradictions. Reposts sharing a source group count as one supporting group; even distinct group labels do not prove independence.
4. Record the judgment, information gaps, confidence, citations and review note. Reviewed assessments require all these fields and explicit consideration of conflicting evidence. A reviewed conclusion cannot cite a report published after its as-of date.
5. Adding evidence reopens a Reviewed assessment. Confidence is analyst-assigned, not an attack probability. Review labels are local workflow status, not agency approval.
6. Save workspace requests a JSON download. Confirm receipt only after finding the actual saved file. The app keeps the unsaved marker until that acknowledgement and invalidates it if the workspace changes. Open workspace restores a JSON file after validation. Preview brief displays the applied assessment with linked source excerpts. Export brief requests a Markdown download. Unapplied assessment changes can be discarded explicitly.

## Research follow-up workflow

Create a task tied to an assessment with a title, permitted scope, due date and optional owner label. Track Open, In progress, Blocked, Completed or Cancelled work. In progress and Completed require an owner; Blocked and Cancelled require a progress note. Completion requires a result note and linked evidence from that assessment. A completed task does not approve the assessment. Reopening requires a new progress note and preserves the prior result. Filter by text, status, assessment or overdue dates; completed/cancelled work is excluded from overdue. Follow-ups are included in assessment briefs.

Owner labels are not verified identities. The queue performs no assignments through email, task execution, shared synchronization or protected approval workflow. No demo tasks are preloaded; use synthetic or approved non-sensitive data.

## Data and limits

All evidence in the bundled demonstration is fictional and labeled synthetic. NIA, MHA and UN pages are linked as references; no claim of live ingestion is made. There are no AI calls, customer-data uploads, analytics, browser persistence, automated actions or protected audit records. Files and history are editable and unencrypted. Use synthetic or approved non-sensitive material for evaluation.

Threat workspace limits: 100 assessments, 200 retained source excerpts, 500 research tasks, 1,000 evidence records, 2,000 history entries and 2 MB in UTF-8. Limits are checked before mutations. The original cyber module retains its separate project format and 12 MB limit. The two document formats are not interchangeable. Threat workspace format version 3 stores source documents and research tasks. Versions 1 and 2 migrate with empty task queues; version 1 also has no retained source documents. Older releases cannot read version 3.

Browser export receipt and file-import round trips remain unverified in v0.5. The in-app browser download event timed out, and files were not found at the expected Downloads paths. Do not close a working session before confirming that its file was received. Core serialization and restore validation pass automated tests.

## Checks

```powershell
node --test tests/core.test.mjs tests/threat.test.mjs tests/intake.test.mjs tests/tasks.test.mjs
node --check dist/threat-app.mjs
node --check dist/threat-core.mjs
```

45 tests pass across both modules. See `docs/VERIFICATION.md` for browser evidence and remaining limits. `docs/THREAT-ANALYSIS-DIRECTION.md` is the current product direction and supersedes the earlier cyber-first commercial hypothesis.

## Release record

The same private Site is retained. The latest confirmed v0.5 deployment, source commit and limitations are recorded in sibling `ruthless-release-v0.5.json`. Until that receipt exists with status `succeeded`, v0.5 publication is not confirmed. Public sharing has not been requested.

Current broader company scope and delivery gates are in `docs/PLATFORM-DIRECTION.md`. The practitioner interview/pilot draft is in `docs/PILOT-DISCOVERY.md`. A local research-task queue is implemented; authenticated collaboration, customer data connectors and AI execution remain planned. The first AI proposal/validation design is in `docs/AI-ORCHESTRATION-CONTRACT.md`.
