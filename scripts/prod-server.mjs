import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, '../app/dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
};

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

async function handleYoutubeProxy(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, Content-Type, ETag, Last-Modified, Range');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const reqUrl = req.url ?? '';
  const urlObj = new URL(reqUrl, 'http://localhost');
  let targetUrl = urlObj.searchParams.get('url');

  if (!targetUrl) {
    res.statusCode = 400;
    res.end('Missing url query parameter');
    return;
  }

  // Handle double encoded or relative proxy URLs defensively
  if (targetUrl.includes('/api/yt-proxy?url=')) {
    const inner = new URL(targetUrl, 'http://localhost');
    targetUrl = inner.searchParams.get('url') || targetUrl;
  }

  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    res.statusCode = 400;
    res.end('Invalid target URL');
    return;
  }

  // Copy over request headers from client, dropping connection/host
  const headers = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    const k = key.toLowerCase();
    if (k === 'host' || k === 'connection' || k === 'origin' || k === 'referer' || k === 'content-length' || k === 'accept-encoding') continue;
    headers[k] = Array.isArray(value) ? value.join(', ') : value;
  }

  // Always use a valid Chrome desktop user agent
  headers['user-agent'] = CHROME_UA;

  if (parsed.hostname.includes('youtube.com')) {
    headers['origin'] = `https://${parsed.hostname}`;
    headers['referer'] = `https://${parsed.hostname}/`;
    headers['x-origin'] = `https://${parsed.hostname}`;
  } else if (parsed.hostname.includes('googlevideo.com')) {
    // For direct URLs minted for VISIONOS, googlevideo refuses Origin/Referer (403).
    // For other clients (such as SABR), it requires https://www.youtube.com.
    if (!targetUrl.includes('c=VISIONOS')) {
      headers['origin'] = 'https://www.youtube.com';
      headers['referer'] = 'https://www.youtube.com/';
    } else {
      delete headers['origin'];
      delete headers['referer'];
    }
  }

  try {
    const body = req.method !== 'GET' && req.method !== 'HEAD' ? await readBody(req) : undefined;
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: body ? new Uint8Array(body) : undefined,
    });

    res.statusCode = upstream.status;

    const hasEncoding = upstream.headers.has('content-encoding');
    for (const [key, value] of upstream.headers.entries()) {
      const k = key.toLowerCase();
      if (k.startsWith('access-control-')) continue;
      // fetch() automatically decodes gzip/br/deflate bodies in Node.js.
      // Forwarding content-encoding or the compressed content-length causes the
      // client browser to attempt decompressing already uncompressed data, corrupting the stream.
      if (k === 'content-encoding') continue;
      if (hasEncoding && k === 'content-length') continue;
      res.setHeader(key, value);
    }

    if (upstream.body) {
      const { Readable } = await import('node:stream');
      const stream = Readable.fromWeb(upstream.body);
      stream.on('error', () => {});
      req.on('close', () => {
        try { stream.destroy(); } catch {}
      });
      stream.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    res.statusCode = 502;
    res.end(String(err));
  }
}

function serveStatic(req, res) {
  const urlObj = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(urlObj.pathname);

  // Normalize path
  let filePath = path.join(DIST_DIR, pathname);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // SPA fallback to index.html
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    res.end(data);
  } catch (err) {
    res.statusCode = 500;
    res.end('Server Error');
  }
}

const server = http.createServer((req, res) => {
  if (req.url && (req.url.startsWith('/api/yt-proxy') || req.url.startsWith('/api/youtube-proxy'))) {
    void handleYoutubeProxy(req, res);
  } else {
    serveStatic(req, res);
  }
});

const PORT = parseInt(process.env.PORT || '10000', 10);
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`BitChord Web production server listening on http://${HOST}:${PORT}`);
});
