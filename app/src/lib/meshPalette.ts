import { artworkAtPixels } from './artwork';

export type Rgb = [number, number, number];

/** The mesh is the artwork averaged into a GRID × GRID square of means. */
export const GRID = 4;

const cache = new Map<string, Rgb[]>();

/**
 * Pushes a cell's colour toward something white text stands on: a little more
 * saturated, and no brighter than a mid-dark tone. Dark cells stay as they are,
 * so a mostly black sleeve still makes a mostly black backdrop.
 */
function shape([r, g, b]: Rgb): Rgb {
  const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const saturated = [r, g, b].map((v) => gray + (v - gray) * 1.3) as Rgb;
  const luminance = gray / 255;
  const k = luminance > 0.38 ? 0.38 / luminance : 1;
  return saturated.map((v) => Math.round(Math.min(255, Math.max(0, v * k)))) as Rgb;
}

/**
 * The artwork's colours, roughly where and in the proportions they are on the
 * sleeve, as GRID² cells read row by row (the approach of the desktop's
 * ArtworkMeshBackdrop.kt; no quantiser, so nine-tenths black stays black).
 * YouTube's image hosts send `Access-Control-Allow-Origin: *`, so the canvas
 * stays readable without the extension.
 */
/**
 * Extracts 4 distinct, prominent colors from the artwork and places them in
 * random/dispersed spots across the 4x4 mesh with high saturation and deep blending.
 */
async function measure(url: string): Promise<Rgb[]> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.referrerPolicy = 'no-referrer';
  image.decoding = 'async';
  image.src = artworkAtPixels(url, 60);
  await image.decode();

  const side = 24;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = side;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(image, 0, 0, side, side);
  const { data } = context.getImageData(0, 0, side, side);

  // Collect candidate pixel colors
  const candidates: { rgb: Rgb; sat: number; lum: number; count: number }[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const sat = max === 0 ? 0 : (max - min) / max;
    if (lum > 0.04 && lum < 0.92) {
      candidates.push({ rgb: [r, g, b], sat, lum, count: 1 });
    }
  }

  // Pick 4 maximally distinct and vibrant colors
  const picked: Rgb[] = [];
  // Sort candidates by saturation * brightness balance
  candidates.sort((a, b) => (b.sat * 1.5 + b.lum) - (a.sat * 1.5 + a.lum));

  for (const c of candidates) {
    if (picked.length >= 4) break;
    const isDistinct = picked.every((p) => {
      const dr = p[0] - c.rgb[0];
      const dg = p[1] - c.rgb[1];
      const db = p[2] - c.rgb[2];
      return Math.sqrt(dr * dr + dg * dg + db * db) > 45;
    });
    if (isDistinct) {
      picked.push(shape(c.rgb));
    }
  }

  // Fallbacks if fewer than 4 distinct colors found
  while (picked.length < 4) {
    const fallbackColors: Rgb[] = [
      [140, 28, 64],
      [42, 75, 160],
      [130, 40, 150],
      [30, 110, 100],
    ];
    picked.push(fallbackColors[picked.length % fallbackColors.length]!);
  }

  // Distribute the 4 picked colors across the 4x4 (16 cells) in dispersed / pseudo-random order
  // so each color forms large overlapping blurred ambient zones across the canvas
  const pattern = [
    0, 1, 2, 3,
    2, 3, 0, 1,
    1, 0, 3, 2,
    3, 2, 1, 0,
  ];

  return pattern.map((idx) => picked[idx]!);
}

export function meshPalette(url: string): Promise<Rgb[]> {
  const known = cache.get(url);
  if (known) return Promise.resolve(known);
  return measure(url).then((cells) => {
    cache.set(url, cells);
    return cells;
  });
}
