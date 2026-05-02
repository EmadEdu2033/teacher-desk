// Build a self-contained static bundle of the Teacher Desk landing page.
//
// Output: dist/teacher-desk-landing/  (folder)
//         dist/teacher-desk-landing.zip (zip of the folder)
//
// The folder is hostable as-is on any static host (Netlify, Vercel,
// GitHub Pages, S3, plain nginx, file:// — anywhere). All asset URLs are
// relative ("./assets/…", "./downloads/…", "./teacher-desk-marketing-video/…")
// so the bundle works at the host root *or* under any subdirectory.
//
// Steps:
//   1. Re-render the landing HTML with relative URLs.
//   2. Build the marketing-video Vite app with `BASE_PATH=./` and copy its
//      `dist/public/` output into `teacher-desk-marketing-video/`.
//   3. Copy the favicon, the Coach Emad portrait, and the Alexandria font.
//   4. Copy the signed Windows installer + READ-ME-FIRST.txt into downloads/.
//   5. Write a short README.txt at the bundle root explaining how to deploy.
//   6. Zip the whole folder into dist/teacher-desk-landing.zip via python3
//      (no extra npm dependencies — `zip` is not always present in CI).

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  renderDownloadPage,
  getInstallerInfo,
  INSTALLER_FILE,
  DOWNLOADS_ROOT,
} = require('./render-download-page.js');

// All paths are anchored to the workspace root so the script can be run
// from anywhere (`pnpm export:landing`, `node teacher-desk/scripts/...`).
const REPO_ROOT       = path.resolve(__dirname, '..', '..');
const RENDERER_ROOT   = path.join(REPO_ROOT, 'teacher-desk', 'renderer');
const VIDEO_ROOT      = path.join(REPO_ROOT, 'artifacts', 'teacher-desk-marketing-video');
const VIDEO_DIST      = path.join(VIDEO_ROOT, 'dist', 'public');

const DIST_ROOT       = path.join(REPO_ROOT, 'dist');
const BUNDLE_DIR_NAME = 'teacher-desk-landing';
const BUNDLE_DIR      = path.join(DIST_ROOT, BUNDLE_DIR_NAME);
const BUNDLE_ZIP      = path.join(DIST_ROOT, `${BUNDLE_DIR_NAME}.zip`);

// Relative URLs the static bundle uses. The leading "./" is critical so the
// page loads under any subpath (e.g., https://example.com/teacher-desk/),
// matches Vite's `base: "./"` convention for the embedded video, and works
// from file:// for users who just unzip and double-click index.html.
const STATIC_URLS = {
  brandHref:    './',
  iconUrl:      './assets/icon.svg',
  coachUrl:     './assets/coach-emad.jpg',
  fontUrl:      './fonts/alexandria-arabic.woff2',
  installerUrl: './downloads/TeacherDeskSetup.exe',
  // Explicit index.html so the iframe loads under file:// too — browsers
  // do not auto-resolve directory URLs to index.html when there is no
  // HTTP server doing it for them.
  videoUrl:     './teacher-desk-marketing-video/index.html',
};

function log(msg) {
  process.stdout.write(`[export-static] ${msg}\n`);
}

async function rmDir(p) {
  await fsp.rm(p, { recursive: true, force: true });
}

async function copyFile(src, dest) {
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  await fsp.copyFile(src, dest);
}

// Recursive copy that walks src and mirrors directories + files into dest.
// Node 16.7+ has fs.cp with `recursive: true`, which is the right tool.
async function copyDir(src, dest) {
  await fsp.cp(src, dest, { recursive: true, dereference: true });
}

// Build a clean env for spawned children. When this script runs via
// `pnpm run export:landing`, the outer pnpm leaks a bunch of npm_* env vars
// (`npm_lifecycle_event`, `npm_config_user_agent`, …). A nested `pnpm`
// invocation reads those, mistakes itself for a lifecycle script, and is
// killed by SIGTERM somewhere in its bookkeeping (the symptom is
// `status === null && signal === null`). Stripping the leaked vars is
// enough to make nested pnpm calls behave identically to a fresh shell.
function cleanChildEnv(extra = {}) {
  const out = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith('npm_') || k === 'PNPM_SCRIPT_SRC_DIR') continue;
    out[k] = v;
  }
  return { ...out, ...extra };
}

