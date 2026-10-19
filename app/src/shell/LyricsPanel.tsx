// Registers <am-lyrics>.
import '@uimaxbai/am-lyrics/am-lyrics.js';
import { Check, ChevronDown, Languages, Loader2, Minus, Settings2, Speech } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Menu, MenuHeader, MenuItem, MenuSeparator } from '@/components/Menu';
import { LyricClock } from '@/lyrics/clock';
import { onUngrantedChange, ungrantedOrigins } from '@/lyrics/http';
import type { SourceState } from '@/lyrics/repository';
import { enabledSources } from '@/lyrics/settings';
import { sourceById, type LyricsSourceId } from '@/lyrics/sources';
import { useLyrics, useLyricsUi } from '@/lyrics/useLyrics';
import { getAudio, usePlayer } from '@/state/player';
import { LyricsSettings } from './LyricsSettings';

export type AmLyricsElement = HTMLElement & {
  currentTime: number;
  ttml?: string;
  interpolate: boolean;
  autoScroll: boolean;
  highlightColor: string;
  fontFamily?: string;
  updateComplete?: Promise<unknown>;
  showTranslation?: boolean;
  showRomanization?: boolean;
  toggleTranslation?: () => Promise<void>;
  toggleRomanization?: () => Promise<void>;
};

export async function toggleLyricsTranslation() {
  const elements = Array.from(document.querySelectorAll<AmLyricsElement>('am-lyrics'));
  for (const el of elements) {
    try {
      if (typeof el.toggleTranslation === 'function') {
        await el.toggleTranslation();
      } else {
        const btn = el.shadowRoot?.querySelector('button[title="Toggle Translation"]') as HTMLButtonElement | null;
        btn?.click();
      }
    } catch (err) {
      console.warn('Error toggling translation:', err);
      const btn = el.shadowRoot?.querySelector('button[title="Toggle Translation"]') as HTMLButtonElement | null;
      btn?.click();
    }
  }
}

export async function toggleLyricsRomanization() {
  const elements = Array.from(document.querySelectorAll<AmLyricsElement>('am-lyrics'));
  for (const el of elements) {
    try {
      if (typeof el.toggleRomanization === 'function') {
        await el.toggleRomanization();
      } else {
        const btn = el.shadowRoot?.querySelector('button[title="Toggle Romanization"]') as HTMLButtonElement | null;
        btn?.click();
      }
    } catch (err) {
      console.warn('Error toggling romanization:', err);
      const btn = el.shadowRoot?.querySelector('button[title="Toggle Romanization"]') as HTMLButtonElement | null;
      btn?.click();
    }
  }
}

/**
 * am-lyrics' own footer offers to fetch from its own providers; ours decide
 * (prompt §10.2). It stays in the layout, only unseen: am-lyrics measures its
 * scroll range to the footer, and `display: none` collapsed that range to zero,
 * so the lyrics never scrolled.
 */
const HIDE_FOOTER =
  '.lyrics-footer { visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; user-select: none !important; } ' +
  '.lyrics-footer * { visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; user-select: none !important; } ' +
  '.lyrics-header, .header-controls, .download-controls, .format-select, .download-button ' +
  '{ display: none !important; visibility: hidden !important; height: 0 !important; width: 0 !important; ' +
  'max-height: 0 !important; max-width: 0 !important; margin: 0 !important; padding: 0 !important; opacity: 0 !important; ' +
  'pointer-events: none !important; position: absolute !important; overflow: hidden !important; }';

/**
 * High-precision Native OS World Typography:
 * - 'BitChord SF Pro Display' + 'DM Sans' for Latin, Cyrillic, and Greek
 * - 'Nirmala UI' (Windows) & 'Kohinoor' (Apple) for all Indic scripts (Malayalam, Hindi/Devanagari, Tamil, Telugu, Kannada, Bengali, Punjabi)
 * - 'Yu Gothic UI' / 'Meiryo' & 'Hiragino Sans' for Japanese
 * - 'Malgun Gothic' & 'Apple SD Gothic Neo' for Korean
 * - 'Microsoft YaHei UI' & 'PingFang SC' for Chinese
 * - 'Segoe UI' & 'Geeza Pro' for Arabic, Hebrew, and Middle Eastern scripts
 * - 'Leelawadee UI' for Thai
 * Zero download lag, no font-swap jumping, and no vowel mark / diacritic clipping.
 */
