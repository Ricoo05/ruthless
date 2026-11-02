# Project Ruthless — Intelligence Workbench v0.30

## Persistent official warning review

Source collection (`/#collection`) now includes a real, persistent official India terrorism-advisory review pipeline. The local research server preserves original source responses and versions in a separate public-data SQLite journal, detects changes to the terrorism passage, supports first-observation replay, source-linked review and existing document intake, and provides opt-in hourly collection with persistent cooldowns. First or unchanged guidance remains context. The hosted edition can explicitly inspect a dated genuine capture; it has no journal worker.

Run `node scripts/serve-research.mjs`, open http://127.0.0.1:4181/#collection, and choose **Connect local journal**. No API key or paid inference is required. See the [engineering report and actual evaluation limits](docs/ENGINEERING-MILESTONE-v0.30.md) and [verified source/access review](docs/INTELLIGENCE-SOURCE-REVIEW.md). No attack-prediction performance or untouched real historical benchmark has been established.

## Command center, global collection and media review

The default `/#watch` view now collects five bounded real public sources and displays source coverage, retained records, actual request activity and source-linked intake. The interface uses a shared obsidian/silver design system with responsive navigation, Ctrl/Cmd+K workspace search and the approved engraved RUTHLESS emblem. Existing analysis and backend workflows are preserved.

`/#media` adds real NASA archive image/video discovery, playback and selected-frame review. Run `node scripts/serve-research.mjs --enable-media-ai` for the explicitly authorized local selected-media API experiment at http://127.0.0.1:4181/. The static hosted edition has no paid AI endpoint. See [v0.29 functionality, verification and limitations](docs/COMMAND-CENTER-v0.29.md).

Ruthless is being developed as terrorism intelligence analysis software for government and government-agency customers, covering domestic, cross-border and international developments relevant to India, with broader geographic support. The intended platform spans threat analysis, intelligence gathering, data integration, operations workflows and AI orchestration. The current release adds persistent official advisory change review while preserving existing public-source, media and analyst workflows. Explicit fictional exercises and cited synthetic AI drafts remain available as research demonstrations. Prevention effectiveness and customer demand have not been validated.

## Real public-source OSINT (v0.28)

The retained /#osint view opens Public-source OSINT. New sessions contain an empty research case, without fictional reports. Fetch real public data queries configured public APIs directly from the browser. GOV.UK supplies current advisory sections for six countries; GDELT supplies up to 20 news-index links for fixed incident-research topics. During verification, GOV.UK succeeded and GDELT was unavailable; unavailable sources show an error without fabricated fallback data.

Cancellation, per-provider request spacing, source/update timestamps, exact-passage intake and JSON/CSV/HTML exports are implemented. The browser declined the download test; export serializers passed automated checks. No background collector, social-profile aggregation or new AI provider is connected. See docs/PUBLIC-OSINT.md.

## Run

Requires Node.js 24 or later, without dependency installation or an API key.

```powershell
node serve.mjs
```

Open http://127.0.0.1:4173/. The local server binds to loopback. The retained cyber exposure module is at `/exposure.html`; its instructions are in `docs/CYBER-EXPOSURE.md`.

## Main detection pipeline

Select **Detection console** or open `/#detection`. Retained original reports are processed automatically through English/Hindi security-signal rules, exact clause extraction, limited negation/context handling, identical-text suppression, recorded-source grouping and rolling warning thresholds. Existing case assignments provide geographic context. Watch, Warning candidate and Contested warning candidate show the underlying reports and change over an as-of timeline. Prepare warning verification task uses the existing task queue with current source references. No report is automatically accepted as evidence or treated as confirmed terrorist intent.

Select **Run suicide-bombing warning exercise**, then **Jump to first warning** or **Play report arrival**. Five fictional intelligence reports produce a warning candidate on 3 October, a contested state on 4 October and a changed state after a clarification on 5 October. The 3D animation uses the detector's current report markers and warning state, rather than a separately scripted attack animation. At the final day, Reveal authored outcomes checks the warning against a separately authored attempted bombing on 7 October: four days of fictional lead time. It does not identify a bomber, calculate an attack probability, animate execution or demonstrate prevention. The isolated exercise leaves the workspace unchanged. See `docs/EXPLOSIVE-WARNING-EXERCISE.md`.

