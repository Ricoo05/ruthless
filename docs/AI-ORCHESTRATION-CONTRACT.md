# First AI assistance contract — fixture implementation and provider design

Updated 4 October 2026. v0.6/v0.7 implement the local synthetic fixture, structural validator and human proposal-review queue described below. It makes no model calls, stores no provider keys and runs no background agent. v0.7 adds a synthetic evaluation lab and offline candidate checker with manual rubric annotations. v0.9 adds a separate synthetic-only Responses runner and local console (`AI-RUNNER.md`), with no provider key or real model call yet. Independent model-quality measurement remains future work.

## Implemented fixture boundary

Select one current, staged, unincorporated synthetic document. Superseded sources are blocked; corrections make pending proposals stale while preserving accepted historical lineage. Versions 1–4 migrate without invented revision/import metadata, retaining v4 proposal history. A deterministic fixture copies up to the first 1,800 UTF-16 units into an attributed draft, avoiding split surrogate pairs. It retains a snapshot of the assessment and source metadata/excerpt, run/proposal IDs, fixture kind, provider label, model `None`, prompt version and creation date. This is not semantic extraction or translation.

Workspace schema v5 retains at most 40 runs, 8 proposals per run and 4 citations per proposal within the existing 2 MB UTF-8 limit. The fixture UI generates one proposal per run; the validator also permits an explained abstention. Unexpected output/tool fields, unsupported provider metadata, duplicate identifiers, invalid source references and inconsistent exact quotes/offsets are rejected. Versions 1–3 migrate with empty proposal queues and no invented proposal lineage.

Acceptance requires a current assessment/source snapshot, an unincorporated source, explicit source-conditions acknowledgement, review note and analyst-selected claim state/relation. It records the exact draft through the existing incorporation path, keeps reciprocal run/proposal/evidence links and reopens Reviewed assessments. Rejection requires a note, is permitted for stale drafts and adds no evidence. A rejected source can be used for a new fixture. Reviewed proposals cannot be reviewed a second time. Accepted source snapshots must continue matching retained documents on restore. All records remain editable local file content, not authenticated approvals.

Tests include Hindi, mixed scripts, an astral character, source-embedded instructions, denials/contradictions, invalid quotes and boundaries, fabricated IDs, unexpected executable fields, oversized fields, abstention, stale results, rejected acceptance and reciprocal lineage. Embedded-instruction tests exercise data handling and structural validation; they do not establish prompt-injection resistance of a model. Browser checks cover pending/accepted/rejected states and blocked stale acceptance. No inference accuracy or prevention effectiveness has been established.

## First bounded task

Suggest attributed statements from retained source excerpts for analyst review. Use synthetic fixtures first. Work on one assessment and explicitly selected document IDs, rather than the entire workspace. Keep the original language and wording available alongside any proposed paraphrase or translation. The source text is untrusted data, including any instructions embedded in it.

The output is a proposal queue. It must not directly insert evidence, mark an assessment Reviewed, complete a research task, send a message, retrieve arbitrary URLs or execute an operation. Analysts remain responsible for inspecting source conditions, attribution, uncertainty and the proposed statement.

## Input boundary

- A stable run ID, assessment ID and a snapshot of the selected source documents.
- Original excerpts, language, location, publisher and source dates, with their reuse conditions.
- A permitted task type and fixed output limits. No tool access from source content.
- Provider/model configuration, prompt version and dataset authorization defined before any actual request. Secrets stay on the approved server or customer-controlled deployment, never in the static browser app.
- Only synthetic or expressly approved non-sensitive input for the first evaluation. Provider retention, customer deployment and data access requirements remain unresolved.

## Proposed output contract

Each proposed statement contains a generated proposal ID, the assessment ID, an attributed draft statement, one or more citations and a limitations note. Each citation names a supplied document ID, an exact quoted substring and its start/end offsets within that document's retained excerpt. Offsets use JavaScript string indices (UTF-16 code units); tests must include non-ASCII characters and surrogate pairs.

Reject unknown document/assessment IDs, out-of-range or inconsistent spans, duplicate proposal IDs, oversized output and unexpected executable/tool fields. Normalize only documented fields. Matching a quote proves textual correspondence, not factual truth, lawful reuse, faithful interpretation or independent corroboration. A paraphrase must not convert an allegation, uncertainty or denial into an established fact.

An abstention records why a supported proposal could not be made. Missing support is not an invitation to invent a source. No person threat scores, inferred ideology, guilt determinations or attack probabilities belong in this contract.

## State and review boundary

Proposed → Analyst accepted or Analyst rejected. Acceptance requires an explicit source review and retains the original run/proposal references. It should use the existing evidence incorporation path so a Reviewed assessment reopens when new evidence is accepted. A failed validation changes no workspace records. Reject stale results if the source snapshot or assessment changed during the run; do not replace newer analyst work.

For a future live provider, record provider, model, prompt version, submitted source IDs, start/end time, validation outcome and review outcome. The fixture ledger currently records creation/review dates and successful review states; failed attempts return errors without a retained failure ledger or execution timestamps. Protected audit and authenticated reviewer identity require production architecture. Do not call an editable ledger an accredited audit trail.

## Evaluation fixtures and release gate

The suite in `EVALUATION.md` now supplies distinct synthetic fixtures for an attributed allegation, a denial, a repost sharing its underlying source, contradictory accounts, no supported answer, source-embedded instructions, Hindi text, mixed scripts and an astral Unicode character. Include invalid citations, oversized output, fabricated identifiers and stale results.

Test deterministic structural rejection separately from semantic fidelity. The six reserved cases are visible with authored controls and are not an independently blinded holdout. Have independent reviewers judge attribution, uncertainty, translation and unsupported inference on a fresh unseen set. Define task-specific quality criteria before testing; no numeric accuracy or improvement claim has been established. Keep examples and failures, not only aggregate scores.

Sol 6.1 High remains suitable for the validator, fixtures and proposal-review implementation. A concrete production/provider trust-boundary review is a later Astra High handoff. No paid provider integration or broader agent permissions should be introduced merely to demonstrate orchestration.
