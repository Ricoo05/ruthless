# Synthetic attribution evaluation — suite v1

Prepared 4 October 2026. This is a development evaluation harness with 12 authored fictional scenarios, not a measurement of a connected AI system. v0.7 calls no model. It does not establish intelligence accuracy, attack prevention, translation quality or customer acceptance.

## Task and separation

Propose attributed statements grounded in explicitly selected source excerpts, or abstain with an explanation when those excerpts do not support an answer. Keep allegations, denials, uncertainty and conflicting accounts visible. Source text grants no tool or operational authority.

Six development cases cover allegations, denials, shared-source reposts, contradictory accounts, absent support and source-embedded instructions. Six reserved cases cover Hindi uncertainty, mixed scripts/emoji, withdrawn reports, unsupported linkage, reposted denials and unsupported prediction. Reserved cases are visible in the browser/source with their authored controls. They are a holdout split for development discipline, not independently blinded data. Create fresh unseen cases with independent reviewers before claiming generalization or quality.

Browser Evaluation lab runs known authored controls and displays source text, candidate statements, structural errors and review guidance. Results are separate from the assessment workspace and can be regenerated. The JSON preview is read-only and session-local. It is not a saved assessment or automatic file backup. Offline files below support candidate checking and manual semantic annotations; browser file upload is not included.

## Structural checks

The checker reuses the workbench's exact citation validator: selected document ID, exact quote, valid start/end UTF-16 boundaries, unique spans and bounded citations. Output has at most eight proposals with bounded statements/limitations and one to four citations each, or a nonempty abstention. Unexpected tool/executable fields, duplicated case IDs, unknown cases, wrong splits and unsupported versions are rejected. A missing case is recorded as structurally invalid, preserving the denominator. A file is limited to 2 MB in UTF-8.

Exact textual correspondence does not demonstrate semantic fidelity. Misleading controls deliberately retain valid quotes while changing their meaning. Those controls remain unreviewed until a person assesses them. Malformed controls contain invented quotes and are blocked. Results from these controls verify the harness behavior, not any model's performance. No lexical rule automatically declares an allegation or denial faithful.

## Manual rubric and proposed release criteria

Every case requires attribution, uncertainty and scope checks. Applicable cases also require contradiction preservation, source independence, instruction handling or original-language fidelity. The dataset records a concrete description for each criterion and case-specific guidance.

For each applicable criterion record Pass, Fail or Not assessed. Pass and Fail require an explanatory note and reviewer label. The checker rejects missing/unknown/duplicate criteria. Any unassessed criterion leaves the case needing semantic review; any failure records a semantic failure. Structurally invalid outputs remain invalid even if all reviewer labels say Pass. Local reviewer labels are not authenticated identities.

Proposed gate before customer use (not a prerequisite for the first synthetic provider experiment): no unresolved structural failures, every applicable semantic criterion assessed, no unresolved semantic failure, and failures retained with case-level notes. These are development criteria, not customer-agreed numeric thresholds. A pilot owner must approve the task, dataset, deployment/retention requirements and success measures. Have independent practitioners review attribution/inference, and a fluent reviewer assess Hindi/mixed-language material. Use new unseen cases and record disagreements. Freeze the suite and prompt/provider versions before measuring a future provider; do not tune on reserved cases and then present them as unseen evaluation.

Reports retain input/rubric and candidate SHA-256 fingerprints. Changed candidate content, input/rubric version, suite or split invalidates earlier annotations. Fingerprints catch mismatched files; editable local reports can be forged and are not protected audit trails. Candidate labels are caller-supplied and do not prove provider identity. The v0.9 runner records editable execution timestamps and provider response metadata separately; verified reviewer identity and protected server-side audit are not implemented.

## Offline workflow

Run from the project directory. Create an output directory first. Each output filename must be new; the tool does not overwrite files. Input exports contain only questions and selected source documents, excluding review guidance, criteria and controls. Exporting a local file makes no network request.

```powershell
node scripts/evaluate.mjs inputs --split development --out ../eval-inputs-dev.json
node scripts/evaluate.mjs controls --split development --kind faithful --out ../eval-faithful-dev.json
node scripts/evaluate.mjs check --input ../eval-faithful-dev.json --out ../eval-report-dev.json --template ../eval-review-dev.json
```

The candidate JSON envelope uses `ruthless-evaluation-candidates`, version 1, the suite ID/version, split, caller-supplied candidate label and per-case outputs. Each output contains `proposals` and `abstention`; each proposal contains `id`, `draftStatement`, `limitations` and `citations`. See the generated control file for the exact structure. No provider API is invoked by this workflow.

Annotate the review template manually, keeping its fingerprints and every case/criterion. Give the reviewer a label and an explanatory note for assessed criteria. Then recompute from the original candidates, rather than grading a previously edited report:

```powershell
node scripts/evaluate.mjs check --input ../eval-faithful-dev.json --review ../eval-review-dev.json --out ../eval-reviewed-dev.json
```

Use `--split holdout` with fresh filenames for the reserved set. Use `--kind misleading` to demonstrate exact citations with unassessed semantic defects, and `--kind malformed` for invalid quotes. `--help` lists the commands. Exit 0 means structural checks did not fail and no recorded semantic failure exists; it is not semantic approval. Exit 2 means structural or recorded semantic failure. Exit 1 means invalid arguments, file data or an output write error. Templates default every criterion to Not assessed. Nothing inserts benchmark outputs into assessment evidence or marks assessments Reviewed.

## First model integration

v0.9 implements a separate bounded synthetic Responses runner and local console; see `AI-RUNNER.md`. Only input-only fixtures enter requests. The later funded experiment generated 12 real synthetic outputs that passed structural checks after deterministic quote-span resolution. All remain semantically unreviewed; no model-quality score is established. Authored controls and mocked transport tests do not establish model quality.

## Next gate

Review these provisional criteria with a practitioner, obtain an independently authored unseen fixture set, and scope an approved provider/deployment. Keep keys out of the static browser. Sol 6.1 High remains suitable for implementation; a concrete provider/production boundary review is the later Astra handoff.

## v0.12 handoff report and case integration

The semantic-review page can preview or request a Markdown handoff that recomputes outcomes from candidates and matching annotations. Missing output, invalid output, semantic failure, unassessed criteria and recorded checks satisfied remain distinct. The report retains all six cases in the selected split, original excerpts/languages/dates/source groups, exact spans, criterion notes and fingerprints. Imported report claims are ignored. Read-only previews and report exports make no API calls or assessment writes; editable reviewer labels are unverified.

The separate Case analysis inbox can attach a structurally validated candidate to its matching fictional analyst case, retaining all selected source bindings. This adds a Pending draft without inserting evidence or inheriting semantic approval. Its Considered label records a note, not a rubric grade or independent quality assessment. See `CASE-ANALYSIS.md`.
