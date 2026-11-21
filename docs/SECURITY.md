# Security Architecture — Quiet Trigger by VAYRO (v2.1.0)

This document mirrors [../SECURITY.md](../SECURITY.md).

## Key Guarantees
1. **Strict `127.0.0.1` loopback binding** — never exposed on LAN or WAN.
2. **256-bit random per-user token** verified via `crypto.timingSafeEqual` on all HTTP endpoints (`/health`, `/catalog`, `/context`, `/execute`, `/theme`, `/favorite`) and WebSocket upgrades.
3. **Zero credentials in installer, logs, or `theme.json`** — `sanitizeTheme()` enforces an allowlist of theme properties only.
4. **Least-privilege UXP Manifest v5** — `localFileSystem: "plugin"` + localhost bridge port `47821` only.
5. **Least-privilege Windows Installer** — per-user `%LOCALAPPDATA%\Programs\VAYRO\Quiet Trigger` and `HKCU\...\Run`, zero admin elevation, zero global PowerShell policy changes.
6. **Transparent Unsigned Binary Status** — SHA-256 checksums published in `dist/checksums.txt`; no forged or self-signed certificates.
