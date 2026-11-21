# Quiet Trigger 2.1.0 by VAYRO — Release Notes

- **Brand / Product**: **Quiet Trigger by VAYRO** (*"Less searching. More creating."*)
- **Version**: `2.1.0`
- **Target Host**: Adobe Photoshop 2025 v26.8.1 (compatible with Photoshop 24.0+ · UXP Manifest v5 · API v2) on Windows 10/11 x64
- **Code Signing Status**: Unsigned open-source build (verify integrity with SHA-256 checksums below)
- **License**: **Apache License 2.0** (`Copyright 2026 erf81`) for original source code. See [LICENSE](../LICENSE), [TRADEMARKS.md](../TRADEMARKS.md), and [THIRD_PARTY_NOTICES.txt](../THIRD_PARTY_NOTICES.txt) for bundled third-party components (Node.js v24.20.0 MIT, Inno Setup 6.7.3).

## Download Options

### Option A — Complete Windows Installer *(Recommended)*
- **File**: `VAYRO-Quiet-Trigger-Setup-2.1.0-x64.exe` (`23.78 MB`)
- **SHA-256**: `13482bc15f36611461b6d7f136c50d6673bc8752f42470f77b41b0931c51b555`
- **Includes**: Official Photoshop UXP `.ccx`, silent native Windows system tray helper (`QuietTriggerHelper.exe`), bundled portable Node.js runtime (`runtime\node.exe` — no global Node.js or AutoHotkey needed), floating WPF command palette (`Ctrl + Alt + Space`), **VAYRO Theme Studio**, automatic per-user Windows startup, safe upgrade from ZAU Console 2.0.0, and clean Windows uninstaller.

### Option B — Photoshop Plugin Only
- **File**: `VAYRO-Quiet-Trigger-Photoshop-2.1.0.ccx` (`74.3 KB`)
- **SHA-256**: `1dc64e38df5ada60cdf0b142e0c3f8cd9a4f56ed53845367b6251ef49043b60b`
- **Includes**: Official Adobe Photoshop UXP docked panel plugin only (floating global palette requires the companion installer above).

## Highlights in v2.1.0
- Full **VAYRO — Quiet Trigger** brand transformation across installer, tray icon, floating palette, UXP panel, VAYRO Theme Studio, and documentation.
- Zero-script user experience: install one EXE, open Photoshop, press **`Ctrl + Alt + Space`**.
- Automatic per-user Windows startup + silent system tray menu (`Open Quiet Trigger`, `Theme Studio`, `Settings`, `Pause Hotkey`, `Resume Hotkey`, `Start Photoshop`, `Check for Updates`, `Exit Quiet Trigger`).
- Safe, tested upgrade path from **ZAU Console 2.0.0** preserving internal UXP plugin ID `com.zau.photoshop.console`, Favorites, Recents, Custom Themes, and session token with zero duplicate plugins.
- Verified end-to-end on Windows 10 x64 + Adobe Photoshop 2025 v26.8.1: **28 / 28** automated tests, **92 / 98** live-verified Photoshop commands (6 GPU-workspace / AI Sensei commands documented), live upgrade, uninstall, and clean first-time install all passing.
