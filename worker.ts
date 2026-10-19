interface Env {
  ASSETS: {
    fetch: (request: Request | string) => Promise<Response>;
  };
}

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers':
    'Content-Range, Content-Length, Accept-Ranges, Content-Type, ETag, Last-Modified, Range',
};

async function handleYoutubeProxy(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  const urlObj = new URL(request.url);
  let targetUrl = urlObj.searchParams.get('url');

  if (!targetUrl) {
    return new Response('Missing url query parameter', {
      status: 400,
      headers: CORS_HEADERS,
    });
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
    return new Response('Invalid target URL', {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  // Copy over request headers from client, dropping connection/host/etc.
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (!value) continue;
    const k = key.toLowerCase();
    if (
      k === 'host' ||
      k === 'connection' ||
      k === 'origin' ||
      k === 'referer' ||
      k === 'content-length' ||
      k === 'accept-encoding' ||
      k.startsWith('cf-') ||
      k === 'x-forwarded-for' ||
      k === 'x-forwarded-proto' ||
      k === 'x-real-ip'
    ) {
      continue;
    }
    headers.set(key, value);
  }

  // Preserve client user-agent if provided; otherwise fallback to desktop Chrome
  if (!headers.has('user-agent')) {
    headers.set('user-agent', CHROME_UA);
  }

  if (parsed.hostname.includes('youtube.com')) {
    headers.set('origin', `https://${parsed.hostname}`);
    headers.set('referer', `https://${parsed.hostname}/`);
    headers.set('x-origin', `https://${parsed.hostname}`);
  } else if (parsed.hostname.includes('googlevideo.com')) {
    // For direct media URLs (videoplayback), googlevideo refuses Origin/Referer (403).
    // For SABR streaming requests, it requires https://www.youtube.com.
    if (targetUrl.includes('sabr=1')) {
      headers.set('origin', 'https://www.youtube.com');
      headers.set('referer', 'https://www.youtube.com/');
    } else {
      headers.delete('origin');
      headers.delete('referer');
    }
  } else if (parsed.hostname.includes('apple.com')) {
    headers.set('origin', 'https://music.apple.com');
    headers.set('referer', 'https://music.apple.com/');
  } else if (parsed.hostname.includes('musixmatch.com')) {
    headers.set('origin', 'https://www.musixmatch.com');
    headers.set('referer', 'https://www.musixmatch.com/');
  }

  try {
    const body =
      request.method !== 'GET' && request.method !== 'HEAD'
        ? await request.arrayBuffer()
        : undefined;

    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      redirect: 'follow',
    });

    const responseHeaders = new Headers();
    for (const [k, v] of Object.entries(CORS_HEADERS)) {
      responseHeaders.set(k, v);
    }

    const hasEncoding = upstream.headers.has('content-encoding');
    for (const [key, value] of upstream.headers.entries()) {
      const k = key.toLowerCase();
      if (k.startsWith('access-control-')) continue;
      // fetch() in Workers/Node automatically decodes compressed bodies.
      // Forwarding content-encoding or the compressed content-length causes the
      // client browser to attempt decompressing already uncompressed data, corrupting the stream.
      if (k === 'content-encoding') continue;
      if (hasEncoding && k === 'content-length') continue;
      responseHeaders.set(key, value);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response(String(err), {
      status: 502,
      headers: CORS_HEADERS,
    });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (
      url.pathname.startsWith('/api/yt-proxy') ||
      url.pathname.startsWith('/api/youtube-proxy')
    ) {
      return handleYoutubeProxy(request);
    }

    return env.ASSETS.fetch(request);
  },
};
