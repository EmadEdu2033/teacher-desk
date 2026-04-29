# Teacher Desk

Offline desktop productivity app for online teachers.

- Sticky notes wall (drag, resize, color picker, auto-save)
- Task manager with priorities, due dates, sub-tasks, in-app reminders
- Bilingual EN / AR with full RTL
- Light / Dark themes
- Podium mode — hidden from screen capture (Zoom, Google Meet, OBS)
- Local-only SQLite, backup / restore, system tray

## For end users (Windows)

1. Download `TeacherDesk-Windows.zip`.
2. Right-click the zip → **Extract All…** to a folder of your choice (Desktop is fine).
3. Open the extracted folder and double-click **`Teacher Desk.exe`**.
4. To start the app every day, just double-click the same `Teacher Desk.exe`. You can right-click it and choose *Pin to taskbar* or *Send to → Desktop (create shortcut)* for one-click access.

No Python, no Node, no installer wizard — extract and run.

## Run locally (developer)

```
npm install
npm start
```

## Build the Windows package

```
npm run build:win
```
Produces `dist/TeacherDesk-Windows.zip` (the unpacked `dist/win-unpacked/` directory zipped up).

> **Why a ZIP instead of an NSIS installer?** Building the NSIS installer wrapper requires `wine` (electron-builder runs `rcedit.exe` under wine to embed the icon and metadata into the installer stub). The Replit Linux sandbox blocks the syscalls wine needs, so we ship the unpacked app inside a ZIP instead. The end-user experience is the same — extract the folder and run `Teacher Desk.exe`. To produce a true NSIS installer, run `npm run build:win` on a Windows machine or a Linux box with wine.

## Browser preview (no Electron)

```
PORT=5000 npm run preview
```
Storage falls back to `localStorage`; SQLite & native dialogs are stubbed out.
