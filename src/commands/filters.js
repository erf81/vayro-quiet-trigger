// Copyright 2026 erf81
// SPDX-License-Identifier: Apache-2.0

/**
 * Category B: Filters & Effects
 * Opens native Photoshop interactive filter dialogs via batchPlay (dialogOptions: "display")
 * wrapped in core.executeAsModal({ interactive: true }).
 */
'use strict';

function makeFilterCommand({
  id,
  name,
  subcategory,
  filterObj,
  defaultParams,
  description,
  keywords,
  aliases,
  menuItemValue,
  commandID,
  menuTitle,
}) {
  return {
    id,
    name,
    category: 'Filters',
    subcategory,
    description,
    keywords,
    aliases: aliases || [],
    requiresDocument: true,
    requiresLayer: true,
    requiresUnlockedLayer: true,
    requiresPixelOrSmartObject: true,
    unsupportedColorModes: ['bitmap', 'indexed'],
    destructive: false,
    nonDestructiveTip: 'Convert the layer to a Smart Object first to apply as an editable Smart Filter.',
    handler: async ({ runFilterDialog, playMenuItem, performMenuCommand, performMenuByTitle }) => {
      if (commandID) {
        return performMenuCommand(commandID, name);
      }
      if (menuTitle) {
        return performMenuByTitle(menuTitle, name);
      }
      if (menuItemValue) {
        return playMenuItem(menuItemValue, name, { dialogOptions: 'display', interactive: true });
      }
      return runFilterDialog(filterObj, name, defaultParams || {});
    },
  };
}

