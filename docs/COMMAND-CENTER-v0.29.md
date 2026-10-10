# Command center and live-source review — v0.29

## What changed

The existing buildless application, workspace format, backend integrations and analytical modules are retained. A shared obsidian/graphite/silver design layer now covers all seven HTML entry points, with responsive navigation, keyboard command search (Ctrl/Cmd+K), accessible dialogs, reduced-motion support and the user-approved engraved Divine Sovereign emblem. Navigation returns the main workspace to the top when switching views.

The default view is Global intelligence watch. Five bounded adapters collect GDELT headlines, GOV.UK India advisory sections, CISA's official KEV mirror, USGS M4.5+ daily earthquakes and NASA EONET open natural events. News scope includes worldwide and 18 countries. The actual capture counts power the collection graph and filters. Request outcomes power the activity log. Refresh intervals are 5–60 minutes; failures retain prior results and impose provider-wide backoff within the tab. Monitoring runs only while the view is visible. Recent public captures can persist in browser storage and are explicitly marked restored, without invented network activity.

Selected records enter the existing Document intake workflow with attribution, source/time meaning and SHA-256 provenance. Normalized publisher metadata is distinguished from verbatim passages. Staging does not approve evidence. Hashes and local history are not authentication or a signed audit trail.

Media review searches the real NASA image/video archive, with 12 bounded results per request. Publisher dates, descriptions and credits remain visible. Videos use supported small/mobile MP4 assets, native playback and up to three selected still frames. There is no audio analysis or whole-video inference. NASA keyword searches may include unrelated planetary imagery; review the source before selecting it.

## Local selected-media AI

Run Node 24 or later:

```powershell
node scripts/serve-research.mjs --enable-media-ai
```

Open http://127.0.0.1:4181/. The existing ignored `.env.local` supplies the server-only key. Omitting the flag disables AI. No automatic paid calls occur. Explicitly selected public incident PNG frames, source URL/title and playback times go to the pinned `gpt-4.1-mini-2025-04-14` model with no tools and `store:false`.

The 2026-10-10 authorization is up to $1 total for public incident media. A durable, exclusively locked `.media-runtime/budget.json` reserves $0.05 before each attempt, including failures, and fails closed at $1. Do not reset or delete this ledger to extend authorization. Frames are at most 768 pixels per dimension; output is bounded to 2,000 tokens. The static hosted site supports discovery and manual review, but has no media AI endpoint. No secret or budget state is published.

## Verification on 2026-10-10

- 354 automated tests passed after the session's filesystem restrictions were lifted; the formerly blocked directory-symlink fixture then passed unchanged.
- 78 module syntax checks passed before final documentation; final packaging repeats checks for changed modules.
- Live browser collection returned 266 retained real records: GOV.UK 3, CISA 200, USGS 54 and EONET 9. GDELT failed visibly; no substitute data was supplied. Counts and availability are time-dependent.
- A real NASA archive image, PIA20364 (2016), was selected and analyzed through the local API. The frame-linked draft described visible water/land patterns and uncertainty. Estimated API cost was $0.000679; $0.05 reserved. This was an archival media-analysis check, not detection of a current event or independent verification of its interpretation.
- Desktop 1440×1000 and mobile 390×844 checks showed no horizontal document overflow. Mobile navigation and filtered command search worked. Real source filtering and GOV.UK advisory staging into existing intake were checked. The existing detection console still runs on an empty real-source workspace and reports missing coverage.
- Approved emblem loads at 1024×1536 in its full-size dialog. It is generated artwork; no claim of human authorship is made.
- The real NASA archive video “Southeast India Flooding, Dec. 2015” loaded as a 640×360, 42.8-second MP4. Native playback and selection of a frame at 13.69 seconds worked; its timestamp survived rerendering. A regression test covers legacy NASA HTTP asset links being upgraded only on the exact approved host.

## Remaining limits

This release is a research implementation, not a validated predictive intelligence or misinformation-detection system. It does not crawl every website, connect all social platforms/CCTV, run unattended investigative agents, track people, infer criminal intent or provide autonomous attack prevention. Broader lawful connectors, recursive topic research, independently evaluated corroboration and authenticated durable multi-user operations remain future work. Existing explicitly labeled fictional exercises remain separate from real-source collection.
