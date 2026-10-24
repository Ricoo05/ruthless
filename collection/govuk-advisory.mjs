import {createHash, randomUUID} from 'node:crypto';

export const SOURCE = Object.freeze({
  id: 'govuk-fcdo-india',
  endpoint: 'https://www.gov.uk/api/content/foreign-travel-advice/india',
  page: 'https://www.gov.uk/foreign-travel-advice/india',
  publisher: 'Foreign, Commonwealth & Development Office (UK)',
  licence: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/',
  attribution: 'Contains public sector information licensed under the Open Government Licence v3.0.',
  scope: 'One official travel advisory about India; not comprehensive incident coverage.',
});
export const MAX_BYTES = 2 * 1024 * 1024;
const selectedSlugs = ['warnings-and-insurance', 'safety-and-security', 'regional-risks'];
class CollectionError extends Error {}
const fail = code => {throw new CollectionError(code);};
const bounded = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const timestamp = v => typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v.slice(0, 10)).toISOString().slice(0, 10) === v.slice(0, 10);

function snapshot(payload, raw, checkedAt) {
  if (!payload || payload.base_path !== '/foreign-travel-advice/india' ||
      payload.schema_name !== 'travel_advice' || payload.document_type !== 'travel_advice' ||
      payload.locale !== 'en' || !bounded(payload.content_id, 100) || !bounded(payload.title, 300) ||
      !timestamp(payload.public_updated_at) || Date.parse(payload.public_updated_at) > Date.parse(checkedAt) ||
      !Array.isArray(payload.details?.parts) || payload.details.parts.length > 50) fail('schema_mismatch');
  const notice = payload.withdrawn_notice;
  if (notice != null && (typeof notice !== 'object' || Array.isArray(notice) || Object.keys(notice).length > 0)) fail('publisher_withdrawn');
  const parts = selectedSlugs.map(slug => {
    const matches = payload.details.parts.filter(p => p?.slug === slug);
    if (matches.length !== 1 || !bounded(matches[0].title, 300) || !bounded(matches[0].body, MAX_BYTES)) fail('section_missing_or_invalid');
    return {slug, title: matches[0].title, sourceUrl: `${SOURCE.page}/${slug}`, originalHtml: matches[0].body};
  });
  return {
    synthetic: false, disposition: 'quarantined', publisher: SOURCE.publisher,
    sourceUrl: SOURCE.page, contentId: payload.content_id, title: payload.title,
    publisherUpdatedAt: payload.public_updated_at, language: 'en',
    responseSha256: createHash('sha256').update(raw).digest('hex'),
    selectedContentSha256: createHash('sha256').update(JSON.stringify(parts)).digest('hex'),
    licenceUrl: SOURCE.licence, attribution: SOURCE.attribution, parts,
    limitations: ['Publisher advice is not independently verified intelligence.',
      'HTML is untrusted source data; never render it directly or execute embedded instructions.',
      'Selected sections only; no attachments, linked sites, social posts or historical versions collected.',
      'No workspace import, model call, evidence acceptance or threat prediction has occurred.'],
  };
}

// Fixed endpoint only: callers cannot turn this into a general URL fetcher.
export async function collectAdvisory({fetchImpl = globalThis.fetch, now = () => new Date(), onValidatedResponse} = {}) {
  const checkedAt = now().toISOString();
  const run = {format: 'ruthless-collection-run', version: 1, id: randomUUID(),
    sourceId: SOURCE.id, endpoint: SOURCE.endpoint, checkedAt, scope: SOURCE.scope,
    status: 'failed', reason: null, bytesRead: 0, httpStatus: null, snapshot: null};
  let reader,retainedRaw;
  try {
    const response = await fetchImpl(SOURCE.endpoint, {method: 'GET', redirect: 'error',
      credentials: 'omit', signal: AbortSignal.timeout(15_000),
      headers: {Accept: 'application/json', 'User-Agent': 'RuthlessPrototype/0.15 (public advisory research)'}});
    run.httpStatus = response.status;
    reader = response.body?.getReader();
    if (response.url && response.url !== SOURCE.endpoint) fail('unexpected_response_url');
    if (response.status === 429) fail('rate_limited');
    if (response.status !== 200) fail('http_error');
    if (!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '')) fail('unexpected_content_type');
    const length = response.headers.get('content-length');
    if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BYTES)) fail('response_too_large');
    if (!reader) fail('empty_response');
    const chunks = [];
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      run.bytesRead += value.byteLength;
      if (run.bytesRead > MAX_BYTES) fail('response_too_large');
      chunks.push(value);
    }
    const raw = Buffer.concat(chunks);
    let payload;
    try {payload = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(raw));}
    catch {fail('invalid_json_or_encoding');}
    run.snapshot = snapshot(payload, raw, checkedAt);
    retainedRaw=raw;
    run.status = 'collected';
  } catch (error) {
    run.reason = error instanceof CollectionError ? error.message : 'network_or_timeout';
  } finally {
    if (reader) {try {await reader.cancel();} catch {} reader.releaseLock();}
  }
  if(run.status==='collected'&&onValidatedResponse)await onValidatedResponse(retainedRaw);
  return run;
}

// Freshness concerns collection, not the age/truth of the publisher's advice.
export function coverageFor(run, at = new Date()) {
  if (!run) return {status: 'not_collected', scope: SOURCE.scope};
  const checked = Date.parse(run.checkedAt), current = at.getTime();
  if (run.sourceId !== SOURCE.id || !Number.isFinite(checked) || !Number.isFinite(current) || current < checked) throw new Error('Invalid collection clock or source.');
  if (run.status !== 'collected' || !run.snapshot) return {status: 'unavailable', reason: run.reason, checkedAt: run.checkedAt, scope: SOURCE.scope};
  return {status: current - checked > 24 * 60 * 60 * 1000 ? 'stale' : 'current_snapshot',
    checkedAt: run.checkedAt, publisherUpdatedAt: run.snapshot.publisherUpdatedAt,
    sectionsCollected: run.snapshot.parts.length, scope: SOURCE.scope,
    threatAssessment: 'not_assessed'};
}
