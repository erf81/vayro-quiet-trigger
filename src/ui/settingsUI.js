// Copyright 2026 erf81
// SPDX-License-Identifier: Apache-2.0

/**
 * Settings & ZAU Theme Studio Drawer Controller for ZAU Console 2.0.
 * Clicking the gear icon opens ZAU Theme Studio by default, with a one-click
 * tab to General Settings (Hotkey, Bridge, Safety, Categories, Favorites, About).
 */
'use strict';

const { CATEGORIES } = require('../commands/index.js');
const { ICONS } = require('./icons.js');
const { ThemeStudioUI } = require('./themeStudioUI.js');

const TOGGLEABLE_CATEGORIES = CATEGORIES.filter((c) => c !== 'All');

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

class SettingsUI {
  constructor({
    container,
    storage,
    registry,
    bridgeClient,
    onClose,
    onStateChanged,
    onPreviewTheme,
    onCommitTheme,
  }) {
    this._container = container;
    this._storage = storage;
    this._registry = registry;
    this._bridgeClient = bridgeClient;
    this._onClose = onClose;
    this._onStateChanged = onStateChanged;
    this._onPreviewTheme = onPreviewTheme;
    this._onCommitTheme = onCommitTheme;
    this._visible = false;
    this._activeTab = 'studio'; // 'studio' | 'general'

    this._themeStudio = new ThemeStudioUI({
      storage,
      onPreviewTheme: (draft) => {
        if (typeof this._onPreviewTheme === 'function') this._onPreviewTheme(draft);
      },
      onCommitTheme: async (savedTheme) => {
        if (typeof this._onCommitTheme === 'function') await this._onCommitTheme(savedTheme);
      },
      onCancelTheme: () => {
        if (typeof this._onPreviewTheme === 'function') {
          this._onPreviewTheme(this._storage.getAuroraTheme());
        }
        this._onClose();
      },
    });
  }

  isVisible() {
    return this._visible;
  }

  show(tab = 'studio') {
    this._activeTab = tab;
    this._visible = true;
    this._themeStudio.beginEdit();
    this._container.classList.remove('hidden');
    this.render();
  }

  hide() {
    this._visible = false;
    // Revert any unsaved live preview back to persisted theme on dismiss
    if (typeof this._onPreviewTheme === 'function') {
      this._onPreviewTheme(this._storage.getAuroraTheme());
    }
    this._container.classList.add('hidden');
  }

  render() {
    if (!this._visible) return;

    this._container.innerHTML = `
      <div class="settings-header">
        <div class="icon-btn" id="zauSettingsBack" role="button" tabindex="0" title="Back to Quiet Trigger">${ICONS.back}</div>
        <span class="settings-title">${this._activeTab === 'studio' ? 'VAYRO THEME STUDIO' : 'SETTINGS'}</span>
        <div class="settings-tab-switch">
          <div class="stab-pill ${this._activeTab === 'studio' ? 'active' : ''}" data-stab="studio" role="button" tabindex="0">Theme</div>
          <div class="stab-pill ${this._activeTab === 'general' ? 'active' : ''}" data-stab="general" role="button" tabindex="0">Settings</div>
        </div>
      </div>
      <div id="zauSettingsBody" class="settings-body"></div>
    `;

    const backBtn = this._container.querySelector('#zauSettingsBack');
    if (backBtn) backBtn.addEventListener('click', () => this._onClose());

    this._container.querySelectorAll('[data-stab]').forEach((el) => {
      el.addEventListener('click', () => {
        const next = el.getAttribute('data-stab');
        if (next && next !== this._activeTab) {
          this._activeTab = next;
          this.render();
        }
      });
    });

    const bodyEl = this._container.querySelector('#zauSettingsBody');
    if (this._activeTab === 'studio') {
      this._themeStudio.renderInto(bodyEl);
    } else {
      this._renderGeneralSettings(bodyEl);
    }
  }

