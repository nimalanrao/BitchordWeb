# Global State Stores (`app/src/state`)

This directory contains the central Zustand stores managing audio player state, UI panels, modals, and video synchronization across the application.

## Directory Structure & Files

| File | Store Hook | Description |
|---|---|---|
| [player.ts](file:///d:/BitchordWeb/app/src/state/player.ts) | `usePlayer` | The primary audio player store: current track metadata, playback status, queue, playback index, volume, mute, shuffle, repeat, crossfade, and actions. Persists key settings to `localStorage` (`bitchord:player`). |
| [ui.ts](file:///d:/BitchordWeb/app/src/state/ui.ts) | `useUi` | Global UI visibility states: full-screen now playing modal, flyout side panel (`lyrics` or `up-next`), mobile drawer open state, and install banner dismissal. |
| [video.ts](file:///d:/BitchordWeb/app/src/state/video.ts) | `useVideo`, `useHasVideo` | Tracks whether the currently playing song has an associated music video and coordinates video playback surface sync. |

## Core Store API Reference

### `usePlayer` (`player.ts`)

#### State Fields
- `nowPlaying: MusicItem | null`: Currently active song metadata (title, artist, album, artwork, videoId).
- `status: 'idle' | 'buffering' | 'playing' | 'paused' | 'error'`: Active playback status.
- `queue: QueueItem[]`: Current play queue list.
- `index: number`: Position in the queue.
- `volume: number`: Volume level from `0.0` to `1.0`.
- `muted: boolean`: Whether audio is muted.
- `shuffle: boolean`: Shuffle mode active flag.
- `repeat: 'off' | 'all' | 'one'`: Current loop / repeat mode.
- `autoplay: boolean`: Whether related tracks are automatically queued when the queue finishes.
- `crossfade: number`: Crossfade overlap in seconds (`0`, `3`, `6`, `9`, `12`).

#### Actions
```ts
const {
  togglePlay,    // Toggle play/pause
  next,          // Advance to next song (or repeat)
  previous,      // Go to previous song (or restart track if > 3s in)
  seek,          // Seek to second position (number)
  setVolume,     // Set volume 0.0 - 1.0
  toggleMute,    // Toggle muted state
  toggleShuffle, // Toggle shuffle ordering
  cycleRepeat,   // Cycle: 'off' -> 'all' -> 'one' -> 'off'
  playTrack,     // Clear/replace queue with track
  enqueue,       // Append track to queue
  reorderQueue,  // Reorder queue indices
  removeFromQueue// Remove item at index
} = usePlayer.getState();
```

### `useUi` (`ui.ts`)

#### State Fields & Actions
- `fullScreen: boolean` & `setFullScreen(boolean)` / `toggleFullScreen()`: Opens or closes the full-screen player view.
- `sidePanel: 'lyrics' | 'up-next' | null` & `toggleSidePanel('lyrics' | 'up-next')`: Opens/closes the desktop right-hand panel.
- `drawerOpen: boolean` & `setDrawerOpen(boolean)`: Opens/closes the mobile navigation drawer.
- `installBannerDismissed: boolean` & `dismissInstallBanner()`: Tracks dismissal of the companion extension recommendation banner.

## How to Make Common Changes

### 1. Add a New Global UI Flag
1. Open [ui.ts](file:///d:/BitchordWeb/app/src/state/ui.ts).
2. Add the field to the interface `UiState` and initial state object.
3. Add a setter action inside `create<UiState>()`.

### 2. Add New Persistent Player Settings
1. Open [player.ts](file:///d:/BitchordWeb/app/src/state/player.ts).
2. Look at the `save()` and `load()` functions near the top.
3. Add your setting key to the serialized object saved to `localStorage.getItem('bitchord:player')`.
