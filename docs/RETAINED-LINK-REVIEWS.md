# Retained report-context reviews — v0.25

Ruthless needs traceable reasoning between finding a report connection and relying on that connection. The main Early-warning review desk now retains an analyst's source-quoted interpretation in the workspace. This release adds no forecasting algorithm, new collector, semantic event merger or improvement claim for the existing lexical retrieval.

## Workflow

Open **Review event context** on a related-report lead. The form captures both current originals available by the applied Known by date, including typed source keys, case IDs, source-group labels, publisher, URL, publication and recorded dates, text and available locator/access conditions. An incorporated source remains the original excerpt rather than its analyst paraphrase. Source-derived evidence is not treated as another original report.

Enter at least one exact context quotation from each source, a reviewer label and reasoning. Place and event-time relationships default to Unknown; the event conclusion defaults to Insufficient context. Prepare extracted quotations uses the existing limited date/fictional-place parser, sets no relationships and is disabled after user input. It is a convenience for source spans, not a semantic interpretation.

Each quotation must occur uniquely in its captured original, be 3–300 UTF-16 code units long, and preserve exact wording. Repeated passages need more context. Imported offsets must match the recomputed span; surrogate pairs cannot be split. Relationships other than Unknown require the corresponding quotations from both reports. Same event proposed requires reviewed place and time Matches. Different events proposed requires a reviewed conflict and leaves the proposed reporting relationship Unknown. These checks cannot determine whether a passage actually describes the relevant place, time, event, repost or contradiction; that remains analyst reasoning.

Close or Escape preserves the entered form. Resume context review returns to it. Retain or Clear context draft resolves the draft before changing views/sources or saving/exporting. A retained review adds a history entry but changes no evidence, assessment, event assignment or approval. It can retain uncertainty instead of forcing an event decision. The separate linkage evaluation lab's proposals remain session-only.

## Source changes and dates

Reviews retain their original snapshots, quotations, created date and source as-of date. The service rechecks the prepared originals before retaining a new review. A changed prepared source is rejected without changing the workspace.

The ledger compares each historical snapshot with the current original available by Known by. A changed text/provenance field, known correction that supersedes the original, or unavailable original produces Stale source snapshot. Ordinary incorporation does not replace the original with a paraphrase. Source changes never rewrite the earlier review or promote its conclusion. Inspect current sources and retain a new review when needed; the earlier proposal remains history.

A review created later than Known by is withheld even if its source snapshot was taken earlier. Publication and recorded dates both control original availability, including correction availability. Dates have day precision. The ledger uses Known by alone; Reports since and geographic scope apply to the comparisons above, not the ledger. This is stated beside the retained reviews.

## Recovery and storage

Workspace format 8 carries a required linkReviews array. Formats 1–7 migrate to an empty array rather than inventing historical reviews. References must identify distinct retained original records belonging to the specified cases. Canonical recovery checks snapshots, exact citations, dates, conclusions and bounds while allowing historically changed snapshots to remain as stale history. Unknown approval/trust fields do not become approvals. Reviewer labels, imported history, source-group labels and snapshot content are editable client data, not authenticated identity, provenance or proof of execution.

Preview workspace JSON and Paste workspace JSON recover applied reviews with their source records and corrections. Save workspace uses the existing download/receipt workflow; no new automatic browser persistence is added. The optional synthetic local backend saves and recovers these records in its existing protected version envelope. It rejects non-synthetic historical snapshots even when the current sources are marked synthetic. The hosted Site remains static without a cloud backend.

Maximums are 40 retained reviews and the existing 2 MB workspace limit. Reviewer labels are bounded to 120 characters and reasoning to 2,000; existing original-source limits also apply. Invalid quotations, unsupported conclusions, duplicate review IDs, missing original references and over-limit records fail before mutation.

## Verification and remaining work

Nine new service/storage tests cover exact and ambiguous quotations, Unicode, unsupported conclusions, stale snapshots, correction availability, source incorporation, legacy migration, JSON recovery, bounds and synthetic backend storage. Local browser QA exercises fabricated-quotation rejection, draft close/resume and navigation blocking, successful unresolved review, actual staged correction, stale history, fresh-tab pasted recovery and Known by withholding. Desktop/mobile evidence is recorded in VERIFICATION.md.

The path toward earlier warning still requires broader authorized sources, independent report-linkage evaluation and forecasting validation with missed incidents, false alarms, calibration and lead time. Retained reasoning makes those investigations inspectable; it does not establish prediction or prevention effectiveness.
