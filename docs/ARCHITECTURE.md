# ZAU Console — Technical Architecture

## 1. Platform & Manifest
- **Platform**: Adobe Photoshop UXP (Manifest v5, Photoshop API v2, `minVersion: 24.0.0`)
- **Lifecycle**: `host.data.loadEvent: "startup"` initializes the headless core + optional bridge via a shared singleton `corePromise`, while the panel DOM mounts lazily via `uiPromise` on `panels.zauConsolePanel.create/show`. This prevents duplicate `BridgeClient` instances or duplicate DOM listeners.
- **Permissions**: `localFileSystem: "plugin"` + loopback-only `network.domains` (`ws://localhost:47821`, `http://localhost:47821`).

## 2. Module Map
- `index.js` — Singleton core & lazy panel UI lifecycle manager (`entrypoints.setup`).
- `src/core/psEnv.js` — Safe `require('photoshop')` / `require('uxp')` wrapper + test mock seam.
- `src/core/contextDetector.js` — Event-driven Photoshop document, layer, lock, and selection inspector (`action.addNotificationListener`, zero polling).
- `src/core/commandExecutor.js` — Pre-flight guards, destructive confirmation, inline input modal, `core.executeAsModal()`, `batchPlay`, `core.performMenuCommand()`, and dynamic `performMenuByTitle()` (`menuBarInfo` lookup).
- `src/commands/` — 8 UI-independent domain modules (`tools`, `filters`, `adjustments`, `layers`, `selections`, `document`, `view`, `export`) registered via `CommandRegistry` (98 commands).
- `src/search/` — Pre-indexed fuzzy, partial, multi-token, English + Persian alias search engine with Favorites/Recents ranking.
- `src/storage/storageManager.js` — UTF-8 BOM-safe JSON persistence to UXP `localFileSystem.getDataFolder()` with `localStorage` fallback.
- `src/ui/` — UXP Yoga Flexbox `ConsoleUI`, `SettingsUI`, and crisp inline SVG `ICONS`.
- `src/bridge/bridgeClient.js` — Optional loopback WebSocket client with duplicate-socket guard and lightweight `contextUpdate` frames.
- `hotkey-helper/` — Zero-dependency Node.js RFC 6455 loopback server (`bridge-server.js`, fragmented frame reassembly, `setNoDelay`, 256-bit token auth) + native Windows Win32/WPF hotkey overlay (`zau-palette.ps1`, single-instance Mutex, `-Once` mode) + optional AutoHotkey v2 script (`zau-hotkey.ahk`).

## 3. Extensibility
`CommandRegistry.register()` / `.unregister()` are decoupled from the UI, providing a clean path for future milestones (Custom Photoshop Actions, user-defined macros/aliases, Snapshot Gallery).
