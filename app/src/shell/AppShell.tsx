import { lazy, Suspense, useEffect, useState } from 'react';
import { resumeSession } from '@/party/listenTogether';
import { startPartySync } from '@/party/partySync';
import { startHistoryReporting } from '@/playback/historyReporting';
import { Outlet, useLocation } from 'react-router';
import { useUi } from '@/state/ui';
import { usePlayer } from '@/state/player';
import { meshPalette, type Rgb } from '@/lib/meshPalette';
import { getCustomCover, type CustomCoverData } from '@/lib/customCovers';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { MobileTopBar } from './MobileTopBar';
import { PlayerBar } from './PlayerBar';
import { SidePanel } from './SidePanel';
import { Sidebar } from './Sidebar';

import { useAccessGate } from '@/state/accessGate';
import { AccessGateModal } from './AccessGateModal';

// It carries am-lyrics; loaded the first time it opens, as the side panel's lyrics are.
const FullScreenPlayer = lazy(() => import('./FullScreenPlayer').then((m) => ({ default: m.FullScreenPlayer })));

/**
 * The app frame: glass sidebar, the scrolling page, the floating
 * player pill, and the side panel.
 */
export function AppShell() {
  useKeyboardShortcuts();
  // Listen Together: pick a party back up after a reload, and keep the player in step with it.
  useEffect(() => {
    resumeSession();
    return startPartySync();
  }, []);
  // Plays into the account's YouTube Music history (Settings › Share Listening Activity).
  useEffect(() => startHistoryReporting(), []);
  const fullScreen = useUi((s) => s.fullScreen);
  const sidebarCollapsed = useUi((s) => s.sidebarCollapsed);
  const [showFullScreen, setShowFullScreen] = useState(fullScreen);

  useEffect(() => {
    if (fullScreen) {
      setShowFullScreen(true);
    }
  }, [fullScreen]);
  const isAccessGranted = useAccessGate((s) => s.isGranted);
  const location = useLocation();

  // Dynamic background setting and now playing cover palette
  const dynamicBg = usePlayer((s) => s.dynamicBg);
  const nowPlaying = usePlayer((s) => s.nowPlaying);
  const [customCover, setCustomCover] = useState<CustomCoverData | null>(() =>
    nowPlaying ? getCustomCover(nowPlaying.videoId) : null,
  );
  const [dominantRgb, setDominantRgb] = useState<Rgb | null>(null);

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
    if (!art) {
      setDominantRgb(null);
      return;
    }
    meshPalette(art)
      .then((colors) => {
        if (colors && colors.length > 0 && colors[0]) {
          setDominantRgb(colors[0]);
        }
      })
      .catch(() => setDominantRgb(null));
  }, [nowPlaying?.artworkUrl, customCover]);

  // Apply darkened background color to the scrollable container when dynamicBg is active
  useEffect(() => {
    const scroller = document.getElementById('scrollable-page');
    if (!scroller) return;

    if (dynamicBg && dominantRgb) {
      // Darkened tone so yellow/bright colors become a deep rich background with high contrast for text
      const r = Math.round(dominantRgb[0] * 0.16);
      const g = Math.round(dominantRgb[1] * 0.16);
      const b = Math.round(dominantRgb[2] * 0.16);
      const darkenedBg = `rgb(${r}, ${g}, ${b})`;

      scroller.style.setProperty('--pageBG', darkenedBg);
      scroller.style.setProperty('--page-tint', darkenedBg);
      scroller.dataset.tint = 'dark';
    } else {
      // Revert if setting is disabled or no track is playing
      scroller.style.removeProperty('--pageBG');
      scroller.style.removeProperty('--page-tint');
      delete scroller.dataset.tint;
    }
  }, [dynamicBg, dominantRgb]);

  // Reset scroll to top smoothly when switching tabs / routes
  useEffect(() => {
    const scroller = document.getElementById('scrollable-page');
    if (scroller) {
      scroller.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <div
      className="relative h-full w-full overflow-hidden transition-[--web-navigation-width] duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]"
      data-sidebar-collapsed={sidebarCollapsed}
    >
      {/* The side panel slides in from beyond the right edge; never let it scroll the page. */}
      <div className="relative h-full min-h-0 overflow-hidden">
        <Sidebar />
        <MobileTopBar />
        {/* The page scrolls under the fixed sidebar and the floating player. */}
        <main
          id="scrollable-page"
          className="absolute inset-0 overflow-x-hidden overflow-y-auto pl-(--web-navigation-width) [scrollbar-gutter:stable] bg-(--pageBG) data-tint:bg-(--page-tint) transition-[background-color,padding-left] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] max-sm:pt-(--mobile-top-bar-height) max-sm:pl-0"
        >
          {/* Clears the floating pill and mobile dock with blur-fade animation */}
          <div
            key={location.pathname}
            className="min-h-full pb-[calc(var(--player-pill-height)+var(--player-bottom-offset)+40px)] max-sm:pb-48 animate-tab-fade"
          >
            <Outlet />
          </div>
        </main>
        <PlayerBar />
        <SidePanel />
      </div>
      {!isAccessGranted && <AccessGateModal />}
      {showFullScreen && (
        <Suspense fallback={null}>
          <FullScreenPlayer
            isClosing={!fullScreen}
            onClosed={() => setShowFullScreen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
