// Tiny HTTP server to preview the renderer in a browser (for development inside Replit).
// Bind to PORT (set by workflow).

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..', 'renderer');
// downloads/ at the project root holds the signed Windows installer.
const DOWNLOADS_ROOT = path.join(__dirname, '..', '..', 'downloads');
const INSTALLER_FILE = path.join(DOWNLOADS_ROOT, 'TeacherDeskSetup.exe');
const PORT = parseInt(process.env.PORT || '5000', 10);

// In-memory cache of the installer's size + sha256, keyed by the file's
// (size, mtimeMs) pair. We re-stat on every request so a re-published
// installer is reflected immediately, but we only re-hash when the file
// actually changed — hashing 75 MB on every page load would be wasteful.
let installerCache = null; // { size, mtimeMs, sha256, prettySize }

function prettyBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(1)} MB (${bytes.toLocaleString('en-US')} bytes)`;
}

function getInstallerInfo() {
  let stat;
  try {
    stat = fs.statSync(INSTALLER_FILE);
  } catch {
    return null;
  }
  if (
    installerCache &&
    installerCache.size === stat.size &&
    installerCache.mtimeMs === stat.mtimeMs
  ) {
    return installerCache;
  }
  // Guard against a race where the file is unlinked or replaced between
  // statSync and readFileSync (e.g., a republish landing mid-request). On
  // failure, fall back to the previous cached value if any so the page
  // still renders something sensible instead of crashing the request.
  let buf;
  try {
    buf = fs.readFileSync(INSTALLER_FILE);
  } catch {
    return installerCache;
  }
  const hash = crypto.createHash('sha256');
  hash.update(buf);
  installerCache = {
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    sha256: hash.digest('hex'),
    prettySize: prettyBytes(stat.size),
  };
  return installerCache;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Returns true iff `candidate` is the same as `parent` or strictly inside it.
// Uses path.relative so we are not fooled by sibling directories sharing a
// prefix (e.g., `/srv/downloads` vs `/srv/downloads-evil`).
function isInside(parent, candidate) {
  const rel = path.relative(parent, candidate);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
  '.ttf':  'font/ttf',
  '.exe':  'application/vnd.microsoft.portable-executable',
  '.txt':  'text/plain; charset=utf-8',
};

// Tiny landing page that surfaces a clear download link for the signed installer.
// Re-rendered per request so the size + SHA-256 line stays accurate after a
// re-publish without needing to restart the preview workflow.
function renderDownloadPage() {
  const info = getInstallerInfo();
  const fingerprintBlock = info
    ? `
    <div class="fingerprint">
      <div class="row"><span class="label">Size</span><span class="value">${escapeHtml(info.prettySize)}</span></div>
      <div class="row"><span class="label">SHA-256</span><code class="value sha">${escapeHtml(info.sha256)}</code></div>
      <p class="hint">If your downloaded file's size or SHA-256 does not match the values above, the download is corrupted — delete it and try again.</p>
    </div>`
    : `
    <div class="fingerprint missing">
      <p>Installer file is not currently available on the server.</p>
    </div>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Download Teacher Desk</title>
  <style>
    body { font-family: -apple-system, Segoe UI, Roboto, sans-serif;
           background: #f6f7fb; color: #111; margin: 0; padding: 48px 16px;
           display: flex; flex-direction: column; align-items: center; }
    .card { background: #fff; max-width: 560px; width: 100%;
            padding: 32px 28px; border-radius: 16px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08); text-align: center; }
    h1 { margin: 0 0 8px; font-size: 22px; }
    p  { margin: 8px 0; color: #444; line-height: 1.5; }
    .btn { display: inline-block; margin-top: 18px; padding: 14px 28px;
           background: #2563eb; color: #fff; text-decoration: none;
           border-radius: 10px; font-weight: 600; font-size: 16px; }
    .btn:hover { background: #1d4ed8; }
    .meta { margin-top: 14px; font-size: 12px; color: #777; }
    .credit { margin-top: 24px; font-size: 13px; color: #555; }
    .fingerprint { margin-top: 22px; padding: 14px 16px;
                   background: #f1f5f9; border-radius: 10px;
                   text-align: left; font-size: 13px; color: #334155; }
    .fingerprint .row { display: flex; align-items: baseline;
                        gap: 10px; margin: 4px 0; }
    .fingerprint .label { flex: 0 0 80px; font-weight: 600; color: #475569; }
    .fingerprint .value { flex: 1 1 auto; word-break: break-all; }
    .fingerprint .sha { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
                        font-size: 12px; background: #fff; padding: 2px 6px;
                        border-radius: 6px; border: 1px solid #e2e8f0; }
    .fingerprint .hint { margin-top: 10px; font-size: 12px; color: #64748b; }
    .fingerprint.missing { color: #b91c1c; background: #fef2f2; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Teacher Desk for Windows</h1>
    <p>Click the button below to download the signed installer.</p>
    <a class="btn" href="/download/TeacherDeskSetup.exe" download>Download TeacherDeskSetup.exe</a>
    <div class="meta">After downloading, double-click the file. Windows will show
      <strong>Verified publisher: Teacher Desk</strong> in the install prompt — click <em>Yes</em>.</div>
    ${fingerprintBlock}
    <div class="credit">Created by Coach Emad</div>
  </div>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  let url = decodeURIComponent((req.url || '/').split('?')[0]);

  // Friendly download landing page for the signed Windows installer.
  if (url === '/download' || url === '/download/') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.writeHead(200);
    res.end(renderDownloadPage());
    return;
  }

  // Direct download for files in the project's downloads/ folder
  // (currently just TeacherDeskSetup.exe).
  if (url.startsWith('/download/')) {
    const dlName = url.slice('/download/'.length);
    const dlPath = path.resolve(DOWNLOADS_ROOT, dlName);
    if (!isInside(DOWNLOADS_ROOT, dlPath)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }
    fs.readFile(dlPath, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      const ext = path.extname(dlPath).toLowerCase();
      res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${path.basename(dlPath)}"`,
      );
      res.setHeader('Cache-Control', 'no-store');
      res.writeHead(200);
      res.end(data);
    });
    return;
  }

  if (url === '/' || url === '') url = '/index.html';
  // Prevent path traversal: resolve to an absolute path then ensure it's
  // strictly inside ROOT. A naive `startsWith(ROOT)` check is bypassable
  // when a sibling directory shares the same prefix (e.g., `/foo/bar` vs
  // `/foo/bar-evil`); `isInside` uses path.relative to avoid that.
  const filePath = path.resolve(ROOT, '.' + url);
  if (!isInside(ROOT, filePath)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.writeHead(200);
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Teacher Desk preview running on port ${PORT}`);
});
