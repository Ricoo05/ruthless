# Quoted context ordering — v0.22

The v0.21 multilingual encoder often ranks a report with a different date or place above the Related report. v0.22 adds a transparent source-mention check and a separate review ordering. It preserves the raw model comparison so the effects and remaining mistakes can be inspected.

## Use

Open **Open linkage evaluation**, choose a partition and **Load saved multilingual run**. Four methods appear. Expand a candidate to see all ranks and the quoted date/place mismatch flags. **Review event context** displays the original pair and extracted mentions. **Use extracted quotations** fills supported unique quotation fields; it does not set reviewed relationships, a same-event conclusion or approval. Editing the form disables preparation so entered work is not overwritten. Complete or clear unapplied work before changing pairs.

## Deterministic source-mention parser

`dist/context-hints.mjs` accepts nonempty source paragraphs up to 4,000 characters and retains exact original UTF-16 offsets. English/Hindi day-month expressions with an optional four-digit year and ISO YYYY-MM-DD dates are supported, including Devanagari digits. Calendar validity is checked; a missing year stays missing, including the uncertain leap-year case of 29 February. Relative dates, month-only mentions and ambiguous slash formats are not resolved using publication dates.

Zero supported date mentions is Missing. More than one, including a repeated mention, is Multiple. Any recognized invalid date makes date comparison Invalid. Only one valid explicit date on each side can produce a date mismatch flag. Different day/month values, or different explicitly supplied years, trigger the flag. Matching partial dates are merely Compatible; missing years are never inferred.

Place parsing is deliberately limited to the `fictional`/`काल्पनिक` markers, a short name and supported site-type wording used by the authored controls. It normalizes whitespace, centre/center and केन्द्र/केंद्र spelling. It is not general named-entity recognition for India or real agency documents. Multiple or unsupported place mentions stay unresolved. Cross-script aliases are Unknown; there is no automatic transliteration or lookup. Same-script different keys produce a mismatch flag, which can be misleading for aliases.

The parser recognizes mentions, not their relationship to an event. A cited date can refer to publication, a comparison incident or a correction. The test suite includes a date correction about the same incident that still produces a mismatch flag. Source fidelity is checked; semantic attachment and truth are not established.

## Review ordering and measured output

`dist/context-order.mjs` takes the current validated multilingual comparison, checks source availability again and derives mention checks from the source text. Unflagged retrieved candidates come first; flagged ones come later. Within each group, the original descending cosine and deterministic ID tie-break remain. Cosine values are unchanged and every retrieved candidate remains present. Future candidates cannot be inspected or introduced through this ordering. Labels, authored rationales and family IDs are excluded from the ordering decision.

Development: 7/8 Related first results, one Unrelated first result, MRR 0.9375 and eight deferred candidates. Evaluation: 7/8 Related first results, one Unrelated first result, MRR about 0.9167 and seven deferred candidates. Raw MiniLM remains 3/8 development and 4/8 evaluation. The English–Hindi example remains the wrong first result in both partitions; unknown cross-script place identity and missing explicit dates do not resolve it.

Both partitions still return 15 Unrelated and one Unresolved report within the top three. Since each query has only three candidates, recall@3 of 1.0 reflects retained coverage, not improved useful selection or reduced review load. There is no threshold calibration, learned reranker, event probability, evidence merge, forecasting integration or operational alert.

The heuristics were designed in response to the visible authored errors. Both partitions and labels were inspected during development. The measured counts demonstrate regression behavior, not blinded, independent or representative accuracy. They must not be used as a customer claim of 87.5% attack detection or event-link accuracy. The main workbench matcher is not replaced by this lab experiment.

## Research direction

The [Sentence Transformers retrieve/rerank guidance](https://www.sbert.net/examples/sentence_transformer/applications/retrieve_rerank/README.html) separates broad candidate retrieval from pair-level scoring. [SUTime's original paper](https://aclanthology.org/L12-1122/) addresses temporal-expression recognition and normalization. Our implementation is a narrow deterministic quotation aid; neither SUTime nor a learned cross-encoder was installed in this release.

Next, use permissioned, independently adjudicated event pairs with correction and alias controls to test structured event extraction and pair-level inference. Keep unknown fields, original-language spans, source-version invalidation, false links, missed links and fixed review budgets visible. Model selection should follow those results rather than these small authored counts.