function runStep(label, cmd, args, opts = {}) {
  log(`${label}: ${cmd} ${args.join(' ')}`);
  const { env: extraEnv, ...rest } = opts;
  const result = spawnSync(cmd, args, {
    // Ignore stdin so the child cannot block waiting for TTY input, and
    // so closing of our own stdin (when run from a workflow) does not
    // propagate as EOF to the child.
    stdio: ['ignore', 'inherit', 'inherit'],
    cwd: REPO_ROOT,
    env: cleanChildEnv(extraEnv || {}),
    ...rest,
  });
  if (result.signal) {
    throw new Error(`${label} killed by signal ${result.signal}`);
  }
  if (result.status !== 0) {
    throw new Error(`${label} failed (exit ${result.status})`);
  }
}

async function main() {
  // 0. Sanity check — refuse to export without the installer present, since
  //    the whole point of the bundle is shipping the signed .exe with the
  //    SHA-256 baked into the page.
  if (!fs.existsSync(INSTALLER_FILE)) {
    throw new Error(
      `Installer not found at ${INSTALLER_FILE}. ` +
      `Run "node teacher-desk/scripts/release.js" first.`,
    );
  }
  const info = getInstallerInfo();
  log(`Installer: ${info.prettySize}`);
  log(`SHA-256:   ${info.sha256}`);

  // 1. Clean output dir for an idempotent build. We keep dist/ around for
  //    other artifacts but always rebuild teacher-desk-landing/ from scratch.
  log('Cleaning dist/teacher-desk-landing/ + .zip ...');
  await rmDir(BUNDLE_DIR);
  await fsp.rm(BUNDLE_ZIP, { force: true });
  await fsp.mkdir(BUNDLE_DIR, { recursive: true });

  // 2. Build the Vite marketing video with BASE_PATH=./ so the emitted
  //    index.html references its assets via relative URLs ("./assets/...").
  //    Vite supports `base: './'` for relative bases (read by vite.config.ts).
  log('Building marketing-video (Vite) with BASE_PATH=./ ...');
  runStep(
    'pnpm build',
    'pnpm',
    ['--filter', '@workspace/teacher-desk-marketing-video', 'run', 'build'],
    { env: { BASE_PATH: './' } },
  );
  if (!fs.existsSync(path.join(VIDEO_DIST, 'index.html'))) {
    throw new Error(
      `Vite build produced no index.html at ${VIDEO_DIST}. Aborting.`,
    );
  }

  // 3. Copy the built Vite app into the bundle.
  log('Copying marketing video into bundle ...');
  await copyDir(VIDEO_DIST, path.join(BUNDLE_DIR, 'teacher-desk-marketing-video'));

  // 4. Copy renderer assets (favicon, Coach Emad portrait) + Alexandria font.
  //    These mirror the URL paths used by STATIC_URLS so the rendered HTML
  //    finds them at "./assets/..." and "./fonts/...".
  log('Copying assets + fonts ...');
  await copyFile(
    path.join(RENDERER_ROOT, 'assets', 'icon.svg'),
    path.join(BUNDLE_DIR, 'assets', 'icon.svg'),
  );
  await copyFile(
    path.join(RENDERER_ROOT, 'assets', 'coach-emad.jpg'),
    path.join(BUNDLE_DIR, 'assets', 'coach-emad.jpg'),
  );
  await copyFile(
    path.join(RENDERER_ROOT, 'fonts', 'alexandria-arabic.woff2'),
    path.join(BUNDLE_DIR, 'fonts', 'alexandria-arabic.woff2'),
  );

  // 5. Copy the installer + read-me into downloads/.
  log('Copying installer + read-me ...');
  await copyFile(
    INSTALLER_FILE,
    path.join(BUNDLE_DIR, 'downloads', 'TeacherDeskSetup.exe'),
  );
  await copyFile(
    path.join(DOWNLOADS_ROOT, 'READ-ME-FIRST.txt'),
    path.join(BUNDLE_DIR, 'downloads', 'READ-ME-FIRST.txt'),
  );

  // 6. Render and write the landing page itself. Done last so the SHA-256
  //    line reflects the installer that was just copied into the bundle.
  log('Rendering index.html ...');
  const html = renderDownloadPage(STATIC_URLS);
  await fsp.writeFile(path.join(BUNDLE_DIR, 'index.html'), html, 'utf8');

  // 7. Deploy README at the bundle root.
  const readme = `Teacher Desk — landing page bundle
==================================

This folder is the complete, self-contained landing page for the
Teacher Desk Windows installer. It has no server-side code and no
external dependencies (no CDN, no external font fetch). You can host it
on any static host without modification:

  Netlify / Vercel / Cloudflare Pages  — drag-and-drop the folder.
  GitHub Pages                          — push the contents to a branch.
  Amazon S3 (static website hosting)   — upload the folder, set
                                          index.html as the index document.
  nginx / Apache                        — copy the folder into your web
                                          root and serve it as static files.

Local preview:
  Just double-click index.html in the folder, or open it in any browser.
  All asset URLs are relative ("./assets/...", "./downloads/...",
  "./teacher-desk-marketing-video/...") so the page works at the host
  root or under any subdirectory (e.g., /teacher-desk/).

What is included:
  index.html                              The bilingual EN/AR landing
                                          page. The "Download for Windows"
                                          button points at the bundled
                                          installer; the SHA-256 fingerprint
                                          on the page is the actual hash of
                                          that installer at export time.
  assets/icon.svg                         The brand mark (also the favicon).
  assets/coach-emad.jpg                   Footer credit photo.
  fonts/alexandria-arabic.woff2           Alexandria font (Latin + Arabic).
  downloads/TeacherDeskSetup.exe          The signed Windows installer
                                          (this is what visitors download).
  downloads/READ-ME-FIRST.txt             Plain-text install instructions
                                          shipped alongside the .exe.
  teacher-desk-marketing-video/           The 30-second marketing video,
                                          built as a static Vite app and
                                          embedded in the page via iframe.

Re-export:
  If the installer is ever republished (so the SHA-256 changes), re-run
  the export from the workspace root:
      pnpm run export:landing
  This regenerates index.html with the new fingerprint and rebuilds the
  zip in dist/teacher-desk-landing.zip.

Installer fingerprint (snapshot from export time):
  Size:   ${info.prettySize}
  SHA-256: ${info.sha256}
`;
  await fsp.writeFile(path.join(BUNDLE_DIR, 'README.txt'), readme, 'utf8');

  // 8. Zip the bundle. We shell out to python3's zipfile module because
  //    the system `zip` binary is not always present and adding a new npm
  //    dependency would extend the supply-chain surface for one operation.
  //    -c <name> <files...> creates the archive; we cd into dist/ first so
  //    the entries are stored as "teacher-desk-landing/..." (no parent path).
  log('Zipping bundle ...');
  runStep(
    'zip',
    'python3',
    ['-m', 'zipfile', '-c', BUNDLE_ZIP, BUNDLE_DIR_NAME],
    { cwd: DIST_ROOT },
  );

  const zipStat = fs.statSync(BUNDLE_ZIP);
  const zipMb = (zipStat.size / 1024 / 1024).toFixed(1);
  log(`Done.`);
  log(`  Bundle: ${path.relative(REPO_ROOT, BUNDLE_DIR)}/`);
  log(`  Zip:    ${path.relative(REPO_ROOT, BUNDLE_ZIP)} (${zipMb} MB)`);
}

main().catch((err) => {
  process.stderr.write(`[export-static] ERROR: ${err.message}\n`);
  if (err.stack) process.stderr.write(`${err.stack}\n`);
  process.exit(1);
});
