import { test, expect } from '@playwright/test';
// Unit tests for the /api/subscribe Pages Function itself (it only runs in the CF
// runtime, so the island specs mock it — these exercise its own logic in Node).
import { onRequestGet, onRequestPost } from '../functions/api/subscribe.js';

const ENV = {
  LISTMONK_URL: 'https://list.example.com',
  LISTMONK_API_USER: 'api',
  LISTMONK_API_TOKEN: 'tok',
  LISTMONK_LIST_ID: '3',
};
const readJson = async (resp: Response) => JSON.parse(await resp.text());
const postReq = (body: unknown) =>
  new Request('https://tj.test/api/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

test.describe('subscribe Pages Function (unit)', () => {
  test('GET is configured only when all env vars are valid', async () => {
    expect((await readJson(onRequestGet({ env: ENV }))).configured).toBe(true);
    expect((await readJson(onRequestGet({ env: {} }))).configured).toBe(false);
    // a non-numeric list id must read as unconfigured, never a broken configured:true
    expect((await readJson(onRequestGet({ env: { ...ENV, LISTMONK_LIST_ID: 'abc' } }))).configured).toBe(false);
    expect((await readJson(onRequestGet({ env: { ...ENV, LISTMONK_LIST_ID: '0' } }))).configured).toBe(false);
  });

  test('POST rejects an invalid email without calling Listmonk', async () => {
    let called = false;
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => { called = true; return new Response('{}'); }) as typeof fetch;
    try {
      const d = await readJson(await onRequestPost({ request: postReq({ email: 'nope' }), env: ENV }));
      expect(d).toEqual({ ok: false, reason: 'invalid' });
      expect(called).toBe(false);
    } finally { globalThis.fetch = orig; }
  });

  test('POST returns ok on a Listmonk 200', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => new Response('{}', { status: 200 })) as typeof fetch;
    try {
      expect((await readJson(await onRequestPost({ request: postReq({ email: 'a@b.com' }), env: ENV }))).ok).toBe(true);
    } finally { globalThis.fetch = orig; }
  });

  test('POST treats a Listmonk 409 (already subscribed) as success — no membership disclosure', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => new Response('{"message":"exists"}', { status: 409 })) as typeof fetch;
    try {
      expect((await readJson(await onRequestPost({ request: postReq({ email: 'a@b.com' }), env: ENV }))).ok).toBe(true);
    } finally { globalThis.fetch = orig; }
  });

  test('POST degrades to upstream on a Listmonk error', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => new Response('err', { status: 500 })) as typeof fetch;
    try {
      const d = await readJson(await onRequestPost({ request: postReq({ email: 'a@b.com' }), env: ENV }));
      expect(d).toEqual({ ok: false, reason: 'upstream' });
    } finally { globalThis.fetch = orig; }
  });

  test('POST reports unconfigured when env is unset', async () => {
    const d = await readJson(await onRequestPost({ request: postReq({ email: 'a@b.com' }), env: {} }));
    expect(d).toEqual({ ok: false, reason: 'unconfigured' });
  });
});
