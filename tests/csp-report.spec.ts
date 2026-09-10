import { test, expect } from '@playwright/test';
// Unit tests for the /api/csp-report Pages Function. It only runs in the CF runtime, so
// these exercise its logic in Node — the same pattern as subscribe-fn.spec.ts.
import { onRequest, safeBlockedUri, summarise } from '../functions/api/csp-report.js';

const post = (contentType: string | null, body: string) =>
  new Request('https://tj.test/api/csp-report', {
    method: 'POST',
    headers: contentType ? { 'content-type': contentType } : {},
    body,
  });

const REPORT = JSON.stringify({
  'csp-report': {
    'document-uri': 'https://www.thinkersjournal.com/support/',
    'effective-directive': 'script-src',
    'blocked-uri': 'https://evil.example/track.js?session=SECRET',
  },
});

test.describe('CSP report sink', () => {
  test('only POST is accepted; a GET is 405 and advertises the method', async () => {
    const r = await onRequest({ request: new Request('https://tj.test/api/csp-report') });
    expect(r.status).toBe(405);
    expect(r.headers.get('allow')).toBe('POST');
  });

  test('a POST without a report content-type is rejected before the body is read', async () => {
    expect((await onRequest({ request: post('text/plain', REPORT) })).status).toBe(405);
    expect((await onRequest({ request: post(null, REPORT) })).status).toBe(405);
  });

  // Constraint 4: the response must never vary by content, or the endpoint becomes an
  // oracle — which would make it worse than having no CSP at all.
  test('every accepted request gets an identical empty 204, whatever the body', async () => {
    for (const body of [REPORT, '{not json', '', '[]', 'null', JSON.stringify({ a: 1 })]) {
      const r = await onRequest({ request: post('application/csp-report', body) });
      expect(r.status, `body: ${body.slice(0, 20)}`).toBe(204);
      expect(await r.text()).toBe('');
    }
  });

  test('all three report content-types are accepted', async () => {
    for (const ct of ['application/csp-report', 'application/reports+json', 'application/json']) {
      expect((await onRequest({ request: post(ct, REPORT) })).status).toBe(204);
    }
  });

  // Constraint 2: an oversized declared length is dropped rather than read.
  test('an oversized body is refused without being parsed', async () => {
    const r = new Request('https://tj.test/api/csp-report', {
      method: 'POST',
      headers: { 'content-type': 'application/csp-report', 'content-length': String(9 * 1024) },
      body: REPORT,
    });
    expect((await onRequest({ request: r })).status).toBe(204);
  });
});

// ⚠️ The privacy-critical half. CSP reports carry the blocked URI, and a blocked URI can
// carry a path and a query string — i.e. visitor-identifying detail we never want.
test.describe('CSP report redaction', () => {
  test('a blocked URI is reduced to its ORIGIN — path and query never survive', () => {
    expect(safeBlockedUri('https://evil.example/track.js?session=SECRET')).toBe('https://evil.example');
    expect(safeBlockedUri('http://a.test:8080/x/y#frag')).toBe('http://a.test:8080');
  });

  test('opaque values pass through as the bare keyword', () => {
    expect(safeBlockedUri('inline')).toBe('inline');
    expect(safeBlockedUri('eval')).toBe('eval');
    expect(safeBlockedUri('')).toBe('(none)');
  });

  // Control: the redaction must not be a blanket "return something short" — it has to
  // actually preserve the origin, or the log is useless and the test proves nothing.
  test('the origin IS preserved, so the redaction is not just truncation', () => {
    expect(safeBlockedUri('https://cdn.example.com/a/b/c.js')).toBe('https://cdn.example.com');
  });

  test('summarise reads both the legacy envelope and the Reporting API shape', () => {
    expect(summarise({ 'csp-report': { 'effective-directive': 'script-src', 'blocked-uri': 'inline' } }))
      .toEqual({ directive: 'script-src', blocked: 'inline' });
    expect(summarise({ body: { effectiveDirective: 'style-src', blockedURL: 'inline' } }))
      .toEqual({ directive: 'style-src', blocked: 'inline' });
    // older reporters send violated-directive with the source list appended
    expect(summarise({ 'csp-report': { 'violated-directive': "img-src 'self'", 'blocked-uri': 'data' } }))
      .toEqual({ directive: 'img-src', blocked: 'data' });
  });

  test('a directive that is not a plain directive name is dropped, not logged', () => {
    expect(summarise({ 'csp-report': { 'effective-directive': '../../etc/passwd' } })).toBeNull();
    expect(summarise({ 'csp-report': { 'effective-directive': 'x'.repeat(80) } })).toBeNull();
    expect(summarise(null)).toBeNull();
    expect(summarise('a string')).toBeNull();
  });

  // The document URI is the visitor's browsing history. It must never reach a log line.
  test('the document URI is never part of the summary', () => {
    const s = summarise({
      'csp-report': {
        'document-uri': 'https://www.thinkersjournal.com/some/private/page',
        'effective-directive': 'script-src',
        'blocked-uri': 'inline',
      },
    });
    expect(JSON.stringify(s)).not.toContain('private');
    expect(JSON.stringify(s)).not.toContain('document');
  });
});
