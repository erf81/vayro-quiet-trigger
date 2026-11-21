// Copyright 2026 erf81
// SPDX-License-Identifier: Apache-2.0

/**
 * ZAU Console 2.0 — Shared Aurora Design System & Theme Schema
 * Used identically by both the Photoshop UXP docked panel and the Windows WPF floating palette.
 */
'use strict';

const THEME_SCHEMA_VERSION = 1;

const THEME_PRESETS = Object.freeze({
  aurora: Object.freeze({
    id: 'aurora',
    name: 'Aurora',
    subtitle: 'Blue · Violet · Pink',
    gradientMode: 'three',
    gradientDirection: 'diagonal',
    accentPrimary: '#4EA5FF',
    accentSecondary: '#8B5CF6',
    accentTertiary: '#EC69B9',
    background: '#111522',
    surface: '#191E2D',
    selected: '#242C43',
    border: '#2B3552',
    glowColor: '#4EA5FF',
    glowIntensity: 'medium',
    surfaceStyle: 'frosted',
    windowOpacity: 0.94,
    cornerRadius: 20,
    density: 'comfortable',
    appearance: 'dark',
  }),
  ember: Object.freeze({
    id: 'ember',
    name: 'Ember',
    subtitle: 'Crimson · Orange · Amber',
    gradientMode: 'three',
    gradientDirection: 'diagonal',
    accentPrimary: '#FF454F',
    accentSecondary: '#FF813D',
    accentTertiary: '#FFC05A',
    background: '#1D1417',
    surface: '#271A1D',
    selected: '#382127',
    border: '#4E2E35',
    glowColor: '#FF5B45',
    glowIntensity: 'medium',
    surfaceStyle: 'frosted',
    windowOpacity: 0.94,
    cornerRadius: 20,
    density: 'comfortable',
    appearance: 'dark',
  }),
  crimson: Object.freeze({
    id: 'crimson',
    name: 'Crimson',
    subtitle: 'Deep Red · Rose · Coral',
    gradientMode: 'three',
    gradientDirection: 'diagonal',
    accentPrimary: '#E83E5B',
    accentSecondary: '#FF5E7A',
    accentTertiary: '#FF9B8A',
    background: '#191318',
    surface: '#251A22',
    selected: '#38212E',
    border: '#4E2C40',
    glowColor: '#E83E5B',
    glowIntensity: 'medium',
    surfaceStyle: 'frosted',
    windowOpacity: 0.94,
    cornerRadius: 20,
    density: 'comfortable',
    appearance: 'dark',
  }),
  arctic: Object.freeze({
    id: 'arctic',
    name: 'Arctic',
    subtitle: 'Cyan · Blue · Indigo',
    gradientMode: 'three',
    gradientDirection: 'diagonal',
    accentPrimary: '#18D4E8',
    accentSecondary: '#369EFF',
    accentTertiary: '#7878FF',
    background: '#101921',
    surface: '#17232D',
    selected: '#203443',
    border: '#2A465C',
    glowColor: '#18D4E8',
    glowIntensity: 'medium',
    surfaceStyle: 'frosted',
    windowOpacity: 0.94,
    cornerRadius: 20,
    density: 'comfortable',
    appearance: 'dark',
  }),
  emerald: Object.freeze({
    id: 'emerald',
    name: 'Emerald',
    subtitle: 'Emerald · Mint · Teal',
    gradientMode: 'three',
    gradientDirection: 'diagonal',
    accentPrimary: '#00B88A',
    accentSecondary: '#2BD4AA',
    accentTertiary: '#86D9A7',
    background: '#111B19',
    surface: '#182521',
    selected: '#203A31',
    border: '#2B4E42',
    glowColor: '#00B88A',
    glowIntensity: 'medium',
    surfaceStyle: 'frosted',
    windowOpacity: 0.94,
    cornerRadius: 20,
    density: 'comfortable',
    appearance: 'dark',
  }),
  monochrome: Object.freeze({
    id: 'monochrome',
    name: 'Monochrome',
    subtitle: 'White · Silver · Graphite',
    gradientMode: 'three',
    gradientDirection: 'diagonal',
    accentPrimary: '#E8EAF0',
    accentSecondary: '#AEB4C0',
    accentTertiary: '#747C8B',
    background: '#141519',
    surface: '#202126',
    selected: '#30323A',
    border: '#40434E',
    glowColor: '#D6DAE4',
    glowIntensity: 'low',
    surfaceStyle: 'frosted',
    windowOpacity: 0.95,
    cornerRadius: 20,
    density: 'comfortable',
    appearance: 'dark',
  }),
});

const PRESET_ORDER = Object.freeze(['aurora', 'ember', 'crimson', 'arctic', 'emerald', 'monochrome']);

