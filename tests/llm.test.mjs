// Tests for lib/llm.js and api/chat.js using a local fake AI provider. No network, no API key, no cost.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { chat, LLMError } from '../lib/llm.js';
import handler, { validateBody } from '../api/chat.js';

// Fake provider: replays a scripted list of {status, body} and records each request it receives.
function fakeProvider(script) {
  const seen = [];
  const srv = http.createServer((req, res) => {
    let b = ''; req.on('data', c => b += c); req.on('end', () => {
      seen.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(b) });
      const step = script[Math.min(seen.length - 1, script.length - 1)];
      res.statusCode = step.status; res.setHeader('content-type', 'application/json');
      res.end(typeof step.body === 'string' ? step.body : JSON.stringify(step.body));
    });
  });
  return new Promise(r => srv.listen(0, () => r({ srv, seen, base: `http://127.0.0.1:${srv.address().port}/v1` })));
}
const ok = (text, model = 'fake-1') => ({ status: 200, body: { model, choices: [{ message: { content: text } }] } });
const cfg = base => ({ baseUrl: base, apiKey: 'sk-test', model: 'm-main', modelFast: 'm-fast', maxTokens: 111 });
const noSleep = async () => {};
const msgs = [{ role: 'user', content: 'hello' }];

test('chat: sends OpenAI-style request and returns {text, model}', async () => {
  const p = await fakeProvider([ok('hi there')]);
  const r = await chat({ system: 'SYS', messages: msgs }, { config: cfg(p.base) });
  assert.deepEqual(r, { text: 'hi there', model: 'fake-1' });
  const q = p.seen[0];
  assert.equal(q.url, '/v1/chat/completions');
  assert.equal(q.auth, 'Bearer sk-test');
  assert.equal(q.body.model, 'm-main');
  assert.equal(q.body.temperature, 0.4);
  assert.equal(q.body.max_tokens, 111);
  assert.deepEqual(q.body.messages, [{ role: 'system', content: 'SYS' }, ...msgs]);
  p.srv.close();
});

test('chat: tier "quick" uses LLM_MODEL_FAST, falls back to LLM_MODEL when unset', async () => {
  const p = await fakeProvider([ok('a')]);
  await chat({ system: 's', messages: msgs, tier: 'quick' }, { config: cfg(p.base) });
  assert.equal(p.seen[0].body.model, 'm-fast');
  await chat({ system: 's', messages: msgs, tier: 'quick' }, { config: { ...cfg(p.base), modelFast: '' } });
  assert.equal(p.seen[1].body.model, 'm-main');
  p.srv.close();
});

test('chat: missing config -> missing_config naming the variables', async () => {
  await assert.rejects(chat({ system: 's', messages: msgs }, { config: { baseUrl: '', apiKey: '', model: '', modelFast: '', maxTokens: 1 } }),
    e => e.code === 'missing_config' && /LLM_BASE_URL.*LLM_API_KEY.*LLM_MODEL/.test(e.message));
});

test('chat: 404 -> model_not_found that names the env var to fix', async () => {
  const p = await fakeProvider([{ status: 404, body: { error: { message: 'models/m-main is not found' } } }]);
  await assert.rejects(chat({ system: 's', messages: msgs }, { config: cfg(p.base) }), e => e.code === 'model_not_found' && /LLM_MODEL\b/.test(e.message) && /m-main/.test(e.message));
  await assert.rejects(chat({ system: 's', messages: msgs, tier: 'quick' }, { config: cfg(p.base) }), e => e.code === 'model_not_found' && /LLM_MODEL_FAST/.test(e.message));
  p.srv.close();
});

test('chat: 429 retries twice with backoff, then succeeds', async () => {
  const p = await fakeProvider([{ status: 429, body: {} }, { status: 429, body: {} }, ok('finally')]);
  const waits = [];
  const r = await chat({ system: 's', messages: msgs }, { config: cfg(p.base), sleep: async ms => waits.push(ms) });
  assert.equal(r.text, 'finally'); assert.equal(p.seen.length, 3); assert.equal(waits.length, 2);
  p.srv.close();
});

test('chat: 429 forever -> rate_limited after exactly 2 retries', async () => {
  const p = await fakeProvider([{ status: 429, body: {} }]);
  await assert.rejects(chat({ system: 's', messages: msgs }, { config: cfg(p.base), sleep: noSleep }), e => e.code === 'rate_limited');
  assert.equal(p.seen.length, 3);
  p.srv.close();
});

