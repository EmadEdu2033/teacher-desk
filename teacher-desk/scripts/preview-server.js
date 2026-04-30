// Tiny HTTP server to preview the renderer in a browser (for development inside Replit).
// Bind to PORT (set by workflow).

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', 'renderer');
// downloads/ at the project root holds the signed Windows installer.
const DOWNLOADS_ROOT = path.join(__dirname, '..', '..', 'downloads');
const PORT = parseInt(process.env.PORT || '5000', 10);

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
const DOWNLOAD_PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Download Teacher Desk</title>
  <style>
    body { font-family: -apple-system, Segoe UI, Roboto, sans-serif;
           background: #f6f7fb; color: #111; margin: 0; padding: 48px 16px;
           display: flex; flex-direction: column; align-items: center; }
    .card { background: #fff; max-width: 520px; width: 100%;
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
  </style>
</head>
<body>
  <div class="card">
    <h1>Teacher Desk for Windows</h1>
    <p>Click the button below to download the signed installer (about 75&nbsp;MB).</p>
    <a class="btn" href="/download/TeacherDeskSetup.exe" download>Download TeacherDeskSetup.exe</a>
    <div class="meta">After downloading, double-click the file. Windows will show
      <strong>Verified publisher: Teacher Desk</strong> in the install prompt — click <em>Yes</em>.</div>
    <div class="credit">Created by Coach Emad</div>
  </div>
</body>
</html>`;

const server = http.createServer((req, res) => {
  let url = decodeURIComponent((req.url || '/').split('?')[0]);

  // Friendly download landing page for the signed Windows installer.
  if (url === '/download' || url === '/download/') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.writeHead(200);
    res.end(DOWNLOAD_PAGE);
    return;
  }

  // Direct download for files in the project's downloads/ folder
  // (currently just TeacherDeskSetup.exe).
  if (url.startsWith('/download/')) {
    const dlName = url.slice('/download/'.length);
    const dlPath = path.normalize(path.join(DOWNLOADS_ROOT, dlName));
    if (!dlPath.startsWith(DOWNLOADS_ROOT)) {
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
  // Prevent path traversal
  const filePath = path.normalize(path.join(ROOT, url));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
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
