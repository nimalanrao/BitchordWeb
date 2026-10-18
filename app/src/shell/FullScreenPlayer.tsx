import {
  Cast,
  Check,
  Disc3,
  Download,
  Heart,
  ListMusic,
  Maximize,
  Minimize,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  SquarePen,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  BackwardIcon,
  ForwardIcon,
  LyricsActiveIcon,
  LyricsIcon,
  PauseIcon,
  PlayIcon,
  RepeatIcon,
  RepeatOneIcon,
  ShuffleIcon,
  UpNextIcon,
  VolumeIcon,
} from '@/components/icons/Transport';
import { ExplicitBadge } from '@/components/music/ExplicitBadge';
import { FavoriteButton } from '@/components/music/FavoriteButton';
import { albumHref } from '@/components/music/links';
import { MotionArtwork } from '@/components/music/MotionArtwork';
import { VideoSurface } from '@/components/music/VideoSurface';
import { useTrackMotion } from '@/data/apple/motionArt';
import { useLikeStatus, useSetLiked, useSignedIn } from '@/data/music/queries';
import { sizedArtwork } from '@/lib/artwork';
import { useLyrics } from '@/lyrics/useLyrics';
import { getAudio, usePlayer } from '@/state/player';
import { useUi } from '@/state/ui';
import { useHasVideo, useVideo } from '@/state/video';
import { Credits, PageLink, pageLink } from './Lcd';
import { LyricsPanel } from './LyricsPanel';
import { LyricsSettings } from './LyricsSettings';
import { MeshBackdrop } from './MeshBackdrop';
import { albumPageFor } from './nowPlayingLinks';
import { UpNext } from './UpNext';
import { clock, useScrubber } from './useScrubber';

function useBrowserFullScreen(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      document.addEventListener('fullscreenchange', onChange);
      return () => document.removeEventListener('fullscreenchange', onChange);
    },
    () => document.fullscreenElement !== null,
  );
}

/** The seek line under the track's names: thicker on hover, with the times beneath its ends. */
function Scrubber() {
  const { bar, elapsed, remaining, dragging, handlers } = useScrubber();
  return (
    <div className="group/scrub mt-3.5" data-dragging={dragging || undefined}>
      <div className="group/hit flex h-4 cursor-pointer touch-none items-center" {...handlers}>
        <div
          className="h-1 flex-1 overflow-hidden rounded-[999px] bg-quaternary transition-[height] duration-120 ease-in group-hover/hit:h-2 group-data-dragging/scrub:h-2"
          aria-hidden="true"
        >
          <div
            ref={bar}
            className="size-full origin-left scale-x-(--progress) bg-secondary transition-[background-color] duration-120 ease-in [--progress:0] group-hover/hit:bg-primary group-data-dragging/scrub:bg-primary"
          />
        </div>
      </div>
      <div className="mt-0.5 flex justify-between type-[500_11px/14px] tabular-nums text-tertiary">
        <span ref={elapsed} />
        <span ref={remaining} />
      </div>
    </div>
  );
}