const filterCommands = [
  makeFilterCommand({
    id: 'filter.gaussianBlur',
    name: 'Gaussian Blur',
    subcategory: 'BLUR',
    filterObj: 'gaussianBlur',
    defaultParams: { radius: { _unit: 'pixelsUnit', _value: 4 } },
    description: 'Apply smooth Gaussian Blur to the active layer.',
    keywords: ['blur', 'gaussian', 'soften', 'smooth', 'defocus'],
    aliases: ['gblur', 'blur filter', 'بلور', 'محو گوسی'],
  }),
  makeFilterCommand({
    id: 'filter.motionBlur',
    name: 'Motion Blur',
    subcategory: 'BLUR',
    filterObj: 'motionBlur',
    defaultParams: {
      angle: 0,
      distance: { _unit: 'pixelsUnit', _value: 15 },
    },
    description: 'Apply directional motion blur along a chosen angle.',
    keywords: ['blur', 'motion', 'directional', 'speed', 'streak'],
    aliases: ['mblur', 'موشن بلور', 'محو حرکتی'],
  }),
  makeFilterCommand({
    id: 'filter.lensBlur',
    name: 'Lens Blur',
    subcategory: 'BLUR',
    filterObj: 'lensBlur',
    description: 'Simulate realistic camera bokeh and depth-of-field blur.',
    keywords: ['blur', 'lens', 'bokeh', 'dof', 'depth', 'camera'],
    aliases: ['bokeh blur', 'لنز بلور', 'بوکه'],
  }),
  makeFilterCommand({
    id: 'filter.surfaceBlur',
    name: 'Surface Blur',
    subcategory: 'BLUR',
    filterObj: 'surfaceBlur',
    defaultParams: {
      radius: { _unit: 'pixelsUnit', _value: 5 },
      threshold: 15,
    },
    description: 'Smooth surfaces and skin while preserving sharp edges.',
    keywords: ['blur', 'surface', 'smooth', 'skin', 'edge', 'denoise'],
    aliases: ['sblur', 'محو سطح'],
  }),
  makeFilterCommand({
    id: 'filter.blurGalleryField',
    name: 'Blur Gallery — Field Blur',
    subcategory: 'BLUR',
    filterObj: 'blurbTransform',
    commandID: 2225,
    description: 'Open Blur Gallery (Field Blur) for multi-point depth blur.',
    keywords: ['blur', 'gallery', 'field', 'tilt', 'iris', 'depth'],
    aliases: ['blur gallery', 'گالری بلور'],
  }),
  makeFilterCommand({
    id: 'filter.smartSharpen',
    name: 'Smart Sharpen',
    subcategory: 'SHARPEN',
    filterObj: 'smartSharpen',
    defaultParams: {
      amount: { _unit: 'percentUnit', _value: 100 },
      radius: { _unit: 'pixelsUnit', _value: 1.5 },
    },
    description: 'Sharpen details with adaptive halo and noise control.',
    keywords: ['sharp', 'sharpen', 'smart', 'detail', 'crisp', 'focus'],
    aliases: ['sharpen', 'شارپ هوشمند', 'وضوح'],
  }),
  makeFilterCommand({
    id: 'filter.unsharpMask',
    name: 'Unsharp Mask',
    subcategory: 'SHARPEN',
    filterObj: 'unsharpMask',
    defaultParams: {
      amount: { _unit: 'percentUnit', _value: 100 },
      radius: { _unit: 'pixelsUnit', _value: 1.5 },
      threshold: 0,
    },
    description: 'Classic edge-contrast sharpening with Amount, Radius, and Threshold.',
    keywords: ['sharp', 'sharpen', 'unsharp', 'mask', 'usm', 'crisp'],
    aliases: ['usm', 'آنشارپ مسک'],
  }),
  makeFilterCommand({
    id: 'filter.highPass',
    name: 'High Pass',
    subcategory: 'OTHER',
    filterObj: 'highPass',
    defaultParams: { radius: { _unit: 'pixelsUnit', _value: 3 } },
    description: 'Isolate high-frequency edge detail (ideal for Overlay sharpening).',
    keywords: ['high', 'pass', 'sharp', 'sharpen', 'frequency', 'detail', 'edge'],
    aliases: ['hp', 'های پس'],
  }),
  makeFilterCommand({
    id: 'filter.addNoise',
    name: 'Add Noise',
    subcategory: 'NOISE',
    filterObj: 'addNoise',
    defaultParams: {
      amount: { _unit: 'percentUnit', _value: 5 },
      distribution: { _enum: 'distribution', _value: 'gaussianDistribution' },
      monochromatic: true,
    },
    description: 'Add film-like grain or uniform/Gaussian noise.',
    keywords: ['noise', 'grain', 'film', 'texture', 'add'],
    aliases: ['grain', 'نویز', 'گرین'],
  }),
  makeFilterCommand({
    id: 'filter.reduceNoise',
    name: 'Reduce Noise',
    subcategory: 'NOISE',
    filterObj: 'denoise',
    menuTitle: 'Reduce Noise...',
    description: 'Reduce luminance and color noise while preserving edges.',
    keywords: ['noise', 'reduce', 'denoise', 'clean', 'smooth'],
    aliases: ['denoise', 'کاهش نویز'],
  }),
  makeFilterCommand({
    id: 'filter.median',
    name: 'Median',
    subcategory: 'NOISE',
    filterObj: 'median',
    defaultParams: { radius: { _unit: 'pixelsUnit', _value: 2 } },
    description: 'Blend pixel brightness within a radius to remove dust and speckles.',
    keywords: ['median', 'noise', 'dust', 'smooth', 'clean'],
    aliases: ['مدین'],
  }),
  makeFilterCommand({
    id: 'filter.liquify',
    name: 'Liquify',
    subcategory: 'DISTORT',
    filterObj: 'liquify',
    description: 'Push, pull, bloat, pucker, and warp pixels interactively.',
    keywords: ['liquify', 'warp', 'push', 'face', 'reshape', 'distort'],
    aliases: ['لیکویفای', 'تغییر فرم'],
  }),
  makeFilterCommand({
    id: 'filter.cameraRaw',
    name: 'Camera Raw Filter',
    subcategory: 'COLOR',
    filterObj: 'Adobe Camera Raw Filter',
    description: 'Open Adobe Camera Raw for non-destructive tone, color, and lens grading.',
    keywords: ['camera', 'raw', 'acr', 'grade', 'color', 'tone', 'lightroom'],
    aliases: ['acr', 'raw filter', 'کمرا را'],
  }),
  makeFilterCommand({
    id: 'filter.distortRipple',
    name: 'Distort — Ripple',
    subcategory: 'DISTORT',
    filterObj: 'ripple',
    defaultParams: { amount: 100 },
    description: 'Create an undulating water-ripple distortion pattern.',
    keywords: ['distort', 'ripple', 'wave', 'water', 'warp'],
    aliases: ['distort filters', 'موج'],
  }),
  makeFilterCommand({
    id: 'filter.distortTwirl',
    name: 'Distort — Twirl',
    subcategory: 'DISTORT',
    filterObj: 'twirl',
    defaultParams: { angle: 50 },
    description: 'Rotate pixels more sharply in the center than at the edges.',
    keywords: ['distort', 'twirl', 'swirl', 'spiral', 'warp'],
    aliases: ['swirl', 'چرخش'],
  }),
  makeFilterCommand({
    id: 'filter.stylizeEmboss',
    name: 'Stylize — Emboss',
    subcategory: 'STYLIZE',
    filterObj: 'emboss',
    defaultParams: { angle: 135, height: 3, amount: 100 },
    description: 'Make a selection appear raised or stamped with relief shading.',
    keywords: ['stylize', 'emboss', 'relief', '3d', 'bump'],
    aliases: ['stylize filters', 'برجسته'],
  }),
  makeFilterCommand({
    id: 'filter.stylizeFindEdges',
    name: 'Stylize — Find Edges',
    subcategory: 'STYLIZE',
    filterObj: 'findEdges',
    description: 'Identify high-contrast transitions and outline them like a sketch.',
    keywords: ['stylize', 'find', 'edges', 'outline', 'sketch', 'contour'],
    aliases: ['edge detect', 'یافتن لبه ها'],
  }),
];

module.exports = { filterCommands };
