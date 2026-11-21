// Copyright 2026 erf81
// SPDX-License-Identifier: Apache-2.0

/**
 * VAYRO — Quiet Trigger 2.1.0 Brand & Icon Asset Generator (Zero Dependencies)
 *
 * Generates:
 * - Photoshop UXP Manifest v5 icons (@1x & @2x dark/light 23px chrome + 48px plugin list)
 * - Multi-resolution Windows .ico (16, 24, 32, 48, 64, 256px) for Helper, Tray & Installer
 * - Inno Setup wizard BMP images (164x314 sidebar, 55x58 header)
 * - Scalable SVG marks (vayro-logo-horizontal.svg, quiet-trigger-symbol.svg)
 * - GitHub social preview PNG (1280x640)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * Encodes RGBA buffer into an uncompressed 24-bit Windows BMP (required by Inno Setup).
 */
function encodeBMP24(width, height, rgba) {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelBytes = rowSize * height;
  const fileSize = 54 + pixelBytes;
  const buf = Buffer.alloc(fileSize);
  buf.write('BM', 0, 'ascii');
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(pixelBytes, 34);

  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y;
    for (let x = 0; x < width; x++) {
      const s = (srcY * width + x) * 4;
      const d = 54 + y * rowSize + x * 3;
      const a = rgba[s + 3] / 255;
      // Composite against dark obsidian #111522
      buf[d] = Math.round(rgba[s + 2] * a + 34 * (1 - a));     // B
      buf[d + 1] = Math.round(rgba[s + 1] * a + 21 * (1 - a)); // G
      buf[d + 2] = Math.round(rgba[s] * a + 17 * (1 - a));     // R
    }
  }
  return buf;
}

/**
 * Encodes multiple PNG buffers into a standard multi-resolution Windows ICO file.
 */
