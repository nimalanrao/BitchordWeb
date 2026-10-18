# Lyrics Engine (`app/src/lyrics`)

This directory contains the multi-provider lyric fetching, parsing, caching, and precision timing engine that powers the karaoke-style synchronized lyrics in the Side Panel and Full-Screen Player.

## Directory Structure & Files

| File | Purpose |
|---|---|
| [useLyrics.ts](file:///d:/BitchordWeb/app/src/lyrics/useLyrics.ts) | Primary React hook querying the lyrics repository for the current track. Handled through TanStack Query for automatic caching. |
| [providers.ts](file:///d:/BitchordWeb/app/src/lyrics/providers.ts) | Lyrics provider adapters: Apple Music (syllable-level sync), LRCLIB (line-level sync), YouTube Music, and Spotify. |
| [sources.ts](file:///d:/BitchordWeb/app/src/lyrics/sources.ts) | Priority fallback resolution: queries providers in order until suitable synchronized lyrics are found. |
| [parse.ts](file:///d:/BitchordWeb/app/src/lyrics/parse.ts) | Robust parser for line-by-line LRC, enhanced LRC, and word-by-word formats. |
| [ttml.ts](file:///d:/BitchordWeb/app/src/lyrics/ttml.ts) | TTML (Timed Text Markup Language) parser extracting Apple Music's syllable-level karaoke timestamps. |
| [clock.ts](file:///d:/BitchordWeb/app/src/lyrics/clock.ts) | Smooth lyric synchronization clock using `requestAnimationFrame`, compensating for audio clock jitter. |
| [repository.ts](file:///d:/BitchordWeb/app/src/lyrics/repository.ts) | Lyrics cache repository preventing duplicate network requests for recently played tracks. |
| [model.ts](file:///d:/BitchordWeb/app/src/lyrics/model.ts) | TypeScript interfaces for `Lyrics`, `LyricLine`, `LyricWord`, and time span structures. |
| [settings.ts](file:///d:/BitchordWeb/app/src/lyrics/settings.ts) | User preferences: timing calibration offset (ms), romanization, translation, and font size. |
| [http.ts](file:///d:/BitchordWeb/app/src/lyrics/http.ts) | Network client for external lyric API endpoints. |

## Supported Lyric Formats

1. **Word-by-Word / Syllable Sync (Apple Music TTML)**:
   - Words illuminate smoothly in real-time as the singer vocalizes each syllable.
2. **Line-by-Line Sync (LRC)**:
   - Each lyric line highlights when reached and scrolls into view automatically.
3. **Plain Text**:
   - Clean static fallback when synchronized timestamps are unavailable.

## How to Make Common Changes

### 1. Add a New Lyrics Provider
Open [providers.ts](file:///d:/BitchordWeb/app/src/lyrics/providers.ts):
- Implement the `LyricProvider` interface with a `fetch(track)` method.
- Register it in `SOURCES` inside [sources.ts](file:///d:/BitchordWeb/app/src/lyrics/sources.ts).

### 2. Adjust Sync Offset / Timing Calibration
Open [settings.ts](file:///d:/BitchordWeb/app/src/lyrics/settings.ts) or UI settings in [LyricsSettings.tsx](file:///d:/BitchordWeb/app/src/shell/LyricsSettings.tsx):
- Timing offset shifts all timestamps forward or backward by the specified milliseconds.
