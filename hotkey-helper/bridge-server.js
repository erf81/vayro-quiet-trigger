// Copyright 2026 erf81
// SPDX-License-Identifier: Apache-2.0

/**
 * ZAU Console — Local Loopback IPC Bridge Server (Node.js, Zero Dependencies)
 *
 * Security model:
 * - Binds STRICTLY to 127.0.0.1 (never 0.0.0.0 or public interfaces).
 * - Requires a 256-bit random per-session token validated with constant-time comparison.
 * - Connects the Photoshop UXP plugin (WebSocket client) with the Windows Hotkey Helper (HTTP client).
 */
'use strict';

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { sanitizeTheme, createThemeFromPreset } = require('../src/theme/themeSystem.js');

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function safeTokenEqual(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Minimal RFC 6455 WebSocket frame encoder (server -> client, unmasked text frame).
 */
function encodeWsTextFrame(text) {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // FIN + text opcode
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

/**
 * Minimal RFC 6455 WebSocket frame decoder (client -> server, masked frames).
 */
function decodeWsFrames(buffer) {
  const messages = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const byte1 = buffer[offset];
    const byte2 = buffer[offset + 1];
    const fin = Boolean(byte1 & 0x80);
    const opcode = byte1 & 0x0f;
    const masked = Boolean(byte2 & 0x80);
    let payloadLen = byte2 & 0x7f;
    let headerLen = 2;

    if (payloadLen === 126) {
      if (offset + 4 > buffer.length) break;
      payloadLen = buffer.readUInt16BE(offset + 2);
      headerLen = 4;
    } else if (payloadLen === 127) {
      if (offset + 10 > buffer.length) break;
      payloadLen = Number(buffer.readBigUInt64BE(offset + 2));
      headerLen = 10;
    }

    const maskLen = masked ? 4 : 0;
    const totalLen = headerLen + maskLen + payloadLen;
    if (offset + totalLen > buffer.length) break;

    const payloadStart = offset + headerLen + maskLen;
    const payload = Buffer.alloc(payloadLen);

    if (masked) {
      const maskKey = buffer.subarray(offset + headerLen, offset + headerLen + 4);
      for (let i = 0; i < payloadLen; i++) {
        payload[i] = buffer[payloadStart + i] ^ maskKey[i & 3];
      }
    } else {
      buffer.copy(payload, 0, payloadStart, payloadStart + payloadLen);
    }

    messages.push({ fin, opcode, payload });
    offset += totalLen;
  }

  return { messages, remaining: buffer.subarray(offset) };
}

function getUserDataDir(baseLocalAppData = null) {
  const root = baseLocalAppData || process.env.LOCALAPPDATA || os.tmpdir();
  const dir = path.join(root, 'VAYRO', 'Quiet Trigger');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function atomicWriteFile(filePath, content) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, content, { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, filePath);
}

/**
 * Safely migrates ZAU Console 2.0.0 user data (%LOCALAPPDATA%\ZAU-Console)
 * into VAYRO Quiet Trigger 2.1.0 (%LOCALAPPDATA%\VAYRO\Quiet Trigger):
 * 1. Backs up legacy files to migration-backup-v2.0.0/
 * 2. Validates backup JSON
 * 3. Atomically writes migrated files without overwriting existing v2.1.0 data
 * 4. Preserves legacy directory untouched
 */
function migrateLegacyZauData(options = {}) {
  const baseLocal = options.localAppData || process.env.LOCALAPPDATA || os.tmpdir();
  const legacyDir = path.join(baseLocal, 'ZAU-Console');
  const targetDir = getUserDataDir(baseLocal);
  const result = { migrated: false, backedUp: [], skipped: [] };

  if (!fs.existsSync(legacyDir)) return result;

  const backupDir = path.join(targetDir, 'migration-backup-v2.0.0');
  const pairs = [
    { src: 'bridge-session.json', dst: 'bridge-session.json' },
    { src: 'zau-theme.json', dst: 'theme.json' },
  ];

  for (const { src, dst } of pairs) {
    const srcPath = path.join(legacyDir, src);
    const dstPath = path.join(targetDir, dst);
    if (!fs.existsSync(srcPath)) continue;
    if (fs.existsSync(dstPath)) {
      result.skipped.push(dst);
      continue;
    }
    try {
      const raw = fs.readFileSync(srcPath, 'utf8').replace(/^\uFEFF/, '');
      JSON.parse(raw); // Validate valid JSON before backing up/migrating
      fs.mkdirSync(backupDir, { recursive: true });
      const bakPath = path.join(backupDir, src);
      if (!fs.existsSync(bakPath)) {
        fs.writeFileSync(bakPath, raw, { encoding: 'utf8', mode: 0o600 });
        // Verify backup readability
        JSON.parse(fs.readFileSync(bakPath, 'utf8'));
        result.backedUp.push(src);
      }
      atomicWriteFile(dstPath, raw);
      result.migrated = true;
    } catch (_) {
      // Never crash startup on corrupt legacy file
    }
  }
  return result;
}

function getThemeFilePath(baseLocalAppData = null) {
  return path.join(getUserDataDir(baseLocalAppData), 'theme.json');
}

function loadPersistedTheme(themeFilePath) {
  try {
    const raw = fs.readFileSync(themeFilePath, 'utf8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw);
    return {
      theme: sanitizeTheme(parsed.theme || parsed),
      savedCustomThemes: Array.isArray(parsed.savedCustomThemes) ? parsed.savedCustomThemes : [],
    };
  } catch (_) {
    return { theme: createThemeFromPreset('aurora'), savedCustomThemes: [] };
  }
}

function savePersistedTheme(themeFilePath, theme, savedCustomThemes) {
  try {
    const payload = {
      theme: sanitizeTheme(theme),
      savedCustomThemes: Array.isArray(savedCustomThemes) ? savedCustomThemes : [],
    };
    fs.writeFileSync(themeFilePath, JSON.stringify(payload, null, 2), 'utf8');
  } catch (_) {
    // Never crash bridge on theme file write issue
  }
}

function createBridgeServer(options = {}) {
  const port = options.port ?? 47821;
  const host = '127.0.0.1'; // Hardcoded loopback-only
  const token = options.token || crypto.randomBytes(32).toString('hex');
  const themeFilePath = options.themeFilePath === null ? null : (options.themeFilePath || getThemeFilePath());

  const initialThemeData = themeFilePath
    ? loadPersistedTheme(themeFilePath)
    : { theme: createThemeFromPreset('aurora'), savedCustomThemes: [] };

  let psSocket = null;
  let cachedCatalog = {
    commands: [],
    favorites: [],
    recentCommands: [],
    context: null,
    theme: initialThemeData.theme,
    savedCustomThemes: initialThemeData.savedCustomThemes,
  };
  const pendingRequests = new Map();

  function sendToPhotoshop(obj) {
    if (!psSocket || psSocket.destroyed) return false;
    psSocket.write(encodeWsTextFrame(JSON.stringify(obj)));
    return true;
  }

  function handlePsMessage(text) {
    try {
      const msg = JSON.parse(text);
      if (msg.type === 'catalog') {
        cachedCatalog = {
          commands: msg.commands || [],
          favorites: msg.favorites || [],
          recentCommands: msg.recentCommands || [],
          context: msg.context || null,
          theme: msg.theme ? sanitizeTheme(msg.theme) : cachedCatalog.theme,
          savedCustomThemes: Array.isArray(msg.savedCustomThemes)
            ? msg.savedCustomThemes
            : cachedCatalog.savedCustomThemes,
        };
        if (themeFilePath && msg.theme) {
          savePersistedTheme(themeFilePath, cachedCatalog.theme, cachedCatalog.savedCustomThemes);
        }
      } else if (msg.type === 'contextUpdate') {
        cachedCatalog = {
          ...cachedCatalog,
          favorites: msg.favorites || cachedCatalog.favorites,
          recentCommands: msg.recentCommands || cachedCatalog.recentCommands,
          context: msg.context !== undefined ? msg.context : cachedCatalog.context,
        };
      } else if (msg.type === 'themeUpdate' && msg.theme) {
        cachedCatalog.theme = sanitizeTheme(msg.theme);
        if (Array.isArray(msg.savedCustomThemes)) {
          cachedCatalog.savedCustomThemes = msg.savedCustomThemes;
        }
        if (themeFilePath) {
          savePersistedTheme(themeFilePath, cachedCatalog.theme, cachedCatalog.savedCustomThemes);
        }
      }
      if (msg.requestId && pendingRequests.has(msg.requestId)) {
        const { resolve, timer } = pendingRequests.get(msg.requestId);
        clearTimeout(timer);
        pendingRequests.delete(msg.requestId);
        resolve(msg);
      }
    } catch (_) {
      // Ignore malformed JSON
    }
  }

  function requestFromPhotoshop(payload, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      if (!psSocket || psSocket.destroyed) {
        return reject(new Error('Photoshop ZAU Console plugin is not connected.'));
      }
      const requestId = crypto.randomBytes(8).toString('hex');
      const timer = setTimeout(() => {
        pendingRequests.delete(requestId);
        reject(new Error('Timed out waiting for Photoshop response.'));
      }, timeoutMs);

      pendingRequests.set(requestId, { resolve, reject, timer });
      sendToPhotoshop({ ...payload, requestId });
    });
  }

  function readJsonBody(req) {
    return new Promise((resolve, reject) => {
      let raw = '';
      req.on('data', (chunk) => {
        raw += chunk;
        if (raw.length > 1024 * 64) {
          reject(new Error('Payload too large'));
        }
      });
      req.on('end', () => {
        if (!raw) return resolve({});
        try {
          resolve(JSON.parse(raw));
        } catch (_) {
          reject(new Error('Invalid JSON'));
        }
      });
    });
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${host}:${port}`);
    const providedToken = req.headers['x-zau-token'] || url.searchParams.get('token') || '';

    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (!safeTokenEqual(providedToken, token)) {
      res.writeHead(401);
      res.end(JSON.stringify({ ok: false, error: 'Unauthorized: invalid session token.' }));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200);
      res.end(
        JSON.stringify({
          ok: true,
          host,
          port: server.address().port,
          photoshopConnected: Boolean(psSocket && !psSocket.destroyed),
          commandCount: cachedCatalog.commands.length,
        })
      );
      return;
    }

    if (req.method === 'GET' && url.pathname === '/catalog') {
      res.writeHead(200);
      res.end(
        JSON.stringify({
          ok: true,
          photoshopConnected: Boolean(psSocket && !psSocket.destroyed),
          ...cachedCatalog,
        })
      );
      return;
    }

    if (req.method === 'POST' && url.pathname === '/execute') {
      try {
        const body = await readJsonBody(req);
        if (!body.commandId) {
          res.writeHead(400);
          res.end(JSON.stringify({ ok: false, error: 'Missing commandId.' }));
          return;
        }
        const reqTimeout = Number.isInteger(body.timeoutMs) && body.timeoutMs >= 1000 && body.timeoutMs <= 60000
          ? body.timeoutMs
          : 15000;
        const reply = await requestFromPhotoshop({
          type: 'execute',
          commandId: body.commandId,
          inputValue: body.inputValue,
          skipConfirmation: Boolean(body.skipConfirmation),
        }, reqTimeout);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, response: reply.result || reply }));
      } catch (err) {
        res.writeHead(502);
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
      return;
    }

    if (req.method === 'GET' && url.pathname === '/theme') {
      res.writeHead(200);
      res.end(
        JSON.stringify({
          ok: true,
          theme: cachedCatalog.theme,
          savedCustomThemes: cachedCatalog.savedCustomThemes,
        })
      );
      return;
    }

    if (req.method === 'POST' && url.pathname === '/theme') {
      try {
        const body = await readJsonBody(req);
        const nextTheme = sanitizeTheme(body.theme || body);
        const nextCustom = Array.isArray(body.savedCustomThemes)
          ? body.savedCustomThemes
          : cachedCatalog.savedCustomThemes;

        cachedCatalog.theme = nextTheme;
        cachedCatalog.savedCustomThemes = nextCustom;
        if (themeFilePath) {
          savePersistedTheme(themeFilePath, nextTheme, nextCustom);
        }

        // Sync to Photoshop UXP plugin without triggering any command execution
        const syncedToPhotoshop = sendToPhotoshop({
          type: 'themeUpdate',
          theme: nextTheme,
          savedCustomThemes: nextCustom,
        });

        res.writeHead(200);
        res.end(
          JSON.stringify({
            ok: true,
            theme: nextTheme,
            savedCustomThemes: nextCustom,
            syncedToPhotoshop,
          })
        );
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/favorite') {
      try {
        const body = await readJsonBody(req);
        if (!body.commandId) {
          res.writeHead(400);
          res.end(JSON.stringify({ ok: false, error: 'Missing commandId.' }));
          return;
        }
        const reply = await requestFromPhotoshop({
          type: 'toggleFavorite',
          commandId: body.commandId,
        }, 5000);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, favorites: reply.favorites || cachedCatalog.favorites }));
      } catch (err) {
        res.writeHead(502);
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
      return;
    }

    if (req.method === 'GET' && url.pathname === '/context') {
      try {
        const reply = await requestFromPhotoshop({ type: 'getCatalog' });
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, context: reply.context || cachedCatalog.context }));
      } catch (err) {
        res.writeHead(502);
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ ok: false, error: 'Not found.' }));
  });

  server.on('upgrade', (req, socket) => {
    const url = new URL(req.url, `http://${host}:${port}`);
    const providedToken = url.searchParams.get('token') || '';
    const key = req.headers['sec-websocket-key'];

    if (!safeTokenEqual(providedToken, token) || !key) {
      socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    const accept = crypto
      .createHash('sha1')
      .update(key + WS_GUID)
      .digest('base64');

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
    );

    if (psSocket && !psSocket.destroyed) {
      try {
        psSocket.destroy();
      } catch (_) {}
    }
    if (typeof socket.setNoDelay === 'function') {
      socket.setNoDelay(true);
    }
    psSocket = socket;

    let rxBuf = Buffer.alloc(0);
    let fragChunks = [];
    socket.on('data', (chunk) => {
      rxBuf = Buffer.concat([rxBuf, chunk]);
      const { messages, remaining } = decodeWsFrames(rxBuf);
      rxBuf = remaining;
      for (const m of messages) {
        if (m.opcode === 0x01) {
          if (m.fin) {
            handlePsMessage(m.payload.toString('utf8'));
          } else {
            fragChunks = [m.payload];
          }
        } else if (m.opcode === 0x00) {
          fragChunks.push(m.payload);
          if (m.fin) {
            handlePsMessage(Buffer.concat(fragChunks).toString('utf8'));
            fragChunks = [];
          }
        } else if (m.opcode === 0x08) {
          socket.end();
        } else if (m.opcode === 0x09) {
          // Ping -> Pong
          const pong = Buffer.concat([Buffer.from([0x8a, m.payload.length]), m.payload]);
          socket.write(pong);
        }
      }
    });

    socket.on('close', () => {
      if (psSocket === socket) {
        psSocket = null;
        for (const [reqId, entry] of pendingRequests.entries()) {
          clearTimeout(entry.timer);
          if (typeof entry.reject === 'function') {
            entry.reject(new Error('Photoshop WebSocket disconnected during request.'));
          }
          pendingRequests.delete(reqId);
        }
      }
    });

    socket.on('error', () => {
      if (psSocket === socket) psSocket = null;
    });
  });

  return {
    token,
    host,
    server,
    start() {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
          server.removeListener('error', reject);
          resolve({ host, port: server.address().port, token });
        });
      });
    },
    stop() {
      return new Promise((resolve) => {
        for (const { timer } of pendingRequests.values()) clearTimeout(timer);
        pendingRequests.clear();
        if (psSocket && !psSocket.destroyed) psSocket.destroy();
        server.close(() => resolve());
      });
    },
  };
}

