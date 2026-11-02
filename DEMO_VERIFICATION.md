# Reproduce a real RUTHLESS workflow

Public portfolio source: https://github.com/Ricoo05/ruthless, anonymous access verified on 2 November 2026. `docker compose up --build --wait` is a restricted static preview with retained-capture review only; it does not run the strict loopback journal API. Use the full Node workflow below for collection and persistence. Docker CI tests the full core suite separately and checks that the static preview's API route returns 404. No hosted backend or current-incident prediction is implied.

Requirements: Node 24.22.1, repository checkout, browser. No API key. Public network only needed for a fresh capture.

1. Run `node scripts/serve-research.mjs`. Open http://127.0.0.1:4181/#collection.
2. Choose Inspect retained public capture. It loads the genuine October 24 packaged observation, not a live feed or synthetic replacement.
3. Inspect exact retained passage and changes. Check the original source link, publisher update, capture and first-observed timestamps.
4. Set Known by (UTC) to 2026-10-24T10:46:31. Replay must show zero eligible observations. Return to latest restores the retained observation.
5. Acknowledge the passage and stage it. Open Document intake: one passage awaits review; it is not automatically accepted evidence. Do not represent an automated reviewer as an independent human.
6. For a live request, connect local journal and collect due official source. A new clone's journal starts empty. The first successful capture is baseline context; unchanged passages remain context. Failures are coverage gaps. A second immediate request must respect the hourly cooldown.
7. Stop with Ctrl+C. Captures persist locally, while browser workspace staging must be saved separately. Monitoring is opt-in and requires the running process.

Historical evidence: docs/screenshots/advisory-intake-2026-10-24.jpg is an actual UI capture from the October 24 walkthrough. That run had two real local captures and zero changed-guidance alerts. The packaged static example contains one October 24 capture and no private review notes. Neither proves prediction, accuracy or safety.

November 2 clean-clone browser execution: steps 1–5 passed using the dated real packaged capture; before-observation replay returned zero and latest restored one. Staging produced one awaiting-review document and zero accepted evidence. No console errors/warnings observed. Current screenshots: docs/screenshots/clean-clone-intake-2026-11-02.jpg and clean-clone-source-2026-11-02.jpg. Live external collection was not repeated during this portfolio audit. API fresh-journal and foreign-origin denial checks also passed. The preview process was stopped. A recording tool was unavailable; the exact steps above can be used to record a real walkthrough without fabricated frames.
