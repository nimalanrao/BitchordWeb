# Skeleton Loading States (`app/src/skeletons`)

This directory houses the shimmer loading skeletons matching the exact geometry of real pages, eliminating layout shifts (CLS) while content chunks and data queries resolve.

## Directory Structure & Files

| File | Purpose |
|---|---|
| [PageSkeletons.tsx](file:///d:/BitchordWeb/app/src/skeletons/PageSkeletons.tsx) | Page-level Suspense fallbacks registered in `pageRegistry.tsx`: `HomeSkeleton`, `NewSkeleton`, `SearchSkeleton`, `AlbumSkeleton`, `ArtistSkeleton`, `PlaylistSkeleton`, and `PlainSkeleton`. |
| [ShelfSkeleton.tsx](file:///d:/BitchordWeb/app/src/skeletons/ShelfSkeleton.tsx) | Skeleton mimicking horizontal shelves with animated shimmer effect across cards. |
| [DetailSkeleton.tsx](file:///d:/BitchordWeb/app/src/skeletons/DetailSkeleton.tsx) | Skeleton for album, playlist, and artist detail headers and initial track rows. |
