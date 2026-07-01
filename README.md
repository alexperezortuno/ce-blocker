# Traffic Blocker

Chrome MV3 extension that blocks unwanted traffic using `declarativeNetRequest` API. Built with Vue 3, TypeScript, and Vite.

## Features

- Block URLs via wildcard patterns (e.g., `*://*.example.com/*`)
- Optional domain filtering (block only from specific initiators or exclude domains)
- Toggle blocking on/off with visual feedback
- **Preview and edit** rules in a modal window
- **Search/filter** rules by URL pattern or domain
- **Move rules up/down** to change priority order
- **Duplicate detection** - warns when adding existing rules
- **Undo** deleted rules (5 second window)
- **Clear all** rules with one click
- Export/Import rules (JSON format) with merge or replace options
- **Import from URL** - fetch blocklists directly from online sources
- **Preset blocklists** - one-click loads for Advertising, Trackers, Social Media, Malware
- **Dark mode** toggle
- Blocked traffic counter
- Reset statistics

## Installation

### Prerequisites

- Node.js 18+ (tested with 18.x, 20.x, 22.x)
- npm 8+

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
| `npm run package` | Build + create zip for Chrome Web Store (`build/traffic-blocker-{version}.zip`) |
| `npm run clean` | Remove `dist/` and `build/` folders |

## Usage

### Adding Rules

1. Enter a URL pattern (e.g., `*://*.example.com/*`) or wildcard (e.g., `*://api.mercadolibre.com/*`)
2. Optionally enter initiator domains to block only requests FROM those domains
3. Click **Add rule**

### Managing Rules

- **Search** rules using the search bar (appears when 2+ rules exist)
- **Click** on a rule row to **view/edit** its details in a modal
- **Move up/down** buttons to reorder rules (affects matching priority)
- **Delete** a rule with the X button - use the **Undo** toast to restore
- **Toggle** the switch to enable/disable all blocking
- **Clear All** (trash icon) removes all rules and disables blocker

### Export/Import

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

**Import options:**
- **Replace**: Overwrites all existing rules
- **Merge**: Appends imported rules to existing ones

**Auto-fix:** Missing fields are filled with defaults. Import handles both array and object formats for backwards compatibility.

### Preset Blocklists

Available in Settings:
- **Advertising** - Common ad networks (DoubleClick, Google Ads, Facebook Ads, etc.)
- **Trackers** - Analytics and tracking (Google Analytics, Hotjar, Mixpanel, etc.)
- **Social Media** - Social widgets (Facebook, Twitter, LinkedIn)
- **Malware** - Known malicious domains

### Dark Mode

Toggle dark mode in Settings. Preference is saved and persists across sessions.

## Architecture

```
src/
├── main.ts              # Popup entry (Vue app + router)
├── App.vue              # Root component (dark mode)
├── background/          # Service worker
│   └── background.ts    # Handles storage, webRequest, declarativeNetRequest
└── components/
    ├── Dashboard.vue    # Main view (add/edit/delete/search/move rules, toggle)
    ├── Settings.vue     # Dark mode, export/import, presets
    └── Statistics.vue   # Blocked traffic counter + reset
```

### Key Configs

- `vite.config.ts`: Generates manifest from `public/manifest.json` + `package.json`
- `tsconfig.json`: Strict mode, `@/*` alias to `src/*`

### Storage Schema

| Key | Type | Description |
|-----|------|-------------|
| `settings` | `{ blocked: number, darkMode?: boolean }` | Blocked counter + dark mode preference |
| `blocker` | `{ rules: Rule[], isEnabled: boolean }` | Active rules and toggle state |

## Chrome Extension APIs

| API | Purpose |
|-----|---------|
| `chrome.storage.local` | Persist rules and settings |
| `chrome.storage.onChanged` | Listen for storage changes |
| `chrome.webRequest.onErrorOccurred` | Detect blocked requests (increment counter) |
| `chrome.declarativeNetRequest` | Block URLs dynamically |
| `chrome.runtime.sendMessage` | Communicate between popup and background |

## Chrome Web Store Publishing

```bash
npm run package
```

This creates `build/traffic-blocker-{version}.zip` ready for upload.

## License

See `LICENSE` file.
