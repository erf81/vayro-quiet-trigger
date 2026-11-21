/**
 * ZAU Console 2.0 — Adobe Photoshop UXP Plugin Entrypoint (API v2, Manifest v5)
 *
 * Lifecycle architecture:
 * 1. Singleton corePromise initializes registry, storage, Aurora theme, and optional
 *    loopback bridge at Photoshop startup (loadEvent: "startup").
 * 2. Panel UI mounts lazily via uiPromise when opened and applies Aurora CSS variables live.
 * 3. Bidirectional theme sync via the single existing authenticated BridgeClient (never triggers
 *    command execution and never spawns duplicate WebSocket connections).
 */
'use strict';

const { getUXP } = require('./src/core/psEnv.js');
const { getCurrentContext, subscribeContextChanges } = require('./src/core/contextDetector.js');
const { CommandExecutor } = require('./src/core/commandExecutor.js');
const { createDefaultRegistry } = require('./src/commands/index.js');
const { SearchEngine } = require('./src/search/searchEngine.js');
const { StorageManager } = require('./src/storage/storageManager.js');
const { BridgeClient } = require('./src/bridge/bridgeClient.js');
const { ConsoleUI } = require('./src/ui/consoleUI.js');
const { SettingsUI } = require('./src/ui/settingsUI.js');

console.log('[VAYRO Quiet Trigger 2.1.0] index.js evaluated successfully');

let coreState = null;
let corePromise = null;
let uiState = null;
let uiPromise = null;

async function writeDiagnosticLog(line) {
  try {
    const uxp = getUXP();
    if (uxp && uxp.storage && uxp.storage.localFileSystem) {
      const folder = await uxp.storage.localFileSystem.getDataFolder();
      let existing = '';
      try {
        const entry = await folder.getEntry('zau-diagnostics.log');
        existing = await entry.read();
      } catch (_) {}
      const lines = existing ? existing.split('\n').slice(-100) : [];
      lines.push(`[${new Date().toISOString()}] ${line}`);
      const file = await folder.createFile('zau-diagnostics.log', { overwrite: true });
      await file.write(lines.join('\n') + '\n');
    }
  } catch (_) {
    // Diagnostics must never break plugin operation
  }
}

function initBackgroundCore() {
  if (coreState) return Promise.resolve(coreState);
  if (corePromise) return corePromise;
  corePromise = _doInitBackgroundCore().catch((err) => {
    corePromise = null;
    throw err;
  });
  return corePromise;
}

async function _doInitBackgroundCore() {
  const registry = createDefaultRegistry();
  const searchEngine = new SearchEngine(registry.getAll());
  const storage = new StorageManager();
  await storage.load();

  const executor = new CommandExecutor({
    getSettings: () => storage.getSettings(),
    confirmDestructive: (cmd) => {
      if (uiState && uiState.consoleUI) {
        return uiState.consoleUI.requestDestructiveConfirm(cmd);
      }
      return Promise.resolve(false);
    },
    requestInput: (cmd, ctx) => {
      if (uiState && uiState.consoleUI) {
        return uiState.consoleUI.requestCommandInput(cmd, ctx);
      }
      return Promise.resolve(null);
    },
    onExecuted: async (cmd) => {
      await storage.recordRecent(cmd.id);
    },
  });

  const bridgeClient = new BridgeClient({
    onExecuteCommand: async (commandId, options = {}) => {
      const cmd = registry.getById(commandId);
      if (!cmd) return { ok: false, error: `Command "${commandId}" not found.` };
      const freshCtx = getCurrentContext();
      if (uiState && uiState.consoleUI) {
        uiState.consoleUI.setContext(freshCtx);
        const res = await uiState.consoleUI.executeCommand(cmd, { ...options, context: freshCtx });
        uiState.consoleUI.setContext(getCurrentContext());
        return res;
      }
      return executor.execute(cmd, {
        context: freshCtx,
        ...options,
      });
    },
    onFocusSearch: () => {
      if (uiState && uiState.settingsUI && uiState.settingsUI.isVisible()) {
        uiState.settingsUI.hide();
      }
      if (uiState && uiState.consoleUI) {
        uiState.consoleUI.focusSearch();
      }
    },
    onThemeUpdate: async (nextTheme, nextSavedCustom) => {
      const saved = await storage.setAuroraTheme(nextTheme);
      if (Array.isArray(nextSavedCustom)) {
        for (const ct of nextSavedCustom) {
          if (ct && ct.name && ct.theme) {
            await storage.saveCustomTheme(ct.name, ct.theme);
          }
        }
        await storage.setAuroraTheme(saved);
      }
      if (uiState && uiState.consoleUI) {
        uiState.consoleUI.setContext(getCurrentContext());
        uiState.consoleUI.applyAuroraTheme(saved);
      }
      if (uiState && uiState.settingsUI && uiState.settingsUI.isVisible()) {
        uiState.settingsUI.render();
      }
    },
    onToggleFavorite: async (commandId) => {
      await storage.toggleFavorite(commandId);
      if (uiState && uiState.consoleUI) {
        uiState.consoleUI.refreshResults();
      }
      return storage.getFavorites();
    },
    onGetCatalog: () => {
      const freshCtx = getCurrentContext();
      if (uiState && uiState.consoleUI) {
        uiState.consoleUI.setContext(freshCtx);
      }
      return {
        commands: registry.getAll().map((c) => ({
          id: c.id,
          name: c.name,
          category: c.category,
          subcategory: c.subcategory || '',
          description: c.description,
          keywords: c.keywords || [],
          aliases: c.aliases || [],
          shortcut: c.shortcut || null,
          destructive: Boolean(c.destructive),
        })),
        favorites: storage.getFavorites(),
        recentCommands: storage.getRecentCommands(),
        context: freshCtx,
        theme: storage.getAuroraTheme(),
        savedCustomThemes: storage.getSavedCustomThemes(),
      };
    },
    onStatusChange: (status) => {
      writeDiagnosticLog(`Bridge status=${status.status} err=${status.lastError || 'none'}`);
      if (uiState && uiState.consoleUI) {
        uiState.consoleUI.setBridgeConnected(status.status === 'connected');
      }
      if (uiState && uiState.settingsUI && uiState.settingsUI.isVisible()) {
        uiState.settingsUI.render();
      }
    },
  });

  const unsubscribeContext = subscribeContextChanges((ctx) => {
    if (uiState && uiState.consoleUI) {
      uiState.consoleUI.setContext(ctx);
    }
    bridgeClient.pushContext();
  });

  const initialSettings = storage.getSettings();
  if (initialSettings.bridgeEnabled) {
    bridgeClient.configure({
      enabled: true,
      port: initialSettings.bridgePort,
      token: initialSettings.bridgeToken,
    });
  }

  coreState = {
    registry,
    searchEngine,
    storage,
    executor,
    bridgeClient,
    unsubscribeContext,
  };

  await writeDiagnosticLog(`Core v2.1.0 initialized (${registry.size()} commands, PS=${getCurrentContext().photoshopVersion || 'unknown'}, theme=${storage.getAuroraTheme().preset})`);
  return coreState;
}

