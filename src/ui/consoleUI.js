/**
 * Main Command Palette UI Controller for ZAU Console 2.0 (Aurora Design System).
 * Handles live Aurora CSS variables, instant debounced search, compact Favorites/Recent
 * + Category dropdown navigation, monochrome icon tile rows, keyboard navigation,
 * document context bar, destructive confirmation, and inline input modal.
 */
'use strict';

const { CATEGORIES } = require('../commands/index.js');
const { evaluateCommandAvailability } = require('../core/contextDetector.js');
const { computeCssVariables, sanitizeTheme } = require('../theme/themeSystem.js');
const { ICONS, getCommandIcon } = require('./icons.js');

const FILTER_TABS = Object.freeze(['All', 'Favorites', 'Recent', ...CATEGORIES.filter((c) => c !== 'All')]);

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatBreadcrumb(cmd) {
  const cat = cmd.category || 'General';
  if (!cmd.subcategory) return cat;
  const sub = cmd.subcategory
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
  return `${cat} / ${sub}`;
}

class ConsoleUI {
  constructor({ root, registry, searchEngine, executor, storage, settingsUI }) {
    this._root = root;
    this._registry = registry;
    this._searchEngine = searchEngine;
    this._executor = executor;
    this._storage = storage;
    this._settingsUI = settingsUI;

    this._query = '';
    this._activeCategory = 'All';
    this._results = [];
    this._selectedIndex = 0;
    this._context = null;
    this._debounceTimer = null;
    this._statusTimer = null;
    this._confirmResolver = null;
    this._inputResolver = null;
    this._cleanups = [];

    this._els = {
      searchInput: root.querySelector('#zauSearchInput'),
      clearBtn: root.querySelector('#zauClearSearch'),
      settingsBtn: root.querySelector('#zauSettingsBtn'),
      bridgeDot: root.querySelector('#zauBridgeDot'),
      loadingBar: root.querySelector('#zauLoadingBar'),
      navFavBtn: root.querySelector('#zauNavFavorites'),
      navRecentBtn: root.querySelector('#zauNavRecent'),
      categorySelect: root.querySelector('#zauCategorySelect'),
      resultsList: root.querySelector('#zauResultsList'),
      docInfo: root.querySelector('#zauDocInfo'),
      statusText: root.querySelector('#zauStatusText'),
      confirmOverlay: root.querySelector('#zauConfirmOverlay'),
      confirmTitle: root.querySelector('#zauConfirmTitle'),
      confirmMessage: root.querySelector('#zauConfirmMessage'),
      confirmTip: root.querySelector('#zauConfirmTip'),
      confirmCancel: root.querySelector('#zauConfirmCancel'),
      confirmOk: root.querySelector('#zauConfirmOk'),
      inputOverlay: root.querySelector('#zauInputOverlay'),
      inputTitle: root.querySelector('#zauInputTitle'),
      inputField: root.querySelector('#zauInputField'),
      inputCancel: root.querySelector('#zauInputCancel'),
      inputOk: root.querySelector('#zauInputOk'),
      logoEl: root.querySelector('#zauBrandLogo'),
      searchIconEl: root.querySelector('#zauSearchIcon'),
    };

    this._hydrateIcons();
    this._bindEvents();
  }

  _hydrateIcons() {
    if (this._els.logoEl) this._els.logoEl.innerHTML = ICONS.logo;
    if (this._els.searchIconEl) this._els.searchIconEl.innerHTML = ICONS.search;
    if (this._els.settingsBtn) this._els.settingsBtn.innerHTML = ICONS.settings;
    if (this._els.clearBtn) this._els.clearBtn.innerHTML = ICONS.clear;
  }

  _listen(target, event, handler) {
    if (!target) return;
    target.addEventListener(event, handler);
    this._cleanups.push(() => target.removeEventListener(event, handler));
  }