function encodeICO(entries) {
  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // ICO
  header.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const dirEntries = [];
  const dataBuffers = [];

  for (const { size, png } of entries) {
    const dir = Buffer.alloc(16);
    dir[0] = size >= 256 ? 0 : size;
    dir[1] = size >= 256 ? 0 : size;
    dir[2] = 0;
    dir[3] = 0;
    dir.writeUInt16LE(1, 4);
    dir.writeUInt16LE(32, 6);
    dir.writeUInt32LE(png.length, 8);
    dir.writeUInt32LE(offset, 12);
    dirEntries.push(dir);
    dataBuffers.push(png);
    offset += png.length;
  }

  return Buffer.concat([header, ...dirEntries, ...dataBuffers]);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function auroraColor(t) {
  t = clamp(t, 0, 1);
  // Blue (#4EA5FF) -> Violet (#8B5CF6) -> Pink (#EC69B9)
  const c1 = [78, 165, 255];
  const c2 = [139, 92, 246];
  const c3 = [236, 105, 185];
  if (t <= 0.52) {
    const k = t / 0.52;
    return [lerp(c1[0], c2[0], k), lerp(c1[1], c2[1], k), lerp(c1[2], c2[2], k)];
  }
  const k = (t - 0.52) / 0.48;
  return [lerp(c2[0], c3[0], k), lerp(c2[1], c3[1], k), lerp(c2[2], c3[2], k)];
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function sdRoundedBox(px, py, bx, by, r) {
  const qx = Math.abs(px) - bx + r;
  const qy = Math.abs(py) - by + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function blendPx(rgba, w, h, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= w || y >= h || a <= 0) return;
  const idx = (y * w + x) * 4;
  const sa = clamp(a, 0, 1);
  const da = rgba[idx + 3] / 255;
  const outA = sa + da * (1 - sa);
  if (outA <= 0) return;
  rgba[idx] = Math.round((r * sa + rgba[idx] * da * (1 - sa)) / outA);
  rgba[idx + 1] = Math.round((g * sa + rgba[idx + 1] * da * (1 - sa)) / outA);
  rgba[idx + 2] = Math.round((b * sa + rgba[idx + 2] * da * (1 - sa)) / outA);
  rgba[idx + 3] = Math.round(outA * 255);
}

/**
 * Renders the VAYRO Quiet Trigger geometric mark:
 * - Rounded obsidian keycap tile with luminous Aurora gradient rim
 * - Architectural precision V chevron + subtle quiet trigger focal dot beneath
 */
function renderQuietTriggerMarkRGBA(size, mode = 'aurora') {
  const rgba = Buffer.alloc(size * size * 4);
  const half = size / 2;
  const pad = size * 0.06;
  const boxHalf = half - pad;
  const radius = size * 0.24;
  const borderW = Math.max(1.25, size * 0.062);
  const strokeW = Math.max(1.1, size * 0.062);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5 - half;
      const py = y + 0.5 - half;
      const dBox = sdRoundedBox(px, py, boxHalf, boxHalf, radius);

      // Background tile
      const fillMask = 1 - smoothstep(-0.7, 0.7, dBox);
      if (fillMask > 0) {
        const gt = clamp(((x + y) / (2 * size)), 0, 1);
        if (mode === 'light') {
          blendPx(rgba, size, size, x, y, 238, 241, 248, fillMask);
        } else {
          // Deep navy-obsidian with subtle top-left sheen
          const sheen = (1 - gt) * 14;
          blendPx(rgba, size, size, x, y, 17 + sheen * 0.6, 21 + sheen * 0.7, 34 + sheen * 1.1, fillMask);
        }

        // Luminous gradient border ring
        const rimMask = smoothstep(-borderW - 0.8, -borderW + 0.6, dBox) * fillMask;
        if (rimMask > 0) {
          if (mode === 'aurora') {
            const [ar, ag, ab] = auroraColor(gt);
            blendPx(rgba, size, size, x, y, ar, ag, ab, rimMask * 0.96);
          } else if (mode === 'dark') {
            blendPx(rgba, size, size, x, y, 96, 108, 134, rimMask * 0.85);
          } else {
            blendPx(rgba, size, size, x, y, 152, 162, 182, rimMask * 0.9);
          }
        }
      }

      // Precision VAYRO Quiet Trigger geometric chevron V + quiet focal point
      const nx = px / size; // [-0.5..0.5]
      const ny = py / size;
      const dLeftArm = distToSegment(nx, ny, -0.22, -0.17, 0.0, 0.14);
      const dRightArm = distToSegment(nx, ny, 0.22, -0.17, 0.0, 0.14);
      const dChev = Math.min(dLeftArm, dRightArm) * size;
      const chevMask = 1 - smoothstep(strokeW - 0.65, strokeW + 0.65, dChev);

      if (chevMask > 0) {
        if (mode === 'light') {
          blendPx(rgba, size, size, x, y, 24, 30, 44, chevMask);
        } else {
          blendPx(rgba, size, size, x, y, 240, 244, 255, chevMask);
        }
      }

      // Quiet Trigger precision accent dot centered above the V notch
      const dDot = Math.hypot(nx - 0.0, ny - (-0.17)) * size;
      const dotR = Math.max(1.2, size * 0.052);
      const dotMask = 1 - smoothstep(dotR - 0.6, dotR + 0.6, dDot);
      if (dotMask > 0) {
        if (mode === 'light') {
          blendPx(rgba, size, size, x, y, 42, 122, 240, dotMask);
        } else {
          const [ar, ag, ab] = auroraColor(0.28);
          blendPx(rgba, size, size, x, y, ar, ag, ab, dotMask);
        }
      }
    }
  }
  return rgba;
}

/**
 * Renders the Inno Setup wizard sidebar (164x314) in VAYRO Aurora style.
 */
