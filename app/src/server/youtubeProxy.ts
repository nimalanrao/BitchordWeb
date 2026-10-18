import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

async function readBody(req: IncomingMessage): Promise<Buffer | undefined> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

export async function handleYoutubeProxy(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Always permit CORS
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

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    res.statusCode = 400;
    res.end('Invalid target URL');
    return;
  }

  // Copy over request headers from client, dropping connection/host
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    const k = key.toLowerCase();
    if (k === 'host' || k === 'connection' || k === 'origin' || k === 'referer' || k === 'content-length') continue;
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

    for (const [key, value] of upstream.headers.entries()) {
      const k = key.toLowerCase();
      if (k.startsWith('access-control-')) continue;
      res.setHeader(key, value);
    }

    if (upstream.body) {
      const { Readable } = await import('node:stream');
      Readable.fromWeb(upstream.body as any).pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    res.statusCode = 502;
    res.end(String(err));
  }
}

export function youtubeProxyPlugin(): Plugin {
  return {
    name: 'youtube-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url.startsWith('/api/yt-proxy') || req.url.startsWith('/api/youtube-proxy'))) {
          void handleYoutubeProxy(req, res);
        } else {
          next();
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url.startsWith('/api/yt-proxy') || req.url.startsWith('/api/youtube-proxy'))) {
          void handleYoutubeProxy(req, res);
        } else {
          next();
        }
      });
    },
  };
}
