'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDefaultRegistry } = require('../src/commands');
const { SearchEngine } = require('../src/search/searchEngine');

const registry = createDefaultRegistry();
const engine = new SearchEngine(registry.getAll());

test('Search for "gaussian blur" ranks Gaussian Blur first', () => {
  const res = engine.search('gaussian blur');
  assert.ok(res.length > 0);
  assert.equal(res[0].command.id, 'filter.gaussianBlur');
});

test('Search for "blur" returns Gaussian, Motion, Lens, Surface, Blur Gallery', () => {
  const res = engine.search('blur');
  const ids = res.map((r) => r.command.id);
  assert.ok(ids.includes('filter.gaussianBlur'));
  assert.ok(ids.includes('filter.motionBlur'));
  assert.ok(ids.includes('filter.surfaceBlur'));
  assert.ok(ids.includes('filter.lensBlur'));
  assert.ok(ids.includes('filter.blurGalleryField'));
});

test('Search for "sharp" returns Smart Sharpen, Unsharp Mask, High Pass', () => {
  const res = engine.search('sharp');
  const ids = res.map((r) => r.command.id);
  assert.ok(ids.includes('filter.smartSharpen'));
  assert.ok(ids.includes('filter.unsharpMask'));
  assert.ok(ids.includes('filter.highPass'));
});

test('Search for "mask" returns Layer Mask, Apply Mask, Clipping Mask', () => {
  const res = engine.search('mask');
  const ids = res.map((r) => r.command.id);
  assert.ok(ids.includes('layer.createMask'));
  assert.ok(ids.includes('layer.applyMask'));
  assert.ok(ids.includes('layer.createClippingMask'));
});

test('Search for "color" returns Color Balance, Hue/Saturation, Vibrance', () => {
  const res = engine.search('color');
  const ids = res.map((r) => r.command.id);
  assert.ok(ids.includes('adjust.colorBalance'));
  assert.ok(ids.includes('adjust.hueSaturation'));
  assert.ok(ids.includes('adjust.vibrance'));
});

test('Search for "crop" returns Crop Tool and Canvas Crop', () => {
  const res = engine.search('crop');
  const ids = res.map((r) => r.command.id);
  assert.ok(ids.includes('tool.crop'));
  assert.ok(ids.includes('doc.cropToSelection'));
});

test('Partial and fuzzy search works ("gblr", "usm", "crv")', () => {
  assert.ok(engine.search('gblr').some((r) => r.command.id === 'filter.gaussianBlur'));
  assert.equal(engine.search('usm')[0].command.id, 'filter.unsharpMask');
  assert.equal(engine.search('crv')[0].command.id, 'adjust.curves');
});

test('Persian aliases return matching Photoshop commands', () => {
  assert.ok(engine.search('بلور').some((r) => r.command.id === 'filter.gaussianBlur'));
  assert.ok(engine.search('ماسک').some((r) => r.command.id === 'layer.createMask'));
  assert.ok(engine.search('کراپ').some((r) => r.command.id === 'tool.crop'));
});

test('Favorites and Recents boost ranking and filter tabs work', () => {
  const favs = ['filter.surfaceBlur'];
  const recents = ['filter.motionBlur'];
  const res = engine.search('blur', { favorites: favs, recentCommands: recents });
  assert.ok(res.find((r) => r.command.id === 'filter.surfaceBlur').isFavorite);
  assert.ok(res.find((r) => r.command.id === 'filter.motionBlur').isRecent);

  const favOnly = engine.search('', { category: 'Favorites', favorites: favs });
  assert.equal(favOnly.length, 1);
  assert.equal(favOnly[0].command.id, 'filter.surfaceBlur');
});

test('Disabled categories are excluded from results', () => {
  const res = engine.search('blur', { disabledCategories: ['Filters'] });
  assert.ok(res.every((r) => r.command.category !== 'Filters'));
});
