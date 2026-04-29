#!/usr/bin/env node
// Build TeacherDeskSetup.exe by invoking native `makensis` against
// build/installer.nsi using the unpacked Electron output as the source.
//
// Usage:  node scripts/make-installer.js
// Requires: `makensis` on PATH (provided on Linux via the nsis package).

const path = require('path');
const fs = require('fs');
const { spawnSync, execSync } = require('child_process');

const root        = path.resolve(__dirname, '..');
const unpackedDir = path.join(root, 'dist', 'win-unpacked');
const outFile     = path.join(root, 'dist', 'TeacherDeskSetup.exe');
const nsiScript   = path.join(root, 'build', 'installer.nsi');
const pkg         = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const appVersion  = pkg.version || '1.0.0';

if (!fs.existsSync(unpackedDir)) {
  console.error(`[make-installer] Unpacked directory missing: ${unpackedDir}`);
  console.error(`Run "npm run build:unpacked" first.`);
  process.exit(1);
}
if (!fs.existsSync(nsiScript)) {
  console.error(`[make-installer] NSIS script missing: ${nsiScript}`);
  process.exit(1);
}

try {
  execSync('makensis -VERSION', { stdio: 'ignore' });
} catch {
  console.error('[make-installer] `makensis` not found on PATH.');
  console.error('  - Linux: install the `nsis` package (apt: nsis, nix: pkgs.nsis).');
  console.error('  - Windows: install NSIS from https://nsis.sourceforge.io/');
  process.exit(1);
}

if (fs.existsSync(outFile)) fs.unlinkSync(outFile);

console.log('[make-installer] Building TeacherDeskSetup.exe with NSIS...');
console.log(`  source:  ${unpackedDir}`);
console.log(`  output:  ${outFile}`);

const args = [
  `-DSOURCE_DIR=${unpackedDir}`,
  `-DOUTPUT_FILE=${outFile}`,
  `-DAPP_VERSION=${appVersion}`,
  nsiScript,
];

const result = spawnSync('makensis', args, { stdio: 'inherit' });
if (result.status !== 0) {
  console.error('[make-installer] makensis failed.');
  process.exit(result.status || 1);
}

if (!fs.existsSync(outFile)) {
  console.error(`[make-installer] Expected output not found: ${outFile}`);
  process.exit(1);
}
const stat = fs.statSync(outFile);
// Sanity-check: NSIS PE32 installers begin with the MZ DOS stub.
const head = Buffer.alloc(2);
const fd = fs.openSync(outFile, 'r');
fs.readSync(fd, head, 0, 2, 0);
fs.closeSync(fd);
if (head[0] !== 0x4d || head[1] !== 0x5a) {
  console.error(`[make-installer] Output is not a PE32 executable (no MZ header): ${outFile}`);
  process.exit(1);
}
const mb = (stat.size / 1024 / 1024).toFixed(1);
console.log(`[make-installer] Done. ${outFile} (${mb} MB) — PE32 NSIS installer, version ${appVersion}.`);
