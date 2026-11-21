'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const net = require('net');
const crypto = require('crypto');
const { createBridgeServer } = require('../../companion/bridge/bridge-server');

function httpRequest(port, path, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, method, headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function createMaskedClientTextFrame(text) {
  const payload = Buffer.from(text, 'utf8');
  const mask = crypto.randomBytes(4);
  const masked = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i++) {
    masked[i] = payload[i] ^ mask[i & 3];
  }
  let header;
  if (payload.length < 126) {
    header = Buffer.alloc(2);
    header[0] = 0x81;
    header[1] = 0x80 | payload.length;
  } else {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
  }
  return Buffer.concat([header, mask, masked]);
}

test('Bridge server binds strictly to 127.0.0.1 and enforces session token auth', async () => {
  const bridge = createBridgeServer({ port: 0 });
  const info = await bridge.start();
  try {
    assert.equal(info.host, '127.0.0.1');
    assert.ok(info.token.length === 64);

    // Unauthorized request must be rejected with 401
    const unauth = await httpRequest(info.port, '/health', 'GET', { 'X-ZAU-Token': 'wrong-token' });
    assert.equal(unauth.status, 401);

    // Authorized request succeeds
    const auth = await httpRequest(info.port, '/health', 'GET', { 'X-ZAU-Token': info.token });
    assert.equal(auth.status, 200);
    assert.equal(auth.body.ok, true);
    assert.equal(auth.body.photoshopConnected, false);
  } finally {
    await bridge.stop();
  }
});

test('Bridge server completes WebSocket handshake and dispatches execute command to Photoshop', async () => {
  const bridge = createBridgeServer({ port: 0 });
  const info = await bridge.start();
  let wsSock = null;

  try {
    const key = crypto.randomBytes(16).toString('base64');
    wsSock = net.createConnection({ host: '127.0.0.1', port: info.port });

    await new Promise((resolve, reject) => {
      wsSock.once('connect', () => {
        wsSock.write(
          `GET /?token=${info.token}&role=photoshop HTTP/1.1\r\n` +
          `Host: 127.0.0.1:${info.port}\r\n` +
          `Upgrade: websocket\r\n` +
          `Connection: Upgrade\r\n` +
          `Sec-WebSocket-Key: ${key}\r\n` +
          `Sec-WebSocket-Version: 13\r\n\r\n`
        );
      });
      wsSock.once('data', (chunk) => {
        const str = chunk.toString('utf8');
        assert.ok(str.includes('101 Switching Protocols'));
        resolve();
      });
      wsSock.once('error', reject);
    });

    // Listen for incoming execute message from bridge and reply
    wsSock.on('data', (buf) => {
      const len = buf[1] & 0x7f;
      const msg = JSON.parse(buf.subarray(2, 2 + len).toString('utf8'));
      if (msg.type === 'execute') {
        const reply = JSON.stringify({
          type: 'executeResult',
          requestId: msg.requestId,
          commandId: msg.commandId,
          result: { ok: true, commandName: 'Gaussian Blur' },
        });
        wsSock.write(createMaskedClientTextFrame(reply));
      }
    });

    const execRes = await httpRequest(
      info.port,
      '/execute',
      'POST',
      { 'X-ZAU-Token': info.token, 'Content-Type': 'application/json' },
      { commandId: 'filter.gaussianBlur' }
    );

    assert.equal(execRes.status, 200);
    assert.equal(execRes.body.ok, true);
    assert.equal(execRes.body.response.commandName, 'Gaussian Blur');
  } finally {
    if (wsSock) wsSock.destroy();
    await bridge.stop();
  }
});

