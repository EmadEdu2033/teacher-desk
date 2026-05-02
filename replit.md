# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Teacher Desk — Electron Desktop App

A fully offline Windows desktop productivity app for online teachers.
Located in `teacher-desk/` — **standalone npm project, NOT part of the pnpm workspace**.

### Stack
- **Runtime**: Electron 33 (Chromium + Node)
- **UI**: Vanilla HTML / CSS / ES modules (no framework)
- **Database**: SQLite via `better-sqlite3` 11
- **Packaging**: `electron-builder` 25 (unpack only) + native `makensis` → `dist/TeacherDeskSetup.exe`
- **Storage location** (on user's machine): `%APPDATA%\Teacher Desk\teacher-desk.db`

### Features
- Sticky notes wall: drag, resize, color picker (chosen *before* creating), font size (small/medium/large), auto-save, pan/fit/reset, context menu — works with mouse and touch (Pointer Events)
- Tasks: priority, due date/time, sub-tasks, **category filter**, in-app reminders (20s polling, WebAudio beep + system notification)
- Bilingual EN / AR with full RTL switching at runtime — every confirm dialog and placeholder is translated
- Light / Dark themes
- **Podium mode**: Electron's `setContentProtection(true)` hides the window from screen-share / OBS
- Backup / restore (export+import full DB via native dialog)
- **Automatic daily backups**: on app launch, snapshots `teacher-desk.db` to `%APPDATA%\Teacher Desk\backups\teacher-desk-YYYY-MM-DD.db` if today's snapshot is missing; keeps the 7 most recent. Settings tab shows the folder path and a per-snapshot "Restore" button (a `prerestore` safety copy of the live DB is taken first, last 3 retained).
- System tray integration

### Architecture
```
teacher-desk/
├── main.js                  # Electron main: BrowserWindow, IPC, SQLite, Tray, Notification, dialog
├── preload.js               # contextBridge: window.td.{notes,tasks,settings,backup,podium,notify}
├── renderer/
│   ├── index.html           # Single-page shell (CSP-protected)
│   ├── css/styles.css       # Themes + RTL
│   └── js/
│       ├── app.js           # Bootstrap, view switching
│       ├── i18n.js          # EN/AR strings + dir flip
│       ├── storage.js       # window.td adapter; localStorage fallback for browser preview
│       ├── notes.js         # Wall canvas, drag/resize/color picker
│       ├── tasks.js         # Task editor modal, reminder loop
│       └── settings.js      # Theme, language, backup/restore, data folder
├── build/icon.png           # 512×512 app icon
├── scripts/preview-server.js # Tiny HTTP server for browser preview (binds PORT)
└── package.json             # electron-builder config in "build" field
```

### IPC channels (preload → main)
- `notes:{list,create,update,delete,bringToFront}`
- `tasks:{list,create,update,delete}`
- `settings:{get,set}`
- `podium:set`, `notify`, `backup:{export,import,listAuto,restoreAuto,openAutoFolder}`, `app:openDataFolder`

### Running locally (developer)
```bash
cd teacher-desk
npm install
npm start          # launches Electron
npm run preview    # browser-only preview on $PORT (uses localStorage fallback)
npm run build:win  # produces dist/TeacherDeskSetup.exe (NSIS installer)
```

### Distribution
The end-user downloads `TeacherDeskSetup.exe` (~76 MB) and double-clicks it. The MUI2 wizard lets them pick the install folder, then it deploys the app, creates Desktop + Start Menu shortcuts, registers an uninstaller in *Add/Remove Programs*, and launches Teacher Desk. No Python, no Node, no extraction.

> **How the installer is built in this sandbox.** `electron-builder`'s NSIS target on Linux invokes `rcedit.exe` through Wine to embed the icon and version metadata into the installer stub. Wine crashes with "Bad system call" inside the Replit sandbox. We work around it by splitting the build in two: `electron-builder --win` produces only `dist/win-unpacked/` (no NSIS), and then `scripts/make-installer.js` shells out to native `makensis` against `build/installer.nsi` to produce `dist/TeacherDeskSetup.exe`. The result is a real PE32 NSIS self-extracting installer, identical in shape to what electron-builder's NSIS target would emit.

### Code-signing
`build:win` Authenticode-signs both `Teacher Desk.exe` (inside `win-unpacked`) and the final `TeacherDeskSetup.exe`. Signing uses `osslsigncode` (cross-platform, Linux-friendly — no `signtool.exe` or Wine required) via `scripts/sign.js`, which reads `build.win.certificateFile` / `publisherName` from `package.json` and the cert password from the `WIN_CSC_KEY_PASSWORD` env var. A self-signed dev cert can be generated via `npm run cert:dev` (verifies the pipeline; does NOT remove SmartScreen warnings — only a real CA-issued cert does). The `.pfx` file is gitignored. See `teacher-desk/README.md` "Code-signing" for full details.

## Teacher Desk — Marketing Video (Arabic)

A short Arabic-language motion-graphics promo for Teacher Desk, built as a
video-js artifact. Lives at `artifacts/teacher-desk-marketing-video/`.

- **Runtime**: React + Vite + Framer Motion (video-js scaffold)
- **Length**: ~36s, 16:9, autoplay + loop, RTL, Alexandria font
- **Scenes** (`src/components/video/video_scenes/Scene{1..6}.tsx`):
  1. Open — chalkboard brand mark draws in over the word "للمعلم"
  2. Kinetic — vertical-roller carousel cycles "ملاحظات / مهام / منصة / تركيز"
  3. Notes — recreated topbar, "+ ملاحظة جديدة" click, yellow note types out, eye-with-strikethrough privacy beat
  4. Podium — split view: teacher sees notes, Zoom/Meet pane shows blackbox
  5. Tasks — calm shot of recreated tasks board with priority chip
  6. Close — Coach Emad portrait + "Coach Emad" Latin lockup + "Presented and created by Coach Emad"
- **Brand assets** staged in `public/brand/` (coach-emad.jpg, icon.svg) and
  `src/assets/fonts/alexandria-arabic.woff2` (Vite-rewritten relative URL so
  the font loads under any base path).
- **Composition**: `VideoTemplate.tsx` renders the active scene inside a hard
  16:9 aspect-ratio frame (no UI chrome, no preview controls) so the exported
  video keeps its framing under any viewport size.
- **Export**: standard video-js export pipeline (`bash scripts/validate-recording.sh`
  must pass; user records the looping preview into `.mp4`/`.webm`).
- **Out of scope**: audio/voice-over (video-js is silent by design), real
  screen recording of the signed `.exe` (Wine is blocked in the sandbox).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
