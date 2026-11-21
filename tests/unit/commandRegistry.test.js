'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createDefaultRegistry, CATEGORIES } = require('../../photoshop-plugin/src/commands');

test('CommandRegistry loads all 8 categories with unique IDs and real handlers', () => {
  const registry = createDefaultRegistry();
  const all = registry.getAll();

  assert.ok(all.length >= 90, `Expected >= 90 commands, got ${all.length}`);

  const ids = new Set();
  for (const cmd of all) {
    assert.equal(typeof cmd.id, 'string');
    assert.ok(cmd.id.length > 0);
    assert.ok(!ids.has(cmd.id), `Duplicate id: ${cmd.id}`);
    ids.add(cmd.id);

    assert.equal(typeof cmd.name, 'string');
    assert.ok(cmd.name.length > 0);
    assert.ok(CATEGORIES.includes(cmd.category), `Invalid category: ${cmd.category}`);
    assert.equal(typeof cmd.description, 'string');
    assert.ok(Array.isArray(cmd.keywords));
    assert.equal(typeof cmd.handler, 'function', `Missing handler for ${cmd.id}`);
  }

  for (const cat of CATEGORIES.filter((c) => c !== 'All')) {
    const inCat = registry.getByCategory(cat);
    assert.ok(inCat.length > 0, `Category ${cat} should not be empty`);
  }
});

test('CommandRegistry rejects commands without handler or duplicate IDs', () => {
  const registry = createDefaultRegistry();
  assert.throws(() => registry.register({ id: 'bad.cmd', name: 'Bad' }), /handler/);
  assert.throws(
    () => registry.register({ id: 'filter.gaussianBlur', name: 'Dup', handler: async () => {} }),
    /Duplicate/
  );
});
