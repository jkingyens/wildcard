# wildcardCX (✳️)

wildcardCX is a powerful, AI-augmented SQLite workspace for Chrome. It combines traditional database management with an AI-native execution environment using WebAssembly (Wasm) and the Zig programming language.

## 🚀 Key Features

- **AI-Generated Wasm Agents** — Describe the logic you want in natural language, and Gemini will generate optimized Zig code, compile it to Wasm, and execute it directly in your browser.
- **SQLite Collections** — Create, manage, and persist multiple namesacked SQLite databases using [sql.js](https://github.com/sql-js/sql.js).
- **WIT Bridging** — Type-safe communication between Wasm modules and Chrome host APIs (like Bookmarks) using WebAssembly Interface Type (WIT) definitions.
- **Project Overlays (Packets)** — Group URLs and Wasm modules into logical "Packets" that can be restored and executed in a single click.
- **Entry Inspection** — Browse schemas and click individual row IDs to see full entry previews.
- **Full Privacy** — All processing happens locally. No data ever leaves your device (except for the AI prompts sent to Gemini).

---

## 🛠 Project Architecture

```
.
├── extension/            # The Chrome extension (load this directory)
│   ├── manifest.json     # Extension configuration
│   ├── background/       # Service worker (handles SQL management & Wasm execution)
│   ├── sidebar/          # UI (Sidebar, CSS, and UI controllers)
│   │   ├── zig-compiler.js # Browser-based Zig compiler bridge
│   │   └── sidebar.js      # Main UI logic and Gemini integration
│   ├── src/
│   │   └── sqlite-manager.js # Shared SQLite management logic
│   └── vendor/           # Third-party dependencies
├── src/                  # Source of shared logic (sqlite-manager)
└── test/                 # Node.js test suite for SQLiteManager
```

---

## ⚡️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- Google Chrome

### Installation
1. Clone the repository.
2. Run `npm install`.
3. Run `npm run build` to sync shared logic into the extension folder.
4. Open `chrome://extensions/` in Chrome.
5. Enable **Developer mode**.
6. Click **Load unpacked** and select the `extension/` directory.

### Initial Setup
1. Open the **wildcardCX** sidebar from the extension bar.
2. Click the ⚙️ (Settings) icon.
3. Enter your **Gemini API Key**.
4. Click **Fetch Models** and select a model (e.g., `gemini-1.5-pro`).
5. Click **Save Settings**.

---

## 🏗 Developing Wasm Agents

wildcardCX uses an AI-First development flow:

1. Click **✨ Generate WASM** in a Packet view.
2. Describe your goal (e.g., "Find all bookmarks with 'coding' in the title and extract their URLs").
3. wildcardCX fetches your current database schema and WIT definitions to provide the AI with full context.
4. The AI generates Zig code which is compiled in-browser and executed.
5. Results and logs are displayed in an interactive modal.

---

## 🔒 Security & Privacy

- **Local-First**: Your databases are stored in `chrome.storage.local`. They are never synced to a cloud unless you manually export them.
- **Wasm Sandbox**: All generated code runs in a isolated WebAssembly environment via a Service Worker.
- **CSP**: The extension uses a strict Content Security Policy (`wasm-unsafe-eval`) to allow local Wasm compilation while preventing remote script execution.

---

## License
MIT
