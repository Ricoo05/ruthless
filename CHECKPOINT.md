# Project Ruthless — v0.3 checkpoint

Updated 3 October 2026. The user resumed work and changed the core product direction to terrorism threat analysis for government and government-agency buyers, covering domestic/international developments relevant to India and wider regions. This direction supersedes the earlier cyber-first commercial plan. Read `docs/THREAT-ANALYSIS-DIRECTION.md` first.

## Current implementation

- Source: this directory, `C:/Users/arhit/Documents/Codex/2026-10-02/ca/outputs/ruthless`.
- Main page: threat assessment desk with synthetic cases, manual evidence entry, contradictions, source groups, dated timelines, analyst judgments/gaps/citations, review validation, save/open and brief generation.
- Cyber exposure module retained at `/exposure.html`; separate project format.
- Local server: `node serve.mjs`, http://127.0.0.1:4173/.
- 29 tests pass. Browser review, new evidence reopening, filters, new questions and save-warning safeguards pass. Details and limits: `docs/VERIFICATION.md`.
- No real threat reports are bundled. No automated gathering, attack predictions, person-level threat scores or offensive cyber capability is implemented.

## Publication and artifacts

- Reuse Site `appgprj_6ac0d8518bd48191a995631438b1e269` and preserve owner-private access.
- URL: https://project-ruthless-exposure.arhit99.chatgpt.site
- v0.2 succeeded from commit `52713b9a689f70c64695c17e8532355482fbe72a` (receipt in sibling `ruthless-release-v0.2.json`).
- v0.3 release receipt will be sibling `ruthless-release-v0.3.json`; only status `succeeded` confirms publication. Read it for the exact commit/version/deployment. Source archive: `project-ruthless-v0.3.zip`.
- Network/terminal restrictions have been removed. Supported Sites workflow now accepts stdin credentials. Keep credentials transient, never in files/argv/logs.
- Local Sites packaging lacks Bash. Source is pushed through the bundled workflow; documented native remote-build fallback without archive worked for v0.1/v0.2. Reuse for v0.3 only after verifying pushed source.

## Known limits

- v0.3 browser download receipt is unverified: event timed out and files were absent from expected Downloads paths. Unsaved marker stays until user confirms receipt; changes invalidate that acknowledgement. Do not claim successful browser save/reopen.
- Browser file import was denied by its permission layer. Do not bypass that denial. Core parsing, round trips and guards are tested.
- No sensitive agency data, production authorization system, protected audit trail, procurement approval or independent security review exists.

## Next bounded work

1. Finish/confirm v0.3 private deployment and source archive if the receipt is absent.
2. Use Astra High for public-document intake architecture: source permissions, provenance, duplicates, corrections, multilingual fidelity and evaluation fixtures. The current prototype performs manual entry only.
3. Prepare practitioner interview/pilot materials around terrorism evidence review, not only vulnerability triage. Founder must provide introductions and authorize outreach; no messages have been sent.
4. Use Sol 6.1 High for routine implementation and documentation after the design gate is settled. User has switched to Astra High and wants an explicit recommendation when to return to Sol.

## Persistent preferences

- Founder studies for GATE; assistant performs authorized research, implementation and tests during active runs. No unattended automation is configured.
- Check account usage and stop/checkpoint at 5% remaining relevant allowance; resume only when user instructs.
- No spending, contracts or outreach without specific authorization. No subagents authorized.
- Government cyber testing may be designed only for explicitly authorized systems/scope; the request to attack enemy systems was not accepted.
- No company incorporation, customer, funding award or government affiliation has been created.