**Open broader incident replay** retains the aerial case, object false alarm, missed incident and routine controls. Its first-warning result remains one timely warning, one false warning, one miss and one uneventful control; authored precision/recall are both 50%, not independent accuracy estimates. The same 3D component shows the aerial case's report state. This is a working deterministic warning engine, not a trained terrorism predictor.

v0.27 improves scoped English/Hindi assertion checks and prevents a same-group repost from renewing an old signal category. **Run detector challenge checks** compares current extraction with retained v0.26 outputs on 24 visible authored passages: 24/24 versus 13/24 matching their authored labels. The rules were changed after inspecting these cases; those counts are development checks, not independent model performance. Old-claim exclusions retain the original text and source reference. Correctly linked current corrections can carry new information.

Ingest permitted source capture connects to the existing advisory review/intake path. Newly recorded older publications remain inspectable as context and cannot escalate a current warning; advisory titles and conditional guidance also stay context under these limited rules. Collection runs locally; the hosted console can analyze retained or manually staged reports. No new social/CCTV feed, paid API inference or background worker was added. See `docs/DETECTION-PIPELINE.md` for rule behavior and remaining validation.

## Report linkage evaluation

Open **Open linkage evaluation** from the release entry. Compare TF-IDF and BM25, then **Load saved multilingual run** to include actual local inference from a pinned pretrained MiniLM encoder on all 64 fictional texts. On the eight evaluation examples, MiniLM ranks the related report first in 4/8 versus 2/8 for each lexical method. Four first results remain unrelated; no method is promoted into the workbench. Returning all three candidates gives MiniLM 100% recall@3 on this tiny set, so that metric alone does not establish useful accuracy.

Expand an original candidate and **Review event context**. Quote event place/time from both sources and retain a manual proposal with a reviewer label and uncertainty note. Exact quotation checks reject fabricated passages; interpretation remains a reviewer judgment. Proposals are session-only and do not merge reports, approve evidence or generate alerts. Both partitions and labels are visible authored controls, not independent validation. See `docs/SEMANTIC-LINKAGE.md` for reproduction, measured failures and the context-review contract; `docs/LINKAGE-EVALUATION.md` records the lexical baseline. No paid API call or live-source inference is added. Running the optional local model experiment requires its separate dependency installation; viewing retained results requires neither those dependencies nor an API key.

v0.22 adds **MiniLM + quoted-context ordering**. Unique date or same-script fictional-place mismatches move candidates later without removing reports or changing cosine scores. It ranks the Related report first in 7/8 examples in each partition; the English–Hindi examples remain incorrect first results. These rules were designed after inspecting the authored failures and require separate validation. The review dialog displays extracted mentions and **Use extracted quotations** prepares their exact source spans, leaving reviewed relationships Unknown and the proposed conclusion Insufficient context. See `docs/CONTEXT-ORDERING.md` for the supported formats, ambiguous/correction cases and unchanged review workload.

## Early-warning review

v0.23 adds **Early-warning review** to the main workbench and release entry. It automatically reviews every retained current report for unfinished intake, challenging evidence, repeated source groups and uncertain date mentions without requiring a keyword query. Expand each case’s as-of timeline to inspect original text and exact date quotations. **Prepare context verification task** opens the existing task form with current source references and review reasons; explicitly creating it adds follow-up work without changing evidence or judgments.

Try the acknowledged fictional regional exercise from this desk to see domestic and international context together. Publication and recorded dates control availability; later corrections do not rewrite earlier as-of views. Group labels and stances remain analyst-supplied. The desk refreshes on opening/applying settings and has no background collector, terrorism classifier, semantic event merger or validated attack forecasts. See `docs/EARLY-WARNING-REVIEW.md` for rules, bounds and the next evaluation requirement.

v0.24 connects **Related-report leads** directly into Early-warning review. The existing TF-IDF baseline runs automatically for the applied window. Each pair retains original source passages, shared weighted terms and its unchanged similarity score, alongside date-mention comparison, same-group context, cross-case context and opposing analyst-assigned stances. Filter these lead types and prepare a two-record verification task. Date mismatches and denials remain visible; no reports are merged or classified as terrorist intent. See `docs/WARNING-CONNECTIONS.md` for current coverage, limits and measured evaluation gaps.

