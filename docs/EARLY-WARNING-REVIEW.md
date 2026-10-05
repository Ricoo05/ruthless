# Early-warning source-context desk — v0.23

The goal is earlier, evidence-supported warning and prevention. This release connects retained collection/intake material to a proactive context review and verification queue in the main workbench. It does not implement a terrorism classifier or validate advance warning. Open **Early-warning review** or the root URL with `#warning`.

## Current workflow

1. Collect a permitted advisory locally and explicitly stage a reviewed passage, or stage authorized non-sensitive material through document intake. The hosted site has no collector worker.
2. Opening the desk scans every eligible current record without requiring keywords. Applying publication-window, known-by and geographic settings recomputes the view.
3. Inspect review reasons and triggering record references. Expand each case's as-of timeline to see full retained original text, publication/recorded dates, attribution, group labels, assigned evidence stance, conditions and quoted date mentions.
4. Prepare a context verification task. Review/edit its scope and explicitly create it. Findings still require reviewed evidence and existing assessment controls.
5. Retain the workspace through existing JSON or configured local backend workflows. The derived desk is recomputed from that workspace; it has no separate persisted alerts.

## Implemented rules

- **Unincorporated sources:** staged current excerpts without a corresponding evidence record.
- **Challenging evidence:** the analyst assigned Challenges to a retained record; this is not automatic contradiction recognition.
- **Repeated groups:** more than one record with the same case-insensitive, trimmed group label. This flags possible source dependence, not a confirmed repost.
- **Single group:** one recorded group in the case/window. Group labels do not prove independence.
- **Date context:** supported date mentions are missing, multiple, calendar-invalid or yearless. English/Hindi named dates and ISO dates retain exact UTF-16 quotation offsets. Publication date is never substituted for event date. A unique valid mention still needs semantic interpretation.

Cases retain existing analyst assignments and workspace order. No event merging, actor relationship or severity score is inferred. Distinct dates may concern different observations; missing dates may be normal source context. These rules can generate substantial review work and have no measured real-world warning precision, recall or lead time. An empty queue or window does not establish safety.

## Chronology and bounds

Original source excerpts are scanned rather than their incorporated analyst paraphrases, so incorporation does not double-count a source. Publication must be within the selected window and both publication and recording must be no later than Known by. Corrections replace originals only when available by that date. Earlier retained revisions remain in the workspace.

Rule counts include all eligible current records, within existing workspace limits. The timeline displays the newest 30 per case, ordered by recorded date, publication date and stable record key; omitted counts are explicit. Trigger lists display at most 30 references. Task preparation recomputes current sources and includes up to eight distinct references with the full count. Tasks retain references and as-of instructions in editable text, not cryptographically bound source snapshots; reopen the current desk before acting on them. No workspace schema change occurs.

## Product limits and next evaluation

The refresh runs on opening or applying settings; it does not monitor in the background, discover new feeds or invoke model/API inference. Saved multilingual matching and context ordering remain in the separate lab. Social/CCTV connectors remain unconnected. Broad public visibility does not establish reuse permission or access authorization.

Next substantive detection work requires permitted source coverage, event-level extraction/linkage with citations and abstention, then a historical evaluation separated in time. Track false alarms, missed events, time to review and lead time before presenting predictive capability to agencies. Synthetic demonstrations test workflow mechanics only.
