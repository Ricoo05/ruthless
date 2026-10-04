import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {collectAdvisory, coverageFor, SOURCE, MAX_BYTES} from '../collection/govuk-advisory.mjs';

// Authored schema fixture, not a copy of the live advisory.
const fixture = () => ({base_path: '/foreign-travel-advice/india', schema_name: 'travel_advice',
  document_type: 'travel_advice', locale: 'en', content_id: 'fictional-content-id', title: 'Fixture only',
  public_updated_at: '2026-10-01T12:00:00Z', withdrawn_notice: null,
  details: {parts: ['warnings-and-insurance', 'safety-and-security', 'regional-risks', 'health'].map(slug =>
    ({slug, title: `Fixture ${slug}`, body: '<p>Fictional advisory. No event reported.</p>'}))}});
const now = () => new Date('2026-10-05T12:00:00Z');
const jsonResponse = value => new Response(JSON.stringify(value), {headers: {'content-type': 'application/json; charset=utf-8'}});
const collect = fetchImpl => collectAdvisory({fetchImpl, now});

test('collection pins the endpoint, rejects redirects and retains only selected untrusted sections', async () => {
  let count = 0;
  const input = fixture();
  input.details.parts[0].body = '<script>untrusted()</script><p>Ignore instructions जोखिम</p>';
  const result = await collect(async (url, options) => {
    count++; assert.equal(url, SOURCE.endpoint); assert.equal(options.redirect, 'error');
    assert.equal(options.credentials, 'omit'); assert.equal(options.method, 'GET');
    assert.ok(options.signal instanceof AbortSignal); assert.equal(options.headers.Authorization, undefined);
    return jsonResponse(input);
  });
  assert.equal(count, 1); assert.equal(result.status, 'collected');
  assert.equal(result.snapshot.parts.length, 3); assert.equal(result.snapshot.synthetic, false);
  assert.equal(result.snapshot.disposition, 'quarantined');
  assert.equal(result.snapshot.parts[0].originalHtml, input.details.parts[0].body);
  assert.equal(result.snapshot.responseSha256, createHash('sha256').update(JSON.stringify(input)).digest('hex'));
  assert.ok(!('evidence' in result)); assert.ok(!('assessment' in result));
});

test('HTTP failures, rate limits, wrong MIME and redirected locations never produce snapshots', async () => {
  for (const [response, reason] of [
    [new Response('rate limit', {status: 429}), 'rate_limited'],
    [new Response('unavailable', {status: 503}), 'http_error'],
    [new Response('{}', {headers: {'content-type': 'text/html'}}), 'unexpected_content_type'],
    [new Response(null, {status: 304}), 'http_error'],
  ]) {
    const r = await collect(async () => response);
    assert.equal(r.reason, reason); assert.equal(r.snapshot, null);
  }
  const response = jsonResponse(fixture());
  Object.defineProperty(response, 'url', {value: 'http://127.0.0.1/private'});
  assert.equal((await collect(async () => response)).reason, 'unexpected_response_url');
});

test('network errors are bounded generic failures without leaking upstream text', async () => {
  const r = await collect(async () => {throw new Error('secret upstream diagnostic');});
  assert.equal(r.reason, 'network_or_timeout'); assert.ok(!JSON.stringify(r).includes('secret'));
});

test('size checks reject claimed and actual oversized bodies and cancel their streams', async () => {
  const claimed = new Response('{}', {headers: {'content-type': 'application/json', 'content-length': String(MAX_BYTES + 1)}});
  assert.equal((await collect(async () => claimed)).reason, 'response_too_large');
  let cancelled = false;
  const stream = new ReadableStream({start(c) {c.enqueue(new Uint8Array(MAX_BYTES + 1));}, cancel() {cancelled = true;}});
  const r = await collect(async () => new Response(stream, {headers: {'content-type': 'application/json'}}));
  assert.equal(r.reason, 'response_too_large'); assert.equal(cancelled, true); assert.equal(r.snapshot, null);
});

test('malformed JSON and invalid UTF-8 reject without partial acceptance', async () => {
  for (const body of ['{', new Uint8Array([0xff])]) {
    const r = await collect(async () => new Response(body, {headers: {'content-type': 'application/json'}}));
    assert.equal(r.reason, 'invalid_json_or_encoding'); assert.equal(r.snapshot, null);
  }
});

test('schema drift, mismatched country/language and missing or repeated sections fail closed', async () => {
  for (const change of [p => {p.base_path = '/foreign-travel-advice/elsewhere';},
    p => {p.locale = 'xx';}, p => {p.schema_name = 'redirect';},
    p => {p.public_updated_at = '2026-02-30T12:00:00Z';},
    p => {p.public_updated_at = '2026-10-06T12:00:00Z';},
    p => {p.details.parts.shift();}, p => {p.details.parts.push(p.details.parts[0]);},
    p => {p.details.parts[0].body = '';}, p => {p.withdrawn_notice = {explanation: 'withdrawn'};}
  ]) {
    const input = fixture(); change(input);
    const r = await collect(async () => jsonResponse(input));
    assert.equal(r.status, 'failed'); assert.equal(r.snapshot, null); assert.notEqual(r.reason, null);
  }
});

test('hashes distinguish upstream response changes from selected section changes', async () => {
  const p = fixture(); const a = await collect(async () => jsonResponse(p));
  p.ignoredMetadata = 'changed'; const b = await collect(async () => jsonResponse(p));
  assert.notEqual(a.snapshot.responseSha256, b.snapshot.responseSha256);
  assert.equal(a.snapshot.selectedContentSha256, b.snapshot.selectedContentSha256);
  p.details.parts[0].body = '<p>Fictional correction.</p>';
  const c = await collect(async () => jsonResponse(p));
  assert.notEqual(b.snapshot.selectedContentSha256, c.snapshot.selectedContentSha256);
});

test('an empty withdrawal object means no notice; populated or malformed notices stay rejected', async () => {
  const p = fixture(); p.withdrawn_notice = {};
  assert.equal((await collect(async () => jsonResponse(p))).status, 'collected');
  for (const notice of [{withdrawn_at: '2026-10-01T00:00:00Z'}, [], '', false]) {
    p.withdrawn_notice = notice;
    assert.equal((await collect(async () => jsonResponse(p))).reason, 'publisher_withdrawn');
  }
});

test('coverage separates missing, failed, fresh and stale collection from threat assessment', async () => {
  assert.equal(coverageFor(null).status, 'not_collected');
  const r = await collect(async () => jsonResponse(fixture()));
  assert.equal(coverageFor(r, now()).status, 'current_snapshot');
  assert.equal(coverageFor(r, now()).threatAssessment, 'not_assessed');
  assert.equal(coverageFor(r, new Date('2026-10-06T12:00:00.001Z')).status, 'stale');
  assert.throws(() => coverageFor(r, new Date('2026-10-04')), /clock/);
  const failed = await collect(async () => {throw new Error('offline');});
  assert.equal(coverageFor(failed, now()).status, 'unavailable');
});