  _bindEvents() {
    this._listen(this._els.searchInput, 'input', (e) => {
      this._query = e.target.value || '';
      this._updateClearButton();
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        this._debounceTimer = null;
        this._selectedIndex = 0;
        this.refreshResults();
      }, 25);
    });

    this._listen(this._els.clearBtn, 'click', () => {
      this.clearSearch();
      this.focusSearch();
    });

    this._listen(this._els.settingsBtn, 'click', () => {
      if (this._settingsUI.isVisible()) {
        this._settingsUI.hide();
        this.focusSearch();
      } else {
        this._settingsUI.show('studio');
      }
    });

    this._listen(this._els.navFavBtn, 'click', () => {
      this.setCategory(this._activeCategory === 'Favorites' ? 'All' : 'Favorites');
      this.focusSearch();
    });

    this._listen(this._els.navRecentBtn, 'click', () => {
      this.setCategory(this._activeCategory === 'Recent' ? 'All' : 'Recent');
      this.focusSearch();
    });

    this._listen(this._els.categorySelect, 'change', (e) => {
      this.setCategory(e.target.value || 'All');
      this.focusSearch();
    });

    this._listen(this._els.confirmCancel, 'click', () => this._resolveConfirm(false));
    this._listen(this._els.confirmOk, 'click', () => this._resolveConfirm(true));

    this._listen(this._els.inputCancel, 'click', () => this._resolveInput(null));
    this._listen(this._els.inputOk, 'click', () => {
      const val = this._els.inputField ? this._els.inputField.value : '';
      this._resolveInput(val);
    });

    this._listen(document, 'keydown', (e) => this._handleKeyDown(e));
  }

  _handleKeyDown(e) {
    if (this._inputResolver) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this._resolveInput(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const val = this._els.inputField ? this._els.inputField.value : '';
        this._resolveInput(val);
      }
      return;
    }

    if (this._confirmResolver) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this._resolveConfirm(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this._resolveConfirm(true);
      }
      return;
    }

    if (this._settingsUI && this._settingsUI.isVisible()) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this._settingsUI.hide();
        this.focusSearch();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (this._results.length > 0) {
        this._selectedIndex = (this._selectedIndex + 1) % this._results.length;
        this._renderResults();
        this._scrollSelectedIntoView();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this._results.length > 0) {
        this._selectedIndex = (this._selectedIndex - 1 + this._results.length) % this._results.length;
        this._renderResults();
        this._scrollSelectedIntoView();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = this._results[this._selectedIndex];
      if (item) {
        this.executeCommand(item.command);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (this._query) {
        this.clearSearch();
      } else if (this._els.searchInput) {
        this._els.searchInput.blur();
        this.setStatus('Dismissed (Esc)');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const tabs = this._getVisibleTabs();
      const idx = tabs.indexOf(this._activeCategory);
      const nextIdx = e.shiftKey
        ? (idx - 1 + tabs.length) % tabs.length
        : (idx + 1) % tabs.length;
      this.setCategory(tabs[nextIdx]);
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      if (this._els.searchInput && document.activeElement !== this._els.searchInput) {
        e.preventDefault();
        this._els.searchInput.focus();
        if (typeof this._els.searchInput.select === 'function') {
          this._els.searchInput.select();
        }
      }
    } else if (
      e.key &&
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      document.activeElement !== this._els.searchInput
    ) {
      this.focusSearch();
    }
  }

  _getVisibleTabs() {
    const disabled = new Set(this._storage.getSettings().disabledCategories || []);
    return FILTER_TABS.filter((t) => !disabled.has(t));
  }

  applyAuroraTheme(themeConfig) {
    const clean = sanitizeTheme(themeConfig || this._storage.getAuroraTheme());
    const vars = computeCssVariables(clean);
    if (this._root) {
      this._root.setAttribute('data-theme', clean.appearance);
      this._root.setAttribute('data-surface', clean.surfaceStyle);
      this._root.setAttribute('data-glow', clean.glowIntensity);
      this._root.setAttribute('data-density', clean.density);
      for (const [k, v] of Object.entries(vars)) {
        this._root.style.setProperty(k, v);
      }
    }
    if (document.documentElement) {
      document.documentElement.setAttribute('data-theme', clean.appearance);
    }
  }

  applyTheme() {
    this.applyAuroraTheme(this._storage.getAuroraTheme());
  }

  setBridgeConnected(connected) {
    if (!this._els.bridgeDot) return;
    if (connected) {
      this._els.bridgeDot.classList.remove('hidden');
    } else {
      this._els.bridgeDot.classList.add('hidden');
    }
  }

  initFromSettings() {
    this.applyAuroraTheme(this._storage.getAuroraTheme());
    const defCat = this._storage.getSettings().defaultSearchCategory || 'All';
    const tabs = this._getVisibleTabs();
    this._activeCategory = tabs.includes(defCat) ? defCat : 'All';
    this._renderNavigation();
    this.refreshResults();
  }

  setContext(context) {
    this._context = context;
    this._renderDocInfo();
    this._renderResults();
  }

  setCategory(category) {
    this._activeCategory = category;
    this._selectedIndex = 0;
    this._renderNavigation();
    this.refreshResults();
  }

  clearSearch() {
    this._query = '';
    if (this._els.searchInput) this._els.searchInput.value = '';
    this._updateClearButton();
    this._selectedIndex = 0;
    this.refreshResults();
  }

  focusSearch() {
    if (this._els.searchInput) {
      this._els.searchInput.focus();
      if (typeof this._els.searchInput.select === 'function') {
        this._els.searchInput.select();
      }
    }
  }

  _updateClearButton() {
    if (!this._els.clearBtn) return;
    if (this._query) {
      this._els.clearBtn.classList.remove('hidden');
    } else {
      this._els.clearBtn.classList.add('hidden');
    }
  }

  _setLoading(active) {
    if (!this._els.loadingBar) return;
    if (active) {
      this._els.loadingBar.classList.remove('hidden');
    } else {
      this._els.loadingBar.classList.add('hidden');
    }
  }

  refreshResults() {
    const state = this._storage.getState();
    this._results = this._searchEngine.search(this._query, {
      category: this._activeCategory,
      favorites: state.favorites,
      recentCommands: state.recentCommands,
      disabledCategories: state.settings.disabledCategories,
      limit: 60,
    });
    if (this._selectedIndex >= this._results.length) {
      this._selectedIndex = Math.max(0, this._results.length - 1);
    }
    this._renderNavigation();
    this._renderResults();
  }

  _renderNavigation() {
    if (this._els.navFavBtn) {
      this._els.navFavBtn.classList.toggle('active', this._activeCategory === 'Favorites');
    }
    if (this._els.navRecentBtn) {
      this._els.navRecentBtn.classList.toggle('active', this._activeCategory === 'Recent');
    }
    if (this._els.categorySelect) {
      const disabled = new Set(this._storage.getSettings().disabledCategories || []);
      const cats = CATEGORIES.filter((c) => !disabled.has(c));
      const selectedCat = cats.includes(this._activeCategory) ? this._activeCategory : 'All';
      this._els.categorySelect.innerHTML = cats
        .map(
          (c) => `<option value="${escapeHtml(c)}" ${c === selectedCat ? 'selected' : ''}>${escapeHtml(c === 'All' ? 'All Categories' : c)}</option>`
        )
        .join('');
    }
  }

  _renderDocInfo() {
    if (!this._els.docInfo) return;
    const ctx = this._context;
    if (!ctx || !ctx.hasDocument) {
      this._els.docInfo.innerHTML = `<span class="doc-pill muted">No open document</span>`;
      return;
    }
    const parts = [
      `<span class="doc-pill" title="${escapeHtml(ctx.documentName)}">${escapeHtml(ctx.documentName)}</span>`,
      `<span class="doc-meta">${ctx.width}×${ctx.height}px</span>`,
    ];
    if (ctx.hasActiveLayer) {
      const lockTag = ctx.isLocked ? ' · Locked' : '';
      parts.push(
        `<span class="doc-meta" title="Active Layer">${escapeHtml(ctx.layerName)} (${escapeHtml(ctx.layerKind || 'layer')}${lockTag})</span>`
      );
    } else {
      parts.push(`<span class="doc-meta warn">No layer</span>`);
    }
    if (ctx.hasSelection) {
      parts.push(`<span class="doc-tag">SEL</span>`);
    }
    this._els.docInfo.innerHTML = parts.join('');
  }

  _renderResults() {
    if (!this._els.resultsList) return;

    if (this._results.length === 0) {
      this._els.resultsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-title">No matching commands</div>
          <div class="empty-sub">Try "blur", "curves", "crop", "mask", or press Tab to switch sections.</div>
        </div>`;
      return;
    }

    const html = this._results
      .map((item, idx) => {
        const cmd = item.command;
        const avail = evaluateCommandAvailability(cmd, this._context);
        const isSelected = idx === this._selectedIndex;
        const breadcrumb = formatBreadcrumb(cmd);
        const desc = avail.allowed ? cmd.description : avail.reason;
        const iconSvg = getCommandIcon(cmd);

        const rowInner = `
          <div class="result-row-inner ${avail.allowed ? '' : 'disabled'}">
            <div class="cmd-tile">${iconSvg}</div>
            <div class="result-main">
              <div class="result-top">
                <span class="result-name">${escapeHtml(cmd.name)}</span>
                ${cmd.destructive ? `<span class="tag-destructive" title="Destructive action">!</span>` : ''}
              </div>
              <div class="result-crumb">${escapeHtml(breadcrumb)}</div>
              <div class="result-desc">${escapeHtml(desc)}</div>
            </div>
            <div class="result-right">
              ${cmd.shortcut ? `<span class="tag-shortcut">${escapeHtml(cmd.shortcut)}</span>` : ''}
              <div
                class="fav-btn ${item.isFavorite ? 'is-fav' : ''}"
                data-fav-toggle="${escapeHtml(cmd.id)}"
                role="button"
                tabindex="0"
                title="${item.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}"
              >${item.isFavorite ? ICONS.starFilled : ICONS.starOutline}</div>
            </div>
          </div>`;

        return `
          <div
            class="result-row ${isSelected ? 'selected' : ''}"
            data-index="${idx}"
            data-cmd-id="${escapeHtml(cmd.id)}"
            role="option"
            aria-selected="${isSelected}"
          >${rowInner}</div>`;
      })
      .join('');

    this._els.resultsList.innerHTML = html;

    this._els.resultsList.querySelectorAll('.result-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.fav-btn')) return;
        const idx = parseInt(row.getAttribute('data-index'), 10);
        this._selectedIndex = idx;
        this._renderResults();
        const item = this._results[idx];
        if (item) this.executeCommand(item.command);
      });
    });

    this._els.resultsList.querySelectorAll('.fav-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-fav-toggle');
        const added = await this._storage.toggleFavorite(id);
        this.setStatus(added ? 'Pinned to Favorites' : 'Removed Favorite');
        this.refreshResults();
      });
    });
  }

  _scrollSelectedIntoView() {
    if (!this._els.resultsList) return;
    const active = this._els.resultsList.querySelector('.result-row.selected');
    if (active && typeof active.scrollIntoView === 'function') {
      active.scrollIntoView({ block: 'nearest' });
    }
  }

  requestDestructiveConfirm(command) {
    return new Promise((resolve) => {
      this._confirmResolver = resolve;
      if (this._els.confirmTitle) {
        this._els.confirmTitle.textContent = `Confirm: ${command.name}`;
      }
      if (this._els.confirmMessage) {
        this._els.confirmMessage.textContent = command.description;
      }
      if (this._els.confirmTip) {
        this._els.confirmTip.textContent = command.nonDestructiveTip || 'This action can be undone with Ctrl+Z.';
      }
      if (this._els.confirmOverlay) {
        this._els.confirmOverlay.classList.remove('hidden');
      }
    });
  }

  _resolveConfirm(confirmed) {
    if (this._els.confirmOverlay) {
      this._els.confirmOverlay.classList.add('hidden');
    }
    const resolver = this._confirmResolver;
    this._confirmResolver = null;
    if (resolver) resolver(confirmed);
  }

  requestCommandInput(command, context) {
    return new Promise((resolve) => {
      this._inputResolver = resolve;
      const spec = command.requiresInput || {};
      if (this._els.inputTitle) {
        this._els.inputTitle.textContent = spec.title || command.name;
      }
      if (this._els.inputField) {
        this._els.inputField.placeholder = spec.placeholder || '';
        this._els.inputField.value = (context && context.layerName) || '';
      }
      if (this._els.inputOverlay) {
        this._els.inputOverlay.classList.remove('hidden');
      }
      if (this._els.inputField) {
        this._els.inputField.focus();
        if (typeof this._els.inputField.select === 'function') {
          this._els.inputField.select();
        }
      }
    });
  }

  _resolveInput(value) {
    if (this._els.inputOverlay) {
      this._els.inputOverlay.classList.add('hidden');
    }
    const resolver = this._inputResolver;
    this._inputResolver = null;
    if (resolver) resolver(value);
  }

  async executeCommand(command, overrides = {}) {
    this._setLoading(true);
    this.setStatus(`Running ${command.name}...`, 'normal', 0);
    const res = await this._executor.execute(command, {
      context: this._context,
      ...overrides,
    });
    this._setLoading(false);

    if (res.ok) {
      if (res.result && res.result.infoMessage) {
        this.setStatus(res.result.infoMessage, 'ok', 6000);
      } else {
        this.setStatus(`Done: ${command.name}`, 'ok');
      }
      this.refreshResults();
    } else if (res.cancelled) {
      this.setStatus(res.message || 'Cancelled');
    } else {
      const msg = res.suggestion ? `${res.error} ${res.suggestion}` : res.error;
      this.setStatus(msg || 'Command failed', 'error', 5000);
    }
    return res;
  }

  setStatus(message, tone = 'normal', durationMs = 3000) {
    if (!this._els.statusText) return;
    this._els.statusText.textContent = message;
    this._els.statusText.className = `status-text tone-${tone}`;
    if (this._statusTimer) clearTimeout(this._statusTimer);
    if (durationMs > 0) {
      this._statusTimer = setTimeout(() => {
        this._statusTimer = null;
        if (this._els.statusText) {
          this._els.statusText.textContent = `${this._results.length} ready`;
          this._els.statusText.className = 'status-text tone-normal';
        }
      }, durationMs);
    }
  }

  destroy() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    if (this._statusTimer) clearTimeout(this._statusTimer);
    for (const fn of this._cleanups) fn();
    this._cleanups = [];
  }
}

module.exports = { ConsoleUI };