/** 1:1 Apple Music Wavy Sine Wave Scrubber with fluid animated wave and circular thumb */
function WavyScrubber() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elapsedRef = useRef<HTMLSpanElement>(null);
  const durationRef = useRef<HTMLSpanElement>(null);
  const status = usePlayer((s) => s.status);
  const deck = usePlayer((s) => s.deck);
  const seek = usePlayer((s) => s.seek);
  const [dragging, setDragging] = useState<number | null>(null);
  const draggingRef = useRef<number | null>(null);
  draggingRef.current = dragging;

  useEffect(() => {
    const audio = getAudio();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let phase = 0;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      if (w > 0 && h > 0) {
        const targetW = Math.round(w * dpr);
        const targetH = Math.round(h * dpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        const duration = audio?.duration ?? 0;
        const current =
          draggingRef.current !== null && Number.isFinite(duration)
            ? draggingRef.current * duration
            : (audio?.currentTime ?? 0);
        const fraction = duration > 0 ? Math.min(1, Math.max(0, current / duration)) : 0;

        if (elapsedRef.current) elapsedRef.current.textContent = clock(current);
        if (durationRef.current) durationRef.current.textContent = clock(duration || 0);

        const cy = h / 2;
        const playedWidth = fraction * w;

        // Draw unplayed line (straight subtle line)
        if (playedWidth < w) {
          ctx.beginPath();
          ctx.moveTo(playedWidth, cy);
          ctx.lineTo(w, cy);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // Draw played line (wavy sine wave)
        if (playedWidth > 0) {
          ctx.beginPath();
          ctx.moveTo(0, cy);
          const wavelength = 18;
          const amplitude = 3;
          for (let x = 0; x <= playedWidth; x += 1.5) {
            const y = cy + amplitude * Math.sin(((x - phase) / wavelength) * 2 * Math.PI);
            ctx.lineTo(x, y);
          }
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // Draw white circular thumb at (playedWidth, cy)
        ctx.beginPath();
        ctx.arc(playedWidth, cy, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 4;
        ctx.fill();

        ctx.restore();
      }

      if (audio && !audio.paused) {
        phase = (phase + 0.35) % 18;
      }

      frame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frame);
  }, [status, deck]);

  const fractionAt = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  };

  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (!getAudio()) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(fractionAt(e));
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (draggingRef.current !== null) setDragging(fractionAt(e));
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      if (draggingRef.current === null) return;
      const audio = getAudio();
      if (audio && Number.isFinite(audio.duration)) seek(fractionAt(e) * audio.duration);
      setDragging(null);
    },
    onPointerCancel: () => setDragging(null),
  };

  return (
    <div className="w-full max-w-[360px] mx-auto mt-4 select-none">
      <div className="flex items-center gap-2.5">
        <span ref={elapsedRef} className="text-[11px] font-medium tabular-nums text-white/60 min-w-[32px] text-right">
          0:00
        </span>
        <div className="flex-1 h-6 cursor-pointer touch-none flex items-center relative" {...handlers}>
          <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
        <span ref={durationRef} className="text-[11px] font-medium tabular-nums text-white/60 min-w-[32px]">
          0:00
        </span>
      </div>
    </div>
  );
}

const transportButton =
  'grid place-items-center rounded-full transition-[background-color,scale] duration-100 ease-in enabled:hover:bg-quinary enabled:active:scale-90 disabled:opacity-40';
const toggle = `${transportButton} size-9 text-tertiary aria-pressed:text-primary`;
const skip = `${transportButton} size-12 text-primary`;

function Transport() {
  const hasTrack = usePlayer((s) => s.nowPlaying !== null);
  const playing = usePlayer((s) => s.status === 'playing' || s.status === 'buffering');
  const hasNext = usePlayer((s) => s.index + 1 < s.queue.length || s.repeat !== 'off' || (s.autoplay && s.index >= 0));
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const { togglePlay, next, previous, toggleShuffle, cycleRepeat } = usePlayer.getState();

  return (
    <div className="mx-auto mt-[clamp(8px,1.6vh,16px)] mb-0 flex h-13 w-[min(100%,315px)] items-center justify-between">
      <button className={toggle} aria-label="Shuffle" aria-pressed={shuffle} onClick={toggleShuffle}>
        <ShuffleIcon size={30} />
      </button>
      <button className={skip} disabled={!hasTrack} aria-label="Previous" onClick={previous}>
        <BackwardIcon size={40} />
      </button>
      <button className={`${transportButton} size-14 text-primary`} disabled={!hasTrack} aria-label={playing ? 'Pause' : 'Play'} onClick={togglePlay}>
        {playing ? <PauseIcon size={48} /> : <PlayIcon size={48} />}
      </button>
      <button className={skip} disabled={!hasTrack || !hasNext} aria-label="Next" onClick={next}>
        <ForwardIcon size={40} />
      </button>
      <button
        className={toggle}
        aria-label={repeat === 'one' ? 'Repeat one' : repeat === 'all' ? 'Repeat all' : 'Repeat'}
        aria-pressed={repeat !== 'off'}
        onClick={cycleRepeat}
      >
        {repeat === 'one' ? <RepeatOneIcon size={30} /> : <RepeatIcon size={30} />}
      </button>
    </div>
  );
}