v0.25 adds **Review event context** to those leads. Retain exact quotations from both originals, a reviewer label, reasoning and a proposed conclusion. These reviews now survive workspace JSON recovery and synthetic local backend storage. Corrections mark an earlier review **Stale source snapshot** while preserving its quotations; Known by withholds reviews recorded later. Closing the form preserves entered work for **Resume context review**; retain or explicitly clear the draft before changing sources, views, saving or exporting. The linkage evaluation lab retains its separate session-only proposals. See `docs/RETAINED-LINK-REVIEWS.md` for validation, recovery and limits.

## Report connections

Choose **Open report connections** on the release entry, select dates and geographic scope, then **Compare related reports**. A local TF-IDF cosine baseline suggests pairs for inspecting original passages, shared wording and recorded source groups across cases. Literal query terms are not required and do not affect comparison. After loading the acknowledged fictional regional exercise, the default window compares eight records and suggests six pairs. Boilerplate can rank unrelated reports highly; this is retrieval for analyst review, not a threat score. **Prepare linkage verification task** fills the research-task form with both source IDs; create it explicitly after reviewing the scope. Evidence and judgments are unchanged. See `docs/REPORT-CONNECTIONS.md` for the algorithm, bounds and known limitations.

## Forecasting research and 3D replay

The release entry now links to `/forecast.html` and `/scenario.html`. In Forecast research, **Train & test baseline** fits a regularized logistic model to 160 earlier authored records, leaves a time gap, then scores 79 later records. Inspect false alarms, missed incidents, abstentions, probability errors and reliability bins against a training base-rate baseline. This is executable statistical forecasting research on fictional data, not validated attack prediction. No provider call is made. See `docs/FORECAST-RESEARCH.md` for algorithms, results and primary research references.

In 3D Scenario replay, choose a fictional aerial-object alert or unverified explosive-threat report, use the timeline/playback/orbit controls, and compare authored benign or unresolved continuations. XYZ geometry is rendered with perspective projection. Reports become available over the timeline; assumptions and possible site disruption stay labeled. Prepare analyst workspace JSON stages only currently available fictional reports for manual workbench recovery, adding no scenario evidence or reviewed assessment. This module is a separate authored illustration; it does not animate the forecasting model's output. See `docs/SCENARIO-REPLAY.md`.

## Threat analysis workflow

1. Open a synthetic case or create an assessment with a geographic scope and intelligence question.
2. Stage a source excerpt in Document intake with language, location, access conditions and provenance; review its attribution and retain permission details before incorporating an analyst statement. Direct manual evidence entry is also available. Add dated evidence records with publisher, source URL, underlying source group and a concise attributed statement. Records can support, challenge or provide context for the assessment. Real public references require HTTPS URLs; the app does not fetch or verify them.
3. Compare the timeline and contradictions. Reposts sharing a source group count as one supporting group; even distinct group labels do not prove independence.
4. Record the judgment, information gaps, confidence, citations and review note. Reviewed assessments require all these fields and explicit consideration of conflicting evidence. A reviewed conclusion cannot cite a report published after its as-of date.
5. Adding evidence reopens a Reviewed assessment. Confidence is analyst-assigned, not an attack probability. Review labels are local workflow status, not agency approval.
6. Save workspace requests a JSON download. Confirm receipt only after finding the actual saved file. The app keeps the unsaved marker until that acknowledgement and invalidates it if the workspace changes. Open workspace restores a JSON file after validation. Preview workspace JSON provides the complete applied session for manual copying; Paste workspace JSON validates it before restoration and requires acknowledgement before replacing unsaved work. Browser recovery by pasted JSON is verified. Preview brief displays the applied assessment with linked source excerpts and judgment starting-point lineage. Export brief requests a Markdown download. Unapplied assessment changes can be discarded explicitly.

## Indicator triage and regional uncertainty exercise

Open **Indicator triage** and **Load fictional regional exercise**. Acknowledge its authored controls to add two fictional geographic cases and four staged excerpts without replacing existing work. Query `threat` with a known-by date of 2026-10-05 or later. Inspect the unverified warning, same-source repost, benign negation and overseas repost. Three regional reports represent two recorded source groups, not three independent confirmations. The overseas repost identifies shared reporting, not an actor link.

