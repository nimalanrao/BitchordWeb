# Shared Bridge Protocol (`shared/`)

The `@bitchord/shared` workspace package defines the strongly-typed communication protocol and client used by both the Web Application (`app/`) and the Browser Extension (`extension/`).

## Directory Structure

```
shared/
└── src/
    ├── index.ts
    └── bridge/
        ├── protocol.ts   # RPC message types, event payloads, and API signatures
        ├── client.ts     # Client library running in web page context
        └── index.ts
```

## How the Bridge Operates

```mermaid
sequenceDiagram
    participant WebApp as Web App (localhost:5173)
    participant Relay as Content Script (Firefox)
    participant Ext as Extension Background Worker

    WebApp->>Ext: Direct externally_connectable (Chrome / Brave / Edge)
    WebApp->>Relay: postMessage (Firefox)
    Relay->>Ext: browser.runtime.sendMessage (Firefox)
    Ext-->>WebApp: Response / Stream Payload
```

## Key Message Types in `protocol.ts`

- **Handshake**: `ping`, `version`, `status`
- **YouTube Auth**: `yt:getSession`, `yt:getCookies`
- **Spotify Auth**: `spotify:authorize`, `spotify:getToken`
- **Discord IPC**: `discord:setActivity`, `discord:clearActivity`
- **Network Proxying**: `fetch:request` (for requests requiring bypass of CORS or specific cookie headers)
