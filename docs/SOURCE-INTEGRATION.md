# Validated source intake and corrections — v0.8

Updated 4 October 2026. The browser offers an authored synthetic batch; an offline Node adapter accepts the documented JSON format. Neither fetches a URL, uploads data, verifies permission or incorporates evidence automatically. Use synthetic or explicitly authorized non-sensitive material.

## Browser workflow

Document intake → Synthetic import shows the original, shared-source repost, correction and recorded conditions before staging. Explicit acknowledgement is required. All three source records are retained; the original is marked Superseded. Repeating the unchanged batch skips all records without adding history or a batch. The demonstration is fixed to its first assessment/date after import so repetition keeps its identity.

Review for incorporation still requires an attributed statement, claim/relation labels, note and source acknowledgement. Only the current source can be incorporated or used to create a fixture proposal. Record source correction creates a new linked record with changed original wording, a revision note and another source-conditions acknowledgement. It preserves publisher, underlying source group, synthetic status, earlier excerpts and evidence. Dates cannot move backwards. A chain cannot branch or cycle.

Staging a correction immediately reopens a Reviewed assessment. Pending proposals from the superseded source become stale. Accepted historical proposal/evidence lineage remains retained. Earlier source-linked evidence is visibly marked and excluded from the supporting-group count, although it remains in the timeline. Task results/status are retained and flagged when linked evidence has a superseded source.

Reviewing a case with affected cited evidence requires explicit revision acknowledgement, a review note and an as-of date covering those revisions. This records analyst consideration, not approval of the source's truth. The generated brief retains source revisions and warnings. A correction awaiting incorporation is not automatically evidence.

## Batch contract

Envelope fields are exactly `format`, `version`, `sourceSystem`, `label`, `permissionNote`, `records`. Format is `ruthless-source-batch`, version is `1`. Each batch contains 1–50 rows and fits within 2 MB UTF-8. `sourceSystem` and external identifiers use 1–60 ASCII letters, digits, underscores or hyphens. Label is nonempty, at most 200 characters; permission note is nonempty, at most 1,500.

Every row requires exactly these fields:

```json
{
  "externalRecordId": "source-001",
  "assessmentId": "training-domestic",
  "title": "Fictional source excerpt",
  "publisher": "Fictional desk",
  "originGroup": "fictional-original",
  "url": "",
  "reportedAt": "2026-10-04",
  "recordedAt": "2026-10-04",
  "language": "English / Hindi",
  "locator": "Paragraph 1",
  "accessNote": "Authored synthetic material for testing.",
  "excerpt": "A fictional report leaves cause and attribution unknown.",
  "synthetic": true,
  "supersedesExternalRecordId": "",
  "revisionNote": ""
}
```

Source fields use the same document bounds as manual intake: title 200, publisher/group 150, language 80, locator 200, access note 1,500, excerpt 4,000 characters. Real sources require HTTPS references without embedded credentials. Recorded date cannot precede publication; staging cannot precede recording. The assessment must already exist. A correction's earlier external ID must exist in the same source system or occur earlier in the batch. Corrections need changed text and a nonempty revision note, at most 2,000 characters. Empty parent/note fields represent an original.

An unchanged `(sourceSystem, externalRecordId)` skips. Changed content under the same ID rejects the entire batch; assign a new external ID linked to the earlier revision instead. Duplicate retained content under a different identity is rejected rather than creating an alias. Unknown fields, including executable instructions and approval claims, reject the batch. A failure on a later row leaves the original workspace unchanged. New rows alone enter the reciprocal batch/document ledger; skipped records retain their previous batch association.

## Offline command

```powershell
node scripts/import-documents.mjs --workspace workspace.json --batch approved-batch.json --out imported-workspace.json --at 2026-10-04 --acknowledge-source-conditions
```

Review every source condition and the batch permission note before using the acknowledgement flag. It asserts that review; it does not establish lawful reuse. Inputs are read locally. The output is a new validated workspace; existing outputs cannot be overwritten. Exit 0 means a file was written, not that sources are verified or statements approved. File/validation failures return exit 1. `--help` displays the contract's command summary. No API key or network is used.

## Compatibility and remaining gates

Workspace v5 stores linked revisions, analyst revision acknowledgements and at most 40 import batches. Versions 1–4 migrate without invented revision or import metadata; v4 proposal history is retained. Versions 1–3 have no proposal runs. Existing source/task/evidence limits and the 2 MB total apply. Earlier releases cannot read v5.

This is adapter plumbing, not a customer connector or multilingual extraction model. Original scripts are preserved; translation quality is not measured. Rights notes, source IDs and review history remain editable local data. Shared access, protected audit, customer retention rules and connector authorization still require production design and a practitioner pilot. Actual browser workspace-file receipt/recovery remains unverified; the previous file-upload denial has not been bypassed.
