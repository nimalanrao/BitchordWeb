# Shell & Application Frame (`app/src/shell`)

This directory contains the core application layout frame and global interactive chrome for BitChord Web, matching the Apple Music Web DOM specification.

## Directory Structure & Files

| File | Responsibility |
|---|---|
| [AppShell.tsx](file:///d:/BitchordWeb/app/src/shell/AppShell.tsx) | The root layout frame: fixed glass sidebar, mobile top bar, scrollable main outlet, floating player pill, side panel, and full-screen player modal. Handles route transition animations and scroll restoration. |
| [Sidebar.tsx](file:///d:/BitchordWeb/app/src/shell/Sidebar.tsx) | Left glass sidebar (`260px` wide on desktop, slide-over drawer on mobile `<484px`). Navigation links for Primary (Search, Home, New), Library sections, and Settings. Includes animated active tab indicators. |
| [PlayerBar.tsx](file:///d:/BitchordWeb/app/src/shell/PlayerBar.tsx) | Bottom glass player bar. On desktop (`≥484px`): 3-column floating player pill (`--player-pill-height: 56px`, `glass-pill`). On mobile (`<484px`): sleek floating mini player with album artwork, live 2px progress bar, Play/Pause and Next controls, expanding to Full Screen on tap. |
| [FullScreenPlayer.tsx](file:///d:/BitchordWeb/app/src/shell/FullScreenPlayer.tsx) | Full-screen now-playing view (`[data-full-screen]`). Displays large album art with radiosity glow/motion, scrubber, transport buttons, dedicated volume slider, synced lyrics (`LyricsPanel`), or Up Next queue. |
| [Lcd.tsx](file:///d:/BitchordWeb/app/src/shell/Lcd.tsx) | Center display of the player pill: track title, clickable artist/album credits, and mini progress scrubber. |
| [LyricsPanel.tsx](file:///d:/BitchordWeb/app/src/shell/LyricsPanel.tsx) | Synchronized lyrics renderer powered by `@uimaxbai/am-lyrics`. Supports auto-scrolling, karaoke word sync, romanization, and translation. |
| [LyricsSettings.tsx](file:///d:/BitchordWeb/app/src/shell/LyricsSettings.tsx) | Contextual settings for lyrics: font size, sync offset, romanization, and source provider selection. |
| [SidePanel.tsx](file:///d:/BitchordWeb/app/src/shell/SidePanel.tsx) | Flyout panel sliding in from the right edge (`--side-panel-width: 300px`) showing either the Up Next queue or lyrics alongside the main page. |
| [UpNext.tsx](file:///d:/BitchordWeb/app/src/shell/UpNext.tsx) | Queue management panel: reordering, removing tracks, autoplay toggles, and crossfade configuration. |
| [MeshBackdrop.tsx](file:///d:/BitchordWeb/app/src/shell/MeshBackdrop.tsx) | Dynamic animated fluid gradient backdrop in the full-screen player, generated from the current track's artwork palette. |
| [MobileTopBar.tsx](file:///d:/BitchordWeb/app/src/shell/MobileTopBar.tsx) | Glass header visible only on mobile screens (`<484px`) with the drawer toggle button and BitChord logo. |
| [Banner.tsx](file:///d:/BitchordWeb/app/src/shell/Banner.tsx) | Dismissible notification band at the bottom (e.g. mobile app recommendation). |
| [AccountButton.tsx](file:///d:/BitchordWeb/app/src/shell/AccountButton.tsx) | Sidebar bottom user button indicating YouTube Music account sign-in status. |
| [useScrubber.ts](file:///d:/BitchordWeb/app/src/shell/useScrubber.ts) | Hook managing seeking, drag interactions, elapsed/remaining time displays, and timeline synchronization. |
| [useKeyboardShortcuts.ts](file:///d:/BitchordWeb/app/src/shell/useKeyboardShortcuts.ts) | Global keyboard navigation (`Space` play/pause, `Ctrl/Cmd + Arrow` next/prev/volume, `Ctrl/Cmd + F` search, `Esc` close modal). |
| [nowPlayingLinks.ts](file:///d:/BitchordWeb/app/src/shell/nowPlayingLinks.ts) | Helpers resolving navigation URLs for currently playing album and artist. |

## Key State & Store Connections

- **Player State**: Consumes `usePlayer` from `app/src/state/player.ts` for playback status, current track, queue, volume, shuffle, and repeat.
- **UI State**: Consumes `useUi` from `app/src/state/ui.ts` for `fullScreen`, `sidePanel`, and `drawerOpen`.
- **Standalone Web Playback**: Native in-app proxy (`/api/yt-proxy`) eliminates any companion extension requirement.

## How to Make Common Changes

### 1. Add or Modify Sidebar Tabs
Open [Sidebar.tsx](file:///d:/BitchordWeb/app/src/shell/Sidebar.tsx):
- Look at `PRIMARY` array (line 33) to add top-level tabs.
- Each item specifies `{ to: string, label: string, Icon: Component }`.
- Style changes to tabs can be edited in `const item` (line 54).

### 2. Customize Full-Screen Player Controls
Open [FullScreenPlayer.tsx](file:///d:/BitchordWeb/app/src/shell/FullScreenPlayer.tsx):
- Left column contains `<div className="relative w-(--art)...">` (artwork/video), metadata text, `<Scrubber />`, `<Transport />`, and `<VolumeSlider />`.
- To adjust volume slider behavior or styling, look at `VolumeSlider()` (lines 121-159) and `volumeSliderInput`.
- Right column conditionally mounts `<LyricsPanel />` or `<UpNext />`.

### 3. Change Route / Tab Switch Animations
Open [AppShell.tsx](file:///d:/BitchordWeb/app/src/shell/AppShell.tsx):
- The `<Outlet />` wrapper has `key={location.pathname}` and class `animate-tab-fade`.
- Keyframes and timing are configured in `app/src/styles/global.css` (`tab-fade`).
