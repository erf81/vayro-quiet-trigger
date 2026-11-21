// Copyright 2026 erf81
// SPDX-License-Identifier: Apache-2.0

/**
 * ZAU Theme Studio UI Controller (UXP Panel).
 * Provides 6 built-in presets, validated HEX color editor + quick swatches
 * (no <input type="color"> for UXP compatibility), gradient customization,
 * visual effect controls, live miniature preview, and Apply/Save/Reset/Cancel.
 */
'use strict';

const {
  THEME_PRESETS,
  QUICK_SWATCHES,
  getAllPresets,
  createThemeFromPreset,
  sanitizeTheme,
  normalizeHexColor,
  buildCssGradient,
  hexToRgba,
} = require('../theme/themeSystem.js');
const { ICONS } = require('./icons.js');

const COLOR_FIELDS = Object.freeze([
  { key: 'accentPrimary', label: 'Primary Accent' },
  { key: 'accentSecondary', label: 'Secondary Accent' },
  { key: 'accentTertiary', label: 'Tertiary Accent' },
  { key: 'background', label: 'Background Tint' },
  { key: 'surface', label: 'Surface Color' },
  { key: 'selected', label: 'Selected Row' },
  { key: 'border', label: 'Border Color' },
  { key: 'glowColor', label: 'Glow Color' },
]);

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

class ThemeStudioUI {
  constructor({ storage, onPreviewTheme, onCommitTheme, onCancelTheme }) {
    this._storage = storage;
    this._onPreviewTheme = onPreviewTheme;
    this._onCommitTheme = onCommitTheme;
    this._onCancelTheme = onCancelTheme;
    this._draft = null;
    this._activeColorKey = 'accentPrimary';
    this._invalidFields = new Set();
    this._customNameInput = '';
    this._statusMsg = '';
  }

  beginEdit() {
    this._draft = this._storage.getAuroraTheme();
    this._invalidFields.clear();
    this._customNameInput = this._draft.customName || '';
    this._statusMsg = '';
  }

  getDraft() {
    if (!this._draft) this.beginEdit();
    return { ...this._draft };
  }

  _emitPreview() {
    if (typeof this._onPreviewTheme === 'function' && this._draft) {
      this._onPreviewTheme(sanitizeTheme(this._draft));
    }
  }

