# Contributing to Quiet Trigger by VAYRO

Thank you for your interest in contributing to **Quiet Trigger by VAYRO**.

## License & Attribution
Original source code in this repository is licensed under the **Apache License, Version 2.0** (`SPDX-License-Identifier: Apache-2.0`, `Copyright 2026 erf81`). By submitting a pull request, you confirm that your contribution is your original work (or properly licensed for inclusion) and may be distributed under the Apache License 2.0. See [LICENSE](LICENSE), [NOTICE](NOTICE), and [TRADEMARKS.md](TRADEMARKS.md).

## Development Prerequisites
- Node.js 18+ (zero external `npm` runtime dependencies)
- Python 3.10+ (used by `scripts/build-ccx.js` for forward-slash ZIP packaging)
- Windows 10 / 11 x64 + Adobe Photoshop 2025 (26.x) for live UXP & WPF testing
- Inno Setup 6 (`ISCC.exe`) for compiling `dist/VAYRO-Quiet-Trigger-Setup-2.1.0-x64.exe`

## Local Workflow & Automated Testing
```bash
npm test                # Run all 28 unit & integration tests (tests/unit & tests/integration)
npm run icons           # Regenerate UXP & brand assets (scripts/build/generate-icons.js)
npm run package         # Build Photoshop UXP .ccx from photoshop-plugin/
npm run build:helper    # Compile companion/tray/QuietTriggerHelper.cs
npm run build:installer # Build single-file Windows installer + checksums.txt
npm run security:scan   # Run Gitleaks full-history & working-tree scan
```

## Engineering & Security Guidelines
- Preserve the internal UXP plugin ID (`com.zau.photoshop.console`) and panel ID (`zauConsolePanel`) in `photoshop-plugin/manifest.json` so existing users upgrade cleanly without duplicates.
- Use UXP Yoga-safe Flexbox CSS only (no CSS Grid, no `inset`, no `<input type="color">`).
- Keep `companion/bridge/bridge-server.js` bound strictly to `127.0.0.1:47821` with constant-time 256-bit token authentication.
- Never commit session tokens, user `zau-console-state.json` files, `.env` files, `node_modules/`, `build-verify/`, or `installer/stage/`.

## Pull Requests & Issue Triage
- Open an issue describing the bug, Photoshop version, OS version, and reproduction steps (do not post private tokens or personal artwork).
- Pull requests are checked by GitHub Actions CI (`node --test tests/*.test.js`, license/metadata validation, CCX packaging, dependency review, and Gitleaks secret scanning) and are reviewed manually by the maintainer (`erf81`) prior to merge.
- Releases are built, checksummed, and published manually by the maintainer; CI never publishes releases automatically.