  _renderGeneralSettings(bodyEl) {
    const state = this._storage.getState();
    const s = state.settings;
    const bridge = this._bridgeClient ? this._bridgeClient.getStatus() : { status: 'disabled' };
    const isCtrlSpace = s.hotkey.replace(/\s+/g, '').toLowerCase() === 'ctrl+space';

    const favItemsHtml =
      state.favorites.length === 0
        ? `<div class="settings-empty">No favorites yet. Click ★ on any command to pin it.</div>`
        : state.favorites
            .map((id, idx) => {
              const cmd = this._registry.getById(id);
              const label = cmd ? cmd.name : id;
              return `
                <div class="fav-manage-row" data-fav-id="${escapeHtml(id)}">
                  <span class="fav-manage-name">${escapeHtml(label)}</span>
                  <div class="fav-manage-actions">
                    <div class="btn-mini ${idx === 0 ? 'is-disabled' : ''}" data-fav-action="up" role="button" title="Move Up">↑</div>
                    <div class="btn-mini ${idx === state.favorites.length - 1 ? 'is-disabled' : ''}" data-fav-action="down" role="button" title="Move Down">↓</div>
                    <div class="btn-mini btn-danger" data-fav-action="remove" role="button" title="Remove">×</div>
                  </div>
                </div>`;
            })
            .join('');

    const categoriesHtml = TOGGLEABLE_CATEGORIES.map((cat) => {
      const enabled = !s.disabledCategories.includes(cat);
      return `
        <label class="cat-check-item">
          <input type="checkbox" data-cat-toggle="${escapeHtml(cat)}" ${enabled ? 'checked' : ''} />
          <span>${escapeHtml(cat)}</span>
        </label>`;
    }).join('');

    const statusBadgeClass =
      bridge.status === 'connected'
        ? 'badge-ok'
        : bridge.status === 'connecting'
        ? 'badge-warn'
        : bridge.status === 'error'
        ? 'badge-err'
        : 'badge-muted';

    bodyEl.innerHTML = `
      <section class="settings-section">
        <div class="settings-section-title">Search & Safety</div>
        <div class="settings-row">
          <label for="zauDefaultCat">Default Category</label>
          <select id="zauDefaultCat" class="zau-select">
            ${CATEGORIES.map(
              (c) => `<option value="${escapeHtml(c)}" ${s.defaultSearchCategory === c ? 'selected' : ''}>${escapeHtml(c)}</option>`
            ).join('')}
          </select>
        </div>
        <label class="settings-toggle-row">
          <input type="checkbox" id="zauConfirmDestructive" ${s.confirmDestructiveActions ? 'checked' : ''} />
          <span>Confirm destructive commands before executing</span>
        </label>
      </section>

      <section class="settings-section">
        <div class="settings-section-title">Windows Hotkey Helper (Loopback)</div>
        <div class="settings-row">
          <label for="zauHotkeySelect">Global Hotkey</label>
          <select id="zauHotkeySelect" class="zau-select">
            <option value="Ctrl+Alt+Space" ${s.hotkey === 'Ctrl+Alt+Space' ? 'selected' : ''}>Ctrl + Alt + Space (Recommended)</option>
            <option value="Ctrl+Shift+Space" ${s.hotkey === 'Ctrl+Shift+Space' ? 'selected' : ''}>Ctrl + Shift + Space</option>
            <option value="Ctrl+Space" ${s.hotkey === 'Ctrl+Space' ? 'selected' : ''}>Ctrl + Space (Overrides PS Zoom)</option>
          </select>
        </div>
        ${
          isCtrlSpace
            ? `<div class="settings-warning">${ICONS.warning} <span>Warning: Ctrl + Space replaces Photoshop's native temporary Zoom In shortcut while the Windows Hotkey Helper is running.</span></div>`
            : ''
        }
        <label class="settings-toggle-row">
          <input type="checkbox" id="zauBridgeEnabled" ${s.bridgeEnabled ? 'checked' : ''} />
          <span>Connect to local Hotkey Helper (127.0.0.1)</span>
        </label>
        <div class="settings-row">
          <label for="zauBridgePort">Loopback Port</label>
          <input id="zauBridgePort" class="zau-input-sm" type="number" min="1024" max="65535" value="${s.bridgePort}" />
        </div>
        <div class="settings-row">
          <label for="zauBridgeToken">Session Token</label>
          <input id="zauBridgeToken" class="zau-input-sm" type="password" placeholder="Paste token from helper" value="${escapeHtml(s.bridgeToken)}" />
        </div>
        <div class="settings-bridge-status">
          <span>Status:</span>
          <span class="status-badge ${statusBadgeClass}">${escapeHtml(bridge.status.toUpperCase())}</span>
          ${bridge.lastError ? `<div class="bridge-err-msg">${escapeHtml(bridge.lastError)}</div>` : ''}
        </div>
      </section>

      <section class="settings-section">
        <div class="settings-section-title">Categories</div>
        <div class="cat-check-grid">${categoriesHtml}</div>
      </section>

      <section class="settings-section">
        <div class="settings-section-title">Favorites (${state.favorites.length})</div>
        <div class="fav-manage-list">${favItemsHtml}</div>
      </section>

