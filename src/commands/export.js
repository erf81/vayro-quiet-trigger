// Copyright 2026 erf81
// SPDX-License-Identifier: Apache-2.0

/**
 * Category H: Export & Save Operations
 * Uses verified Adobe Photoshop built-in menu command IDs via core.performMenuCommand
 * so native Export / Save dialogs open cleanly and safely preserve user paths.
 */
'use strict';

const exportCommands = [
  {
    id: 'export.quickPng',
    name: 'Quick Export as PNG',
    category: 'Export',
    subcategory: 'EXPORT',
    description: 'Open Photoshop Quick Export as PNG save dialog.',
    keywords: ['export', 'quick', 'png', 'save', 'image'],
    aliases: ['png', 'خروجی png'],
    requiresDocument: true,
    requiresLayer: false,
    destructive: false,
    handler: async ({ performMenuCommand }) => performMenuCommand(3444, 'Quick Export as PNG'),
  },
  {
    id: 'export.quickJpeg',
    name: 'Export as JPEG (Export As)',
    category: 'Export',
    subcategory: 'EXPORT',
    description: 'Open Photoshop Export As dialog to export JPEG with quality and color profile control.',
    keywords: ['export', 'jpeg', 'jpg', 'quick', 'save', 'image'],
    aliases: ['jpg', 'jpeg', 'خروجی jpg'],
    requiresDocument: true,
    requiresLayer: false,
    destructive: false,
    handler: async ({ performMenuCommand }) => performMenuCommand(3443, 'Export as JPEG'),
  },
  {
    id: 'export.saveACopy',
    name: 'Save a Copy',
    category: 'Export',
    subcategory: 'SAVE',
    description: 'Open Photoshop Save a Copy dialog (PSD, JPEG, PNG, TIFF, PDF).',
    keywords: ['save', 'copy', 'export', 'file', 'psd', 'pdf', 'tiff'],
    aliases: ['save copy', 'ذخیره کپی'],
    requiresDocument: true,
    requiresLayer: false,
    destructive: false,
    handler: async ({ performMenuCommand }) => performMenuCommand(33, 'Save a Copy'),
  },
  {
    id: 'export.exportAs',
    name: 'Export As...',
    category: 'Export',
    subcategory: 'EXPORT',
    description: 'Open Photoshop full Export As dialog for multi-scale PNG/JPG/GIF export.',
    keywords: ['export', 'as', 'web', 'scale', 'png', 'jpg'],
    aliases: ['خروجی گرفتن'],
    requiresDocument: true,
    requiresLayer: false,
    destructive: false,
    handler: async ({ performMenuCommand }) => performMenuCommand(3443, 'Export As'),
  },
  {
    id: 'export.selectedLayers',
    name: 'Export Selected Layers...',
    category: 'Export',
    subcategory: 'EXPORT',
    description: 'Open Layer > Export As dialog scoped to the currently selected layer(s).',
    keywords: ['export', 'selected', 'layers', 'layer', 'asset', 'png'],
    aliases: ['export layer', 'خروجی لایه انتخابی'],
    requiresDocument: true,
    requiresLayer: true,
    destructive: false,
    handler: async ({ performMenuCommand }) => performMenuCommand(3447, 'Export Selected Layers'),
  },
];

module.exports = { exportCommands };
