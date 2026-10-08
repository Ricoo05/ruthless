# Real public-source collection — v0.28

Ruthless remains the existing dependency-free JavaScript web application. No desktop, voice or new model service was invented. The supplied master prompt was reviewed; its seven-tool personal-profile/media aggregation pipeline is not implemented. The scope here is bounded public advisory and event-news research.

## Sources and operation

- GOV.UK Content API: fixed country allowlist (India, Pakistan, Bangladesh, Nepal, Sri Lanka, United Arab Emirates), English travel advice, up to three selected sections. Live browser fetch with publisher URL, publisher-update time and retrieval time. Source policy: https://www.gov.uk/help/reuse-govuk-content ; API: https://content-api.publishing.service.gov.uk/ . Attribution and Open Government Licence v3.0 are shown with retained passages. This is one publisher's advice, not independently corroborated incident intelligence.
- GDELT DOC API: selected country text plus a fixed public-safety, disaster or cybersecurity topic; seven days, up to 20 links, date-descending results. No free-text identity searches, images or article-body downloads. Documentation: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/ . First-seen timestamps are explicitly distinguished from publication and event time. The initial live check returned HTTP 429; this is a configured adapter with availability dependent on the provider, not a guaranteed working news feed.

Requests are user initiated, omit cookies and referrers, reject redirects, time out after 20 seconds and bound responses to 2 MB including streamed bodies. The UI allows only one active request, cancellation and a 30-second interval per provider. There are no automatic retries, proxy workarounds, paid API calls, browser uploads or background schedules. A failed attempt retains any previous successful capture with its original timestamp. New results are empty until fetched; fabricated fallback data is never generated.

## Review and storage

Root opens Public-source OSINT. New workspaces contain one empty research case and zero source/evidence records. Existing explicit training exercises remain available in their named research views. Existing workspace files retain format version 8.

Official-advisory HTML is parsed in an inert template; only escaped plain text is rendered. Analyst-selected exact passages are staged as `synthetic:false` documents, with source URL, publisher group, advisory-update date, capture time and licence attribution. Staging requires an explicit source/reuse acknowledgement. It does not accept the passage as evidence, identify a threat or send real material to the synthetic-only AI/local-backend paths. Those existing gates remain in place.

Captures remain in session memory. Users can download JSON, CSV or inert HTML reports. CSV formula prefixes are neutralized; HTML escapes source markup and restricts active content. Full capture re-import is not implemented. Staged documents use the existing workspace save/paste/restore workflow. Retained capture authenticity is not cryptographically authenticated; downloaded JSON is editable.

## Files and limits

`dist/osint-core.mjs` implements provider dispatch, source-specific validation, input/URL bounds, bounded fetching, empty research workspace creation and exact-passage staging. `dist/osint-app.mjs` implements controls, request state, cancellation, failure retention, source review and export actions. `dist/osint-export.mjs` implements JSON/CSV/HTML report serialization. The frontend and local static server allow connections only to their existing same-origin endpoints plus the two configured public API origins.

This is limited source collection. No personal social-account discovery, image harvesting, facial matching, private contact collection, precise person locations, military targeting, seven-provider orchestration, voice integration or production multi-user backend is supplied. Public news results can be irrelevant, duplicated beyond URL equivalence, incorrectly dated or absent. Country mentions do not establish event locations. No matching reports does not establish safety.