  renderInto(container) {
    if (!container) return;
    if (!this._draft) this.beginEdit();

    const t = this._draft;
    const grad = buildCssGradient(t);
    const savedCustom = this._storage.getSavedCustomThemes();
    const glowAlpha = { off: 0, low: 0.18, medium: 0.34, high: 0.52 }[t.glowIntensity] || 0;
    const previewShadow = t.glowIntensity === 'off' ? 'none' : `0 0 12px ${hexToRgba(t.glowColor, glowAlpha)}`;
    const isLight = t.appearance === 'light';
    const pvBg = isLight ? '#EEF1F7' : t.background;
    const pvSurface = isLight ? '#F8FAFD' : t.surface;
    const pvSel = isLight ? '#E1ECFF' : t.selected;
    const pvText = isLight ? '#181E2C' : '#EFF3FB';
    const pvMuted = isLight ? '#5B667D' : '#9CA7BD';
    const pvBorder = isLight ? '#CFD7E6' : t.border;
    const pvRad = Math.min(t.cornerRadius, 14);

    const presetsHtml = getAllPresets()
      .map((p) => {
        const isActive = t.preset === p.id;
        const pGrad = buildCssGradient(p);
        return `
          <div class="preset-card ${isActive ? 'active' : ''}" data-preset-id="${esc(p.id)}" role="button" tabindex="0">
            <div class="preset-bar" style="background: ${esc(pGrad)};"></div>
            <div class="preset-card-top">
              <span class="preset-name">${esc(p.name)}</span>
              <div class="preset-swatches">
                <span class="swatch-dot" style="background-color:${esc(p.accentPrimary)};"></span>
                <span class="swatch-dot" style="background-color:${esc(p.accentSecondary)};"></span>
                <span class="swatch-dot" style="background-color:${esc(p.accentTertiary)};"></span>
              </div>
            </div>
            <div class="preset-sub">${esc(p.subtitle)}</div>
          </div>`;
      })
      .join('');

    const customListHtml =
      savedCustom.length === 0
        ? ''
        : `
          <div class="studio-subsection">
            <div class="studio-sub-label">Saved Custom Themes</div>
            <div class="saved-custom-list">
              ${savedCustom
                .map(
                  (ct) => `
                <div class="saved-custom-chip" data-load-custom="${esc(ct.id)}" role="button" tabindex="0">
                  <span class="swatch-dot" style="background-color:${esc(ct.theme.accentPrimary)};"></span>
                  <span class="swatch-dot" style="background-color:${esc(ct.theme.accentSecondary)};"></span>
                  <span class="saved-custom-name">${esc(ct.name)}</span>
                  <span class="saved-custom-del" data-del-custom="${esc(ct.id)}" title="Delete">×</span>
                </div>`
                )
                .join('')}
            </div>
          </div>`;

    const colorRowsHtml = COLOR_FIELDS.map((f) => {
      const val = t[f.key] || '#4EA5FF';
      const isFocused = this._activeColorKey === f.key;
      const isInvalid = this._invalidFields.has(f.key);
      return `
        <div class="hex-row ${isFocused ? 'focused' : ''}" data-color-focus="${esc(f.key)}">
          <span class="hex-swatch" style="background-color:${esc(val)}; border-color:${esc(pvBorder)};"></span>
          <span class="hex-label">${esc(f.label)}</span>
          <input
            type="text"
            class="hex-input ${isInvalid ? 'invalid' : ''}"
            data-color-key="${esc(f.key)}"
            value="${esc(val)}"
            maxlength="7"
            spellcheck="false"
            uxp-quiet="true"
          />
        </div>`;
    }).join('');

    const quickSwatchesHtml = QUICK_SWATCHES.map(
      (hex) => `
        <div
          class="quick-swatch"
          data-quick-hex="${esc(hex)}"
          style="background-color:${esc(hex)};"
          title="Apply ${esc(hex)} to ${esc(this._activeColorKey)}"
          role="button"
          tabindex="0"
        ></div>`
    ).join('');

    const pillGroup = (attr, currentVal, options) =>
      `<div class="studio-pill-row">${options
        .map(
          ([val, label]) =>
            `<div class="studio-pill ${String(currentVal) === String(val) ? 'active' : ''}" data-${attr}="${esc(val)}" role="button" tabindex="0">${esc(label)}</div>`
        )
        .join('')}</div>`;

    container.innerHTML = `
      <div class="studio-wrap">
        <!-- LIVE MINIATURE PREVIEW -->
        <div class="studio-section">
          <div class="studio-section-title">Live Preview</div>
          <div class="mini-preview-outer" style="background:${esc(grad)}; border-radius:${pvRad + 1}px; box-shadow:${esc(previewShadow)};">
            <div class="mini-preview-inner" style="background-color:${esc(pvBg)}; border-radius:${pvRad}px; color:${esc(pvText)};">
              <div class="mini-head">
                <div class="mini-brand">
                  <span class="mini-logo-box" style="background:${esc(grad)};">V</span>
                  <span class="mini-title" style="color:${esc(pvText)};">QUIET TRIGGER</span>
                </div>
                <span class="mini-dot"></span>
              </div>

              <div class="mini-search-ring" style="background:${esc(grad)}; border-radius:7px;">
                <div class="mini-search-in" style="background-color:${esc(pvSurface)}; color:${esc(pvMuted)};">
                  Search commands, tools, effects...
                </div>
              </div>

              <div class="mini-nav">
                <span class="mini-nav-pill active" style="background-color:${esc(hexToRgba(t.accentPrimary, 0.2))}; color:${esc(t.accentPrimary)}; border-color:${esc(t.accentPrimary)};">Favorites</span>
                <span class="mini-nav-pill" style="color:${esc(pvMuted)};">Recent</span>
                <span class="mini-nav-cat" style="color:${esc(pvMuted)};">All ▾</span>
              </div>

              <div class="mini-row-ring" style="background:${esc(grad)}; border-radius:7px; box-shadow:${esc(previewShadow)};">
                <div class="mini-row" style="background-color:${esc(pvSel)};">
                  <span class="mini-tile" style="background-color:${esc(pvSurface)}; border-color:${esc(pvBorder)};">◎</span>
                  <div class="mini-row-text">
                    <div class="mini-row-name" style="color:${esc(pvText)};">Gaussian Blur</div>
                    <div class="mini-row-sub" style="color:${esc(t.accentPrimary)};">Filters / Blur</div>
                  </div>
                  <span class="mini-star-gold">★</span>
                </div>
              </div>

              <div class="mini-row quiet" style="background-color:${esc(pvSurface)}; border-color:${esc(pvBorder)};">
                <span class="mini-tile" style="background-color:${esc(pvBg)}; border-color:${esc(pvBorder)};">∿</span>
                <div class="mini-row-text">
                  <div class="mini-row-name" style="color:${esc(pvText)};">Curves</div>
                  <div class="mini-row-sub" style="color:${esc(pvMuted)};">Adjustments / Tone</div>
                </div>
                <span class="mini-star-dim" style="color:${esc(pvMuted)};">☆</span>
              </div>

              <div class="mini-row quiet" style="background-color:${esc(pvSurface)}; border-color:${esc(pvBorder)};">
                <span class="mini-tile" style="background-color:${esc(pvBg)}; border-color:${esc(pvBorder)};">✎</span>
                <div class="mini-row-text">
                  <div class="mini-row-name" style="color:${esc(pvText)};">Brush Tool</div>
                  <div class="mini-row-sub" style="color:${esc(pvMuted)};">Tools / Paint</div>
                </div>
                <span class="mini-kbd" style="border-color:${esc(pvBorder)}; color:${esc(pvMuted)};">B</span>
              </div>
            </div>
          </div>
        </div>

        <!-- BUILT-IN PRESETS -->
        <div class="studio-section">
          <div class="studio-section-title">Color Presets</div>
          <div class="preset-grid">${presetsHtml}</div>
          ${customListHtml}
        </div>

        <!-- CUSTOM COLOR EDITOR -->
        <div class="studio-section">
          <div class="studio-section-title">Custom Colors (HEX)</div>
          <div class="studio-hint">Click any row below, then enter a #RRGGBB hex value or pick a quick swatch.</div>
          <div class="hex-grid">${colorRowsHtml}</div>
          ${
            this._invalidFields.size > 0
              ? `<div class="studio-err">Invalid HEX color detected. Use format #RRGGBB (e.g. #FF3D3D).</div>`
              : ''
          }
          <div class="quick-swatch-bar">${quickSwatchesHtml}</div>
        </div>

