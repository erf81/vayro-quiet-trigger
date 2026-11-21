// Copyright 2026 erf81
// SPDX-License-Identifier: Apache-2.0

/**
 * Crisp minimal monochrome inline SVG icons for ZAU Console 2.0 (Aurora Design System).
 * Uses explicit UXP-safe SVG attributes so icons render crisply in Photoshop 26.8.1.
 */
'use strict';

const ICONS = Object.freeze({
  logo: `<svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
    <path d="M4.6 6.2L10 14.4L15.4 6.2" stroke="#F0F5FF" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="10" cy="5.8" r="1.4" fill="#4EA5FF"/>
  </svg>`,

  search: `<svg viewBox="0 0 16 16" width="15" height="15" fill="none" aria-hidden="true">
    <circle cx="7" cy="7" r="4.8" stroke="#9CA7BD" stroke-width="1.5"/>
    <path d="M10.8 10.8L14 14" stroke="#9CA7BD" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  settings: `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="2.3" stroke="#9CA7BD" stroke-width="1.4"/>
    <path d="M8 1.8V3.3M8 12.7V14.2M1.8 8H3.3M12.7 8H14.2M3.6 3.6L4.7 4.7M11.3 11.3L12.4 12.4M12.4 3.6L11.3 4.7M4.7 11.3L3.6 12.4" stroke="#9CA7BD" stroke-width="1.3" stroke-linecap="round"/>
  </svg>`,

  starOutline: `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
    <path d="M8 2.1L9.75 5.65L13.65 6.22L10.82 8.97L11.49 12.85L8 11.02L4.51 12.85L5.18 8.97L2.35 6.22L6.25 5.65L8 2.1Z" stroke="#6F7B94" stroke-width="1.3" stroke-linejoin="round"/>
  </svg>`,

  starFilled: `<svg viewBox="0 0 16 16" width="14" height="14" fill="#F5B942" aria-hidden="true">
    <path d="M8 2.1L9.75 5.65L13.65 6.22L10.82 8.97L11.49 12.85L8 11.02L4.51 12.85L5.18 8.97L2.35 6.22L6.25 5.65L8 2.1Z" fill="#F5B942"/>
  </svg>`,

  clear: `<svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden="true">
    <path d="M4 4L12 12M12 4L4 12" stroke="#9CA7BD" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  back: `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
    <path d="M10.5 3.5L6 8L10.5 12.5" stroke="#DCE4F4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  warning: `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
    <path d="M8 2.2L14.2 13.2H1.8L8 2.2Z" stroke="#F06565" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M8 6.2V9.4M8 11.4V11.6" stroke="#F06565" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  // Category & Command Monochrome Tile Icons
  catBlur: `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
    <circle cx="10" cy="10" r="6.5" stroke="#DCE4F4" stroke-width="1.4" opacity="0.5"/>
    <circle cx="10" cy="10" r="3.8" stroke="#DCE4F4" stroke-width="1.5" opacity="0.8"/>
    <circle cx="10" cy="10" r="1.4" fill="#DCE4F4"/>
  </svg>`,

  catCurves: `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
    <rect x="3" y="3" width="14" height="14" rx="2.5" stroke="#DCE4F4" stroke-width="1.2" opacity="0.45"/>
    <path d="M4.5 15.5C8 15 11.5 5 15.5 4.5" stroke="#DCE4F4" stroke-width="1.7" stroke-linecap="round"/>
    <circle cx="10" cy="10" r="1.7" fill="#DCE4F4"/>
  </svg>`,

  catCrop: `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
    <path d="M6 3V14H17M3 6H14V17" stroke="#DCE4F4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  catBrush: `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
    <path d="M14.8 3.6L16.4 5.2L9.2 12.4L7.6 10.8L14.8 3.6Z" stroke="#DCE4F4" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M7.6 10.8C5.9 11.1 5 12.6 4.7 14.3C4.5 15.2 3.8 15.8 3.2 16C5.1 16.5 7.4 16.2 8.6 14.9C9.3 14.1 9.5 13.1 9.2 12.4" stroke="#DCE4F4" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  catTools: `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
    <path d="M5 4L15 10L10.2 11.5L8.6 16L5 4Z" stroke="#DCE4F4" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>`,

  catFilters: `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
    <path d="M10 3L11.8 7.8L16.8 9.6L11.8 11.4L10 16.4L8.2 11.4L3.2 9.6L8.2 7.8L10 3Z" stroke="#DCE4F4" stroke-width="1.4" stroke-linejoin="round"/>
  </svg>`,

  catAdjustments: `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
    <circle cx="10" cy="10" r="6.5" stroke="#DCE4F4" stroke-width="1.5"/>
    <path d="M10 3.5A6.5 6.5 0 0 1 10 16.5V3.5Z" fill="#DCE4F4" opacity="0.8"/>
  </svg>`,

  catLayers: `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
    <path d="M10 4L16.5 7.5L10 11L3.5 7.5L10 4Z" stroke="#DCE4F4" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M3.5 11.3L10 14.8L16.5 11.3" stroke="#DCE4F4" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3.5 14.3L10 17.5L16.5 14.3" stroke="#DCE4F4" stroke-width="1.2" opacity="0.65" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  catSelections: `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
    <rect x="4" y="4" width="12" height="12" rx="1.5" stroke="#DCE4F4" stroke-width="1.5" stroke-dasharray="3 2.5"/>
  </svg>`,

  catDocument: `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
    <path d="M5.5 3.5H11.5L15 7V16.5H5.5V3.5Z" stroke="#DCE4F4" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M11.5 3.5V7H15" stroke="#DCE4F4" stroke-width="1.3" stroke-linejoin="round"/>
  </svg>`,

  catView: `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
    <path d="M2.8 10C4.6 6.8 7.1 5.2 10 5.2C12.9 5.2 15.4 6.8 17.2 10C15.4 13.2 12.9 14.8 10 14.8C7.1 14.8 4.6 13.2 2.8 10Z" stroke="#DCE4F4" stroke-width="1.4"/>
    <circle cx="10" cy="10" r="2.3" stroke="#DCE4F4" stroke-width="1.4"/>
  </svg>`,

  catExport: `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
    <path d="M10 12.5V4M10 4L6.8 7.2M10 4L13.2 7.2" stroke="#DCE4F4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M4 13.5V15.5C4 16.1 4.4 16.5 5 16.5H15C15.6 16.5 16 16.1 16 15.5V13.5" stroke="#DCE4F4" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`,
});

function getCommandIcon(cmd) {
  if (!cmd) return ICONS.catTools;
  const id = String(cmd.id || '');
  const sub = String(cmd.subcategory || '').toUpperCase();
  if (id.includes('Blur') || sub === 'BLUR') return ICONS.catBlur;
  if (id === 'adjust.curves' || id === 'adjust.levels') return ICONS.catCurves;
  if (id.includes('crop') || id.includes('Crop')) return ICONS.catCrop;
  if (id.includes('brush') || id.includes('Brush') || id === 'tool.eraser') return ICONS.catBrush;

  switch (cmd.category) {
    case 'Tools': return ICONS.catTools;
    case 'Filters': return ICONS.catFilters;
    case 'Adjustments': return ICONS.catAdjustments;
    case 'Layers': return ICONS.catLayers;
    case 'Selections': return ICONS.catSelections;
    case 'Document': return ICONS.catDocument;
    case 'View': return ICONS.catView;
    case 'Export': return ICONS.catExport;
    default: return ICONS.catTools;
  }
}

module.exports = { ICONS, getCommandIcon };
