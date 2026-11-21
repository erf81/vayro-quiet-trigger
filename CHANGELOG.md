# Changelog — ZAU Console for Adobe Photoshop

All notable changes to **Quiet Trigger by VAYRO** (formerly *ZAU Console*) are documented in this file.

## [2.1.0] — 2026-11-21 (VAYRO — Quiet Trigger Product Rebranding & Windows Installer)

### Product Identity & Brand System
- Rebranded user-facing product identity from *ZAU Console* to **Quiet Trigger by VAYRO** (*"Less searching. More creating."*).
- Created original VAYRO geometric mark (`V` chevron + quiet-trigger focal dot), multi-resolution Windows `.ico` (`16..256px`), Photoshop UXP `@1x`/`@2x` dark & light manifest icons, Inno Setup wizard bitmaps, scalable SVG lockups, and `1280×640` GitHub social preview artwork (`assets/brand/`).
- Rebranded UXP docked panel (`Quiet Trigger · BY VAYRO`), WPF floating palette, and **VAYRO Theme Studio** while preserving all 6 Aurora presets, custom HEX editor, gradient/glow/surface/opacity/radius/density controls, and live UXP↔WPF sync.
- **Preserved internal UXP identity**: kept `manifest.json -> id: "com.zau.photoshop.console"` and panel ID `"zauConsolePanel"` so existing ZAU Console 2.0.0 users upgrade in-place with zero duplicate plugin and zero lost `PluginData`.

### Single-File Windows Installer & Silent Background Helper
- Built native silent Windows WinExe (`installer/src/QuietTriggerHelper.cs` → `QuietTriggerHelper.exe`, `42.5 KB`, zero console windows):
  - Single-instance Mutex (`Local\VAYRO_QuietTrigger_Helper_v1`) + graceful `--stop` / `--open` / `--studio` / `--settings` IPC events.
  - Supervises bundled portable `runtime\node.exe` running `bridge-server.js --silent` with automatic recovery — **zero global Node.js or AutoHotkey requirement**.
  - Native Windows System Tray icon & complete 8-item menu (`Open Quiet Trigger`, `Theme Studio`, `Settings`, `Pause Hotkey`, `Resume Hotkey`, `Start Photoshop`, `Check for Updates`, `Exit Quiet Trigger`).
  - Built-in Settings dialog for hotkey selection (`Ctrl+Alt+Space` default, `Ctrl+Shift+Space`, `Ctrl+Space` with native Photoshop Zoom warning) and per-user Windows Startup toggle.
