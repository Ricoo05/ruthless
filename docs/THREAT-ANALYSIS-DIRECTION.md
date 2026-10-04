# Ruthless — terrorism threat analysis product direction

Updated 4 October 2026. The broader five-capability company scope is in `PLATFORM-DIRECTION.md`; this document retains the first terrorism-analysis workflow. This document supersedes the earlier cyber-first company plan.

## Founder’s intended company

Build software that governments and government agencies can purchase to support analysis of domestic and international terrorism, starting with relevance to India and supporting other regions later. The intended value is better evidence gathering, corroboration, assessment and coordination in support of prevention. No prevention effectiveness, customer contract or agency approval has been established.

The commercial hypothesis is an organizational software license with deployment, integration and support priced to the actual scope. Pricing, procurement route and eligibility remain unvalidated. The founder controls customer relationships, spending, legal commitments and company formation. The assistant prepares research, product designs, implementation, tests and supporting materials.

## First workflow

An analyst defines an intelligence question, gathers public or explicitly authorized evidence, records sources and dates, compares supporting and conflicting reports, documents gaps and an assessed judgment, and submits a traceable brief for human review.

The first customer conversations should be with people who perform or supervise this work. Validate whether source review, corroboration, reporting or coordination is the costly step before investing in a wider platform. A small public-source pilot may be more practical than beginning with restricted agency systems; this is a hypothesis to test.

## What v0.3 implements

- Domestic, cross-border and international assessment scopes with named geographic areas and intelligence questions.
- Evidence records with publisher, HTTPS source reference, report/record dates, underlying source group, attributed statement and analyst-assigned claim state.
- Supporting, challenging and contextual evidence on a dated timeline. Reposts sharing a source group do not increase the supporting-group count.
- Analyst confidence, review priority, judgment, information gaps, citations and review notes.
- Review requirements and explicit acknowledgement of contradictory evidence. Adding evidence reopens reviewed conclusions; reviewing citations after the assessment date is rejected.
- Separate threat workspace format with bounded save/open validation and brief generation. Download receipt requires user confirmation before the unsaved marker clears.
- The original cyber exposure module remains at `/exposure.html`.

All bundled cases and evidence are synthetic. Manual entry and reference links are implemented; automated collection, source verification, live alerts and attack prediction are not.

## Evidence standards for later ingestion

Preserve publisher, original URL, publication and retrieval times, original language, source license/access conditions, correction history and links from each claim to the supporting material. Keep reported allegations, judicial findings and analyst inferences distinct. A repeated story does not establish independent corroboration, and co-occurrence does not establish common perpetrators or intent.

Before a connector is shipped, test provenance loss, duplicate/reposted reports, corrections, translations, stale material, unreliable sources and contradictory evidence. Review connector permissions and data retention with the customer. Source reliability and claim confidence must remain separate concepts.

The next technical milestone is a narrowly scoped public-document intake design and evaluation fixture set. This requires source and licensing checks before automated collection. Do not treat a link directory as completed intelligence gathering.

## Product boundaries

The product supports analyst decisions. This prototype does not create person-level threat scores, track private individuals, infer dangerousness from identity or beliefs, or make autonomous operational decisions. No cyberattack capability is included. A future cyber testing module would require explicit authorization and defined test scope on permitted systems.

Government deployment needs an agreed threat model, access control, protected audit records, retention controls, secure updates, recovery, restricted-network requirements where applicable, and independent security assessment. These requirements must be designed and verified before sensitive agency use. A private hosted prototype is not a substitute for them.

## Business gates

1. Three relevant practitioner conversations identify a repeated problem and a buyer.
2. One pilot sponsor supplies approved non-sensitive example material and agrees success criteria.
3. The pilot demonstrates useful, traceable analysis compared with the existing workflow; errors and information gaps are measured as well as time.
4. A customer agrees a paid scope and a deployment process that can be supported.
5. Renewals and repeatable delivery justify wider source coverage, collaboration and integration.

## Model plan

- Astra High: current domain and architecture review; later public-source intake design, evidence semantics, access boundaries and major release decisions.
- GPT-6.1 Sol High: routine implementation, interfaces, tests, documentation and publishing after the design gate is settled.
- Recommend a return to Sol after the v0.3 review/release checkpoint. Revisit Astra before implementing a new source-intake architecture or handling sensitive customer data.
- These are development recommendations. The prototype itself makes no AI model calls. Product AI must be evaluated on approved data for evidence fidelity, uncertainty, errors and customer deployment constraints.

## Primary references and research limits

- [MHA Counter Terrorism and Counter Radicalization Division](https://www.mha.gov.in/en/divisionofmha/counter-terrorism-and-counter-radicalization-division): retrieved 3 October 2026. Describes policy, coordination, implementation and international cooperation responsibilities; it does not establish interest in this product.
- [NIA press releases](https://nia.gov.in/press-releases): public reference directory discovered in official search results. Direct retrieval returned HTTP 502 during this pass. No releases were ingested or represented as verified product evidence.
- [UN counter-terrorism strategy](https://www.un.org/counterterrorism/en/un-global-counter-terrorism-strategy): linked for analyst reference; direct retrieval failed during this pass. No claims were extracted into the product.

No classified access, government affiliation, customer interviews, grant, accreditation or prevention outcome is claimed.

## v0.4 integration foundation

Manual document intake now records the original excerpt, language, excerpt location, source group and access/reuse conditions. Incorporation requires an analyst statement, review note and access acknowledgement; metadata comes from the staged document. Evidence links to the retained source, and new evidence reopens Reviewed judgments. No automated source collection or AI is implemented. Read `PLATFORM-DIRECTION.md` for the revised sequence and source-policy findings.