test('Bridge server reassembles fragmented RFC 6455 WebSocket frames and handles contextUpdate', async () => {
  const { decodeWsFrames } = require('../../companion/bridge/bridge-server');
  const fullJson = JSON.stringify({ type: 'contextUpdate', favorites: ['adjust.curves'], context: { hasDocument: true } });
  const buf = Buffer.from(fullJson, 'utf8');
  const mid = Math.floor(buf.length / 2);

  function makeFrame(fin, opcode, payload) {
    const mask = crypto.randomBytes(4);
    const masked = Buffer.alloc(payload.length);
    for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i & 3];
    const header = Buffer.alloc(2);
    header[0] = (fin ? 0x80 : 0x00) | opcode;
    header[1] = 0x80 | payload.length;
    return Buffer.concat([header, mask, masked]);
  }

  const combined = Buffer.concat([
    makeFrame(false, 0x01, buf.subarray(0, mid)),
    makeFrame(true, 0x00, buf.subarray(mid)),
  ]);
  const { messages, remaining } = decodeWsFrames(combined);
  assert.equal(remaining.length, 0);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].fin, false);
  assert.equal(messages[1].fin, true);
  const reassembled = JSON.parse(Buffer.concat([messages[0].payload, messages[1].payload]).toString('utf8'));
  assert.equal(reassembled.type, 'contextUpdate');
  assert.deepEqual(reassembled.favorites, ['adjust.curves']);
});

test('Bridge server syncs theme bidirectionally over authenticated endpoints, persists across restarts, and never triggers command execution', async () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const tempThemeFile = path.join(os.tmpdir(), `zau-theme-test-${Date.now()}.json`);

  const bridge1 = createBridgeServer({ port: 0, themeFilePath: tempThemeFile });
  const info1 = await bridge1.start();
  let wsSock = null;
  const receivedTypes = [];

  try {
    // 1. Unauthorized GET/POST /theme must return 401
    const unauthGet = await httpRequest(info1.port, '/theme', 'GET', { 'X-ZAU-Token': 'invalid' });
    assert.equal(unauthGet.status, 401);
    const unauthPost = await httpRequest(
      info1.port,
      '/theme',
      'POST',
      { 'X-ZAU-Token': 'invalid', 'Content-Type': 'application/json' },
      { preset: 'ember' }
    );
    assert.equal(unauthPost.status, 401);

    // 2. Connect simulated Photoshop UXP WebSocket client
    const key = crypto.randomBytes(16).toString('base64');
    wsSock = net.createConnection({ host: '127.0.0.1', port: info1.port });
    await new Promise((resolve, reject) => {
      wsSock.once('connect', () => {
        wsSock.write(
          `GET /?token=${info1.token}&role=photoshop HTTP/1.1\r\n` +
          `Host: 127.0.0.1:${info1.port}\r\n` +
          `Upgrade: websocket\r\n` +
          `Connection: Upgrade\r\n` +
          `Sec-WebSocket-Key: ${key}\r\n` +
          `Sec-WebSocket-Version: 13\r\n\r\n`
        );
      });
      wsSock.once('data', (chunk) => {
        assert.ok(chunk.toString('utf8').includes('101 Switching Protocols'));
        resolve();
      });
      wsSock.once('error', reject);
    });

    const themeReceivedPromise = new Promise((resolve) => {
      wsSock.on('data', (buf) => {
        let offset = 2;
        let len = buf[1] & 0x7f;
        if (len === 126) {
          len = buf.readUInt16BE(2);
          offset = 4;
        }
        const msg = JSON.parse(buf.subarray(offset, offset + len).toString('utf8'));
        receivedTypes.push(msg.type);
        if (msg.type === 'themeUpdate') resolve(msg);
      });
    });

    // 3. Helper POSTs custom Red/Orange theme to bridge
    const postRes = await httpRequest(
      info1.port,
      '/theme',
      'POST',
      { 'X-ZAU-Token': info1.token, 'Content-Type': 'application/json' },
      {
        theme: {
          preset: 'custom',
          customName: 'Sunset Red',
          accentPrimary: '#FF3D3D',
          accentSecondary: '#FF8A32',
          accentTertiary: '#FFB84D',
          bridgeToken: 'LEAK_ATTEMPT',
        },
      }
    );
    assert.equal(postRes.status, 200);
    assert.equal(postRes.body.ok, true);
    assert.equal(postRes.body.syncedToPhotoshop, true);
    assert.equal(postRes.body.theme.accentPrimary, '#FF3D3D');
    assert.equal('bridgeToken' in postRes.body.theme, false);

    // 4. Photoshop UXP receives themeUpdate and NEVER receives execute
    const pushed = await themeReceivedPromise;
    assert.equal(pushed.type, 'themeUpdate');
    assert.equal(pushed.theme.accentPrimary, '#FF3D3D');
    assert.equal(receivedTypes.includes('execute'), false);

    // 5. Persisted file contains no credentials
    const rawFile = fs.readFileSync(tempThemeFile, 'utf8');
    assert.equal(rawFile.includes('LEAK_ATTEMPT'), false);
    assert.equal(rawFile.includes(info1.token), false);
  } finally {
    if (wsSock) wsSock.destroy();
    await bridge1.stop();
  }

  // 6. Simulate bridge restart -> persisted theme loads automatically
  const bridge2 = createBridgeServer({ port: 0, themeFilePath: tempThemeFile });
  const info2 = await bridge2.start();
  try {
    const getRes = await httpRequest(info2.port, '/theme', 'GET', { 'X-ZAU-Token': info2.token });
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.theme.accentPrimary, '#FF3D3D');
    assert.equal(getRes.body.theme.customName, 'Sunset Red');
  } finally {
    await bridge2.stop();
    try { fs.unlinkSync(tempThemeFile); } catch (_) {}
  }
});

