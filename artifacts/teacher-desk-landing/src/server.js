// Production wrapper around the Teacher Desk landing page server.
//
// teacher-desk/scripts/preview-server.js exports a fully-wired http.Server
// that does NOT call .listen() on its own (the listener is guarded behind
// `require.main === module`). We import that server here and bind it to
// $PORT so:
//   - Dev: `pnpm --filter @workspace/teacher-desk-landing run dev` runs
//     this file (the workflow supplies PORT=5000) and the preview pane
//     renders the page at the root of the workspace proxy.
//   - Production (autoscale): the artifact.toml runs this file with
//     PORT=5000; the platform proxy routes path "/" to this service so the
//     custom domain (e.g. teacher-desk.coachemad.me) and the default
//     deployment URL both serve the landing page.
//
// Importing — rather than copying — preserves the single source of truth in
// teacher-desk/scripts/{preview-server,render-download-page}.js, which is
// also used by `pnpm export:landing` for the offline static bundle.

const path = require('node:path');

const PREVIEW_SERVER = path.join(
  __dirname,
  '..', '..', '..',
  'teacher-desk', 'scripts', 'preview-server.js',
);

const { server } = require(PREVIEW_SERVER);

const PORT = parseInt(process.env.PORT || '5000', 10);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Teacher Desk landing server listening on ${PORT}`);
});

// Surface unhandled errors instead of dying silently — autoscale needs the
// non-zero exit + log line to report a failed start.
server.on('error', (err) => {
  console.error('Teacher Desk landing server error:', err);
  process.exit(1);
});