test('chat: 500 and empty answers -> upstream_error', async () => {
  const p = await fakeProvider([{ status: 500, body: 'boom' }, ok('   ')]);
  await assert.rejects(chat({ system: 's', messages: msgs }, { config: cfg(p.base) }), e => e.code === 'upstream_error');
  await assert.rejects(chat({ system: 's', messages: msgs }, { config: cfg(p.base) }), e => e.code === 'upstream_error' && /empty/.test(e.message));
  p.srv.close();
});

test('validateBody: accepts good input, rejects bad shapes', () => {
  const good = { system: 'x', messages: [{ role: 'user', content: 'hi' }] };
  assert.equal(validateBody(good), null);
  assert.equal(validateBody({ ...good, tier: 'quick' }), null);
  assert.ok(validateBody({ ...good, tier: 'huge' }));
  assert.ok(validateBody({ system: '', messages: good.messages }));
  assert.ok(validateBody({ system: 'x', messages: [] }));
  assert.ok(validateBody({ system: 'x', messages: [{ role: 'system', content: 'hi' }] }));
  assert.ok(validateBody({ system: 'x', messages: [{ role: 'assistant', content: 'hi' }] })); // must start with user
  assert.ok(validateBody({ system: 'x', messages: Array.from({ length: 31 }, () => ({ role: 'user', content: 'a' })) }));
  assert.ok(validateBody({ system: 'x'.repeat(61 * 1024), messages: good.messages }));
});

// ---- the HTTP handler, end to end against a fake provider ----
async function appWith(script) {
  const prov = await fakeProvider(script);
  Object.assign(process.env, { LLM_BASE_URL: prov.base, LLM_API_KEY: 'sk-SECRET-123', LLM_MODEL: 'm-main' });
  const app = http.createServer(handler);
  await new Promise(r => app.listen(0, r));
  const post = (body, headers = {}) => fetch(`http://127.0.0.1:${app.address().port}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  return { prov, app, post, close() { prov.srv.close(); app.close(); } };
}

test('api/chat: success, wrong method, bad JSON, bad shape', async () => {
  const t = await appWith([ok('answer')]);
  const good = { system: 'S', messages: [{ role: 'user', content: 'hi' }] };
  const r = await t.post(good, { 'x-forwarded-for': '10.0.0.1' });
  assert.equal(r.status, 200); assert.deepEqual(await r.json(), { text: 'answer', model: 'fake-1' });
  const g = await fetch(`http://127.0.0.1:${t.app.address().port}/api/chat`); assert.equal(g.status, 405);
  assert.equal((await t.post('{not json', { 'x-forwarded-for': '10.0.0.2' })).status, 400);
  const bad = await t.post({ system: 'S', messages: 'nope' }, { 'x-forwarded-for': '10.0.0.2' });
  assert.equal(bad.status, 400); assert.equal((await bad.json()).error.code, 'bad_request');
  t.close();
});

test('api/chat: upstream failure never leaks the key or the upstream body', async () => {
  const t = await appWith([{ status: 500, body: 'UPSTREAM-SECRET-DETAILS key=sk-SECRET-123' }]);
  const r = await t.post({ system: 'S', messages: [{ role: 'user', content: 'hi' }] }, { 'x-forwarded-for': '10.0.0.3' });
  const txt = await r.text();
  assert.equal(r.status, 502);
  assert.ok(!/SECRET/.test(txt), 'response must not contain secrets');
  assert.equal(JSON.parse(txt).error.code, 'upstream_error');
  t.close();
});

test('api/chat: model_not_found and missing_config map to clear errors', async () => {
  const t = await appWith([{ status: 404, body: { error: { message: 'nope' } } }]);
  const r = await t.post({ system: 'S', messages: [{ role: 'user', content: 'hi' }] }, { 'x-forwarded-for': '10.0.0.4' });
  const j = await r.json(); assert.equal(r.status, 502); assert.equal(j.error.code, 'model_not_found'); assert.match(j.error.message, /LLM_MODEL/);
  delete process.env.LLM_API_KEY;
  const r2 = await t.post({ system: 'S', messages: [{ role: 'user', content: 'hi' }] }, { 'x-forwarded-for': '10.0.0.4' });
  assert.equal(r2.status, 503); assert.equal((await r2.json()).error.code, 'missing_config');
  t.close();
});

test('api/chat: per-IP rate limit (20/min) returns 429', async () => {
  const t = await appWith([ok('x')]);
  const body = { system: 'S', messages: [{ role: 'user', content: 'hi' }] };
  let last;
  for (let i = 0; i < 21; i++) last = await t.post(body, { 'x-forwarded-for': '10.9.9.9' });
  assert.equal(last.status, 429); assert.equal((await last.json()).error.code, 'rate_limited');
  assert.equal((await t.post(body, { 'x-forwarded-for': '10.8.8.8' })).status, 200); // other IPs unaffected
  t.close();
});
