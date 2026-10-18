import type { Innertube, Types } from 'youtubei.js/web';
import { trackLog } from '../trackLog';

/**
 * The page's YouTube.js instance, created on first use. All YouTube requests
 * are dispatched natively inside the web version through the built-in
 * `/api/yt-proxy` endpoint, completely eliminating any extension requirement.
 */
let instance: Promise<Innertube> | null = null;

export function getInnertube(): Promise<Innertube> {
  instance ??= create().catch((error: unknown) => {
    instance = null;
    throw error;
  });
  return instance;
}

export function getSignedInnertube(): Promise<Innertube> {
  return getInnertube();
}

/** The instance browse requests use: standalone in-app YouTube client. */
export async function getMusicClient(): Promise<Innertube> {
  return getInnertube();
}

const YOUTUBE_HOSTS = new Set(['music.youtube.com', 'www.youtube.com', 'youtube.com']);

/**
 * Routes YouTube API and media requests through the web app's built-in
 * `/api/yt-proxy` reverse proxy so that CORS, Range headers, and origin
 * requirements are fully handled natively without any companion extension.
 */
async function innertubeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request = input instanceof Request ? input : null;
  const rawUrl = request ? request.url : input.toString();

  if (rawUrl.includes('/api/yt-proxy')) {
    return fetch(input, init);
  }

  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const url = new URL(rawUrl, base);

  if (url.hostname.includes('youtube.com') || url.hostname.includes('googlevideo.com')) {
    const proxyUrl = `/api/yt-proxy?url=${encodeURIComponent(url.toString())}`;
    const method = init?.method ?? request?.method ?? 'GET';
    const source = new Headers(init?.headers ?? request?.headers);
    const headers = new Headers();
    source.forEach((value, key) => {
      headers.set(key, value);
    });

    let body: BodyInit | null | undefined = init?.body;
    if (body === undefined && request && method !== 'GET' && method !== 'HEAD') {
      body = await request.text();
    }

    return fetch(proxyUrl, {
      method,
      headers,
      body: body ?? null,
      signal: init?.signal ?? request?.signal ?? null,
    });
  }

  return fetch(input, init);
}

async function isFirstRun(): Promise<boolean> {
  try {
    const databases = await indexedDB.databases();
    return !databases.some((db) => db.name === 'youtubei.js');
  } catch {
    return true;
  }
}

async function create(fetch: typeof globalThis.fetch = innertubeFetch): Promise<Innertube> {
  const started = performance.now();
  const { Innertube, Platform, UniversalCache } = await import('youtubei.js/web');

  // Runs the player's signature and n-parameter functions, which YouTube.js
  // extracts from YouTube's player script.
  Platform.shim.eval = async (data: Types.BuildScriptResult, env: Record<string, Types.VMPrimative>) => {
    const properties: string[] = [];
    if (env.n) properties.push(`n: exportedVars.nFunction(${JSON.stringify(env.n)})`);
    if (env.sig) properties.push(`sig: exportedVars.sigFunction(${JSON.stringify(env.sig)})`);
    return new Function(`${data.output}\nreturn { ${properties.join(', ')} }`)();
  };

  const firstRun = await isFirstRun();
  try {
    const yt = await Innertube.create({
      cache: new UniversalCache(true),
      fetch,
      retrieve_player: true,
    });
    const client = yt.session.context.client;
    trackLog.i(
      `InnerTube ready in ${Math.round(performance.now() - started)}ms ` +
        `(${client.clientName} ${client.clientVersion}, player ${yt.session.player?.player_id ?? 'none'})`,
    );
    return yt;
  } catch (error) {
    if (firstRun) indexedDB.deleteDatabase('youtubei.js');
    trackLog.e(`InnerTube failed to start: ${String(error)}`);
    throw error;
  }
}