/** 1:1 Apple Music Cinematic Transport with Solid White Circle Play/Pause Button */
function CinematicTransport() {
  const hasTrack = usePlayer((s) => s.nowPlaying !== null);
  const playing = usePlayer((s) => s.status === 'playing' || s.status === 'buffering');
  const hasNext = usePlayer((s) => s.index + 1 < s.queue.length || s.repeat !== 'off' || (s.autoplay && s.index >= 0));
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const { togglePlay, next, previous, toggleShuffle, cycleRepeat } = usePlayer.getState();

  return (
    <div className="mx-auto mt-2 flex h-16 w-full max-w-[340px] items-center justify-between px-2">
      <button
        className={`grid place-items-center size-9 rounded-full transition-colors ${
          shuffle ? 'text-white' : 'text-white/40 hover:text-white'
        }`}
        aria-label="Shuffle"
        onClick={toggleShuffle}
      >
        <Shuffle size={20} />
      </button>

      <button
        className="grid place-items-center size-10 rounded-full text-white/80 hover:text-white active:scale-90 transition disabled:opacity-40"
        disabled={!hasTrack}
        aria-label="Previous"
        onClick={previous}
      >
        <SkipBack size={26} fill="currentColor" />
      </button>

      {/* Solid White Circle Play/Pause Button */}
      <button
        className="grid place-items-center size-14 rounded-full bg-white text-black shadow-[0_4px_16px_rgba(0,0,0,0.4)] hover:scale-105 active:scale-95 transition-transform"
        disabled={!hasTrack}
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={togglePlay}
      >
        {playing ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" className="ml-1" />}
      </button>

      <button
        className="grid place-items-center size-10 rounded-full text-white/80 hover:text-white active:scale-90 transition disabled:opacity-40"
        disabled={!hasTrack || !hasNext}
        aria-label="Next"
        onClick={next}
      >
        <SkipForward size={26} fill="currentColor" />
      </button>

      <button
        className={`grid place-items-center size-9 rounded-full transition-colors ${
          repeat !== 'off' ? 'text-white' : 'text-white/40 hover:text-white'
        }`}
        aria-label={repeat === 'one' ? 'Repeat one' : repeat === 'all' ? 'Repeat all' : 'Repeat'}
        onClick={cycleRepeat}
      >
        {repeat === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
      </button>
    </div>
  );
}

const volumeSliderInput = [
  'h-4 flex-1 cursor-pointer appearance-none bg-transparent touch-none',
  '[&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-[999px] [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--systemPrimary)_var(--fill),var(--systemQuaternary)_var(--fill))]',
  '[&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-[999px] [&::-moz-range-track]:bg-[linear-gradient(to_right,var(--systemPrimary)_var(--fill),var(--systemQuaternary)_var(--fill))]',
  '[&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_3px_#0008] [&::-webkit-slider-thumb]:transition-[transform] [&::-webkit-slider-thumb]:duration-100 hover:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-125',
  '[&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_0_3px_#0008] [&::-moz-range-thumb]:transition-[transform] [&::-moz-range-thumb]:duration-100 hover:[&::-moz-range-thumb]:scale-110 active:[&::-moz-range-thumb]:scale-125',
].join(' ');

function VolumeSlider() {
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);
  const level = muted ? 0 : volume;

  return (
    <div className="mt-[clamp(12px,2vh,22px)] mb-0 flex h-7 w-full min-w-full items-center gap-2.5">
      <button
        className="grid size-6 flex-none place-items-center rounded-full text-secondary transition-colors duration-100 hover:text-primary active:scale-90"
        aria-label={muted ? 'Unmute' : 'Mute'}
        aria-pressed={muted}
        onClick={toggleMute}
      >
        <VolumeIcon level={0} size={16} />
      </button>
      <input
        className={volumeSliderInput}
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={level}
        aria-label="Volume"
        style={{ '--fill': `${level * 100}%` } as React.CSSProperties}
        onChange={(e) => setVolume(Number(e.currentTarget.value))}
      />
      <button
        className="grid size-6 flex-none place-items-center rounded-full text-secondary transition-colors duration-100 hover:text-primary active:scale-90"
        aria-label="Full volume"
        onClick={() => setVolume(1)}
      >
        <VolumeIcon level={1} size={16} />
      </button>
    </div>
  );
}

const chrome =
  'absolute z-1 grid size-8 place-items-center rounded-full text-secondary transition-[background-color,color] duration-100 ease-in hover:bg-quinary hover:text-primary';
const artworkLayer = 'absolute inset-0 size-full rounded-[inherit] object-cover opacity-0 transition-opacity duration-300 ease-in';
const IDLE_MS = 3000;

export interface FullScreenPlayerProps {
  isClosing?: boolean;
  onClosed?: () => void;
}

export function FullScreenPlayer({ isClosing = false, onClosed }: FullScreenPlayerProps = {}) {
  const nowPlaying = usePlayer((s) => s.nowPlaying);
  const playerTheme = usePlayer((s) => s.playerTheme);
  const queue = usePlayer((s) => s.queue);
  const currentIndex = usePlayer((s) => s.index);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);

  const track = usePlayer((s) => {
    const entry = s.queue[s.index]?.track;
    return entry && entry.videoId === s.nowPlaying?.videoId ? entry : null;
  });

  const nextTrack = queue[currentIndex + 1]?.track ?? null;

  const motion = useTrackMotion(nowPlaying?.title, nowPlaying?.artist, track?.album?.name);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const openedAt = useRef(pathname);
  const playing = usePlayer((s) => s.status === 'playing' || s.status === 'buffering');
  const setFullScreen = useUi((s) => s.setFullScreen);
  const lyrics = useLyrics();
  const video = useHasVideo(nowPlaying?.videoId);

  const [panel, setPanel] = useState<'lyrics' | 'queue' | null>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return null;
    }
    return nowPlaying && useVideo.getState().videoId === nowPlaying.videoId ? null : 'lyrics';
  });

  const picked = useRef(false);
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const browserFullScreen = useBrowserFullScreen();
  const close = useRef<HTMLButtonElement>(null);
  const enteredBrowserFullScreen = useRef(false);

  // Cinematic theme state
  const [spinning, setSpinning] = useState(false);
  const [showLyricsSettings, setShowLyricsSettings] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Favorites tracking (both signed in and guest local storage)
  const signedIn = useSignedIn();
  const likeStatus = useLikeStatus(nowPlaying?.videoId ?? null);
  const setLiked = useSetLiked();
  const [localFav, setLocalFav] = useState(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('bitchord:favorites') ?? '[]');
      return Array.isArray(favs) && nowPlaying ? favs.includes(nowPlaying.videoId) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!nowPlaying) return;
    try {
      const favs = JSON.parse(localStorage.getItem('bitchord:favorites') ?? '[]');
      setLocalFav(Array.isArray(favs) && favs.includes(nowPlaying.videoId));
    } catch {
      setLocalFav(false);
    }
  }, [nowPlaying?.videoId]);

  const isFavorite = signedIn ? likeStatus.data === 'LIKE' : localFav;

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!nowPlaying) return;
    if (signedIn) {
      setLiked.mutate({ videoId: nowPlaying.videoId, liked: !isFavorite });
    } else {
      const next = !localFav;
      setLocalFav(next);
      try {
        const favs = new Set<string>(JSON.parse(localStorage.getItem('bitchord:favorites') ?? '[]'));
        if (next) favs.add(nowPlaying.videoId);
        else favs.delete(nowPlaying.videoId);
        localStorage.setItem('bitchord:favorites', JSON.stringify([...favs]));
      } catch {
        // ignore
      }
    }
    showToast(isFavorite ? 'Removed from Favorites' : 'Added to Favorites');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  const handleDownload = () => {
    const audio = getAudio();
    const url = audio?.src;
    const fileName = `${nowPlaying?.artist ?? 'Artist'} - ${nowPlaying?.title ?? 'Track'}.mp3`;
    if (url && (url.startsWith('http') || url.startsWith('blob:'))) {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    showToast(`Downloading "${nowPlaying?.title}"...`);
  };

  const handleCast = () => {
    setFullScreen(false);
    navigate('/settings/listen-together');
  };

  const hasLyrics = !!lyrics.data || (lyrics.isPending && lyrics.fetchStatus !== 'idle');
  const showLyrics = panel === 'lyrics' && hasLyrics;
  const showQueue = panel === 'queue';
  const togglePanel = (p: 'lyrics' | 'queue') => {
    picked.current = true;
    setPanel((on) => (on === p ? null : p));
  };

  useEffect(() => {
    if (video && !picked.current) setPanel(null);
  }, [video]);

  const wake = () => {
    setIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIdle(true), IDLE_MS);
  };

  useEffect(() => {
    wake();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    close.current?.focus({ preventScroll: true });
    return () => {
      if (enteredBrowserFullScreen.current && document.fullscreenElement) void document.exitFullscreen();
      opener?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (pathname !== openedAt.current) setFullScreen(false);
  }, [pathname, setFullScreen]);

  useEffect(() => {
    if (!nowPlaying) setFullScreen(false);
  }, [nowPlaying, setFullScreen]);

  const toggleBrowserFullScreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen().then(
        () => (enteredBrowserFullScreen.current = true),
        () => undefined,
      );
    }
  };

  if (!nowPlaying) return null;
  const { videoId, title, artist } = nowPlaying;
  const album = track?.album ?? null;
  const column = showLyrics || showQueue;
  const theater = video && !column;
  const hidden = theater && playing && idle ? ' pointer-events-none opacity-0' : '';
  const corner = `${chrome} transition-[background-color,color,opacity] duration-300${hidden}`;

  useEffect(() => {
    if (isClosing) {
      const timer = setTimeout(() => {
        onClosed?.();
      }, 280);
      return () => clearTimeout(timer);
    }
  }, [isClosing, onClosed]);

  // =========================================================================
  // CINEMATIC CANVAS THEME (1:1 Apple Music layout from reference images)
  // =========================================================================
  if (playerTheme === 'cinematic' && !theater) {
    return (
      <div
        className={`fixed inset-0 z-[calc(var(--z-contextual-menus)-2)] isolate overflow-hidden bg-black text-white select-none ${
          isClosing
            ? 'animate-blur-fade-out pointer-events-none'
            : 'animate-enter motion-reduce:[animation-name:fade-in]'
        }`}
        onAnimationEnd={(e) => {
          if (isClosing && e.target === e.currentTarget) onClosed?.();
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Now Playing"
        data-full-screen
        data-paused={!playing || undefined}
        onPointerMove={wake}
        onPointerDown={wake}
        onKeyDown={wake}
      >
        {/* Ambient Blurred Colored Backdrop across the entire canvas */}
        <MeshBackdrop artworkUrl={nowPlaying.artworkUrl} playing={playing} />
        <div className="absolute inset-0 bg-black/45 pointer-events-none" />

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-white/20 backdrop-blur-xl border border-white/20 text-white text-xs font-semibold shadow-2xl animate-fade-in flex items-center gap-2">
            <Check size={14} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top-Right Browser Fullscreen Button */}
        {document.fullscreenEnabled && (
          <button
            className="absolute top-4 right-5 z-40 grid size-8 place-items-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition"
            aria-label={browserFullScreen ? 'Exit full screen' : 'Enter full screen'}
            onClick={toggleBrowserFullScreen}
          >
            {browserFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        )}

        {/* Main 2-Column Split Layout */}
        <div className="relative size-full flex flex-col md:flex-row items-stretch">
          {/* ================= LEFT COLUMN: Artwork & Player Controls ================= */}
          <div className="relative w-full md:w-1/2 h-full flex flex-col justify-between overflow-hidden">
            {/* Full-bleed Left Artwork with Vignettes and Right-edge Gradient Dissolve */}
            <div className="absolute inset-0 size-full overflow-hidden pointer-events-none">
              {nowPlaying.artworkUrl && (
                <img
                  src={sizedArtwork(nowPlaying.artworkUrl, 1200)}
                  alt=""
                  referrerPolicy="no-referrer"
                  decoding="async"
                  className={`size-full object-cover object-center transition-transform duration-1000 ${
                    spinning ? 'animate-[spin_20s_linear_infinite] scale-105' : ''
                  }`}
                  style={{
                    maskImage:
                      'linear-gradient(to right, black 55%, rgba(0,0,0,0.6) 80%, rgba(0,0,0,0.1) 95%, transparent 100%)',
                    WebkitMaskImage:
                      'linear-gradient(to right, black 55%, rgba(0,0,0,0.6) 80%, rgba(0,0,0,0.1) 95%, transparent 100%)',
                  }}
                />
              )}
              {motion && (
                <MotionArtwork
                  motion={motion}
                  className="absolute inset-0 size-full object-cover opacity-90 transition-opacity duration-600"
                  playing={playing}
                />
              )}
              {/* Top Vignette behind header controls */}
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 to-transparent" />
              {/* Bottom Vignette behind lower-third controls */}
              <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/95 via-black/60 to-transparent" />
            </div>

            {/* Top Header Buttons (Vinyl Disc, Queue List, Close) */}
            <div className="relative z-30 flex items-center justify-end gap-3 px-6 pt-5">
              <button
                onClick={() => {
                  setSpinning((s) => !s);
                  showToast(spinning ? 'Vinyl Canvas Off' : 'Vinyl Canvas On');
                }}
                className={`grid size-8 place-items-center rounded-full transition ${
                  spinning ? 'bg-white text-black' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                title="Toggle Vinyl Canvas"
                aria-label="Toggle Vinyl Canvas"
              >
                <Disc3 size={18} className={spinning ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => togglePanel('queue')}
                className={`grid size-8 place-items-center rounded-full transition ${
                  showQueue ? 'bg-white text-black' : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                title="Up Next Queue"
                aria-label="Up Next Queue"
              >
                <ListMusic size={18} />
              </button>
              <button
                ref={close}
                onClick={() => setFullScreen(false)}
                className="grid size-8 place-items-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition"
                title="Close"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Lower-Third Track Information & Working 1:1 Controls */}
            <div className="relative z-30 w-full max-w-[420px] mx-auto px-6 pb-8 pt-4 flex flex-col items-center">
              {/* Track Title */}
              <h1 className="text-2xl md:text-3xl font-bold text-white text-center tracking-tight leading-tight line-clamp-2 drop-shadow-md">
                {title}
              </h1>

              {/* Artist */}
              <div className="text-xs md:text-sm font-semibold text-white/80 text-center tracking-wider uppercase mt-1 drop-shadow-sm truncate max-w-full">
                {artist}
              </div>

              {/*  Audio Quality Lossless Badge */}
              <div className="flex items-center justify-center gap-1.5 mt-1.5 text-[10px] font-semibold tracking-wider text-white/50 uppercase select-none">
                <svg className="size-2.5 fill-current opacity-70" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.77 1.06-1.85.94-2.94-1 .04-2.18.66-2.88 1.48-.56.64-1.05 1.74-.92 2.81 1.11.09 2.23-.58 2.86-1.35z" />
                </svg>
                <span>HI-RES LOSSLESS · 24-BIT · 48 KHZ · FLAC · 1709 KBPS</span>
              </div>

              {/* 6-Button Utility Row */}
              <div className="flex items-center justify-center gap-5 mt-4 mb-1">
                {/* 1. Heart (Favorite) */}
                <button
                  onClick={handleToggleFavorite}
                  className="grid place-items-center size-8 rounded-full text-white/80 hover:text-white transition active:scale-90"
                  title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  aria-label="Favorite"
                >
                  <Heart size={19} className={isFavorite ? 'fill-red-500 text-red-500' : ''} />
                </button>

                {/* 2. Lyrics Source / Settings */}
                <button
                  onClick={() => setShowLyricsSettings(true)}
                  className="grid place-items-center size-8 rounded-full text-white/80 hover:text-white transition active:scale-90"
                  title="Lyrics Settings & Providers"
                  aria-label="Lyrics Settings"
                >
                  <SquarePen size={19} />
                </button>

                {/* 3. Download */}
                <button
                  onClick={handleDownload}
                  className="grid place-items-center size-8 rounded-full text-white/80 hover:text-white transition active:scale-90"
                  title="Download Track"
                  aria-label="Download"
                >
                  <Download size={19} />
                </button>

                {/* 4. Cast / Airplay (Listen Together) */}
                <button
                  onClick={handleCast}
                  className="grid place-items-center size-8 rounded-full text-white/80 hover:text-white transition active:scale-90"
                  title="Listen Together"
                  aria-label="Listen Together"
                >
                  <Cast size={19} />
                </button>

                {/* 5. Volume Speaker inside White Ring Border with Interactive Popover Slider */}
                <div className="relative group/vol">
                  <button
                    onClick={toggleMute}
                    className="grid place-items-center size-8 rounded-full border border-white/50 text-white/80 hover:text-white hover:border-white transition active:scale-95"
                    title={muted ? 'Unmute' : 'Mute'}
                    aria-label="Volume"
                  >
                    {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-black/85 backdrop-blur-md rounded-xl border border-white/10 opacity-0 pointer-events-none group-hover/vol:opacity-100 group-hover/vol:pointer-events-auto transition-opacity duration-150 flex flex-col items-center shadow-xl">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={muted ? 0 : volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-20 h-1 accent-white cursor-pointer"
                      aria-label="Volume Slider"
                    />
                  </div>
                </div>

                {/* 6. Up Next / Queue Toggle */}
                <button
                  onClick={() => togglePanel('queue')}
                  className={`grid place-items-center size-8 rounded-full transition active:scale-90 ${
                    showQueue ? 'text-white bg-white/20' : 'text-white/80 hover:text-white'
                  }`}
                  title="Toggle Queue"
                  aria-label="Toggle Queue"
                >
                  <ListMusic size={19} />
                </button>
              </div>

              {/* UP NEXT Badge */}
              <button
                onClick={() => nextTrack && usePlayer.getState().next()}
                className={`flex flex-col items-center justify-center mt-2 group text-center max-w-[320px] mx-auto select-none transition-transform active:scale-95 ${
                  nextTrack ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <span className="text-[10px] font-bold tracking-widest text-white/50 group-hover:text-white/80 uppercase transition-colors">
                  UP NEXT:
                </span>
                <span className="text-xs font-medium text-white/80 group-hover:text-white truncate max-w-[280px] mt-0.5 transition-colors">
                  {nextTrack
                    ? `${nextTrack.title} · ${nextTrack.artists?.map((a) => a.name).join(', ') || nextTrack.album?.name || ''}`
                    : 'AutoPlay Radio'}
                </span>
              </button>

              {/* Wavy Sine Wave Scrubber */}
              <WavyScrubber />

              {/* 1:1 Transport Controls with Solid White Play Button */}
              <CinematicTransport />
            </div>
          </div>

          {/* ================= RIGHT COLUMN: Synced Lyrics or Up Next ================= */}
          <div className="relative w-full md:w-1/2 h-full flex flex-col justify-center px-6 md:px-12 py-8 overflow-hidden">
            {showQueue ? (
              <div className="size-full overflow-hidden animate-fade-in [mask-image:linear-gradient(180deg,#000_calc(100%-80px),transparent)]">
                <UpNext />
              </div>
            ) : (
              <div className="size-full overflow-hidden animate-fade-in flex flex-col justify-center">
                <LyricsPanel variant="full" />
              </div>
            )}
          </div>
        </div>

        {/* Lyrics Settings Modal */}
        {showLyricsSettings && (
          <Suspense fallback={null}>
            <LyricsSettings onClose={() => setShowLyricsSettings(false)} />
          </Suspense>
        )}
      </div>
    );
  }

  // =========================================================================
  // CLASSIC LIVE MESH THEME (Fallback / Traditional View)
  // =========================================================================
  return (
    <div
      className={`fixed inset-0 z-[calc(var(--z-contextual-menus)-2)] isolate overflow-hidden text-primary [--art:min(32vw,calc(100dvh-360px),720px)] max-md:[--art:min(84vw,calc(100dvh-360px),420px)] ${
        isClosing
          ? 'animate-blur-fade-out pointer-events-none'
          : 'animate-enter motion-reduce:[animation-name:fade-in]'
      }`}
      onAnimationEnd={(e) => {
        if (isClosing && e.target === e.currentTarget) {
          onClosed?.();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Now Playing"
      data-full-screen
      data-paused={!playing || undefined}
      onPointerMove={wake}
      onPointerDown={wake}
      onKeyDown={wake}
      style={theater && playing && idle ? { cursor: 'none' } : undefined}
    >
      <MeshBackdrop artworkUrl={nowPlaying.artworkUrl} playing={playing} />
      {theater && (
        <div className="absolute inset-0 animate-fade-in bg-black">
          <VideoSurface fit="contain" className="size-full" />
        </div>
      )}

      <button ref={close} className={`${corner} top-4 left-5`} aria-label="Close" onClick={() => setFullScreen(false)}>
        <X size={20} />
      </button>
      {document.fullscreenEnabled && (
        <button
          className={`${corner} top-4 right-5`}
          aria-label={browserFullScreen ? 'Exit full screen' : 'Enter full screen'}
          onClick={toggleBrowserFullScreen}
        >
          {browserFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      )}

      <div
        className={
          theater
            ? `absolute inset-x-0 bottom-0 flex justify-center bg-[linear-gradient(to_top,rgb(0_0_0/0.72),rgb(0_0_0/0.35)_55%,transparent)] px-6 pt-32 pb-16 transition-opacity duration-300${hidden}`
            : `grid h-full items-center justify-center gap-x-[clamp(48px,7vw,144px)] px-[clamp(24px,9vw,144px)] py-16 max-md:px-6 max-md:pb-18 ${
                column
                  ? 'grid-cols-[var(--art)_minmax(0,38vw)] max-md:grid-cols-[minmax(0,1fr)] max-md:grid-rows-[minmax(0,1fr)_auto] max-md:items-stretch max-md:gap-y-4'
                  : 'grid-cols-[var(--art)]'
              }`
        }
        data-lyrics={column || undefined}
      >
        <section
          className={
            theater ? 'flex w-[min(720px,100%)] min-w-0 flex-col' : `flex w-(--art) min-w-0 flex-col${column ? ' max-md:order-2 max-md:w-full' : ''}`
          }
          aria-label="Player"
        >
          <div
            className={`relative w-(--art) rounded-[10px] transition-[scale] duration-450 ease-[cubic-bezier(0.34,1.3,0.64,1)] motion-reduce:transition-none${
              video ? ' aspect-video overflow-hidden bg-black' : ' aspect-square'
            }${playing ? '' : ' scale-92'}${column ? ' max-md:hidden' : ' max-md:animate-cover-switch'}${theater ? ' hidden' : ''}`}
          >
            {nowPlaying.artworkUrl && (
              <>
                <img
                  key={`glow-${nowPlaying.artworkUrl}`}
                  className={`${artworkLayer} -z-1 translate-y-2 scale-96 blur-[20px] saturate-200 data-loaded:opacity-40`}
                  src={sizedArtwork(nowPlaying.artworkUrl, 60)}
                  alt=""
                  referrerPolicy="no-referrer"
                  decoding="async"
                  onLoad={(e) => e.currentTarget.setAttribute('data-loaded', '')}
                />
                <img
                  key={nowPlaying.artworkUrl}
                  className={`${artworkLayer} bg-[#ffffff12] shadow-[0_4px_10px_#0000001a] data-loaded:opacity-100`}
                  src={sizedArtwork(nowPlaying.artworkUrl, 600)}
                  alt=""
                  referrerPolicy="no-referrer"
                  decoding="async"
                  onLoad={(e) => e.currentTarget.setAttribute('data-loaded', '')}
                />
              </>
            )}
            {motion && (
              <MotionArtwork
                key={motion.url}
                motion={motion}
                className="absolute inset-0 size-full rounded-[inherit] object-cover opacity-0 transition-opacity duration-600 ease-in data-ready:opacity-100"
                playing={playing}
              />
            )}
            {video && !theater && <VideoSurface className="absolute inset-0" />}
          </div>

          <div className={`flex items-center gap-3${theater ? '' : ' mt-[clamp(20px,3.2vh,32px)]'}${column ? ' max-md:mt-0' : ''}`}>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex min-w-0 items-center">
                <PageLink
                  className={`min-w-0 max-w-full self-start truncate type-[600_17px/22px] ${pageLink}`}
                  href={albumHref(album?.id ?? null)}
                  resolve={() => albumPageFor(videoId, album, [title, artist].filter(Boolean).join(' '))}
                >
                  {title}
                </PageLink>
                {track?.explicit && <ExplicitBadge size={14} />}
              </div>
              <span className="truncate type-title-3 text-secondary">
                {artist && <Credits videoId={videoId} line={artist} artists={track?.artists ?? []} className={pageLink} />}
                {artist && album?.name && ' — '}
                {album?.name && (
                  <PageLink
                    className={pageLink}
                    href={albumHref(album.id ?? null)}
                    resolve={() => albumPageFor(videoId, album, [title, artist].filter(Boolean).join(' '))}
                  >
                    {album.name}
                  </PageLink>
                )}
              </span>
            </div>
            <FavoriteButton
              videoId={nowPlaying.videoId}
              className="grid size-8 flex-none place-items-center rounded-full bg-quinary text-primary hover:bg-quaternary"
              size={18}
            />
          </div>

          <Scrubber />
          <Transport />
          <VolumeSlider />
        </section>

        {showLyrics && (
          <section className="flex min-h-0 animate-lyrics-switch self-stretch" aria-label="Lyrics">
            <LyricsPanel variant="full" />
          </section>
        )}
        {showQueue && (
          <section
            className="flex min-h-0 animate-fade-in flex-col self-stretch [mask-image:linear-gradient(180deg,#000_calc(100%-80px),transparent)]"
            aria-label="Up Next"
          >
            <UpNext />
          </section>
        )}
      </div>

      {hasLyrics && (
        <button
          className={`${corner} bottom-5 left-5 aria-pressed:text-primary`}
          aria-label="Lyrics"
          aria-pressed={showLyrics}
          onClick={() => togglePanel('lyrics')}
        >
          {showLyrics ? <LyricsActiveIcon size={18} /> : <LyricsIcon size={18} />}
        </button>
      )}
      <button
        className={`${corner} right-5 bottom-5 aria-pressed:text-primary`}
        aria-label="Up Next"
        aria-pressed={showQueue}
        onClick={() => togglePanel('queue')}
      >
        <UpNextIcon size={18} />
      </button>
    </div>
  );
}
