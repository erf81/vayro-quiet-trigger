# Security Model — Quiet Trigger by VAYRO (v2.1.0)

## Local-Only Architecture
- **100% Local Operation**: Quiet Trigger runs entirely on your Windows workstation and inside Adobe Photoshop. It does not send analytics, telemetry, commands, or artwork to any remote server.
- **Strict Loopback Binding**: The local bridge (`hotkey-helper/bridge-server.js`) is hardcoded to bind strictly to `127.0.0.1` (default port `47821`) and never listens on `0.0.0.0` or external network interfaces.

## Authentication & First-Run Pairing
- **256-bit Random Per-User Token**: On first startup, the bridge generates a cryptographically random 256-bit (64-hex) token stored in `%LOCALAPPDATA%\VAYRO\Quiet Trigger\bridge-session.json` (user-profile private).
- **Constant-Time Verification**: Every HTTP request (`X-ZAU-Token`) and WebSocket upgrade (`?token=...`) is verified using `crypto.timingSafeEqual`. Unauthorized requests receive HTTP `401 Unauthorized`.
- **Secure Local Auto-Pairing**: First-run pairing writes the generated token directly into the current user's private Photoshop UXP `PluginData` (`%APPDATA%\Adobe\UXP\PluginsStorage\PHSP\<ver>\External\com.zau.photoshop.console\PluginData\zau-console-state.json`) using atomic file replacement.
- **Zero Credential Leakage**:
  - No session token is ever embedded in the installer or repository.
  - Tokens are never printed to logs or stdout in background mode (`--silent`).
  - `sanitizeTheme()` strips any unexpected keys so `bridgeToken` can never be stored inside `theme.json` or exported theme payloads.
- **Command Isolation**: `POST /theme` updates visual styling only and never invokes Photoshop command execution.

## Windows Security & Code Signing Status
- **Per-User Privileges**: Both the installer (`PrivilegesRequired=lowest`) and `QuietTriggerHelper.exe` run under standard user privileges with zero UAC elevation, zero Windows services, and zero global PowerShell execution-policy changes.
- **Unsigned Staging Build**: No authorized commercial code-signing certificate was present at build time. Binaries are intentionally left **unsigned** (never self-signed or spoofed). Verify integrity using SHA-256 hashes in [dist/checksums.txt](dist/checksums.txt). Windows SmartScreen may display an "Unknown publisher" notice until signed with a trusted Authenticode certificate.
- **Third-Party Runtime Notice**: Portable `runtime\node.exe` (Node.js v24.20.0, MIT License) is bundled exclusively to run the local loopback bridge; see [installer/THIRD_PARTY_NOTICES.txt](installer/THIRD_PARTY_NOTICES.txt).
