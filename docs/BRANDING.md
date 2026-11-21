# VAYRO — Quiet Trigger Brand Architecture & Visual Identity

## 1. Brand Hierarchy
- **Parent Brand**: **VAYRO**
- **Product Name**: **Quiet Trigger**
- **Full Identity**: **Quiet Trigger by VAYRO**
- **Product Category**: Adobe Photoshop Command Palette
- **Tagline**: *"Less searching. More creating."*
- **Version**: `2.1.0`

## 2. Brand Personality
- Premium, minimal, architectural, creative-technology aesthetic
- Quietly powerful: stays out of the way in the Windows system tray until invoked with `Ctrl + Alt + Space`
- Restrained frosted dark-navy surfaces with luminous Aurora accents (Blue `#4EA5FF` → Violet `#8B5CF6` → Pink `#EC69B9`), customizable across 6 built-in presets and unlimited custom HEX themes via **VAYRO Theme Studio**

## 3. Brand Assets (`assets/brand/` & `assets/icons/`)
- **Compact Product Symbol**: [quiet-trigger-symbol.svg](../assets/brand/quiet-trigger-symbol.svg) & [quiet-trigger-256.png](../assets/brand/quiet-trigger-256.png) — geometric rounded obsidian keycap with Aurora luminous edge, architectural `V` chevron, and precision quiet-trigger focal dot.
- **Horizontal Lockup**: [vayro-logo-horizontal.svg](../assets/brand/vayro-logo-horizontal.svg) — `QUIET TRIGGER / BY VAYRO`.
- **Windows Multi-Resolution Icon**: [quiet-trigger.ico](../assets/brand/quiet-trigger.ico) (`16×16` through `256×256`, used across `QuietTriggerHelper.exe`, System Tray, Start Menu, Installer, and Uninstaller).
- **Installer Graphics**: `assets/brand/installer-sidebar.bmp` (`164×314`) and `assets/brand/installer-header.bmp` (`55×58`).
- **Photoshop UXP Manifest Icons**: `assets/icons/icon-dark-23@1x/2x.png`, `icon-light-23@1x/2x.png`, `icon-48@1x/2x.png`.
- **GitHub Social Preview**: [github-social-preview.png](../assets/brand/github-social-preview.png) (`1280×640`).

## 4. Internal Identity Preservation (v2.0.0 → v2.1.0)
To ensure existing **ZAU Console 2.0.0** installations upgrade cleanly without duplicate Photoshop plugins or data loss:
- **UXP Plugin ID** (`manifest.json -> id`): preserved as `com.zau.photoshop.console`.
- **UXP Panel ID** (`manifest.json -> entrypoints[0].id`): preserved as `zauConsolePanel`.
- **Display Name & Panel Label**: updated to **`Quiet Trigger`** (`version: "2.1.0"`).
- **Windows User Data**: safely migrated atomically from `%LOCALAPPDATA%\ZAU-Console\` to `%LOCALAPPDATA%\VAYRO\Quiet Trigger\` with verified backup retention (`migration-backup-v2.0.0`).

## 5. Preliminary Name-Conflict & Trademark Risk Review (Non-Legal)
A preliminary, non-legal web review was conducted on **2026-11-21** (no domains were purchased and no trademarks were filed):
- **"VAYRO" (Elevated Commercial Naming Risk)**: In active use by multiple unrelated entities across software and commercial sectors — including *Vayro* business operations software (`usevayro.com`), *Vayro* AI travel planning (`vayro.org`), *VAYRO* UK AI consulting (`vayro.co.uk`), Indian Class 9/35 trademark filings for electronics/hardware/software, and US/international retail/fragrance/jewelry brands. **Risk Assessment**: While suitable for identifying this free open-source project alongside clear non-affiliation disclaimers, launching a commercial software brand under "VAYRO" carries meaningful naming-conflict risk without formal legal clearance.
- **"Quiet Trigger" (Lower Observed Conflict Risk in Photoshop Ecosystem)**: No conflicting Adobe Photoshop plugin or command palette was identified. Adjacent uses include Adobe Photoshop's built-in "Quiet Mode" notification setting and audio/DAW drum-trigger plugins (*Steven Slate Trigger*, *Waves InTrigger*).
- **Legal Status & Guidance**: See [TRADEMARKS.md](../TRADEMARKS.md). This project does **not** claim trademark registration or exclusive trademark rights, does **not** use the ® symbol, and strongly recommends formal trademark clearance searches by qualified IP counsel before any commercial expansion or trademark registration.
