# BitChord Web — Complete Codebase Map & Module Index

This document provides a comprehensive map of all modules and subsystems in BitChord Web. Each section directory contains its own dedicated `README.md` file detailing individual files, responsibilities, and how to make modifications.

## Module Index & Section Guides

| Subsystem | Location | Section Guide | Responsibility |
|---|---|---|---|
| **App Shell & Layout** | `app/src/shell/` | [shell/README.md](file:///d:/BitchordWeb/app/src/shell/README.md) | Glass sidebar, mobile drawer, player pill, full-screen player, lyrics panel, tab animations, and keyboard shortcuts. |
| **Pages & Routes** | `app/src/pages/` | [pages/README.md](file:///d:/BitchordWeb/app/src/pages/README.md) | All route views (`/home`, `/search`, `/new`, `/library/*`, `/album/*`, `/artist/*`, `/playlist/*`, `/settings`, etc.). |
| **Audio Playback** | `app/src/playback/` | [playback/README.md](file:///d:/BitchordWeb/app/src/playback/README.md) | Dual-deck crossfade engine, Shaka Player adaptive streaming, YouTube decryption, timeline, and history sync. |
| **Global State** | `app/src/state/` | [state/README.md](file:///d:/BitchordWeb/app/src/state/README.md) | Zustand stores for audio player (`usePlayer`), UI modals/panels (`useUi`), and video availability (`useVideo`). |
| **Lyrics Subsystem** | `app/src/lyrics/` | [lyrics/README.md](file:///d:/BitchordWeb/app/src/lyrics/README.md) | Multi-provider lyric fetching (Apple Music, LRCLIB, Spotify, YouTube), TTML syllable parsing, and precision synchronization clock. |
| **Listen Together** | `app/src/party/` | [party/README.md](file:///d:/BitchordWeb/app/src/party/README.md) | Real-time party playback synchronization across multiple devices with drift correction. |
| **Data & Queries** | `app/src/data/` | [data/README.md](file:///d:/BitchordWeb/app/src/data/README.md) | TanStack Query hooks, caching, YouTube Music API, Spotify API, and Apple motion artwork. |
| **UI Components** | `app/src/components/` | [components/README.md](file:///d:/BitchordWeb/app/src/components/README.md) | Virtualized track list, horizontal shelves with hover arrows, artwork lockups, context menus, and icons. |
| **Design System** | `app/src/styles/` | [styles/README.md](file:///d:/BitchordWeb/app/src/styles/README.md) | Apple Music measurement tokens (`tokens.css`), Tailwind CSS v4 layers, glassmorphism utilities, and keyframe animations. |
| **Extension Hooks** | `app/src/extension/` | [extension/README.md](file:///d:/BitchordWeb/app/src/extension/README.md) | React hooks connecting the web app to the companion browser extension bridge. |
| **Shared Protocol** | `shared/` | [shared/README.md](file:///d:/BitchordWeb/shared/README.md) | `@bitchord/shared` RPC message protocol, payload types, and client library. |
| **Browser Extension** | `extension/` | [extension/README.md](file:///d:/BitchordWeb/extension/README.md) | Manifest V3 companion extension (Chrome and Firefox) enabling background playback, cookies, and Discord RPC. |
| **Utilities** | `app/src/lib/` | [lib/README.md](file:///d:/BitchordWeb/app/src/lib/README.md) | Artwork resizers, dominant color extraction, dynamic page tinting, and platform helpers. |
| **Skeletons** | `app/src/skeletons/` | [skeletons/README.md](file:///d:/BitchordWeb/app/src/skeletons/README.md) | Zero-CLS shimmer loading placeholder components. |

## Quick Change Playbook

- **Want to add a new tab to the sidebar?** → See [shell/README.md](file:///d:/BitchordWeb/app/src/shell/README.md).
- **Want to add a new page or route?** → See [pages/README.md](file:///d:/BitchordWeb/app/src/pages/README.md).
- **Want to customize audio crossfade or codecs?** → See [playback/README.md](file:///d:/BitchordWeb/app/src/playback/README.md).
- **Want to add a persistent player setting?** → See [state/README.md](file:///d:/BitchordWeb/app/src/state/README.md).
- **Want to adjust theme colors or animation durations?** → See [styles/README.md](file:///d:/BitchordWeb/app/src/styles/README.md).
- **Want to add a new lyrics provider?** → See [lyrics/README.md](file:///d:/BitchordWeb/app/src/lyrics/README.md).
- **Want to add a new music query or feed?** → See [data/README.md](file:///d:/BitchordWeb/app/src/data/README.md).
