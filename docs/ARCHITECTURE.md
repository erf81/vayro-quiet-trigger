# Architecture — Quiet Trigger by VAYRO

Quiet Trigger is structured into cleanly separated components so the **Adobe Photoshop UXP plugin**, the **Windows desktop companion**, the **local loopback bridge**, and the **single-file installer** can be developed, tested, and packaged independently.

---

## 1. Component Overview

```text
Windows User Sign-In (HKCU\...\Run)
        │
        ▼
companion/tray/QuietTriggerHelper.cs  (QuietTriggerHelper.exe — silent WinExe)
  ├── Native Windows System Tray (8-item menu + Settings dialog)
  ├── Win32 RegisterHotKey (Ctrl + Alt + Space; Photoshop foreground guard)
  ├── Launches companion/windows-helper/quiet-trigger-palette.ps1 (WPF floating UI)
  └── Supervises bundled runtime\node.exe running:
        │
        ▼
companion/bridge/bridge-server.js     (127.0.0.1:47821 — loopback only)
  ├── 256-bit constant-time token auth (X-ZAU-Token / ?token=...)
  ├── Atomic ZAU 2.0.0 -> VAYRO Quiet Trigger migration + local UXP pairing
  ├── HTTP endpoints: /health, /catalog, /context, /execute, /theme, /favorite
  └── RFC 6455 WebSocket (fragmented frame reassembly, TCP_NODELAY)
        ▲
        │  ws://localhost:47821?token=<256-bit>
        ▼
photoshop-plugin/                     (Adobe Photoshop UXP Manifest v5, API v2)
  ├── manifest.json                   (Preserved ID: com.zau.photoshop.console)
  ├── index.js                        (Singleton corePromise & uiPromise lifecycle)
  ├── index.html / styles.css         (UXP Yoga-safe Flexbox & CSS custom properties)
  └── src/
      ├── bridge/bridgeClient.js      (Singleton WebSocket client + reconnect guard)
      ├── commands/                   (98 commands across 8 categories)
      ├── core/                       (commandExecutor, contextDetector, eventBus, psEnv)
      ├── search/                     (fuzzy + English + Persian search engine)
      ├── storage/storageManager.js   (PluginData JSON + theme/favorites persistence)
      ├── theme/themeSystem.js        (Shared Aurora Design System schema & 6 presets)
      └── ui/                         (consoleUI, themeStudioUI, settingsUI, icons)
```

---

## 2. Preserved Persistent Identifiers (Upgrade Safety)
To guarantee seamless in-place upgrades from **ZAU Console 2.0.0** to **Quiet Trigger** without duplicate plugins or lost user data:
- **UXP Plugin ID**: `com.zau.photoshop.console` (`photoshop-plugin/manifest.json`)
- **UXP Panel ID**: `zauConsolePanel` (`photoshop-plugin/manifest.json`)
- **UXP State Filename**: `zau-console-state.json` (inside Photoshop `PluginsStorage\PHSP\<ver>\External\com.zau.photoshop.console\PluginData\`)
- **Windows User Data Directory**: `%LOCALAPPDATA%\VAYRO\Quiet Trigger\` (`bridge-session.json`, `theme.json`, `helper-settings.json`), with verified atomic migration & backup from legacy `%LOCALAPPDATA%\ZAU-Console\`.
- **Single-Instance Mutex**: `Local\VAYRO_QuietTrigger_Helper_v1` + named IPC events for graceful `--stop`, `--open`, `--studio`, and `--settings` signaling.

---

## 3. Packaging Architecture
- **Photoshop-Only `.ccx`** (`scripts/build/build-ccx.js`): Packages ONLY `photoshop-plugin/` as the ZIP root plus `assets/icons/` under `assets/icons/` (excludes README, docs, installer, companion helper, tests, and `node_modules`).
- **Complete Windows Installer** (`installer/quiet-trigger.iss` + `scripts/release/build-installer.ps1`): Bundles `QuietTriggerHelper.exe`, portable `runtime\node.exe`, `companion/bridge/bridge-server.js`, `photoshop-plugin/src/theme/themeSystem.js`, `companion/windows-helper/quiet-trigger-palette.ps1`, the `.ccx`, official Adobe UPIA install/uninstall scripts, brand icons, and `THIRD_PARTY_NOTICES.txt`.