function getSessionFilePath(baseLocalAppData = null) {
  return path.join(getUserDataDir(baseLocalAppData), 'bridge-session.json');
}

function loadExistingToken(baseLocalAppData = null) {
  const candidates = [
    getSessionFilePath(baseLocalAppData),
    path.join(baseLocalAppData || process.env.LOCALAPPDATA || os.tmpdir(), 'ZAU-Console', 'bridge-session.json'),
  ];
  for (const fp of candidates) {
    try {
      const raw = fs.readFileSync(fp, 'utf8').replace(/^\uFEFF/, '');
      const parsed = JSON.parse(raw);
      if (typeof parsed.token === 'string' && parsed.token.length >= 32) {
        return parsed.token;
      }
    } catch (_) {}
  }
  return null;
}

function saveSessionFile(info, baseLocalAppData = null) {
  const filePath = getSessionFilePath(baseLocalAppData);
  atomicWriteFile(filePath, JSON.stringify(info, null, 2));
  return filePath;
}

/**
 * Secure local first-run pairing between Quiet Trigger Helper and Photoshop UXP PluginData.
 * Operates strictly within the current Windows user's private %APPDATA% profile directory.
 * Preserves existing Favorites, Recents, Custom Themes, and Settings on upgrade.
 */
function ensurePhotoshopPluginPairing(info, options = {}) {
  const appData = options.appData || process.env.APPDATA;
  if (!appData || !info || !info.token) return { pairedPaths: [] };

  const phspRoot = path.join(appData, 'Adobe', 'UXP', 'PluginsStorage', 'PHSP');
  const versions = [];
  try {
    if (fs.existsSync(phspRoot)) {
      for (const entry of fs.readdirSync(phspRoot, { withFileTypes: true })) {
        if (entry.isDirectory() && /^\d+$/.test(entry.name)) {
          versions.push(entry.name);
        }
      }
    }
  } catch (_) {}
  if (versions.length === 0) versions.push('26');

  const pairedPaths = [];
  for (const ver of versions) {
    const pluginDataDir = path.join(
      phspRoot,
      ver,
      'External',
      'com.zau.photoshop.console',
      'PluginData'
    );
    const stateFile = path.join(pluginDataDir, 'zau-console-state.json');
    try {
      let state = {};
      if (fs.existsSync(stateFile)) {
        const raw = fs.readFileSync(stateFile, 'utf8').replace(/^\uFEFF/, '');
        state = JSON.parse(raw);
      }
      if (!state || typeof state !== 'object') state = {};
      if (!state.settings || typeof state.settings !== 'object') state.settings = {};

      // Pair token & enable loopback bridge without touching favorites, recents, or custom themes
      const alreadyMatched =
        state.settings.bridgeEnabled === true &&
        state.settings.bridgePort === info.port &&
        state.settings.bridgeToken === info.token;

      if (!alreadyMatched) {
        state.settings.bridgeEnabled = true;
        state.settings.bridgePort = info.port;
        state.settings.bridgeToken = info.token;
        if (!state.settings.hotkey) state.settings.hotkey = 'Ctrl+Alt+Space';
        if (!Array.isArray(state.favorites)) state.favorites = [];
        if (!Array.isArray(state.recentCommands)) state.recentCommands = [];
        atomicWriteFile(stateFile, JSON.stringify(state, null, 2));
      }
      pairedPaths.push(stateFile);
    } catch (_) {
      // Non-fatal: manual token pairing in Settings remains available
    }
  }
  return { pairedPaths };
}

