import { lazy, Suspense, useEffect, useState } from 'react';
import { resumeSession } from '@/party/listenTogether';
import { startPartySync } from '@/party/partySync';
import { startHistoryReporting } from '@/playback/historyReporting';
import { Outlet, useLocation } from 'react-router';
import { useUi } from '@/state/ui';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { MobileTopBar } from './MobileTopBar';
import { PlayerBar } from './PlayerBar';
import { SidePanel } from './SidePanel';
import { Sidebar } from './Sidebar';

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
  const [showFullScreen, setShowFullScreen] = useState(fullScreen);

  useEffect(() => {
    if (fullScreen) {
      setShowFullScreen(true);
    }
  }, [fullScreen]);
  const location = useLocation();

  // Reset scroll to top smoothly when switching tabs / routes
  useEffect(() => {
    const scroller = document.getElementById('scrollable-page');
    if (scroller) {
      scroller.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* The side panel slides in from beyond the right edge; never let it scroll the page. */}
      <div className="relative h-full min-h-0 overflow-hidden">
        <Sidebar />
        <MobileTopBar />
        {/* The page scrolls under the fixed sidebar and the floating player. */}
        <main
          id="scrollable-page"
          className="absolute inset-0 overflow-x-hidden overflow-y-auto pl-(--web-navigation-width) [scrollbar-gutter:stable] data-tint:bg-(--page-tint) data-tint:transition-[background-color] data-tint:duration-300 data-tint:ease-in max-sm:pt-(--mobile-top-bar-height) max-sm:pl-0"
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
