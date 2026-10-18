# Browser Extension (`extension/`)

The BitChord companion browser extension, built using [WXT](https://wxt.dev/) targeting Manifest V3 for Chromium (Chrome, Brave, Edge) and Firefox.

## Directory Structure

```
extension/
├── dev-key/               # Pinned extension private key ensuring constant extension ID in dev
├── entrypoints/
│   ├── background.ts      # Main MV3 service worker handling RPC calls from the web app
│   ├── relay.content.ts   # Content script bridge for Firefox (where externally_connectable is unsupported)
│   ├── popup/             # Extension toolbar popup interface
│   └── discord/           # Native Discord IPC socket client
├── lib/                   # Extension utilities, cookie readers, DNR rules
├── public/                # Extension icons and assets
├── wxt.config.ts          # WXT multi-target build configuration
└── package.json
```

## Pinned Extension ID

In development, the extension's ID is pinned to:
`pkddffeebcmhhanjcigilehaeonkkfih`
via the manifest key in `dev-key/`. This allows the Vite web app (`app/vite.config.ts`) to hardcode and trust this exact ID without needing manual configuration.

## Development & Build Commands

```bash
# Build both Chrome and Firefox targets
pnpm --filter @bitchord/extension build

# Development watch mode for Chrome
pnpm --filter @bitchord/extension dev

# Development watch mode for Firefox
pnpm --filter @bitchord/extension dev:firefox

# Package zip files into app/public/downloads/
pnpm --filter @bitchord/extension package
```

## How to Load in Browsers

- **Chrome / Brave / Edge**: Go to `chrome://extensions` → enable **Developer mode** → click **Load unpacked** → select `extension/.output/chrome-mv3`.
- **Firefox**: Go to `about:debugging#/runtime/this-firefox` → click **Load Temporary Add-on** → select `extension/.output/firefox-mv3/manifest.json`.
