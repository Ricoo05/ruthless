# Ruthless platform direction

Updated 4 October 2026 from the founder's instructions. Ruthless is intended to be an Indian company providing threat analysis, intelligence gathering, data integration, operations workflows and AI orchestration to governments and defense organizations. Domestic and international terrorism analysis relevant to India is the first product workflow; the platform may support other regions. This expands the company scope without replacing the first workflow.

## Five connected capabilities

1. **Threat analysis:** intelligence questions, geographic context, supporting and challenging evidence, gaps, judgments and reviewed briefs. Manual prototype implemented. Confidence remains analyst assigned.
2. **Intelligence gathering:** collect public or expressly authorized material, preserve its attribution, date, original language and limitations, and track corrections. v0.4 implements manual document staging and analyst incorporation; v0.8 adds linked corrections with preserved history and review reopening. Automated collection and multilingual extraction are future work.
3. **Data integration:** normalize approved feeds and customer exports into documented schemas with validation, lineage, source grouping, duplicate handling and version compatibility. The first concrete foundation is workspace v7 with retained excerpts, evidence links, tasks, fixture proposal lineage, corrections and batch import history; legacy files migrate without invented provenance or runs. No customer connector is active.
4. **Operations:** coordinate approved analysis tasks, review requests, ownership, handoffs and case status. v0.5 implements a local research-task queue linking each task to an assessment, permitted scope, owner label, due date and evidence of completion. Production roles and protected approval history must precede shared use. No tactical targeting or autonomous enforcement workflow is planned.
5. **AI orchestration:** run bounded extraction, translation drafts, contradiction comparison and brief drafting through an approved model, with cited source spans, recorded inputs/outputs, evaluation results and human review. v0.6 implements a local synthetic fixture, exact source-span validator and analyst proposal acceptance/rejection with evidence lineage. v0.9 adds a synthetic-only local provider runner and input/draft console; a funded synthetic experiment has produced 12 structurally valid outputs; independent semantic quality review remains outstanding. v0.12 attaches cited drafts to matching fictional analyst cases and preserves stale-input history. Models must not treat retrieved document instructions as authority or independently approve a judgment or operational action.

These capabilities share an evidence model and permission boundaries. They should become one coherent customer workflow, rather than five disconnected demonstration screens.

## Delivery sequence and acceptance gates

**Delivered through v0.13:** synthetic assessment desk, manual source intake, immutable source metadata during incorporation, source-linked briefs, review reopening, bounded workspace validation, research follow-up tasks, a synthetic proposal-review queue and an evaluation lab with an offline checker, validated offline source batches and linked corrections, plus a bounded synthetic-only AI runner, integrated case analysis with manually applied draft starting points and lineage, validated pasted workspace recovery, resumable semantic reviews and read-only review handoff reports. Imported files, local history and analyst rights acknowledgements remain untrusted.

**Recovery gate before sustained use:** v0.13 verifies exact pasted-JSON restoration and unsaved-work replacement protection. Native file receipt/reopening remains unverified. Next, choose explicit local persistence or customer-controlled storage with a tested recovery workflow. The current in-app browser download event timed out; do not interpret a download request as durable storage. Do not bypass the previous browser file-upload denial.

**Integration foundation delivered:** v0.8 provides authored synthetic adapter fixtures, atomic batch validation, stable external identifiers, unchanged-record skipping, original-language retention and linked corrections that preserve earlier material and reopen review. See `SOURCE-INTEGRATION.md`. Next, validate the contract with a practitioner and a customer-approved export before selecting a real connector. Source permission/retention constraints and customer authorization precede collection. No customer connector or automatic fetch is active.

**Operations validation gate:** test the implemented research-task queue with a practitioner before expanding coordination. Next, scope authenticated assignment, handoff and protected review history to actual customer requirements. Labels in a local file cannot establish the identity of an approver.

**First AI experiment:** founder selected an existing model API with synthetic data only. v0.9 implements the Responses runner, local console, strict output shape, exact-citation checks and separate execution reports. Secure provisioning succeeded after approval and the founder authorized up to $1 for the experiment. Twelve development/reserved outputs passed exact-citation checks after quote-only span resolution; zero independent semantic reviews have been completed. v0.12 uses retained outputs without another paid request. Next: qualified review and practitioner feedback on the connected case workflow. Fresh unseen cases and practitioner validation are required for credible quality claims/customer use, not for beginning this synthetic experiment. See `AI-RUNNER.md`, `AI-ORCHESTRATION-CONTRACT.md` and `EVALUATION.md`.

**Production gate:** customer-scoped deployment architecture, authenticated roles, least privilege, encrypted storage, protected history, retention, reliable backup/restore, tenant isolation where relevant and independent security evaluation. A private hosted prototype does not establish these properties.

**Business gate:** at least three practitioner conversations, one named pilot sponsor, an authorized non-sensitive sample and agreed success measures. The founder handles introductions, legal commitments, spending and incorporation. No outreach, customer commitment or funding application has been made.

## Source policy findings

Checked 4 October 2026: the [NIA copyright policy](https://nia.gov.in/copyright-policy) requires permission for reproduction, accurate attribution and separate authorization for third-party material. The [MHA website policy](https://www.mha.gov.in/en/page/website-policy) also requires permission for reproduction and states a permission requirement for hyperlinks to its site. These are publisher policy findings, not a determination that any particular commercial use is licensed. The app bundles no reports from either publisher. Customer authorization and publisher reuse rights are separate questions. An intake acknowledgement records an analyst assertion; the app cannot verify either.

## Backend foundation review

The first local repository/API slice now enforces configured identity, tenant, workspace and action permissions. It stores encrypted SQLite versions with revision-conflict protection and atomic server save receipts. A local HTTP demo proves save and exact recovery after reopening. The design selects dedicated per-organization resources and keeps browser review claims unverified. v0.14 connects the same-origin local browser with explicit loading/creation, revision-bound saves and edit-preserving conflict handling. Real SSO, authoritative review commands, complete security logging and external rollback protection are subsequent work. See `BACKEND.md`. The hosted Site remains static; no cloud backend is deployed.

## Development models

- **Sol 6.1 High now:** source intake, schema adapters, task workflows, fixtures, routine fixes, documentation and releases.
- **Astra High at a difficult design review:** production permission model, customer-controlled deployment, multilingual evidence fidelity, conflicting pilot findings or AI execution boundaries. Switch only for a concrete review; return to Sol for implementation once the design is settled.
- **Lighter models later:** narrowly bounded formatting or extraction only after they meet the same evaluation criteria. This is a future cost decision, not a prerequisite for current development.

The development model and a future customer-facing inference provider are different decisions. No paid API dependency is added by selecting Sol in this chat.

## Working preferences

The founder is studying for GATE. Continue authorized work during active runs. Raise required decisions in chat; push delivery depends on app/system notification settings. No unattended worker or notification automation is configured. As of 4 October, do not check usage: the founder will request checkpoints. Do not spawn subagents or contact outside parties without authorization.
