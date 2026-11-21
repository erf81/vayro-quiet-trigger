# Quiet Trigger 2.1.0 by VAYRO — Final Verification & Test Report

**Date**: 2026-11-21
**Product**: **Quiet Trigger by VAYRO** (`2.1.0`)
**Verified Environment**:
- **OS**: Microsoft Windows 10 Enterprise 64-bit (`10.0.19043`)
- **Host Application**: **Adobe Photoshop 2025 v26.8.1** (64-bit)
- **Official Adobe Installer**: `UnifiedPluginInstallerAgent.exe` (UPIA)
- **Installer Compiler**: Inno Setup 6.7.3 (per-user install, LZMA2/max; open-source `license.txt` permits redistribution including commercial applications; maintainers request a paid commercial license for commercial/business use — compliant for free open-source distribution)
- **License**: Apache License 2.0 (`Copyright 2026 erf81`, `SPDX-License-Identifier: Apache-2.0`, see `LICENSE`, `NOTICE`, `TRADEMARKS.md`, `THIRD_PARTY_NOTICES.txt`)
- **Runtime**: Bundled portable Node.js `v24.20.0` (`runtime\node.exe`), .NET Framework 4.x (`QuietTriggerHelper.exe`), Windows PowerShell 5.1 / WPF

---

## 1. Automated Unit & Integration Test Suite (`node --test tests/*.test.js`)

**Result: 28 / 28 PASSED (0 failed, ~140 ms)**

| Suite | Passed | Coverage |
|---|---|---|
| `tests/themeSystem.test.js` | 4 / 4 | All 6 Aurora presets exact hex palettes, `#RGB`/`#RRGGBB` validation, `sanitizeTheme()` clamping & credential stripping, custom color gradients & CSS vars. |
| `tests/storageManager.test.js` | 2 / 2 | Favorites/Recents/Settings reload persistence + Aurora & custom theme persistence/reset without losing Favorites, Recents, or `bridgeToken`. |
| `tests/bridgeServer.test.js` | 5 / 5 | Strict `127.0.0.1` loopback binding, 401 unauthorized rejection, WebSocket `/execute` & fragmented frame reassembly, authenticated bidirectional `/theme` sync (zero command execution), **atomic ZAU 2.0.0 → VAYRO 2.1.0 data migration + secure local Photoshop `PluginData` pairing**. |
| `tests/commandRegistry.test.js` | 2 / 2 | All 98 commands across 8 categories validated with unique IDs and real handlers. |
| `tests/searchEngine.test.js` | 10 / 10 | Exact, prefix, fuzzy (`gblr`), alias (`usm`, `crv`), keyword, Persian aliases (`بلور`, `ماسک`, `کراپ`), Favorites/Recents boost, category filters. |
| `tests/commandExecutor.test.js` | 5 / 5 | No open document guard, locked layer guard, Smart Object vs. Text layer validation, `core.executeAsModal()` + `batchPlay`, destructive confirmation & cancel. |

---

## 2. Live Windows 10 + Adobe Photoshop 2025 v26.8.1 End-to-End Verification

### Stage A — Live Upgrade from Installed `ZAU Console 2.0.0` → `Quiet Trigger 2.1.0` (**PASS**)
- Pre-upgrade state confirmed: `ZAU Console 2.0.0` installed in UPIA, 64-hex legacy session token in `%LOCALAPPDATA%\ZAU-Console\bridge-session.json`, 4 Favorites in Photoshop `PluginData`.
- Executed `dist\VAYRO-Quiet-Trigger-Setup-2.1.0-x64.exe /VERYSILENT /NORESTART`.
- Verified:
  - All 7 core installed files present in `%LOCALAPPDATA%\Programs\VAYRO\Quiet Trigger\` (`MISSING_FILES=0`).
  - Official Adobe UPIA backed up `PluginData`, removed legacy `ZAU Console`, installed `VAYRO-Quiet-Trigger-Photoshop-2.1.0.ccx`, restored `PluginData`, and verified `Enabled  Quiet Trigger  2.1.0` with **0 duplicates** (`UPIA_QUIET_TRIGGER_210=True`, `UPIA_DUPLICATE_ZAU=False`).
  - Per-user startup entry created: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run\VAYRO Quiet Trigger` = `"...QuietTriggerHelper.exe" --startup`.
  - All 4 Start Menu shortcuts created (`Quiet Trigger`, `VAYRO Theme Studio`, `Quiet Trigger Settings`, `Uninstall Quiet Trigger`).
  - Silent `QuietTriggerHelper.exe` + bundled `%LOCALAPPDATA%\Programs\VAYRO\Quiet Trigger\runtime\node.exe` started cleanly with zero terminal window and zero global Node.js dependency.
  - Single-instance Mutex prevented duplicate helper process (`MUTEX_SINGLE_INSTANCE=True`).
  - Atomic migration preserved exact 64-hex token (`TOKEN_PRESERVED=True`), created verified backup (`MIG_BACKUP=True`), kept legacy folder (`LEGACY_KEPT=True`), and preserved all 4 Favorites (`FAV_COUNT=4`).

