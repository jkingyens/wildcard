# SQLite Collection Manager

A Chrome extension for managing multiple SQLite databases directly in your browser using WebAssembly. Collections are persisted across sessions via Chrome's storage API and can be imported/exported as `.db` files.

## Features

- **Multiple collections** — create and manage any number of named SQLite databases
- **Schema management** — define and update table schemas via a built-in SQL editor
- **Entry listing** — browse row IDs for every table in a collection
- **Import / Export** — load existing `.db` / `.sqlite` files or export collections to disk
- **Checkpoints** — save and restore database snapshots; auto-saved on every write
- **Persistent** — collections survive browser restarts and service worker recycling
- **Offline** — all processing happens locally via WebAssembly; no server required

---

## Project Structure

```
.
├── build.js              # Build script: copies Wasm + JS assets into extension/
├── package.json
├── src/
│   └── sqlite-manager.js # Core SQLiteManager class (shared by build + tests)
├── test/
│   └── test-sqlite.js    # Node.js test suite
└── extension/            # The Chrome extension (load this directory in Chrome)
    ├── manifest.json
    ├── sql-wasm.js        # sql.js loader (copied by build)
    ├── sql-wasm.wasm      # SQLite WebAssembly binary (copied by build)
    ├── background/
    │   └── service-worker.js
    ├── sidebar/
    │   ├── sidebar.html
    │   ├── sidebar.css
    │   └── sidebar.js
    ├── src/
    │   └── sqlite-manager.js  # Copied from src/ by build
    └── icons/
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- Google Chrome (or any Chromium-based browser)

### Install dependencies

```bash
npm install
```

### Build

The build step copies the sql.js WebAssembly files and `sqlite-manager.js` into the `extension/` directory:

```bash
npm run build
```

You must run this at least once before loading the extension in Chrome.

---

## Running Tests

The test suite runs entirely in Node.js — no browser required:

```bash
npm test
```

This exercises all core `SQLiteManager` operations:

- Database initialization
- Table creation and data insertion
- Export to Blob
- Save / restore checkpoints
- Import from Blob
- Collection listing
- File export

---

## Installing as a Chrome Extension

1. Run `npm run build` (see above)
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `extension/` directory from this repository
6. Click the extension icon in the toolbar to open the sidebar

### Using the extension

- **Create a collection** — click ➕ Create Collection and enter a name
- **Import a database** — click 📥 Import Database and select a `.db` / `.sqlite` file
- **View schema & entries** — click on any collection name to open its detail view
- **Edit schema** — click ✏️ Edit in the detail view to define or update `CREATE TABLE` statements
- **Export** — click 📤 Export to save a collection as a `.db` file
- **Delete** — click 🗑️ Delete to permanently remove a collection

---

## Security & Permissions

The extension requests the minimum permissions needed to function. Here is what each permission is used for and why it is safe:

### `storage`

**What it does:** Grants access to `chrome.storage.local`, a sandboxed key-value store private to this extension.

**Why it's needed:** Every collection is serialized as a base64-encoded SQLite binary and saved to `chrome.storage.local` as a checkpoint. This is how collections persist across browser restarts and service worker recycling. No data is ever sent to a remote server.

**Privacy:** Data stored here is only accessible to this extension. It is never shared with websites, other extensions, or any external service.

---

### `sidePanel`

**What it does:** Allows the extension to open and display content in Chrome's native side panel.

**Why it's needed:** The entire UI (collection list, schema editor, entry browser) is rendered in the side panel. Without this permission the extension would have no visible interface.

---

### Content Security Policy: `wasm-unsafe-eval`

```json
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
}
```

**What it does:** Permits the browser to compile and instantiate WebAssembly modules.

**Why it's needed:** SQLite runs entirely in the browser via [sql.js](https://github.com/sql-js/sql.js), which compiles a `.wasm` binary at runtime. Chrome's default extension CSP blocks WebAssembly compilation; `wasm-unsafe-eval` is the standard directive to allow it.

**Why it's safe:** Despite the name, `wasm-unsafe-eval` only permits WebAssembly bytecode compilation — it does **not** enable JavaScript `eval()`. The Wasm binary (`sql-wasm.wasm`) is bundled with the extension and loaded from `'self'` (the extension's own origin), so no remote code is ever fetched or executed.

---

### `web_accessible_resources`: `sql-wasm.wasm`

```json
"web_accessible_resources": [{ "resources": ["sql-wasm.wasm"], "matches": ["<all_urls>"] }]
```

**What it does:** Makes the `.wasm` file fetchable by the extension's own scripts.

**Why it's needed:** The sql.js loader (`sql-wasm.js`) fetches the `.wasm` file via `chrome.runtime.getURL()`. Without this declaration the fetch would be blocked by Chrome's resource isolation policy.

**Why it's safe:** Only the extension's own service worker fetches this file. Listing it as a web-accessible resource does not expose it to arbitrary websites in a meaningful way — websites cannot execute it on your behalf.

---

## Data & Privacy

- **All data stays on your device.** No network requests are made by this extension.
- **No analytics, no telemetry, no third-party scripts.**
- Collections are stored in `chrome.storage.local` which is cleared if you remove the extension.
- You can export any collection to a `.db` file at any time for your own backups.

---

## License

MIT