if (require.main === module) {
  const silent = process.argv.includes('--silent');
  const portArgIdx = process.argv.indexOf('--port');
  const port = portArgIdx !== -1 ? parseInt(process.argv[portArgIdx + 1], 10) : 47821;
  const rotate = process.argv.includes('--rotate-token');

  // Safely migrate legacy ZAU Console 2.0.0 user data before loading token/theme
  migrateLegacyZauData();

  const existingToken = rotate ? null : loadExistingToken();
  const bridge = createBridgeServer({ port, token: existingToken || undefined });

  bridge
    .start()
    .then((info) => {
      const sessionFile = saveSessionFile(info);
      ensurePhotoshopPluginPairing(info);
      if (!silent) {
        console.log('====================================================');
        console.log('  Quiet Trigger by VAYRO — Local Loopback Bridge');
        console.log('====================================================');
        console.log(`  Endpoint : http://${info.host}:${info.port} (loopback only)`);
        console.log(`  Session  : ${sessionFile}`);
        console.log('  Status   : Paired locally with Photoshop UXP plugin');
        console.log('====================================================');
      }
    })
    .catch((err) => {
      if (err && err.code === 'EADDRINUSE') {
        if (!silent) console.log(`[Quiet Trigger Bridge] Already running on 127.0.0.1:${port}.`);
        process.exit(0);
      }
      console.error('[Quiet Trigger Bridge] Failed to start:', err.message);
      process.exit(1);
    });
}

module.exports = {
  createBridgeServer,
  encodeWsTextFrame,
  decodeWsFrames,
  safeTokenEqual,
  getUserDataDir,
  migrateLegacyZauData,
  ensurePhotoshopPluginPairing,
};
