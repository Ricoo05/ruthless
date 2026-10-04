# Local backend and browser storage

Implemented 4 October 2026. Browser storage connection is included in v0.14. This backend slice is local, synthetic-only and independent of static Sites hosting. It is executable software with automated boundary tests; it is not an agency deployment or an independently audited security system.

## Design decisions

Use one organization per service instance, database and root encryption key for the first customer deployment design. This reduces cross-organization coupling and leaves deployment location under customer control. Dedicated resources do not by themselves establish isolation: every repository operation also checks the server-provided tenant, workspace membership and action. This implementation exercises those checks locally. Deployment location, real identity provider and customer controls remain undecided.

Treat the browser, imported JSON, model output and client-supplied history as untrusted input. The existing workspace validator checks structure and internal links. It cannot establish source truth, reviewer identity or authorization. Backend storage therefore retains `reviewAuthority: client_assertions_only` even if a valid imported assessment says Reviewed. The local review command binds a configured reviewer to an exact stored revision; uploading a snapshot cannot perform that command. Real organizational identity verification remains future work.

Current local roles are deliberately small. A reader can retrieve an assigned workspace. An analyst can retrieve and save assigned workspaces. A reviewer can read assigned content and record a separate review decision, but cannot save snapshots. An auditor can inspect save receipts for assigned workspaces without reading source content. No implicit administrator, wildcard membership, role inheritance, account-creation endpoint or deletion endpoint exists. The configured server registry supplies roles and memberships; request headers and payload fields cannot grant them.

Authentication uses a replaceable adapter. `localTokenAuthenticator` matches a SHA-256 digest of a random 32-byte opaque bearer credential against configured, expiring grants. This proves possession of a configured local credential, not the real-world identity of a person. Production identity must come from a customer-approved identity provider using a maintained protocol library, with issuer/audience/signature/expiry checks and server-controlled memberships. Implementing bespoke passwords or a homemade token-signing protocol is outside this slice.

## Storage and audit contract

- SQLite transactions save a new encrypted version and its server receipt together. Old versions remain stored. A mandatory expected revision prevents a second writer from silently overwriting a newer save; failed writes leave the previous version and receipt count unchanged.
- AES-256-GCM encrypts workspace payloads with a fresh 96-bit nonce. Associated data binds each ciphertext to its organization, workspace and revision. HKDF derives distinct encryption and audit keys from the configured 32-byte root key and tenant context. Keys and bearer credentials never enter the database, output logs or source tree.
- HMAC-SHA-256 links server save receipts containing server-selected actor, UTC time, revision and encrypted-content digest. Source text, judgments, bearer credentials and client history are excluded from receipts. Database metadata and receipt metadata are plaintext; payload encryption is not whole-database encryption.
- Reads and writes verify the stored chain and ciphertext digests. Altered ciphertext, modified actors, removed individual receipts and mismatched records fail closed. A wrong key or tenant also fails against an initialized empty database.
- The chain has no independently retained head. An attacker able to replace both database tables with a valid earlier state can roll back the database undetected. An explicit regression test preserves this known limitation. External signed/anchored receipts, controlled backups and independently protected audit storage are required before claiming rollback protection.
- The save chain records successful saves; a separate review chain now records committed assessment decisions. Read, denied-access, identity lifecycle and administrative audit events remain future work. It is not a complete security-monitoring ledger.
- The local prototype caps the entire database at 64 saved versions, each subject to the existing 2 MB workspace bound. It verifies the bounded history synchronously; it is not designed for high throughput. At the cap, writes reject and existing data stays readable. There is no silent pruning.

Source labels marked synthetic are required for every stored document/evidence record. The server cannot prove that pasted text is fictional merely from that label. Use only the bundled fictional cases and authored test material during development.

## Run the complete demonstration

Requires Node.js 24 or newer and no installed packages or API key:

```powershell
node scripts/backend-demo.mjs
```

The demo creates temporary in-memory credentials and an encrypted temporary database, starts an ephemeral loopback HTTP server, rejects an unauthenticated read, saves the fictional workspace, rejects a stale overwrite, closes and reopens the database/server, and asserts exact recovered content plus a server save receipt. It prints only pass-result metadata. It then closes the server, clears its key buffer and removes its own temporary database. It does not retain user work, create a checkpoint, invoke AI or start an unattended service.

## Persistent local integration server

`node scripts/serve-backend.mjs` requires explicitly configured environment values:

