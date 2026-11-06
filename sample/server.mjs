/* The smallest server Ayni's data files can talk to: the site, plus a files API. Node, no dependencies. node sample/server.mjs [port] [dataDir]
     GET /api/whoami                            200 { user }
     GET /api/files?file=<path>                 200 the bytes, with ETag and Last-Modified; 404 when there is none
     PUT /api/files?file=<path>                 If-Match or If-None-Match checked, else 412; a gzip body is inflated */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +(process.argv[2] || 8080);
const DATA = process.argv[3] || fs.mkdtempSync(path.join(os.tmpdir(), 'ayni-sample-'));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const etag = (b) => `"${crypto.createHash('sha256').update(b).digest('hex').slice(0, 16)}"`;
const inData = (p) => { const f = path.resolve(DATA, p); return f.startsWith(path.resolve(DATA) + path.sep) ? f : null; };
const body = (req) => new Promise((ok) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); });

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/api/whoami') { res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"user":"sample"}'); return; }
  if (u.pathname === '/api/files') {
    const f = inData(u.searchParams.get('file') || ''), old = f && fs.existsSync(f) ? fs.readFileSync(f) : null;
    if (!f) { res.writeHead(400).end(); return; }
    if (req.method === 'GET' || req.method === 'HEAD') {
      if (!old) { res.writeHead(404).end(); return; }
      res.writeHead(200, { ETag: etag(old), 'Last-Modified': fs.statSync(f).mtime.toUTCString(), 'Cache-Control': 'no-store' }).end(req.method === 'GET' ? old : undefined);
      return;
    }
    if (req.method === 'PUT') {
      const m = req.headers['if-match'], none = req.headers['if-none-match'];
      if ((m && (!old || etag(old) !== m)) || (none === '*' && old)) { res.writeHead(412).end(); return; }
      let b = await body(req);
      if (req.headers['content-encoding'] === 'gzip') b = zlib.gunzipSync(b);
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, b);
      res.writeHead(200, { ETag: etag(b), 'Last-Modified': fs.statSync(f).mtime.toUTCString() }).end();
      return;
    }
    res.writeHead(405).end(); return;
  }
  const rel = u.pathname.endsWith('/') ? u.pathname + 'index.html' : u.pathname, file = path.join(ROOT, decodeURIComponent(rel));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/sample/   data: ${DATA}`));