const VALID_GRADIENT_MODES = Object.freeze(['solid', 'two', 'three']);
const VALID_GRADIENT_DIRS = Object.freeze(['horizontal', 'diagonal', 'vertical']);
const VALID_GLOW_LEVELS = Object.freeze(['off', 'low', 'medium', 'high']);
const VALID_SURFACE_STYLES = Object.freeze(['frosted', 'translucent', 'solid', 'flat']);
const VALID_CORNER_RADII = Object.freeze([12, 16, 20, 24]);
const VALID_DENSITIES = Object.freeze(['compact', 'comfortable', 'spacious']);
const VALID_APPEARANCES = Object.freeze(['dark', 'light', 'auto']);

const QUICK_SWATCHES = Object.freeze([
  '#4EA5FF', '#8B5CF6', '#EC69B9', '#FF454F', '#FF813D', '#FFC05A',
  '#E83E5B', '#18D4E8', '#369EFF', '#00B88A', '#2BD4AA', '#E8EAF0',
]);

function normalizeHexColor(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const m6 = /^#?([0-9a-fA-F]{6})$/.exec(trimmed);
  if (m6) return `#${m6[1].toUpperCase()}`;
  const m3 = /^#?([0-9a-fA-F]{3})$/.exec(trimmed);
  if (m3) {
    const [r, g, b] = m3[1].split('');
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return null;
}

function isValidHexColor(value) {
  return normalizeHexColor(value) !== null;
}

function hexToRgb(hex) {
  const norm = normalizeHexColor(hex) || '#4EA5FF';
  return {
    r: parseInt(norm.slice(1, 3), 16),
    g: parseInt(norm.slice(3, 5), 16),
    b: parseInt(norm.slice(5, 7), 16),
  };
}

function hexToRgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  const a = Math.max(0, Math.min(1, Number(alpha)));
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
}

function createThemeFromPreset(presetId = 'aurora') {
  const p = THEME_PRESETS[presetId] || THEME_PRESETS.aurora;
  return {
    version: THEME_SCHEMA_VERSION,
    preset: p.id,
    customName: '',
    gradientMode: p.gradientMode,
    gradientDirection: p.gradientDirection,
    accentPrimary: p.accentPrimary,
    accentSecondary: p.accentSecondary,
    accentTertiary: p.accentTertiary,
    background: p.background,
    surface: p.surface,
    selected: p.selected,
    border: p.border,
    glowColor: p.glowColor,
    glowIntensity: p.glowIntensity,
    surfaceStyle: p.surfaceStyle,
    windowOpacity: p.windowOpacity,
    cornerRadius: p.cornerRadius,
    density: p.density,
    appearance: p.appearance,
  };
}

function sanitizeTheme(raw) {
  const base = createThemeFromPreset(raw && THEME_PRESETS[raw.preset] ? raw.preset : 'aurora');
  if (!raw || typeof raw !== 'object') return base;

  const pickHex = (val, fallback) => normalizeHexColor(val) || fallback;
  const pickEnum = (val, allowed, fallback) => (allowed.includes(val) ? val : fallback);

  // Support legacy "mode": "gradient" alias gracefully
  let gradientMode = base.gradientMode;
  if (VALID_GRADIENT_MODES.includes(raw.gradientMode)) {
    gradientMode = raw.gradientMode;
  } else if (raw.mode === 'solid') {
    gradientMode = 'solid';
  } else if (raw.mode === 'gradient') {
    gradientMode = 'three';
  }

  let opacity = Number(raw.windowOpacity);
  if (!Number.isFinite(opacity)) opacity = base.windowOpacity;
  opacity = Math.round(Math.max(0.72, Math.min(1.0, opacity)) * 100) / 100;

  let radius = Number(raw.cornerRadius);
  if (!VALID_CORNER_RADII.includes(radius)) radius = base.cornerRadius;

  const presetKey = raw.preset === 'custom' || THEME_PRESETS[raw.preset] ? raw.preset : base.preset;

  return {
    version: THEME_SCHEMA_VERSION,
    preset: presetKey,
    customName: typeof raw.customName === 'string' ? raw.customName.trim().slice(0, 40) : '',
    gradientMode,
    gradientDirection: pickEnum(raw.gradientDirection, VALID_GRADIENT_DIRS, base.gradientDirection),
    accentPrimary: pickHex(raw.accentPrimary, base.accentPrimary),
    accentSecondary: pickHex(raw.accentSecondary, base.accentSecondary),
    accentTertiary: pickHex(raw.accentTertiary, base.accentTertiary),
    background: pickHex(raw.background, base.background),
    surface: pickHex(raw.surface, base.surface),
    selected: pickHex(raw.selected, base.selected),
    border: pickHex(raw.border, base.border),
    glowColor: pickHex(raw.glowColor, pickHex(raw.accentPrimary, base.glowColor)),
    glowIntensity: pickEnum(raw.glowIntensity, VALID_GLOW_LEVELS, base.glowIntensity),
    surfaceStyle: pickEnum(raw.surfaceStyle, VALID_SURFACE_STYLES, base.surfaceStyle),
    windowOpacity: opacity,
    cornerRadius: radius,
    density: pickEnum(raw.density, VALID_DENSITIES, base.density),
    appearance: pickEnum(raw.appearance, VALID_APPEARANCES, base.appearance),
  };
}

