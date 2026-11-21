# Contributing to Quiet Trigger by VAYRO

Thank you for your interest in **Quiet Trigger by VAYRO**.

## Repository & Licensing Status
This repository is currently maintained as a **private staging repository** and is **unlicensed** pending an explicit license selection by the owner (`erf81`). Do not redistribute, fork publicly, or submit third-party code under incompatible license terms until an official license is chosen.

## Development Workflow
1. **Prerequisites (Development Only)**: Node.js 18+, Python 3.10+, Windows 10/11 x64, Adobe Photoshop 2025 (26.x), and Inno Setup 6 (`ISCC.exe`) for building the single-file installer.
2. **Run Automated Tests**:
   ```bash
   npm test
   ```
   All 28 tests (`tests/*.test.js`) must pass before committing.
3. **UXP Compatibility Rules**:
   - Preserve UXP plugin ID `com.zau.photoshop.console` in `manifest.json`.
   - Use UXP Yoga-safe Flexbox CSS only (no CSS Grid, no `inset`, no `<input type="color">`).
   - Use `ws://localhost:47821` for the UXP WebSocket client while keeping `bridge-server.js` bound strictly to `127.0.0.1`.
   - Never commit session tokens, user `zau-console-state.json` files, `node_modules/`, or `installer/stage/`.
4. **Build Packages**:
   ```bash
   npm run icons           # Regenerate UXP & brand assets
   npm run package         # Build dist/VAYRO-Quiet-Trigger-Photoshop-2.1.0.ccx
   npm run build:helper    # Compile QuietTriggerHelper.exe
   npm run build:installer # Build dist/VAYRO-Quiet-Trigger-Setup-2.1.0-x64.exe + checksums.txt
   ```
