# Traffic Blocker

Chrome MV3 extension that blocks unwanted traffic using `declarativeNetRequest` API. Built with Vue 3, TypeScript, and Vite.

## Features

- Block URLs via wildcard patterns (e.g., `*://*.example.com/*`)
- Optional domain filtering (block only from specific initiators)
- Toggle blocking on/off
- Export/Import rules (JSON format)
- Blocked traffic counter

## Installation

### Prerequisites

- Node.js 16+ (recommended: 16.13.1)
- npm 8+ (recommended: 8.1.2)

### Steps

```bash
git clone <repository>
npm install
npm run build
```

### Load Extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `dist/` folder
5. Copy the extension ID for reference

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + production build to `dist/` |
| `npm run preview` | Preview production build locally |

## Export/Import Rules

Rules are stored in JSON format:

```json
{
  "rules": [
    {
      "id": 1,
      "priority": 1,
      "action": { "type": "block" },
      "condition": {
        "urlFilter": "*://*.example.com/*",
        "initiatorDomains": ["tracker.ads.com"]
      }
    }
  ],
  "isEnabled": true
}
```

### Import Notes

- **Replace**: Overwrites all existing rules
- **Merge**: Appends imported rules to existing ones
- Missing fields are auto-filled with defaults (`priority: 1`, `action: block`)
- Invalid rules are skipped with error toast

## Architecture

```
src/
├── main.ts              # Popup entry (Vue app + router)
├── App.vue              # Root component
├── background/          # Service worker
│   └── background.ts    # Handles storage, webRequest, declarativeNetRequest
└── components/
    ├── Dashboard.vue     # Main view (add/remove rules, toggle)
    ├── Settings.vue      # Export/Import rules
    └── Statistics.vue    # Blocked traffic counter
```

### Key Configs

- `vite.config.ts`: Generates manifest from `public/manifest.json` + `package.json`
- `tsconfig.json`: Strict mode, `@/*` alias to `src/*`

### Storage Schema

| Key | Type | Description |
|-----|------|-------------|
| `settings` | `{ blocked: number }` | Blocked request counter |
| `blocker` | `{ rules: Rule[], isEnabled: boolean }` | Active rules and toggle state |

## Chrome Extension API Used

- `chrome.storage.local` — Persist rules and settings
- `chrome.webRequest.onErrorOccurred` — Detect blocked requests
- `chrome.declarativeNetRequest` — Block URLs dynamically

## License

See `LICENSE` file.
