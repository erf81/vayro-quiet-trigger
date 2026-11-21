// Copyright 2026 erf81
// SPDX-License-Identifier: Apache-2.0

/**
 * Packages Quiet Trigger by VAYRO (photoshop-plugin/ + assets/icons/)
 * into an official Adobe Creative Cloud Extension (.ccx).
 * A .ccx file is a standard ZIP archive with manifest.json at its root.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..', '..');
const pluginDir = path.join(rootDir, 'photoshop-plugin');
const iconsDir = path.join(rootDir, 'assets', 'icons');
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

// Optional --out-dir flag (defaults to dist/) so verification builds never overwrite immutable releases
const outArgIdx = process.argv.indexOf('--out-dir');
const outDir = outArgIdx !== -1 && process.argv[outArgIdx + 1]
  ? path.resolve(rootDir, process.argv[outArgIdx + 1])
  : path.join(rootDir, 'dist');
const outPath = path.join(outDir, `VAYRO-Quiet-Trigger-Photoshop-${pkg.version}.ccx`);

const PLUGIN_INCLUDE = [
  'manifest.json',
  'index.html',
  'index.js',
  'styles.css',
  'src',
];

// Verify icons exist first
const iconCheck = path.join(iconsDir, 'icon-48.png');
if (!fs.existsSync(iconCheck)) {
  console.log('Generating manifest icons...');
  require('./generate-icons.js');
}

fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

// Package photoshop-plugin/ as archive root + assets/icons/ under assets/icons/
const pyScript = `
import os, sys, zipfile
plugin_root = sys.argv[1]
icons_dir = sys.argv[2]
out_path = sys.argv[3]
includes = sys.argv[4:]
with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for item in includes:
        full = os.path.join(plugin_root, item)
        if os.path.isfile(full):
            zf.write(full, item.replace('\\\\', '/'))
        elif os.path.isdir(full):
            for dirpath, _, filenames in os.walk(full):
                for fn in filenames:
                    fp = os.path.join(dirpath, fn)
                    rel = os.path.relpath(fp, plugin_root).replace('\\\\', '/')
                    zf.write(fp, rel)
    for dirpath, _, filenames in os.walk(icons_dir):
        for fn in filenames:
            fp = os.path.join(dirpath, fn)
            rel = 'assets/icons/' + os.path.relpath(fp, icons_dir).replace('\\\\', '/')
            zf.write(fp, rel)
print('PACKAGED:', out_path)
`;

execFileSync('python', ['-c', pyScript, pluginDir, iconsDir, outPath, ...PLUGIN_INCLUDE], {
  stdio: 'inherit',
});

const stat = fs.statSync(outPath);
console.log(`Built ${outPath} (${(stat.size / 1024).toFixed(1)} KB)`);
