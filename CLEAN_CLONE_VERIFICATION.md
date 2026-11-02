# Clean-clone verification

PUBLIC FOLLOW-UP: Anonymous clone at 582617f succeeded with credential helpers disabled and GIT_TERMINAL_PROMPT=0. From that new directory, all 415 tests passed, zero skipped/failed. No API key or private journal was copied. The public API independently returned private=false without authentication. This supersedes the private-access limitation below. Optional dependency/native model validation is documented in SECURITY_REVIEW.md; Docker is checked in remote CI.

PASS — Authenticated GitHub clone at `77e45784921fdf6bec5134cea280c974ab26e913` into a new directory `ruthless-clean-77e4578`, separate from the development checkout. No .env.local, runtime databases or node_modules were copied. Node 24.22.1 was the only application runtime used; no npm install was required.

Executed from the clean directory: `node scripts/verify.mjs check`, then `node scripts/verify.mjs test`: 415 passed, zero skipped/failed. Started `node scripts/serve-research.mjs` with the documented RUTHLESS_RESEARCH_PORT override of 4183 to avoid another local session. HTTP / returned 200; packaged real capture JSON returned 200 with one observation and zero private review notes. The actual local API returned an empty fresh journal and integrity=true. Foreign-origin POST was rejected with 403. No paid calls or live source requests occurred.

Browser verification from the clean service: retained capture loaded, pre-observation replay showed zero records, Return to latest restored one, acknowledgement/staging produced one document awaiting review with zero accepted evidence. Console warnings/errors: none observed. Evidence: docs/screenshots/clean-clone-intake-2026-11-02.jpg and clean-clone-source-2026-11-02.jpg. The owned preview process was stopped after checks. This is a clean authenticated clone, not an independent human audit or anonymous-public verification.

The repository is private. An authenticated clean clone can verify code reproducibility, but unauthenticated recruiter access remains BLOCKED until explicitly approved public publication. Docker execution is BLOCKED because Docker is unavailable. No unexecuted check is marked PASS.
