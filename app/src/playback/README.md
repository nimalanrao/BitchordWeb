# Audio Playback Engine (`app/src/playback`)

This directory houses BitChord Web's dual-deck audio playback engine, stream decryption/resolution, queue timeline management, and YouTube Music history reporting.

## Directory Structure & Files

```
playback/
├── youtube/
│   ├── engine.ts              # Dual-deck crossfade playback controller
│   ├── ShakaPlayerAdapter.ts  # Shaka Player DASH stream adapter
│   ├── resolver.ts            # YouTube audio stream URL decryption & resolution
│   ├── innertube.ts           # YouTube.js Innertube API client (native /api/yt-proxy)
│   ├── botguard.ts            # Google Botguard challenge solver for stream signatures
│   ├── videoDeck.ts           # Synchronized video playback surface
│   └── shakaHelpers.ts        # Shaka network filters and configurations
├── queue/
│   ├── timeline.ts            # Playback scrubber timeline, seek math & drift detection
│   ├── builder.ts             # Queue generator from albums, playlists, or radio
│   └── queue.test.ts          # Automated tests for queue reordering and repeat modes
├── historyReporting.ts        # Official YouTube Music listening history reporting
└── trackLog.ts                # Audio playback diagnostic logger
```

## Architecture: The Dual-Deck Playback Engine

BitChord uses a dual-deck architecture ([engine.ts](file:///d:/BitchordWeb/app/src/playback/youtube/engine.ts)):
1. **Deck A & Deck B**: Two independent audio elements managed side-by-side.
2. **Seamless Crossfade**: While Deck A is finishing, Deck B preloads the next song at volume `0` and begins playback during the crossfade window (configurable in Settings: off, 3s, 6s, 9s, or 12s).
3. **Stream Resolution** ([resolver.ts](file:///d:/BitchordWeb/app/src/playback/youtube/resolver.ts)):
   - YouTube audio stream URLs require signature cipher decryption.
   - The engine uses [innertube.ts](file:///d:/BitchordWeb/app/src/playback/youtube/innertube.ts) and [botguard.ts](file:///d:/BitchordWeb/app/src/playback/youtube/botguard.ts) to resolve 256kbps AAC / Opus audio streams.
   - All requests are proxied via the built-in `/api/yt-proxy` endpoint so no companion extension is required.
4. **Shaka Player** ([ShakaPlayerAdapter.ts](file:///d:/BitchordWeb/app/src/playback/youtube/ShakaPlayerAdapter.ts)):
   - Handles DASH streaming, adaptive bitrate selection, and low-latency audio buffering with Range requests.

## How to Make Common Changes

### 1. Adjust Crossfade Durations
Crossfade duration is stored in the player store (`crossfade: number` in seconds).
- Options are defined in `app/src/state/player.ts` (`0`, `3`, `6`, `9`, `12`).
- To change how deck volumes ramp during crossfade, see `rampVolume()` inside [engine.ts](file:///d:/BitchordWeb/app/src/playback/youtube/engine.ts).

### 2. Modify Audio Stream Bitrate / Quality Preference
Open [resolver.ts](file:///d:/BitchordWeb/app/src/playback/youtube/resolver.ts):
- Check `selectFormat()` to prioritize audio codecs (Opus vs AAC) or maximum bitrate formats.

### 3. Debug Playback Failures
Open `/debug` in your browser, or inspect `playbackState` in [trackLog.ts](file:///d:/BitchordWeb/app/src/playback/trackLog.ts) to see format resolution logs and Shaka player network request errors.
