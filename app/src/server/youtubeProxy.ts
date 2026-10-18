import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

async function readBody(req: IncomingMessage): Promise<Buffer | undefined> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

export async function handleYoutubeProxy(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Always permit CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const reqUrl = req.url ?? '';
  const urlObj = new URL(reqUrl, 'http://localhost');
  const targetUrl = urlObj.searchParams.get('url');

  if (!targetUrl) {
    res.statusCode = 400;
    res.end('Missing url query parameter');
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    res.statusCode = 400;
    res.end('Invalid target URL');
    return;
  }

  const headers: Record<string, string> = {};
  if (req.headers.range) headers['range'] = req.headers.range;
  if (req.headers['content-type']) headers['content-type'] = req.headers['content-type'];
  if (req.headers.accept) headers['accept'] = req.headers.accept;

  if (parsed.hostname.includes('youtube.com')) {
    headers['origin'] = `https://${parsed.hostname}`;
    headers['referer'] = `https://${parsed.hostname}/`;
    headers['x-origin'] = `https://${parsed.hostname}`;
    headers['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';
  } else if (parsed.hostname.includes('googlevideo.com')) {
    // For VISIONOS direct streams, googlevideo refuses Origin/Referer headers (403).
    // For other clients, it requires https://www.youtube.com.
    if (!targetUrl.includes('c=VISIONOS')) {
      headers['origin'] = 'https://www.youtube.com';
      headers['referer'] = 'https://www.youtube.com/';
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

    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('content-type', ct);
    const cr = upstream.headers.get('content-range');
    if (cr) res.setHeader('content-range', cr);
    const ar = upstream.headers.get('accept-ranges');
    if (ar) res.setHeader('accept-ranges', ar);

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('content-length', String(buf.length));
    res.end(buf);
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
