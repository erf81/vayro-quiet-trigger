# VAYRO & Quiet Trigger — Brand Architecture

## 1. Permanent Brand Hierarchy
- **Parent Brand (Developer / Publisher)**: **VAYRO**
- **Product Name**: **Quiet Trigger**
- **Full Product Attribution**: **Quiet Trigger by VAYRO**
- **Product Category**: Adobe Photoshop Command Palette
- **Tagline**: *"Less searching. More creating."*
- **Theme Feature Name**: **VAYRO Theme Studio**
- **Installer Identity**: **Quiet Trigger Setup** *(Published by VAYRO)*

Keep **VAYRO** clearly distinct as the parent brand and **Quiet Trigger** as an individual product. Avoid treating "VAYRO Quiet Trigger" as a single fused product name in UI copy or documentation prose.

---

## 2. Separated Brand Assets (`assets/brand/` & `assets/icons/`)

### Parent Brand (`assets/brand/vayro/`)
- [vayro-mark.svg](../assets/brand/vayro/vayro-mark.svg) — Distinct architectural VAYRO parent monogram.
- [vayro-logo-horizontal.svg](../assets/brand/vayro/vayro-logo-horizontal.svg) — `QUIET TRIGGER / BY VAYRO` horizontal lockup.

### Product (`assets/brand/quiet-trigger/`)
- [quiet-trigger-symbol.svg](../assets/brand/quiet-trigger/quiet-trigger-symbol.svg) & [quiet-trigger-256.png](../assets/brand/quiet-trigger/quiet-trigger-256.png) — Rounded obsidian keycap tile with Aurora luminous edge, architectural `V` chevron, and quiet-trigger focal dot.
- [quiet-trigger.ico](../assets/brand/quiet-trigger/quiet-trigger.ico) — Multi-resolution Windows icon (`16..256px`) for `QuietTriggerHelper.exe`, System Tray, Start Menu, Installer, and Uninstaller.
- `installer-sidebar.bmp` (`164×314`) & `installer-header.bmp` (`55×58`) — Inno Setup wizard graphics.
- [github-social-preview.png](../assets/brand/quiet-trigger/github-social-preview.png) — `1280×640` GitHub social preview.

### Photoshop UXP Host Icons (`assets/icons/`)
- `icon-dark-23@1x/2x.png`, `icon-light-23@1x/2x.png`, `icon-48@1x/2x.png`.

---

## 3. Preserved Internal UXP Identifiers
- **UXP Plugin ID** (`photoshop-plugin/manifest.json`): preserved as `com.zau.photoshop.console`.
- **UXP Panel ID**: preserved as `zauConsolePanel`.
- **Display Name & Panel Title**: **`Quiet Trigger`**.

---

## 4. Preliminary Name-Conflict & Trademark Risk Review (Non-Legal)
A preliminary, non-legal web review conducted on **2026-11-21** (no domains purchased, no trademarks filed):
- **"VAYRO" (Elevated Commercial Naming Risk)**: In active use by multiple unrelated entities across software and commercial sectors — including *Vayro* business operations software (`usevayro.com`), *Vayro* AI travel planning (`vayro.org`), *VAYRO* UK AI consulting (`vayro.co.uk`), Indian Class 9/35 trademark filings, and US/international retail/fragrance/jewelry brands. While suitable for identifying this free open-source project alongside clear non-affiliation notices, commercial brand expansion under "VAYRO" carries meaningful naming-conflict risk without formal legal clearance.
- **"Quiet Trigger" (Lower Observed Conflict Risk in Photoshop Ecosystem)**: No conflicting Adobe Photoshop command palette was identified (adjacent uses: Photoshop "Quiet Mode" notification setting and audio/DAW drum-trigger plugins).
- **Legal Status**: See [TRADEMARKS.md](../TRADEMARKS.md). This project does **not** claim trademark registration, does **not** use the ® symbol, and is not legal advice.
