'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  THEME_SCHEMA_VERSION,
  THEME_PRESETS,
  PRESET_ORDER,
  normalizeHexColor,
  isValidHexColor,
  createThemeFromPreset,
  sanitizeTheme,
  buildCssGradient,
  computeCssVariables,
  getAllPresets,
} = require('../src/theme/themeSystem.js');

test('Theme system provides all 6 Aurora Design System presets with exact hex palettes', () => {
  const presets = getAllPresets();
  assert.equal(presets.length, 6);
  assert.deepEqual(PRESET_ORDER, ['aurora', 'ember', 'crimson', 'arctic', 'emerald', 'monochrome']);

  // Verify Aurora exact signature colors
  assert.equal(THEME_PRESETS.aurora.accentPrimary, '#4EA5FF');
  assert.equal(THEME_PRESETS.aurora.accentSecondary, '#8B5CF6');
  assert.equal(THEME_PRESETS.aurora.accentTertiary, '#EC69B9');
  assert.equal(THEME_PRESETS.aurora.background, '#111522');

  // Verify Ember exact signature colors
  assert.equal(THEME_PRESETS.ember.accentPrimary, '#FF454F');
  assert.equal(THEME_PRESETS.ember.accentSecondary, '#FF813D');
  assert.equal(THEME_PRESETS.ember.accentTertiary, '#FFC05A');

  // Verify Crimson, Arctic, Emerald, Monochrome exact primaries
  assert.equal(THEME_PRESETS.crimson.accentPrimary, '#E83E5B');
  assert.equal(THEME_PRESETS.arctic.accentPrimary, '#18D4E8');
  assert.equal(THEME_PRESETS.emerald.accentPrimary, '#00B88A');
  assert.equal(THEME_PRESETS.monochrome.accentPrimary, '#E8EAF0');

  for (const p of presets) {
    const theme = createThemeFromPreset(p.id);
    assert.equal(theme.version, THEME_SCHEMA_VERSION);
    assert.equal(theme.preset, p.id);
    assert.ok(isValidHexColor(theme.accentPrimary));
    assert.ok(isValidHexColor(theme.accentSecondary));
    assert.ok(isValidHexColor(theme.accentTertiary));
    assert.ok(isValidHexColor(theme.background));
    assert.ok(isValidHexColor(theme.surface));
    assert.ok(isValidHexColor(theme.selected));
    assert.ok(isValidHexColor(theme.border));
    assert.ok(isValidHexColor(theme.glowColor));
  }
});

test('HEX color validator normalizes #RGB/#RRGGBB and rejects invalid values', () => {
  assert.equal(normalizeHexColor('#4ea5ff'), '#4EA5FF');
  assert.equal(normalizeHexColor('ff454f'), '#FF454F');
  assert.equal(normalizeHexColor('#f0a'), '#FF00AA');
  assert.equal(normalizeHexColor('09c'), '#0099CC');
  assert.equal(normalizeHexColor('#GGGGGG'), null);
  assert.equal(normalizeHexColor('rgb(1,2,3)'), null);
  assert.equal(normalizeHexColor(''), null);
  assert.equal(isValidHexColor('#8B5CF6'), true);
  assert.equal(isValidHexColor('not-a-hex'), false);
});

test('sanitizeTheme clamps opacity, validates enums/radii, and rejects invalid hex gracefully', () => {
  const dirty = {
    preset: 'custom',
    customName: '  My Red Ember  ',
    gradientMode: 'invalid-mode',
    gradientDirection: 'sideways',
    accentPrimary: '#ff3d3d',
    accentSecondary: 'bad-hex',
    accentTertiary: '#fb4',
    windowOpacity: 0.2, // below 0.72 minimum
    cornerRadius: 99, // invalid radius
    glowIntensity: 'nuclear',
    surfaceStyle: 'glassy',
    density: 'huge',
    appearance: 'sepia',
    bridgeToken: 'SECRET_MUST_NOT_PASS',
  };

  const clean = sanitizeTheme(dirty);
  assert.equal(clean.preset, 'custom');
  assert.equal(clean.customName, 'My Red Ember');
  assert.equal(clean.accentPrimary, '#FF3D3D');
  assert.equal(clean.accentSecondary, THEME_PRESETS.aurora.accentSecondary);
  assert.equal(clean.accentTertiary, '#FFBB44');
  assert.equal(clean.windowOpacity, 0.72);
  assert.equal(clean.cornerRadius, 20);
  assert.equal(clean.glowIntensity, 'medium');
  assert.equal(clean.surfaceStyle, 'frosted');
  assert.equal(clean.density, 'comfortable');
  assert.equal(clean.appearance, 'dark');
  // Security: arbitrary/credential keys must never be carried into theme object
  assert.equal('bridgeToken' in clean, false);
});

test('Custom theme combinations (blue/pink, red/orange, purple/pink, cyan/blue, solid) build valid gradients and CSS vars', () => {
  const customCases = [
    { name: 'Blue Pink', gradientMode: 'two', gradientDirection: 'horizontal', accentPrimary: '#4EA5FF', accentSecondary: '#EC69B9' },
    { name: 'Red Orange', gradientMode: 'three', gradientDirection: 'diagonal', accentPrimary: '#FF3D3D', accentSecondary: '#FF8A32', accentTertiary: '#FFB84D' },
    { name: 'Purple Pink', gradientMode: 'two', gradientDirection: 'vertical', accentPrimary: '#8B5CF6', accentSecondary: '#F472B6' },
    { name: 'Cyan Blue', gradientMode: 'two', gradientDirection: 'diagonal', accentPrimary: '#18D4E8', accentSecondary: '#2563EB' },
    { name: 'Solid Coral', gradientMode: 'solid', accentPrimary: '#FF5E7A' },
  ];

  for (const c of customCases) {
    const t = sanitizeTheme({ preset: 'custom', customName: c.name, ...c });
    const grad = buildCssGradient(t);
    const vars = computeCssVariables(t);

    if (c.gradientMode === 'solid') {
      assert.equal(grad, '#FF5E7A');
    } else {
      assert.ok(grad.startsWith('linear-gradient('));
      assert.ok(grad.includes(t.accentPrimary));
      assert.ok(grad.includes(t.accentSecondary));
    }

    assert.equal(vars['--zau-accent'], t.accentPrimary);
    assert.equal(vars['--zau-accent-gradient'], grad);
    assert.ok(vars['--zau-bg'].startsWith('#'));
  }
});
