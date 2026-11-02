# Security review — 2 November 2026

This is an engineering review, not certification.

The pre-change reachable history contained 504 blobs with no matches for the scanner's OpenAI/GitHub token, private-key or credential-URL patterns. `scripts/scan-secrets.mjs` repeats this bounded local scan without printing matched values. This does not detect every secret format or prove absence of credentials. Ignored .env.local, runtime SQLite, media ledgers and installed dependencies are excluded from Git. The scanner itself requires Git and bounds object output to 128 MiB, failing on overflow.

CI uses read-only contents permission, pinned official action commits, timeouts, no pull_request_target trigger and no API keys. It executes all declared test files. Dependabot checks workflow references and the optional semantic package monthly; no blind dependency upgrades are made. No paid security service or public backend is enabled. Dependency-update automation is not a vulnerability scan. CodeQL and container scanning have not been configured or claimed successful.

Important residual risks: plaintext public journal and reviewer notes; no authenticated real reviewer identity or real-data RBAC; no external audit anchor; full privileged rewrite/rollback outside hash-chain protection; unbenchmarked bounded full-journal verification. Public sources can contain incorrect claims. The separate encrypted workspace backend intentionally rejects real documents. See SECURITY.md and the existing milestone report.

Main app has no external runtime dependency tree. The optional pnpm audit found three high-severity sharp advisories at 0.34.5. A scoped override to 0.35.5 was installed; its native version was verified, and the full 64-text inference experiment completed again. The final audit reported zero known advisories across 80 dependencies. A frozen-install/audit CI job now checks the optional dependency tree. No global zero-vulnerability or comprehensive legal-compliance claim is supported. RIGHTS_AND_ATTRIBUTION.md documents asset/source provenance without inventing a project-wide open-source license. The owner authorized public access on 2 November 2026.
