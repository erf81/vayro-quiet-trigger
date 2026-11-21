'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { setMockEnv } = require('../src/core/psEnv');
const { evaluateCommandAvailability, DEFAULT_CONTEXT } = require('../src/core/contextDetector');
const { CommandExecutor } = require('../src/core/commandExecutor');
const { createDefaultRegistry } = require('../src/commands');

const registry = createDefaultRegistry();

function createMockPhotoshop() {
  const calls = { modal: [], batchPlay: [] };
  const mockPs = {
    app: {
      version: '26.8.0',
      activeDocument: {
        title: 'HeroBanner.psd',
        id: 1,
        width: 1920,
        height: 1080,
        resolution: 72,
        mode: 'RGBColorMode',
        activeLayers: [{ name: 'Subject', kind: 'pixel', locked: false }],
        selection: { bounds: { left: 0, top: 0, right: 500, bottom: 500 } },
        createLayer: async () => ({ name: 'Layer' }),
        rotate: async () => {},
      },
    },
    core: {
      executeAsModal: async (fn, opts) => {
        calls.modal.push(opts);
        return fn({});
      },
    },
    action: {
      batchPlay: async (descriptors) => {
        calls.batchPlay.push(descriptors);
        return [{}];
      },
    },
  };
  return { mockPs, calls };
}

test('No open document blocks document-dependent commands but allows Tools & New Document', () => {
  const gBlur = registry.getById('filter.gaussianBlur');
  const moveTool = registry.getById('tool.move');
  const newDoc = registry.getById('doc.new');

  assert.equal(evaluateCommandAvailability(gBlur, DEFAULT_CONTEXT).allowed, false);
  assert.equal(evaluateCommandAvailability(moveTool, DEFAULT_CONTEXT).allowed, true);
  assert.equal(evaluateCommandAvailability(newDoc, DEFAULT_CONTEXT).allowed, true);
});

test('Locked layer blocks destructive/pixel filter commands with clear reason', () => {
  const lockedCtx = {
    ...DEFAULT_CONTEXT,
    hasDocument: true,
    hasActiveLayer: true,
    layerName: 'Background',
    layerKind: 'pixel',
    isPixelLayer: true,
    isLocked: true,
  };
  const gBlur = registry.getById('filter.gaussianBlur');
  const check = evaluateCommandAvailability(gBlur, lockedCtx);
  assert.equal(check.allowed, false);
  assert.match(check.reason, /locked/i);
});

test('Smart Object allows filters; Text layer blocks pixel/SO filters with helpful suggestion', () => {
  const soCtx = {
    ...DEFAULT_CONTEXT,
    hasDocument: true,
    hasActiveLayer: true,
    layerKind: 'smartObject',
    isSmartObject: true,
  };
  const textCtx = {
    ...DEFAULT_CONTEXT,
    hasDocument: true,
    hasActiveLayer: true,
    layerKind: 'text',
    isTextLayer: true,
  };
  const gBlur = registry.getById('filter.gaussianBlur');
  assert.equal(evaluateCommandAvailability(gBlur, soCtx).allowed, true);

  const textCheck = evaluateCommandAvailability(gBlur, textCtx);
  assert.equal(textCheck.allowed, false);
  assert.match(textCheck.suggestion, /Smart Object/i);
});

test('CommandExecutor wraps execution in core.executeAsModal and dispatches batchPlay', async () => {
  const { mockPs, calls } = createMockPhotoshop();
  setMockEnv({ photoshop: mockPs });

  const executor = new CommandExecutor();
  const gBlur = registry.getById('filter.gaussianBlur');
  const res = await executor.execute(gBlur, {
    context: {
      ...DEFAULT_CONTEXT,
      hasDocument: true,
      hasActiveLayer: true,
      isPixelLayer: true,
      layerKind: 'pixel',
    },
  });

  assert.equal(res.ok, true);
  assert.equal(calls.modal.length, 1);
  assert.equal(calls.modal[0].interactive, true);
  assert.equal(calls.batchPlay[0][0]._obj, 'gaussianBlur');
  assert.equal(calls.batchPlay[0][0]._options.dialogOptions, 'display');

  setMockEnv(null);
});

test('Destructive command prompts confirmation and cancels cleanly when declined', async () => {
  const { mockPs, calls } = createMockPhotoshop();
  setMockEnv({ photoshop: mockPs });

  let prompted = false;
  const executor = new CommandExecutor({
    getSettings: () => ({ confirmDestructiveActions: true }),
    confirmDestructive: async () => {
      prompted = true;
      return false;
    },
  });

  const delCmd = registry.getById('layer.delete');
  const res = await executor.execute(delCmd, {
    context: {
      ...DEFAULT_CONTEXT,
      hasDocument: true,
      hasActiveLayer: true,
      isPixelLayer: true,
      isLocked: false,
    },
  });

  assert.equal(prompted, true);
  assert.equal(res.ok, false);
  assert.equal(res.cancelled, true);
  assert.equal(calls.modal.length, 0);

  setMockEnv(null);
});
