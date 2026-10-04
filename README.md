# Project Ruthless — Intelligence Workbench v0.7

Ruthless is being developed as terrorism intelligence analysis software for government and government-agency customers, covering domestic, cross-border and international developments relevant to India, with broader geographic support. The intended platform spans threat analysis, intelligence gathering, data integration, operations workflows and AI orchestration. The current release is a manual evidence-analysis, document-intake and research-task and proposal-review and synthetic-evaluation prototype using fictional cases. Prevention effectiveness and customer demand have not been validated.

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

## Proposal review workflow

Stage an unincorporated synthetic source excerpt, open Proposal review and create a training proposal. The local deterministic fixture quotes the start of the excerpt with publisher attribution; no AI is called. Inspect the exact quoted span, source conditions and limitations. Accept the exact draft with a review note, source acknowledgement and claim/relation labels, or reject it with a reason. Acceptance retains run/proposal lineage and reopens a Reviewed assessment. Pending/rejected proposals add no evidence. Changed assessments or sources block stale acceptance; reject the obsolete draft before generating a new one. Drafts needing correction can be rejected and replaced by manual analyst incorporation.

This validates the review plumbing. It does not establish model quality, source truth or prompt-injection resistance of a model. Imported ledger entries and reviewer notes are editable and unverified. See `docs/AI-ORCHESTRATION-CONTRACT.md` for implemented limits and the future provider boundary.

## Synthetic evaluation workflow

Evaluation lab runs 12 authored fictional cases across development and reserved sets. Choose faithful examples, misleading statements with exact citations, or invalid source quotes. Structural checks reject invented quotes while keeping semantic judgment unassessed; valid citations alone never approve a statement. Read-only report previews remain separate from the assessment workspace. The reserved set and controls are visible and are not independently blinded. No AI model is called or measured.

The offline checker exports input-only fixtures, validates candidate files and creates manual rubric templates. Annotations bind to SHA-256 fingerprints of the suite inputs/rubric and candidate outputs; changed content invalidates earlier notes. Every applicable criterion must be assessed with an explanatory note before reviewer checks can be satisfied. Files and reviewer labels remain editable and unverified. See `docs/EVALUATION.md` for commands, schema, exit codes, limitations and proposed pilot criteria.

## Data and limits

All evidence in the bundled demonstration is fictional and labeled synthetic. NIA, MHA and UN pages are linked as references; no claim of live ingestion is made. There are no AI calls, customer-data uploads, analytics, browser persistence, automated actions or protected audit records. Files and history are editable and unencrypted. Use synthetic or approved non-sensitive material for evaluation.

Threat workspace limits: 100 assessments, 200 retained source excerpts, 500 research tasks, 1,000 evidence records, 40 proposal runs (8 proposals/run, 4 citations/proposal), 2,000 history entries and 2 MB in UTF-8. Limits are checked before mutations. The original cyber module retains its separate project format and 12 MB limit. The two document formats are not interchangeable. Threat workspace format version 4 stores sources, tasks and proposal runs. Versions 1–3 migrate with empty proposal queues; versions 1–2 also have no tasks, and version 1 has no retained documents. Older releases cannot read version 4.

Browser export receipt and file-import round trips remain unverified in v0.7. The in-app browser download event previously timed out, and files were not found at the expected Downloads paths. Do not close a working session before confirming that its file was received. Core serialization and restore validation pass automated tests.

## Checks

```powershell
node --test tests/core.test.mjs tests/threat.test.mjs tests/intake.test.mjs tests/tasks.test.mjs tests/proposals.test.mjs tests/evaluation.test.mjs
node --check dist/threat-app.mjs
node --check dist/threat-core.mjs
node --check dist/proposal-core.mjs
```

66 tests pass across both modules. See `docs/VERIFICATION.md` for browser evidence and remaining limits. `docs/THREAT-ANALYSIS-DIRECTION.md` is the current product direction and supersedes the earlier cyber-first commercial hypothesis.

## Release record

The same private Site is retained. The latest confirmed v0.7 deployment, source commit and limitations are recorded in sibling `ruthless-release-v0.7.json`. Until that receipt exists with status `succeeded`, v0.7 publication is not confirmed. Public sharing has not been requested.

Current broader company scope and delivery gates are in `docs/PLATFORM-DIRECTION.md`. The practitioner interview/pilot draft is in `docs/PILOT-DISCOVERY.md`. Local research tasks and synthetic fixture proposals are implemented; authenticated collaboration, customer data connectors and AI execution remain planned. The first AI proposal/validation design is in `docs/AI-ORCHESTRATION-CONTRACT.md`.
