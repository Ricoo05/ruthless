# Reproduce a real RUTHLESS workflow

Requirements: Node 24.22.1, repository checkout, browser. No API key. Public network only needed for a fresh capture.

1. Run `node scripts/serve-research.mjs`. Open http://127.0.0.1:4181/#collection.
2. Choose Inspect retained public capture. It loads the genuine October 24 packaged observation, not a live feed or synthetic replacement.
3. Inspect exact retained passage and changes. Check the original source link, publisher update, capture and first-observed timestamps.
4. Set Known by (UTC) to 2026-10-24T10:46:31. Replay must show zero eligible observations. Return to latest restores the retained observation.
5. Acknowledge the passage and stage it. Open Document intake: one passage awaits review; it is not automatically accepted evidence. Do not represent an automated reviewer as an independent human.
6. For a live request, connect local journal and collect due official source. A new clone's journal starts empty. The first successful capture is baseline context; unchanged passages remain context. Failures are coverage gaps. A second immediate request must respect the hourly cooldown.
7. Stop with Ctrl+C. Captures persist locally, while browser workspace staging must be saved separately. Monitoring is opt-in and requires the running process.

Historical evidence: docs/screenshots/advisory-intake-2026-10-24.jpg is an actual UI capture from the October 24 walkthrough. That run had two real local captures and zero changed-guidance alerts. The packaged static example contains one October 24 capture and no private review notes. Neither proves prediction, accuracy or safety. No new browser walkthrough or recording has yet been completed in the November 2 portfolio audit. Follow these steps to record a current demonstration; do not use old screenshots as current test evidence.
