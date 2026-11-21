/**
 * Safe Command Executor for ZAU Console.
 * Enforces Photoshop UXP API v2 modal execution (core.executeAsModal),
 * context pre-flight validation, and destructive action confirmation.
 */
'use strict';

const { getPhotoshop } = require('./psEnv');
const { getCurrentContext, evaluateCommandAvailability } = require('./contextDetector');

/**
 * Wraps an operation inside Photoshop's required core.executeAsModal().
 */
async function executeModal(commandName, fn, options = {}) {
  const ps = getPhotoshop();
  if (!ps || !ps.core || typeof ps.core.executeAsModal !== 'function') {
    throw new Error('Photoshop UXP core.executeAsModal is unavailable in this environment.');
  }

  return ps.core.executeAsModal(
    async (executionContext) => {
      return fn({
        executionContext,
        ps,
        app: ps.app,
        action: ps.action,
        core: ps.core,
      });
    },
    {
      commandName: commandName || 'ZAU Console Command',
      interactive: Boolean(options.interactive),
    }
  );
}

/**
 * Runs one or more batchPlay descriptors inside a modal scope.
 */
async function playDescriptors(commandName, descriptors, options = {}) {
  return executeModal(
    commandName,
    async ({ action }) => {
      const result = await action.batchPlay(descriptors, {
        synchronousExecution: false,
      });
      if (Array.isArray(result)) {
        const errEntry = result.find((r) => r && r._obj === 'error');
        if (errEntry && errEntry.message) {
          throw new Error(errEntry.message);
        }
      }
      return result;
    },
    options
  );
}

/**
 * Selects a Photoshop tool by its Action Manager class name.
 */
async function selectTool(toolClass, displayName) {
  return playDescriptors(`Select ${displayName}`, [
    {
      _obj: 'select',
      _target: [{ _ref: toolClass }],
      _options: { dialogOptions: 'dontDisplay' },
    },
  ]);
}

/**
 * Triggers a Photoshop menu item via batchPlay menuItemType enum.
 */
async function playMenuItem(menuItemValue, displayName, options = {}) {
  return playDescriptors(
    displayName,
    [
      {
        _obj: 'select',
        _target: [
          {
            _ref: 'menuItemClass',
            _enum: 'menuItemType',
            _value: menuItemValue,
          },
        ],
        _options: { dialogOptions: options.dialogOptions || 'dontDisplay' },
      },
    ],
    { interactive: Boolean(options.interactive) }
  );
}

/**
 * Runs a Photoshop menu command by numeric commandID via core.performMenuCommand.
 */
async function performMenuCommand(commandID, displayName) {
  return executeModal(
    displayName,
    async ({ core }) => {
      if (typeof core.getMenuCommandState === 'function') {
        const enabled = await core.getMenuCommandState({ commandID });
        if (!enabled) {
          throw new Error(`"${displayName}" is currently unavailable in Photoshop.`);
        }
      }
      const res = await core.performMenuCommand({ commandID });
      if (res === false || (res && res.available === false)) {
        throw new Error(`"${displayName}" is currently unavailable in Photoshop.`);
      }
      return res;
    },
    { interactive: true }
  );
}

/**
 * Dynamically resolves a Photoshop menu item's commandID from live menuBarInfo
 * and executes it via core.performMenuCommand (safe for plugin-registered filters).
 */
async function performMenuByTitle(titleSubstring, displayName) {
  return executeModal(
    displayName,
    async ({ action, core }) => {
      const res = await action.batchPlay(
        [
          {
            _obj: 'get',
            _target: [
              { _property: 'menuBarInfo' },
              { _ref: 'application', _enum: 'ordinal', _value: 'targetEnum' },
            ],
          },
        ],
        { synchronousExecution: false }
      );
      const mb = res && res[0] && res[0].menuBarInfo;
      const needle = String(titleSubstring || '').toLowerCase();
      let matchedId = null;

      function walk(node) {
        if (!node || matchedId !== null) return;
        const list = node.submenu;
        if (!Array.isArray(list)) return;
        for (const item of list) {
          const clean = String(item.title || '').replace(/&/g, '').toLowerCase();
          if (clean.includes(needle) && typeof item.command === 'number' && item.command !== 0) {
            matchedId = item.command;
            return;
          }
          walk(item);
        }
      }
      walk(mb);

      if (matchedId === null) {
        throw new Error(`Menu command "${displayName}" was not found in this Photoshop version.`);
      }
      const runRes = await core.performMenuCommand({ commandID: matchedId });
      if (runRes === false || (runRes && runRes.available === false)) {
        throw new Error(`"${displayName}" is currently unavailable in Photoshop.`);
      }
      return runRes;
    },
    { interactive: true }
  );
}

