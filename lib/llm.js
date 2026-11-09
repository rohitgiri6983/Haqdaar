/* One function that talks to ANY OpenAI-compatible chat endpoint.
   Gemini, Groq, OpenRouter, OpenAI and most others speak this same format,
   so swapping the model means changing environment variables, not code.
   No provider name appears in this file on purpose. */

export class LLMError extends Error {
  // code: missing_config | model_not_found | rate_limited | upstream_error
  constructor(code, message, { status, detail } = {}) {
    super(message);
    this.name = 'LLMError';
    this.code = code;
    this.status = status;
    this.detail = detail; // short upstream text, for server logs / CLI only; never sent to browsers
  }
}

export function configFromEnv(env = process.env) {
  return {
    baseUrl: (env.LLM_BASE_URL || '').trim(),
    apiKey: (env.LLM_API_KEY || '').trim(),
    model: (env.LLM_MODEL || '').trim(),
    modelFast: (env.LLM_MODEL_FAST || '').trim(),
    maxTokens: Number(env.LLM_MAX_TOKENS) > 0 ? Number(env.LLM_MAX_TOKENS) : 3000
  };
}

const defaultSleep = ms => new Promise(r => setTimeout(r, ms));
const MAX_RETRIES = 2;            // on HTTP 429 only
const BACKOFF_MS = [1500, 4000];  // wait before retry 1 and retry 2

/**
 * chat({system, messages, tier}) -> {text, model}
 * tier 'quick' uses LLM_MODEL_FAST (if set); anything else uses LLM_MODEL.
 * opts lets tests/CLI inject config, fetch and sleep.
 */
export async function chat({ system, messages, tier }, opts = {}) {
  const cfg = opts.config || configFromEnv();
  const doFetch = opts.fetch || fetch;
  const sleep = opts.sleep || defaultSleep;
  const model = tier === 'quick' && cfg.modelFast ? cfg.modelFast : cfg.model;
  const modelVar = tier === 'quick' && cfg.modelFast ? 'LLM_MODEL_FAST' : 'LLM_MODEL';

  const missing = [['LLM_BASE_URL', cfg.baseUrl], ['LLM_API_KEY', cfg.apiKey], ['LLM_MODEL', cfg.model]].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) throw new LLMError('missing_config', `AI is not configured on the server. Set: ${missing.join(', ')}.`);

  const url = cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';
  const body = JSON.stringify({
    model,
    temperature: 0.4,
    max_tokens: cfg.maxTokens,
    messages: [{ role: 'system', content: system }, ...messages]
  });

  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await doFetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + cfg.apiKey },
        body,
        signal: AbortSignal.timeout(opts.timeoutMs || 90000)
      });
    } catch (e) {
      throw new LLMError('upstream_error', e && e.name === 'TimeoutError' ? 'The AI service took too long to answer.' : 'Could not reach the AI service.', { detail: String(e && e.message).slice(0, 200) });
    }

    if (res.ok) {
      let j;
      try { j = await res.json(); } catch { throw new LLMError('upstream_error', 'The AI service sent a reply that could not be read.', { status: res.status }); }
      const text = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      if (typeof text !== 'string' || !text.trim()) throw new LLMError('upstream_error', 'The AI service returned an empty answer.', { status: res.status });
      return { text, model: j.model || model };
    }

    const raw = await res.text().catch(() => '');
    const detail = raw.slice(0, 300);
    if (res.status === 429) {
      if (attempt < MAX_RETRIES) { await sleep(BACKOFF_MS[attempt]); continue; }
      throw new LLMError('rate_limited', 'The AI service is busy (rate limit). Wait a minute and try again.', { status: 429, detail });
    }
    // Some providers answer 404, others 400, when the model ID is wrong.
    if (res.status === 404 || (res.status === 400 && /model/i.test(raw) && /(not found|not supported|does not exist|unknown|invalid|no longer)/i.test(raw))) {
      throw new LLMError('model_not_found', `The AI service says the model "${model}" was not found. Fix ${modelVar} in the server environment.`, { status: res.status, detail });
    }
    if (res.status === 401 || res.status === 403) throw new LLMError('upstream_error', 'The AI service rejected the API key. Check LLM_API_KEY.', { status: res.status, detail });
    throw new LLMError('upstream_error', `The AI service returned an error (HTTP ${res.status}).`, { status: res.status, detail });
  }
}
