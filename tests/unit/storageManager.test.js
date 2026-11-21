'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { StorageManager } = require('../../photoshop-plugin/src/storage/storageManager');

function createMemoryAdapter() {
  let blob = null;
  return {
    async read() {
      return blob ? JSON.parse(blob) : null;
    },
    async write(data) {
      blob = JSON.stringify(data);
    },
  };
}

test('StorageManager persists favorites, ordering, recent commands, and settings across reloads', async () => {
  const adapter = createMemoryAdapter();
  const s1 = new StorageManager(adapter);
  await s1.load();

  await s1.addFavorite('filter.gaussianBlur');
  await s1.addFavorite('adjust.curves');
  await s1.moveFavorite('adjust.curves', 'up');
  await s1.recordRecent('tool.brush');
  await s1.recordRecent('filter.gaussianBlur');
  await s1.updateSettings({ theme: 'dark', confirmDestructiveActions: false });

  // Simulate Photoshop restart with a fresh StorageManager instance
  const s2 = new StorageManager(adapter);
  await s2.load();

  assert.deepEqual(s2.getFavorites(), ['adjust.curves', 'filter.gaussianBlur']);
  assert.deepEqual(s2.getRecentCommands(), ['filter.gaussianBlur', 'tool.brush']);
  assert.equal(s2.getSettings().theme, 'dark');
  assert.equal(s2.getSettings().confirmDestructiveActions, false);

  await s2.clearRecentHistory();
  assert.deepEqual(s2.getRecentCommands(), []);

  await s2.resetSettings();
  assert.equal(s2.getSettings().theme, 'auto');
  assert.equal(s2.getSettings().confirmDestructiveActions, true);
  assert.equal(s2.getSettings().hotkey, 'Ctrl+Alt+Space');
});

test('StorageManager persists Aurora themes and custom themes across restarts without losing Favorites, Recents, or bridgeToken', async () => {
  const adapter = createMemoryAdapter();
  const s1 = new StorageManager(adapter);
  await s1.load();

  await s1.addFavorite('filter.gaussianBlur');
  await s1.recordRecent('adjust.curves');
  await s1.updateSettings({ bridgeToken: 'tok_keep_me_safe_123456', bridgePort: 47821, bridgeEnabled: true });

  // Apply custom Red/Orange theme & save custom preset
  await s1.setAuroraTheme({
    preset: 'custom',
    customName: 'Studio Fire',
    gradientMode: 'three',
    accentPrimary: '#FF3D3D',
    accentSecondary: '#FF8A32',
    accentTertiary: '#FFB84D',
    windowOpacity: 0.9,
    cornerRadius: 24,
    density: 'spacious',
  });
  const saved = await s1.saveCustomTheme('Studio Fire', s1.getAuroraTheme());
  assert.ok(saved.id);
  assert.equal(s1.getSavedCustomThemes().length, 1);

  // Simulate Photoshop restart
  const s2 = new StorageManager(adapter);
  await s2.load();

  const reloadedTheme = s2.getAuroraTheme();
  assert.equal(reloadedTheme.preset, 'custom');
  assert.equal(reloadedTheme.accentPrimary, '#FF3D3D');
  assert.equal(reloadedTheme.accentSecondary, '#FF8A32');
  assert.equal(reloadedTheme.windowOpacity, 0.9);
  assert.equal(reloadedTheme.cornerRadius, 24);
  assert.equal(reloadedTheme.density, 'spacious');
  assert.equal('bridgeToken' in reloadedTheme, false);

  assert.equal(s2.getSavedCustomThemes().length, 1);
  assert.equal(s2.getSavedCustomThemes()[0].name, 'Studio Fire');
  assert.deepEqual(s2.getFavorites(), ['filter.gaussianBlur']);
  assert.deepEqual(s2.getRecentCommands(), ['adjust.curves']);
  assert.equal(s2.getSettings().bridgeToken, 'tok_keep_me_safe_123456');

  // Resetting Aurora theme must NOT wipe Favorites, Recents, or bridgeToken
  await s2.resetAuroraTheme();
  assert.equal(s2.getAuroraTheme().preset, 'aurora');
  assert.equal(s2.getAuroraTheme().accentPrimary, '#4EA5FF');
  assert.deepEqual(s2.getFavorites(), ['filter.gaussianBlur']);
  assert.deepEqual(s2.getRecentCommands(), ['adjust.curves']);
  assert.equal(s2.getSettings().bridgeToken, 'tok_keep_me_safe_123456');

  // Delete saved custom theme
  await s2.deleteCustomTheme(saved.id);
  assert.equal(s2.getSavedCustomThemes().length, 0);
});
