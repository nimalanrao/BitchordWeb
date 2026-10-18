# Utilities & Helpers (`app/src/lib`)

This directory contains utility functions for image sizing, color extraction, backdrop mesh generation, platform detection, and text parsing.

## Directory Structure & Files

| File | Responsibility |
|---|---|
| [artwork.ts](file:///d:/BitchordWeb/app/src/lib/artwork.ts) | Artwork resolution resizer (`sizedArtwork(url, size)`): modifies YouTube/GoogleVideo thumbnail parameters (`=w600-h600-l90-rj`) to fetch crisp images matching requested pixel dimensions. |
| [artworkColor.ts](file:///d:/BitchordWeb/app/src/lib/artworkColor.ts) | Dominant color extractor: samples pixels from an image to determine primary hue and whether light or dark text contrast is required. |
| [meshPalette.ts](file:///d:/BitchordWeb/app/src/lib/meshPalette.ts) | Generates harmonious 4-color gradient palettes from the artwork for the Full-Screen Player's fluid background mesh. |
| [usePageTint.ts](file:///d:/BitchordWeb/app/src/lib/usePageTint.ts) | Dynamically tints the `#scrollable-page` container background (`--page-tint`) on Album and Playlist pages based on the artwork. |
| [artistCredits.ts](file:///d:/BitchordWeb/app/src/lib/artistCredits.ts) | Parses credit strings (e.g. `"Daddy Yankee feat. Snow"`, `"Drake & 21 Savage"`) to render individual clickable artist navigation links. |
| [platform.ts](file:///d:/BitchordWeb/app/src/lib/platform.ts) | Detects mobile vs desktop environments, browser engine, and touch support. |
| [queryClient.ts](file:///d:/BitchordWeb/app/src/lib/queryClient.ts) | Configures the shared TanStack `QueryClient` instance with default retry and stale-time policies. |
