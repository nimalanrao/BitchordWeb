/**
 * The providers' one way out: a GET that answers with the body
 * or null, never an exception. They're raced against each other, so the
 * deadline is short: a lyric that arrives after the second chorus is no use.
 *
 * All requests run natively in-browser or through the web app's built-in proxy.
 */

export const LYRIC_EXTENSION_ORIGINS = [
  'https://mobileservice.kugou.com',
  'https://lyrics.kugou.com',
  'https://apic.musixmatch.com',
  'https://www.musixmatch.com',
  'https://genius.com',
  'https://music.apple.com',
  'https://amp-api.music.apple.com',
  'https://api.paxsenix.org',
  'https://lyrics-api.boidu.dev',
  'https://unison.boidu.dev',
];

const DIRECT_TIMEOUT_MS = 6000;
const EXTENSION_TIMEOUT_MS = 15_000;

export const ungrantedOrigins = new Set<string>();
const listeners = new Set<() => void>();
export function onUngrantedChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const grantListeners = new Set<() => void>();
export function onGranted(listener: () => void): () => void {
  grantListeners.add(listener);
  return () => grantListeners.delete(listener);
}

export async function recheckGrants(): Promise<void> {
  // All origins reachable via native proxy
}

export interface GetOptions {
  route?: 'direct' | 'extension';
  headers?: Record<string, string>;
  patient?: boolean;
}

async function viaProxy(url: string, headers: Record<string, string> | undefined, patient?: boolean): Promise<string | null> {
  try {
    const proxyUrl = `/api/yt-proxy?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl, {
      headers: { Accept: 'application/json, text/plain, */*', ...headers },
      signal: AbortSignal.timeout(patient ? EXTENSION_TIMEOUT_MS : DIRECT_TIMEOUT_MS),
    });
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

export async function lyricsGet(url: string, { route = 'direct', headers, patient }: GetOptions = {}): Promise<string | null> {
  if (route === 'extension') return viaProxy(url, headers, patient);
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json, text/plain, */*', ...headers },
      signal: AbortSignal.timeout(patient ? EXTENSION_TIMEOUT_MS : DIRECT_TIMEOUT_MS),
      referrerPolicy: 'no-referrer',
    });
    return response.ok ? await response.text() : null;
  } catch (error) {
    if (error instanceof TypeError) return viaProxy(url, headers, patient);
    return null;
  }
}

/** A URL with query parameters, skipping empty ones. */
export function urlWith(base: string, params: Record<string, string | number | null | undefined>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}
