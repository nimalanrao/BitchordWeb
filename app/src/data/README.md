# Data Layer & Queries (`app/src/data`)

This directory houses all data fetching, TanStack React Query hooks, domain models, and external music API integrations (YouTube Music, Spotify, Apple Music).

## Directory Structure

```
data/
├── music/               # Core YouTube Music data queries and models
│   ├── queries.ts       # TanStack Query hooks (Home, Search, Albums, Artists, Playlists)
│   ├── types.ts         # TypeScript definitions for MusicItem, Shelf, Track, Album, Artist
│   └── library.ts       # Library section schemas and navigation definitions
├── spotify/             # Spotify Web API integration
│   ├── queries.ts       # React Query hooks for fetching user Spotify playlists & tracks
│   └── client.ts        # Authenticated bridge client for Spotify endpoints
├── apple/               # Apple Music assets
│   └── motionArt.ts     # Resolution for Apple's animated motion artwork video covers
└── match/               # Cross-platform music matching
    └── matcher.ts       # Resolves Spotify/Apple tracks to playable YouTube video IDs
```

## Key Query Hooks in `music/queries.ts`

| Hook | Description |
|---|---|
| `useHomeFeed()` | Infinite-scrolling home shelves (Listen Again, Similar To, Quick Picks). |
| `useNewReleases()` | New singles, albums, and featured editorial music. |
| `useSearch(query)` | Live search query returning grouped results and category chips. |
| `useAlbum(id)` | Fetches album details, release year, artist, and full tracklist. |
| `useArtist(id)` | Fetches artist hero art, top tracks, albums, singles, and bio. |
| `usePlaylist(id)` | Infinite query loading playlist items. |
| `useLibrary(section)` | Fetches user's saved items for a library section (`recent`, `artists`, `albums`, `songs`, `made-for-you`, `playlists`). |
| `useSignedIn()` | Reactive status of YouTube Music account sign-in. |
| `prefetchPageData(url)` | Warms React Query cache ahead of time on link hover. |

## How to Make Common Changes

### 1. Add a New Data Query
Open [queries.ts](file:///d:/BitchordWeb/app/src/data/music/queries.ts):
- Define your fetcher function interacting with the extension bridge or Innertube client.
- Wrap it with `useQuery()` or `useInfiniteQuery()` providing a unique query key:
  ```ts
  export function useMyNewQuery(param: string) {
    return useQuery({
      queryKey: ['my-new-data', param],
      queryFn: () => fetchMyData(param),
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
  }
  ```

### 2. Extend Domain Types
Open [types.ts](file:///d:/BitchordWeb/app/src/data/music/types.ts):
- Update `MusicItem`, `Track`, `Album`, or `Shelf` definitions with any new metadata fields.
