# Ruthless platform direction

Updated 4 October 2026 from the founder's instructions. Ruthless is intended to be an Indian company providing threat analysis, intelligence gathering, data integration, operations workflows and AI orchestration to governments and defense organizations. Domestic and international terrorism analysis relevant to India is the first product workflow; the platform may support other regions. This expands the company scope without replacing the first workflow.

## Five connected capabilities

1. **Threat analysis:** intelligence questions, geographic context, supporting and challenging evidence, gaps, judgments and reviewed briefs. Manual prototype implemented. Confidence remains analyst assigned.
2. **Intelligence gathering:** collect public or expressly authorized material, preserve its attribution, date, original language and limitations, and track corrections. v0.4 implements manual document staging and analyst incorporation. Automated collection and multilingual extraction are future work.
3. **Data integration:** normalize approved feeds and customer exports into documented schemas with validation, lineage, source grouping, duplicate handling and version compatibility. The first concrete foundation is workspace v4 with retained excerpts, evidence links, tasks and fixture proposal lineage; legacy files migrate without invented provenance or runs. No customer connector is active.
4. **Operations:** coordinate approved analysis tasks, review requests, ownership, handoffs and case status. v0.5 implements a local research-task queue linking each task to an assessment, permitted scope, owner label, due date and evidence of completion. Production roles and protected approval history must precede shared use. No tactical targeting or autonomous enforcement workflow is planned.
5. **AI orchestration:** run bounded extraction, translation drafts, contradiction comparison and brief drafting through an approved model, with cited source spans, recorded inputs/outputs, evaluation results and human review. v0.6 implements a local synthetic fixture, exact source-span validator and analyst proposal acceptance/rejection with evidence lineage. No model integration is active. Models must not treat retrieved document instructions as authority or independently approve a judgment or operational action.

These capabilities share an evidence model and permission boundaries. They should become one coherent customer workflow, rather than five disconnected demonstration screens.

## Delivery sequence and acceptance gates

**Delivered through v0.7:** synthetic assessment desk, manual source intake, immutable source metadata during incorporation, source-linked briefs, review reopening, bounded workspace validation, research follow-up tasks, a synthetic proposal-review queue and an evaluation lab with an offline checker. Imported files, local history and analyst rights acknowledgements remain untrusted.

**Recovery gate before sustained use:** verify actual file receipt and restore in an approved browser, then choose explicit local persistence or customer-controlled storage with a tested recovery workflow. The current in-app browser download event timed out; do not interpret a download request as durable storage. Do not bypass the previous browser file-upload denial.

**Next integration work:** a small, customer-approved adapter fixture set covering duplicate reports, corrections, conflicting claims, missing dates, original-language excerpts and malformed records. Record source permission and retention constraints before any automated collection. A correction must create a linked revision, preserve prior material and reopen affected assessments; do not silently overwrite evidence. The current source documents have no edit/correction workflow yet.

**Operations validation gate:** test the implemented research-task queue with a practitioner before expanding coordination. Next, scope authenticated assignment, handoff and protected review history to actual customer requirements. Labels in a local file cannot establish the identity of an approver.

**AI design gate:** the first proposal and validation contract is recorded in `AI-ORCHESTRATION-CONTRACT.md`. Define the accepted task, permitted dataset and provider/deployment before wiring any API key. Structural source-span validation and local recorded human acceptance are implemented with synthetic fixtures. v0.7 adds 12 authored scenarios, provisional review criteria and fingerprint-bound manual annotations; the reserved split is visible, not independently blinded. Obtain fresh unseen cases and independent reviewer findings before selecting a live provider. See `EVALUATION.md`. Agree a measurable quality threshold with the pilot owner. No percentage improvement or prediction effectiveness is assumed.

**Production gate:** customer-scoped deployment architecture, authenticated roles, least privilege, encrypted storage, protected history, retention, reliable backup/restore, tenant isolation where relevant and independent security evaluation. A private hosted prototype does not establish these properties.

**Business gate:** at least three practitioner conversations, one named pilot sponsor, an authorized non-sensitive sample and agreed success measures. The founder handles introductions, legal commitments, spending and incorporation. No outreach, customer commitment or funding application has been made.

## Source policy findings

Checked 4 October 2026: the [NIA copyright policy](https://nia.gov.in/copyright-policy) requires permission for reproduction, accurate attribution and separate authorization for third-party material. The [MHA website policy](https://www.mha.gov.in/en/page/website-policy) also requires permission for reproduction and states a permission requirement for hyperlinks to its site. These are publisher policy findings, not a determination that any particular commercial use is licensed. The app bundles no reports from either publisher. Customer authorization and publisher reuse rights are separate questions. An intake acknowledgement records an analyst assertion; the app cannot verify either.

## Development models

- **Sol 6.1 High now:** source intake, schema adapters, task workflows, fixtures, routine fixes, documentation and releases.
- **Astra High at a difficult design review:** production permission model, customer-controlled deployment, multilingual evidence fidelity, conflicting pilot findings or AI execution boundaries. Switch only for a concrete review; return to Sol for implementation once the design is settled.
- **Lighter models later:** narrowly bounded formatting or extraction only after they meet the same evaluation criteria. This is a future cost decision, not a prerequisite for current development.

The development model and a future customer-facing inference provider are different decisions. No paid API dependency is added by selecting Sol in this chat.

## Working preferences

The founder is studying for GATE. Continue authorized work during active runs. Raise required decisions in chat; push delivery depends on app/system notification settings. No unattended worker or notification automation is configured. As of 4 October, do not check usage: the founder will request checkpoints. Do not spawn subagents or contact outside parties without authorization.
