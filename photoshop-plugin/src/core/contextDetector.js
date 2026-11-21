// Copyright 2026 erf81
// SPDX-License-Identifier: Apache-2.0

/**
 * Photoshop Document & Layer Context Detector.
 * Uses event-driven Photoshop notification listeners (no background polling).
 */
'use strict';

const { getPhotoshop, getUXP } = require('./psEnv.js');

const DEFAULT_CONTEXT = Object.freeze({
  hasDocument: false,
  documentName: null,
  documentId: null,
  width: 0,
  height: 0,
  resolution: 0,
  colorMode: null,
  hasActiveLayer: false,
  selectedLayerCount: 0,
  layerName: null,
  layerKind: null,
  isPixelLayer: false,
  isSmartObject: false,
  isAdjustmentLayer: false,
  isTextLayer: false,
  isGroupLayer: false,
  isBackgroundLayer: false,
  isLocked: false,
  hasSelection: false,
  hasLayerMask: false,
  photoshopVersion: null,
});

function normalizeLayerKind(kind) {
  if (!kind) return 'unknown';
  const raw = String(kind).toLowerCase();
  if (raw.includes('pixel') || raw === 'normal') return 'pixel';
  if (raw.includes('smartobject')) return 'smartObject';
  if (raw.includes('text')) return 'text';
  if (raw.includes('group')) return 'group';
  if (raw.includes('shape') || raw.includes('solidfill') || raw.includes('vector')) return 'shape';
  if (
    raw.includes('brightness') ||
    raw.includes('levels') ||
    raw.includes('curves') ||
    raw.includes('exposure') ||
    raw.includes('hue') ||
    raw.includes('colorbalance') ||
    raw.includes('blackandwhite') ||
    raw.includes('vibrance') ||
    raw.includes('photofilter') ||
    raw.includes('channelmixer') ||
    raw.includes('selectivecolor') ||
    raw.includes('gradientmap') ||
    raw.includes('invert') ||
    raw.includes('threshold') ||
    raw.includes('posterize') ||
    raw.includes('adjustment')
  ) {
    return 'adjustment';
  }
  return raw;
}

function getCurrentContext() {
  const ps = getPhotoshop();
  if (!ps || !ps.app) {
    return { ...DEFAULT_CONTEXT };
  }

  const app = ps.app;
  const uxp = getUXP();
  const photoshopVersion = app.version || (uxp && uxp.host && uxp.host.version) || null;
  const doc = app.activeDocument;

  if (!doc) {
    return {
      ...DEFAULT_CONTEXT,
      photoshopVersion,
    };
  }

  const activeLayers = Array.isArray(doc.activeLayers) ? doc.activeLayers : [];
  const layer = activeLayers.length > 0 ? activeLayers[0] : null;
  const layerKind = layer ? normalizeLayerKind(layer.kind) : null;

  let isLocked = false;
  if (layer) {
    isLocked = Boolean(
      layer.locked ||
      layer.allLocked ||
      layer.pixelsLocked ||
      layer.positionLocked
    );
  }

  let hasSelection = false;
  try {
    if (doc.selection && doc.selection.bounds) {
      const b = doc.selection.bounds;
      hasSelection = (b.right - b.left) > 0 && (b.bottom - b.top) > 0;
    }
  } catch (_) {
    hasSelection = false;
  }

  let hasLayerMask = false;
  try {
    if (layer && typeof layer.hasMask === 'boolean') {
      hasLayerMask = layer.hasMask;
    }
  } catch (_) {
    hasLayerMask = false;
  }

  let colorMode = null;
  try {
    colorMode = doc.mode ? String(doc.mode) : null;
  } catch (_) {
    colorMode = null;
  }

  return {
    hasDocument: true,
    documentName: doc.title || doc.name || 'Untitled',
    documentId: doc.id ?? null,
    width: Math.round(doc.width || 0),
    height: Math.round(doc.height || 0),
    resolution: Math.round(doc.resolution || 72),
    colorMode,
    hasActiveLayer: Boolean(layer),
    selectedLayerCount: activeLayers.length,
    layerName: layer ? layer.name : null,
    layerKind,
    isPixelLayer: layerKind === 'pixel',
    isSmartObject: layerKind === 'smartObject',
    isAdjustmentLayer: layerKind === 'adjustment',
    isTextLayer: layerKind === 'text',
    isGroupLayer: layerKind === 'group',
    isBackgroundLayer: Boolean(layer && layer.isBackgroundLayer),
    isLocked,
    hasSelection,
    hasLayerMask,
    photoshopVersion,
  };
}

