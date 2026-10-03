# Project Ruthless: initial research and build decision

Research date: 3 October 2026. Status: desk research complete for the first prototype; customer demand remains unvalidated. This is a product development plan, not a valuation forecast or evidence of a government contract.

## Decision

Build a small, inspectable cyber exposure triage workflow for security analysts at Indian defense suppliers. Import asset/CVE findings that a customer already has, match exact CVEs against CISA's Known Exploited Vulnerabilities (KEV) catalog, add customer-supplied criticality and internet exposure, and export an evidence-backed action brief.

This is the first workflow to test, not a complete defense intelligence platform. A broad Palantir-style ambition does not establish an underserved market. We need evidence that this workflow saves a real buyer time or improves an existing decision.

## What the sources establish

1. **A usable exploitation-evidence source exists.** CISA maintains a public KEV mirror with JSON and CSV, a schema, version history, and CC0 licensing. Its documentation says the mirror is synchronized after changes to the canonical catalog. Source: [CISA KEV repository](https://github.com/cisagov/kev-data). The direct CISA catalog page returned HTTP 403 to the research tool, so the official repository supplied the bundled dataset.
2. **Indian analysts have a domestic primary reference.** CERT-In publishes advisories and vulnerability notes. The first prototype links to its advisory index rather than representing it as an integrated feed. Source: [CERT-In advisories](https://www.cert-in.org.in/s2cMainServlet?pageid=PUBADVLIST).
3. **Broad threat-intelligence platforms already exist.** OpenCTI provides a documented platform for managing cyber threat intelligence. MISP offers threat sharing, correlations, structured data, and visual analysis. A generic feed reader or graph would overlap established tools. Sources: [OpenCTI documentation](https://docs.opencti.io/latest/), [MISP](https://www.misp-project.org/). We have not benchmarked either product against customer workloads.
4. **There is an Indian defense innovation route worth investigating later.** iDEX describes software and hardware challenges and an Open Challenge route for proposed problems. Individual innovators can apply; its FAQ also distinguishes innovation support from procurement decisions made by the relevant agency. This is not evidence that our proposed product qualifies, will receive funding, or has a buyer. Source: [iDEX FAQ](https://idex.gov.in/faq). Recheck the actual challenge and agreement before any application or spending.

## Customer and commercial hypotheses

- User: a security analyst or IT security lead who already receives vulnerability exports.
- Candidate buyer: the security/IT head of an engineering or manufacturing supplier serving defense customers.
- Job: explain which findings should be investigated first, identify the responsible team, and communicate the supporting evidence.
- Possible differentiator to validate: a lightweight workflow that runs with customer-controlled files and explains every ranking, with minimal infrastructure.
- Commercial hypothesis: a scoped paid pilot followed by an annual organizational license plus separately priced integration/support. No price, revenue, market-size, or margin claim is validated yet.
- Main competitive risk: existing scanners, spreadsheets, MISP, OpenCTI, or an organization's vulnerability platform may already solve this well enough.
- Main distribution risk: introductions do not necessarily reach a budget owner or a team able to share representative data.

## Customer discovery brief

Ask the founder's contacts for a conversation with someone who personally triages vulnerabilities. Do not send messages automatically. Suggested questions:

1. Walk through the last time you decided what to fix first. What inputs and tools did you use?
2. Which step takes the most time: data cleanup, applicability checks, prioritization, assignment, or reporting?
3. Can your current tool explain why a finding matters to an engineering workflow?
4. What would an approved, de-identified test export contain? Which data must stay on your systems?
5. Who can authorize a pilot, and what measurable result would justify paying for it?
6. Which existing feature would make this product unnecessary?

Record workflow, current tool, time spent, buyer, constraints, and evidence of willingness to run a pilot. Avoid requesting secrets, system credentials, classified records, or production access for discovery.

## Pilot decision gates

These are proposed gates, not achieved outcomes:

- At least three relevant interviews identify the same costly step.
- One organization offers approved non-sensitive test findings and names a pilot owner.
- On that dataset, import is lossless, duplicate findings are rejected explicitly, and each KEV match is traceable to its source snapshot.
- Compare completion time and decision quality with the analyst's current workflow on the same findings. Agree a target before the pilot; do not claim improvement from the demo.
- If existing tools solve the problem with little effort, change or stop this product direction before adding a platform's worth of features.

## First release scope

Delivered workflow: CSV import; exact CVE correlation; public catalog refresh and offline catalog import; score explanation; search and filters; review status and supporting notes; review history; CSV and Markdown brief exports; full project save/open with catalog snapshot. The demo uses six fictional assets and real public vulnerability identifiers.

The score is a deterministic heuristic: KEV membership 50, criticality 5–25, internet exposure 20, and known ransomware use 5. High begins at 75 and Elevated at 50. This is not a calibrated risk or probability model. CVE applicability is asserted by the imported finding, not inferred from a product name or version. Status does not alter the exposure score.

The first version deliberately uses explicit document save/open. There is no backend holding customer data, browser storage, automatic persistence, user account system, hosted tenant database, or AI service. Saved JSON files contain the full evidence snapshot so reviews can be reproduced without a changing feed. These files are editable and unencrypted; history is not a compliance audit log.

## Architecture and build acceptance

- Browser-native HTML/CSS/JavaScript with no runtime package dependencies.
- `dist/core.mjs`: validation, CSV parser, scoring, project document format, review updates, and exports; separately testable.
- `dist/app.mjs`: interface, file operations, catalog retrieval, and optional browser agent search tool.
- `dist/kev.json`: official public snapshot; refresh is explicit and failures preserve existing data.
- `serve.mjs`: loopback-only local static server for development and private local use.
- Exact matches only. No exploit execution, network scanning, claims of compromise, or automated remediation.

Acceptance: invalid imports leave the active session intact; export/open restores findings and evidence; closed decisions require a note; no-match findings remain visible; source freshness is displayed; data rendered as text is escaped; CSV formula-like cells are neutralized; browser workflows and tests pass.

## Next engineering stages

1. Independent architecture/security review with Astra High, focused on import validation, confidentiality, project integrity, and missing test cases. The founder requested a notification when this switch becomes useful.
2. Customer-led pilot revisions: real scanner adapters, version/applicability checks, and comparison against the current workflow.
3. Only after requirements are known: customer-hosted service, authenticated roles, durable database, protected audit trail, backups, integration boundaries, signed releases, dependency management, and operational support.
4. Investigate India-specific procurement, data-handling, and deployment requirements for an actual customer with qualified help. No blanket compliance or government approval claims.

## Work arrangement

The founder is preparing for GATE and can provide introductions. Budget and time remain unspecified. Work can proceed on bounded research and software tasks without spending commitments. Incorporation, signatures, customer commitments, and funding decisions remain the founder's responsibilities. This chat has not created a legal entity, acquired a customer, or scheduled unattended operations.
