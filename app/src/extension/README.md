# Extension Bridge Hooks (`app/src/extension`)

This directory contains the React hooks that communicate with the BitChord companion browser extension through the shared bridge protocol.

## Directory Structure & Files

| File | Purpose |
|---|---|
| [bridge.ts](file:///d:/BitchordWeb/app/src/extension/bridge.ts) | Initializes and exports the singleton `BridgeClient` connecting to the extension. |
| [useExtension.ts](file:///d:/BitchordWeb/app/src/extension/useExtension.ts) | Detects extension presence, connection state (`connected`, `connecting`, `missing`), and transport mechanism (Direct `externally_connectable` on Chrome, Content Script Relay on Firefox). |
| [useExtensionUpdate.ts](file:///d:/BitchordWeb/app/src/extension/useExtensionUpdate.ts) | Checks for extension updates by comparing installed version against `app/public/downloads/extension.json`. Triggers sidebar "Update" badge. |
| [useYtAuth.ts](file:///d:/BitchordWeb/app/src/extension/useYtAuth.ts) | Accesses the user's YouTube Music session credentials and cookies to allow authenticated private library browsing. |
| [useSpotifyAuth.ts](file:///d:/BitchordWeb/app/src/extension/useSpotifyAuth.ts) | Coordinates Spotify Web API tokens and user authentication. |
| [useDiscord.ts](file:///d:/BitchordWeb/app/src/extension/useDiscord.ts) | Sends Rich Presence payloads to local Discord client via native extension IPC. |
| [useHostAccess.ts](file:///d:/BitchordWeb/app/src/extension/useHostAccess.ts) | Manages optional origin permissions (e.g. `*.googlevideo.com`, `music.youtube.com`). |

## Why the Extension is Needed

Modern browsers enforce CORS and cookie isolation that prevent pure web pages from:
1. Reading the user's signed-in YouTube Music cookies.
2. Connecting to local Discord RPC sockets (`127.0.0.1:6463`).
3. Fetching raw audio chunk streams without referrer/origin checks.

The extension bridges these requests while keeping private keys and cookies safe.
