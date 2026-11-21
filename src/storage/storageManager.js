/**
 * Persistent Storage Manager for ZAU Console 2.0.
 * Uses Photoshop UXP localFileSystem.getDataFolder() as primary store,
 * with localStorage fallback and pluggable adapter for unit testing.
 * Preserves Favorites, Recents, Bridge credentials, and ZAU Aurora Theme Studio state.
 */
'use strict';

const { getUXP } = require('../core/psEnv.js');
const { createThemeFromPreset, sanitizeTheme } = require('../theme/themeSystem.js');

const STATE_FILENAME = 'zau-console-state.json';
const LOCAL_STORAGE_KEY = 'zau_console_state_v1';
const MAX_RECENT = 20;
const MAX_CUSTOM_THEMES = 12;

const DEFAULT_SETTINGS = Object.freeze({
  theme: 'auto', // legacy appearance flag kept synchronized with auroraTheme.appearance
  confirmDestructiveActions: true,
  defaultSearchCategory: 'All',
  hotkey: 'Ctrl+Alt+Space',
  disabledCategories: [],
  bridgeEnabled: false,
  bridgePort: 47821,
  bridgeToken: '',
});

function createDefaultState() {
  return {
    favorites: [],
    recentCommands: [],
    settings: {
      ...DEFAULT_SETTINGS,
      disabledCategories: [],
    },
    auroraTheme: createThemeFromPreset('aurora'),
    savedCustomThemes: [],
  };
}