/**
 * Opens a native interactive Photoshop filter dialog via batchPlay.
 */
async function runFilterDialog(filterObj, displayName, defaultParams = {}) {
  return playDescriptors(
    displayName,
    [
      {
        _obj: filterObj,
        ...defaultParams,
        _options: { dialogOptions: 'display' },
      },
    ],
    { interactive: true }
  );
}

/**
 * Creates a non-destructive Photoshop Adjustment Layer via batchPlay.
 */
async function createAdjustmentLayer(adjustmentTypeObj, displayName, extraTypeProps = {}) {
  return playDescriptors(displayName, [
    {
      _obj: 'make',
      _target: [{ _ref: 'adjustmentLayer' }],
      using: {
        _obj: 'adjustmentLayer',
        type: {
          _obj: adjustmentTypeObj,
          ...extraTypeProps,
        },
      },
      _options: { dialogOptions: 'dontDisplay' },
    },
  ]);
}

class CommandExecutor {
  constructor(options = {}) {
    this.getSettings = options.getSettings || (() => ({ confirmDestructiveActions: true }));
    this.confirmDestructive = options.confirmDestructive || null;
    this.requestInput = options.requestInput || null;
    this.onExecuted = options.onExecuted || null;
  }

  async execute(command, overrides = {}) {
    const context = overrides.context || getCurrentContext();
    const check = evaluateCommandAvailability(command, context);

    if (!check.allowed) {
      return {
        ok: false,
        blocked: true,
        commandId: command ? command.id : null,
        error: check.reason,
        suggestion: check.suggestion || null,
      };
    }

    let inputValue = overrides.inputValue;
    if (command.requiresInput && inputValue === undefined && typeof this.requestInput === 'function') {
      inputValue = await this.requestInput(command, context);
      if (inputValue === null || inputValue === undefined) {
        return {
          ok: false,
          cancelled: true,
          commandId: command.id,
          message: 'Cancelled by user.',
        };
      }
    }

    const settings = this.getSettings() || {};
    const shouldConfirm = Boolean(
      command.destructive &&
      settings.confirmDestructiveActions !== false &&
      !overrides.skipConfirmation
    );

    if (shouldConfirm && typeof this.confirmDestructive === 'function') {
      const confirmed = await this.confirmDestructive(command, context);
      if (!confirmed) {
        return {
          ok: false,
          cancelled: true,
          commandId: command.id,
          message: 'Cancelled by user.',
        };
      }
    }

    try {
      const result = await command.handler({
        context,
        inputValue,
        executeModal,
        playDescriptors,
        selectTool,
        playMenuItem,
        performMenuCommand,
        performMenuByTitle,
        runFilterDialog,
        createAdjustmentLayer,
        ps: getPhotoshop(),
      });

      if (typeof this.onExecuted === 'function') {
        this.onExecuted(command, context);
      }

      return {
        ok: true,
        commandId: command.id,
        commandName: command.name,
        result,
      };
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      // User pressing Cancel inside a native Photoshop filter dialog is not a crash
      if (message.toLowerCase().includes('cancel') || message.includes('user cancelled')) {
        return {
          ok: false,
          cancelled: true,
          commandId: command.id,
          message: 'Dialog cancelled.',
        };
      }
      return {
        ok: false,
        commandId: command.id,
        error: message,
      };
    }
  }
}

module.exports = {
  CommandExecutor,
  executeModal,
  playDescriptors,
  selectTool,
  playMenuItem,
  performMenuCommand,
  performMenuByTitle,
  runFilterDialog,
  createAdjustmentLayer,
};
