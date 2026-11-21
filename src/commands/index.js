// Copyright 2026 erf81
// SPDX-License-Identifier: Apache-2.0

/**
 * ZAU Console Command Registry.
 * Independent of UI; extensible for future custom commands and user workflows.
 */
'use strict';

const { toolCommands } = require('./tools');
const { filterCommands } = require('./filters');
const { adjustmentCommands } = require('./adjustments');
const { layerCommands } = require('./layers');
const { selectionCommands } = require('./selections');
const { documentCommands } = require('./document');
const { viewCommands } = require('./view');
const { exportCommands } = require('./export');

const CATEGORIES = Object.freeze([
  'All',
  'Tools',
  'Filters',
  'Adjustments',
  'Layers',
  'Selections',
  'Document',
  'View',
  'Export',
]);

class CommandRegistry {
  constructor(initialCommands = []) {
    this._commands = new Map();
    for (const cmd of initialCommands) {
      this.register(cmd);
    }
  }

  register(command) {
    if (!command || typeof command.id !== 'string' || !command.id.trim()) {
      throw new Error('Command must define a non-empty string id.');
    }
    if (typeof command.handler !== 'function') {
      throw new Error(`Command "${command.id}" must define an executable handler function.`);
    }
    if (this._commands.has(command.id)) {
      throw new Error(`Duplicate command id "${command.id}".`);
    }
    this._commands.set(command.id, Object.freeze({ ...command }));
    return this;
  }

  unregister(id) {
    return this._commands.delete(id);
  }

  getById(id) {
    return this._commands.get(id) || null;
  }

  getAll() {
    return Array.from(this._commands.values());
  }

  getByCategory(category) {
    if (!category || category === 'All') return this.getAll();
    return this.getAll().filter((c) => c.category === category);
  }

  size() {
    return this._commands.size;
  }
}

function createDefaultRegistry() {
  return new CommandRegistry([
    ...toolCommands,
    ...filterCommands,
    ...adjustmentCommands,
    ...layerCommands,
    ...selectionCommands,
    ...documentCommands,
    ...viewCommands,
    ...exportCommands,
  ]);
}

module.exports = {
  CATEGORIES,
  CommandRegistry,
  createDefaultRegistry,
};