        <!-- GRADIENT CUSTOMIZATION -->
        <div class="studio-section">
          <div class="studio-section-title">Accent Gradient</div>
          <div class="studio-control-label">Style</div>
          ${pillGroup('grad-mode', t.gradientMode, [
            ['solid', 'Solid'],
            ['two', '2-Color'],
            ['three', '3-Color'],
          ])}
          <div class="studio-control-label">Direction</div>
          ${pillGroup('grad-dir', t.gradientDirection, [
            ['horizontal', 'Horizontal'],
            ['diagonal', 'Diagonal'],
            ['vertical', 'Vertical'],
          ])}
        </div>

        <!-- VISUAL EFFECTS -->
        <div class="studio-section">
          <div class="studio-section-title">Visual Effects & Layout</div>
          <div class="studio-control-label">Glow Intensity</div>
          ${pillGroup('glow-level', t.glowIntensity, [
            ['off', 'Off'],
            ['low', 'Low'],
            ['medium', 'Medium'],
            ['high', 'High'],
          ])}
          <div class="studio-control-label">Surface Style</div>
          ${pillGroup('surface-style', t.surfaceStyle, [
            ['frosted', 'Frosted'],
            ['translucent', 'Translucent'],
            ['solid', 'Solid'],
            ['flat', 'Flat'],
          ])}
          <div class="studio-control-label">Floating Window Opacity (${Math.round(t.windowOpacity * 100)}%)</div>
          ${pillGroup('win-opacity', Math.round(t.windowOpacity * 100), [
            [78, '78%'],
            [86, '86%'],
            [90, '90%'],
            [94, '94%'],
            [100, '100%'],
          ])}
          <div class="studio-control-label">Corner Radius</div>
          ${pillGroup('corner-radius', t.cornerRadius, [
            [12, '12px'],
            [16, '16px'],
            [20, '20px'],
            [24, '24px'],
          ])}
          <div class="studio-control-label">UI Density</div>
          ${pillGroup('density', t.density, [
            ['compact', 'Compact'],
            ['comfortable', 'Comfortable'],
            ['spacious', 'Spacious'],
          ])}
          <div class="studio-control-label">Appearance Mode</div>
          ${pillGroup('appearance', t.appearance, [
            ['dark', 'Dark'],
            ['light', 'Light'],
            ['auto', 'Auto (PS)'],
          ])}
        </div>