Queries match up to eight literal terms, with any/every-term rules, date and geographic filters and a recorded source-group threshold for analyst review. Corrections known by the selected date supersede earlier excerpts. Results show exact spans and source context. A benign or negated statement can match; a missing match is not proof of safety. Prepare verification task opens the existing task form with case, query and permitted source-verification scope; explicitly create it after review. Nothing becomes assessment evidence or an approval automatically. Rules/results are session-only; the fictional cases, staged sources and created tasks follow normal workspace save/recovery. See `docs/INDICATOR-TRIAGE.md`.

## Integrated case analysis

Open **Case analysis**, select a fictional question, inspect its reports and **Create case with selected reports**. Use **Load saved AI draft (no API cost)** to attach the corresponding output retained from the earlier real API experiment. Its citations are checked again; it stays Pending. **Try authored example** is separately labeled and calls no AI. You may also paste a matching candidate JSON file or generate one explicitly approved request on a configured local runner.

Questions, selected original reports and cited drafts now live in the same case. Open assessment returns to its judgment/evidence desk; Inspect cited drafts returns to its inbox. Considered/Rejected require a note and do not change evidence or approve a judgment. Changed case inputs or source corrections make earlier drafts stale and block their consideration. Workspace files and briefs retain these drafts separately from analyst evidence. After manually incorporating every cited report, Prepare assessment from this draft previews a considered current draft as a starting point. Use as unapplied assessment fills the judgment, gaps and source-linked citations, starts at Needs review / Insufficient confidence, and clears the review note. Existing content requires replacement acknowledgement. Edit and Apply assessment yourself; Discard restores the last applied judgment. The workspace and brief retain the originating draft IDs. See `docs/CASE-ANALYSIS.md` for boundaries and version migration.

## Source integration and correction workflow

Document intake now stages a built-in synthetic batch containing an original, shared-source repost and linked correction, after source-conditions acknowledgement. Repeating an unchanged batch skips its records. The offline JSON adapter validates all rows atomically and writes a new workspace without fetching sources or adding evidence. Manual corrections retain prior excerpts/evidence, reopen Reviewed assessments and require revision consideration before re-review. Superseded sources cannot be used for new incorporation or fixture proposals. See `docs/SOURCE-INTEGRATION.md` for the schema and CLI.

## Local public-advisory collection

Run `node scripts/collect-advisory.mjs --collect` locally to retrieve three sections of the official GOV.UK India travel advisory into ignored `.collection-runtime/`. Start `node scripts/serve-collection.mjs`, open `http://127.0.0.1:4175/`, choose **Source collection** and **Load local captures**, and inspect scope, source dates, failures and freshness. The UI validates selected hashes and extracts plain text safely. Choose an assessment and exact passage, record source conditions, and explicitly stage it in Document intake. Repeated passages skip; corrections require an earlier excerpt and explanation. Evidence incorporation remains a separate review. The hosted Site provides this review UI, while collection runs locally. See `docs/COLLECTION-REVIEW.md` and `docs/COLLECTION-ARCHITECTURE.md`.

Loaded collection reports and unapplied selections are session-only. Staged passages, capture identity, content hash and source conditions follow workspace JSON save/recovery. These real public excerpts cannot enter the existing synthetic-only backend or AI runner. No source truth, complete coverage or detection effectiveness is established by a successful fetch.

## Research follow-up workflow

Create a task tied to an assessment with a title, permitted scope, due date and optional owner label. Track Open, In progress, Blocked, Completed or Cancelled work. In progress and Completed require an owner; Blocked and Cancelled require a progress note. Completion requires a result note and linked evidence from that assessment. A completed task does not approve the assessment. Reopening requires a new progress note and preserves the prior result. Filter by text, status, assessment or overdue dates; completed/cancelled work is excluded from overdue. Follow-ups are included in assessment briefs.

Owner labels are not verified identities. The queue performs no assignments through email, task execution, shared synchronization or protected approval workflow. No demo tasks are preloaded; use synthetic or approved non-sensitive data.

## Proposal review workflow