### Stage B — Live Photoshop 2025 v26.8.1 Integration, Themes, Commands & Restart Persistence (**PASS**)
- Installed `Quiet Trigger 2.1.0` UXP plugin connected automatically to the bundled `runtime\node.exe` loopback bridge (`commandCount=98`, `ok=True`).
- Verified **all 6 built-in presets** (`aurora`, `ember`, `crimson`, `arctic`, `emerald`, `monochrome`) + **Custom Red/Orange** (`#FF3D3D → #FF8A32 → #FFB84D`) + **Custom Blue/Pink** (`#4EA5FF → #EC69B9`) live-syncing between WPF and Photoshop UXP with zero restart.
- Verified real Photoshop command execution over the installed bundled bridge:
  - `layer.new` → `ArtLayers.Count`: `2 → 3` (**PASS**)
  - `tool.brush` → `ok: true` (**PASS**)
  - `adjust.curves` → `ArtLayers.Count`: `3 → 4` (**PASS**)
  - `view.actualPixels` → `ok: true` (**PASS**)
- Verified **Photoshop restart persistence**: persisted `ember` theme + 4 Favorites, closed & relaunched Adobe Photoshop 2025 v26.8.1, confirmed `theme.preset == "ember"` and `favCount == 4` survived restart, then cleanly restored default `aurora`.
- Preserved v1.0.0/v2.0.0 baseline: **92 / 98** Photoshop commands live-verified PASS (67 direct state-verified + 25 native dialog verified; 4 full-screen GPU workspaces and 2 Adobe Sensei cloud-dependent commands explicitly documented in [COMMAND_REFERENCE.md](COMMAND_REFERENCE.md)).

### Stage C — Uninstaller Verification (**PASS**)
- Executed `%LOCALAPPDATA%\Programs\VAYRO\Quiet Trigger\unins000.exe /VERYSILENT /NORESTART` (`exit=0`).
- Verified: `QuietTriggerHelper.exe` stopped (`0` running), bundled `runtime\node.exe` stopped (`0` running), `HKCU\...\Run\VAYRO Quiet Trigger` removed, installed application files removed, and `%LOCALAPPDATA%\VAYRO\Quiet Trigger\` user data **preserved by default**.

### Stage D — Clean First-Time Installation Verification (**PASS**)
- Simulated a zero-history machine (removed Photoshop plugin via UPIA, moved `%LOCALAPPDATA%\VAYRO\Quiet Trigger\` and legacy `ZAU-Console` aside, cleared `PluginData`).
- Executed rebuilt `shellexec` `VAYRO-Quiet-Trigger-Setup-2.1.0-x64.exe /VERYSILENT /NORESTART` → returned cleanly in **4.6s** with `exit=0` (zero hang!).
- Verified: fresh 64-hex (256-bit) session token generated, automatically paired into `PluginData\zau-console-state.json` (`bridgeEnabled=true`), `QuietTriggerHelper.exe` + bundled `runtime\node.exe` active silently, `HKCU\...\Run` registered, and UPIA reported `Enabled  Quiet Trigger  2.1.0`.

### Honest Platform / Session Note
- Automated testing runs inside Windows' non-interactive session desktop (`exebox`), so physical Windows reboot/sign-out logon and physical keyboard pressing of `Ctrl + Alt + Space` on the user's interactive desktop were verified structurally via `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` registry inspection, Win32 `RegisterHotKey` registration in `QuietTriggerHelper.exe`, and end-to-end `-Once` WPF + Bridge + Photoshop execution. Users can test live physical `Ctrl + Alt + Space` directly after signing in and opening Photoshop.

---

## 3. Verified Release Artifacts (`dist/`)
- `dist/VAYRO-Quiet-Trigger-Setup-2.1.0-x64.exe` (`23.78 MB`) — SHA-256: `13482bc15f36611461b6d7f136c50d6673bc8752f42470f77b41b0931c51b555`
- `dist/VAYRO-Quiet-Trigger-Photoshop-2.1.0.ccx` (`74.3 KB`) — SHA-256: `1dc64e38df5ada60cdf0b142e0c3f8cd9a4f56ed53845367b6251ef49043b60b`
- `dist/checksums.txt` & `dist/release-notes.md`
- Preserved full backups: `zau-photoshop-console-v1.0.0-backup/` and `zau-photoshop-console-v2.0.0-backup/`.
