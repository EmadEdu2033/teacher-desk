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

// Friendly, bilingual (EN / AR) landing page for the signed Windows installer.
// Re-rendered per request so the size + SHA-256 line stays accurate after a
// re-publish without needing to restart the preview workflow.
//
// The page is self-contained: inline <style>, inline <script>, no third-party
// CDN, no external font fetch. Assets (Alexandria font, brand icon, Coach
// Emad portrait) are served by the existing static handler from
// teacher-desk/renderer/.
function renderDownloadPage() {
  const info = getInstallerInfo();

  // Live size for the CTA button label (e.g. "82.9 MB"). Falls back to a
  // placeholder if the file isn't on disk; the bilingual labels below
  // include their own translation keys for the surrounding text.
  const sizeShort = info
    ? `${(info.size / 1024 / 1024).toFixed(1)} MB`
    : '—';

  // Fingerprint values are inserted as raw strings (size + sha) — escapeHtml
  // is unnecessary because both come from a local trusted file, but we keep
  // it for defence in depth.
  const sizePretty = info ? escapeHtml(info.prettySize) : '';
  const sha256 = info ? escapeHtml(info.sha256) : '';
  const installerAvailable = info ? 'true' : 'false';

  // Embedded i18n table — the toggle script reads from this. Keep the keys
  // identical to the data-i18n attributes used in the markup below.
  const i18n = {
    en: {
      htmlLang: 'en',
      htmlDir:  'ltr',
      docTitle: 'Download Teacher Desk',
      brandName: 'Teacher Desk',
      langButton: 'ع',
      langButtonTitle: 'التبديل إلى العربية',
      heroTitle: 'Teacher Desk',
      heroSubtitle: 'Sticky notes, tasks, and Podium mode — all on your computer.',
      heroLead: 'A quiet, offline desk for online teachers. Your notes and tasks never leave your machine.',
      featureNotesTitle: 'Sticky notes',
      featureNotesBody: 'A wall of colourful notes you can drag, resize and zoom — like a real desk.',
      featureTasksTitle: 'Tasks at a glance',
      featureTasksBody: 'Plan lessons, mark sub-tasks, and get a gentle reminder when something is due.',
      featurePodiumTitle: 'Podium mode',
      featurePodiumBody: 'Hide the app from screen capture in one click — Zoom and Meet see only a black box.',
      featureOfflineTitle: 'Stays on your computer',
      featureOfflineBody: 'No account, no cloud, no tracking. Everything is stored locally.',
      ctaLabel: 'Download for Windows',
      ctaSize: sizeShort,
      ctaReassurance: `Verified publisher: Teacher Desk · Windows 10 / 11 · ${sizeShort}`,
      installHint: 'After downloading, double-click the file. Windows will show <strong>Verified publisher: Teacher Desk</strong> in the install prompt — click <em>Yes</em>.',
      fingerprintHeading: 'File fingerprint',
      sizeLabel: 'Size',
      sha256Label: 'SHA-256',
      fingerprintHint: 'If your downloaded file\u2019s size or SHA-256 does not match the values above, the download is corrupted — delete it and try again.',
      missingInstaller: 'The installer file is not currently available on the server. Please come back in a moment.',
      footerCredit: 'Created by Coach Emad',
      footerVersion: 'Teacher Desk v1.0',
      featuresLabel: 'Features',
      mockS1Title: 'Lesson 12',
      mockS1Body:  'Past simple — examples',
      mockS2Title: 'Reminder',
      mockS2Body:  "Mark Sara's homework",
      mockS3Title: 'Podium',
      mockS3Body:  'Hide screen during meet',
      mockS4Title: 'Tasks',
      mockS4Body:  '3 due today',
    },
    ar: {
      htmlLang: 'ar',
      htmlDir:  'rtl',
      docTitle: 'تنزيل مكتب المعلم',
      brandName: 'مكتب المعلم',
      langButton: 'EN',
      langButtonTitle: 'Switch to English',
      heroTitle: 'مكتب المعلم',
      heroSubtitle: 'ملاحظات لاصقة، مهام، ووضع المنصة — على جهازك فقط.',
      heroLead: 'مكتب هادئ يعمل بدون إنترنت لمعلمي الأونلاين. ملاحظاتك ومهامك لا تغادر جهازك أبداً.',
      featureNotesTitle: 'ملاحظات لاصقة',
      featureNotesBody: 'حائط ملاحظات بألوان جميلة يمكنك سحبها وتكبيرها — تماماً مثل مكتبك الحقيقي.',
      featureTasksTitle: 'مهامك أمامك',
      featureTasksBody: 'خطّط للحصص، وقسّم المهام إلى خطوات، واحصل على تنبيه لطيف عند الموعد.',
      featurePodiumTitle: 'وضع المنصة',
      featurePodiumBody: 'أخفِ البرنامج من تسجيل الشاشة بضغطة واحدة — Zoom و Meet يريان مربعاً أسود فقط.',
      featureOfflineTitle: 'بياناتك على جهازك',
      featureOfflineBody: 'بدون حساب، بدون سحابة، بدون تتبّع. كل شيء محفوظ محلياً.',
      ctaLabel: 'تنزيل لويندوز',
      ctaSize: sizeShort,
      ctaReassurance: `الناشر الموثّق: Teacher Desk · يعمل على Windows 10 / 11 · ${sizeShort}`,
      installHint: 'بعد التنزيل، اضغط مرتين على الملف. سيُظهر ويندوز <strong>الناشر الموثّق: Teacher Desk</strong> في نافذة التثبيت — اضغط <em>نعم</em>.',
      fingerprintHeading: 'بصمة الملف',
      sizeLabel: 'الحجم',
      sha256Label: 'SHA-256',
      fingerprintHint: 'إذا لم يتطابق حجم الملف الذي نزّلته أو بصمة SHA-256 مع القيم أعلاه، فالتنزيل تالف — احذفه وأعد المحاولة.',
      missingInstaller: 'ملف التثبيت غير متوفر حالياً على الخادم. تفضّل بالعودة بعد قليل.',
      footerCredit: 'مقدم من Coach Emad',
      footerVersion: 'مكتب المعلم — الإصدار 1.0',
      featuresLabel: 'المميّزات',
      mockS1Title: 'الحصة ١٢',
      mockS1Body:  'الزمن الماضي البسيط — أمثلة',
      mockS2Title: 'تذكير',
      mockS2Body:  'تصحيح واجب سارة',
      mockS3Title: 'وضع المنصة',
      mockS3Body:  'إخفاء الشاشة أثناء الميت',
      mockS4Title: 'المهام',
      mockS4Body:  '٣ مستحقة اليوم',
    },
  };

  // Single self-contained HTML response. Inline CSS keeps the page to one
  // round trip. The toggle script is also inline so the language flip is
  // instant. No external CDN, matching the in-app strict CSP posture.
  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${escapeHtml(i18n.en.docTitle)}</title>
  <link rel="icon" type="image/svg+xml" href="/assets/icon.svg" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;" />
  <style>
    /* --- Alexandria — covers Latin + Arabic so the page feels like one family. */
    @font-face {
      font-family: "Alexandria";
      font-style: normal;
      font-weight: 100 900;
      font-display: swap;
      src: url("/fonts/alexandria-arabic.woff2") format("woff2");
    }

    :root {
      /* Brand: navy primary + soft sky blue accent (the icon's gradient). */
      --navy-900: #0b1220;
      --navy-800: #11203b;
      --navy-700: #1e3a8a;
      --navy-600: #1d4ed8;
      --sky-500: #3b82f6;
      --sky-400: #60a5fa;
      --sky-300: #93c5fd;
      --sky-100: #dbeafe;
      --cream:   #f8fafc;
      --surface: #ffffff;
      --text:    #0f172a;
      --muted:   #475569;
      --line:    #e2e8f0;
      --soft:    #f1f5f9;
      --shadow:  0 30px 60px -30px rgba(15, 23, 42, 0.25),
                 0 8px 24px -8px rgba(15, 23, 42, 0.12);
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --cream:   #0b1220;
        --surface: #11203b;
        --text:    #e6eefb;
        --muted:   #9bb0d3;
        --line:    rgba(148, 184, 240, 0.18);
        --soft:    rgba(148, 184, 240, 0.08);
        --shadow:  0 30px 60px -30px rgba(0, 0, 0, 0.6),
                   0 8px 24px -8px rgba(0, 0, 0, 0.4);
      }
    }

    *, *::before, *::after { box-sizing: border-box; }

    html, body {
      margin: 0; padding: 0;
      min-height: 100%;
      background: var(--cream);
      color: var(--text);
      font-family: "Alexandria", "Segoe UI", "Tahoma", "Noto Sans Arabic",
                   -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
      line-height: 1.55;
    }

    body {
      position: relative;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    /* --- Soft animated background blobs (navy + sky), behind everything. */
    .bg {
      position: fixed; inset: 0; z-index: -1;
      pointer-events: none; overflow: hidden;
    }
    .blob {
      position: absolute;
      width: 560px; height: 560px;
      border-radius: 50%;
      filter: blur(110px);
      opacity: 0.55;
      will-change: transform;
    }
    .blob.b1 { top: -180px; left: -120px;
               background: radial-gradient(circle, var(--sky-400) 0%, transparent 70%);
               animation: drift1 22s ease-in-out infinite alternate; }
    .blob.b2 { top: 30%; right: -160px;
               background: radial-gradient(circle, var(--navy-600) 0%, transparent 70%);
               animation: drift2 26s ease-in-out infinite alternate;
               opacity: 0.40; }
    .blob.b3 { bottom: -200px; left: 25%;
               background: radial-gradient(circle, var(--sky-300) 0%, transparent 70%);
               animation: drift3 19s ease-in-out infinite alternate;
               opacity: 0.45; }
    @media (prefers-color-scheme: dark) {
      .blob { opacity: 0.35; }
      .blob.b2 { opacity: 0.30; }
      .blob.b3 { opacity: 0.28; }
    }
    @keyframes drift1 { from { transform: translate(0,0) scale(1); }
                        to   { transform: translate(80px, 60px) scale(1.08); } }
    @keyframes drift2 { from { transform: translate(0,0) scale(1); }
                        to   { transform: translate(-60px, 90px) scale(1.05); } }
    @keyframes drift3 { from { transform: translate(0,0) scale(1); }
                        to   { transform: translate(-90px, -50px) scale(1.1); } }
    @media (prefers-reduced-motion: reduce) {
      .blob { animation: none !important; }
    }

    /* --- Page container. */
    .page {
      width: 100%;
      max-width: 1120px;
      margin: 0 auto;
      padding: clamp(20px, 4vw, 36px);
      flex: 1 0 auto;
      display: flex; flex-direction: column;
      gap: clamp(28px, 5vw, 48px);
    }

    /* --- Top bar: brand on the start, language toggle on the end. */
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px;
    }
    .brand {
      display: inline-flex; align-items: center; gap: 12px;
      text-decoration: none; color: inherit;
    }
    .brand-mark {
      width: 44px; height: 44px;
      border-radius: 12px;
      box-shadow: 0 6px 16px -8px rgba(29, 78, 216, 0.55);
      display: inline-block;
    }
    .brand-name {
      font-weight: 700; font-size: 18px; letter-spacing: -0.01em;
    }
    .lang-toggle {
      appearance: none; border: 1px solid var(--line);
      background: var(--surface); color: var(--text);
      width: 44px; height: 44px; border-radius: 50%;
      font-family: inherit; font-weight: 700; font-size: 14px;
      cursor: pointer; line-height: 1;
      display: inline-flex; align-items: center; justify-content: center;
      transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
      box-shadow: 0 4px 12px -6px rgba(15, 23, 42, 0.18);
    }
    .lang-toggle:hover { transform: translateY(-1px); border-color: var(--sky-400); }
    .lang-toggle:focus-visible {
      outline: none;
      box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.45);
    }

    /* --- Hero. */
    .hero {
      display: grid; grid-template-columns: 1.15fr 1fr; gap: clamp(28px, 5vw, 56px);
      align-items: center;
    }
    .hero-copy { min-width: 0; }
    .hero h1 {
      font-size: clamp(34px, 5.4vw, 56px);
      font-weight: 800; letter-spacing: -0.02em;
      line-height: 1.05;
      margin: 0 0 16px;
      color: var(--navy-700);
    }
    @media (prefers-color-scheme: dark) {
      .hero h1 { color: var(--sky-300); }
    }
    .hero .subtitle {
      font-size: clamp(17px, 1.8vw, 21px);
      color: var(--text);
      font-weight: 600;
      margin: 0 0 12px;
    }
    .hero .lead {
      font-size: clamp(15px, 1.4vw, 17px);
      color: var(--muted);
      margin: 0 0 28px;
      max-width: 56ch;
    }

    .cta-wrap {
      display: flex; flex-wrap: wrap; align-items: center; gap: 14px;
    }
    .cta {
      display: inline-flex; flex-direction: column; align-items: center;
      gap: 2px; text-decoration: none;
      padding: 16px 28px;
      background: linear-gradient(135deg, var(--navy-600) 0%, var(--sky-500) 100%);
      color: #fff; border-radius: 14px;
      font-weight: 700; font-size: 17px;
      box-shadow: 0 18px 40px -16px rgba(29, 78, 216, 0.55),
                  0 6px 14px -6px rgba(29, 78, 216, 0.45);
      transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
    }
    .cta:hover { transform: translateY(-2px);
                 box-shadow: 0 22px 48px -16px rgba(29, 78, 216, 0.65),
                             0 8px 18px -6px rgba(29, 78, 216, 0.5);
                 filter: brightness(1.04); }
    .cta:active { transform: translateY(0); }
    .cta:focus-visible {
      outline: none;
      box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.55),
                  0 18px 40px -16px rgba(29, 78, 216, 0.55);
    }
    .cta-size {
      font-size: 12.5px; font-weight: 500; opacity: 0.9;
      letter-spacing: 0.02em;
    }
    .reassurance {
      font-size: 13px; color: var(--muted);
    }

    .install-hint {
      margin-top: 18px;
      font-size: 13.5px; color: var(--muted);
      max-width: 56ch;
    }
    .install-hint strong { color: var(--text); }
    .install-hint em { font-style: normal; color: var(--navy-600); font-weight: 600; }
    @media (prefers-color-scheme: dark) {
      .install-hint em { color: var(--sky-300); }
    }

    /* --- Hero visual: stylised mock of the app frame. */
    .hero-visual {
      position: relative; width: 100%; aspect-ratio: 4 / 3;
      max-width: 480px; justify-self: end;
      border-radius: 22px;
      background: var(--surface);
      box-shadow: var(--shadow);
      border: 1px solid var(--line);
      overflow: hidden;
    }
    .hero-visual .titlebar {
      height: 36px; background: linear-gradient(90deg, var(--navy-700), var(--navy-600));
      display: flex; align-items: center; gap: 8px; padding: 0 14px;
    }
    .hero-visual .dot { width: 10px; height: 10px; border-radius: 50%;
                        background: rgba(255,255,255,0.55); }
    .hero-visual .dot:nth-child(1) { background: #ff5f57; }
    .hero-visual .dot:nth-child(2) { background: #febc2e; }
    .hero-visual .dot:nth-child(3) { background: #28c840; }
    .hero-visual .body {
      position: absolute; inset: 36px 0 0 0;
      padding: 16px;
      background:
        radial-gradient(circle at 80% 0%, rgba(96,165,250,0.18), transparent 50%),
        radial-gradient(circle at 0% 90%, rgba(29,78,216,0.10), transparent 50%);
    }
    .stickies { position: relative; width: 100%; height: 100%; }
    .sticky {
      position: absolute; padding: 12px 14px;
      border-radius: 8px; font-size: 13px; line-height: 1.35;
      box-shadow: 0 10px 22px -10px rgba(15, 23, 42, 0.35),
                  0 2px 6px rgba(15, 23, 42, 0.08);
      transform: rotate(var(--rot, 0deg));
      color: #1f2937;
    }
    .sticky.s1 { top: 6%;  left: 4%;  width: 44%; background: #ffe680; --rot: -3deg; }
    .sticky.s2 { top: 12%; right: 6%; width: 38%; background: #ffb3c7; --rot: 4deg; }
    .sticky.s3 { bottom: 6%; left: 8%; width: 40%; background: #b6e2c5; --rot: 2deg; }
    .sticky.s4 { bottom: 14%; right: 4%; width: 44%; background: #a8d3ff; --rot: -2deg; }
    .sticky b { display: block; font-size: 12.5px; margin-bottom: 4px; }
    .sticky span { display: block; font-size: 12px; opacity: 0.78; }

    /* --- Features. */
    .features {
      display: grid; gap: 18px;
      grid-template-columns: repeat(4, 1fr);
    }
    .feature {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 20px 18px;
      box-shadow: 0 14px 30px -22px rgba(15, 23, 42, 0.18);
    }
    .feature .icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: linear-gradient(135deg, var(--sky-100), var(--sky-300));
      color: var(--navy-700);
      display: inline-flex; align-items: center; justify-content: center;
      margin-bottom: 12px;
    }
    @media (prefers-color-scheme: dark) {
      .feature .icon {
        background: linear-gradient(135deg, rgba(96,165,250,0.18), rgba(59,130,246,0.30));
        color: var(--sky-300);
      }
    }
    .feature h3 { margin: 0 0 6px; font-size: 15px; font-weight: 700; }
    .feature p { margin: 0; font-size: 13.5px; color: var(--muted); }

    /* --- Fingerprint card. */
    .fingerprint {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 20px 22px;
      box-shadow: 0 14px 30px -22px rgba(15, 23, 42, 0.18);
    }
    .fingerprint h3 {
      margin: 0 0 12px; font-size: 14px; font-weight: 700;
      color: var(--muted); letter-spacing: 0.04em; text-transform: uppercase;
    }
    .fingerprint .row {
      display: flex; align-items: baseline; gap: 12px;
      padding: 8px 0; border-top: 1px solid var(--line);
    }
    .fingerprint .row:first-of-type { border-top: 0; padding-top: 0; }
    .fingerprint .label {
      flex: 0 0 90px; font-weight: 600; color: var(--muted); font-size: 13px;
    }
    .fingerprint .value { flex: 1 1 auto; word-break: break-all; font-size: 14px; }
    .fingerprint .sha {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12.5px;
      background: var(--soft);
      padding: 4px 8px; border-radius: 6px; border: 1px solid var(--line);
    }
    .fingerprint .hint {
      margin: 12px 0 0; font-size: 12.5px; color: var(--muted);
    }
    .fingerprint.missing {
      background: #fef2f2; color: #b91c1c; border-color: #fecaca;
    }
    @media (prefers-color-scheme: dark) {
      .fingerprint.missing {
        background: rgba(190, 18, 60, 0.12); color: #fda4af;
        border-color: rgba(244, 63, 94, 0.35);
      }
    }

    /* --- Footer credit. */
    .footer {
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px; flex-wrap: wrap;
      padding: 24px 0 8px;
      border-top: 1px solid var(--line);
      color: var(--muted); font-size: 13px;
    }
    .footer .credit {
      display: inline-flex; align-items: center; gap: 10px;
    }
    .footer .credit img {
      width: 32px; height: 32px; border-radius: 50%;
      object-fit: cover; border: 2px solid var(--surface);
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
    }

    /* --- RTL micro-adjustments. Logical properties handle most layout, but
           a few details (gradient direction, monospace text, etc.) need help. */
    [dir="rtl"] .sha { direction: ltr; text-align: left; unicode-bidi: embed; }
    [dir="rtl"] .feature h3, [dir="rtl"] .feature p { text-align: start; }

    /* --- Responsive. */
    @media (max-width: 900px) {
      .hero { grid-template-columns: 1fr; }
      .hero-visual { justify-self: center; max-width: 420px; }
      .features { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 520px) {
      .features { grid-template-columns: 1fr; }
      .brand-name { font-size: 16px; }
      .hero h1 { font-size: 34px; }
      .cta { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="bg" aria-hidden="true">
    <div class="blob b1"></div>
    <div class="blob b2"></div>
    <div class="blob b3"></div>
  </div>

  <div class="page">
    <header class="topbar">
      <a class="brand" href="/download">
        <img class="brand-mark" src="/assets/icon.svg" width="44" height="44" alt="" />
        <span class="brand-name" data-i18n="brandName">Teacher Desk</span>
      </a>
      <button id="langToggle" class="lang-toggle" type="button"
              data-i18n-attr="title:langButtonTitle;aria-label:langButtonTitle"
              title="Switch language" aria-label="Switch language">
        <span data-i18n="langButton">ع</span>
      </button>
    </header>

    <section class="hero">
      <div class="hero-copy">
        <h1 data-i18n="heroTitle">Teacher Desk</h1>
        <p class="subtitle" data-i18n="heroSubtitle">Sticky notes, tasks, and Podium mode — all on your computer.</p>
        <p class="lead" data-i18n="heroLead">A quiet, offline desk for online teachers. Your notes and tasks never leave your machine.</p>

        <div class="cta-wrap">
          <a class="cta" href="/download/TeacherDeskSetup.exe" download
             aria-describedby="ctaSize">
            <span data-i18n="ctaLabel">Download for Windows</span>
            <span class="cta-size" id="ctaSize">${escapeHtml(sizeShort)}</span>
          </a>
          <span class="reassurance" data-i18n="ctaReassurance">Verified publisher: Teacher Desk · Windows 10 / 11</span>
        </div>

        <p class="install-hint" data-i18n-html="installHint">
          After downloading, double-click the file. Windows will show
          <strong>Verified publisher: Teacher Desk</strong> in the install prompt — click <em>Yes</em>.
        </p>
      </div>

      <div class="hero-visual" aria-hidden="true">
        <div class="titlebar">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
        <div class="body">
          <div class="stickies">
            <div class="sticky s1"><b data-i18n="mockS1Title">Lesson 12</b><span data-i18n="mockS1Body">Past simple — examples</span></div>
            <div class="sticky s2"><b data-i18n="mockS2Title">Reminder</b><span data-i18n="mockS2Body">Mark Sara's homework</span></div>
            <div class="sticky s3"><b data-i18n="mockS3Title">Podium</b><span data-i18n="mockS3Body">Hide screen during meet</span></div>
            <div class="sticky s4"><b data-i18n="mockS4Title">Tasks</b><span data-i18n="mockS4Body">3 due today</span></div>
          </div>
        </div>
      </div>
    </section>

    <section class="features" data-i18n-attr="aria-label:featuresLabel" aria-label="Features">
      <div class="feature">
        <span class="icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>
        </span>
        <h3 data-i18n="featureNotesTitle">Sticky notes</h3>
        <p data-i18n="featureNotesBody">A wall of colourful notes you can drag, resize and zoom — like a real desk.</p>
      </div>
      <div class="feature">
        <span class="icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
        </span>
        <h3 data-i18n="featureTasksTitle">Tasks at a glance</h3>
        <p data-i18n="featureTasksBody">Plan lessons, mark sub-tasks, and get a gentle reminder when something is due.</p>
      </div>
      <div class="feature">
        <span class="icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/><line x1="3" y1="3" x2="21" y2="21"/></svg>
        </span>
        <h3 data-i18n="featurePodiumTitle">Podium mode</h3>
        <p data-i18n="featurePodiumBody">Hide the app from screen capture in one click — Zoom and Meet see only a black box.</p>
      </div>
      <div class="feature">
        <span class="icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M2 10h20M8 18v3M16 18v3M6 21h12"/></svg>
        </span>
        <h3 data-i18n="featureOfflineTitle">Stays on your computer</h3>
        <p data-i18n="featureOfflineBody">No account, no cloud, no tracking. Everything is stored locally.</p>
      </div>
    </section>

    <section class="fingerprint${info ? '' : ' missing'}" aria-label="File fingerprint">
      ${info ? `
      <h3 data-i18n="fingerprintHeading">File fingerprint</h3>
      <div class="row"><span class="label" data-i18n="sizeLabel">Size</span><span class="value">${sizePretty}</span></div>
      <div class="row"><span class="label" data-i18n="sha256Label">SHA-256</span><code class="value sha">${sha256}</code></div>
      <p class="hint" data-i18n="fingerprintHint">If your downloaded file's size or SHA-256 does not match the values above, the download is corrupted — delete it and try again.</p>
      ` : `
      <p data-i18n="missingInstaller">The installer file is not currently available on the server. Please come back in a moment.</p>
      `}
    </section>

    <footer class="footer">
      <span class="credit">
        <img src="/assets/coach-emad.jpg" alt="" />
        <span data-i18n="footerCredit">Created by Coach Emad</span>
      </span>
      <span data-i18n="footerVersion">Teacher Desk v1.0</span>
    </footer>
  </div>

  <script>
    (function () {
      var I18N = ${JSON.stringify(i18n)};
      var STORAGE_KEY = 'teacherDesk.lang';
      var INSTALLER_AVAILABLE = ${installerAvailable};

      function pickInitialLang() {
        try {
          var saved = window.localStorage.getItem(STORAGE_KEY);
          if (saved === 'ar' || saved === 'en') return saved;
        } catch (e) { /* localStorage may be blocked */ }
        var nav = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
        return nav.indexOf('ar') === 0 ? 'ar' : 'en';
      }

      function applyLang(lang) {
        var dict = I18N[lang] || I18N.en;
        var html = document.documentElement;
        html.setAttribute('lang', dict.htmlLang);
        html.setAttribute('dir', dict.htmlDir);
        document.title = dict.docTitle;

        // Plain-text strings.
        var nodes = document.querySelectorAll('[data-i18n]');
        for (var i = 0; i < nodes.length; i++) {
          var key = nodes[i].getAttribute('data-i18n');
          if (dict[key] != null) nodes[i].textContent = dict[key];
        }

        // HTML strings (e.g., the install hint with <strong>/<em>).
        var htmlNodes = document.querySelectorAll('[data-i18n-html]');
        for (var j = 0; j < htmlNodes.length; j++) {
          var hkey = htmlNodes[j].getAttribute('data-i18n-html');
          if (dict[hkey] != null) htmlNodes[j].innerHTML = dict[hkey];
        }

        // Attribute strings ("title:keyA;aria-label:keyB").
        var attrNodes = document.querySelectorAll('[data-i18n-attr]');
        for (var k = 0; k < attrNodes.length; k++) {
          var spec = attrNodes[k].getAttribute('data-i18n-attr');
          var pairs = spec.split(';');
          for (var p = 0; p < pairs.length; p++) {
            var pair = pairs[p].split(':');
            if (pair.length === 2 && dict[pair[1].trim()] != null) {
              attrNodes[k].setAttribute(pair[0].trim(), dict[pair[1].trim()]);
            }
          }
        }

        try { window.localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
        document.documentElement.setAttribute('data-current-lang', lang);
      }

      var current = pickInitialLang();
      applyLang(current);

      var btn = document.getElementById('langToggle');
      if (btn) {
        btn.addEventListener('click', function () {
          current = (current === 'ar') ? 'en' : 'ar';
          applyLang(current);
        });
      }

      // Suppress the install hint when the file is missing — it only makes
      // sense alongside an actual download.
      if (!INSTALLER_AVAILABLE) {
        var hint = document.querySelector('.install-hint');
        if (hint) hint.style.display = 'none';
        var cta = document.querySelector('.cta');
        if (cta) {
          cta.removeAttribute('href');
          cta.setAttribute('aria-disabled', 'true');
          cta.style.opacity = '0.55';
          cta.style.pointerEvents = 'none';
        }
      }
    })();
  </script>
</body>
</html>`;
}

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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Teacher Desk preview running on port ${PORT}`);
});