- `RUTHLESS_TENANT_ID`: one identifier of up to 60 ASCII letters, digits, underscores or hyphens.
- `RUTHLESS_STORE_KEY_HEX`: a securely generated 32-byte root key encoded as 64 lowercase hexadecimal characters. Keep it outside the database and repository. Losing it loses access to encrypted versions; changing it does not rotate existing ciphertext.
- `RUTHLESS_LOCAL_GRANTS_JSON`: a JSON array of grants containing exactly `tokenHash`, `subject`, `tenantId`, `role`, `workspaceIds` and `expiresAt`. `tokenHash` is the lowercase SHA-256 hex digest of a random 32-byte credential encoded as base64url; `expiresAt` is Unix milliseconds. The caller retains the bearer credential separately. Grants must match the configured tenant. Never use the OpenAI API key for this purpose.
- Optional `RUTHLESS_BACKEND_PORT`, default 4174.

The server serves the browser and API at the same origin, binds only to IPv4 loopback and stores its database in ignored `.backend-runtime/workspaces.sqlite`. It rejects non-loopback endpoints, unexpected Host/Origin and cross-site fetch metadata. It exposes no CORS permission. Configuration failures use a generic error without echoing secret values. Restarting with a removed grant revokes that local credential; a production session/revocation service is not implemented. No persistent key or grant has been provisioned by this release.

Endpoints require the bearer credential in the Authorization header:

- `GET /api/session` returns only the configured subject, organization, role, assigned workspace IDs, expiry, local-adapter mode and storage mode. It does not return a credential.
- `GET /api/workspaces/{id}` returns the latest validated workspace, revision, ETag and unverified-client-review notice.
- `PUT /api/workspaces/{id}` accepts exactly `{ "workspace": <workspace> }`, JSON content type and `If-Match: "<revision>"`. Use revision zero for an initial save. The server reauthenticates after receiving the bounded request body and authorizes again at commit.
- `GET /api/workspaces/{id}/audit` returns scoped save receipts plus `reviewEvents` metadata to an auditor, without source content or review rationale.
- `GET /api/workspaces/{id}/reviews` returns separate decisions and encrypted-at-rest rationale to an assigned reader, analyst or reviewer. `current` is computed by comparing each decision with the latest workspace revision.
- `POST /api/workspaces/{id}/reviews` accepts exactly `{ "assessmentId": "...", "decision": "approve" | "reject", "note": "...", "sourcesConsidered": true }`, JSON content type and mandatory `If-Match: "<revision>"`. Only the reviewer role can execute it; authentication is repeated after receiving the body.

There is no public backend endpoint, provider execution route or real identity-provider integration. The hosted static Site continues to use manual workspace recovery. Serving these modules as static assets does not create a backend.

## Browser storage workflow

Open the configured server at `http://127.0.0.1:4174/`. Connect using the existing local workspace credential, not an OpenAI API key. The form clears immediately and the transport retains the credential only in memory; reload/disconnect removes it. No cookie, browser storage or cross-origin exception is introduced. Server-provided memberships populate the selector; UI controls do not grant permission. Static hosted origins cannot connect.

Inspect an assigned workspace to validate its schema and matching ETag. Inspection is read-only and does not change the current session or save precondition. Explicit loading binds the confirmed server revision; replacing unsaved applied work requires acknowledgement. A missing workspace requires separate explicit creation acknowledgement and revision zero; concurrent creation rejects. A reader can load but cannot save.

Save sends the applied workspace with the confirmed revision. The displayed revision advances only after a verified acknowledgement. A conflict retains edits and blocks further writes until the stored version is inspected and explicitly loaded for reconciliation. A network failure or invalid acknowledgement leaves the outcome unconfirmed and blocks blind retries. Expired credentials detach the server binding while retaining local work. Unapplied drafts must first be applied or discarded. Changing workspace selection or restoring manual JSON detaches the old binding; no autosave or automatic merge occurs.

The panel distinguishes temporary test storage from configured encrypted local storage. Browser QA uses `node tests/support/backend-preview.mjs --synthetic-ui-test`, an explicit test-only runner with public fixture credentials and an in-memory database. It is never used by the persistent runner or hosted Site; its work disappears when stopped. Persistent close/reopen recovery is separately exercised by the backend demo and tests.

## Next implementation slice

1. The same-origin browser transport and explicit storage workflow are delivered in v0.14. Preserve the loopback/origin boundaries and manual recovery when extending it.
2. The revision-bound review API is delivered locally; connect it to a browser comparison/review workflow when extending shared review. Keep imported Reviewed labels distinct from server decisions.
3. Select a customer identity provider and deployment environment only when a real pilot supplies those requirements. Add session lifecycle, comprehensive security events, key custody/rotation, external audit anchoring and tested encrypted backup restoration before any real organizational use.

