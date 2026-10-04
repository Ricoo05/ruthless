# First AI assistance contract — design draft

Prepared 4 October 2026. This is a proposed development contract, not an implemented AI capability. v0.5 makes no model calls, stores no provider keys and runs no background agent.

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

Record provider, model, prompt version, submitted source IDs, start/end time, validation outcome and review outcome. This proposed run ledger will be editable in a local prototype; protected audit and authenticated reviewer identity require production architecture. Do not call an editable ledger an accredited audit trail.

## Evaluation fixtures and release gate

Start with distinct synthetic fixtures for an attributed allegation, a denial, a repost sharing its underlying source, contradictory accounts, no supported answer, source-embedded instructions, Hindi text, mixed scripts and an astral Unicode character. Include invalid citations, oversized output, fabricated identifiers and stale results.

Test deterministic structural rejection separately from semantic fidelity. Have a reviewer judge attribution, uncertainty, translation and unsupported inference on a held-out set. Define task-specific quality criteria before testing; no numeric accuracy or improvement claim has been established. Keep examples and failures, not only aggregate scores.

Sol 6.1 High remains suitable for the validator, fixtures and proposal-review implementation. A concrete production/provider trust-boundary review is a later Astra High handoff. No paid provider integration or broader agent permissions should be introduced merely to demonstrate orchestration.