const LYRIC_FONT =
  "'BitChord SF Pro Display', 'DM Sans', 'Nirmala UI', 'Yu Gothic UI', 'Yu Gothic', 'Meiryo', 'Malgun Gothic', 'Microsoft YaHei UI', 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans', 'Apple SD Gothic Neo', 'Kohinoor Devanagari', 'Kohinoor Bangla', 'Kohinoor Telugu', 'Segoe UI Variable Text', 'Segoe UI', 'Leelawadee UI', -apple-system, BlinkMacSystemFont, Roboto, system-ui, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'";

let lyricFont: Promise<void> | null = null;
let lyricFontLoaded = false;

/**
 * Ensures 'BitChord SF Pro Display' is active before measuring am-lyrics layout.
 * Native OS world fonts are instant (0ms delay), so lyrics initialize immediately.
 */
function loadLyricFont(): Promise<void> {
  lyricFont ??= Promise.race([
    Promise.all([
      document.fonts.load("700 28px 'BitChord SF Pro Display'"),
      document.fonts.load("400 28px 'BitChord SF Pro Display'"),
      document.fonts.load("700 28px 'DM Sans'"),
    ]),
    new Promise((resolve) => setTimeout(resolve, 800)),
  ])
    .catch(() => undefined)
    .then(() => {
      lyricFontLoaded = true;
    });
  return lyricFont;
}

function useLyricFont(): boolean {
  const [ready, setReady] = useState(lyricFontLoaded);
  useEffect(() => {
    if (!ready) void loadLyricFont().then(() => setReady(true));
  }, [ready]);
  return ready;
}

/**
 * am-lyrics fades the four lines either side of the current one (0.7, 0.58,
 * 0.46) and leaves every line past them at its base 0.8, so the fifth line on
 * came back brighter. Those stay at the farthest step. Gaps keep their own
 * opacity, and the library's !important rules (scrolling by hand, unsynced
 * lyrics) still win.
 */
const FAR_LINES =
  '.lyrics-line:not(.active):not(.pre-active):not(.lyrics-activest):not(.post-active-line):not(.next-active-line)' +
  ':not(.prev-2):not(.prev-3):not(.next-2):not(.next-3):not(.lyrics-gap) { opacity: 0.46; }';

/**
 * The full-screen player's sizing (report §7): its line size, set on the host
 * by breakpoint, replaces all three of am-lyrics' container tiers, and the
 * current line sits a third of the way down. Scoped to `data-full`, so the
 * side panel keeps the library's own sizes.
 */
const FULL_SIZE =
  ':host([data-full]) .lyrics-container { --lyplus-font-size-base: var(--bitchord-lyric-size, 34px);' +
  ' --am-lyrics-line-height: 1.2; --am-lyrics-line-spacing: calc(var(--bitchord-lyric-size, 34px) * 0.7);' +
  ' --lyrics-scroll-padding-top: 30%; --am-lyrics-inline-padding: 0px; }';

/**
 * am-lyrics, exactly as it is, fed our TTML and a steered clock (prompt §10.2).
 * The clock reads the media time each frame, stamps the reading with when it
 * was taken, and is told about every seek and track change: the "lyric clock
 * dates readings by sample time" lesson. No React state per frame: the time is
 * written straight onto the element.
 */
