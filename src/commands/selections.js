// Copyright 2026 erf81
// SPDX-License-Identifier: Apache-2.0

/**
 * Category E: Selection Operations
 */
'use strict';

const selectionCommands = [
  {
    id: 'selection.selectAll',
    name: 'Select All',
    category: 'Selections',
    subcategory: 'BASIC',
    description: 'Select the entire canvas.',
    keywords: ['select', 'all', 'selection', 'canvas'],
    aliases: ['ctrl+a', 'انتخاب همه'],
    requiresDocument: true,
    requiresLayer: false,
    destructive: false,
    handler: async ({ executeModal }) =>
      executeModal('Select All', async ({ app }) => {
        await app.activeDocument.selection.selectAll();
      }),
  },
  {
    id: 'selection.deselect',
    name: 'Deselect',
    category: 'Selections',
    subcategory: 'BASIC',
    description: 'Clear the current active selection.',
    keywords: ['deselect', 'clear', 'none', 'selection'],
    aliases: ['ctrl+d', 'لغو انتخاب'],
    requiresDocument: true,
    requiresLayer: false,
    requiresSelection: true,
    destructive: false,
    handler: async ({ executeModal }) =>
      executeModal('Deselect', async ({ app }) => {
        await app.activeDocument.selection.deselect();
      }),
  },
  {
    id: 'selection.reselect',
    name: 'Reselect',
    category: 'Selections',
    subcategory: 'BASIC',
    description: 'Restore the most recently cleared selection.',
    keywords: ['reselect', 'restore', 'previous', 'selection'],
    aliases: ['انتخاب مجدد'],
    requiresDocument: true,
    requiresLayer: false,
    destructive: false,
    handler: async ({ playDescriptors }) =>
      playDescriptors('Reselect', [
        {
          _obj: 'set',
          _target: [{ _ref: 'channel', _property: 'selection' }],
          to: { _enum: 'ordinal', _value: 'previous' },
          _options: { dialogOptions: 'dontDisplay' },
        },
      ]),
  },
  {
    id: 'selection.inverse',
    name: 'Inverse Selection',
    category: 'Selections',
    subcategory: 'MODIFY',
    description: 'Invert the active selection to select unselected areas.',
    keywords: ['inverse', 'invert', 'flip', 'selection'],
    aliases: ['invert selection', 'معکوس انتخاب'],
    requiresDocument: true,
    requiresLayer: false,
    requiresSelection: true,
    destructive: false,
    handler: async ({ executeModal }) =>
      executeModal('Inverse Selection', async ({ app }) => {
        await app.activeDocument.selection.inverse();
      }),
  },
  {
    id: 'selection.feather',
    name: 'Feather Selection',
    category: 'Selections',
    subcategory: 'MODIFY',
    description: 'Soften selection edges using Photoshop Feather dialog.',
    keywords: ['feather', 'soften', 'edge', 'blur', 'selection', 'modify'],
    aliases: ['modify selection', 'فدر', 'نرم کردن انتخاب'],
    requiresDocument: true,
    requiresLayer: false,
    requiresSelection: true,
    destructive: false,
    handler: async ({ performMenuCommand }) => performMenuCommand(1036, 'Feather Selection'),
  },
  {
    id: 'selection.expand',
    name: 'Expand Selection',
    category: 'Selections',
    subcategory: 'MODIFY',
    description: 'Grow the active selection outward by a pixel amount.',
    keywords: ['expand', 'grow', 'enlarge', 'selection', 'modify'],
    aliases: ['گسترش انتخاب'],
    requiresDocument: true,
    requiresLayer: false,
    requiresSelection: true,
    destructive: false,
    handler: async ({ performMenuCommand }) => performMenuCommand(1109, 'Expand Selection'),
  },
  {
    id: 'selection.contract',
    name: 'Contract Selection',
    category: 'Selections',
    subcategory: 'MODIFY',
    description: 'Shrink the active selection inward by a pixel amount.',
    keywords: ['contract', 'shrink', 'reduce', 'selection', 'modify'],
    aliases: ['کوچک کردن انتخاب'],
    requiresDocument: true,
    requiresLayer: false,
    requiresSelection: true,
    destructive: false,
    handler: async ({ performMenuCommand }) => performMenuCommand(1110, 'Contract Selection'),
  },
  {
    id: 'selection.smooth',
    name: 'Modify Selection — Smooth',
    category: 'Selections',
    subcategory: 'MODIFY',
    description: 'Smooth jagged selection corners using a sample radius.',
    keywords: ['smooth', 'modify', 'selection', 'round', 'edge'],
    aliases: ['modify selection', 'نرم کردن لبه'],
    requiresDocument: true,
    requiresLayer: false,
    requiresSelection: true,
    destructive: false,
    handler: async ({ performMenuCommand }) => performMenuCommand(1108, 'Smooth Selection'),
  },
  {
    id: 'selection.selectSubject',
    name: 'Select Subject',
    category: 'Selections',
    subcategory: 'AI',
    description: 'Automatically detect and select the primary subject using Adobe Sensei.',
    keywords: ['select', 'subject', 'ai', 'auto', 'person', 'cutout'],
    aliases: ['subject', 'انتخاب سوژه'],
    requiresDocument: true,
    requiresLayer: true,
    destructive: false,
    handler: async ({ playDescriptors }) =>
      playDescriptors(
        'Select Subject',
        [
          {
            _obj: 'autoCutout',
            sampleAllLayers: false,
            _options: { dialogOptions: 'dontDisplay' },
          },
        ],
        { interactive: true }
      ),
  },
  {
    id: 'selection.removeBackground',
    name: 'Remove Background',
    category: 'Selections',
    subcategory: 'AI',
    description: 'Detect the main subject and mask out the background non-destructively (PS 24+).',
    keywords: ['remove', 'background', 'cutout', 'mask', 'ai', 'transparent'],
    aliases: ['bg remove', 'حذف پس زمینه'],
    requiresDocument: true,
    requiresLayer: true,
    requiresUnlockedLayer: true,
    destructive: false,
    handler: async ({ playDescriptors }) =>
      playDescriptors(
        'Remove Background',
        [
          {
            _obj: 'removeBackground',
            _options: { dialogOptions: 'dontDisplay' },
          },
        ],
        { interactive: true }
      ),
  },
];

module.exports = { selectionCommands };
