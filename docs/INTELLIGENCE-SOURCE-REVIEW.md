# Official India advisory source review

Verified 24 October 2026. This review supports **official India terrorism advisory change review**, not attack forecasting. No paid API calls, person investigations, or messages to publishers were performed.

## GOV.UK: operational current-content source

An actual GET to <https://www.gov.uk/api/content/foreign-travel-advice/india/safety-and-security> returned HTTP 200, application/json, 123,115 bytes, CORS `*`, a weak ETag, and `Cache-Control: public, max-age=10`. The travel-advice response contains six current guide parts, including `safety-and-security`, and 257 change-history notes. The whole-guide API <https://www.gov.uk/api/content/foreign-travel-advice/india> also returned HTTP 200.

Observed metadata:

- `public_updated_at`: `2026-10-07T16:26:27+05:30`.
- `details.reviewed_at` and `details.updated_at`: `2026-10-07T10:56:27Z`.
- Top-level `updated_at`: `2026-10-19T13:54:51+05:30`.
- Latest change description: general accuracy review and minor amendments across several sections; not a newly issued imminent-attack warning.

The current terrorism section contains standing national advice. Its presence does not establish a new threat, a specific imminent incident, or independent evidence of a detector's predictive performance. Capture exact text and identify which source passage changed before creating a change-review candidate. A first capture establishes baseline context.

[Official API reference](https://content-api.publishing.service.gov.uk/reference.html) explains that `public_updated_at` normally represents publication of a major edition; `updated_at` can change because dependent links changed. Never label the latter as a new security warning. Publisher edition time is also distinct from collection time, first server observation, and event time.

[Official Content API documentation](https://content-api.publishing.service.gov.uk/) states that the API requires no authentication, is beta, serves current published GOV.UK content, and has a maximum rate of ten requests per second per client. An hourly watcher is comfortably below that ceiling. Respect caching and backoff rather than interpreting this ceiling as a desired collection rate.

[India advice](https://www.gov.uk/foreign-travel-advice/india) states Open Government Licence v3.0 applies except where otherwise stated. Retain attribution, source URL, and the [licence link](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/). The licence document itself returned HTTP 403 through the web tool during this review; the public GOV.UK footer was accessible. This does not grant rights to unrelated third-party content or imply government endorsement.

## Historical snapshots and evaluation limits

The current response's change-history entries provide dated notes, **not previous section bodies**. Its initial 2013 publication date does not establish that current wording was available in 2013. Do not reconstruct historical pre-event evidence from today's page, current article text, or a later corrected timestamp.

[FCDO guidance on previous versions](https://www.gov.uk/guidance/about-foreign-commonwealth-development-office-travel-advice#previous-versions-of-travel-advice) links to the UK National Archives. Official Content API documentation also directs historical requests there. Actual requests to the National Archives wildcard index for India's safety-and-security page and a CDX lookup returned HTTP 405. The web tool could not retrieve those index pages. **No historical snapshot body was verified.** This records an access limitation; it does not assert that the archive has no copies.

Therefore retain new server snapshots prospectively. Historical evaluation needs genuine dated pre-cutoff bodies and separately reviewed monitoring-interval outcomes before metrics can be claimed. Current-source captures can demonstrate collection and source-cited review but cannot retrospectively prove prediction.

[FCDO methodology](https://www.gov.uk/guidance/about-foreign-commonwealth-development-office-travel-advice) describes advice primarily for British nationals, based on multiple evidence sources, and says significant incidents may trigger rapid updates. These updates can occur after an event. It is not a comprehensive Indian incident registry. A standing warning followed by an incident is not, by itself, a successful prediction.

## CERT-In: separate cyber workflow and permission dependency

The [public advisory listing](https://www.cert-in.org.in/s2cMainServlet?pageid=PUBADVLIST) timed out in both the web tool and a 15-second direct GET. Direct homepage and robots requests each timed out after 25 seconds. The web tool did retrieve [CIAD-2025-0048](https://www.cert-in.org.in/s2cMainServlet?VLCODE=CIAD-2025-0048&pageid=PUBVLNOTES02), which supplies an original issue date of 5 December 2025 and concerns reported Apple spyware notifications. An individual advisory's footer update date must not replace its original issue date.

No official RSS endpoint was verified. The [official subscription page](https://www.cert-in.org.in/s2cMainServlet?pageid=SUBMAIL001) describes a mailing-list form. No subscription was created, no contact message was sent, and no publisher permission has been acquired.

The [CERT-In copyright policy](https://www.cert-in.org.in/s2cMainServlet?pageid=COPYRIGHTPOCY) requires proper permission by email before reproduction, accurate context, and prominent acknowledgment. Permission does not extend to identified third-party material. This is a concrete dependency before reproducing advisory bodies in RUTHLESS; public accessibility alone does not resolve these reuse terms. Outbound source references remain suitable while permission and collection policy are reviewed.

The [archival policy](https://www.cert-in.org.in/s2cMainServlet?pageid=CAPOLICY) says expired material is archived. It does not document an openly accessible historical feed or demonstrate availability of pre-event snapshots.

CERT-In advisories concern cybersecurity. Keep them in the cyber advisory workflow; a software vulnerability, malware warning, or spyware report cannot itself substantiate a terrorism warning. No CERT-In source should be represented as an integrated real-time terrorism feed on the basis of this review.

## Evaluation protocol

`evaluateIntelligenceReplay` scores already-generated **changed-guidance** candidates against independently reviewed, complete monitoring intervals. `baseline_context` candidates never count as warnings. A transparent comparison alerts on any `analysis.pageChanged` observation over the same eligible intervals.

The protocol requires `developmentEnd < evaluationStart <= evaluationEnd`. Eligibility uses first server observation, capture time, and publisher edition time; late collection cannot be backdated. Label intervals are half-open `[start, end)`, so adjacent intervals do not double-count observations. Incomplete or unlabelled intervals are not negatives; intervals with no eligible successful observations are coverage gaps and are excluded. A successfully retrieved page with a missing or unconfirmed terrorism section is also a topic coverage gap. Partial collection failures within otherwise observed intervals remain visible in results.

Report exact sample sizes, exclusions, review workload, and interval confusion counts. Publisher-edition age at observation can be calculated, but is not event lead time or proven publication-delivery latency. No attack prediction metrics or confidence calibration are emitted. The tool cannot independently guarantee that labels are independent, that developers did not tune against evaluation cases, or that an evaluation set remained untouched.
