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

- `teacher-desk/` → Electron desktop application
- `artifacts/teacher-desk-landing/` → landing / distribution artifact
- `artifacts/teacher-desk-marketing-video/` → marketing video artifact
- `lib/` → shared packages
- `scripts/` → workspace utility scripts

## Demo Video

A recorded demo is available locally on the development machine at:

```text
C:\Users\Ahmed\Downloads\Data-Extractor-May-2-23-30-50.mp4
```

Recommended ways to present it professionally:

- Use it as the primary walkthrough when pitching the app
- Export a short teaser from it for social posts or landing pages
- Capture 2 to 4 screenshots from the clearest moments and place them in the README later under a `Screenshots` section

If you want this video showcased directly from the repository, the clean approach is:

1. Upload the MP4 to a release asset, cloud storage, or YouTube as unlisted
2. Add a thumbnail image to the repo
3. Link the thumbnail in this README

Example:

```md
[![Watch the demo](./docs/assets/teacher-desk-demo-thumb.png)](https://your-video-link)
```

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
