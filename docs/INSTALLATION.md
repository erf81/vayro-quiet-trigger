# Installation Guide — Quiet Trigger 2.1.0 by VAYRO

## Two Download Options

### Option A — Complete Windows Installer *(Recommended)*
**File**: `VAYRO-Quiet-Trigger-Setup-2.1.0-x64.exe`

For all Windows 10 / 11 x64 Adobe Photoshop users. Everything is bundled in one file — **no Node.js, no AutoHotkey, no UXP Developer Tool, and no terminal scripts required**:
- Official Adobe Photoshop UXP plugin (`VAYRO-Quiet-Trigger-Photoshop-2.1.0.ccx`)
- Silent Windows Background Helper & System Tray (`QuietTriggerHelper.exe`)
- Bundled portable Node.js runtime (`runtime\node.exe`) for the loopback bridge
- Floating WPF Command Palette (`Ctrl + Alt + Space`) & **VAYRO Theme Studio**
- Per-user automatic Windows startup (no Administrator/UAC prompt required)
- Clean Windows Settings → Apps → Installed Apps uninstaller

**Steps**:
1. Download `VAYRO-Quiet-Trigger-Setup-2.1.0-x64.exe` and optionally verify its SHA-256 checksum against `dist/checksums.txt`.
2. Run the installer. *(Note: Because this staging build is currently unsigned, Windows SmartScreen may display an "Unknown publisher" notice — verify the SHA-256 hash before clicking **More info → Run anyway**.)*
3. Keep both default options checked:
   - **Start Quiet Trigger automatically when signing in to Windows**
   - **Install or upgrade the Quiet Trigger plugin in Adobe Photoshop**
4. Open **Adobe Photoshop 2025** and press **`Ctrl + Alt + Space`** to summon the Quiet Trigger floating palette (or open **Plugins → Quiet Trigger → Quiet Trigger** for the docked panel).

---

### Option B — Photoshop Plugin Only (`.ccx`)
**File**: `VAYRO-Quiet-Trigger-Photoshop-2.1.0.ccx`

For users who only want the docked UXP panel inside Adobe Photoshop without the floating Windows palette or global `Ctrl + Alt + Space` shortcut:
1. Double-click `VAYRO-Quiet-Trigger-Photoshop-2.1.0.ccx` to install through **Adobe Creative Cloud Desktop**, **or** run Adobe's official CLI:
   ```powershell
   "C:\Program Files\Common Files\Adobe\Adobe Desktop Common\RemoteComponents\UPI\UnifiedPluginInstallerAgent\UnifiedPluginInstallerAgent.exe" /install "<full-path>\VAYRO-Quiet-Trigger-Photoshop-2.1.0.ccx"
   ```
2. Restart Adobe Photoshop and open **Plugins → Quiet Trigger → Quiet Trigger**.

> **Important**: Never manually copy source folders or `.ccx` files into Adobe-managed plugin directories. Always use the official Adobe installer workflow above.

---

## Uninstallation
1. Open **Windows Settings → Apps → Installed Apps**, find **Quiet Trigger by VAYRO**, and click **Uninstall** (or use **Start Menu → VAYRO → Quiet Trigger → Uninstall Quiet Trigger**).
2. The uninstaller automatically stops `QuietTriggerHelper.exe` and its bundled bridge, removes startup entries and Start Menu shortcuts, and deletes application files.
3. You are explicitly asked whether to:
   - Also remove the Photoshop UXP plugin via official Adobe UPIA, and
   - Keep your user settings, custom themes, and Favorites (**kept by default**).
4. Unrelated Adobe files and your Photoshop documents are never touched.

---

## Licensing & Third-Party Distribution Status
- **Source Code**: Licensed under the **Apache License, Version 2.0** (`Copyright 2026 erf81`; see [LICENSE](../LICENSE) and [TRADEMARKS.md](../TRADEMARKS.md)).
- **Bundled Installer Components**: `VAYRO-Quiet-Trigger-Setup-2.1.0-x64.exe` bundles a portable **Node.js v24.20.0** runtime (MIT License) and is compiled with **Inno Setup 6.7.3** (open-source license permits redistribution; maintainers request a commercial license for commercial/business distribution — Quiet Trigger 2.1.0 is distributed free and open source). See [THIRD_PARTY_NOTICES.txt](../THIRD_PARTY_NOTICES.txt).
