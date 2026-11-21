# Upgrading from ZAU Console 2.0.0 to Quiet Trigger 2.1.0 (by VAYRO)

Quiet Trigger 2.1.0 provides an automatic, non-destructive upgrade path from **ZAU Console 2.0.0**.

## What the Installer Preserves Automatically
When you run `VAYRO-Quiet-Trigger-Setup-2.1.0-x64.exe` over an existing **ZAU Console 2.0.0** setup:

1. **Preserves Existing UXP Plugin Identity**:
   - Retains internal UXP ID `com.zau.photoshop.console` and panel ID `zauConsolePanel` while updating the visible plugin name to **Quiet Trigger** (`2.1.0`).
   - Uses Adobe's official `UnifiedPluginInstallerAgent.exe` to retire legacy `"ZAU Console"` and install `"Quiet Trigger"` so **no duplicate plugin** ever appears in Photoshop's `Plugins` menu.
2. **Protects & Restores Photoshop `PluginData`**:
   - Before invoking Adobe UPIA, backs up `%APPDATA%\Adobe\UXP\PluginsStorage\PHSP\<ver>\External\com.zau.photoshop.console\PluginData\zau-console-state.json` to `%LOCALAPPDATA%\VAYRO\Quiet Trigger\upgrade-backup-v2.0.0\`, validates the JSON backup, installs v2.1.0, and atomically restores your Favorites, Recent Commands, Custom Themes, Hotkey preference, and Bridge pairing.
3. **Atomically Migrates Local Bridge Data**:
   - Backs up legacy `%LOCALAPPDATA%\ZAU-Console\bridge-session.json` and `zau-theme.json` to `%LOCALAPPDATA%\VAYRO\Quiet Trigger\migration-backup-v2.0.0\`, validates JSON integrity, and atomically migrates them to `%LOCALAPPDATA%\VAYRO\Quiet Trigger\bridge-session.json` and `theme.json`.
   - **Preserves your existing 256-bit session token** and **never deletes** `%LOCALAPPDATA%\ZAU-Console\` during upgrade.
4. **Replaces Manual `start-helper.bat`**:
   - Installs the silent native `QuietTriggerHelper.exe` with bundled portable `runtime\node.exe`, Windows System Tray menu, and automatic per-user startup (`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`).
   - If you previously added `start-helper.bat` manually to your Windows Startup folder, remove that obsolete shortcut after verifying Quiet Trigger 2.1.0 works.