function renderInstallerSidebarRGBA(w, h) {
  const rgba = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      // Base dark obsidian navy
      let r = 16;
      let g = 20;
      let b = 33;
      // Top ambient blue/violet radial wash
      const dTop = Math.hypot((u - 0.35) * 1.4, (v - 0.14) * 2.1);
      const wTop = Math.max(0, 1 - dTop) * 0.32;
      r += 78 * wTop; g += 130 * wTop; b += 255 * wTop;
      // Bottom ambient pink/violet wash
      const dBot = Math.hypot((u - 0.78) * 1.3, (v - 0.88) * 1.8);
      const wBot = Math.max(0, 1 - dBot) * 0.25;
      r += 236 * wBot; g += 105 * wBot; b += 185 * wBot;

      // Subtle right-edge Aurora accent strip (3px)
      if (x >= w - 3) {
        const [ar, ag, ab] = auroraColor(v);
        r = ar; g = ag; b = ab;
      }

      const idx = (y * w + x) * 4;
      rgba[idx] = clamp(Math.round(r), 0, 255);
      rgba[idx + 1] = clamp(Math.round(g), 0, 255);
      rgba[idx + 2] = clamp(Math.round(b), 0, 255);
      rgba[idx + 3] = 255;
    }
  }

  // Stamp centered Quiet Trigger mark (84x84) in upper half
  const markSize = 84;
  const mark = renderQuietTriggerMarkRGBA(markSize, 'aurora');
  const ox = Math.floor((w - markSize) / 2);
  const oy = 64;
  for (let my = 0; my < markSize; my++) {
    for (let mx = 0; mx < markSize; mx++) {
      const s = (my * markSize + mx) * 4;
      blendPx(rgba, w, h, ox + mx, oy + my, mark[s], mark[s + 1], mark[s + 2], mark[s + 3] / 255);
    }
  }
  return rgba;
}

/**
 * Minimal crisp 5x7 vector bitmap font for rendering the GitHub social preview PNG cleanly.
 */
const FONT_5X7 = {
  A: ['01110','10001','10001','11111','10001','10001','10001'],
  B: ['11110','10001','10001','11110','10001','10001','11110'],
  C: ['01111','10000','10000','10000','10000','10000','01111'],
  D: ['11110','10001','10001','10001','10001','10001','11110'],
  E: ['11111','10000','10000','11110','10000','10000','11111'],
  F: ['11111','10000','10000','11110','10000','10000','10000'],
  G: ['01111','10000','10000','10111','10001','10001','01111'],
  H: ['10001','10001','10001','11111','10001','10001','10001'],
  I: ['01110','00100','00100','00100','00100','00100','01110'],
  L: ['10000','10000','10000','10000','10000','10000','11111'],
  M: ['10001','11011','10101','10101','10001','10001','10001'],
  N: ['10001','11001','10101','10011','10001','10001','10001'],
  O: ['01110','10001','10001','10001','10001','10001','01110'],
  P: ['11110','10001','10001','11110','10000','10000','10000'],
  Q: ['01110','10001','10001','10001','10101','10010','01101'],
  R: ['11110','10001','10001','11110','10100','10010','10001'],
  S: ['01111','10000','10000','01110','00001','00001','11110'],
  T: ['11111','00100','00100','00100','00100','00100','00100'],
  U: ['10001','10001','10001','10001','10001','10001','01110'],
  V: ['10001','10001','10001','10001','10001','01010','00100'],
  W: ['10001','10001','10001','10101','10101','11011','10001'],
  Y: ['10001','10001','01010','00100','00100','00100','00100'],
  '.': ['00000','00000','00000','00000','00000','00100','00100'],
  ' ': ['00000','00000','00000','00000','00000','00000','00000'],
  '-': ['00000','00000','00000','11111','00000','00000','00000'],
  '2': ['01110','10001','00001','00110','01000','10000','11111'],
  '1': ['00100','01100','00100','00100','00100','00100','01110'],
  '0': ['01110','10001','10011','10101','11001','10001','01110'],
};

function drawText(rgba, w, h, text, x0, y0, scale, spacing, color, alpha = 1.0) {
  const upper = text.toUpperCase();
  let cx = x0;
  for (const ch of upper) {
    const glyph = FONT_5X7[ch] || FONT_5X7[' '];
    for (let gy = 0; gy < 7; gy++) {
      for (let gx = 0; gx < 5; gx++) {
        if (glyph[gy][gx] === '1') {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              blendPx(rgba, w, h, cx + gx * scale + sx, y0 + gy * scale + sy, color[0], color[1], color[2], alpha);
            }
          }
        }
      }
    }
    cx += 5 * scale + spacing;
  }
}

