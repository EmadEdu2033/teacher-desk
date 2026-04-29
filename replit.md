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
- **Packaging**: `electron-builder` 25 → `dist/TeacherDesk-Windows.zip`
- **Storage location** (on user's machine): `%APPDATA%\Teacher Desk\teacher-desk.db`

### Features
- Sticky notes wall: drag, resize, color picker (chosen *before* creating), auto-save, pan/fit/reset, context menu
- Tasks: priority, due date/time, sub-tasks, in-app reminders (20s polling, WebAudio beep + system notification)
- Bilingual EN / AR with full RTL switching at runtime
- Light / Dark themes
- **Podium mode**: Electron's `setContentProtection(true)` hides the window from screen-share / OBS
- Backup / restore (export+import full DB via native dialog)
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
- `podium:set`, `notify`, `backup:{export,import}`, `app:openDataFolder`

### Running locally (developer)
```bash
cd teacher-desk
npm install
npm start          # launches Electron
npm run preview    # browser-only preview on $PORT (uses localStorage fallback)
npm run build:win  # produces dist/TeacherDesk-Windows.zip
```

### Distribution
The end-user downloads `TeacherDesk-Windows.zip` (~112 MB), extracts it, and double-clicks `Teacher Desk.exe` inside. No installer wizard, no Python, no Node — extract and run.

> **Why ZIP and not `TeacherDeskSetup.exe`?** The original plan was an NSIS installer. electron-builder's NSIS target on Linux requires `wine` to run `rcedit.exe` for embedding the icon and version metadata into the installer stub. Wine crashes with "Bad system call" inside the Replit sandbox (the kernel blocks syscalls wine needs). A ZIP of the unpacked app is functionally equivalent for the user — the same `Teacher Desk.exe` runs from inside the extracted folder. To produce a real `TeacherDeskSetup.exe`, run `npm run build:win` on a Windows machine or any Linux box where wine works.

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
