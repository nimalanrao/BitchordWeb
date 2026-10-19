import {
  Airplay,
  Cast,
  Check,
  Disc3,
  Download,
  Heart,
  Image as ImageIcon,
  Languages,
  ListMusic,
  Maximize,
  MessageSquare,
  Minimize,
  MoreHorizontal,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Share2,
  Shuffle,
  SkipBack,
  SkipForward,
  Speech,
  SquarePen,
  Star,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
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
import { PingPongVideo } from '@/components/music/PingPongVideo';
import { VideoSurface } from '@/components/music/VideoSurface';
import { useTrackMotion } from '@/data/apple/motionArt';
import { useLikeStatus, useSetLiked, useSignedIn } from '@/data/music/queries';
import { sizedArtwork } from '@/lib/artwork';
import { cropImageToSquare, getCustomCover, removeCustomCover, saveCustomCover, type CustomCoverData } from '@/lib/customCovers';
import { meshPalette, type Rgb } from '@/lib/meshPalette';
import { useLyrics } from '@/lyrics/useLyrics';
import { getAudio, usePlayer } from '@/state/player';
import { useUi } from '@/state/ui';
import { useHasVideo, useVideo } from '@/state/video';
import { Credits, PageLink, pageLink } from './Lcd';
import { CustomCoverModal } from './CustomCoverModal';
import { LyricsPanel, ProviderPicker, toggleLyricsTranslation, toggleLyricsRomanization } from './LyricsPanel';
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
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // Draw played line (wavy sine wave) - bolder & fluid
        if (playedWidth > 0) {
          ctx.beginPath();
          ctx.moveTo(0, cy);
          const wavelength = 20;
          const amplitude = 4;
          for (let x = 0; x <= playedWidth; x += 1.5) {
            const y = cy + amplitude * Math.sin(((x - phase) / wavelength) * 2 * Math.PI);
            ctx.lineTo(x, y);
          }
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3.2;
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // Draw white circular thumb at (playedWidth, cy)
        ctx.beginPath();
        ctx.arc(playedWidth, cy, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 6;
        ctx.fill();

        ctx.restore();
      }

      if (audio && !audio.paused) {
        phase = (phase + 0.38) % 20;
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
    <div className="w-full max-w-[440px] mx-auto mt-5 select-none">
      <div className="flex items-center gap-3">
        <span ref={elapsedRef} className="text-xs sm:text-sm font-semibold tabular-nums text-white/70 min-w-[38px] text-right">
          0:00
        </span>
        <div className="flex-1 h-8 cursor-pointer touch-none flex items-center relative" {...handlers}>
          <canvas ref={canvasRef} className="w-full h-full block" />
        </div>
        <span ref={durationRef} className="text-xs sm:text-sm font-semibold tabular-nums text-white/70 min-w-[38px]">
          0:00
        </span>
      </div>
    </div>
  );
}

/** Mobile Wesper Theme Scrubber: Pill-shaped progress bar with white thumb knob and elapsed & remaining/total time */
function MobileWesperScrubber({ onScrubbing }: { onScrubbing?: () => void }) {
  const barRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef<HTMLSpanElement>(null);
  const remainingRef = useRef<HTMLSpanElement>(null);
  const status = usePlayer((s) => s.status);
  const deck = usePlayer((s) => s.deck);
  const durationSec = usePlayer((s) => s.nowPlaying?.durationSec ?? 0);
  const seek = usePlayer((s) => s.seek);
  const [dragging, setDragging] = useState<number | null>(null);
  const draggingRef = useRef<number | null>(null);
  draggingRef.current = dragging;
  const [showRemaining, setShowRemaining] = useState(true);
  const showRemainingRef = useRef(true);
  showRemainingRef.current = showRemaining;

  useEffect(() => {
    let frame = 0;
    const render = () => {
      const audio = getAudio();
      const audioDur = audio && Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
      const duration = audioDur || durationSec || 0;
      const current =
        draggingRef.current !== null && duration > 0
          ? draggingRef.current * duration
          : (audio?.currentTime ?? 0);
      const fraction = duration > 0 ? Math.min(1, Math.max(0, current / duration)) : 0;
      const pct = `${(fraction * 100).toFixed(2)}%`;

      if (barRef.current) {
        barRef.current.style.width = pct;
      }
      if (knobRef.current) {
        knobRef.current.style.left = pct;
      }
      if (elapsedRef.current) {
        elapsedRef.current.textContent = clock(current);
      }
      if (remainingRef.current) {
        if (showRemainingRef.current) {
          const remaining = Math.max(0, duration - current);
          remainingRef.current.textContent = `-${clock(remaining)}`;
        } else {
          remainingRef.current.textContent = clock(duration);
        }
      }

      frame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frame);
  }, [status, deck, durationSec]);

  const fractionAt = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
  };

  const handlers = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging(fractionAt(e));
      onScrubbing?.();
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (draggingRef.current !== null) {
        setDragging(fractionAt(e));
        onScrubbing?.();
      }
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      if (draggingRef.current === null) return;
      const frac = fractionAt(e);
      const audio = getAudio();
      const dur = audio && Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : durationSec;
      if (dur > 0) seek(frac * dur);
      setDragging(null);
      onScrubbing?.();
    },
    onPointerCancel: () => {
      setDragging(null);
      onScrubbing?.();
    },
  };

  return (
    <div className="w-full select-none">
      {/* Pill Progress Bar Track */}
      <div
        className="w-full h-5 flex items-center cursor-pointer touch-none relative group"
        {...handlers}
      >
        <div className="w-full h-1.5 bg-white/25 rounded-full relative overflow-visible">
          <div
            ref={barRef}
            className="h-full bg-white/90 rounded-full transition-none will-change-[width]"
            style={{ width: '0%' }}
          />
          <div
            ref={knobRef}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-3.5 rounded-full bg-white shadow-[0_1px_5px_rgba(0,0,0,0.7)] pointer-events-none transition-transform duration-100 ${
              dragging !== null ? 'scale-125' : 'scale-90 group-hover:scale-100'
            }`}
            style={{ left: '0%' }}
          />
        </div>
      </div>
      {/* Time Row below bar: Left = elapsed, Right = -remaining or total duration */}
      <div className="flex items-center justify-between -mt-1 text-xs font-semibold tabular-nums text-white/85 select-none">
        <span ref={elapsedRef}>0:00</span>
        <button
          onClick={() => setShowRemaining((prev) => !prev)}
          className="text-white/85 hover:text-white transition-colors cursor-pointer"
          title="Toggle remaining / total duration"
        >
          <span ref={remainingRef}>-0:00</span>
        </button>
      </div>
    </div>
  );
}

/** Mobile Wesper Volume Slider: 1:1 Apple Music custom pill slider (zero browser default button!) */
function MobileWesperVolumeSlider({ onInteracting }: { onInteracting?: () => void }) {
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);
  const currentVolume = muted ? 0 : volume;

  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const updateFromPointer = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setVolume(pct);
    onInteracting?.();
  };

  return (
    <div className="flex items-center gap-3 w-full px-1 select-none">
      <button
        onClick={() => {
          toggleMute();
          onInteracting?.();
        }}
        aria-label="Mute / Min volume"
        className="text-white/70 hover:text-white transition-colors cursor-pointer p-1"
      >
        {muted || volume === 0 ? <VolumeX size={15} strokeWidth={2.2} /> : <Volume2 size={14} strokeWidth={2.2} />}
      </button>
      <div
        ref={trackRef}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          updateFromPointer(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragging) updateFromPointer(e.clientX);
        }}
        onPointerUp={(e) => {
          setDragging(false);
          updateFromPointer(e.clientX);
        }}
        onPointerCancel={() => {
          setDragging(false);
          onInteracting?.();
        }}
        className="flex-1 h-6 flex items-center cursor-pointer touch-none relative"
      >
        {/* Track Pill */}
        <div className="w-full h-1.5 bg-white/25 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-white/85 rounded-full transition-none"
            style={{ width: `${Math.round(currentVolume * 100)}%` }}
          />
        </div>
      </div>
      <button
        onClick={() => {
          setVolume(1);
          onInteracting?.();
        }}
        aria-label="Max volume"
        className="text-white/70 hover:text-white transition-colors cursor-pointer p-1"
      >
        <Volume2 size={18} strokeWidth={2.2} />
      </button>
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

/** Mobile Wesper Transport: Exactly matches 3 buttons [prev, play/pause, next] from the reference image */
function MobileWesperTransport() {
  const hasTrack = usePlayer((s) => s.nowPlaying !== null);
  const playing = usePlayer((s) => s.status === 'playing' || s.status === 'buffering');
  const hasNext = usePlayer((s) => s.index + 1 < s.queue.length || s.repeat !== 'off' || (s.autoplay && s.index >= 0));
  const { togglePlay, next, previous } = usePlayer.getState();

  return (
    <div className="flex items-center justify-center gap-14 sm:gap-16 w-full py-1">
      {/* Rewind */}
      <button
        className="text-white hover:text-white/80 active:scale-90 transition-transform cursor-pointer disabled:opacity-40"
        disabled={!hasTrack}
        aria-label="Previous"
        onClick={previous}
      >
        <SkipBack size={34} fill="currentColor" strokeWidth={0} />
      </button>

      {/* Play / Pause - Clean flat white icon, no circle background */}
      <button
        className="text-white hover:text-white/80 active:scale-95 transition-transform cursor-pointer disabled:opacity-40"
        disabled={!hasTrack}
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={togglePlay}
      >
        {playing ? (
          <Pause size={48} fill="currentColor" strokeWidth={0} />
        ) : (
          <Play size={48} fill="currentColor" strokeWidth={0} className="ml-1" />
        )}
      </button>

      {/* Fast Forward */}
      <button
        className="text-white hover:text-white/80 active:scale-90 transition-transform cursor-pointer disabled:opacity-40"
        disabled={!hasTrack || !hasNext}
        aria-label="Next"
        onClick={next}
      >
        <SkipForward size={34} fill="currentColor" strokeWidth={0} />
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
    <div className="mx-auto mt-3 flex h-20 w-full max-w-[400px] items-center justify-between px-2">
      <button
        className={`grid place-items-center size-11 rounded-full transition-colors ${
          shuffle ? 'text-white' : 'text-white/40 hover:text-white'
        }`}
        aria-label="Shuffle"
        onClick={toggleShuffle}
      >
        <Shuffle size={24} />
      </button>

      <button
        className="grid place-items-center size-12 rounded-full text-white/85 hover:text-white active:scale-90 transition disabled:opacity-40"
        disabled={!hasTrack}
        aria-label="Previous"
        onClick={previous}
      >
        <SkipBack size={32} fill="currentColor" />
      </button>

      {/* Solid White Circle Play/Pause Button - Prominent & Bigger */}
      <button
        className="grid place-items-center size-16 sm:size-18 rounded-full bg-white text-black shadow-[0_6px_24px_rgba(0,0,0,0.5)] hover:scale-105 active:scale-95 transition-transform"
        disabled={!hasTrack}
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={togglePlay}
      >
        {playing ? <Pause size={30} fill="black" /> : <Play size={30} fill="black" className="ml-1" />}
      </button>

      <button
        className="grid place-items-center size-12 rounded-full text-white/85 hover:text-white active:scale-90 transition disabled:opacity-40"
        disabled={!hasTrack || !hasNext}
        aria-label="Next"
        onClick={next}
      >
        <SkipForward size={32} fill="currentColor" />
      </button>

      <button
        className={`grid place-items-center size-11 rounded-full transition-colors ${
          repeat !== 'off' ? 'text-white' : 'text-white/40 hover:text-white'
        }`}
        aria-label={repeat === 'one' ? 'Repeat one' : repeat === 'all' ? 'Repeat all' : 'Repeat'}
        onClick={cycleRepeat}
      >
        {repeat === 'one' ? <Repeat1 size={24} /> : <Repeat size={24} />}
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
  const wesperizedAlignment = usePlayer((s) => s.wesperizedAlignment ?? 'left');
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
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dominantRgb, setDominantRgb] = useState<Rgb | null>(null);
  const [customCover, setCustomCover] = useState<CustomCoverData | null>(() =>
    nowPlaying ? getCustomCover(nowPlaying.videoId) : null
  );
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!nowPlaying) {
      setCustomCover(null);
      return;
    }
    setCustomCover(getCustomCover(nowPlaying.videoId));
    const handleCoverUpdate = (e: Event) => {
      const detail = (e as CustomEvent<{ videoId: string; cover: CustomCoverData | null }>).detail;
      if (detail && detail.videoId === nowPlaying.videoId) {
        setCustomCover(detail.cover);
      }
    };
    window.addEventListener('bitchord:cover_updated', handleCoverUpdate);
    return () => window.removeEventListener('bitchord:cover_updated', handleCoverUpdate);
  }, [nowPlaying?.videoId]);

  useEffect(() => {
    const art = customCover?.type === 'image' ? customCover.url : nowPlaying?.artworkUrl;
    if (!art) return;
    meshPalette(art)
      .then((colors) => {
        if (colors && colors.length > 0 && colors[0]) {
          // Use primary dominant color from artwork or custom cover
          setDominantRgb(colors[0]);
        }
      })
      .catch(() => undefined);
  }, [nowPlaying?.artworkUrl, customCover]);

  // Close more menu when clicking outside
  useEffect(() => {
    if (!showMoreMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    window.addEventListener('pointerdown', handleClickOutside);
    return () => window.removeEventListener('pointerdown', handleClickOutside);
  }, [showMoreMenu]);

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

  const handleToggleTranslation = () => {
    void toggleLyricsTranslation();
    showToast('Translation toggled');
  };

  const handleToggleRomanization = () => {
    void toggleLyricsRomanization();
    showToast('Romanization toggled');
  };

  const handleShareSong = async () => {
    setShowMoreMenu(false);
    const shareData = {
      title: nowPlaying?.title ?? 'Track',
      text: `Listen to "${nowPlaying?.title}" by ${nowPlaying?.artist} on BitChord+`,
      url: window.location.href,
    };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        showToast('Shared successfully');
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Song link copied to clipboard');
    } catch {
      showToast('Could not copy song link');
    }
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

  // Mobile Wesper auto-hide controls after 2.5s when viewing lyrics or queue
  const [mobileControlsHidden, setMobileControlsHidden] = useState(false);
  const mobileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetMobileInactivity = useCallback(() => {
    setMobileControlsHidden(false);
    if (mobileTimerRef.current) {
      clearTimeout(mobileTimerRef.current);
      mobileTimerRef.current = null;
    }
    if (panel === 'lyrics' || panel === 'queue') {
      mobileTimerRef.current = setTimeout(() => {
        setMobileControlsHidden(true);
      }, 2500);
    }
  }, [panel]);

  useEffect(() => {
    resetMobileInactivity();
    return () => {
      if (mobileTimerRef.current) clearTimeout(mobileTimerRef.current);
    };
  }, [panel, resetMobileInactivity]);

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
        className={`fixed inset-0 z-[calc(var(--z-contextual-menus)-2)] isolate overflow-hidden text-white select-none transition-colors duration-1000 ${
          isClosing
            ? 'animate-blur-fade-out pointer-events-none'
            : 'animate-enter motion-reduce:[animation-name:fade-in]'
        }`}
        style={{
          backgroundColor: dominantRgb
            ? `rgb(${Math.round(dominantRgb[0] * 0.16)}, ${Math.round(dominantRgb[1] * 0.16)}, ${Math.round(dominantRgb[2] * 0.16)})`
            : '#0a0a0c',
        }}
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
        {/* 1. Ambient Blurred Live Mesh Background using the 30-node ultra-blurred mesh with dominant color tint */}
        <div className="absolute inset-0 size-full overflow-hidden pointer-events-none -z-1">
          <MeshBackdrop
            artworkUrl={customCover?.type === 'image' ? customCover.url : nowPlaying.artworkUrl}
            playing={playing}
          />
          {/* Subtle gradient on the right side preserving the glowing colors while keeping lyrics 100% legible */}
          {dominantRgb ? (
            <div
              className="absolute inset-y-0 right-0 w-full md:w-3/5 pointer-events-none transition-all duration-1000 ease-in-out"
              style={{
                background: `linear-gradient(to right, transparent 0%, rgba(${dominantRgb[0]}, ${dominantRgb[1]}, ${dominantRgb[2]}, 0.25) 40%, rgba(${Math.round(dominantRgb[0] * 0.3)}, ${Math.round(dominantRgb[1] * 0.3)}, ${Math.round(dominantRgb[2] * 0.3)}, 0.65) 100%)`,
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-black/25 transition-opacity duration-700" />
          )}
          {/* Ambient vignette and gentle darkening so white text and controls pop */}
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        </div>

        {/* 2. Left Artwork Canvas - Desktop only (Fit to screen on the left half) */}
        <div className="hidden md:block group/canvas absolute inset-y-0 left-0 w-1/2 h-full overflow-hidden pointer-events-none hover:pointer-events-auto z-0">
          {customCover ? (
            spinning ? (
              /* Realistic Vinyl Record View with custom cover */
              <div className="size-full flex items-center justify-center p-8 pb-48 pt-10 -translate-y-8">
                <div className="relative aspect-square w-[min(38vw,calc(100vh-320px),480px)] rounded-full bg-[#111113] p-3 shadow-[0_25px_70px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(255,255,255,0.08)] ring-1 ring-white/10 animate-[spin_12s_linear_infinite]">
                  <div className="size-full rounded-full border-[10px] border-[#18181b] p-6 shadow-[inset_0_0_15px_#000]">
                    <div className="size-full rounded-full border-[8px] border-[#222226] p-6">
                      <div className="size-full rounded-full border-[6px] border-[#1c1c20] p-6">
                        <div className="size-full rounded-full border-[4px] border-[#26262b] p-6 flex items-center justify-center">
                          {/* Center Album Artwork Label */}
                          <div className="relative size-full rounded-full overflow-hidden ring-2 ring-white/20 shadow-lg">
                            {customCover.type === 'video' ? (
                              <PingPongVideo
                                key={`vinyl-video-${customCover.url}`}
                                src={customCover.url}
                                playing={playing}
                                className="size-full object-cover animate-cover-crossfade"
                              />
                            ) : (
                              <img
                                key={`vinyl-custom-${customCover.url}`}
                                src={customCover.url}
                                alt=""
                                className="size-full object-cover animate-cover-crossfade"
                              />
                            )}
                            <div className="absolute inset-0 m-auto size-5 rounded-full bg-[#111113] ring-2 ring-white/40 shadow-inner" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none opacity-25"
                    style={{
                      background: 'conic-gradient(from 45deg, transparent 0deg, rgba(255,255,255,0.4) 45deg, transparent 90deg, transparent 180deg, rgba(255,255,255,0.4) 225deg, transparent 270deg)',
                    }}
                  />
                </div>
              </div>
            ) : customCover.type === 'video' ? (
              <PingPongVideo
                key={`custom-video-${customCover.url}`}
                src={customCover.url}
                playing={playing}
                className="size-full object-cover object-center animate-cover-crossfade"
              />
            ) : (
              <img
                key={`custom-cover-${customCover.url}`}
                src={customCover.url}
                alt=""
                decoding="async"
                className="size-full object-cover object-center animate-cover-crossfade"
              />
            )
          ) : nowPlaying.artworkUrl && (
            spinning ? (
              /* Realistic Vinyl Record View - Shifted up clear of bottom blur */
              <div className="size-full flex items-center justify-center p-8 pb-48 pt-10 -translate-y-8">
                <div className="relative aspect-square w-[min(38vw,calc(100vh-320px),480px)] rounded-full bg-[#111113] p-3 shadow-[0_25px_70px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(255,255,255,0.08)] ring-1 ring-white/10 animate-[spin_12s_linear_infinite]">
                  {/* Vinyl Grooves concentric rings */}
                  <div className="size-full rounded-full border-[10px] border-[#18181b] p-6 shadow-[inset_0_0_15px_#000]">
                    <div className="size-full rounded-full border-[8px] border-[#222226] p-6">
                      <div className="size-full rounded-full border-[6px] border-[#1c1c20] p-6">
                        <div className="size-full rounded-full border-[4px] border-[#26262b] p-6 flex items-center justify-center">
                          {/* Center Album Artwork Label */}
                          <div className="relative size-full rounded-full overflow-hidden ring-2 ring-white/20 shadow-lg">
                            <img
                              key={`vinyl-${nowPlaying.artworkUrl}`}
                              src={sizedArtwork(nowPlaying.artworkUrl, 600)}
                              alt=""
                              referrerPolicy="no-referrer"
                              className="size-full object-cover animate-cover-crossfade"
                            />
                            {/* Spindle hole */}
                            <div className="absolute inset-0 m-auto size-5 rounded-full bg-[#111113] ring-2 ring-white/40 shadow-inner" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Vinyl Sheen/Gloss reflection */}
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none opacity-25"
                    style={{
                      background: 'conic-gradient(from 45deg, transparent 0deg, rgba(255,255,255,0.4) 45deg, transparent 90deg, transparent 180deg, rgba(255,255,255,0.4) 225deg, transparent 270deg)',
                    }}
                  />
                </div>
              </div>
            ) : (
              /* Fit to screen album cover on the left with ultra-smooth crossfade */
              <img
                key={`cover-${nowPlaying.artworkUrl}`}
                src={sizedArtwork(nowPlaying.artworkUrl, 1600)}
                alt=""
                referrerPolicy="no-referrer"
                decoding="async"
                className="size-full object-cover object-center animate-cover-crossfade"
              />
            )
          )}
          {!customCover && motion && !spinning && (
            <MotionArtwork
              motion={motion}
              className="size-full object-cover object-center opacity-90 transition-opacity duration-600"
              playing={playing}
            />
          )}

          {/* Bottom vignette: extended higher (56% height, 48% blur mask) while keeping blur 6px and tinting with theme color */}
          <div
            className="absolute inset-x-0 bottom-0 h-[48%] backdrop-blur-[6px] pointer-events-none"
            style={{
              maskImage: 'linear-gradient(to top, black 0%, black 55%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to top, black 0%, black 55%, transparent 100%)',
            }}
          />
          {/* Theme-colored gradient overlay matching the current song / artwork palette, brought up higher */}
          {dominantRgb ? (
            <div
              className="absolute inset-x-0 bottom-0 h-[56%] pointer-events-none transition-all duration-1000 ease-in-out"
              style={{
                background: `linear-gradient(to top, rgba(${Math.round(dominantRgb[0] * 0.28)}, ${Math.round(dominantRgb[1] * 0.28)}, ${Math.round(dominantRgb[2] * 0.28)}, 0.95) 0%, rgba(${Math.round(dominantRgb[0] * 0.35)}, ${Math.round(dominantRgb[1] * 0.35)}, ${Math.round(dominantRgb[2] * 0.35)}, 0.75) 45%, rgba(${dominantRgb[0]}, ${dominantRgb[1]}, ${dominantRgb[2]}, 0.35) 75%, transparent 100%)`,
              }}
            />
          ) : (
            <div className="absolute inset-x-0 bottom-0 h-[56%] bg-gradient-to-t from-black/90 via-black/60 50% to-transparent pointer-events-none" />
          )}

          {/* Hover on album artwork: Custom Album Cover button overlay */}
          <div className="absolute top-8 left-8 z-20 opacity-0 group-hover/canvas:opacity-100 transition-opacity duration-200 pointer-events-none group-hover/canvas:pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCoverModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-neutral-950/90 hover:bg-neutral-900 border border-white/20 text-white text-xs font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.7)] ring-1 ring-white/10 transition active:scale-95 cursor-pointer pointer-events-auto"
              title="Change album cover (Image or Video)"
              aria-label="Change album cover"
            >
              <ImageIcon size={16} />
              <span>Change Cover</span>
            </button>
          </div>
        </div>

        {/* 3. Deep Blur Bridge in the MIDDLE of the screen (Desktop only) */}
        <div
          className="hidden md:block absolute inset-y-0 left-1/2 -translate-x-1/2 w-[30vw] min-w-[280px] backdrop-blur-[100px] pointer-events-none z-5"
          style={{
            maskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.85) 30%, black 50%, rgba(0,0,0,0.85) 70%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.85) 30%, black 50%, rgba(0,0,0,0.85) 70%, transparent 100%)',
          }}
        />

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-white/20 backdrop-blur-xl border border-white/20 text-white text-xs font-semibold shadow-2xl animate-fade-in flex items-center gap-2">
            <Check size={14} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Header Buttons (More Menu, Vinyl Disc, Queue List, Close) - Desktop only */}
        <div className="hidden md:flex absolute top-6 left-1/2 -translate-x-1/2 z-40 items-center justify-center gap-3.5" ref={moreMenuRef}>
          {/* More Actions Menu Button (3 Dots) */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu((prev) => !prev)}
              className={`grid size-11 place-items-center rounded-full transition ${
                showMoreMenu ? 'bg-white text-black' : 'text-white/80 hover:text-white hover:bg-white/15'
              }`}
              title="More Actions"
              aria-label="More Actions"
              aria-expanded={showMoreMenu}
            >
              <MoreHorizontal size={22} />
            </button>

            {/* Animated Glassmorphic Popover Menu dropping down from center header */}
            {showMoreMenu && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-50 p-1.5 rounded-[12px] bg-neutral-950/95 backdrop-blur-2xl border border-white/20 shadow-[0_16px_48px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] ring-1 ring-white/10 flex items-center gap-1 animate-zoom pointer-events-auto"
                role="menu"
              >
                {/* 1. Heart (Favorite) */}
                <button
                  onClick={handleToggleFavorite}
                  className={`grid place-items-center size-9 rounded-[8px] transition active:scale-90 ${
                    isFavorite
                      ? 'bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 ring-1 ring-rose-500/40'
                      : 'text-white/80 hover:text-white hover:bg-white/15'
                  }`}
                  title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  aria-label="Favorite"
                  role="menuitem"
                >
                  <Heart
                    size={18}
                    className={`transition-all duration-200 ${
                      isFavorite ? 'fill-rose-500 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'fill-none'
                    }`}
                  />
                </button>

                {/* 2. Add Custom Album Cover */}
                <button
                  onClick={() => {
                    setShowCoverModal(true);
                    setShowMoreMenu(false);
                  }}
                  className={`grid place-items-center size-9 rounded-[8px] transition active:scale-90 ${
                    customCover
                      ? 'bg-white/25 text-white ring-1 ring-white/40'
                      : 'text-white/80 hover:text-white hover:bg-white/15'
                  }`}
                  title="Add Custom Album Cover (1:1 Auto-Crop or Video)"
                  aria-label="Custom Album Cover"
                  role="menuitem"
                >
                  <ImageIcon size={18} />
                </button>

                {/* 3. Share Song */}
                <button
                  onClick={handleShareSong}
                  className="grid place-items-center size-9 rounded-[8px] text-white/80 hover:text-white hover:bg-white/15 transition active:scale-90"
                  title="Share Song"
                  aria-label="Share Song"
                  role="menuitem"
                >
                  <Share2 size={18} />
                </button>

                {/* 4. Lyrics Translation */}
                <button
                  onClick={() => {
                    handleToggleTranslation();
                    setShowMoreMenu(false);
                  }}
                  className="grid place-items-center size-9 rounded-[8px] text-white/80 hover:text-white hover:bg-white/15 transition active:scale-90"
                  title="Toggle Lyrics Translation"
                  aria-label="Toggle Translation"
                  role="menuitem"
                >
                  <Languages size={18} />
                </button>

                {/* 5. Lyrics Romanization */}
                <button
                  onClick={() => {
                    handleToggleRomanization();
                    setShowMoreMenu(false);
                  }}
                  className="grid place-items-center size-9 rounded-[8px] text-white/80 hover:text-white hover:bg-white/15 transition active:scale-90"
                  title="Toggle Lyrics Romanization"
                  aria-label="Toggle Romanization"
                  role="menuitem"
                >
                  <Speech size={18} />
                </button>

                {/* 6. Lyrics Settings & Providers */}
                <button
                  onClick={() => {
                    setShowLyricsSettings(true);
                    setShowMoreMenu(false);
                  }}
                  className="grid place-items-center size-9 rounded-[8px] text-white/80 hover:text-white hover:bg-white/15 transition active:scale-90"
                  title="Lyrics Settings & Providers"
                  aria-label="Lyrics Settings"
                  role="menuitem"
                >
                  <SquarePen size={18} />
                </button>

                {/* 7. Download */}
                <button
                  onClick={() => {
                    handleDownload();
                    setShowMoreMenu(false);
                  }}
                  className="grid place-items-center size-9 rounded-[8px] text-white/80 hover:text-white hover:bg-white/15 transition active:scale-90"
                  title="Download Track"
                  aria-label="Download"
                  role="menuitem"
                >
                  <Download size={18} />
                </button>

                {/* 8. Cast / Airplay (Listen Together) */}
                <button
                  onClick={() => {
                    handleCast();
                    setShowMoreMenu(false);
                  }}
                  className="grid place-items-center size-9 rounded-[8px] text-white/80 hover:text-white hover:bg-white/15 transition active:scale-90"
                  title="Listen Together"
                  aria-label="Listen Together"
                  role="menuitem"
                >
                  <Cast size={18} />
                </button>

                {/* 9. Volume Speaker + Inline Slider */}
                <div className="flex items-center gap-2 px-2.5 py-1 bg-white/5 rounded-[8px] border border-white/10">
                  <button
                    onClick={toggleMute}
                    className="text-white/80 hover:text-white transition active:scale-90"
                    title={muted ? 'Unmute' : 'Mute'}
                    aria-label="Volume"
                  >
                    {muted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
                  </button>
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
            )}
          </div>

          <button
            onClick={() => {
              setSpinning((s) => !s);
              showToast(spinning ? 'Vinyl Canvas Off' : 'Vinyl Canvas On');
            }}
            className={`grid size-11 place-items-center rounded-full transition ${
              spinning ? 'bg-white text-black' : 'text-white/80 hover:text-white hover:bg-white/15'
            }`}
            title="Toggle Vinyl Canvas"
            aria-label="Toggle Vinyl Canvas"
          >
            <Disc3 size={22} className={spinning ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => togglePanel('queue')}
            className={`grid size-11 place-items-center rounded-full transition ${
              showQueue ? 'bg-white text-black' : 'text-white/80 hover:text-white hover:bg-white/15'
            }`}
            title="Up Next Queue"
            aria-label="Up Next Queue"
          >
            <ListMusic size={22} />
          </button>

          {/* Browser Fullscreen Button */}
          {document.fullscreenEnabled && (
            <button
              className="grid size-11 place-items-center rounded-full text-white/80 hover:text-white hover:bg-white/15 transition"
              aria-label={browserFullScreen ? 'Exit full screen' : 'Enter full screen'}
              title={browserFullScreen ? 'Exit full screen' : 'Enter full screen'}
              onClick={toggleBrowserFullScreen}
            >
              {browserFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          )}

          <button
            ref={close}
            onClick={() => setFullScreen(false)}
            className="grid size-11 place-items-center rounded-full text-white/80 hover:text-white hover:bg-white/15 transition"
            title="Close"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        {/* =========================================================================
            MOBILE-ONLY WESPER THEME LAYOUT (1:1 Apple Music iOS now-playing layout)
           ========================================================================= */}
        <div
          className="flex md:hidden relative z-10 size-full flex-col justify-between px-6 pt-3 pb-6 overflow-hidden select-none"
          onPointerDown={resetMobileInactivity}
          onTouchStart={resetMobileInactivity}
        >
          {panel === 'lyrics' || panel === 'queue' ? (
            /* ================= EXPANDED LYRICS / QUEUE MODE ================= */
            <>
              {/* Top Pill Handle & Mini Header */}
              <div className="flex-none flex flex-col z-30">
                <div className="flex items-center justify-center pt-1 pb-1">
                  <button
                    onClick={() => setFullScreen(false)}
                    className="w-10 h-1.5 rounded-full bg-white/40 active:bg-white/70 transition-colors cursor-pointer"
                    aria-label="Dismiss Player"
                    title="Dismiss"
                  />
                </div>

                {/* Compact Top Header: Mini Cover, Song Name, Artist, and Star/Return */}
                <div className="flex items-center justify-between gap-3 py-1.5 px-0.5 mt-0.5">
                  <button
                    onClick={() => setPanel(null)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer group active:opacity-80 transition-opacity"
                    title="Tap to return to album cover"
                  >
                    <div className="size-11 rounded-[10px] overflow-hidden shadow-lg ring-1 ring-white/15 flex-none bg-neutral-900">
                      {customCover?.type === 'video' ? (
                        <PingPongVideo
                          key={`mobile-video-mini-${customCover.url}`}
                          src={customCover.url}
                          playing={playing}
                          className="size-full object-cover"
                        />
                      ) : (
                        <img
                          src={customCover ? customCover.url : nowPlaying.artworkUrl ? sizedArtwork(nowPlaying.artworkUrl, 160) : ''}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="size-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                      <span className="text-[15px] font-bold text-white tracking-tight truncate leading-tight">
                        {title}
                      </span>
                      <span className="text-[13px] font-medium text-white/70 truncate mt-0.5">
                        {artist}
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 flex-none">
                    {panel === 'lyrics' && (
                      <>
                        <button
                          onClick={() => void toggleLyricsTranslation()}
                          className="grid place-items-center size-8 rounded-full bg-white/10 text-white/80 hover:text-white hover:bg-white/20 active:scale-90 transition-transform cursor-pointer"
                          aria-label="Translate lyrics"
                          title="Translate lyrics"
                        >
                          <Languages size={16} />
                        </button>
                        <button
                          onClick={() => void toggleLyricsRomanization()}
                          className="grid place-items-center size-8 rounded-full bg-white/10 text-white/80 hover:text-white hover:bg-white/20 active:scale-90 transition-transform cursor-pointer"
                          aria-label="Romanize lyrics"
                          title="Romanize lyrics"
                        >
                          <Speech size={16} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleToggleFavorite}
                      className={`grid place-items-center size-8 rounded-full transition-transform active:scale-90 cursor-pointer ${
                        isFavorite ? 'text-amber-300' : 'text-white/80 hover:text-white'
                      }`}
                      aria-label={isFavorite ? 'Unfavorite' : 'Favorite'}
                      title={isFavorite ? 'Unfavorite' : 'Favorite'}
                    >
                      <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={1.8} />
                    </button>
                    <button
                      onClick={() => setPanel(null)}
                      className="grid place-items-center size-8 rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-transform cursor-pointer"
                      aria-label="Return to album cover"
                      title="Return to album cover"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Middle Scrolling Area: Synced Lyrics or Queue */}
              <div
                className={`relative z-10 w-full flex-1 min-h-0 overflow-hidden transition-all duration-300 ${
                  mobileControlsHidden ? 'pb-4' : 'pb-44'
                }`}
                onClick={resetMobileInactivity}
                onTouchStart={resetMobileInactivity}
              >
                {panel === 'queue' ? (
                  <div className="size-full overflow-hidden animate-fade-in [mask-image:linear-gradient(180deg,#000_calc(100%-40px),transparent)]">
                    <UpNext />
                  </div>
                ) : (
                  <div className="size-full overflow-hidden animate-fade-in flex flex-col justify-center">
                    <LyricsPanel variant="full" showPicker={false} />
                  </div>
                )}
              </div>

              {/* Floating Bottom Control Panel with 2.5s Inactivity Auto-Hide */}
              <div
                onClick={resetMobileInactivity}
                onTouchStart={resetMobileInactivity}
                className={`absolute inset-x-0 bottom-0 z-20 px-6 pb-6 pt-8 flex flex-col gap-4 max-w-[380px] mx-auto bg-gradient-to-t from-black/85 via-black/50 to-transparent transition-all duration-300 ease-out ${
                  mobileControlsHidden
                    ? 'opacity-0 translate-y-8 pointer-events-none'
                    : 'opacity-100 translate-y-0 pointer-events-auto'
                }`}
              >
                {/* Scrubber */}
                <div className="w-full">
                  <MobileWesperScrubber onScrubbing={resetMobileInactivity} />
                </div>

                {/* Transport Controls */}
                <div className="w-full pt-1">
                  <MobileWesperTransport />
                </div>

                {/* Volume Slider - 1:1 Apple Music Pill Slider, No Thumb Button */}
                <MobileWesperVolumeSlider onInteracting={resetMobileInactivity} />

                {/* Bottom Navigation Toolbar */}
                <div className="flex items-center justify-around w-full pt-1 text-white/70">
                  <button
                    onClick={() => togglePanel('lyrics')}
                    className={`grid place-items-center size-10 rounded-full transition-colors cursor-pointer ${
                      panel === 'lyrics' ? 'text-white bg-white/20' : 'text-white/60 hover:text-white'
                    }`}
                    aria-label="Lyrics"
                    title="Lyrics"
                  >
                    <MessageSquare size={21} strokeWidth={2} />
                  </button>

                  <button
                    onClick={handleCast}
                    className="grid place-items-center size-10 rounded-full text-white/60 hover:text-white transition-colors cursor-pointer"
                    aria-label="AirPlay & Listen Together"
                    title="AirPlay & Listen Together"
                  >
                    <Airplay size={22} strokeWidth={2} />
                  </button>

                  <button
                    onClick={() => togglePanel('queue')}
                    className={`grid place-items-center size-10 rounded-full transition-colors cursor-pointer ${
                      panel === 'queue' ? 'text-white bg-white/20' : 'text-white/60 hover:text-white'
                    }`}
                    aria-label="Up Next"
                    title="Up Next"
                  >
                    <ListMusic size={22} strokeWidth={2} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* ================= DEFAULT ALBUM ART COVER MODE ================= */
            <>
              {/* Top Pill Handle / Grabber Indicator */}
              <div className="flex items-center justify-center pt-1 pb-2">
                <button
                  onClick={() => setFullScreen(false)}
                  className="w-10 h-1.5 rounded-full bg-white/40 active:bg-white/70 transition-colors cursor-pointer"
                  aria-label="Dismiss Player"
                  title="Dismiss"
                />
              </div>

              {/* Center Album Art: Rounded square with shadow, centered in available space */}
              <div className="flex-1 min-h-0 flex items-center justify-center py-2">
                <div className="relative aspect-square w-[min(78vw,calc(100vh-420px))] max-w-[340px] rounded-[18px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.65)] ring-1 ring-white/10">
                  {customCover?.type === 'video' ? (
                    <PingPongVideo
                      key={`mobile-video-${customCover.url}`}
                      src={customCover.url}
                      playing={playing}
                      className="size-full object-cover"
                    />
                  ) : (
                    <img
                      src={customCover ? customCover.url : nowPlaying.artworkUrl ? sizedArtwork(nowPlaying.artworkUrl, 800) : ''}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="size-full object-cover"
                    />
                  )}
                </div>
              </div>

              {/* Lower Controls Stack matching exact layout */}
              <div className="flex flex-col gap-5 w-full max-w-[380px] mx-auto pb-2">
                {/* 1. Track Info Row: Title & Artist on left, Star & More button on right */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="min-w-0 flex-1 flex flex-col">
                    <h1 className="text-[21px] font-bold text-white tracking-tight leading-snug truncate">
                      {title}
                    </h1>
                    <div className="text-[16px] font-medium text-white/75 truncate mt-0.5">
                      {artist && (
                        <Credits
                          videoId={videoId}
                          line={artist}
                          artists={track?.artists ?? []}
                          className="cursor-pointer hover:underline inline"
                        />
                      )}
                    </div>
                  </div>

                  {/* Star (Favorite) and More (3 dots) buttons */}
                  <div className="flex items-center gap-2.5 flex-none">
                    {/* Star Favorite Button */}
                    <button
                      onClick={handleToggleFavorite}
                      className={`grid place-items-center size-9 rounded-full transition-transform active:scale-90 cursor-pointer ${
                        isFavorite ? 'text-amber-300' : 'text-white/80 hover:text-white'
                      }`}
                      aria-label={isFavorite ? 'Unfavorite' : 'Favorite'}
                      title={isFavorite ? 'Unfavorite' : 'Favorite'}
                    >
                      <Star size={21} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={1.8} />
                    </button>

                    {/* More Options Button */}
                    <div className="relative">
                      <button
                        onClick={() => setShowMoreMenu((prev) => !prev)}
                        className="grid place-items-center size-9 rounded-full bg-white/15 text-white hover:bg-white/25 active:scale-90 transition-transform cursor-pointer"
                        aria-label="More Options"
                        title="More Options"
                      >
                        <MoreHorizontal size={19} />
                      </button>

                      {/* Mobile Popover Menu */}
                      {showMoreMenu && (
                        <div className="absolute bottom-full right-0 mb-3 z-50 p-2 rounded-[16px] bg-neutral-950/95 backdrop-blur-2xl border border-white/20 shadow-2xl flex flex-col gap-1 min-w-[200px] text-sm">
                          <button
                            onClick={() => {
                              setShowCoverModal(true);
                              setShowMoreMenu(false);
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] hover:bg-white/10 text-start text-white cursor-pointer"
                          >
                            <ImageIcon size={16} />
                            <span>Change Cover</span>
                          </button>
                          <button
                            onClick={handleShareSong}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] hover:bg-white/10 text-start text-white cursor-pointer"
                          >
                            <Share2 size={16} />
                            <span>Share Song</span>
                          </button>
                          <button
                            onClick={() => {
                              handleDownload();
                              setShowMoreMenu(false);
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] hover:bg-white/10 text-start text-white cursor-pointer"
                          >
                            <Download size={16} />
                            <span>Download</span>
                          </button>
                          <button
                            onClick={() => {
                              setShowLyricsSettings(true);
                              setShowMoreMenu(false);
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] hover:bg-white/10 text-start text-white cursor-pointer"
                          >
                            <SquarePen size={16} />
                            <span>Lyrics Settings</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Scrubber */}
                <div className="w-full">
                  <MobileWesperScrubber />
                </div>

                {/* 3. Transport Controls: [Prev, Flat Play/Pause, Next] */}
                <div className="w-full pt-1">
                  <MobileWesperTransport />
                </div>

                {/* 4. Volume Slider Row - Sleek Pill, No Thumb Button */}
                <MobileWesperVolumeSlider />

                {/* 5. Bottom Navigation Toolbar: [Lyrics icon, Airplay icon, Queue list icon] */}
                <div className="flex items-center justify-around w-full pt-2 text-white/70">
                  {/* Lyrics Toggle */}
                  <button
                    onClick={() => togglePanel('lyrics')}
                    className={`grid place-items-center size-10 rounded-full transition-colors cursor-pointer ${
                      panel === 'lyrics' ? 'text-white bg-white/20' : 'text-white/60 hover:text-white'
                    }`}
                    aria-label="Lyrics"
                    title="Lyrics"
                  >
                    <MessageSquare size={21} strokeWidth={2} />
                  </button>

                  {/* Airplay / Listen Together */}
                  <button
                    onClick={handleCast}
                    className="grid place-items-center size-10 rounded-full text-white/60 hover:text-white transition-colors cursor-pointer"
                    aria-label="AirPlay & Listen Together"
                    title="AirPlay & Listen Together"
                  >
                    <Airplay size={22} strokeWidth={2} />
                  </button>

                  {/* Up Next Queue */}
                  <button
                    onClick={() => togglePanel('queue')}
                    className={`grid place-items-center size-10 rounded-full transition-colors cursor-pointer ${
                      panel === 'queue' ? 'text-white bg-white/20' : 'text-white/60 hover:text-white'
                    }`}
                    aria-label="Up Next"
                    title="Up Next"
                  >
                    <ListMusic size={22} strokeWidth={2} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* =========================================================================
            DESKTOP-ONLY 2-COLUMN SPLIT LAYOUT (Kept identical for desktop screen sizes)
           ========================================================================= */}
        <div className="hidden md:flex relative z-10 size-full flex-row items-stretch">
          {/* ================= LEFT COLUMN: Header & Player Controls ================= */}
          <div className="relative w-1/2 h-full flex flex-col justify-end">

            {/* Lower-Third Track Information & Working 1:1 Controls - Left-Aligned or Centered per user setting */}
            <div
              className={`relative z-30 w-full max-w-[500px] px-8 sm:px-12 pb-10 pt-4 flex flex-col transition-all duration-300 ${
                wesperizedAlignment === 'center' ? 'items-center mx-auto text-center' : 'items-start text-left'
              }`}
            >
              {/* Track Title - Full title displayed without ellipsis (...) */}
              <h1
                className={`w-full text-xl sm:text-2xl md:text-3xl lg:text-[34px] font-black text-white tracking-tight leading-snug drop-shadow-lg break-words ${
                  wesperizedAlignment === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {title}
              </h1>

              {/* Artist - Clickable credits */}
              <div
                className={`text-sm sm:text-base md:text-[17px] font-bold text-white/90 tracking-wider uppercase mt-2 drop-shadow break-words max-w-full ${
                  wesperizedAlignment === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {artist && (
                  <Credits
                    videoId={videoId}
                    line={artist}
                    artists={track?.artists ?? []}
                    className="cursor-pointer hover:underline hover:text-white transition-colors duration-150 inline"
                  />
                )}
              </div>

              {/* Actual Audio Quality & Codec Format Badge */}
              {(() => {
                const info = nowPlaying?.streamInfo;
                // Parse actual format, e.g. "251 opus 140kbps via VISIONOS direct" or "140 aac 128kbps via WEB SABR"
                let codec = 'OPUS';
                let bitrate = '160 KBPS';
                let sampleRate = '48 KHZ';

                if (info) {
                  const upper = info.toUpperCase();
                  if (upper.includes('OPUS')) {
                    codec = 'OPUS';
                    sampleRate = '48 KHZ';
                  } else if (upper.includes('AAC') || upper.includes('MP4A')) {
                    codec = 'AAC';
                    sampleRate = '44.1 KHZ';
                  } else if (upper.includes('FLAC')) {
                    codec = 'FLAC';
                    sampleRate = '48 KHZ';
                  }

                  const matchBitrate = info.match(/(\d+)\s*kbps/i);
                  if (matchBitrate) {
                    bitrate = `${matchBitrate[1]} KBPS`;
                  }
                }

                return (
                  <div
                    className={`flex items-center mt-2 text-xs sm:text-[13px] font-bold tracking-widest text-white/60 uppercase select-none ${
                      wesperizedAlignment === 'center' ? 'justify-center' : 'justify-start'
                    }`}
                  >
                    <span>{sampleRate} · {codec} · {bitrate}</span>
                  </div>
                );
              })()}

              {/* UP NEXT Badge */}
              <button
                onClick={() => nextTrack && usePlayer.getState().next()}
                className={`flex flex-col justify-center mt-2.5 group max-w-[380px] select-none transition-transform active:scale-95 ${
                  wesperizedAlignment === 'center' ? 'items-center text-center' : 'items-start text-left'
                } ${
                  nextTrack ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <span className="text-xs font-black tracking-widest text-white/55 group-hover:text-white/90 uppercase transition-colors">
                  UP NEXT:
                </span>
                <span className="text-sm sm:text-base font-semibold text-white/90 group-hover:text-white truncate max-w-[340px] mt-0.5 transition-colors">
                  {nextTrack
                    ? `${nextTrack.title} · ${nextTrack.artists?.map((a) => a.name).join(', ') || nextTrack.album?.name || ''}`
                    : 'AutoPlay Radio'}
                </span>
              </button>

              {/* Simple Clean Line Bar Scrubber */}
              <div className="w-full max-w-[440px] mt-4">
                <Scrubber />
              </div>

              {/* 1:1 Transport Controls with Solid White Play Button */}
              <div className="w-full max-w-[440px]">
                <CinematicTransport />
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: Synced Lyrics or Up Next (ON TOP OF THE BLUR) ================= */}
          <div className="relative z-30 w-1/2 h-full flex flex-col justify-center px-6 md:px-12 py-8 overflow-hidden pointer-events-auto">
            {showQueue ? (
              <div className="size-full overflow-hidden animate-fade-in [mask-image:linear-gradient(180deg,#000_calc(100%-80px),transparent)]">
                <UpNext />
              </div>
            ) : (
              <div className="size-full overflow-hidden animate-fade-in flex flex-col justify-center">
                <LyricsPanel variant="full" showPicker={false} />
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

        {/* Custom Album Cover Modal (1:1 Square Auto-Crop or Video) */}
        {showCoverModal && (
          <CustomCoverModal
            videoId={nowPlaying.videoId}
            trackTitle={nowPlaying.title}
            artistName={nowPlaying.artist}
            defaultArtworkUrl={nowPlaying.artworkUrl ? sizedArtwork(nowPlaying.artworkUrl, 800) : null}
            onClose={() => setShowCoverModal(false)}
            onCoverChange={(cover) => {
              setCustomCover(cover);
              showToast(cover ? 'Custom album cover applied' : 'Custom album cover removed');
            }}
          />
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
      <MeshBackdrop artworkUrl={customCover?.type === 'image' ? customCover.url : nowPlaying.artworkUrl} playing={playing} />
      {theater && (
        <div className="absolute inset-0 animate-fade-in bg-black">
          <VideoSurface fit="contain" className="size-full" />
        </div>
      )}

      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-white/20 backdrop-blur-xl border border-white/20 text-white text-xs font-semibold shadow-2xl animate-fade-in flex items-center gap-2">
          <Check size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
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
            className={`group/cover relative w-(--art) rounded-[10px] transition-[scale] duration-450 ease-[cubic-bezier(0.34,1.3,0.64,1)] motion-reduce:transition-none${
              video ? ' aspect-video overflow-hidden bg-black' : ' aspect-square'
            }${playing ? '' : ' scale-92'}${column ? ' max-md:hidden' : ' max-md:animate-cover-switch'}${theater ? ' hidden' : ''}`}
          >
            {customCover ? (
              customCover.type === 'video' ? (
                <PingPongVideo
                  key={`classic-custom-video-${customCover.url}`}
                  src={customCover.url}
                  playing={playing}
                  className="absolute inset-0 size-full rounded-[inherit] object-cover"
                />
              ) : (
                <>
                  <img
                    key={`classic-custom-glow-${customCover.url}`}
                    className={`${artworkLayer} -z-1 translate-y-2 scale-96 blur-[20px] saturate-200 data-loaded:opacity-40 rounded-[inherit]`}
                    src={customCover.url}
                    alt=""
                    decoding="async"
                    onLoad={(e) => e.currentTarget.setAttribute('data-loaded', '')}
                  />
                  <img
                    key={`classic-custom-img-${customCover.url}`}
                    className={`${artworkLayer} bg-[#ffffff12] shadow-[0_4px_10px_#0000001a] data-loaded:opacity-100 rounded-[inherit] object-cover`}
                    src={customCover.url}
                    alt=""
                    decoding="async"
                    onLoad={(e) => e.currentTarget.setAttribute('data-loaded', '')}
                  />
                </>
              )
            ) : (
              <>
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
              </>
            )}
            {video && !theater && <VideoSurface className="absolute inset-0" />}

            {/* Hover on album cover: Custom Album Cover button overlay */}
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-[inherit] opacity-0 group-hover/cover:opacity-100 transition-all duration-200 pointer-events-none group-hover/cover:pointer-events-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCoverModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] bg-neutral-950/90 hover:bg-neutral-900 border border-white/20 text-white text-xs font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.6)] ring-1 ring-white/10 transition active:scale-95 cursor-pointer"
                title="Change album cover (Image or Video)"
                aria-label="Change album cover"
              >
                <ImageIcon size={16} />
                <span>Change Cover</span>
              </button>
            </div>
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

      {/* Custom Album Cover Modal (Image 1:1 auto-crop or Ping-Pong Video) */}
      {showCoverModal && (
        <CustomCoverModal
          videoId={nowPlaying.videoId}
          trackTitle={nowPlaying.title}
          artistName={nowPlaying.artist}
          defaultArtworkUrl={nowPlaying.artworkUrl ? sizedArtwork(nowPlaying.artworkUrl, 800) : null}
          onClose={() => setShowCoverModal(false)}
          onCoverChange={(cover) => {
            setCustomCover(cover);
            showToast(cover ? 'Custom album cover applied' : 'Custom album cover removed');
          }}
        />
      )}
    </div>
  );
}