function renderSocialPreviewRGBA(w = 1280, h = 640) {
  const rgba = Buffer.alloc(w * h * 4);
  const pad = 42;
  const boxW = (w - pad * 2) / 2;
  const boxH = (h - pad * 2) / 2;
  const rad = 28;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const v = y / h;
      // Outer dark canvas
      let r = 9, g = 12, b = 22;
      const d1 = Math.hypot((u - 0.18) * 1.4, (v - 0.2));
      const d2 = Math.hypot((u - 0.85) * 1.3, (v - 0.82));
      const w1 = Math.max(0, 1 - d1 * 1.4) * 0.28;
      const w2 = Math.max(0, 1 - d2 * 1.4) * 0.24;
      r += 78 * w1 + 236 * w2;
      g += 165 * w1 + 105 * w2;
      b += 255 * w1 + 185 * w2;

      const idx = (y * w + x) * 4;
      rgba[idx] = clamp(Math.round(r), 0, 255);
      rgba[idx + 1] = clamp(Math.round(g), 0, 255);
      rgba[idx + 2] = clamp(Math.round(b), 0, 255);
      rgba[idx + 3] = 255;

      // Frosted Aurora card frame
      const px = x - w / 2;
      const py = y - h / 2;
      const dBox = sdRoundedBox(px, py, boxW, boxH, rad);
      const fillMask = 1 - smoothstep(-1, 1, dBox);
      if (fillMask > 0) {
        blendPx(rgba, w, h, x, y, 17, 21, 34, fillMask * 0.92);
        const rim = smoothstep(-3.2, -1.6, dBox) * fillMask;
        if (rim > 0) {
          const [ar, ag, ab] = auroraColor((u + v) * 0.5);
          blendPx(rgba, w, h, x, y, ar, ag, ab, rim * 0.95);
        }
      }
    }
  }

  // Stamp large crisp mark
  const markSize = 156;
  const mark = renderQuietTriggerMarkRGBA(markSize, 'aurora');
  const mx0 = 126;
  const my0 = Math.floor((h - markSize) / 2);
  for (let my = 0; my < markSize; my++) {
    for (let mx = 0; mx < markSize; mx++) {
      const s = (my * markSize + mx) * 4;
      blendPx(rgba, w, h, mx0 + mx, my0 + my, mark[s], mark[s + 1], mark[s + 2], mark[s + 3] / 255);
    }
  }

  // Brand lockup text
  drawText(rgba, w, h, 'VAYRO', 330, 200, 5, 10, [139, 178, 255], 0.95);
  drawText(rgba, w, h, 'QUIET TRIGGER', 330, 266, 9, 12, [242, 246, 255], 1.0);
  drawText(rgba, w, h, 'LESS SEARCHING. MORE CREATING.', 330, 366, 3, 5, [156, 170, 198], 0.95);
  drawText(rgba, w, h, 'PHOTOSHOP COMMAND PALETTE  -  2.1.0', 330, 418, 2, 4, [116, 132, 166], 0.9);

  return rgba;
}

const iconOutDir = path.join(__dirname, '..', 'assets', 'icons');
const brandOutDir = path.join(__dirname, '..', 'assets', 'brand');
fs.mkdirSync(iconOutDir, { recursive: true });
fs.mkdirSync(brandOutDir, { recursive: true });

// 1. Photoshop UXP Manifest v5 Icons
const uxpIcons = [
  ['icon-dark-23.png', 23, 'aurora'],
  ['icon-dark-23@1x.png', 23, 'aurora'],
  ['icon-dark-23@2x.png', 46, 'aurora'],
  ['icon-light-23.png', 23, 'light'],
  ['icon-light-23@1x.png', 23, 'light'],
  ['icon-light-23@2x.png', 46, 'light'],
  ['icon-48.png', 48, 'aurora'],
  ['icon-48@1x.png', 48, 'aurora'],
  ['icon-48@2x.png', 96, 'aurora'],
];

for (const [name, size, mode] of uxpIcons) {
  const png = encodePNG(size, size, renderQuietTriggerMarkRGBA(size, mode));
  fs.writeFileSync(path.join(iconOutDir, name), png);
}
console.log(`Generated ${uxpIcons.length} Photoshop UXP icons in assets/icons/`);