function LyricsView({ ttml, full }: { ttml: string; full: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const element = useRef<AmLyricsElement | null>(null);
  const deck = usePlayer((s) => s.deck);
  const videoId = usePlayer((s) => s.nowPlaying?.videoId);

  // Created by hand, with its TTML set before it's attached: am-lyrics starts
  // loading the moment it connects, and through React the properties arrive
  // a beat later, so its first load went to its own providers with no title
  // and finished after ours, wiping it.
  useEffect(() => {
    const el = document.createElement('am-lyrics') as AmLyricsElement;
    el.ttml = ttml;
    el.interpolate = true;
    el.autoScroll = true;
    el.setAttribute('autoscroll', '');
    el.highlightColor = '#ffffff';
    el.fontFamily = LYRIC_FONT;
    el.className = 'block min-h-0 flex-1 overflow-hidden [--am-lyrics-highlight-color:#fff]';
    el.toggleAttribute('data-full', full);
    const onLineClick = (event: Event) => {
      const timestamp = (event as CustomEvent<{ timestamp: number }>).detail?.timestamp;
      if (typeof timestamp === 'number') usePlayer.getState().seek(timestamp / 1000);
    };
    el.addEventListener('line-click', onLineClick);
    host.current?.append(el);
    element.current = el;
    const unmounted = new AbortController();
    const injectHideStyles = (root: ShadowRoot) => {
      if (!root.querySelector('style[data-bitchord-hide]')) {
        const style = document.createElement('style');
        style.setAttribute('data-bitchord-hide', 'true');
        style.textContent = HIDE_FOOTER;
        root.appendChild(style);
      }
      const header = root.querySelector('.lyrics-header');
      if (header) {
        (header as HTMLElement).style.setProperty('display', 'none', 'important');
        (header as HTMLElement).style.setProperty('visibility', 'hidden', 'important');
      }
      const footer = root.querySelector('.lyrics-footer');
      if (footer) {
        (footer as HTMLElement).style.removeProperty('display');
        (footer as HTMLElement).style.removeProperty('height');
        (footer as HTMLElement).style.removeProperty('position');
        (footer as HTMLElement).style.setProperty('visibility', 'hidden', 'important');
        (footer as HTMLElement).style.setProperty('opacity', '0', 'important');
        (footer as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
      }
    };

    void Promise.resolve(el.updateComplete).then(() => {
      const root = el.shadowRoot;
      if (!root) return;
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(HIDE_FOOTER + FAR_LINES + FULL_SIZE);
      root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet];
      injectHideStyles(root);

      const observer = new MutationObserver(() => injectHideStyles(root));
      observer.observe(root, { childList: true, subtree: true });
      unmounted.signal.addEventListener('abort', () => observer.disconnect());

      // The full-screen column fades its top edge, but am-lyrics' toolbar
      // (romanize, translate, download) sits at the top of the same scroller
      // until the lines push it away. The fade grows with the scroll instead,
      // so the toolbar is never under it.
      const scroller = root.querySelector('.lyrics-container');
      const target = host.current;
      if (!full || !scroller || !target) return;
      const fade = () => target.style.setProperty('--lyrics-top-fade', `${Math.min(scroller.scrollTop, 80)}px`);
      fade();
      scroller.addEventListener('scroll', fade, { passive: true, signal: unmounted.signal });
    });
    return () => {
      unmounted.abort();
      el.removeEventListener('line-click', onLineClick);
      el.remove();
      element.current = null;
    };
    // Mounted once; a new provider's TTML is handed over below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (element.current && element.current.ttml !== ttml) element.current.ttml = ttml;
  }, [ttml]);

  useEffect(() => {
    const audio = getAudio();
    const el = element.current;
    if (!audio || !el) return;
    const clock = new LyricClock(audio.currentTime * 1000);
    let discontinuity = 0;
    let frame = 0;
    const tick = () => {
      const now = performance.now();
      // The reading and its stamp are taken together.
      el.currentTime = clock.frame(now, Math.trunc(audio.currentTime * 1000), now, discontinuity);
      frame = requestAnimationFrame(tick);
    };
    const hold = () => {
      cancelAnimationFrame(frame);
      const ms = audio.currentTime * 1000;
      clock.hold(ms, performance.now());
      el.currentTime = ms;
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      clock.restart();
      frame = requestAnimationFrame(tick);
    };
    const onSeeking = () => {
      discontinuity++;
      if (audio.paused) hold();
    };
    audio.addEventListener('seeking', onSeeking);
    audio.addEventListener('seeked', onSeeking);
    audio.addEventListener('pause', hold);
    audio.addEventListener('play', resume);
    if (audio.paused) hold();
    else resume();
    return () => {
      cancelAnimationFrame(frame);
      audio.removeEventListener('seeking', onSeeking);
      audio.removeEventListener('seeked', onSeeking);
      audio.removeEventListener('pause', hold);
      audio.removeEventListener('play', resume);
    };
  }, [deck, videoId, ttml]);

  // am-lyrics renders and scrolls itself; it only needs the space. Full screen fades it out at the top and bottom.
  return (
    <div
      ref={host}
      className={
        full
          ? 'flex min-h-0 flex-1 [mask-image:linear-gradient(180deg,transparent,#000_var(--lyrics-top-fade,0px),#000_50%,transparent)]'
          : 'flex min-h-0 flex-1'
      }
    />
  );
}

function useUngranted(): string[] {
  return useSyncExternalStore(onUngrantedChange, () => [...ungrantedOrigins].join(','), () => '')
    .split(',')
    .filter(Boolean);
}

const NO_STATES: Partial<Record<LyricsSourceId, SourceState>> = {};

/** The provider picker: which provider these lyrics are from, and the others' answers for this track. */
export function ProviderPicker({
  current,
  full,
  className,
}: {
  current: LyricsSourceId | null;
  full: boolean;
  className?: string;
}) {
  const videoId = usePlayer((s) => s.nowPlaying?.videoId ?? '');
  const states = useLyricsUi((s) => s.states[videoId]) ?? NO_STATES;
  const picked = useLyricsUi((s) => s.picked[videoId]);
  const pick = useLyricsUi((s) => s.pick);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [settings, setSettings] = useState(false);
  const close = useCallback(() => setAnchor(null), []);
  const label = current ? sourceById(current)?.label : 'Lyrics';

  return (
    // In full screen the picker sits quietly above the lines, shown on hover (unless overridden via className).
    <div
      className={
        className !== undefined
          ? className
          : full
          ? 'flex items-center justify-between pb-1 opacity-0 transition-opacity duration-200 group-hover/panel:opacity-100 focus-within:opacity-100'
          : 'flex items-center justify-between px-4 pt-4 pb-1'
      }
    >
      <button
        className={
          full
            ? 'inline-flex items-center gap-1 rounded-[10px] px-2.5 py-1.5 text-sm font-semibold text-white/80 hover:text-white hover:bg-white/15 transition'
            : 'inline-flex items-center gap-1 rounded-[8px] px-2 py-1 type-callout-emphasized text-secondary hover:bg-quinary'
        }
        aria-haspopup="menu"
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        <span>{label}</span>
        <ChevronDown size={14} />
      </button>
      <div className="flex items-center gap-1">
        <button
          className={
            full
              ? 'grid size-8 place-items-center rounded-[10px] text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer'
              : 'grid size-7 place-items-center rounded-[8px] text-secondary hover:bg-quinary cursor-pointer'
          }
          aria-label="Translate lyrics"
          title="Translate lyrics"
          onClick={() => void toggleLyricsTranslation()}
        >
          <Languages size={full ? 16 : 14} />
        </button>
        <button
          className={
            full
              ? 'grid size-8 place-items-center rounded-[10px] text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer'
              : 'grid size-7 place-items-center rounded-[8px] text-secondary hover:bg-quinary cursor-pointer'
          }
          aria-label="Romanize lyrics"
          title="Romanize lyrics"
          onClick={() => void toggleLyricsRomanization()}
        >
          <Speech size={full ? 16 : 14} />
        </button>
        <button
          className={
            full
              ? 'grid size-8 place-items-center rounded-[10px] text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer'
              : 'grid size-7 place-items-center rounded-[8px] text-secondary hover:bg-quinary cursor-pointer'
          }
          aria-label="Lyric settings"
          title="Lyric settings"
          onClick={() => setSettings(true)}
        >
          <Settings2 size={16} />
        </button>
      </div>
      {anchor && (
        <Menu anchor={anchor} placement="below-end" onClose={close} label="Lyrics provider">
          <MenuItem checked={!picked} onSelect={() => (close(), pick(videoId, null))}>
            Best available
          </MenuItem>
          <MenuSeparator />
          <MenuHeader>Providers</MenuHeader>
          {enabledSources().map((id) => {
            const state = states[id];
            return (
              <MenuItem
                key={id}
                checked={picked === id}
                trailing={
                  state === 'pending' ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : state === 'found' ? (
                    <Check size={13} />
                  ) : state === 'missing' ? (
                    <Minus size={13} />
                  ) : undefined
                }
                onSelect={() => (close(), pick(videoId, id))}
              >
                {sourceById(id)?.label}
              </MenuItem>
            );
          })}
          <MenuSeparator />
          <MenuItem
            icon={<Languages size={15} />}
            onSelect={() => {
              close();
              void toggleLyricsTranslation();
            }}
          >
            Translate Lyrics
          </MenuItem>
          <MenuItem
            icon={<Speech size={15} />}
            onSelect={() => {
              close();
              void toggleLyricsRomanization();
            }}
          >
            Romanize Lyrics
          </MenuItem>
          <MenuSeparator />
          <MenuItem onSelect={() => (close(), setSettings(true))}>Lyric Settings…</MenuItem>
        </Menu>
      )}
      {settings && <LyricsSettings onClose={() => setSettings(false)} />}
    </div>
  );
}



const panel = 'group/panel relative isolate flex min-h-0 flex-1 flex-col overflow-hidden';
// The full-screen player's column (report §7): lines 26px, then 30px from 980px, 36px from 1320px and 42px from 1680px.
const fullSizes =
  '[--bitchord-lyric-size:26px] min-[980px]:[--bitchord-lyric-size:30px] min-[1320px]:[--bitchord-lyric-size:36px] min-[1680px]:[--bitchord-lyric-size:42px]';

/**
 * The lyrics, with their provider picker and empty states: the side panel
 * (report §7), and the right-hand column of the full-screen player, where the
 * lines are larger and the player's mesh stands in for the Canvas.
 */
export function LyricsPanel({
  variant = 'panel',
  showPicker = true,
}: {
  variant?: 'panel' | 'full';
  showPicker?: boolean;
}) {
  const lyrics = useLyrics();
  const hasTrack = usePlayer((s) => s.nowPlaying !== null);
  const fontReady = useLyricFont();
  const result = lyrics.data;
  const full = variant === 'full';
  const empty = full
    ? 'flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center type-title-3 text-secondary'
    : 'flex flex-1 flex-col items-center justify-center gap-2 px-6 pb-20 text-center type-[400_12px/16px] text-secondary';
  const emptyTitle = full ? 'type-title-1-emphasized text-primary' : 'type-[600_12px/16px]';

  return (
    <div className={full ? `${panel} ${fullSizes}` : panel}>
      {showPicker && <ProviderPicker current={result?.source ?? null} full={full} />}
      {!hasTrack ? (
        <div className={empty}>
          <p className={emptyTitle}>No lyrics available</p>
          <p>Play a song to see its lyrics here.</p>
        </div>
      ) : (lyrics.isPending && lyrics.fetchStatus !== 'idle') || (result && !fontReady) ? (
        <div className={empty}>
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : result ? (
        <LyricsView ttml={result.ttml} full={full} />
      ) : (
        <div className={empty}>
          <p className={emptyTitle}>No lyrics available</p>
          <p>None of the lyric providers has this song. Try another in the list above.</p>
        </div>
      )}
    </div>
  );
}
