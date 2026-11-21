# VAYRO Product Ecosystem Conventions

This document defines reusable naming, repository, branding, licensing, and release conventions so future products created under the **VAYRO** parent brand integrate cleanly alongside **Quiet Trigger**.

---

## 1. Brand Hierarchy

```text
VAYRO (Parent Software Brand / Publisher)
├── Quiet Trigger          — Adobe Photoshop Command Palette (active)
├── <Future Product 02>    — Independent repository & release lifecycle
└── <Future Product 03>    — Independent repository & release lifecycle
```

- **Parent Brand**: `VAYRO` (publisher / studio identity).
- **Product Name**: Standalone product title (e.g., `Quiet Trigger`).
- **Full Attribution**: `<Product> by VAYRO` (e.g., `Quiet Trigger by VAYRO`).
- **Rule**: Never fuse `VAYRO` and `<Product>` into a single inseparable product name in UI copy or documentation prose. Keep `VAYRO` clearly attributed as the parent brand/publisher and `<Product>` as the product name.

---

## 2. Repository & Naming Conventions
- **Repository Slug**: `vayro-<product-slug>` (e.g., `erf81/vayro-quiet-trigger`).
- **Repository Description**: `<Product> by VAYRO — <concise one-line description>.`
- **Default Branch**: `main` (protected by CI; structural changes reviewed via pull requests).
- **Ownership**: Individual products remain under maintainer `erf81` until an explicit future organizational decision is made.

---

## 3. Standard Product Directory Layout
```text
vayro-<product>/
├── README.md / LICENSE / NOTICE / TRADEMARKS.md / THIRD_PARTY_NOTICES.txt
├── CHANGELOG.md / CONTRIBUTING.md / SECURITY.md / package.json / .gitignore
├── .github/workflows/       # Minimal-permission CI, dependency review & Gitleaks
├── <host-plugin>/           # Clean host-plugin package root (e.g. photoshop-plugin/)
├── companion/               # OS helper, tray, bridge (when applicable)
├── installer/               # Installer scripts & third-party notices
├── assets/
│   ├── brand/vayro/         # Parent brand assets
│   ├── brand/<product>/     # Product-specific icons, bitmaps & social preview
│   └── icons/               # Host-required icon sets
├── scripts/                 # build/, release/, security/
├── tests/                   # unit/, integration/, fixtures/
└── docs/                    # Architecture, branding, installation, upgrade, test reports
```

---

## 4. Release & Asset Naming
- **Semantic Versioning**: `MAJOR.MINOR.PATCH` (`v2.1.0`, `v2.2.0`, etc.).
- **Windows Installer**: `VAYRO-<Product>-Setup-<version>-x64.exe`
- **Host Plugin Package**: `VAYRO-<Product>-<Host>-<version>.<ext>` (e.g. `.ccx`)
- **Verification Files**: `checksums.txt` (SHA-256) + `release-notes.md`
- **Immutability**: Once tagged and published, release tags and attached assets are never overwritten silently.

---

## 5. Licensing & Trademark Separation
- Original source code is licensed explicitly (e.g., **Apache-2.0** with `LICENSE`, `NOTICE`, and `SPDX-License-Identifier` headers).
- Third-party runtimes and tools are documented separately in `THIRD_PARTY_NOTICES.txt` and never re-attributed to the project copyright holder.
- Brand names and visual marks are governed separately via `TRADEMARKS.md` (without claiming trademark registration unless formally registered).