// 2. Multi-resolution Windows .ico (Tray, Helper EXE, Start Menu, Installer, Uninstaller)
const icoSizes = [16, 24, 32, 48, 64, 256];
const icoEntries = icoSizes.map((sz) => ({
  size: sz,
  png: encodePNG(sz, sz, renderQuietTriggerMarkRGBA(sz, 'aurora')),
}));
fs.writeFileSync(path.join(brandOutDir, 'quiet-trigger.ico'), encodeICO(icoEntries));
fs.writeFileSync(path.join(brandOutDir, 'quiet-trigger-256.png'), icoEntries[icoEntries.length - 1].png);
console.log('Generated assets/brand/quiet-trigger.ico (16..256px) and quiet-trigger-256.png');

// 3. Inno Setup Wizard Bitmaps
fs.writeFileSync(path.join(brandOutDir, 'installer-sidebar.bmp'), encodeBMP24(164, 314, renderInstallerSidebarRGBA(164, 314)));
fs.writeFileSync(path.join(brandOutDir, 'installer-header.bmp'), encodeBMP24(55, 58, (() => {
  const w = 55, h = 58;
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) { rgba[i * 4] = 17; rgba[i * 4 + 1] = 21; rgba[i * 4 + 2] = 34; rgba[i * 4 + 3] = 255; }
  const m = renderQuietTriggerMarkRGBA(46, 'aurora');
  for (let y = 0; y < 46; y++) {
    for (let x = 0; x < 46; x++) {
      const s = (y * 46 + x) * 4;
      blendPx(rgba, w, h, 4 + x, 6 + y, m[s], m[s + 1], m[s + 2], m[s + 3] / 255);
    }
  }
  return rgba;
})()));
console.log('Generated assets/brand/installer-sidebar.bmp and installer-header.bmp');

// 4. GitHub Social Preview (1280x640) — preserve high-res Segoe UI artwork if already rendered
const socialPath = path.join(brandOutDir, 'github-social-preview.png');
if (!fs.existsSync(socialPath)) {
  fs.writeFileSync(socialPath, encodePNG(1280, 640, renderSocialPreviewRGBA(1280, 640)));
  console.log('Generated assets/brand/github-social-preview.png (1280x640)');
}

// 5. Crisp Scalable SVG Brand Marks
const symbolSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" fill="none">
  <defs>
    <linearGradient id="vayroAurora" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#4EA5FF"/>
      <stop offset="52%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#EC69B9"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="56" height="56" rx="15" fill="#111522" stroke="url(#vayroAurora)" stroke-width="3.2"/>
  <path d="M19 22L32 42L45 22" stroke="#F2F6FF" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="32" cy="21" r="3.4" fill="#4EA5FF"/>
</svg>
`;
fs.writeFileSync(path.join(brandOutDir, 'quiet-trigger-symbol.svg'), symbolSvg, 'utf8');

const horizontalSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 72" width="380" height="72" fill="none">
  <defs>
    <linearGradient id="vayroAuroraH" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#4EA5FF"/>
      <stop offset="52%" stop-color="#8B5CF6"/>
      <stop offset="100%" stop-color="#EC69B9"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="64" height="64" rx="17" fill="#111522" stroke="url(#vayroAuroraH)" stroke-width="3"/>
  <path d="M21 24L36 46L51 24" stroke="#F2F6FF" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="36" cy="23" r="3.5" fill="#4EA5FF"/>
  <text x="86" y="33" fill="#F2F6FF" font-family="Segoe UI, -apple-system, sans-serif" font-size="22" font-weight="700" letter-spacing="2.4">QUIET TRIGGER</text>
  <text x="87" y="54" fill="#8E9CB8" font-family="Segoe UI, -apple-system, sans-serif" font-size="11.5" font-weight="600" letter-spacing="3.2">BY VAYRO</text>
</svg>
`;
fs.writeFileSync(path.join(brandOutDir, 'vayro-logo-horizontal.svg'), horizontalSvg, 'utf8');
console.log('Generated SVG brand marks in assets/brand/');
