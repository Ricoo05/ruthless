# CI validation

Workflow: Verify RUTHLESS (`.github/workflows/verify.yml`). Triggers: main pushes, pull requests, manual dispatch. Jobs: Node 24.22.1 on Ubuntu and Windows. Full regression suite, syntax checks and reachable-history credential-pattern scan. Official actions pinned to immutable commits verified through the GitHub API on 2 November 2026. No failure suppression, API credentials or privileged PR trigger.

Local baseline: 415 tests pass, zero skips/failures. Local syntax wrapper passed. Remote run status is pending publication and must be checked; local success alone does not establish GitHub success. An Actions run URL and exact SHA will be added after an actual run completes. No badge claims success before that result.

Environmental caveat: an earlier Windows test reported inability to create a file symlink. The branch is not certified by a passing total. Optional local semantic inference and public-provider availability are outside this CI matrix.