function sanitizeCustomThemes(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const clean = sanitizeTheme(item);
    const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `custom_${out.length + 1}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const name = typeof item.name === 'string' && item.name.trim()
      ? item.name.trim().slice(0, 32)
      : clean.customName || `Custom ${out.length + 1}`;
    out.push({
      id,
      name,
      theme: { ...clean, preset: 'custom', customName: name },
    });
    if (out.length >= MAX_CUSTOM_THEMES) break;
  }
  return out;
}

function sanitizeState(raw) {
  const def = createDefaultState();
  if (!raw || typeof raw !== 'object') return def;

  const favorites = Array.isArray(raw.favorites)
    ? [...new Set(raw.favorites.filter((id) => typeof id === 'string'))]
    : [];

  const recentCommands = Array.isArray(raw.recentCommands)
    ? [...new Set(raw.recentCommands.filter((id) => typeof id === 'string'))].slice(0, MAX_RECENT)
    : [];

  const s = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
  const legacyTheme = ['auto', 'dark', 'light'].includes(s.theme) ? s.theme : def.settings.theme;

  const auroraTheme = raw.auroraTheme
    ? sanitizeTheme(raw.auroraTheme)
    : createThemeFromPreset('aurora');

  const savedCustomThemes = sanitizeCustomThemes(raw.savedCustomThemes);

  return {
    favorites,
    recentCommands,
    settings: {
      theme: legacyTheme,
      confirmDestructiveActions:
        typeof s.confirmDestructiveActions === 'boolean'
          ? s.confirmDestructiveActions
          : def.settings.confirmDestructiveActions,
      defaultSearchCategory:
        typeof s.defaultSearchCategory === 'string'
          ? s.defaultSearchCategory
          : def.settings.defaultSearchCategory,
      hotkey: typeof s.hotkey === 'string' && s.hotkey.trim() ? s.hotkey.trim() : def.settings.hotkey,
      disabledCategories: Array.isArray(s.disabledCategories)
        ? s.disabledCategories.filter((c) => typeof c === 'string')
        : [],
      bridgeEnabled: Boolean(s.bridgeEnabled),
      bridgePort: Number.isInteger(s.bridgePort) && s.bridgePort >= 1024 && s.bridgePort <= 65535
        ? s.bridgePort
        : def.settings.bridgePort,
      bridgeToken: typeof s.bridgeToken === 'string' ? s.bridgeToken.trim() : '',
    },
    auroraTheme,
    savedCustomThemes,
  };
}

class StorageManager {
  constructor(adapter = null) {
    this._adapter = adapter;
    this._state = createDefaultState();
    this._loaded = false;
  }

  async _readRaw() {
    if (this._adapter) {
      return this._adapter.read();
    }

    const uxp = getUXP();
    if (uxp && uxp.storage && uxp.storage.localFileSystem) {
      try {
        const dataFolder = await uxp.storage.localFileSystem.getDataFolder();
        const entry = await dataFolder.getEntry(STATE_FILENAME);
        const text = await entry.read();
        return JSON.parse(String(text).replace(/^\uFEFF/, ''));
      } catch (_) {
        // File may not exist yet; fall through to localStorage
      }
    }

    if (typeof localStorage !== 'undefined') {
      try {
        const text = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (text) return JSON.parse(text);
      } catch (_) {
        // Ignore parse error
      }
    }

    return null;
  }

  async _writeRaw(state) {
    const serialized = JSON.stringify(state, null, 2);

    if (this._adapter) {
      await this._adapter.write(state);
      return;
    }

    const uxp = getUXP();
    if (uxp && uxp.storage && uxp.storage.localFileSystem) {
      try {
        const dataFolder = await uxp.storage.localFileSystem.getDataFolder();
        const file = await dataFolder.createFile(STATE_FILENAME, { overwrite: true });
        await file.write(serialized);
      } catch (err) {
        console.warn('[ZAU Storage] Failed to write to UXP dataFolder:', err);
      }
    }

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
      } catch (_) {
        // Ignore quota errors
      }
    }
  }

  async load() {
    const raw = await this._readRaw();
    this._state = sanitizeState(raw);
    this._loaded = true;
    return this.getState();
  }

  async save() {
    await this._writeRaw(this._state);
  }

  getState() {
    return {
      favorites: [...this._state.favorites],
      recentCommands: [...this._state.recentCommands],
      settings: {
        ...this._state.settings,
        disabledCategories: [...this._state.settings.disabledCategories],
      },
      auroraTheme: { ...this._state.auroraTheme },
      savedCustomThemes: this._state.savedCustomThemes.map((t) => ({
        id: t.id,
        name: t.name,
        theme: { ...t.theme },
      })),
    };
  }

  getSettings() {
    return this.getState().settings;
  }

  getAuroraTheme() {
    return { ...this._state.auroraTheme };
  }

  getSavedCustomThemes() {
    return this.getState().savedCustomThemes;
  }

  async setAuroraTheme(nextTheme) {
    const clean = sanitizeTheme(nextTheme);
    this._state.auroraTheme = clean;
    this._state.settings.theme = clean.appearance;
    await this.save();
    return this.getAuroraTheme();
  }

  async resetAuroraTheme(presetId = 'aurora') {
    return this.setAuroraTheme(createThemeFromPreset(presetId));
  }

  async saveCustomTheme(name, themeConfig) {
    const label = typeof name === 'string' && name.trim()
      ? name.trim().slice(0, 32)
      : `Custom ${this._state.savedCustomThemes.length + 1}`;
    const clean = sanitizeTheme({ ...themeConfig, preset: 'custom', customName: label });
    const id = `custom_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || Date.now()}`;

    const existingIdx = this._state.savedCustomThemes.findIndex((t) => t.id === id);
    const entry = { id, name: label, theme: clean };
    if (existingIdx >= 0) {
      this._state.savedCustomThemes[existingIdx] = entry;
    } else {
      this._state.savedCustomThemes.unshift(entry);
      if (this._state.savedCustomThemes.length > MAX_CUSTOM_THEMES) {
        this._state.savedCustomThemes.pop();
      }
    }
    this._state.auroraTheme = clean;
    await this.save();
    return entry;
  }

  async deleteCustomTheme(id) {
    const prevLen = this._state.savedCustomThemes.length;
    this._state.savedCustomThemes = this._state.savedCustomThemes.filter((t) => t.id !== id);
    if (this._state.savedCustomThemes.length !== prevLen) {
      await this.save();
      return true;
    }
    return false;
  }

  getFavorites() {
    return [...this._state.favorites];
  }

  getRecentCommands() {
    return [...this._state.recentCommands];
  }

  isFavorite(commandId) {
    return this._state.favorites.includes(commandId);
  }

  async addFavorite(commandId) {
    if (!commandId || this._state.favorites.includes(commandId)) return false;
    this._state.favorites.push(commandId);
    await this.save();
    return true;
  }

  async removeFavorite(commandId) {
    const idx = this._state.favorites.indexOf(commandId);
    if (idx === -1) return false;
    this._state.favorites.splice(idx, 1);
    await this.save();
    return true;
  }

  async toggleFavorite(commandId) {
    if (this.isFavorite(commandId)) {
      await this.removeFavorite(commandId);
      return false;
    }
    await this.addFavorite(commandId);
    return true;
  }

  async moveFavorite(commandId, direction) {
    const idx = this._state.favorites.indexOf(commandId);
    if (idx === -1) return false;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= this._state.favorites.length) return false;
    const [item] = this._state.favorites.splice(idx, 1);
    this._state.favorites.splice(targetIdx, 0, item);
    await this.save();
    return true;
  }

  async recordRecent(commandId) {
    if (!commandId) return;
    this._state.recentCommands = [
      commandId,
      ...this._state.recentCommands.filter((id) => id !== commandId),
    ].slice(0, MAX_RECENT);
    await this.save();
  }

  async clearRecentHistory() {
    this._state.recentCommands = [];
    await this.save();
  }

  async updateSettings(patch) {
    const merged = sanitizeState({
      ...this._state,
      settings: {
        ...this._state.settings,
        ...(patch || {}),
      },
    });
    this._state.settings = merged.settings;
    if (patch && ['auto', 'dark', 'light'].includes(patch.theme)) {
      this._state.auroraTheme = sanitizeTheme({
        ...this._state.auroraTheme,
        appearance: patch.theme,
      });
    }
    await this.save();
    return this.getSettings();
  }

  async resetSettings() {
    // Preserve bridgeToken and bridgePort when resetting general settings?
    // Keep resetSettings resetting general preferences + Aurora theme cleanly.
    const keepToken = this._state.settings.bridgeToken;
    const keepPort = this._state.settings.bridgePort;
    const keepBridgeEnabled = this._state.settings.bridgeEnabled;
    this._state.settings = {
      ...createDefaultState().settings,
      bridgeToken: keepToken,
      bridgePort: keepPort,
      bridgeEnabled: keepBridgeEnabled,
    };
    this._state.auroraTheme = createThemeFromPreset('aurora');
    await this.save();
    return this.getSettings();
  }
}

module.exports = {
  StorageManager,
  DEFAULT_SETTINGS,
  createDefaultState,
  sanitizeState,
};
