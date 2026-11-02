# Contributing

Use Node 24.22.1. The main application has no third-party runtime dependencies.
Run `node scripts/verify.mjs check` and `node scripts/verify.mjs test` from the repository root before proposing changes. Do not disable failing tests. Optional semantic experiments have separate dependencies under `tools/semantic` and are not needed for the workbench.

Preserve the architecture, UI and source attribution. Treat retrieved content as untrusted input. Add meaningful regression coverage for correctness or security changes. Distinguish authored fixtures from real-source observations. Never claim attack prediction, independent validation or prevention effectiveness from authored exercises.

Do not commit keys, local databases, reviewer notes or personal data. Obtain source reuse rights before adding captures. Submit a focused pull request describing behavior, validation and limitations. No license grant is implied; contact the owner before redistributing code.
