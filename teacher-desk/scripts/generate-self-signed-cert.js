#!/usr/bin/env node
// Generate a self-signed code-signing certificate for DEV/TEST signing.
//
// IMPORTANT: a self-signed cert verifies the signing pipeline works, but
// Windows SmartScreen will still warn end users — the cert is not chained
// to a Microsoft-trusted root. For production, replace the .pfx with a
// real certificate from a public CA (DigiCert, Sectigo, SSL.com, etc.).
//
// Usage:
//   node scripts/generate-self-signed-cert.js
//
// Output:
//   teacher-desk/build/cert.pfx   (PKCS#12, password "teacherdesk")
//
// The output path matches build.win.certificateFile in package.json.

const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const buildDir = path.join(root, 'build');
const pfxOut = path.join(buildDir, 'cert.pfx');
const password = process.env.WIN_CSC_KEY_PASSWORD || 'teacherdesk';
const subject = '/CN=Teacher Desk/O=Teacher Desk/C=US';

if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

if (fs.existsSync(pfxOut) && process.argv.indexOf('--force') === -1) {
  console.log(`[cert] ${pfxOut} already exists. Pass --force to overwrite.`);
  process.exit(0);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'teacherdesk-cert-'));
const keyFile = path.join(tmp, 'key.pem');
const crtFile = path.join(tmp, 'cert.pem');

try {
  console.log('[cert] Generating 2048-bit RSA key...');
  execFileSync('openssl', ['genrsa', '-out', keyFile, '2048'], { stdio: 'inherit' });

  console.log('[cert] Generating self-signed code-signing certificate...');
  // codeSigning EKU (1.3.6.1.5.5.7.3.3) is required for Authenticode.
  const extConf = [
    '[req]',
    'distinguished_name=req',
    'x509_extensions=v3_ca',
    '[v3_ca]',
    'basicConstraints=critical,CA:false',
    'keyUsage=critical,digitalSignature',
    'extendedKeyUsage=critical,codeSigning',
    'subjectKeyIdentifier=hash',
    '',
  ].join('\n');
  const extFile = path.join(tmp, 'ext.cnf');
  fs.writeFileSync(extFile, extConf);

  execFileSync('openssl', [
    'req', '-new', '-x509',
    '-key', keyFile,
    '-out', crtFile,
    '-days', '3650',
    '-subj', subject,
    '-config', extFile,
  ], { stdio: 'inherit' });

  console.log(`[cert] Bundling into PKCS#12: ${pfxOut}`);
  execFileSync('openssl', [
    'pkcs12', '-export',
    '-inkey', keyFile,
    '-in', crtFile,
    '-out', pfxOut,
    '-name', 'Teacher Desk Code Signing',
    '-passout', `pass:${password}`,
  ], { stdio: 'inherit' });

  fs.chmodSync(pfxOut, 0o600);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('');
console.log(`[cert] Done. ${pfxOut}`);
console.log(`[cert] Password: ${password}  (override with WIN_CSC_KEY_PASSWORD)`);
console.log('[cert] This cert is for development only — replace with a real');
console.log('[cert] CA-issued cert before publishing to end users.');
