import { createServer } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { openAccess } from './access.mjs';

const secret = process.env.SCANNER_KEY;
if (!secret || !/^[a-f0-9]{48,}$/.test(secret)) throw new Error('Configura SCANNER_KEY con openssl rand -hex 24');
const digest = value => createHash('sha256').update(value).digest();
const expected = digest('Basic ' + Buffer.from('entrada:' + secret).toString('base64'));
const access = openAccess();
const files = new Map([
  ['/', ['text/html; charset=utf-8', readFileSync('scanner/index.html')]],
  ['/scanner.js', ['text/javascript', readFileSync('scanner/scanner.js')]],
  ['/scanner.css', ['text/css', readFileSync('scanner/scanner.css')]],
  ['/qr.js', ['text/javascript', readFileSync('node_modules/html5-qrcode/html5-qrcode.min.js')]]
]);

createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; frame-ancestors 'none'");
  if (!timingSafeEqual(digest(req.headers.authorization ?? ''), expected)) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Entrada"' }).end('Acceso del personal');
    return;
  }
  if (req.method === 'GET' && files.has(req.url)) {
    const [type, body] = files.get(req.url);
    res.writeHead(200, { 'Content-Type': type }).end(body);
    return;
  }
  if (req.method === 'GET' && req.url === '/evento') {
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(access.event));
    return;
  }
  if (req.method !== 'POST' || req.url !== '/validar') {
    res.writeHead(404).end();
    return;
  }
  if (req.headers['content-type'] !== 'application/json' || req.headers['sec-fetch-site'] === 'cross-site') {
    res.writeHead(415).end();
    return;
  }
  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 1024) {
        res.writeHead(413).end();
        return;
      }
    }
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      res.writeHead(400).end();
      return;
    }
    const result = access.validate(payload?.code);
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ result }));
  } catch {
    res.writeHead(503).end();
  }
}).listen(Number(process.env.PORT ?? 8080), process.env.HOST ?? '127.0.0.1');