test('Safe atomic migration from ZAU Console 2.0.0 preserves token & themes and pairs Photoshop UXP PluginData', () => {
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const { migrateLegacyZauData, ensurePhotoshopPluginPairing } = require('../../companion/bridge/bridge-server');

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'vayro-mig-'));
  const fakeLocal = path.join(tmpRoot, 'LocalAppData');
  const fakeAppData = path.join(tmpRoot, 'AppData');
  const legacyDir = path.join(fakeLocal, 'ZAU-Console');
  fs.mkdirSync(legacyDir, { recursive: true });

  const legacyToken = 'a'.repeat(64);
  fs.writeFileSync(path.join(legacyDir, 'bridge-session.json'), JSON.stringify({ host: '127.0.0.1', port: 47821, token: legacyToken }), 'utf8');
  fs.writeFileSync(path.join(legacyDir, 'zau-theme.json'), JSON.stringify({ theme: { preset: 'ember' }, savedCustomThemes: [] }), 'utf8');

  // Seed existing ZAU Console 2.0.0 Photoshop PluginData with Favorites
  const psPluginData = path.join(fakeAppData, 'Adobe', 'UXP', 'PluginsStorage', 'PHSP', '26', 'External', 'com.zau.photoshop.console', 'PluginData');
  fs.mkdirSync(psPluginData, { recursive: true });
  const statePath = path.join(psPluginData, 'zau-console-state.json');
  fs.writeFileSync(statePath, JSON.stringify({ favorites: ['filter.gaussianBlur', 'adjust.curves'], recentCommands: ['tool.brush'], settings: { hotkey: 'Ctrl+Alt+Space' } }), 'utf8');

  try {
    const mig = migrateLegacyZauData({ localAppData: fakeLocal });
    assert.equal(mig.migrated, true);
    assert.ok(mig.backedUp.includes('bridge-session.json'));
    assert.ok(mig.backedUp.includes('zau-theme.json'));

    const targetDir = path.join(fakeLocal, 'VAYRO', 'Quiet Trigger');
    const migratedSession = JSON.parse(fs.readFileSync(path.join(targetDir, 'bridge-session.json'), 'utf8'));
    const migratedTheme = JSON.parse(fs.readFileSync(path.join(targetDir, 'theme.json'), 'utf8'));
    assert.equal(migratedSession.token, legacyToken);
    assert.equal(migratedTheme.theme.preset, 'ember');
    // Legacy directory must remain untouched
    assert.equal(fs.existsSync(path.join(legacyDir, 'bridge-session.json')), true);

    // Pair into Photoshop UXP PluginData without losing Favorites/Recents
    const paired = ensurePhotoshopPluginPairing({ host: '127.0.0.1', port: 47821, token: legacyToken }, { appData: fakeAppData });
    assert.equal(paired.pairedPaths.length, 1);
    const pairedState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.equal(pairedState.settings.bridgeEnabled, true);
    assert.equal(pairedState.settings.bridgeToken, legacyToken);
    assert.deepEqual(pairedState.favorites, ['filter.gaussianBlur', 'adjust.curves']);
    assert.deepEqual(pairedState.recentCommands, ['tool.brush']);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
