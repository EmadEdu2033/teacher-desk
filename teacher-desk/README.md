# Teacher Desk

Offline desktop productivity app for online teachers.

- Sticky notes wall (drag, resize, color picker, font size, auto-save) — full mouse + touch support
- Task manager with priorities, due dates, sub-tasks, **category filter**, in-app reminders
- Bilingual EN / AR with full RTL
- Light / Dark themes
- Podium mode — hidden from screen capture (Zoom, Google Meet, OBS)
- Local-only SQLite, backup / restore, system tray

## For end users (Windows)

1. Download **`TeacherDeskSetup.exe`**.
2. Double-click it. Click *Yes* on the Windows security prompt.
3. The setup wizard appears — choose where to install (or accept the default), then click **Install**.
4. When it finishes, click **Finish**. Teacher Desk starts and a shortcut is created on the Desktop and Start Menu.
5. To uninstall later: Windows *Settings → Apps → Teacher Desk → Uninstall*.

No Python, no Node, no manual extraction — a real Windows installer.

## Run locally (developer)

```
npm install
npm start
```

## Build the Windows installer

```
npm run build:win
```

This runs two steps:

1. `npm run build:unpacked` → `electron-builder` produces `dist/win-unpacked/` (the unpacked Electron app).
2. `npm run build:installer` → native `makensis` packages it into `dist/TeacherDeskSetup.exe` using `build/installer.nsi` (an MUI2 wizard with a directory page, Start Menu + Desktop shortcuts, an uninstaller, and Add/Remove Programs registration).

Requires `makensis` on `PATH`:
- Linux: install the `nsis` package (e.g. `apt install nsis`, or `pkgs.nsis` on Nix).
- Windows: install NSIS from https://nsis.sourceforge.io/.

> **Why we shell out to `makensis` directly:** `electron-builder`'s built-in NSIS target invokes `rcedit.exe` through Wine to embed the icon and version metadata into the installer stub. Wine crashes with "Bad system call" inside the Replit Linux sandbox, so we skip electron-builder's NSIS step entirely and call `makensis` ourselves with a hand-written `installer.nsi`. The end result is the same `TeacherDeskSetup.exe` an electron-builder NSIS run would produce, just without the icon-embed step.

## Browser preview (no Electron)

```
PORT=5000 npm run preview
```
Storage falls back to `localStorage`; SQLite & native dialogs are stubbed out.
