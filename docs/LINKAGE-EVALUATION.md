# Report linkage evaluation — v0.20

The v0.21 multilingual experiment and manual source-quotation review are documented in [SEMANTIC-LINKAGE.md](SEMANTIC-LINKAGE.md). The lexical methods and historical counts below remain unchanged.

## Decision

Keep the current workbench matcher as a visibly limited retrieval baseline. The newly implemented BM25 challenger does not earn promotion on this diagnostic set. The next candidate should combine multilingual retrieval with a separate event-context assessment, retaining original text, conflicting accounts and source dependence. A ranking score must not become a forecast or an operational alert.

## Reproduce

Open `/linkage-lab.html`, select Development or Evaluation, and press **Run comparison**. Filters expose incorrect first results, related reports missed from the first three, and differences between methods. Expand a case to inspect every original candidate, the authored label/rationale and both ranks. Changing partitions clears old results; filters leave aggregate denominators unchanged. The page is static and executes locally without provider requests or workspace mutations.

`dist/linkage-fixtures.mjs` contains 16 authored queries and 48 candidates. Each partition has eight story families: repost/boilerplate, different event dates, contradictory accounts, Hindi wording, English–Hindi translation, paraphrase, insufficient context and spelling variation. Each query has one Related report. Labels describe event relatedness, not the truth of an allegation. A denial or repost can concern the same event. Unresolved candidates remain a distinct class.

These are intentionally difficult fictional controls, not a representative sample of agency reports. The same developer authored the controls, methods and evaluation; both partitions and answers were visible during development. Story-family IDs and exact normalized report text cannot cross partitions, but similar templates and categories do. Calling the second partition Evaluation does not make it blinded or independent. Neither method was tuned after seeing these results.

## Methods and measured output

The TF-IDF path invokes the actual `compareReports` workbench function using a transient synthetic workspace. It retains cosine >= 0.18, three shared tokens, current known-by filtering and bounded pair retention. Its corpus includes the query. BM25 uses unique query terms, candidate-only document frequencies, natural-log IDF `ln(1 + (N - df + 0.5) / (df + 0.5))`, k1 = 1.2 and b = 0.75. Candidates need three shared tokens and a positive score. Corpus statistics exclude reports published or recorded after the known-by date. Both reuse the existing Unicode tokenizer; neither translates, extracts event dates or performs semantic inference. This is a comparison of complete retrieval policies with different acceptance rules, not an isolated weighting ablation.

Development: TF-IDF places the related report first for 2/8 queries, with six unrelated first results, recall@3 0.75 and MRR about 0.479. BM25 achieves 3/8, five unrelated first results, recall@3 0.875 and MRR about 0.583. Its top-three outputs include 11 unrelated reports versus 10 for TF-IDF.

Evaluation: both methods place the related report first for 2/8 queries, with six unrelated first results, recall@3 0.75 and MRR 0.50. BM25 returns nine unrelated top-three reports versus eight for TF-IDF. Both miss the related English–Hindi and paraphrase examples. Each returns one unresolved candidate within the top three; neither has an unresolved or empty first result on this set. These small authored counts provide failure examples, not confidence intervals, measured real-world accuracy or prevention evidence.

Metrics use every query in the selected partition. First-result success is correct first results divided by all queries; wrong, unresolved and empty results are reported separately. Recall@3 averages per-query recovered known positives over eligible known positives. MRR uses the first Related rank, with zero for absence. Unresolved candidates contribute neither a confirmed match nor a confirmed false match. No probability calibration is implied by a lexical score.

## Next implementation contract

1. Retrieve candidate reports with a permitted multilingual embedding model alongside lexical retrieval. Evaluate the union at a fixed analyst-review budget, with original-language text and any translation provenance retained. Do not discard a potentially related report merely because it has no three-token overlap.
2. Evaluate each pair separately for whether it concerns the same described event. Require source-linked support for event location and event time, and allow unknown or conflicting fields. Publication/recording dates establish availability; they cannot substitute for the event date. Reposts, denials and confirmed facts need different provenance/stance labels even when they concern the same event.
3. Bind candidate outputs to exact source versions and the model/configuration used. Validate citations and review event-context errors before creating any accepted linkage. A current textual match is not independent corroboration; editing a source must invalidate a prior candidate.
4. Use independently labeled, permissioned multilingual report pairs with adjudication and event-family separation for a subsequent evaluation. Measure false links, missed links, abstentions and review load at the same budget. These authored controls remain regression tests; they cannot serve as the release acceptance evidence for operational use.

Downstream forecasting needs a distinct test: permitted historical snapshots available at issuance, later independently verified aggregate outcomes, geographic/horizon definitions, chronological evaluation, probability calibration and false-alarm/missed-event analysis. An authored scenario animation cannot serve as prediction evidence. A reviewed protective response and separately measured intervention outcomes are needed to evaluate prevention.

## Primary research references

- [Elastic's BM25 explanation](https://www.elastic.co/blog/practical-bm25-part-2-the-bm25-algorithm-and-its-variables) documents frequency saturation and document-length normalization. The prototype is standalone JavaScript, not an Elasticsearch deployment.
- [Sentence Transformers retrieve-and-rerank documentation](https://www.sbert.net/examples/sentence_transformer/applications/retrieve_rerank/README.html) describes candidate retrieval followed by pairwise reranking. This motivates a next experiment; no embedding or cross-encoder is installed here and search relevance alone does not establish event identity.
- [Revisiting the Evaluation for Cross Document Event Coreference](https://aclanthology.org/C16-1183/) addresses the importance of evaluation design for cross-document event linking. Its results do not validate Ruthless or the present authored labels.
