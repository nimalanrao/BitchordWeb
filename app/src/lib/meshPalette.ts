import { artworkAtPixels } from './artwork';

export type Rgb = [number, number, number];

export const GRID = 2;

const cache = new Map<string, Rgb[]>();

/**
 * Shapes a color for the mesh: maintains rich saturation and vibrant luminous tones
 * exactly like Apple Music's live mesh backdrop, ensuring colors stay glowing, vivid,
 * and distinctly separated across the screen.
 */
function shape([r, g, b]: Rgb): Rgb {
  const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Boost color vibrance
  const saturated = [r, g, b].map((v) => gray + (v - gray) * 1.45) as Rgb;
  const satGray = 0.2126 * saturated[0]! + 0.7152 * saturated[1]! + 0.0722 * saturated[2]!;
  const luminance = Math.max(0.01, satGray / 255);
  // Cap at 0.48 so white lyrics remain legible while colors remain vibrant and glowing
  const k = luminance > 0.48 ? 0.48 / luminance : luminance < 0.12 ? 0.12 / luminance : 1;
  return saturated.map((v) => Math.round(Math.min(255, Math.max(0, v * k)))) as Rgb;
}

/**
 * Extracts the 3 most common, dominant colors from the artwork and shapes them
 * with rich saturation and balanced luminance.
 */
async function measure(url: string): Promise<Rgb[]> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.referrerPolicy = 'no-referrer';
  image.decoding = 'async';
  image.src = artworkAtPixels(url, 60);
  await image.decode();

  const side = 28;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = side;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(image, 0, 0, side, side);
  const { data } = context.getImageData(0, 0, side, side);

  // Group pixels into 4-bit quantized color bins to find the most common color clusters
  const buckets = new Map<string, { rSum: number; gSum: number; bSum: number; count: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const a = data[i + 3]!;
    if (a < 128) continue;

    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    // Exclude near-black and washed-out pure white
    if (lum < 0.04 || lum > 0.96) continue;

    // Quantize to 32-step buckets for cluster density
    const qr = Math.floor(r / 24) * 24;
    const qg = Math.floor(g / 24) * 24;
    const qb = Math.floor(b / 24) * 24;
    const key = `${qr},${qg},${qb}`;

    const existing = buckets.get(key);
    if (existing) {
      existing.rSum += r;
      existing.gSum += g;
      existing.bSum += b;
      existing.count++;
    } else {
      buckets.set(key, { rSum: r, gSum: g, bSum: b, count: 1 });
    }
  }

  // Convert buckets to candidates sorted strictly by most common (frequency count)
  const candidates = Array.from(buckets.values())
    .map((b) => {
      const rgb: Rgb = [
        Math.round(b.rSum / b.count),
        Math.round(b.gSum / b.count),
        Math.round(b.bSum / b.count),
      ];
      const max = Math.max(...rgb);
      const min = Math.min(...rgb);
      const sat = max === 0 ? 0 : (max - min) / max;
      return { rgb, count: b.count, sat };
    })
    // Weight by popularity and slight saturation bonus to avoid dull greys
    .sort((a, b) => b.count * (1 + b.sat * 1.5) - a.count * (1 + a.sat * 1.5));

  // Pick 3 most common, distinct colors
  const picked: Rgb[] = [];
  for (const c of candidates) {
    if (picked.length >= 3) break;
    const isDistinct = picked.every((p) => {
      const dr = p[0] - c.rgb[0];
      const dg = p[1] - c.rgb[1];
      const db = p[2] - c.rgb[2];
      return Math.sqrt(dr * dr + dg * dg + db * db) > 42;
    });
    if (isDistinct) {
      picked.push(shape(c.rgb));
    }
  }

  // Curated fallback palette (warm amber/coral, deep cobalt/indigo, rich amethyst)
  const defaultColors: Rgb[] = [
    [180, 52, 45],
    [32, 75, 165],
    [140, 45, 130],
  ].map((c) => shape(c as Rgb));

  while (picked.length < 3) {
    picked.push(defaultColors[picked.length % defaultColors.length]!);
  }

  return picked.slice(0, 3);
}

export function meshPalette(url: string): Promise<Rgb[]> {
  const known = cache.get(url);
  if (known) return Promise.resolve(known);
  return measure(url).then((cells) => {
    cache.set(url, cells);
    return cells;
  });
}
