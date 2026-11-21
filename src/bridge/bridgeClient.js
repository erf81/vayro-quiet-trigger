/**
 * Optional Local Loopback WebSocket Client for ZAU Windows Hotkey Helper.
 * Connects ONLY to 127.0.0.1 with an authenticated session token when enabled by the user.
 * Never opens a public endpoint and never runs when disabled.
 */
'use strict';

class BridgeClient {
  constructor({ onExecuteCommand, onFocusSearch, onGetCatalog, onThemeUpdate, onToggleFavorite, onStatusChange }) {
    this._onExecuteCommand = onExecuteCommand;
    this._onFocusSearch = onFocusSearch;
    this._onGetCatalog = onGetCatalog;
    this._onThemeUpdate = onThemeUpdate;
    this._onToggleFavorite = onToggleFavorite;
    this._onStatusChange = onStatusChange || (() => {});
    this._ws = null;
    this._reconnectTimer = null;
    this._enabled = false;
    this._port = 47821;
    this._token = '';
    this._status = 'disabled'; // 'disabled' | 'connecting' | 'connected' | 'error'
    this._lastError = null;
  }

  getStatus() {
    return {
      status: this._status,
      enabled: this._enabled,
      port: this._port,
      lastError: this._lastError,
    };
  }

  _setStatus(status, error = null) {
    this._status = status;
    this._lastError = error;
    this._onStatusChange(this.getStatus());
  }

  configure({ enabled, port, token }) {
    const nextEnabled = Boolean(enabled);
    const nextPort = port || 47821;
    const nextToken = (token || '').trim();

    // Avoid displacing an already healthy connection when config is unchanged
    if (
      nextEnabled &&
      nextEnabled === this._enabled &&
      nextPort === this._port &&
      nextToken === this._token &&
      this._ws &&
      (this._ws.readyState === 0 || this._ws.readyState === 1)
    ) {
      return;
    }

    this._enabled = nextEnabled;
    this._port = nextPort;
    this._token = nextToken;

    this.disconnect();

    if (!this._enabled) {
      this._setStatus('disabled', null);
      return;
    }

    if (!this._token) {
      this._setStatus('error', 'Session token required (copy from Hotkey Helper).');
      return;
    }

    this._connect();
  }

  _connect() {
    if (!this._enabled) return;
    if (this._ws && (this._ws.readyState === 0 || this._ws.readyState === 1)) return;
    if (typeof WebSocket === 'undefined') {
      this._setStatus('error', 'WebSocket API is unavailable in this environment.');
      return;
    }

    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }

    this._setStatus('connecting', null);

    try {
      const url = `ws://localhost:${this._port}/?token=${encodeURIComponent(this._token)}&role=photoshop`;
      const ws = new WebSocket(url);
      this._ws = ws;

      ws.onopen = () => {
        if (this._ws !== ws) return;
        if (this._reconnectTimer) {
          clearTimeout(this._reconnectTimer);
          this._reconnectTimer = null;
        }
        console.log(`[ZAU Bridge] Connected to ws://localhost:${this._port}`);
        this._setStatus('connected', null);
        // Send initial command catalog + context snapshot to the local helper
        this.pushCatalog();
      };

      ws.onmessage = async (event) => {
        if (this._ws !== ws) return;
        try {
          const msg = JSON.parse(event.data);
          await this._handleMessage(msg);
        } catch (err) {
          console.warn('[ZAU Bridge] Invalid message:', err);
        }
      };

      ws.onerror = (ev) => {
        if (this._ws !== ws) return;
        console.warn(`[ZAU Bridge] WebSocket error on localhost:${this._port}`, ev && ev.message ? ev.message : '');
        this._setStatus('error', `Cannot reach local helper on localhost:${this._port}.`);
      };

      ws.onclose = (ev) => {
        if (this._ws !== ws) return;
        console.log(`[ZAU Bridge] WebSocket closed (code=${ev && ev.code})`);
        this._ws = null;
        if (this._enabled) {
          this._setStatus('error', 'Disconnected from Hotkey Helper. Retrying...');
          this._scheduleReconnect();
        } else {
          this._setStatus('disabled', null);
        }
      };
    } catch (err) {
      this._setStatus('error', err && err.message ? err.message : 'Connection failed.');
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    if (!this._enabled) return;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._connect();
    }, 5000);
  }

  async _handleMessage(msg) {
    if (!msg || typeof msg.type !== 'string') return;

    if (msg.type === 'execute' && msg.commandId) {
      const res = await this._onExecuteCommand(msg.commandId, {
        inputValue: msg.inputValue,
        skipConfirmation: Boolean(msg.skipConfirmation),
      });
      this._send({
        type: 'executeResult',
        requestId: msg.requestId || null,
        commandId: msg.commandId,
        result: res,
      });
      this.pushContext();
    } else if (msg.type === 'focusSearch') {
      if (typeof this._onFocusSearch === 'function') {
        this._onFocusSearch();
      }
      this._send({ type: 'ack', requestId: msg.requestId || null });
    } else if (msg.type === 'themeUpdate' && msg.theme) {
      if (typeof this._onThemeUpdate === 'function') {
        await this._onThemeUpdate(msg.theme, msg.savedCustomThemes);
      }
    } else if (msg.type === 'toggleFavorite' && msg.commandId) {
      let favorites = [];
      if (typeof this._onToggleFavorite === 'function') {
        favorites = await this._onToggleFavorite(msg.commandId);
      }
      this._send({
        type: 'favoriteResult',
        requestId: msg.requestId || null,
        favorites,
      });
      this.pushContext();
    } else if (msg.type === 'getCatalog') {
      this.pushCatalog(msg.requestId || null);
    }
  }

  pushTheme(theme, savedCustomThemes) {
    if (!this._ws || this._ws.readyState !== 1) return;
    this._send({
      type: 'themeUpdate',
      theme,
      savedCustomThemes,
    });
  }

  pushContext() {
    if (!this._ws || this._ws.readyState !== 1) return;
    const payload = typeof this._onGetCatalog === 'function' ? this._onGetCatalog() : {};
    this._send({
      type: 'contextUpdate',
      favorites: payload.favorites || [],
      recentCommands: payload.recentCommands || [],
      context: payload.context || null,
    });
  }

  pushCatalog(requestId = null) {
    if (!this._ws || this._ws.readyState !== 1) return;
    const payload = typeof this._onGetCatalog === 'function' ? this._onGetCatalog() : {};
    this._send({
      type: 'catalog',
      requestId,
      ...payload,
    });
  }

  _send(obj) {
    if (!this._ws || this._ws.readyState !== 1) return;
    try {
      this._ws.send(JSON.stringify(obj));
    } catch (_) {
      // Ignore transient send errors
    }
  }

  disconnect() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this._ws) {
      const ws = this._ws;
      this._ws = null;
      try {
        ws.close();
      } catch (_) {
        // Ignore close errors
      }
    }
  }
}

module.exports = { BridgeClient };
