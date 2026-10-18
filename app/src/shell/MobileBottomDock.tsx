import { useLocation, useNavigate } from 'react-router';
import { ForwardIcon, PauseIcon, PlayIcon } from '@/components/icons/Transport';
import { LogoMark } from '@/components/icons/LogoMark';
import { sizedArtwork } from '@/lib/artwork';
import { usePlayer } from '@/state/player';
import { useUi } from '@/state/ui';
import { useScrubber } from './useScrubber';
import { preloadRoute } from '@/pageRegistry';

function FilledHomeIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.707 2.293a1 1 0 00-1.414 0l-9 9A1 1 0 003 13h1v7a2 2 0 002 2h4a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h4a2 2 0 002-2v-7h1a1 1 0 00.707-1.707l-9-9z" />
    </svg>
  );
}

function GridIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="2" />
      <rect x="14" y="3.5" width="6.5" height="6.5" rx="2" />
      <rect x="14" y="14" width="6.5" height="6.5" rx="2" />
      <rect x="3.5" y="14" width="6.5" height="6.5" rx="2" />
    </svg>
  );
}

function AppleLibraryIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <rect x="7" y="2.5" width="10" height="2" rx="1" opacity="0.45" />
      <rect x="5.5" y="5.5" width="13" height="2" rx="1" opacity="0.7" />
      <rect x="4" y="8.5" width="16" height="12.5" rx="3" />
    </svg>
  );
}

function SearchGlassIcon({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="10.5" cy="10.5" r="7" />
      <line x1="15.8" y1="15.8" x2="21" y2="21" />
    </svg>
  );
}