        <!-- SAVE CUSTOM THEME -->
        <div class="studio-section">
          <div class="studio-section-title">Save Custom Theme</div>
          <div class="save-custom-row">
            <input
              id="zauCustomThemeName"
              class="zau-input-sm flex-1"
              type="text"
              placeholder="e.g. Sunset Ember"
              value="${esc(this._customNameInput)}"
              maxlength="32"
              uxp-quiet="true"
            />
            <div id="zauSaveCustomBtn" class="btn-secondary" role="button" tabindex="0">Save Custom</div>
          </div>
          ${this._statusMsg ? `<div class="studio-status-msg">${esc(this._statusMsg)}</div>` : ''}
        </div>

        <!-- ACTION BAR -->
        <div class="studio-actions">
          <div id="zauThemeApply" class="btn-primary-solid" role="button" tabindex="0">Apply</div>
          <div id="zauThemeReset" class="btn-secondary" role="button" tabindex="0">Reset</div>
          <div id="zauThemeCancel" class="btn-danger-outline" role="button" tabindex="0">Cancel</div>
        </div>
      </div>
    `;

    this._bindEvents(container);
  }

  _bindEvents(container) {
    // Presets
    container.querySelectorAll('[data-preset-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const pid = el.getAttribute('data-preset-id');
        if (!THEME_PRESETS[pid]) return;
        this._draft = {
          ...createThemeFromPreset(pid),
          density: this._draft.density,
          cornerRadius: this._draft.cornerRadius,
          windowOpacity: this._draft.windowOpacity,
        };
        this._invalidFields.clear();
        this._statusMsg = `Previewing ${THEME_PRESETS[pid].name} preset`;
        this._emitPreview();
        this.renderInto(container);
      });
    });

    // Saved custom themes
    container.querySelectorAll('[data-load-custom]').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-del-custom]')) return;
        const cid = el.getAttribute('data-load-custom');
        const found = this._storage.getSavedCustomThemes().find((c) => c.id === cid);
        if (!found) return;
        this._draft = { ...found.theme };
        this._customNameInput = found.name;
        this._invalidFields.clear();
        this._statusMsg = `Previewing custom theme "${found.name}"`;
        this._emitPreview();
        this.renderInto(container);
      });
    });

    container.querySelectorAll('[data-del-custom]').forEach((el) => {
      el.addEventListener('click', async (e) => {
        e.stopPropagation();
        const cid = el.getAttribute('data-del-custom');
        await this._storage.deleteCustomTheme(cid);
        this.renderInto(container);
      });
    });

    // Color row focus
    container.querySelectorAll('[data-color-focus]').forEach((row) => {
      row.addEventListener('click', () => {
        const key = row.getAttribute('data-color-focus');
        if (key && key !== this._activeColorKey) {
          this._activeColorKey = key;
          container.querySelectorAll('[data-color-focus]').forEach((r) => {
            r.classList.toggle('focused', r.getAttribute('data-color-focus') === key);
          });
        }
      });
    });

    // HEX inputs with live validation & instant preview
    container.querySelectorAll('[data-color-key]').forEach((input) => {
      input.addEventListener('focus', () => {
        this._activeColorKey = input.getAttribute('data-color-key');
      });
      input.addEventListener('input', (e) => {
        const key = input.getAttribute('data-color-key');
        const raw = e.target.value;
        const norm = normalizeHexColor(raw);
        if (norm) {
          this._invalidFields.delete(key);
          this._draft[key] = norm;
          this._draft.preset = 'custom';
          input.classList.remove('invalid');
          this._emitPreview();
        } else {
          this._invalidFields.add(key);
          input.classList.add('invalid');
        }
      });
      input.addEventListener('change', () => {
        this.renderInto(container);
      });
    });

    // Quick color swatches
    container.querySelectorAll('[data-quick-hex]').forEach((sw) => {
      sw.addEventListener('click', () => {
        const hex = sw.getAttribute('data-quick-hex');
        const key = this._activeColorKey || 'accentPrimary';
        this._draft[key] = hex;
        this._draft.preset = 'custom';
        this._invalidFields.delete(key);
        this._emitPreview();
        this.renderInto(container);
      });
    });

    const bindPills = (attr, setter) => {
      container.querySelectorAll(`[data-${attr}]`).forEach((el) => {
        el.addEventListener('click', () => {
          setter(el.getAttribute(`data-${attr}`));
          this._emitPreview();
          this.renderInto(container);
        });
      });
    };

    bindPills('grad-mode', (v) => { this._draft.gradientMode = v; });
    bindPills('grad-dir', (v) => { this._draft.gradientDirection = v; });
    bindPills('glow-level', (v) => { this._draft.glowIntensity = v; });
    bindPills('surface-style', (v) => { this._draft.surfaceStyle = v; });
    bindPills('win-opacity', (v) => { this._draft.windowOpacity = Math.round(Number(v)) / 100; });
    bindPills('corner-radius', (v) => { this._draft.cornerRadius = Number(v); });
    bindPills('density', (v) => { this._draft.density = v; });
    bindPills('appearance', (v) => { this._draft.appearance = v; });

    const nameInput = container.querySelector('#zauCustomThemeName');
    if (nameInput) {
      nameInput.addEventListener('input', (e) => {
        this._customNameInput = e.target.value || '';
      });
    }

    const saveCustomBtn = container.querySelector('#zauSaveCustomBtn');
    if (saveCustomBtn) {
      saveCustomBtn.addEventListener('click', async () => {
        if (this._invalidFields.size > 0) {
          this._statusMsg = 'Fix invalid HEX values before saving.';
          this.renderInto(container);
          return;
        }
        const entry = await this._storage.saveCustomTheme(this._customNameInput, this._draft);
        this._draft = { ...entry.theme };
        this._customNameInput = entry.name;
        this._statusMsg = `Saved & applied "${entry.name}".`;
        if (typeof this._onCommitTheme === 'function') {
          await this._onCommitTheme(this._draft);
        }
        this.renderInto(container);
      });
    }

    const applyBtn = container.querySelector('#zauThemeApply');
    if (applyBtn) {
      applyBtn.addEventListener('click', async () => {
        if (this._invalidFields.size > 0) {
          this._statusMsg = 'Fix invalid HEX values before applying.';
          this.renderInto(container);
          return;
        }
        const saved = await this._storage.setAuroraTheme(this._draft);
        this._draft = saved;
        this._statusMsg = 'Theme applied & synchronized.';
        if (typeof this._onCommitTheme === 'function') {
          await this._onCommitTheme(saved);
        }
        this.renderInto(container);
      });
    }

    const resetBtn = container.querySelector('#zauThemeReset');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        this._draft = createThemeFromPreset('aurora');
        this._invalidFields.clear();
        this._customNameInput = '';
        this._statusMsg = 'Reset to Aurora default (click Apply to save).';
        this._emitPreview();
        this.renderInto(container);
      });
    }

    const cancelBtn = container.querySelector('#zauThemeCancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this._draft = null;
        this._invalidFields.clear();
        if (typeof this._onCancelTheme === 'function') {
          this._onCancelTheme();
        }
      });
    }
  }
}

module.exports = { ThemeStudioUI, COLOR_FIELDS };
