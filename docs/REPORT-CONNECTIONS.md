# Report connections — v0.19

Open **Report connections** from the release entry, or **Indicator triage** from the workbench. Select a date window and geographic scope, then press **Compare related reports**. Comparison does not require or use the literal-query terms or recorded-source-group threshold. Load the acknowledged fictional regional exercise for a repeatable example: eight eligible records yield six suggested pairs in the default window.

## Implemented retrieval

`dist/report-links.mjs` compares original staged excerpts and unlinked analyst statements. An incorporated paraphrase does not count again alongside its retained original. Report and recording dates must be known by the selected date; corrections available then supersede their earlier excerpts. Scope and date filters apply before fitting the retrieval vocabulary. The newest 200 eligible records are compared, with excluded counts visible.

Unicode NFKC normalization, lowercase and a small English/control-word stop list produce tokens. Negation words are retained. Term frequency is `1 + ln(count)`; smoothed inverse document frequency is `1 + ln((1 + documentCount) / (1 + documentFrequency))`. Vectors are L2-normalized and compared by cosine. This standalone JavaScript baseline follows the weighting concepts in the primary [scikit-learn feature-extraction documentation](https://scikit-learn.org/stable/modules/feature_extraction.html#tf-idf-term-weighting); it does not install or invoke scikit-learn.

Pairs need three shared tokens and cosine at least 0.18. The engine retains the highest 40 pairs and the UI renders the first ten with both original passages, provenance and weighted shared terms. These are experimental retrieval settings, without operational or measured retrieval-quality significance. Cosine is not a probability. Hindi combining marks survive tokenization, but language effectiveness has not been evaluated and no translation is provided.

## Review and task handoff

Shared recorded source groups and cross-case reporting are labeled without proving independence, actor identity or event identity. **Prepare linkage verification task** opens the existing research-task form with the left case and both record IDs. Its scope asks the analyst to inspect originals, negations, corrections, source dependence and possible unrelatedness. Explicit creation is required. Preparation and comparison do not add evidence, merge cases, change judgments or create alerts.

Pair references are plain text in the task scope, not a typed immutable model-run receipt. Results and comparison settings are session-only; retained reports and explicitly created tasks use existing workspace save/recovery. Existing workspace JSON validation is unchanged.

## Known limits

The authored browser example exposes a false-positive ranking: an overseas repost and an unrelated starter repost rank above the actual shared-source exercise pair because they share boilerplate. Negated or contradictory reports can also rank highly. The interface preserves the originals so an analyst can reject these suggestions; it does not establish semantic equivalence or reliable detection.

No embedding, event-coreference model, live feed, provider request or network collection is added. A missing pair does not establish safety or unrelatedness. This is a baseline for future labeled report-pair evaluation, not evidence that Ruthless predicts an attack. Before replacing it with semantic retrieval, compare false links and missed links on independently labeled multilingual controls, including same-topic/different-event reports and corrections.
