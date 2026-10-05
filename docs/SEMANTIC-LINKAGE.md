# Multilingual report linkage — v0.21

The raw retained model run below is unchanged. v0.22 adds a separate [quoted-context ordering experiment](CONTEXT-ORDERING.md) and source-mention quotation preparation. No model inference was rerun or its saved scores altered.

Ruthless now compares actual local pretrained-model inference with the existing lexical methods. This is candidate retrieval research toward source-linked early warning. It does not classify an attack, infer individual intent, verify reports or demonstrate prevention effectiveness.

## Inspect retained output

Open the release entry's **Open linkage evaluation**. Select a partition and **Load saved multilingual run**. The page checks the exact fictional input texts and availability dates against the retained run, then displays all three methods. Loading scores does not run the encoder in the browser. Filters keep full-partition denominators; changing partitions clears prior results until rerun.

`dist/semantic-run.json` contains scores from an executed CPU experiment, source-text hashes/token counts, model configuration, execution timing and downloaded asset hashes. Its input binding is `1dd4a2671add8798df642cbbce32fe6cf6428fc0e1ba6a9b24b4290d98c164f6`. Altered text or availability dates invalidate it; authored answer labels and rationales are excluded from model inputs. Schema/hash checks identify changed inputs and malformed metadata. They do not authenticate who generated an editable file or prove that its score values came from execution.

## Reproduce locally

Requires Node.js 24+ and pnpm. Install the separately pinned inference dependency, then explicitly run the fixed synthetic-only experiment:

```powershell
pnpm --dir tools/semantic install --frozen-lockfile --ignore-scripts
node scripts/run-semantic-linkage.mjs --run
```

The first run downloads public model files from Hugging Face into ignored `.semantic-runtime/cache`. Report text is processed locally. No OpenAI key, paid API, user documents or agency feed is used. The runner replaces the retained JSON only after complete encoding and validation. The web application itself remains dependency-free.

The encoder is `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, pinned to revision `2c4055b12046f11709e9df2c122e59ffbdc2f900`, through `@huggingface/transformers` 3.8.1. It uses CPU q8 ONNX, normalized mean pooling and 384-dimensional vectors. Inputs longer than 128 model tokens are rejected rather than silently truncated; all 64 current texts fit, with a maximum of 37 tokens. Cosine similarities above zero are ranked without the lexical three-shared-token gate. This threshold is a fixed diagnostic policy, not a learned or calibrated event-match boundary. No new model was trained.

The original [Sentence Transformers model card](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2) documents the architecture and Apache-2.0 license. The [ONNX conversion card](https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2) links that base model. [Official Transformers.js Node guidance](https://huggingface.co/docs/transformers.js/tutorials/node) describes the local runtime. We retain derived scores from our fictional text; model weights remain local and are not included in the Site or source repository.

## Actual measured results

Development: MiniLM chooses the Related report first for 3/8 queries, versus TF-IDF 2/8 and BM25 3/8. It has five unrelated first results, MRR 0.6875 and recall@3 1.0.

Evaluation: MiniLM chooses the Related report first for 4/8 queries, versus 2/8 for both lexical methods. It has four unrelated first results, MRR about 0.7292 and recall@3 1.0. Its remaining incorrect first results cover different dates, Hindi wording, English–Hindi and paraphrase. It now retrieves the related cross-language/paraphrase candidates, but still ranks unrelated candidates above them.

Each query has exactly three candidates. Returning all three yields 100% recall@3; both partitions also expose 15 unrelated and one unresolved top-three reports for analyst review. Broad retrieval alone has not solved event selection. Scores are similarities, not probabilities of relatedness, truth or danger.

These 16 authored queries and 48 candidates are visible diagnostic controls. The developer saw both partitions and labels. Story-family/exact-text separation does not remove shared templates or establish blinded, independent, representative evaluation. No method is promoted into the live report-connection workflow on this evidence.

## Source-backed manual context review

Expand a candidate and **Review event context**. The dialog presents both original reports and availability dates. Publication/recording dates determine whether a report was known; they do not substitute for event time.

Quote event place and event time separately from each original. A nonempty quotation must be a unique exact substring between 3 and 300 characters; retained citations contain exact UTF-16 start/end offsets. A reviewed match/conflict requires quotations from both reports. **Same event proposed** requires reviewed place and time matches. **Different event proposed** requires at least one reviewed conflict. Missing context can remain **Insufficient context**. Reposts and contradictory accounts have separate reporting-relationship labels; relatedness does not imply independent corroboration.

The software checks quotation fidelity and required fields. The human chooses what those quotations mean; translations, location aliases and temporal interpretation are manual judgments. A reviewer label is unauthenticated. Retaining a proposal changes no evidence, main workspace, model score, approved link or alert. Proposals remain only in the tab's memory, disappear on reload, and are bound to the exact source pair/date. Closing the dialog preserves unapplied entries; opening a different pair requires completing or clearing them first.

## Next engineering gap

Evaluate candidate retrieval at a larger fixed review budget, then introduce structured event-context extraction with exact citations, unknown fields and source-version invalidation. Compare false links, missed links, abstentions and review load using separately adjudicated, permissioned multilingual event families. Only after that evidence should accepted linkages feed downstream forecasting research. Current forecasting and authored 3D replay remain separate; this experiment does not convert their output into validated attack prediction.