/**
 * Evaluates whether a command can execute in the given Photoshop context.
 * Returns { allowed: boolean, reason?: string, suggestion?: string }
 */
function evaluateCommandAvailability(command, context) {
  if (!command) {
    return { allowed: false, reason: 'Unknown command.' };
  }
  if (command.available === false) {
    return {
      allowed: false,
      reason: command.unavailableReason || 'Not supported in this Photoshop version.',
    };
  }
  if (typeof command.handler !== 'function') {
    return { allowed: false, reason: 'Command handler is not implemented.' };
  }

  const ctx = context || DEFAULT_CONTEXT;

  if (command.requiresDocument && !ctx.hasDocument) {
    return {
      allowed: false,
      reason: 'Requires an open document.',
      suggestion: 'Open or create a document first.',
    };
  }

  if (command.requiresLayer && !ctx.hasActiveLayer) {
    return {
      allowed: false,
      reason: 'No active layer selected.',
      suggestion: 'Select a layer in the Layers panel.',
    };
  }

  if (command.requiresMultipleLayers && ctx.selectedLayerCount < 2) {
    return {
      allowed: false,
      reason: 'Select at least 2 layers.',
      suggestion: 'Hold Ctrl/Shift to select multiple layers.',
    };
  }

  if (command.requiresUnlockedLayer && ctx.isLocked) {
    return {
      allowed: false,
      reason: `Layer "${ctx.layerName || 'Active Layer'}" is locked.`,
      suggestion: 'Unlock the layer or duplicate it before running this command.',
    };
  }

  if (command.requiresPixelOrSmartObject && ctx.hasActiveLayer) {
    if (!ctx.isPixelLayer && !ctx.isSmartObject) {
      return {
        allowed: false,
        reason: `Requires a pixel layer or Smart Object (current: ${ctx.layerKind || 'unsupported'}).`,
        suggestion: 'Convert the layer to a Smart Object or rasterize it first.',
      };
    }
  }

  if (command.requiresPixelLayer && ctx.hasActiveLayer && !ctx.isPixelLayer) {
    return {
      allowed: false,
      reason: `Requires a pixel layer (current: ${ctx.layerKind || 'unsupported'}).`,
      suggestion: 'Rasterize the layer or select a pixel layer.',
    };
  }

  if (command.requiresSelection && !ctx.hasSelection) {
    return {
      allowed: false,
      reason: 'Requires an active selection.',
      suggestion: 'Create a selection first (e.g. Select All or Select Subject).',
    };
  }

  if (command.requiresGroupLayer && !ctx.isGroupLayer) {
    return {
      allowed: false,
      reason: 'Active layer is not a layer group.',
      suggestion: 'Select a layer group in the Layers panel.',
    };
  }

  if (command.unsupportedColorModes && ctx.colorMode) {
    const modeLower = ctx.colorMode.toLowerCase();
    for (const bad of command.unsupportedColorModes) {
      if (modeLower.includes(bad.toLowerCase())) {
        return {
          allowed: false,
          reason: `Not supported in ${ctx.colorMode} color mode.`,
          suggestion: 'Convert document to RGB Color (8-bit or 16-bit).',
        };
      }
    }
  }

  return { allowed: true };
}

/**
 * Subscribes to Photoshop document/layer/selection change events.
 * Returns an unsubscribe cleanup function.
 */
function subscribeContextChanges(onChange) {
  const ps = getPhotoshop();
  if (!ps || !ps.action || typeof ps.action.addNotificationListener !== 'function') {
    return () => {};
  }

  const events = [
    'open',
    'close',
    'make',
    'delete',
    'select',
    'set',
    'duplicate',
    'mergeLayersNew',
    'mergeVisible',
    'flattenImage',
    'canvasSize',
    'imageSize',
    'crop',
    'hostFocusChanged',
  ];

  let timer = null;
  const listener = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      onChange(getCurrentContext());
    }, 60);
  };

  try {
    ps.action.addNotificationListener(events, listener);
  } catch (err) {
    console.warn('[ZAU Context] Could not attach notification listener:', err);
  }

  return () => {
    if (timer) clearTimeout(timer);
    try {
      if (ps.action && typeof ps.action.removeNotificationListener === 'function') {
        ps.action.removeNotificationListener(events, listener);
      }
    } catch (_) {
      // Ignore cleanup errors on shutdown
    }
  };
}

module.exports = {
  DEFAULT_CONTEXT,
  normalizeLayerKind,
  getCurrentContext,
  evaluateCommandAvailability,
  subscribeContextChanges,
};
