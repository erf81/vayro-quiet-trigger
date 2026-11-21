/**
 * Category F: Document & Canvas Operations
 */
'use strict';

const documentCommands = [
  {
    id: 'doc.new',
    name: 'New Document',
    category: 'Document',
    subcategory: 'FILE',
    description: 'Open Photoshop New Document dialog.',
    keywords: ['new', 'document', 'file', 'create', 'canvas'],
    aliases: ['ctrl+n', 'سند جدید'],
    requiresDocument: false,
    requiresLayer: false,
    destructive: false,
    handler: async ({ performMenuCommand }) => performMenuCommand(10, 'New Document'),
  },
  {
    id: 'doc.imageSize',
    name: 'Image Size',
    category: 'Document',
    subcategory: 'SIZE',
    description: 'Open Image Size dialog to inspect or resample pixel dimensions and DPI.',
    keywords: ['image', 'size', 'resize', 'resolution', 'dpi', 'dimensions', 'scale'],
    aliases: ['resize', 'اندازه تصویر'],
    requiresDocument: true,
    requiresLayer: false,
    destructive: false,
    handler: async ({ performMenuCommand }) => performMenuCommand(1030, 'Image Size'),
  },
  {
    id: 'doc.canvasSize',
    name: 'Canvas Size',
    category: 'Document',
    subcategory: 'SIZE',
    description: 'Open Canvas Size dialog to expand or trim canvas bounds.',
    keywords: ['canvas', 'size', 'bounds', 'extend', 'pad', 'crop'],
    aliases: ['اندازه بوم'],
    requiresDocument: true,
    requiresLayer: false,
    destructive: false,
    handler: async ({ performMenuCommand }) => performMenuCommand(1031, 'Canvas Size'),
  },
  {
    id: 'doc.cropToSelection',
    name: 'Crop Canvas to Selection',
    category: 'Document',
    subcategory: 'CANVAS',
    description: 'Crop the document to the bounding box of the current selection.',
    keywords: ['crop', 'trim', 'cut', 'canvas', 'selection'],
    aliases: ['canvas crop', 'برش بوم'],
    requiresDocument: true,
    requiresLayer: false,
    requiresSelection: true,
    destructive: true,
    nonDestructiveTip: 'You can undo with Ctrl+Z or use the Crop Tool with "Delete Cropped Pixels" unchecked.',
    handler: async ({ playDescriptors }) =>
      playDescriptors('Crop Canvas to Selection', [
        {
          _obj: 'crop',
          delete: false,
          _options: { dialogOptions: 'dontDisplay' },
        },
      ]),
  },
  {
    id: 'doc.rotate90CW',
    name: 'Rotate Canvas 90° Clockwise',
    category: 'Document',
    subcategory: 'ROTATE',
    description: 'Rotate the entire canvas 90 degrees clockwise.',
    keywords: ['rotate', 'canvas', '90', 'clockwise', 'cw', 'turn'],
    aliases: ['rotate canvas', 'چرخش بوم'],
    requiresDocument: true,
    requiresLayer: false,
    destructive: false,
    handler: async ({ executeModal }) =>
      executeModal('Rotate Canvas 90° CW', async ({ app }) => {
        await app.activeDocument.rotate(90);
      }),
  },
  {
    id: 'doc.rotate90CCW',
    name: 'Rotate Canvas 90° Counter-Clockwise',
    category: 'Document',
    subcategory: 'ROTATE',
    description: 'Rotate the entire canvas 90 degrees counter-clockwise.',
    keywords: ['rotate', 'canvas', '90', 'ccw', 'counter', 'left'],
    aliases: ['rotate left', 'چرخش چپ'],
    requiresDocument: true,
    requiresLayer: false,
    destructive: false,
    handler: async ({ executeModal }) =>
      executeModal('Rotate Canvas 90° CCW', async ({ app }) => {
        await app.activeDocument.rotate(-90);
      }),
  },
  {
    id: 'doc.flipHorizontal',
    name: 'Flip Canvas Horizontal',
    category: 'Document',
    subcategory: 'TRANSFORM',
    description: 'Mirror the entire document horizontally.',
    keywords: ['flip', 'horizontal', 'mirror', 'canvas'],
    aliases: ['mirror', 'قرینه افقی'],
    requiresDocument: true,
    requiresLayer: false,
    destructive: false,
    handler: async ({ playDescriptors }) =>
      playDescriptors('Flip Canvas Horizontal', [
        {
          _obj: 'flip',
          _target: [{ _ref: 'document', _enum: 'ordinal', _value: 'first' }],
          axis: { _enum: 'orientation', _value: 'horizontal' },
          _options: { dialogOptions: 'dontDisplay' },
        },
      ]),
  },
  {
    id: 'doc.flipVertical',
    name: 'Flip Canvas Vertical',
    category: 'Document',
    subcategory: 'TRANSFORM',
    description: 'Flip the entire document vertically (upside down).',
    keywords: ['flip', 'vertical', 'invert', 'canvas'],
    aliases: ['قرینه عمودی'],
    requiresDocument: true,
    requiresLayer: false,
    destructive: false,
    handler: async ({ playDescriptors }) =>
      playDescriptors('Flip Canvas Vertical', [
        {
          _obj: 'flip',
          _target: [{ _ref: 'document', _enum: 'ordinal', _value: 'first' }],
          axis: { _enum: 'orientation', _value: 'vertical' },
          _options: { dialogOptions: 'dontDisplay' },
        },
      ]),
  },
  {
    id: 'doc.newGuideLayout',
    name: 'New Guide Layout',
    category: 'Document',
    subcategory: 'GUIDES',
    description: 'Open New Guide Layout dialog for columns, rows, and margins.',
    keywords: ['guides', 'guide', 'layout', 'columns', 'margins', 'grid'],
    aliases: ['guides', 'خطوط راهنما'],
    requiresDocument: true,
    requiresLayer: false,
    destructive: false,
    handler: async ({ performMenuCommand }) => performMenuCommand(5614, 'New Guide Layout'),
  },
  {
    id: 'doc.toggleGrid',
    name: 'Show / Hide Grid',
    category: 'Document',
    subcategory: 'GUIDES',
    description: 'Toggle the document alignment grid overlay.',
    keywords: ['grid', 'show', 'hide', 'toggle', 'guides'],
    aliases: ['شبکه', 'گرید'],
    requiresDocument: true,
    requiresLayer: false,
    destructive: false,
    handler: async ({ playMenuItem }) =>
      playMenuItem('toggleGrid', 'Toggle Grid'),
  },
  {
    id: 'doc.info',
    name: 'Document Information',
    category: 'Document',
    subcategory: 'INFO',
    description: 'Display active document dimensions, DPI, color mode, and layer summary.',
    keywords: ['document', 'info', 'information', 'dimensions', 'dpi', 'metadata', 'status'],
    aliases: ['doc info', 'اطلاعات سند'],
    requiresDocument: true,
    requiresLayer: false,
    destructive: false,
    handler: async ({ context }) => ({
      infoMessage: `${context.documentName} — ${context.width}×${context.height} px @ ${context.resolution} DPI (${context.colorMode || 'Unknown'}) · Layer: ${context.layerName || 'None'}`,
    }),
  },
];

module.exports = { documentCommands };