Stage an unincorporated synthetic source excerpt, open Proposal review and create a training proposal. The local deterministic fixture quotes the start of the excerpt with publisher attribution; no AI is called. Inspect the exact quoted span, source conditions and limitations. Accept the exact draft with a review note, source acknowledgement and claim/relation labels, or reject it with a reason. Acceptance retains run/proposal lineage and reopens a Reviewed assessment. Pending/rejected proposals add no evidence. Changed assessments or sources block stale acceptance; reject the obsolete draft before generating a new one. Drafts needing correction can be rejected and replaced by manual analyst incorporation.

This validates the review plumbing. It does not establish model quality, source truth or prompt-injection resistance of a model. Imported ledger entries and reviewer notes are editable and unverified. See `docs/AI-ORCHESTRATION-CONTRACT.md` for implemented limits and the future provider boundary.

## Synthetic evaluation workflow

Evaluation lab runs 12 authored fictional cases across development and reserved sets. Choose faithful examples, misleading statements with exact citations, or invalid source quotes. Structural checks reject invented quotes while keeping semantic judgment unassessed; valid citations alone never approve a statement. Read-only report previews remain separate from the assessment workspace. The reserved set and controls are visible and are not independently blinded. No AI model is called or measured.

The offline checker exports input-only fixtures, validates candidate files and creates manual rubric templates. Annotations bind to SHA-256 fingerprints of the suite inputs/rubric and candidate outputs; changed content invalidates earlier notes. Every applicable criterion must be assessed with an explanatory note before reviewer checks can be satisfied. Files and reviewer labels remain editable and unverified. See `docs/EVALUATION.md` for commands, schema, exit codes, limitations and proposed pilot criteria.

## First AI integration

Open `/ai.html` to inspect the 12 fictional questions and their selected excerpts. Preview excludes authored answers and review guidance. The optional loopback service sends one selected fixture to OpenAI Responses, then validates exact source citations or an explained abstention. The original console remains separate. Case analysis now attaches validated drafts to a corresponding fictional analyst case; semantic review is still required. The hosted private Site provides inspection only; API execution requires the configured local runner.

v0.9 passed mocked-provider integration tests and desktop/mobile console checks. A subsequent live experiment configured an approved local key and tested gpt-5.4-mini-2026-03-17 against all 12 fictional cases. The original model-calculated offset failure was retained; quote-only output with deterministic unique-match span resolution passed all 12 structural checks. Semantic quality still requires independent review. The private hosted console remains inspection-only; live API execution uses the local runner. See `docs/AI-RUNNER.md` for the executable workflow.

## Synthetic semantic review

Open `/review.html` from the AI console. Paste candidates, a version 2 execution result, or a version 1 resumable review session. An optional input accepts an older separate review alongside its matching candidates. Citation checks and input/output fingerprints are recomputed; stale or mismatched reviews reject without changing the active session. Import fields collapse after a successful load, leaving review context visible. Compare each draft or abstention with the original excerpts, dates, source groups and authored guidance. Record Pass, Fail or Not assessed for each applicable criterion; assessed criteria require a reviewer label and explanatory note. The label stays fixed once a decision is recorded. Unapplied edits block case navigation, replacement and exports until recorded or discarded.

Export resumable session requests one JSON record containing candidates and recorded review notes. Reopen it by pasting its JSON into the same screen. Preview session provides a read-only JSON alternative. The separate recorded-review export retains the existing offline format for `scripts/evaluate.mjs`; a resumable bundle is not a candidate file for that CLI. The page makes no network/API calls and writes no assessment evidence. Closing/reloading loses unexported records. The Export button requests a download; receipt is unverified. Real outputs remain semantically unreviewed until a qualified independent reviewer assesses them. This screen does not authenticate reviewers or establish model quality.

The review handoff preview recomputes missing, invalid, failed, unassessed and recorded-checks-satisfied cases from the original candidates and annotations. Every selected-suite case remains in the total. Its Markdown export retains notes, original source context, exact citations and fingerprints; export requests do not confirm file receipt. The report writes no case evidence or review decisions.

## Data and limits

All evidence in the bundled demonstration is fictional and labeled synthetic. NIA, MHA and UN pages are linked as references; no claim of live ingestion is made. The Case analysis view can request one explicitly approved call through a configured local runner using only bundled fictional inputs. The separate synthetic-only AI console and CLI can call an explicitly configured local provider; default and hosted static modes make no calls. There are no customer-data uploads, analytics, browser persistence or automated operations. Exported JSON and client history remain editable and unencrypted. The optional configured local backend encrypts payloads and records server save receipts with the limitations described below. Use synthetic or approved non-sensitive material for evaluation.

