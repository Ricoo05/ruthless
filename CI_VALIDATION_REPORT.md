# CI validation

Workflow: Verify RUTHLESS (`.github/workflows/verify.yml`). Triggers: main pushes, pull requests, manual dispatch. Jobs: Node 24.22.1 on Ubuntu and Windows. Full regression suite, syntax checks and reachable-history credential-pattern scan. Official actions pinned to immutable commits verified through the GitHub API on 2 November 2026. No failure suppression, API credentials or privileged PR trigger.

Local baseline and clean clone: 415 tests pass, zero skips/failures in each run. Local syntax wrapper passed. Actual remote run [41427844978](https://github.com/Ricoo05/ruthless/actions/runs/41427844978) completed SUCCESS at source commit `77e45784921fdf6bec5134cea280c974ab26e913`. Both Ubuntu and Windows jobs passed their syntax, reachable-history scan and all 415 tests; logs report zero skipped. These are 415 distinct declared tests executed on two operating systems, not 830 different tests. Workflow syntax was accepted and executed by GitHub. Documentation follow-up commits trigger new runs; consult the branch badge/current Actions page for their status.

No branch protection/required-check rule is configured or claimed. Private-repository plan support and the owner's preferred contribution policy require separate evaluation. No heavy paid benchmark or security service was enabled.

Environmental caveat: an earlier Windows test reported inability to create a file symlink. The branch is not certified by a passing total. Optional local semantic inference and public-provider availability are outside this CI matrix.

Follow-up: GitHub emitted Node 20 runtime deprecation notices for the original pinned v4 workflow actions. Replaced them with verified immutable official v6 action references and fixed runner labels to ubuntu-24.04 and windows-2025. A new actual run is required for this workflow revision; its result is available from the branch badge/Actions page. No application logic changed.
