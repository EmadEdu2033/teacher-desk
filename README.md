# Teacher Desk

Teacher Desk is a desktop productivity workspace for online teachers who need fast access to notes, tasks, reminders, and a private podium that stays out of screen sharing.

It is designed for real teaching sessions, not generic note-taking.

## Highlights

- Sticky notes wall with drag, resize, colors, font size, and auto-save
- Task manager with priorities, due dates, subtasks, reminders, and categories
- English and Arabic UI with RTL support
- Light and dark themes
- Podium mode hidden from screen capture tools
- Local-first SQLite storage with backup and restore
- System tray support for Windows

## Repository Structure

This repository is a workspace. The main desktop app lives here:

```text
teacher-desk/
```

Useful folders:

- `teacher-desk/` â†’ Electron desktop application
- `artifacts/teacher-desk-landing/` â†’ landing / distribution artifact
- `artifacts/teacher-desk-marketing-video/` â†’ marketing video artifact
- `lib/` â†’ shared packages
- `scripts/` â†’ workspace utility scripts

## Demo Video

A recorded demo is included in this repository:

- [Download / watch the demo video](./demo/teacher-desk-demo.mp4)

Local source used for publishing:

`	ext
C:\\Users\\Ahmed\\Downloads\\Data-Extractor-May-2-23-30-50.mp4
` 

For a more polished presentation later, we can add a thumbnail image that links to this file or move it to a GitHub Release asset.

## Running the Project Locally

### Option 1: Run the desktop app with Electron

From the app folder:

```bash
cd teacher-desk
pnpm install
pnpm start
```

### Option 2: Run browser preview

From the workspace root:

```bash
PORT=5000 pnpm run preview
```

Default preview port:

- `5000`

## Windows Setup Notes

On Windows, this project is easiest to run with:

- `nvm-windows`
- Node `22`
- `pnpm` via `corepack`

Recommended setup:

```powershell
nvm install 22
nvm use 22
corepack enable
corepack prepare pnpm@latest --activate
```

Then install dependencies.

## Build Instructions

### Build the desktop app

```bash
cd teacher-desk
pnpm install
pnpm run build:unpacked
```

### Build the signed Windows package

```bash
WIN_CSC_KEY_PASSWORD=<your-pfx-password> pnpm run build:win
```

This flow produces:

- unpacked Electron app
- signed executable
- Windows installer
- signed installer

## End User Installation (Windows)

1. Download `TeacherDeskSetup.exe`
2. Run the installer
3. Approve the UAC prompt
4. Complete setup
5. Launch Teacher Desk from Desktop or Start Menu

## Security and Signing

Production builds are designed to support code signing.

Important environment variables:

- `WIN_CSC_KEY_PASSWORD`
- `WIN_CSC_LINK` (optional)
- `TEACHER_DESK_SKIP_SIGN=1` for unsigned dev builds

## Recommended Next README Improvements

To make this repository look even more professional, the next best additions are:

- App screenshots
- Feature GIFs
- A short architecture diagram
- Known limitations / roadmap
- Release downloads badge

## License

MIT

