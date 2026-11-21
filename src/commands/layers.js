// Copyright 2026 erf81
// SPDX-License-Identifier: Apache-2.0

/**
 * Category D: Layer Operations
 * Uses Photoshop DOM API v2 where exposed and verified batchPlay descriptors otherwise.
 */
'use strict';

const layerCommands = [
  {
    id: 'layer.new',
    name: 'New Layer',
    category: 'Layers',
    subcategory: 'CREATE',
    description: 'Create a new empty pixel layer above the active layer.',
    keywords: ['new', 'layer', 'create', 'add', 'blank'],
    aliases: ['add layer', 'لایه جدید'],
    requiresDocument: true,
    requiresLayer: false,
    destructive: false,
    handler: async ({ executeModal }) =>
      executeModal('New Layer', async ({ app }) => {
        return app.activeDocument.createLayer({ name: 'Layer' });
      }),
  },
  {
    id: 'layer.duplicate',
    name: 'Duplicate Layer',
    category: 'Layers',
    subcategory: 'EDIT',
    description: 'Duplicate the currently selected layer(s).',
    keywords: ['duplicate', 'copy', 'clone', 'layer'],
    aliases: ['copy layer', 'کپی لایه', 'تکثیر لایه'],
    requiresDocument: true,
    requiresLayer: true,
    destructive: false,
    handler: async ({ playDescriptors }) =>
      playDescriptors('Duplicate Layer', [
        {
          _obj: 'duplicate',
          _target: [{ _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' }],
          _options: { dialogOptions: 'dontDisplay' },
        },
      ]),
  },
  {
    id: 'layer.delete',
    name: 'Delete Layer',
    category: 'Layers',
    subcategory: 'EDIT',
    description: 'Delete the currently selected layer(s) (Undoable with Ctrl+Z).',
    keywords: ['delete', 'remove', 'trash', 'layer'],
    aliases: ['remove layer', 'حذف لایه'],
    requiresDocument: true,
    requiresLayer: true,
    requiresUnlockedLayer: true,
    destructive: true,
    nonDestructiveTip: 'Consider toggling layer visibility instead if you may need it later.',
    handler: async ({ executeModal }) =>
      executeModal('Delete Layer', async ({ app }) => {
        const layers = app.activeDocument.activeLayers;
        for (const lyr of [...layers]) {
          await lyr.delete();
        }
      }),
  },
  {
    id: 'layer.rename',
    name: 'Rename Layer',
    category: 'Layers',
    subcategory: 'EDIT',
    description: 'Rename the active layer directly from ZAU Console.',
    keywords: ['rename', 'name', 'label', 'layer'],
    aliases: ['تغییر نام لایه'],
    requiresDocument: true,
    requiresLayer: true,
    requiresInput: {
      title: 'Rename Active Layer',
      placeholder: 'Enter new layer name...',
      submitLabel: 'Rename',
    },
    destructive: false,
    handler: async ({ executeModal, inputValue }) => {
      const nextName = typeof inputValue === 'string' ? inputValue.trim() : '';
      if (!nextName) {
        throw new Error('Layer name cannot be empty.');
      }
      return executeModal('Rename Layer', async ({ app }) => {
        const layer = app.activeDocument.activeLayers[0];
        if (!layer) throw new Error('No active layer selected.');
        layer.name = nextName;
        return { layerName: layer.name };
      });
    },
  },
  {
    id: 'layer.mergeLayers',
    name: 'Merge Layers',
    category: 'Layers',
    subcategory: 'MERGE',
    description: 'Merge selected layers (or merge down into the layer below).',
    keywords: ['merge', 'combine', 'flatten', 'down', 'layers'],
    aliases: ['merge down', 'ادغام لایه ها'],
    requiresDocument: true,
    requiresLayer: true,
    requiresUnlockedLayer: true,
    destructive: true,
    nonDestructiveTip: 'Consider Grouping Layers or Converting to a Smart Object to keep layers editable.',
    handler: async ({ playDescriptors }) =>
      playDescriptors('Merge Layers', [
        {
          _obj: 'mergeLayersNew',
          _options: { dialogOptions: 'dontDisplay' },
        },
      ]),
  },
  {
    id: 'layer.mergeVisible',
    name: 'Merge Visible',
    category: 'Layers',
    subcategory: 'MERGE',
    description: 'Merge all currently visible layers into a single layer.',
    keywords: ['merge', 'visible', 'combine', 'flatten'],
    aliases: ['ادغام لایه های قابل مشاهده'],
    requiresDocument: true,
    requiresLayer: false,
    destructive: true,
    nonDestructiveTip: 'Undoable via Ctrl+Z, but discards individual layer editability.',
    handler: async ({ playDescriptors }) =>
      playDescriptors('Merge Visible', [
        {
          _obj: 'mergeVisible',
          _options: { dialogOptions: 'dontDisplay' },
        },
      ]),
  },
  {
    id: 'layer.group',
    name: 'Group Layers',
    category: 'Layers',
    subcategory: 'ORGANIZE',
    description: 'Place the selected layer(s) into a new Layer Group.',
    keywords: ['group', 'folder', 'organize', 'layers'],
    aliases: ['make group', 'گروه بندی لایه ها'],
    requiresDocument: true,
    requiresLayer: true,
    destructive: false,
    handler: async ({ playDescriptors }) =>
      playDescriptors('Group Layers', [
        {
          _obj: 'make',
          _target: [{ _ref: 'layerSection' }],
          from: { _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' },
          _options: { dialogOptions: 'dontDisplay' },
        },
      ]),
  },
  {
    id: 'layer.ungroup',
    name: 'Ungroup Layers',
    category: 'Layers',
    subcategory: 'ORGANIZE',
    description: 'Dissolve the selected Layer Group while keeping its child layers.',
    keywords: ['ungroup', 'unfolder', 'dissolve', 'group', 'layers'],
    aliases: ['خارج کردن از گروه'],
    requiresDocument: true,
    requiresLayer: true,
    requiresGroupLayer: true,
    destructive: false,
    handler: async ({ playDescriptors }) =>
      playDescriptors('Ungroup Layers', [
        {
          _obj: 'ungroupLayersEvent',
          _target: [{ _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' }],
          _options: { dialogOptions: 'dontDisplay' },
        },
      ]),
  },
  {
    id: 'layer.toggleLock',
    name: 'Lock / Unlock Layer',
    category: 'Layers',
    subcategory: 'PROTECT',
    description: 'Toggle full lock protection on the active layer.',
    keywords: ['lock', 'unlock', 'protect', 'freeze', 'layer'],
    aliases: ['lock layer', 'قفل لایه'],
    requiresDocument: true,
    requiresLayer: true,
    destructive: false,
    handler: async ({ executeModal }) =>
      executeModal('Toggle Layer Lock', async ({ app }) => {
        const layer = app.activeDocument.activeLayers[0];
        if (!layer) throw new Error('No active layer selected.');
        if (typeof layer.allLocked === 'boolean') {
          layer.allLocked = !layer.allLocked;
        } else {
          layer.locked = !layer.locked;
        }
      }),
  },
  {
    id: 'layer.convertToSmartObject',
    name: 'Convert to Smart Object',
    category: 'Layers',
    subcategory: 'SMART OBJECT',
    description: 'Wrap selected layer(s) in a non-destructive Smart Object.',
    keywords: ['smart', 'object', 'convert', 'non-destructive', 'so'],
    aliases: ['smart object', 'so', 'اسمارت آبجکت'],
    requiresDocument: true,
    requiresLayer: true,
    destructive: false,
    handler: async ({ playDescriptors }) =>
      playDescriptors('Convert to Smart Object', [
        {
          _obj: 'newPlacedLayer',
          _options: { dialogOptions: 'dontDisplay' },
        },
      ]),
  },
  {
    id: 'layer.rasterize',
    name: 'Rasterize Layer',
    category: 'Layers',
    subcategory: 'CONVERT',
    description: 'Convert a Smart Object, text, or vector layer into pixels.',
    keywords: ['rasterize', 'pixel', 'flatten', 'convert', 'layer'],
    aliases: ['رسترایز'],
    requiresDocument: true,
    requiresLayer: true,
    requiresUnlockedLayer: true,
    destructive: true,
    nonDestructiveTip: 'Duplicate the layer first if you want to keep an editable vector/Smart Object copy.',
    handler: async ({ playDescriptors }) =>
      playDescriptors('Rasterize Layer', [
        {
          _obj: 'rasterizeLayer',
          _target: [{ _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' }],
          _options: { dialogOptions: 'dontDisplay' },
        },
      ]),
  },
  {
    id: 'layer.createClippingMask',
    name: 'Create / Release Clipping Mask',
    category: 'Layers',
    subcategory: 'MASK',
    description: 'Clip the active layer to the transparency of the layer below.',
    keywords: ['clip', 'clipping', 'mask', 'layer'],
    aliases: ['clipping mask', 'کلیپینگ مسک'],
    requiresDocument: true,
    requiresLayer: true,
    destructive: false,
    handler: async ({ playDescriptors }) =>
      playDescriptors('Create Clipping Mask', [
        {
          _obj: 'groupEvent',
          _target: [{ _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' }],
          _options: { dialogOptions: 'dontDisplay' },
        },
      ]),
  },
  {
    id: 'layer.createMask',
    name: 'Create Layer Mask',
    category: 'Layers',
    subcategory: 'MASK',
    description: 'Add a Reveal All (or Reveal Selection) Layer Mask to the active layer.',
    keywords: ['mask', 'layer mask', 'add mask', 'reveal', 'hide'],
    aliases: ['add layer mask', 'ماسک لایه', 'ساخت ماسک'],
    requiresDocument: true,
    requiresLayer: true,
    destructive: false,
    handler: async ({ playDescriptors, context }) =>
      playDescriptors('Create Layer Mask', [
        {
          _obj: 'make',
          new: { _class: 'channel' },
          at: { _ref: 'channel', _enum: 'channel', _value: 'mask' },
          using: {
            _enum: 'userMaskEnabled',
            _value: context && context.hasSelection ? 'revealSelection' : 'revealAll',
          },
          _options: { dialogOptions: 'dontDisplay' },
        },
      ]),
  },
  {
    id: 'layer.applyMask',
    name: 'Apply Layer Mask',
    category: 'Layers',
    subcategory: 'MASK',
    description: 'Permanently bake the active layer mask into layer transparency.',
    keywords: ['mask', 'apply', 'bake', 'commit', 'layer mask'],
    aliases: ['apply mask', 'اعمال ماسک'],
    requiresDocument: true,
    requiresLayer: true,
    requiresUnlockedLayer: true,
    destructive: true,
    nonDestructiveTip: 'Keeping the mask unapplied preserves non-destructive editing.',
    handler: async ({ playDescriptors }) =>
      playDescriptors('Apply Layer Mask', [
        {
          _obj: 'delete',
          _target: [{ _ref: 'channel', _enum: 'channel', _value: 'mask' }],
          apply: true,
          _options: { dialogOptions: 'dontDisplay' },
        },
      ]),
  },
];

module.exports = { layerCommands };
