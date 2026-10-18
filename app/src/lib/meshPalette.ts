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
 * Extracts 4 distinct, prominent colors from the artwork and places them in
 * 4 random/dispersed spots across the screen with 100% soft live blur.
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

  // Group pixels into color buckets and find distinct color clusters
  const candidates: { rgb: Rgb; sat: number; lum: number; count: number }[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const sat = max === 0 ? 0 : (max - min) / max;
    if (lum > 0.03 && lum < 0.95) {
      candidates.push({ rgb: [r, g, b], sat, lum, count: 1 });
    }
  }

  // Sort candidates prioritizing high saturation and contrast
  candidates.sort((a, b) => (b.sat * 2 + b.lum) - (a.sat * 2 + a.lum));

  // Pick 4 maximally distinct colors
  const picked: Rgb[] = [];
  for (const c of candidates) {
    if (picked.length >= 4) break;
    const isDistinct = picked.every((p) => {
      const dr = p[0] - c.rgb[0];
      const dg = p[1] - c.rgb[1];
      const db = p[2] - c.rgb[2];
      return Math.sqrt(dr * dr + dg * dg + db * db) > 55;
    });
    if (isDistinct) {
      picked.push(shape(c.rgb));
    }
  }

  // Curated dark ambient aesthetic fallback palette (warm red/coral, deep blue/cyan, violet/magenta, deep emerald)
  const defaultColors: Rgb[] = [
    [155, 32, 58],   // Crimson/Coral
    [26, 68, 160],   // Deep Indigo/Blue
    [135, 38, 145],  // Purple/Magenta
    [25, 115, 110],  // Cyan/Teal
  ].map((c) => shape(c as Rgb));

  while (picked.length < 4) {
    picked.push(defaultColors[picked.length % defaultColors.length]!);
  }

  return picked.slice(0, 4);
}

export function meshPalette(url: string): Promise<Rgb[]> {
  const known = cache.get(url);
  if (known) return Promise.resolve(known);
  return measure(url).then((cells) => {
    cache.set(url, cells);
    return cells;
  });
}