      <section class="settings-section">
        <div class="settings-section-title">History & Reset</div>
        <div class="settings-btn-row">
          <div id="zauClearRecent" class="btn-secondary" role="button" tabindex="0">Clear Recent (${state.recentCommands.length})</div>
          <div id="zauResetSettings" class="btn-danger-outline" role="button" tabindex="0">Reset All</div>
        </div>
      </section>

      <section class="settings-section settings-about">
        <div class="settings-section-title">About Quiet Trigger</div>
        <div class="about-line"><strong>Quiet Trigger</strong> by <strong>VAYRO</strong> · v2.1.0</div>
        <div class="about-line muted">Less searching. More creating.</div>
        <div class="about-line">Adobe Photoshop UXP API v2 · Manifest v5 · 100% Local &amp; Offline</div>
        <div class="about-line muted">Registered commands: ${this._registry.size()} · Active theme: ${escapeHtml(state.auroraTheme.customName || state.auroraTheme.preset)}</div>
      </section>
    `;

    this._bindGeneralEvents(bodyEl);
  }

  _bindGeneralEvents(bodyEl) {
    const defCatSel = bodyEl.querySelector('#zauDefaultCat');
    if (defCatSel) {
      defCatSel.addEventListener('change', async (e) => {
        await this._storage.updateSettings({ defaultSearchCategory: e.target.value });
        this._onStateChanged();
      });
    }

    const confirmChk = bodyEl.querySelector('#zauConfirmDestructive');
    if (confirmChk) {
      confirmChk.addEventListener('change', async (e) => {
        await this._storage.updateSettings({ confirmDestructiveActions: e.target.checked });
        this._onStateChanged();
      });
    }

    const hotkeySel = bodyEl.querySelector('#zauHotkeySelect');
    if (hotkeySel) {
      hotkeySel.addEventListener('change', async (e) => {
        await this._storage.updateSettings({ hotkey: e.target.value });
        this.render();
        this._onStateChanged();
      });
    }

    const bridgeChk = bodyEl.querySelector('#zauBridgeEnabled');
    const bridgePort = bodyEl.querySelector('#zauBridgePort');
    const bridgeToken = bodyEl.querySelector('#zauBridgeToken');
    const syncBridgeSettings = async () => {
      await this._storage.updateSettings({
        bridgeEnabled: Boolean(bridgeChk && bridgeChk.checked),
        bridgePort: bridgePort ? parseInt(bridgePort.value, 10) || 47821 : 47821,
        bridgeToken: bridgeToken ? bridgeToken.value.trim() : '',
      });
      this._onStateChanged({ reconnectBridge: true });
      this.render();
    };
    if (bridgeChk) bridgeChk.addEventListener('change', syncBridgeSettings);
    if (bridgePort) bridgePort.addEventListener('change', syncBridgeSettings);
    if (bridgeToken) bridgeToken.addEventListener('change', syncBridgeSettings);

    bodyEl.querySelectorAll('[data-cat-toggle]').forEach((input) => {
      input.addEventListener('change', async () => {
        const disabled = [];
        bodyEl.querySelectorAll('[data-cat-toggle]').forEach((el) => {
          if (!el.checked) disabled.push(el.getAttribute('data-cat-toggle'));
        });
        await this._storage.updateSettings({ disabledCategories: disabled });
        this._onStateChanged();
      });
    });

    bodyEl.querySelectorAll('[data-fav-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('[data-fav-id]');
        if (!row) return;
        const id = row.getAttribute('data-fav-id');
        const action = btn.getAttribute('data-fav-action');
        if (action === 'up' || action === 'down') {
          await this._storage.moveFavorite(id, action);
        } else if (action === 'remove') {
          await this._storage.removeFavorite(id);
        }
        this.render();
        this._onStateChanged();
      });
    });

    const clearRecentBtn = bodyEl.querySelector('#zauClearRecent');
    if (clearRecentBtn) {
      clearRecentBtn.addEventListener('click', async () => {
        await this._storage.clearRecentHistory();
        this.render();
        this._onStateChanged();
      });
    }

    const resetBtn = bodyEl.querySelector('#zauResetSettings');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        await this._storage.resetSettings();
        this._themeStudio.beginEdit();
        if (typeof this._onCommitTheme === 'function') {
          await this._onCommitTheme(this._storage.getAuroraTheme());
        }
        this.render();
        this._onStateChanged({ reconnectBridge: true });
      });
    }
  }
}

module.exports = { SettingsUI };
