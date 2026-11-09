/* Tiny local server: static files + /api/chat. Run: npm run dev  (needs a .env file) */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// Minimal .env reader (no dotenv). Real environment variables win over the file.
function loadEnv(file) {
  let txt; try { txt = fs.readFileSync(file, 'utf8'); } catch { return false; }
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    let v = m[2];
    if (/^(['"]).*\1$/.test(v)) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
  return true;
}
const hasEnv = loadEnv(path.join(ROOT, '.env'));

const { default: chatHandler } = await import('./api/chat.js');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/chat') return chatHandler(req, res);

  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { res.statusCode = 400; return res.end('Bad request'); }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(ROOT, rel);
  // Safety: stay inside the project, and never serve dotfiles (.env) or node_modules.
  const parts = path.relative(ROOT, file).split(path.sep);
  if (file !== ROOT && (!file.startsWith(ROOT + path.sep) || parts.some(p => p.startsWith('.') || p === 'node_modules'))) { res.statusCode = 404; return res.end('Not found'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('content-type', TYPES[path.extname(file)] || 'application/octet-stream');
    res.setHeader('cache-control', 'no-store');
    res.end(data);
  });
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  console.log(`Haqdaar dev server: http://localhost:${port}`);
  if (!hasEnv) console.log('No .env file found. Copy .env.example to .env and fill it in; until then the page shows the basic offline guide.');
});
