/**
 * Packages ZAU Console into an installable Adobe Creative Cloud Extension (.ccx).
 * A .ccx file is a standard ZIP archive containing manifest.json at its root.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const outPath = path.join(distDir, `VAYRO-Quiet-Trigger-Photoshop-${pkg.version}.ccx`);

const INCLUDE_PATHS = [
  'manifest.json',
  'index.html',
  'index.js',
  'styles.css',
  'src',
  'assets/icons',
];

// Verify icons exist first
const iconCheck = path.join(rootDir, 'assets', 'icons', 'icon-48.png');
if (!fs.existsSync(iconCheck)) {
  console.log('Generating manifest icons...');
  require('./generate-icons');
}

fs.mkdirSync(distDir, { recursive: true });
if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

// Use Python's standard zipfile module for guaranteed forward-slash ZIP paths (Adobe CCX spec)
const pyScript = `
import os, sys, zipfile
root = sys.argv[1]
out_path = sys.argv[2]
includes = sys.argv[3:]
with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for item in includes:
        full = os.path.join(root, item)
        if os.path.isfile(full):
            zf.write(full, item.replace('\\\\', '/'))
        elif os.path.isdir(full):
            for dirpath, _, filenames in os.walk(full):
                for fn in filenames:
                    fp = os.path.join(dirpath, fn)
                    rel = os.path.relpath(fp, root).replace('\\\\', '/')
                    zf.write(fp, rel)
print('PACKAGED:', out_path)
`;

execFileSync('python', ['-c', pyScript, rootDir, outPath, ...INCLUDE_PATHS], {
  stdio: 'inherit',
});

const stat = fs.statSync(outPath);
console.log(`Built ${outPath} (${(stat.size / 1024).toFixed(1)} KB)`);
