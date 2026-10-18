import { lazy, Suspense, useEffect, useState } from 'react';
import { resumeSession } from '@/party/listenTogether';
import { startPartySync } from '@/party/partySync';
import { startHistoryReporting } from '@/playback/historyReporting';
import { Outlet, useLocation } from 'react-router';
import { config } from '@/config';
import { isMobileBrowser } from '@/lib/platform';
import { useUi } from '@/state/ui';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { Banner, bannerButtonClass } from './Banner';
import { MobileTopBar } from './MobileTopBar';
import { PlayerBar } from './PlayerBar';
import { SidePanel } from './SidePanel';
import { Sidebar } from './Sidebar';

const mobile = isMobileBrowser();

// It carries am-lyrics; loaded the first time it opens, as the side panel's lyrics are.
const FullScreenPlayer = lazy(() => import('./FullScreenPlayer').then((m) => ({ default: m.FullScreenPlayer })));

/**
 * The app frame: glass sidebar, the scrolling page, the floating
 * player pill, the side panel, and the bottom band when there is one.
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

  const banner = mobile ? (
    <Banner
      title="BitChord is also available on Android."
      detail="The native Android app supports background playback and offline music."
      action={
        <a className={bannerButtonClass} href={config.androidAppUrl} target="_blank" rel="noreferrer">
          Get the App
        </a>
      }
    />
  ) : null;

  return (
    <div className="grid h-full grid-rows-[minmax(0,1fr)_auto]">
      {/* The side panel slides in from beyond the right edge; never let it scroll the page. */}
      <div className="relative min-h-0 overflow-hidden">
        <Sidebar />
        <MobileTopBar />
        {/* The page scrolls under the fixed sidebar and the floating player. */}
        <main
          id="scrollable-page"
          className="absolute inset-0 overflow-x-hidden overflow-y-auto pl-(--web-navigation-width) [scrollbar-gutter:stable] data-tint:bg-(--page-tint) data-tint:transition-[background-color] data-tint:duration-300 data-tint:ease-in max-sm:pt-(--mobile-top-bar-height) max-sm:pl-0"
        >
          {/* Clears the floating pill: its height, its offset, and some air. */}
          <div
            key={location.pathname}
            className="min-h-full pb-[calc(var(--player-pill-height)+var(--player-bottom-offset)+40px)] animate-tab-fade"
          >
            <Outlet />
          </div>
        </main>
        <PlayerBar />
        <SidePanel />
      </div>
      {banner}
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
