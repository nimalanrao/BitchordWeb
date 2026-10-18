/**
 * Utility to process uploaded image files:
 * Automatically crops the image to a perfect 1:1 square aspect ratio
 * using Canvas without stretching or distortion.
 */
export async function cropImageToSquare(file: File, maxDimension = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;
        const minSide = Math.min(width, height);
        // Center crop coordinates
        const startX = (width - minSide) / 2;
        const startY = (height - minSide) / 2;

        const targetSize = Math.min(minSide, maxDimension);
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, targetSize, targetSize);

        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.onerror = () => reject(new Error('Failed to load image for square crop'));
      img.src = src;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Storage helpers for custom album covers (persisted in IndexedDB or localStorage)
 */
const STORAGE_PREFIX = 'bitchord:custom_cover:';

export interface CustomCoverData {
  type: 'image' | 'video';
  url: string;
  name: string;
  timestamp: number;
}

export function saveCustomCover(videoId: string, cover: CustomCoverData): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${videoId}`, JSON.stringify(cover));
    // Trigger custom event so reactive components update instantly
    window.dispatchEvent(new CustomEvent('bitchord:cover_updated', { detail: { videoId, cover } }));
  } catch (err) {
    console.warn('Failed to save custom cover to localStorage:', err);
  }
}

export function getCustomCover(videoId: string): CustomCoverData | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${videoId}`);
    if (!raw) return null;
    return JSON.parse(raw) as CustomCoverData;
  } catch {
    return null;
  }
}

export function removeCustomCover(videoId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${videoId}`);
    window.dispatchEvent(new CustomEvent('bitchord:cover_updated', { detail: { videoId, cover: null } }));
  } catch (err) {
    console.warn('Failed to remove custom cover:', err);
  }
}
