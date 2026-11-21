# ZAU Console — Compatibility & Known Limitations

## 1. Verified Host Environment
- **Operating System**: Windows 10 Enterprise 64-bit (`10.0.19043`)
- **Verified Host**: **Adobe Photoshop 2025 v26.8.1** (64-bit)
- **Minimum Supported Host**: Adobe Photoshop 24.0.0 (UXP Manifest v5, Photoshop API v2)
- **Package Installer**: Adobe Creative Cloud Desktop / `UnifiedPluginInstallerAgent.exe` (UPIA)

## 2. Verified Adobe UXP Platform Behaviors & Limitations

| Topic | Behavior in Photoshop 2025 v26.8.1 | How ZAU Console Handles It |
|---|---|---|
| **Global Keyboard Shortcut** | UXP panels cannot globally capture OS/Photoshop hotkeys when unfocused. | Optional local Windows Hotkey Helper (`hotkey-helper/`) using Win32 `RegisterHotKey` (`Ctrl+Alt+Space` default) + loopback WebSocket bridge (`127.0.0.1:47821`). |
| **`Ctrl + Space` Shortcut** | Native Photoshop temporary Zoom In on Windows. | Default helper shortcut is `Ctrl + Alt + Space`. `Ctrl + Space` is opt-in only with an explicit warning in Settings and CLI. |
| **Background Startup Loading** | `host.data.loadEvent: "startup"` loads the plugin's core automatically when Photoshop starts. | Core + optional bridge initialize via singleton `corePromise` on startup so the Hotkey Helper works even before the panel is opened. |
| **UXP `network.domains` Loopback** | UXP Manifest v5's URL domain validator requires hostname `ws://localhost:47821` (rejecting raw IP `ws://127.0.0.1:47821`). | Plugin connects to `ws://localhost:47821`; `bridge-server.js` binds strictly to `127.0.0.1`. |
| **Full-Screen GPU Filter Workspaces** | `Lens Blur`, `Blur Gallery`, `Liquify`, and `Camera Raw Filter` launch full-screen modal plugin workspaces. | Invoked via verified interactive descriptors / menu ID `2225` with `interactive: true`; user clicks OK/Cancel interactively. |
| **AI Sensei Commands (`Select Subject`, `Remove Background`)** | Require photographic subject + local/cloud Adobe Sensei ML models; may show an interactive alert if no subject is detected or offline. | Invoked with `interactive: true` so Photoshop handles progress/alerts cleanly without crashing the plugin. |
| **UXP UI Themes** | Photoshop exposes 4 `prefers-color-scheme` values (`darkest`, `dark`, `light`, `lightest`). | `styles.css` adapts automatically across all 4 modes in `Auto` theme, plus explicit `Dark` and `Light` overrides. |
| **License Status** | No license has been chosen yet. | Repository intentionally omits a `LICENSE` file; an explicit license decision is required before public distribution. |
