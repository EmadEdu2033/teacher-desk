#!/usr/bin/env node
// Code-sign Windows PE files (.exe) using osslsigncode.
//
// Reads cert path / publisher from teacher-desk/package.json -> "build.win"
// and the cert password from an environment variable (never stored on disk).
//
// Usage:
//   node scripts/sign.js <file1.exe> [<file2.exe> ...]
//
// Required env:
//   WIN_CSC_KEY_PASSWORD   password for the .pfx file
//
// Optional env (override package.json):
//   WIN_CSC_LINK           absolute or relative path to the .pfx file
//                          (overrides build.win.certificateFile)
//
// Resolution order for cert + publisher:
//   1. env vars (WIN_CSC_LINK)
//   2. package.json -> build.win.certificateFile / publisherName
//
// Exit codes:
//   0  success
//   1  configuration / file error
//   2  signing failed
//   3  cert missing AND TEACHER_DESK_SKIP_SIGN=1 set (treated as "skipped, ok")

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const winCfg = (pkg.build && pkg.build.win) || {};

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error('[sign] usage: node scripts/sign.js <file.exe> [more.exe ...]');
  process.exit(1);
}

const certFileRel = process.env.WIN_CSC_LINK || winCfg.certificateFile;
const certPassword = process.env.WIN_CSC_KEY_PASSWORD;
const publisherName = winCfg.publisherName || 'Teacher Desk';

if (!certFileRel) {
  console.error('[sign] No certificate configured. Set build.win.certificateFile in');
  console.error('       teacher-desk/package.json or WIN_CSC_LINK env var.');
  if (process.env.TEACHER_DESK_SKIP_SIGN === '1') {
    console.error('[sign] TEACHER_DESK_SKIP_SIGN=1 — exiting 0 (skip).');
    process.exit(0);
  }
  process.exit(1);
}

const certFile = path.isAbsolute(certFileRel)
  ? certFileRel
  : path.resolve(root, certFileRel);

if (!fs.existsSync(certFile)) {
  console.error(`[sign] Certificate file not found: ${certFile}`);
  console.error('       Generate a dev cert with: node scripts/generate-self-signed-cert.js');
  console.error('       Or point WIN_CSC_LINK at your real .pfx.');
  if (process.env.TEACHER_DESK_SKIP_SIGN === '1') {
    console.error('[sign] TEACHER_DESK_SKIP_SIGN=1 — exiting 0 (skip).');
    process.exit(0);
  }
  process.exit(1);
}

if (!certPassword && certPassword !== '') {
  console.error('[sign] WIN_CSC_KEY_PASSWORD env var is not set.');
  console.error('       Set it to the password of your .pfx file (use "" if none).');
  process.exit(1);
}

// osslsigncode must be on PATH (provided by the `osslsigncode` Nix package).
const osslVer = spawnSync('osslsigncode', ['--version']);
if (osslVer.status !== 0) {
  console.error('[sign] `osslsigncode` not found on PATH.');
  console.error('       Install with: pkgs.osslsigncode (already in replit.nix).');
  process.exit(1);
}

// RFC 3161 timestamp server. Free, public, widely used by signing toolchains.
// A timestamp lets the signature remain valid after the cert itself expires.
const TIMESTAMP_URL = 'http://timestamp.digicert.com';

let failed = 0;
for (const target of targets) {
  const abs = path.isAbsolute(target) ? target : path.resolve(process.cwd(), target);
  if (!fs.existsSync(abs)) {
    console.error(`[sign] Target not found: ${abs}`);
    failed++;
    continue;
  }

  const tmpOut = abs + '.signed.tmp';
  const args = [
    'sign',
    '-pkcs12', certFile,
    '-pass', certPassword,
    '-n', publisherName,
    '-i', 'https://teacher-desk.local/',
    '-h', 'sha256',
    '-ts', TIMESTAMP_URL,
    '-in', abs,
    '-out', tmpOut,
  ];

  // Hide the password from logs — print the args with -pass redacted.
  const printable = args.map((a, i) => (args[i - 1] === '-pass' ? '****' : a));
  console.log(`[sign] osslsigncode ${printable.join(' ')}`);

  let result = spawnSync('osslsigncode', args, { stdio: 'inherit' });

  // If the timestamp server is unreachable (offline build), retry without -ts.
  // The signature still verifies until the cert expires.
  if (result.status !== 0) {
    console.warn('[sign] Timestamped sign failed — retrying without timestamp...');
    const fallback = args.filter((_, i) => args[i] !== '-ts' && args[i - 1] !== '-ts');
    result = spawnSync('osslsigncode', fallback, { stdio: 'inherit' });
  }

  if (result.status !== 0 || !fs.existsSync(tmpOut)) {
    console.error(`[sign] Failed to sign: ${abs}`);
    if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut);
    failed++;
    continue;
  }

  fs.renameSync(tmpOut, abs);

  // Verify the signature we just wrote.
  const verify = spawnSync('osslsigncode', ['verify', '-in', abs], { encoding: 'utf8' });
  const verifyOut = (verify.stdout || '') + '\n' + (verify.stderr || '');

  // Parse the message-digest comparison block. If the calculated digest
  // matches the embedded digest the signature is cryptographically intact.
  const cur = verifyOut.match(/Current message digest\s*:\s*([0-9A-F]+)/i);
  const calc = verifyOut.match(/Calculated message digest\s*:\s*([0-9A-F]+)/i);
  const digestOk = cur && calc && cur[1] === calc[1];

  // Chain-to-trusted-root only succeeds with a CA-issued cert.
  // Self-signed dev certs deliberately fail here — that is fine.
  const chainOk = verify.status === 0;
  const selfSignedChainFail =
    /self[- ]signed certificate/i.test(verifyOut) ||
    /unable to get local issuer/i.test(verifyOut);

  if (digestOk && chainOk) {
    console.log(`[sign] OK (signature + chain trusted)  ${abs}`);
  } else if (digestOk && selfSignedChainFail) {
    console.log(`[sign] OK (signature valid; chain not trusted — self-signed dev cert)  ${abs}`);
  } else {
    console.error(`[sign] Verify failed for ${abs}:\n${verifyOut}`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`[sign] ${failed} file(s) failed to sign.`);
  process.exit(2);
}
console.log(`[sign] Signed ${targets.length} file(s) successfully.`);