- Built single-file Inno Setup 6 installer (`installer/quiet-trigger.iss` → `dist/VAYRO-Quiet-Trigger-Setup-2.1.0-x64.exe`, `23.78 MB`) + standalone Photoshop-only `.ccx` (`dist/VAYRO-Quiet-Trigger-Photoshop-2.1.0.ccx`, `74.3 KB`).
- Added official Adobe `UnifiedPluginInstallerAgent.exe` install/upgrade script (`installer/scripts/install-uxp-plugin.ps1`) with pre-install `PluginData` JSON backup & atomic restore, plus clean uninstaller (`uninstall-uxp-plugin.ps1`) preserving user settings by default.
- Added safe atomic migration from `%LOCALAPPDATA%\ZAU-Console\` → `%LOCALAPPDATA%\VAYRO\Quiet Trigger\` and secure local first-run pairing into user-private Photoshop UXP `PluginData` (zero credentials logged or embedded).

### Licensing, Governance & CI Preparation
- Adopted **Apache License, Version 2.0** (`Copyright 2026 erf81`, `SPDX-License-Identifier: Apache-2.0`) for all original source code (`LICENSE`, `NOTICE`, `package.json`, and SPDX headers across 33 original source files).
- Added [TRADEMARKS.md](TRADEMARKS.md) and root [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt) separating original Apache-2.0 code from **VAYRO** / **Quiet Trigger** brand names and bundled third-party components (Node.js v24.20.0 MIT, Inno Setup 6.7.3).
- Added minimal-permission GitHub Actions CI workflows (`.github/workflows/ci.yml` for automated tests, license/metadata checks, CCX packaging & Gitleaks full-history secret scanning; `.github/workflows/dependency-review.yml`) plus `.gitleaks.toml` allowing only the documented synthetic test fixture.

### Verification (Windows 10 x64 + Adobe Photoshop 2025 v26.8.1)
- **28 / 28** automated tests passing (`node --test tests/*.test.js`).
- **Stage A (Upgrade from ZAU Console 2.0.0)**: Verified zero duplicate plugin (`Enabled Quiet Trigger 2.1.0`), exact token preservation, `migration-backup-v2.0.0`, 4 Favorites preserved, HKCU Run startup, Start Menu shortcuts, bundled `runtime\node.exe`, and single-instance Mutex.
- **Stage B (Live Photoshop 2025 QA)**: Verified live connection (`commandCount=98`), all 6 presets + custom Red/Orange & Blue/Pink live sync, real command execution (`layer.new`, `tool.brush`, `adjust.curves`, `view.actualPixels`), restart persistence, and branded screenshots.
- **Stage C (Uninstall)**: Verified helper & bundled bridge stopped, HKCU startup removed, app files removed, user data preserved by default.
- **Stage D (Clean First-Time Install)**: Verified 4.6s non-blocking silent install, fresh 256-bit token generation, automatic local UXP pairing, silent helper + bundled `runtime\node.exe`, and `Enabled Quiet Trigger 2.1.0`.

## [2.0.0] — 2026-11-21 (ZAU Aurora Design System & Theme Studio)

### Added & Redesigned
- **ZAU Aurora Design System**:
  - Redesigned the **Windows WPF floating palette** (`hotkey-helper/zau-palette.ps1`) to a frosted dark-navy ~`780×680` centered floating window with luminous multi-stop gradient border, ambient glow, compact ZAU monogram header with Pin/Always-on-Top + Theme Studio gear + Close controls, prominent `"Search commands, tools, effects..."` bar with embedded Persian alias support, compact `Favorites | Recent` + dark `All Categories` dropdown nav, spacious monochrome vector icon tile rows, real registered shortcuts only, interactive Favorite stars (`/favorite`), and live active Photoshop document footer (`/context`).
  - Redesigned the **Photoshop UXP docked panel** (`index.html`, `styles.css`, `src/ui/consoleUI.js`, `src/ui/icons.js`) to match ZAU Aurora using 100% UXP Yoga-safe Flexbox and live CSS custom properties.
- **ZAU Theme Studio (`src/theme/themeSystem.js`, `src/ui/themeStudioUI.js`, `src/ui/settingsUI.js`, WPF Theme Studio)**:
  - 6 built-in presets with exact palettes: **Aurora**, **Ember**, **Crimson**, **Arctic**, **Emerald**, and **Monochrome**.
  - 8-token validated `#RRGGBB` / `#RGB` HEX editor + clickable quick swatches (zero `<input type="color">` in UXP).
  - Gradient customization (`solid` / `two` / `three` × `horizontal` / `diagonal` / `vertical`), Glow Intensity (`off` / `low` / `medium` / `high`), Surface Style (`frosted` / `translucent` / `solid` / `flat`), Floating Window Opacity (`0.72–1.00`), Corner Radius (`12` / `16` / `20` / `24`), UI Density (`compact` / `comfortable` / `spacious`), and Appearance (`dark` / `light` / `auto`).
  - Live miniature preview, up to 12 Saved Custom Theme chips, `Apply`, `Save Custom`, `Reset` (preserving Favorites/Recents/Bridge settings), and `Cancel` (cleanly restoring previous theme).
- **Authenticated Bidirectional Theme Sync**:
  - Added `GET /theme`, `POST /theme`, and `POST /favorite` to `hotkey-helper/bridge-server.js` with persistent token-free `%LOCALAPPDATA%\ZAU-Console\zau-theme.json` storage and real-time `{ type: "themeUpdate" }` push to Photoshop UXP (never triggers command execution, never stores `bridgeToken` in theme data).
  - Updated `src/storage/storageManager.js` and `src/bridge/bridgeClient.js` to persist and synchronize `auroraTheme` and `savedCustomThemes` seamlessly across restarts.
- **Verification & Release**:
  - Expanded automated test suite to **27 / 27 PASS** (`tests/themeSystem.test.js`, expanded `storageManager.test.js` & `bridgeServer.test.js`).
  - Verified live inside **Adobe Photoshop 2025 v26.8.1** + Windows WPF across all 6 presets, 5 custom color combinations, live UXP↔WPF sync without Photoshop restart, real Photoshop command execution (`layer.new`, `tool.brush`, `adjust.curves`), and restart persistence.
  - Packaged and installed `dist/zau-photoshop-console.ccx` v2.0.0 via Adobe's official `UnifiedPluginInstallerAgent.exe`.

## [1.0.0] — 2026-11-21 (Production Release)

### Verified Live in Adobe Photoshop 2025 v26.8.1 (Windows 10 64-bit)
- **Plugin Core & UXP Manifest v5 (Photoshop API v2)**:
  - Implemented `loadEvent: "startup"` background initialization with singleton `corePromise` & `uiPromise` guards so `plugin.create()` and `panel.create()` never spawn duplicate `BridgeClient` instances or WebSocket connections.
  - Added explicit `.js` module extensions on all relative `require()` calls for strict Adobe UXP CommonJS loader compatibility.
  - Added `@1x` and `@2x` manifest PNG icons with explicit `"species": ["chrome"]` / `["pluginList"]`, eliminating all Photoshop UXP startup warnings.
  - Fixed `uxp.host.version` detection (`PS=26.8.1`) and UTF-8 BOM stripping in `StorageManager`.
- **98-Command Registry & Live Photoshop 2025 Fixes**:
  - Fixed `tool.objectSelection` to Photoshop's verified Action Manager class `magicLassoTool`.
  - Fixed `layer.toggleLock` to use Photoshop UXP API v2 `layer.allLocked`.
  - Upgraded `layer.rename` to an inline ZAU Console input modal using DOM API v2 `layer.name = nextName`.
  - Updated `view.toggleGuides` (`3536`), `doc.new` (`10`), `doc.imageSize` (`1030`), `doc.canvasSize` (`1031`), `doc.newGuideLayout` (`5614`), `selection.feather` (`1036`), `selection.smooth` (`1108`), `selection.expand` (`1109`), `selection.contract` (`1110`), `filter.blurGalleryField` (`2225`), `export.saveACopy` (`33`), `export.exportAs` / `export.quickJpeg` (`3443`), `export.quickPng` (`3444`), and `export.selectedLayers` (`3447`) to Photoshop 2025's verified built-in menu command IDs via `core.performMenuCommand`.
  - Added dynamic `performMenuByTitle()` resolution in `commandExecutor.js` for `filter.reduceNoise` (verified live opening `'Reduce Noise'` dialog `817×629`).
- **UXP-Native UI Polish**:
  - Replaced CSS Grid and `inset` with 100% UXP Yoga-compatible Flexbox layout and explicit positioning.
  - Replaced native `<button>` elements on custom pills/stars/icons with `role="button"` elements for crisp native dark-graphite appearance.
  - Added full 4-theme Photoshop adaptation (`darkest`, `dark`, `light`, `lightest`), wrapping category pills (no horizontal scrollbar), gold favorite stars, green bridge indicator dot, and unclipped footer status.
- **Windows Global Hotkey Helper & Local Loopback Bridge**:
  - Updated `manifest.json` and `bridgeClient.js` to use `ws://localhost:47821` (required by UXP Manifest v5's hostname validator) while `bridge-server.js` remains strictly bound to `127.0.0.1`.
  - Added RFC 6455 fragmented WebSocket frame reassembly, `socket.setNoDelay(true)`, lightweight `contextUpdate` packets, and stable user-only session token persistence in `%LOCALAPPDATA%\ZAU-Console\bridge-session.json`.
  - Added single-instance Windows Mutex duplicate-helper prevention, `-Once` mode for `zau-hotkey.ahk`, and Favorites/Recents/fuzzy scoring in `zau-palette.ps1`.
- **Packaging & Verification**:
  - 21 / 21 automated tests passing (`node --test tests/*.test.js`).
  - 92 / 98 commands live-verified in Adobe Photoshop 2025 v26.8.1 (67 direct state-verified + 25 native dialog verified; 4 full-screen GPU workspaces and 2 cloud/AI Sensei commands documented transparently).
  - Packaged cleanly into `dist/zau-photoshop-console.ccx` and verified installed & enabled via Adobe's official `UnifiedPluginInstallerAgent.exe`.
