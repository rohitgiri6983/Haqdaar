/* POST /api/chat  ->  {text, model}  or  {error:{code, message}}
   Plain Node (req, res) handler: works as a Vercel function and under dev-server.mjs.
   Privacy rules: never log message contents; never return the API key or raw upstream errors. */
import { chat, LLMError } from '../lib/llm.js';

const MAX_BYTES = 60 * 1024;   // total size of system + messages
const MAX_TURNS = 30;
const RATE_LIMIT = 20;         // requests per IP per minute (best effort: memory is per server instance)
const WINDOW_MS = 60 * 1000;
const hits = new Map();        // ip -> [timestamps]

function clientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xf || (req.socket && req.socket.remoteAddress) || 'unknown';
}
function rateLimited(ip, now = Date.now()) {
  const recent = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < WINDOW_MS)) hits.delete(k); // keep memory bounded
  return recent.length > RATE_LIMIT;
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(obj));
}
const fail = (res, status, code, message) => send(res, status, { error: { code, message } });

async function readJson(req) {
  if (req.body !== undefined && req.body !== null) {            // Vercel pre-parses JSON bodies
    if (typeof req.body === 'string') return JSON.parse(req.body);
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8'));
    return req.body;
  }
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > MAX_BYTES * 2) throw Object.assign(new Error('too large'), { tooLarge: true }); chunks.push(c); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function validateBody(b) {
  if (!b || typeof b !== 'object') return 'Body must be a JSON object.';
  if (typeof b.system !== 'string' || !b.system.trim()) return '"system" must be a non-empty string.';
  if (!Array.isArray(b.messages) || !b.messages.length) return '"messages" must be a non-empty array.';
  if (b.messages.length > MAX_TURNS) return `At most ${MAX_TURNS} messages are allowed.`;
  if (b.tier !== undefined && !['default', 'quick'].includes(b.tier)) return '"tier" must be "default" or "quick".';
  let size = b.system.length;
  for (const m of b.messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string' || !m.content.trim()) return 'Each message needs role "user" or "assistant" and non-empty text content.';
    size += m.content.length;
  }
  if (b.messages[0].role !== 'user') return 'The first message must be from "user".';
  if (size > MAX_BYTES) return 'The conversation is too long. Start a new case.';
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('allow', 'POST'); return fail(res, 405, 'bad_request', 'Use POST.'); }
  if (rateLimited(clientIp(req))) return fail(res, 429, 'rate_limited', 'Too many requests. Wait a minute and try again.');

  let body;
  try { body = await readJson(req); }
  catch (e) { return e && e.tooLarge ? fail(res, 413, 'bad_request', 'Request too large.') : fail(res, 400, 'bad_request', 'Body must be valid JSON.'); }
  const problem = validateBody(body);
  if (problem) return fail(res, 400, 'bad_request', problem);

  try {
    const { text, model } = await chat({ system: body.system, messages: body.messages, tier: body.tier });
    return send(res, 200, { text, model });
  } catch (e) {
    if (e instanceof LLMError) {
      const status = { missing_config: 503, model_not_found: 502, rate_limited: 429, upstream_error: 502 }[e.code] || 502;
      console.error('[chat] error', e.code, e.status || ''); // code only: no message text, no upstream body
      return fail(res, status, e.code, e.message);
    }
    console.error('[chat] unexpected error');
    return fail(res, 500, 'upstream_error', 'Something went wrong on the server.');
  }
}