The first design review, repository/API boundary and bounded browser implementation are complete. Sol 6.1 High remains suitable for implementation and test work. Return to Astra for review of the real identity-provider integration, session boundary and external audit/backup design.

## References and verification

The authorization design follows [OWASP deny-by-default and per-request enforcement guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html). Tenant selectors are not authorization proof; see [OWASP multi-tenant security guidance](https://cheatsheetseries.owasp.org/cheatsheets/Multi_Tenant_Security_Cheat_Sheet.html). Receipt-content minimization and the need for protected security logs are informed by [OWASP logging guidance](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html). The built-in database API is documented for the [tested Node.js 24.19 runtime](https://nodejs.org/download/release/v24.19.0/docs/api/sqlite.html); node:sqlite is a release-candidate API in that runtime and the implementation is a local prototype. The cryptographic primitives use the [Node.js crypto API](https://nodejs.org/docs/latest-v24.x/api/crypto.html). These references inform design choices; they do not certify this implementation.

Tests are in `tests/backend.test.mjs` and `tests/backend-client.test.mjs`. The transport tests cover verified responses, no blind writes/rebases, conflicts, unknown outcomes, late responses after disconnect, role restrictions, same-origin static serving and concurrent real HTTP writers. They cover credential expiry and immutable grants, default denial, roles and workspace/tenant isolation, encrypted close/reopen recovery, revision conflicts across database connections, atomic rollback on receipt failure, malformed/non-synthetic inputs, tampering, storage bounds, scoped receipts, HTTP origin/host/body/precondition checks and expiry while a request body is arriving. The valid-prefix rollback test documents the unimplemented external-anchor boundary explicitly.


## Local revision-bound review command — 5 October 2026

`node scripts/review-demo.mjs` exercises the API with authored fictional material and short-lived in-memory credentials. It saves a prepared assessment, rejects an analyst approval attempt, records the reviewer decision, rejects a duplicate, reopens the encrypted disk database, recovers the exact rationale, and proves that a subsequent identical workspace save makes the old decision stale. It performs no AI call, customer onboarding or permanent credential provisioning.

The command reads the stored workspace rather than a browser-submitted assessment. Approval requires its validated assessment workflow label to be Reviewed. Rejection can return a draft for changes. Both require an explicit source-consideration assertion and a nonblank rationale of at most 2,000 characters. Server identity, UTC time, workspace/assessment ID, exact revision and saved ciphertext digest bind the decision. Source-consideration assertions cannot prove a person actually reviewed the content or that the conclusion is correct.

One immutable approve/reject decision is permitted per assessment and saved revision. Conflicting or repeated decisions return 409; inspect the stored decisions after an uncertain response rather than treating a retry as a new approval. Any subsequent save invalidates current approval for every assessment in that workspace, even if its payload is unchanged or an unrelated case changed. This conservative policy avoids accidentally carrying approval over changed evidence. Historical decisions remain available. No snapshot or workspace status is mutated by review.

A subject who contributed any saved version of that workspace cannot decide it, including through a second configured credential with the same subject. This is broader than last-writer exclusion. Two subject labels can still belong to the same human; the local adapter cannot establish real-person separation. Memberships are server-configured. No reviewer grant has been provisioned outside isolated synthetic tests.

Schema 2 adds a separately sealed review ledger. Migration verifies legacy metadata, snapshots and save receipts before adding empty review tables in a transaction. Existing versions and actors are retained; invalid legacy data cannot be blessed by migration. Distinct HKDF-derived AES-GCM and HMAC keys protect encrypted rationale and review receipt metadata. Notes and receipts commit atomically. Review receipts link to the exact encrypted snapshot digest. The prototype caps decisions at 128 without pruning; save versions retain their separate cap of 64. The bounded chain is verified synchronously and is not a scalable production store.

The auditor receives receipt metadata and ciphertext digests without rationale. Metadata remains plaintext. Altered rationale, actors, decisions, version bindings and one-sided deletions fail closed. Complete valid-prefix rollback remains undetectable without an external anchor; this also includes removing an entire valid suffix of both review tables. An explicit regression test demonstrates that limitation. No claim of externally protected or certified approval history is made.

The review role/API is not yet supported in the browser connection profile; existing analyst/reader/auditor workflows remain unchanged. Real SSO, revocation, comprehensive security events, backup operations and protected audit anchoring remain prerequisites for production design.

Design references include [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) and [OWASP transaction-authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html), reviewed 5 October 2026. These inform server enforcement and binding decisions to the data reviewed; they do not certify this prototype.
