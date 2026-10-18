# Pages & Route Views (`app/src/pages`)

This directory houses all route-level page components rendered inside the `AppShell` `<Outlet />`. Every page is code-split and lazy-loaded via [pageRegistry.tsx](file:///d:/BitchordWeb/app/src/pageRegistry.tsx).

## Directory Structure & Files

| File | Route Path | Responsibility |
|---|---|---|
| [HomePage.tsx](file:///d:/BitchordWeb/app/src/pages/HomePage.tsx) | `/home` | YouTube Music home feed structured into horizontal shelves with infinite scroll pagination. |
| [NewPage.tsx](file:///d:/BitchordWeb/app/src/pages/NewPage.tsx) | `/new` | New music releases, editorial picks, top charts, and featured playlists. |
| [SearchPage.tsx](file:///d:/BitchordWeb/app/src/pages/SearchPage.tsx) | `/search` | Instant search view with sticky search bar, category tiles, top matching cards, and kind-grouped shelves (Artists, Albums, Songs, Playlists, Videos). |
| [LibraryPage.tsx](file:///d:/BitchordWeb/app/src/pages/LibraryPage.tsx) | `/library/:section` | Dynamic library sections: `recent`, `artists`, `albums`, `songs`, `made-for-you`, and `playlists`. Supports grid lockups and virtualized track lists. |
| [AlbumPage.tsx](file:///d:/BitchordWeb/app/src/pages/AlbumPage.tsx) | `/album/:id` | Album detail view: large artwork with dominant color tint, release year, artist link, and numbered tracklist. |
| [ArtistPage.tsx](file:///d:/BitchordWeb/app/src/pages/ArtistPage.tsx) | `/artist/:id` | Artist profile: circular hero header, top tracks list, albums shelf, singles shelf, and related artists. |
| [PlaylistPage.tsx](file:///d:/BitchordWeb/app/src/pages/PlaylistPage.tsx) | `/playlist/:id` | Playlist detail view: artwork lockup, author attribution, and infinite-scrolling tracks. |
| [BrowsePage.tsx](file:///d:/BitchordWeb/app/src/pages/BrowsePage.tsx) | `/browse/:id` | Generic YouTube Music browse feed viewer for explore categories and moods. |
| [ListenTogetherPage.tsx](file:///d:/BitchordWeb/app/src/pages/ListenTogetherPage.tsx) | `/settings/listen-together`, `/invite/:code` | Party session room for synchronized listening with friends, invite code generation, and host controls. |
| [SettingsPage.tsx](file:///d:/BitchordWeb/app/src/pages/SettingsPage.tsx) | `/settings` | Global preferences: audio playback crossfade, YouTube history reporting toggle, links to sub-settings. |
| [DebugPage.tsx](file:///d:/BitchordWeb/app/src/pages/DebugPage.tsx) | `/debug` | Developer diagnostics: player state inspector, stream format resolution, Shaka player statistics, cache controls. |
| [NotFoundPage.tsx](file:///d:/BitchordWeb/app/src/pages/NotFoundPage.tsx) | `*` | 404 fallback page. |
| [pageStyles.ts](file:///d:/BitchordWeb/app/src/pages/pageStyles.ts) | Shared | Common grid layout utilities for shelves and responsive multi-column track lists. |
| [settingsStyles.ts](file:///d:/BitchordWeb/app/src/pages/settingsStyles.ts) | Shared | Grouped settings rows, switch controls, hairline dividers, and section headings. |

## How Routing Works

1. **Route Mapping**: Configured in [routes.tsx](file:///d:/BitchordWeb/app/src/routes.tsx) and [pageRegistry.tsx](file:///d:/BitchordWeb/app/src/pageRegistry.tsx).
2. **Prefetching**: [PrefetchNavLink](file:///d:/BitchordWeb/app/src/components/PrefetchLink.tsx) triggers preloading of the route's JS bundle and initial query on mouse hover or keyboard focus.
3. **Suspense Skeletons**: Each route specifies a dedicated skeleton in `pageRegistry.tsx` (e.g. `HomeSkeleton`, `SearchSkeleton`) displayed until the page component chunk resolves.

## How to Make Common Changes

### 1. Add a New Page
1. Create `YourNewPage.tsx` in this directory.
2. In `app/src/pageRegistry.tsx`, add an entry to the `pages` array:
   ```ts
   { path: '/your-path', load: () => import('@/pages/YourNewPage'), skeleton: <PlainSkeleton /> }
   ```
3. Add a navigation link in `app/src/shell/Sidebar.tsx` if it should appear in the menu.

### 2. Modify Search Page Layout
Open [SearchPage.tsx](file:///d:/BitchordWeb/app/src/pages/SearchPage.tsx):
- Search input is styled inside the sticky header at line ~151.
- Top card results are in `TopResult` and `topGrid` (lines 42-60).
- Grouped shelves (Artists, Albums, Songs) are rendered via `shelvesFor(results)` (line 28).

### 3. Customize Album or Playlist Header
Open [AlbumPage.tsx](file:///d:/BitchordWeb/app/src/pages/AlbumPage.tsx) or [PlaylistPage.tsx](file:///d:/BitchordWeb/app/src/pages/PlaylistPage.tsx):
- Both use `usePageTint` to extract the dominant artwork color and tint the background.
- Track lists use the virtualized `TrackList` component.