Threat workspace limits: 100 assessments, 200 retained source excerpts, 500 research tasks, 1,000 evidence records, 40 proposal runs, 40 case-linked analytical drafts (8 proposals/run, 4 citations/proposal), 40 retained context reviews, 2,000 history entries and 2 MB in UTF-8. Limits are checked before mutations. The original cyber module retains its separate project format and 12 MB limit. The two document formats are not interchangeable. Threat workspace format version 8 adds retained source-quoted context reviews; versions 1–7 migrate with an empty context-review ledger. Version 7 added judgment starting-point lineage to the version 6 case-linked analytical drafts, sources, tasks, proposal runs, linked corrections and up to 40 import batches (50 rows per batch). Versions 1–5 migrate with an empty analysis inbox; versions 1–4 migrate without invented revision/import metadata; v4 proposal history is retained. Versions 1–3 migrate with empty proposal queues; versions 1–2 also have no tasks, and version 1 has no retained documents. Versions 1–6 restore without invented judgment lineage. Older releases cannot read version 8.

Browser export receipt and file-import round trips remain unverified in v0.9. The in-app browser download event previously timed out, and files were not found at the expected Downloads paths. Do not close a working session before confirming that its file was received. Core serialization and restore validation pass automated tests.

## Checks

```powershell
npm test
npm run check
npm run backend:demo
```

230 tests pass across the application and local collection modules, including the existing CLI tests. See `docs/VERIFICATION.md` for browser evidence and remaining limits. `docs/THREAT-ANALYSIS-DIRECTION.md` is the current product direction and supersedes the earlier cyber-first commercial hypothesis.

## Release record

The same owner-private Site is retained. v0.17 adds a read-only same-origin local capture connection and a visible release panel with direct workflow entries. The hosted edition remains static; live collection is local. v0.16 added safe capture inspection and exact-passage intake. v0.15 adds literal indicator triage, a clearly fictional regional uncertainty exercise and source-linked verification tasks. It retains v0.14 local backend loading, creation and revision-conflict recovery. It retains the earlier AI draft, judgment and manual JSON workflows. Publication is confirmed only when the Sites deployment status is succeeded for the exact pushed commit. Public sharing has not been requested.

Current broader company scope and delivery gates are in `docs/PLATFORM-DIRECTION.md`. The practitioner interview/pilot draft is in `docs/PILOT-DISCOVERY.md`. Local research tasks and synthetic fixture proposals are implemented; authenticated collaboration and customer data connectors remain planned; the bounded synthetic API runner has completed fictional model calls; independent semantic review remains outstanding. The first AI proposal/validation design is in `docs/AI-ORCHESTRATION-CONTRACT.md`.


## Local backend foundation

The separate backend now implements server-controlled local credentials and workspace permissions, encrypted SQLite versions, mandatory revision preconditions, and atomic server save receipts. Run `node scripts/backend-demo.mjs` to exercise unauthenticated denial, a successful save, stale-write rejection and exact recovery after the database/server reopens. The demonstration uses fictional data and temporary in-memory credentials; it makes no paid calls and retains no user work.

The v0.14 browser can connect when served by the configured loopback backend (`npm run backend:start`). It keeps the local credential only in memory, validates a stored version before explicit loading, and saves against that confirmed revision. Conflict or unconfirmed outcomes block another save without losing local edits. Workspace selection and manual restoration detach the old server binding. Reader access cannot save. The hosted Site remains static: no cloud backend is deployed, and connection is unavailable there. The local credential adapter does not authenticate real organizational identities. Imported Reviewed labels remain client assertions; the audit chain cannot detect complete database rollback without an external anchor. See `docs/BACKEND.md` for the executable server configuration, implemented boundaries and next integration slice.


The local review API now records a separate configured-reviewer decision against an exact saved assessment/workspace revision. Contributors cannot review their own workspace. Notes are encrypted and receipts are server-selected. A later save makes previous decisions stale. Run `node scripts/review-demo.mjs` for the executable fictional demonstration. This command is not yet exposed in the browser; real identity-provider integration and agency approval remain unimplemented.
