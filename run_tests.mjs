#!/usr/bin/env node
/* =========================================================
   Haqdaar Test Runner (CLI)
   Runs verified test cases or a single interactive case through
   the real pipeline (core.js + lib/llm.js).
   Saves unedited outputs to raw_outputs/<timestamp>_<model>/
   ========================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildAskSystem,
  buildDraftSystem,
  emptyCase,
  parseAnswer,
  normalizeCase,
  validate,
  clientEscalation,
  computeDeadlines,
  runChecks,
  fmtD,
  isoOf
} from './core.js';
import { chat, LLMError } from './lib/llm.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// Minimal .env reader (no external dotenv dependency)
function loadEnv(filePath) {
  let txt;
  try { txt = fs.readFileSync(filePath, 'utf8'); } catch { return; }
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    let v = m[2];
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
loadEnv(path.join(ROOT, '.env'));

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') flags.help = true;
    else if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { flags[key] = next; i++; }
      else flags[key] = true;
    }
  }
  return flags;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`
Haqdaar Test Runner

Usage:
  node run_tests.mjs [options]

Options:
  --only <ids>             Comma-separated list of test case IDs to run (e.g. T01,T04)
  --input "<problem>"      Run one new case on free text (interview mode)
  --lang <code>            Reply language (default: auto)
  --mode <ask|draft>       Mode for custom input (default: ask)
  --doc <type>             Document type for draft mode (default: legal_notice)
  --base-url <url>         Override LLM_BASE_URL
  --model <model_id>       Override LLM_MODEL
  --key-env <env_var>      Env var name for API key (default: LLM_API_KEY)
  --help                   Show this help message

Examples:
  node run_tests.mjs
  node run_tests.mjs --only T04,T06
  node run_tests.mjs --input "My landlord took 60k deposit and stopped picking calls" --lang en
  node run_tests.mjs --mode draft --input "Deposit withheld by Mr. Rao" --doc legal_notice
`);
  process.exit(0);
}

// Config resolution
const baseUrl = (args['base-url'] || process.env.LLM_BASE_URL || '').trim();
const model = (args.model || process.env.LLM_MODEL || '').trim();
const keyEnv = args['key-env'] || 'LLM_API_KEY';
const apiKey = (process.env[keyEnv] || '').trim();
const llmConfig = {
  baseUrl,
  apiKey,
  model,
  modelFast: (process.env.LLM_MODEL_FAST || '').trim(),
  maxTokens: 3000
};

function getHost(url) {
  try { return new URL(url).host; } catch { return 'unknown'; }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

function sanitizeDir(str) {
  return str.replace(/[^A-Za-z0-9._-]/g, '_');
}

function timestampFolder() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  const modelStr = sanitizeDir(model || 'no_model');
  return `${dateStr}_${modelStr}`;
}

async function runSingleInput() {
  const input = String(args.input || '').trim();
  const lang = args.lang || 'auto';
  const mode = args.mode || 'ask';
  const doc = args.doc || 'legal_notice';

  console.log('='.repeat(70));
  console.log(`HAQDAAR RE-RUNNABLE TEST: ${mode.toUpperCase()} MODE`);
  console.log(`Model: ${model || '(unset)'} | Host: ${getHost(baseUrl)} | Language: ${lang}`);
  console.log('-'.repeat(70));
  console.log(`Input:\n"${input}"\n`);

  const t0 = Date.now();
  let system = '';
  let turns = [];

  if (mode === 'draft') {
    system = buildDraftSystem(doc, '', emptyCase(), lang);
    turns = [{ role: 'user', content: input || 'Write the document now.' }];
  } else {
    system = buildAskSystem(lang, emptyCase());
    turns = [{ role: 'user', content: input }];
  }

  let chatRes;
  try {
    chatRes = await chat({ system, messages: turns }, { config: llmConfig });
  } catch (err) {
    console.error(`\n[ERROR] ${err.name} (${err.code}): ${err.message}`);
    if (err.detail) console.error(`Upstream detail: ${err.detail}`);
    process.exit(1);
  }

  const latency = Date.now() - t0;
  const raw = chatRes.text;
  const activeModel = chatRes.model || model;

  const outDir = path.join(ROOT, 'raw_outputs', timestampFolder());
  fs.mkdirSync(outDir, { recursive: true });

  if (mode === 'draft') {
    const val = validate(raw);
    const client = clientEscalation([input]);

    console.log('='.repeat(70));
    console.log('RAW DRAFT OUTPUT:');
    console.log('-'.repeat(70));
    console.log(raw);
    console.log('-'.repeat(70));
    console.log(`Latency: ${latency} ms | Verified citations: ${val.verified.join(', ') || 'none'}`);
    if (val.flags.length) {
      console.log('Validator Flags:');
      val.flags.forEach(f => console.log(`  [${f.level.toUpperCase()}] ${f.type}: "${f.text}" — ${f.note}`));
    }
    if (client.length) {
      console.log('Lawyer Escalation Alert:');
      client.forEach(c => console.log(`  ⚠ ${c}`));
    }

    const payload = {
      mode: 'draft',
      doc_type: doc,
      input,
      language: lang,
      model: activeModel,
      host: getHost(baseUrl),
      timestamp: new Date().toISOString(),
      latency_ms: latency,
      raw,
      validation: val,
      client_escalation: client
    };

    fs.writeFileSync(path.join(outDir, 'custom_draft.json'), JSON.stringify(payload, null, 2), 'utf8');
    fs.writeFileSync(path.join(outDir, 'custom_draft.txt'), raw, 'utf8');
    console.log(`\nOutputs saved to: ${path.relative(ROOT, outDir)}/custom_draft.[json|txt]`);
    return;
  }

  // Ask mode
  const { reply, obj } = parseAnswer(raw);
  const c = normalizeCase(obj, emptyCase());
  const val = validate(reply);
  const client = clientEscalation([input]);
  const deadlines = computeDeadlines(c);

  console.log('='.repeat(70));
  console.log('EXTRACTED CASE FILE:');
  console.log(`Category: ${c.category} | Title: "${c.title}"`);
  console.log(`Amount: ${c.amount ? '₹' + c.amount.toLocaleString('en-IN') : 'None'} | Place: ${c.place || 'Unspecified'}`);
  if (deadlines.length) {
    console.log('Computed Deadlines:');
    deadlines.forEach(d => console.log(`  • ${d.label}: ${fmtD(d.date)} (${d.cite})`));
  }
  if (c.escalate.needed || client.length) {
    console.log('⚠ Lawyer Needed:');
    if (c.escalate.needed) console.log(`  AI: ${c.escalate.reason}`);
    client.forEach(cl => console.log(`  Rules: ${cl}`));
  }
  console.log('-'.repeat(70));
  console.log('REPLY TO CLIENT:');
  console.log(reply);
  console.log('-'.repeat(70));
  console.log(`Latency: ${latency} ms | Verified law: ${val.verified.join(', ') || 'none'} | Clean: ${val.clean}`);
  if (val.flags.length) {
    console.log('Validator Flags:');
    val.flags.forEach(f => console.log(`  [${f.level.toUpperCase()}] ${f.type}: "${f.text}" — ${f.note}`));
  }

  const payload = {
    mode: 'ask',
    input,
    language: lang,
    model: activeModel,
    host: getHost(baseUrl),
    timestamp: new Date().toISOString(),
    latency_ms: latency,
    raw,
    reply,
    case: c,
    validation: val,
    lawyer_alert: {
      model: c.escalate.needed,
      reason: c.escalate.reason,
      rules: client,
      needed: c.escalate.needed || client.length > 0
    },
    deadlines: deadlines.map(d => ({ label: d.label, date: isoOf(d.date), cite: d.cite, note: d.note })),
    clean: val.clean
  };

  fs.writeFileSync(path.join(outDir, 'custom_case.json'), JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(path.join(outDir, 'custom_case.txt'), raw, 'utf8');
  console.log(`\nOutputs saved to: ${path.relative(ROOT, outDir)}/custom_case.[json|txt]`);
}

async function runSuite() {
  const casesPath = path.join(ROOT, 'tests', 'cases.json');
  let cases = [];
  try {
    cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
  } catch (err) {
    console.error(`Could not read test cases from ${casesPath}:`, err.message);
    process.exit(1);
  }

  let selectedCases = cases;
  if (args.only) {
    const onlySet = new Set(String(args.only).split(',').map(s => s.trim().toUpperCase()));
    selectedCases = cases.filter(c => onlySet.has(c.id.toUpperCase()));
    if (!selectedCases.length) {
      console.error(`No test cases matched --only "${args.only}". Available: ${cases.map(c => c.id).join(', ')}`);
      process.exit(1);
    }
  }

  const outDir = path.join(ROOT, 'raw_outputs', timestampFolder());
  fs.mkdirSync(outDir, { recursive: true });

  console.log('='.repeat(75));
  console.log(`HAQDAAR TEST EVALUATION (${selectedCases.length} cases)`);
  console.log(`Model: ${model || '(unset)'} | Base URL: ${baseUrl || '(unset)'}`);
  console.log(`Output folder: ${path.relative(ROOT, outDir)}`);
  console.log('='.repeat(75));

  const results = [];
  let totalPassed = 0;

  for (let idx = 0; idx < selectedCases.length; idx++) {
    const t = selectedCases[idx];
    const prefix = `[${idx + 1}/${selectedCases.length}] ${t.id}: ${t.title}`;
    process.stdout.write(`${prefix.padEnd(52)} `);

    const t0 = Date.now();
    let raw = '';
    let chatModel = model;
    let err = null;

    try {
      const res = await chat(
        { system: buildAskSystem(t.lang, emptyCase()), messages: [{ role: 'user', content: t.input }] },
        { config: llmConfig }
      );
      raw = res.text;
      chatModel = res.model || model;
    } catch (e) {
      err = e;
    }

    const latency = Date.now() - t0;

    if (err) {
      console.log(`✗ ERROR (${latency} ms)`);
      console.log(`  -> ${err.code || 'error'}: ${err.message}`);
      results.push({
        id: t.id,
        title: t.title,
        pass: false,
        latency,
        failedChecks: [`Error: ${err.code || 'upstream'}`],
        error: err.message
      });

      fs.writeFileSync(path.join(outDir, `${t.id}.json`), JSON.stringify({
        id: t.id,
        title: t.title,
        input: t.input,
        language: t.lang,
        model: chatModel,
        host: getHost(baseUrl),
        timestamp: new Date().toISOString(),
        latency_ms: latency,
        error: { code: err.code, message: err.message }
      }, null, 2), 'utf8');

      if (idx < selectedCases.length - 1) await sleep(1500);
      continue;
    }

    // Process output cleanly (do NOT edit raw model output)
    const { reply, obj } = parseAnswer(raw);
    const c = normalizeCase(obj, emptyCase());
    const val = validate(reply);
    const client = clientEscalation([t.input]);
    const deadlines = computeDeadlines(c);
    const r = { raw, reply, case: c, val, client };
    const checkResults = runChecks(t, r);
    const passed = checkResults.every(x => x.pass);

    if (passed) {
      totalPassed++;
      console.log(`✓ PASS (${latency} ms)`);
    } else {
      const failed = checkResults.filter(x => !x.pass).map(x => x.label);
      console.log(`✗ FAIL (${latency} ms)`);
      failed.forEach(f => console.log(`     failed: ${f}`));
    }

    results.push({
      id: t.id,
      title: t.title,
      pass: passed,
      latency,
      failedChecks: checkResults.filter(x => !x.pass).map(x => x.label)
    });

    const filePayload = {
      id: t.id,
      title: t.title,
      input: t.input,
      language: t.lang,
      model: chatModel,
      host: getHost(baseUrl),
      timestamp: new Date().toISOString(),
      latency_ms: latency,
      raw,
      reply,
      case: c,
      validation: val,
      lawyer_alert: {
        model: c.escalate.needed,
        reason: c.escalate.reason,
        rules: client,
        needed: c.escalate.needed || client.length > 0
      },
      deadlines: deadlines.map(d => ({ label: d.label, date: isoOf(d.date), cite: d.cite, note: d.note })),
      checks: checkResults,
      passed
    };

    fs.writeFileSync(path.join(outDir, `${t.id}.json`), JSON.stringify(filePayload, null, 2), 'utf8');
    fs.writeFileSync(path.join(outDir, `${t.id}.txt`), raw, 'utf8');

    if (idx < selectedCases.length - 1) await sleep(1500); // respect free-tier limits
  }

  // Summary generation
  let summaryMd = `# Haqdaar Evaluation Summary\n\n`;
  summaryMd += `- **Date:** ${new Date().toISOString()}\n`;
  summaryMd += `- **Model:** ${model}\n`;
  summaryMd += `- **Host:** ${getHost(baseUrl)}\n`;
  summaryMd += `- **Total Cases:** ${selectedCases.length}\n`;
  summaryMd += `- **Passed:** ${totalPassed} / ${selectedCases.length} (${Math.round((totalPassed / selectedCases.length) * 100)}%)\n\n`;
  summaryMd += `| Case ID | Title | Result | Failed Checks | Latency (ms) |\n`;
  summaryMd += `|---|---|---|---|---|\n`;

  let summaryCsv = `id,title,result,failed_checks,latency_ms\n`;

  for (const r of results) {
    const resStr = r.pass ? 'PASS' : 'FAIL';
    const failedStr = r.failedChecks.length ? r.failedChecks.join('; ') : 'None';
    summaryMd += `| ${r.id} | ${r.title} | ${resStr} | ${failedStr} | ${r.latency} |\n`;
    summaryCsv += `"${r.id}","${r.title.replace(/"/g, '""')}","${resStr}","${failedStr.replace(/"/g, '""')}",${r.latency}\n`;
  }

  fs.writeFileSync(path.join(outDir, 'summary.md'), summaryMd, 'utf8');
  fs.writeFileSync(path.join(outDir, 'summary.csv'), summaryCsv, 'utf8');

  console.log('='.repeat(75));
  console.log(`TOTAL: ${totalPassed} / ${selectedCases.length} passed (${Math.round((totalPassed / selectedCases.length) * 100)}%)`);
  console.log(`Summary written to:`);
  console.log(`  - ${path.relative(ROOT, outDir)}/summary.md`);
  console.log(`  - ${path.relative(ROOT, outDir)}/summary.csv`);
  console.log('='.repeat(75));
}

if (args.input) {
  runSingleInput();
} else {
  runSuite();
}

