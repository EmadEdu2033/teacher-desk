const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DOWNLOADS_ROOT = path.join(__dirname, '..', '..', 'downloads');
const INSTALLER_FILE = path.join(DOWNLOADS_ROOT, 'TeacherDeskSetup.exe');

let installerCache = null;

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
  if (installerCache && installerCache.size === stat.size && installerCache.mtimeMs === stat.mtimeMs) {
    return installerCache;
  }
  const buf = fs.readFileSync(INSTALLER_FILE);
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  installerCache = {
    size: stat.size,
    mtimeMs: stat.mtimeMs,
    sha256,
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

const DEFAULT_URLS = {
  brandHref: '/download',
  iconUrl: '/assets/icon.svg',
  coachUrl: '/assets/coach-emad.jpg',
  fontUrl: '/fonts/alexandria-arabic.woff2',
  installerUrl: '/download/TeacherDeskSetup.exe',
  videoUrl: '/teacher-desk-marketing-video/',
  iframeLoading: 'eager',
};

function renderDownloadPage(urls = DEFAULT_URLS) {
  const u = { ...DEFAULT_URLS, ...urls };
  const info = getInstallerInfo();
  const sizeRaw = info ? `${(info.size / 1024 / 1024).toFixed(1)} MB` : '—';
  const sizeShort = info ? `· ${sizeRaw}` : sizeRaw;
  const sizePretty = info ? escapeHtml(info.prettySize) : '';
  const sha256 = info ? escapeHtml(info.sha256) : '';
  const installerAvailable = !!info;

  const i18n = {
    en: {
      htmlLang: 'en', htmlDir: 'ltr', docTitle: 'Download Teacher Desk',
      brandName: 'Teacher Desk', langButton: 'ع', langButtonTitle: 'التبديل إلى العربية',
      heroTitle: 'Teacher Desk',
      heroSubtitle: 'Sticky notes, tasks, and Podium mode, all on your computer.',
      heroLead: 'A quiet, offline desk for online teachers. Your notes and tasks never leave your machine.',
      ctaLabel: 'Download for Windows', ctaReassurance: `Verified publisher: Teacher Desk · Windows 10 / 11 · ${sizeRaw}`,
      installHint: 'After downloading, double-click the file. Windows will show <strong>Verified publisher: Teacher Desk</strong> in the install prompt, click <em>Yes</em>.',
      featuresLabel: 'Features',
      featureNotesTitle: 'Sticky notes', featureNotesBody: 'A wall of colourful notes you can drag, resize and zoom, like a real desk.',
      featureTasksTitle: 'Tasks at a glance', featureTasksBody: 'Plan lessons, mark sub-tasks, and get a gentle reminder when something is due.',
      featurePodiumTitle: 'Podium mode', featurePodiumBody: 'Hide the app from screen capture in one click, Zoom and Meet see only a black box.',
      featureOfflineTitle: 'Stays on your computer', featureOfflineBody: 'No account, no cloud, no tracking. Everything is stored locally.',
      fingerprintHeading: 'File fingerprint', sizeLabel: 'Size', sha256Label: 'SHA-256',
      fingerprintHint: 'If the downloaded file size or SHA-256 does not match the values above, delete it and download again.',
      missingInstaller: 'The installer file is not currently available on the server. Please come back in a moment.',
      videoEyebrow: 'See it in action', videoTitle: 'Teacher Desk in motion',
      videoLead: 'The preview below starts immediately when the page opens.',
      videoCaption: 'Silent preview · loops automatically', videoIframeTitle: 'Teacher Desk product tour',
      mockS1Title: 'Lesson 12', mockS1Body: 'Past simple examples',
      mockS2Title: 'Reminder', mockS2Body: 'Mark Sara homework',
      mockS3Title: 'Podium', mockS3Body: 'Hide screen during meet',
      mockS4Title: 'Tasks', mockS4Body: '3 due today',
      footerCredit: 'Created by Coach Emad', footerVersion: 'Teacher Desk v1.0'
    },
    ar: {
      htmlLang: 'ar', htmlDir: 'rtl', docTitle: 'تنزيل Teacher Desk',
      brandName: 'Teacher Desk', langButton: 'EN', langButtonTitle: 'Switch to English',
      heroTitle: 'Teacher Desk',
      heroSubtitle: 'ملاحظات لاصقة، مهام، ووضع المنصة، على جهازك فقط.',
      heroLead: 'مكتب هادئ يعمل بدون إنترنت لمعلمي الأونلاين. ملاحظاتك ومهامك تظل على جهازك ولا تغادره.',
      ctaLabel: 'تنزيل لويندوز', ctaReassurance: `الناشر الموثق: Teacher Desk · يعمل على Windows 10 / 11 · ${sizeRaw}`,
      installHint: 'بعد التنزيل، اضغط مرتين على الملف. سيظهر ويندوز <strong>Verified publisher: Teacher Desk</strong> في نافذة التثبيت، ثم اضغط <em>Yes</em>.',
      featuresLabel: 'المميزات',
      featureNotesTitle: 'ملاحظات لاصقة', featureNotesBody: 'حائط ملاحظات بألوان مريحة يمكنك سحبه وتكبيره مثل مكتبك الحقيقي.',
      featureTasksTitle: 'مهامك أمامك', featureTasksBody: 'خطط للحصص، قسم المهام، وخذ تذكيرًا لطيفًا عند الموعد.',
      featurePodiumTitle: 'وضع المنصة', featurePodiumBody: 'أخف البرنامج من التقاط الشاشة بضغطة واحدة، وZoom وMeet سيريان صندوقًا أسود فقط.',
      featureOfflineTitle: 'بياناتك على جهازك', featureOfflineBody: 'بدون حساب، بدون سحابة، وبدون تتبع. كل شيء محفوظ محليًا.',
      fingerprintHeading: 'بصمة الملف', sizeLabel: 'الحجم', sha256Label: 'SHA-256',
      fingerprintHint: 'إذا كان حجم الملف أو بصمة SHA-256 مختلفين عن القيم أعلاه، احذف الملف وأعد تنزيله.',
      missingInstaller: 'ملف التثبيت غير متاح الآن على الخادم. جرّب مرة أخرى بعد قليل.',
      videoEyebrow: 'شاهد البرنامج', videoTitle: 'Teacher Desk أثناء العمل',
      videoLead: 'المعاينة تبدأ مباشرة عند فتح الصفحة.',
      videoCaption: 'عرض صامت · يعيد نفسه تلقائيًا', videoIframeTitle: 'جولة Teacher Desk',
      mockS1Title: 'الحصة 12', mockS1Body: 'أمثلة على الماضي البسيط',
      mockS2Title: 'تذكير', mockS2Body: 'تصحيح واجب سارة',
      mockS3Title: 'وضع المنصة', mockS3Body: 'إخفاء الشاشة أثناء الميت',
      mockS4Title: 'المهام', mockS4Body: '3 مستحقة اليوم',
      footerCredit: 'من إعداد Coach Emad', footerVersion: 'Teacher Desk الإصدار 1.0'
    }
  };

  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(i18n.en.docTitle)}</title>
  <link rel="icon" type="image/svg+xml" href="${escapeHtml(u.iconUrl)}" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; frame-src 'self';" />
  <style>
    @font-face { font-family: Alexandria; src: url('${u.fontUrl}') format('woff2'); font-display: swap; }
    :root { --bg:#0b1220; --surface:#11203b; --card:#162441; --line:rgba(148,184,240,.16); --text:#e7eefb; --muted:#a7b6d1; --blue:#4f8cff; --blue2:#2a62ff; --soft:#0f172a; }
    * { box-sizing:border-box } html,body{margin:0;padding:0;background:var(--bg);color:var(--text);font-family:Alexandria,Segoe UI,Tahoma,sans-serif}
    body{min-height:100vh} .page{max-width:1180px;margin:0 auto;padding:22px} .topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}
    .brand{display:flex;gap:12px;align-items:center;text-decoration:none;color:inherit}.brand img{width:44px;height:44px;border-radius:12px}.brand-name{font-weight:700}
    .lang-toggle{width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:rgba(255,255,255,.03);color:#fff;font-weight:700;cursor:pointer}
    .hero{display:grid;grid-template-columns:1.06fr 1fr;gap:34px;align-items:center}.hero h1{font-size:68px;line-height:1.02;margin:0 0 16px;color:#9ec3ff}.subtitle{font-size:22px;font-weight:700;margin:0 0 12px}.lead{font-size:18px;color:var(--muted);margin:0 0 24px;line-height:1.7}
    .cta{display:inline-flex;flex-direction:column;align-items:center;gap:4px;background:linear-gradient(135deg,var(--blue2),var(--blue));color:#fff;text-decoration:none;padding:18px 28px;border-radius:16px;font-weight:800;box-shadow:0 18px 48px -20px rgba(79,140,255,.65)}
    .cta small{font-size:13px;opacity:.92}.reassurance,.install-hint{color:var(--muted);font-size:14px;line-height:1.7}.install-hint{max-width:54ch;margin-top:14px}
    .hero-visual{position:relative;border-radius:22px;overflow:hidden;background:#000;border:1px solid var(--line);box-shadow:0 30px 80px -30px rgba(0,0,0,.55);aspect-ratio:16/9;min-height:320px}
    .hero-visual iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000}.fallback-mock{display:none;position:absolute;inset:0;padding:16px;background:linear-gradient(180deg,#1d4ed8,#0f1d3a)}
    .titlebar{height:36px;display:flex;align-items:center;gap:8px}.dot{width:10px;height:10px;border-radius:50%;background:#fff}.dot:nth-child(1){background:#ff5f57}.dot:nth-child(2){background:#febc2e}.dot:nth-child(3){background:#28c840}
    .stickies{position:relative;height:calc(100% - 36px)} .sticky{position:absolute;padding:12px 14px;border-radius:10px;color:#243042;font-size:13px;line-height:1.35;box-shadow:0 10px 24px rgba(0,0,0,.18)} .sticky b{display:block;margin-bottom:6px}
    .s1{top:14%;left:8%;width:36%;background:#ffe680;transform:rotate(-4deg)} .s2{top:16%;right:8%;width:32%;background:#ffb3c7;transform:rotate(4deg)} .s3{bottom:12%;left:10%;width:34%;background:#b6e2c5;transform:rotate(2deg)} .s4{bottom:16%;right:8%;width:34%;background:#a8d3ff;transform:rotate(-2deg)}
    .section-head{text-align:center;margin:42px 0 18px}.section-head .eyebrow{display:inline-block;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid var(--line);color:#8fb6ff;font-size:12px;font-weight:700}.section-head h2{font-size:34px;margin:12px 0 8px}.section-head p{color:var(--muted);margin:0}
    .features{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:24px}.feature,.fingerprint{background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:18px;padding:20px}.feature h3{margin:0 0 6px;font-size:16px}.feature p,.fingerprint p{margin:0;color:var(--muted);line-height:1.7}.fingerprint{margin-top:22px}.row{display:flex;gap:12px;padding:8px 0;border-top:1px solid var(--line)}.row:first-of-type{border-top:0}.label{width:90px;color:var(--muted);font-weight:700}.sha{word-break:break-all;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
    .footer{display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-top:28px;padding-top:24px;border-top:1px solid var(--line);color:var(--muted);font-size:13px}.footer .credit{display:flex;align-items:center;gap:10px}.footer img{width:32px;height:32px;border-radius:50%}
    [dir='rtl'] .sha{direction:ltr;text-align:left}
    @media (max-width:960px){.hero{grid-template-columns:1fr}.hero h1{font-size:52px}.features{grid-template-columns:repeat(2,1fr)}}
    @media (max-width:560px){.page{padding:16px}.hero h1{font-size:42px}.subtitle{font-size:18px}.lead{font-size:16px}.features{grid-template-columns:1fr}.cta{width:100%}.hero-visual{min-height:220px}}
  </style>
</head>
<body>
  <div class="page">
    <header class="topbar">
      <a class="brand" href="${escapeHtml(u.brandHref)}"><img src="${escapeHtml(u.iconUrl)}" alt="" /><span class="brand-name" data-i18n="brandName">Teacher Desk</span></a>
      <button id="langToggle" class="lang-toggle" type="button" data-i18n-attr="title:langButtonTitle;aria-label:langButtonTitle"><span data-i18n="langButton">ع</span></button>
    </header>

    <section class="hero">
      <div class="hero-copy">
        <h1 data-i18n="heroTitle">Teacher Desk</h1>
        <p class="subtitle" data-i18n="heroSubtitle">Sticky notes, tasks, and Podium mode, all on your computer.</p>
        <p class="lead" data-i18n="heroLead">A quiet, offline desk for online teachers. Your notes and tasks never leave your machine.</p>
        <a class="cta" href="${escapeHtml(u.installerUrl)}" download><span data-i18n="ctaLabel">Download for Windows</span><small>${escapeHtml(sizeShort)}</small></a>
        <p class="reassurance" data-i18n="ctaReassurance">Verified publisher: Teacher Desk · Windows 10 / 11</p>
        <p class="install-hint" data-i18n-html="installHint">After downloading, double-click the file. Windows will show <strong>Verified publisher: Teacher Desk</strong> in the install prompt, click <em>Yes</em>.</p>
      </div>
      <div class="hero-visual">
        <iframe id="heroVideo" src="${escapeHtml(u.videoUrl)}" loading="${escapeHtml(u.iframeLoading)}" allow="autoplay" referrerpolicy="no-referrer" data-i18n-attr="title:videoIframeTitle" title="Teacher Desk product tour"></iframe>
        <div class="fallback-mock" id="videoFallback" aria-hidden="true">
          <div class="titlebar"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
          <div class="stickies">
            <div class="sticky s1"><b data-i18n="mockS1Title">Lesson 12</b><span data-i18n="mockS1Body">Past simple examples</span></div>
            <div class="sticky s2"><b data-i18n="mockS2Title">Reminder</b><span data-i18n="mockS2Body">Mark Sara homework</span></div>
            <div class="sticky s3"><b data-i18n="mockS3Title">Podium</b><span data-i18n="mockS3Body">Hide screen during meet</span></div>
            <div class="sticky s4"><b data-i18n="mockS4Title">Tasks</b><span data-i18n="mockS4Body">3 due today</span></div>
          </div>
        </div>
      </div>
    </section>

    <div class="section-head"><span class="eyebrow" data-i18n="videoEyebrow">See it in action</span><h2 data-i18n="videoTitle">Teacher Desk in motion</h2><p data-i18n="videoLead">The preview below starts immediately when the page opens.</p></div>

    <section class="features" data-i18n-attr="aria-label:featuresLabel" aria-label="Features">
      <div class="feature"><h3 data-i18n="featureNotesTitle">Sticky notes</h3><p data-i18n="featureNotesBody">A wall of colourful notes you can drag, resize and zoom, like a real desk.</p></div>
      <div class="feature"><h3 data-i18n="featureTasksTitle">Tasks at a glance</h3><p data-i18n="featureTasksBody">Plan lessons, mark sub-tasks, and get a gentle reminder when something is due.</p></div>
      <div class="feature"><h3 data-i18n="featurePodiumTitle">Podium mode</h3><p data-i18n="featurePodiumBody">Hide the app from screen capture in one click, Zoom and Meet see only a black box.</p></div>
      <div class="feature"><h3 data-i18n="featureOfflineTitle">Stays on your computer</h3><p data-i18n="featureOfflineBody">No account, no cloud, no tracking. Everything is stored locally.</p></div>
    </section>

    <section class="fingerprint${installerAvailable ? '' : ' missing'}">
      ${installerAvailable ? `<h3 data-i18n="fingerprintHeading">File fingerprint</h3><div class="row"><span class="label" data-i18n="sizeLabel">Size</span><span>${sizePretty}</span></div><div class="row"><span class="label" data-i18n="sha256Label">SHA-256</span><code class="sha">${sha256}</code></div><p data-i18n="fingerprintHint">If the downloaded file size or SHA-256 does not match the values above, delete it and download again.</p>` : `<p data-i18n="missingInstaller">The installer file is not currently available on the server. Please come back in a moment.</p>`}
    </section>

    <footer class="footer"><span class="credit"><img src="${escapeHtml(u.coachUrl)}" alt="" /><span data-i18n="footerCredit">Created by Coach Emad</span></span><span data-i18n="footerVersion">Teacher Desk v1.0</span></footer>
  </div>
  <script>
    (function(){
      var I18N = ${JSON.stringify(i18n)};
      var STORAGE_KEY = 'teacherDesk.lang';
      function pick(){try{var s=localStorage.getItem(STORAGE_KEY);if(s==='ar'||s==='en')return s}catch(e){} var n=(navigator.language||'en').toLowerCase(); return n.indexOf('ar')===0?'ar':'en'}
      function apply(lang){var d=I18N[lang]||I18N.en, html=document.documentElement; html.lang=d.htmlLang; html.dir=d.htmlDir; document.title=d.docTitle;
        document.querySelectorAll('[data-i18n]').forEach(function(n){var k=n.getAttribute('data-i18n'); if(d[k]!=null) n.textContent=d[k]})
        document.querySelectorAll('[data-i18n-html]').forEach(function(n){var k=n.getAttribute('data-i18n-html'); if(d[k]!=null) n.innerHTML=d[k]})
        document.querySelectorAll('[data-i18n-attr]').forEach(function(n){n.getAttribute('data-i18n-attr').split(';').forEach(function(pair){var a=pair.split(':'); if(a.length===2&&d[a[1].trim()]!=null) n.setAttribute(a[0].trim(), d[a[1].trim()])})})
        try{localStorage.setItem(STORAGE_KEY,lang)}catch(e){}
      }
      var current = pick(); apply(current); var btn=document.getElementById('langToggle'); if(btn){btn.onclick=function(){current=current==='ar'?'en':'ar'; apply(current)}}
      var frame=document.getElementById('heroVideo'), fallback=document.getElementById('videoFallback');
      if(frame){ frame.addEventListener('error', function(){ frame.style.display='none'; if(fallback) fallback.style.display='block' }); }
    })();
  </script>
</body>
</html>`;
}

module.exports = { renderDownloadPage, getInstallerInfo, escapeHtml, prettyBytes, DEFAULT_URLS, INSTALLER_FILE, DOWNLOADS_ROOT };
