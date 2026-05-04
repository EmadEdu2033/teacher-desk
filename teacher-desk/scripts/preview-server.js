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

// Path to the marketing-video Vite build output. The landing server mounts
// it at /teacher-desk-marketing-video/* so a single deployable artifact
// (this one) serves both the landing page AND the embedded promo video.
//
// Why this matters: Replit's publish flow lists every artifact that has
// [services.production] in its artifact.toml as a separately publishable
// unit. When the marketing-video artifact had its own [services.production]
// block, the publish dialog defaulted to "publish the video alone" and the
// custom domain wound up serving only the video — never the landing. By
// having the landing serve the video files itself, the marketing-video
// artifact becomes a dev/preview-only convenience and the deployment has
// exactly one artifact to publish, eliminating the misconfiguration class.
const VIDEO_DIST = path.resolve(
  __dirname, '..', '..',
  'artifacts', 'teacher-desk-marketing-video', 'dist', 'public',
);
const VIDEO_PREFIX = '/teacher-desk-marketing-video/';

// Returns true iff `candidate` is the same as `parent` or strictly inside it.
// Uses path.relative so we are not fooled by sibling directories sharing a
// prefix (e.g., `/srv/downloads` vs `/srv/downloads-evil`).
function isInside(parent, candidate) {
  const rel = path.relative(parent, candidate);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

// Stream a single file from the marketing-video Vite bundle. Used by the
// /teacher-desk-marketing-video/* mount above. Path-traversal-safe via
// isInside on VIDEO_DIST.
function serveVideoFile(rel, res) {
  const filePath = path.resolve(VIDEO_DIST, '.' + path.posix.normalize('/' + rel));
  if (!isInside(VIDEO_DIST, filePath)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(
        'Marketing-video bundle not found at ' + VIDEO_DIST + '\n' +
        'Run: pnpm --filter @workspace/teacher-desk-marketing-video run build',
      );
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.setHeader('Content-Type', TYPES[ext] || 'application/octet-stream');
    // Long cache for hashed asset bundles, short cache for index.html so a
    // republish picks up the new entry script immediately.
    res.setHeader(
      'Cache-Control',
      ext === '.html' ? 'no-store' : 'public, max-age=31536000, immutable',
    );
    res.writeHead(200);
    res.end(data);
  });
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
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

  // Marketing-video Vite bundle, mounted at /teacher-desk-marketing-video/*.
  // Serves the static build from artifacts/teacher-desk-marketing-video/
  // dist/public so this single artifact is everything the deployment needs.
  // Falls through to a 404 (with a helpful message) if the bundle is
  // missing — that means the production build step did not run, which is
  // the kind of failure we want surfaced loudly instead of silently
  // showing a blank iframe.
  if (url === VIDEO_PREFIX || url === VIDEO_PREFIX.slice(0, -1)) {
    // Trailing-slash redirect so relative asset URLs in index.html resolve
    // against the right base. Browsers do this automatically for
    // directory-style URLs only when the server returns a 301/302; our
    // hand-rolled handler must do it explicitly.
    if (url === VIDEO_PREFIX.slice(0, -1)) {
      res.writeHead(301, { Location: VIDEO_PREFIX });
      res.end();
      return;
    }
    serveVideoFile('index.html', res);
    return;
  }
  if (url.startsWith(VIDEO_PREFIX)) {
    const rel = url.slice(VIDEO_PREFIX.length) || 'index.html';
    serveVideoFile(rel, res);
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
