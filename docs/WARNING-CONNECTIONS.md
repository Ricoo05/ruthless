# Connected report leads — v0.24

Early-warning review now runs the existing lexical comparison automatically for its applied date/scope window. This joins current report intake, original-source comparison, context-gap review and explicit verification tasks in the main workbench. It adds no inference model, feed, event identity or threat probability.

## Review behavior

Each retained pair displays its unchanged TF-IDF cosine score and up to eight shared weighted terms. Expand **Inspect both original reports** for full retained passages, attribution, recorded group labels, analyst-assigned stance, publication/recording dates, exact date-mention offsets and reuse conditions. Original excerpts are used rather than incorporated paraphrases.

The context panel shows:

- Same versus different recorded groups. Neither verifies actual independence.
- Cross-case membership, without inferring a common actor or causal relationship.
- Opposing Supports/Challenges metadata where an analyst explicitly assigned it. This is not automatic contradiction recognition. A negation in an unincorporated source remains visible in the original passage.
- Date mentions Compatible, Mismatch or Unknown, with exact quotations when both mentions are unique and valid. Yearless values remain yearless. Multiple/invalid/missing dates remain Unknown. A correction can mention different observations, so even Mismatch does not prove different events.

No candidate is removed or re-ranked by these checks. **Inspect connection type** filters the retained set for date mismatches, opposing assigned stances, same groups or cross-case pairs; **All leads** restores the set. No interpretation is accepted automatically.

## Bounds and handoff

Comparison includes only the newest 200 eligible current records, requires at least three shared tokens and cosine at least 0.18, and retains the highest 40 qualifying pairs. The UI shows at most ten matching retained pairs. Eligible/compared/excluded counts, total qualifying pairs, retained counts and displayed counts are explicit. Filter counts describe the retained 40, not all possible pairs. The separate context-gap scan still covers every eligible record within workspace limits.

The applied window controls both the context scan and connection comparison. Publication must be within the selected range; both publication and recorded dates must be no later than Known by. Corrections become current only once known, preserving earlier as-of views. Source scope filters do not establish coverage outside the retained workspace.

Preparing a connection task recomputes current comparison and requires both typed record keys still to qualify in its retained set. The task includes both record/case references, the date window, score and context checks. Cross-case tasks belong to the first case and explicitly instruct separate review of findings in each case. Creation remains an explicit user form submission. Evidence, case assignments, judgments and approvals are unchanged. Task text is editable; it is a reference handoff rather than a protected source snapshot.

## What this does not validate

The initial fictional exercise yields six pairs from eight records, including unrelated reports sharing boilerplate. This release makes those limitations inspectable; it does not measure improved retrieval accuracy or reduced false alarms. The saved multilingual model and authored context-ordering experiment remain separate in the linkage lab. Their measured performance is not applied to these scores or presented as warning validation.

There is no continuous collection/monitoring, real-place resolver, automatically resolved event graph, individual-intent classifier or operational prediction. These require separate implementation and evaluation. Next, build a permitted event corpus with source-dependent/contradictory/unrelated cases and chronological held-out evaluation before claiming that connected leads improve advance warning.