function mountPanelUI() {
  if (uiState) return Promise.resolve(uiState);
  if (uiPromise) return uiPromise;
  uiPromise = _doMountPanelUI().catch((err) => {
    uiPromise = null;
    throw err;
  });
  return uiPromise;
}

async function _doMountPanelUI() {
  const core = await initBackgroundCore();
  if (uiState) return uiState;

  const root = document.getElementById('zauApp');
  const settingsContainer = document.getElementById('zauSettingsPanel');
  if (!root || !settingsContainer) return null;

  let consoleUI = null;
  let settingsUI = null;

  settingsUI = new SettingsUI({
    container: settingsContainer,
    storage: core.storage,
    registry: core.registry,
    bridgeClient: core.bridgeClient,
    onClose: () => {
      settingsUI.hide();
      consoleUI.focusSearch();
    },
    onPreviewTheme: (draftTheme) => {
      if (consoleUI) consoleUI.applyAuroraTheme(draftTheme);
    },
    onCommitTheme: async (savedTheme) => {
      if (consoleUI) consoleUI.applyAuroraTheme(savedTheme);
      core.bridgeClient.pushTheme(savedTheme, core.storage.getSavedCustomThemes());
    },
    onStateChanged: (opts = {}) => {
      consoleUI.applyAuroraTheme(core.storage.getAuroraTheme());
      consoleUI.refreshResults();
      core.bridgeClient.pushContext();
      if (opts.reconnectBridge) {
        const s = core.storage.getSettings();
        core.bridgeClient.configure({
          enabled: s.bridgeEnabled,
          port: s.bridgePort,
          token: s.bridgeToken,
        });
      }
    },
  });

  consoleUI = new ConsoleUI({
    root,
    registry: core.registry,
    searchEngine: core.searchEngine,
    executor: core.executor,
    storage: core.storage,
    settingsUI,
  });

  consoleUI.initFromSettings();
  consoleUI.setContext(getCurrentContext());
  consoleUI.setBridgeConnected(core.bridgeClient.getStatus().status === 'connected');
  consoleUI.setStatus(`${core.registry.size()} ready`);

  uiState = { consoleUI, settingsUI };
  await writeDiagnosticLog('Panel UI v2.1.0 mounted');
  return uiState;
}

function unmountPanelUI() {
  uiPromise = null;
  if (!uiState) return;
  if (uiState.consoleUI) uiState.consoleUI.destroy();
  uiState = null;
}

function destroyAll() {
  unmountPanelUI();
  corePromise = null;
  if (coreState) {
    coreState.unsubscribeContext();
    coreState.bridgeClient.disconnect();
    coreState = null;
  }
}

const uxp = getUXP();
if (uxp && uxp.entrypoints && typeof uxp.entrypoints.setup === 'function') {
  uxp.entrypoints.setup({
    plugin: {
      async create() {
        try {
          await initBackgroundCore();
        } catch (err) {
          await writeDiagnosticLog(`Startup error: ${err && err.message ? err.message : err}`);
        }
      },
      destroy() {
        destroyAll();
      },
    },
    panels: {
      zauConsolePanel: {
        async create() {
          try {
            await mountPanelUI();
          } catch (err) {
            await writeDiagnosticLog(`Panel create error: ${err && err.message ? err.message : err}`);
          }
        },
        async show() {
          try {
            const ui = await mountPanelUI();
            if (ui && ui.consoleUI) {
              ui.consoleUI.setContext(getCurrentContext());
              ui.consoleUI.focusSearch();
            }
          } catch (err) {
            await writeDiagnosticLog(`Panel show error: ${err && err.message ? err.message : err}`);
          }
        },
        destroy() {
          unmountPanelUI();
        },
      },
    },
  });
} else if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountPanelUI());
  } else {
    mountPanelUI();
  }
}