/** Floating capsule mini player matching screenshot */
export function MobileMiniPlayer() {
  const nowPlaying = usePlayer((s) => s.nowPlaying);
  const playing = usePlayer((s) => s.status === 'playing' || s.status === 'buffering');
  const hasNext = usePlayer((s) => s.index + 1 < s.queue.length || s.repeat !== 'off' || (s.autoplay && s.index >= 0));
  const { togglePlay, next } = usePlayer.getState();
  const setFullScreen = useUi((s) => s.setFullScreen);
  const { bar } = useScrubber();

  return (
    <div
      className="pointer-events-auto relative flex h-[58px] w-full max-w-[420px] items-center justify-between overflow-hidden rounded-[9999px] bg-[#18181a]/85 px-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-2xl border border-white/12 transition-all"
      role="region"
      aria-label="Mini Player"
    >
      {/* 2px progress bar at top */}
      <div className="absolute top-0 inset-x-6 h-[2px] overflow-hidden pointer-events-none rounded-[9999px] bg-white/10">
        <div
          ref={bar}
          className="size-full origin-left scale-x-(--progress) bg-key transition-[background-color] duration-120 ease-in [--progress:0]"
        />
      </div>

      {/* Tapping on artwork or title expands to full screen */}
      <div
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-1 active:opacity-80"
        onClick={() => setFullScreen(true)}
        role="button"
        tabIndex={0}
        aria-label="Expand player"
      >
        <div className="relative size-[40px] flex-none overflow-hidden rounded-[10px] bg-[#2c2c2e] shadow-sm">
          {nowPlaying?.artworkUrl ? (
            <img
              src={sizedArtwork(nowPlaying.artworkUrl, 100)}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center text-tertiary">
              <LogoMark size={20} />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="truncate text-[14.5px] font-semibold text-white leading-tight">
            {nowPlaying ? nowPlaying.title : 'Not Playing'}
          </span>
          <span className="truncate text-[12.5px] font-medium text-[#8e8e93] leading-tight mt-0.5">
            {nowPlaying ? nowPlaying.artist : 'Select a track to play'}
          </span>
        </div>
      </div>

      {/* Play/Pause and Next controls */}
      <div className="flex flex-none items-center gap-1.5 pl-2">
        <button
          className="grid size-9 place-items-center rounded-[9999px] text-white transition-transform active:scale-90 disabled:opacity-40"
          disabled={!nowPlaying}
          aria-label={playing ? 'Pause' : 'Play'}
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
        >
          {playing ? <PauseIcon size={26} /> : <PlayIcon size={26} />}
        </button>
        <button
          className="grid size-9 place-items-center rounded-[9999px] text-white transition-transform active:scale-90 disabled:opacity-40"
          disabled={!nowPlaying || !hasNext}
          aria-label="Next"
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
        >
          <ForwardIcon size={22} />
        </button>
      </div>
    </div>
  );
}

/** Bottom Floating Navigation Dock: 3-tab capsule + separate circular search button */
export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const isHome = pathname === '/home' || pathname === '/';
  const isExplore = pathname === '/new' || pathname.startsWith('/browse');
  const isLibrary = pathname.startsWith('/library');
  const isSearch = pathname === '/search';

  const handleNavigate = (to: string) => {
    preloadRoute(to);
    if (pathname === to) {
      const scroller = document.getElementById('scrollable-page');
      scroller?.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(to);
    }
  };

  return (
    <nav className="pointer-events-auto flex w-full max-w-[420px] items-center justify-between gap-3" aria-label="Mobile Navigation">
      {/* Left Dock Capsule: Home, Explore, Library */}
      <div className="flex h-[58px] flex-1 items-center justify-around rounded-[9999px] bg-[#18181a]/85 px-2 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-2xl border border-white/12">
        {/* Home */}
        <button
          onClick={() => handleNavigate('/home')}
          className={`flex h-[44px] flex-col items-center justify-center transition-all duration-200 active:scale-95 ${
            isHome
              ? 'rounded-[9999px] bg-[#2c2c2e]/90 px-5 text-white shadow-sm'
              : 'px-3 text-[#8e8e93] hover:text-white'
          }`}
          aria-label="Home"
          aria-current={isHome ? 'page' : undefined}
        >
          <FilledHomeIcon size={20} className={isHome ? 'text-white' : 'text-[#8e8e93]'} />
          <span className="mt-0.5 text-[11px] font-semibold tracking-tight">Home</span>
        </button>

        {/* Explore */}
        <button
          onClick={() => handleNavigate('/new')}
          className={`flex h-[44px] flex-col items-center justify-center transition-all duration-200 active:scale-95 ${
            isExplore
              ? 'rounded-[9999px] bg-[#2c2c2e]/90 px-5 text-white shadow-sm'
              : 'px-3 text-[#8e8e93] hover:text-white'
          }`}
          aria-label="Explore"
          aria-current={isExplore ? 'page' : undefined}
        >
          <GridIcon size={20} className={isExplore ? 'text-white' : 'text-[#8e8e93]'} />
          <span className="mt-0.5 text-[11px] font-semibold tracking-tight">Explore</span>
        </button>

        {/* Library */}
        <button
          onClick={() => handleNavigate('/library/recent')}
          className={`flex h-[44px] flex-col items-center justify-center transition-all duration-200 active:scale-95 ${
            isLibrary
              ? 'rounded-[9999px] bg-[#2c2c2e]/90 px-5 text-white shadow-sm'
              : 'px-3 text-[#8e8e93] hover:text-white'
          }`}
          aria-label="Library"
          aria-current={isLibrary ? 'page' : undefined}
        >
          <AppleLibraryIcon size={20} className={isLibrary ? 'text-white' : 'text-[#8e8e93]'} />
          <span className="mt-0.5 text-[11px] font-semibold tracking-tight">Library</span>
        </button>
      </div>

      {/* Right Circular Search Button */}
      <button
        onClick={() => handleNavigate('/search')}
        className={`flex size-[58px] flex-none items-center justify-center rounded-[9999px] bg-[#18181a]/85 shadow-[0_8px_32px_rgba(0,0,0,0.55)] backdrop-blur-2xl border transition-all active:scale-90 ${
          isSearch
            ? 'bg-[#2c2c2e]/90 text-white border-white/20'
            : 'border-white/12 text-[#8e8e93] hover:text-white'
        }`}
        aria-label="Search"
        aria-current={isSearch ? 'page' : undefined}
      >
        <SearchGlassIcon size={22} className={isSearch ? 'text-white' : 'text-[#8e8e93]'} />
      </button>
    </nav>
  );
}

/** Full Mobile Bottom Dock combining mini player and navigation bar */
export function MobileBottomDock() {
  return (
    <div className="flex w-full flex-col items-center gap-2.5">
      <MobileMiniPlayer />
      <MobileBottomNav />
      {/* iOS Home Indicator */}
      <div className="mt-0.5 h-[4px] w-32 rounded-[9999px] bg-white/25 pointer-events-none" />
    </div>
  );
}

