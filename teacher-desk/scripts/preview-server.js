// Tiny HTTP server to preview the renderer in a browser (for development inside Replit).
// Bind to PORT (set by workflow).
//
// The HTML for the download landing page lives in render-download-page.js so
// the same renderer can drive both this dev server and the static export
// script (export-static.js). server.listen() is guarded behind
// `require.main === module` so importing this file does not start a listener.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const {
  renderDownloadPage,
  DOWNLOADS_ROOT,
} = require('./render-download-page.js');

const ROOT = path.join(__dirname, '..', 'renderer');
const PORT = parseInt(process.env.PORT || '5000', 10);

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

const server = http.createServer((req, res) => {
  let url = decodeURIComponent((req.url || '/').split('?')[0]);

  // Friendly download landing page for the signed Windows installer.
  // Both `/` and `/download` render the same page so a custom domain
  // pointed at the root works without per-host code, and direct links to
  // `/download` (the historical URL) keep working unchanged.
  if (url === '/' || url === '' || url === '/download' || url === '/download/') {
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

// Only start the listener when run directly. Importing this file from the
// export script (or tests) must remain side-effect-free.
if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Teacher Desk preview running on port ${PORT}`);
  });
}

module.exports = { server };
