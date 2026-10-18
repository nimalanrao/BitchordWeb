# UI Components & Design System (`app/src/components`)

This directory houses the reusable UI component library and visual building blocks for BitChord Web, strictly implementing the Apple Music Web DOM specification.

## Directory Structure

```
components/
├── music/               # Music-specific UI elements
│   ├── TrackList.tsx    # High-performance virtualized track list
│   ├── ShelfView.tsx    # Horizontal shelf with hover scroll arrows
│   ├── Lockups.tsx      # Square, Circle (Artist), and Video artwork cards
│   ├── Artwork.tsx      # Responsive artwork image with inner stroke & fallback
│   ├── MotionArtwork.tsx# Apple Music animated cover video surface
│   ├── CategoryTiles.tsx# Category cards for Search page
│   ├── FavoriteButton.tsx# Star toggle button for favorite tracks
│   ├── States.tsx       # Empty states, Error screens, Extension required notices
│   ├── play.ts          # Central playback dispatcher (play track, play album, play next)
│   └── links.ts         # Navigation URL generators for albums, artists, and playlists
├── icons/               # SVG icon library
│   ├── Transport.tsx    # Play, Pause, Next, Prev, Volume, Lyrics, Repeat, Shuffle, UpNext
│   ├── NavIcons.tsx     # Home, Search, New, Library icons
│   └── LogoMark.tsx     # BitChord brand waveform mark
├── Menu.tsx             # Contextual dropdown menus with outside-click dismissal
├── PageHeader.tsx       # Standard page title & subtitle banner
├── PrefetchLink.tsx     # Smart Link component prefetching code chunks & queries on hover
├── Skeleton.tsx         # Shimmering skeleton placeholders
└── shelf.ts             # Shelf layout classes & responsive column rules
```

## Key Components

### 1. Virtualized Track List ([TrackList.tsx](file:///d:/BitchordWeb/app/src/components/music/TrackList.tsx))
- Built with `@tanstack/react-virtual` against the `#scrollable-page` container.
- Capable of rendering thousands of tracks in playlists or library with 60fps scrolling and tiny DOM footprint.
- Features: Track numbers, explicit badges, hover play button, duration formatting, and contextual right-click / ⋯ menus.

### 2. Shelves with Apple Hover Arrows ([ShelfView.tsx](file:///d:/BitchordWeb/app/src/components/music/ShelfView.tsx))
- Horizontal scrolling rows that snap cleanly.
- Displays Apple's semi-transparent circular navigation arrows when hovering over the edges.
- Supports different card kinds: `square` (albums/playlists), `circle` (artists), `tracks` (3-row song groups), and `video` (16:9 thumbnails).

### 3. Contextual Menus ([Menu.tsx](file:///d:/BitchordWeb/app/src/components/Menu.tsx))
- Portals to `document.body` above all content.
- Automatically repositions to remain within screen bounds.
- Supports keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`).

## How to Make Common Changes

### 1. Modify Track Row Appearance
Open [TrackList.tsx](file:///d:/BitchordWeb/app/src/components/music/TrackList.tsx):
- Look at `TrackRow` and `trackRowClass` for height, padding, and text colors.

### 2. Add an Action to the Track Context Menu
Open [TrackList.tsx](file:///d:/BitchordWeb/app/src/components/music/TrackList.tsx):
- Look at `TrackMenu` to add items like "Play Next", "Add to Library", or "Start Radio".