function buildCssGradient(theme) {
  const t = sanitizeTheme(theme);
  if (t.gradientMode === 'solid') {
    return t.accentPrimary;
  }
  const angle =
    t.gradientDirection === 'horizontal'
      ? '90deg'
      : t.gradientDirection === 'vertical'
      ? '180deg'
      : '135deg';
  if (t.gradientMode === 'two') {
    return `linear-gradient(${angle}, ${t.accentPrimary} 0%, ${t.accentSecondary} 100%)`;
  }
  return `linear-gradient(${angle}, ${t.accentPrimary} 0%, ${t.accentSecondary} 52%, ${t.accentTertiary} 100%)`;
}

function computeCssVariables(theme) {
  const t = sanitizeTheme(theme);

  const glowAlphaMap = { off: 0, low: 0.16, medium: 0.28, high: 0.44 };
  const glowSpreadMap = { off: '0px', low: '8px', medium: '14px', high: '22px' };
  const glowAlpha = glowAlphaMap[t.glowIntensity];
  const glowSpread = glowSpreadMap[t.glowIntensity];

  const densityMap = {
    compact: { rowPadY: '6px', rowPadX: '8px', tileSize: '30px', nameSize: '12px', gap: '3px' },
    comfortable: { rowPadY: '8px', rowPadX: '10px', tileSize: '36px', nameSize: '12.5px', gap: '5px' },
    spacious: { rowPadY: '11px', rowPadX: '12px', tileSize: '42px', nameSize: '13px', gap: '7px' },
  };
  const d = densityMap[t.density];

  const isLight = t.appearance === 'light';
  const bgColor = isLight ? '#EEF1F7' : t.background;
  const surfaceColor = isLight ? '#F8FAFD' : t.surface;
  const selectedColor = isLight ? '#E1ECFF' : t.selected;
  const borderColor = isLight ? '#CFD7E6' : t.border;
  const textColor = isLight ? '#181E2C' : '#EFF3FB';
  const textMuted = isLight ? '#4E596E' : '#9CA7BD';
  const textDim = isLight ? '#77839A' : '#6F7B94';

  const surfaceHover = isLight
    ? '#E8EEF8'
    : t.surfaceStyle === 'flat'
    ? t.surface
    : hexToRgba(t.selected, 0.72);

  const panelRadius = Math.min(t.cornerRadius, 14);
  const rowRadius = Math.max(8, Math.round(t.cornerRadius * 0.55));
  const inputRadius = Math.max(8, Math.round(t.cornerRadius * 0.6));

  const accentGradient = buildCssGradient(t);
  const glowShadow =
    t.glowIntensity === 'off'
      ? 'none'
      : `0 0 ${glowSpread} ${hexToRgba(t.glowColor, glowAlpha)}`;

  return {
    '--zau-bg': bgColor,
    '--zau-surface': surfaceColor,
    '--zau-surface-hover': surfaceHover,
    '--zau-surface-selected': selectedColor,
    '--zau-border': borderColor,
    '--zau-border-subtle': hexToRgba(borderColor, 0.6),
    '--zau-text': textColor,
    '--zau-text-muted': textMuted,
    '--zau-text-dim': textDim,
    '--zau-accent': t.accentPrimary,
    '--zau-accent-2': t.accentSecondary,
    '--zau-accent-3': t.accentTertiary,
    '--zau-accent-soft': hexToRgba(t.accentPrimary, 0.16),
    '--zau-accent-gradient': accentGradient,
    '--zau-glow-color': t.glowColor,
    '--zau-glow-soft': hexToRgba(t.glowColor, glowAlpha),
    '--zau-glow-shadow': glowShadow,
    '--zau-radius': `${rowRadius}px`,
    '--zau-input-radius': `${inputRadius}px`,
    '--zau-panel-radius': `${panelRadius}px`,
    '--zau-row-py': d.rowPadY,
    '--zau-row-px': d.rowPadX,
    '--zau-tile-size': d.tileSize,
    '--zau-name-size': d.nameSize,
    '--zau-row-gap': d.gap,
    '--zau-surface-highlight':
      t.surfaceStyle === 'frosted' || t.surfaceStyle === 'translucent'
        ? hexToRgba('#FFFFFF', isLight ? 0.55 : 0.06)
        : 'transparent',
  };
}

function getAllPresets() {
  return PRESET_ORDER.map((id) => THEME_PRESETS[id]);
}

module.exports = {
  THEME_SCHEMA_VERSION,
  THEME_PRESETS,
  PRESET_ORDER,
  QUICK_SWATCHES,
  VALID_GRADIENT_MODES,
  VALID_GRADIENT_DIRS,
  VALID_GLOW_LEVELS,
  VALID_SURFACE_STYLES,
  VALID_CORNER_RADII,
  VALID_DENSITIES,
  VALID_APPEARANCES,
  normalizeHexColor,
  isValidHexColor,
  hexToRgb,
  hexToRgba,
  createThemeFromPreset,
  sanitizeTheme,
  buildCssGradient,
  computeCssVariables,
  getAllPresets,
};
