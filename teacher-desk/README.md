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
2. Double-click it. Windows' User Account Control prompt will appear showing
   **Verified publisher: Teacher Desk** (in blue, not the orange "Unknown
   publisher" warning). Click *Yes* to continue.
3. The setup wizard appears — choose where to install (or accept the default), then click **Install**.
4. When it finishes, click **Finish**. Teacher Desk starts and a shortcut is created on the Desktop and Start Menu.
5. To uninstall later: Windows *Settings → Apps → Teacher Desk → Uninstall*.

No Python, no Node, no manual extraction — a real Windows installer.

### How do I know this is safe?

`TeacherDeskSetup.exe` (and the `Teacher Desk.exe` it installs) are digitally
signed with a code-signing certificate issued to **Teacher Desk**. You can
verify the signature yourself before running it:

1. Right-click **`TeacherDeskSetup.exe`** → **Properties**.
2. Open the **Digital Signatures** tab. You should see one entry, *Teacher
   Desk*, with a timestamp.
3. Select that row → **Details**. The dialog should report
   *"This digital signature is OK"* and list the issuing certificate authority.
4. Click **View Certificate** to see the full certificate chain up to a
   trusted root CA.

If the *Digital Signatures* tab is missing, or the signature shows as invalid,
**do not run the installer** — the file has been tampered with or is a
counterfeit. Re-download it from the official source.

## Run locally (developer)

```
npm install
npm start
```

## Build the Windows installer

```
WIN_CSC_KEY_PASSWORD=<your-pfx-password> npm run build:win
```

This runs four steps:

1. `npm run build:unpacked` → `electron-builder` produces `dist/win-unpacked/` (the unpacked Electron app).
2. `npm run sign:exe` → code-signs `dist/win-unpacked/Teacher Desk.exe`.
3. `npm run build:installer` → native `makensis` packages the (now-signed) app into `dist/TeacherDeskSetup.exe` using `build/installer.nsi` (an MUI2 wizard with a directory page, Start Menu + Desktop shortcuts, an uninstaller, and Add/Remove Programs registration).
4. `npm run sign:installer` → code-signs `dist/TeacherDeskSetup.exe`.

Requires `makensis` and `osslsigncode` on `PATH`:
- Linux: install the `nsis` and `osslsigncode` packages (e.g. `apt install nsis osslsigncode`, or `pkgs.nsis` + `pkgs.osslsigncode` on Nix — both already in `replit.nix`).
- Windows: install NSIS from https://nsis.sourceforge.io/. (You can also sign with `signtool.exe` from the Windows SDK on Windows.)

> **Why we shell out to `makensis` directly:** `electron-builder`'s built-in NSIS target invokes `rcedit.exe` through Wine to embed the icon and version metadata into the installer stub. Wine crashes with "Bad system call" inside the Replit Linux sandbox, so we skip electron-builder's NSIS step entirely and call `makensis` ourselves with a hand-written `installer.nsi`. The end result is the same `TeacherDeskSetup.exe` an electron-builder NSIS run would produce, just without the icon-embed step.

## Cut a new release

```
WIN_CSC_KEY_PASSWORD=<your-pfx-password> npm run release -- patch
# or: minor, major, or an explicit version like 1.4.0
```

`npm run release` is a one-shot wrapper around the steps above. It will:

1. Bump the `version` field in `teacher-desk/package.json` (`patch`, `minor`, `major`, or an explicit `X.Y.Z`).
2. Read commits in `teacher-desk/` since the previous `v*` tag and prepend a new dated section to `CHANGELOG.md`.
3. Run `npm run build:win`, which bakes the new version into `TeacherDeskSetup.exe` (right-click → *Properties → Details → File version* will match `package.json`) and signs both binaries.
4. Commit the version bump + changelog and create an annotated git tag like `v1.0.1`. Push with `git push && git push --tags`.

Useful flags:

- `--dry-run` — print what would happen, change nothing.
- `--no-build` — skip the Windows build (handy on machines without `makensis` / `osslsigncode`).
- `--no-git` — bump and write the changelog but don't commit or tag.
- `--yes` / `-y` — skip the interactive confirmation prompt.

If the build is **not** skipped, either `WIN_CSC_KEY_PASSWORD` must be set or `TEACHER_DESK_SKIP_SIGN=1` must be exported (for unsigned dev builds).

## Code-signing (removes the Windows SmartScreen "Unknown publisher" warning)

Both `Teacher Desk.exe` and `TeacherDeskSetup.exe` are signed during `build:win`
using `osslsigncode` (a cross-platform Authenticode signer that works on Linux
without requiring `signtool.exe` or Wine).

**Configuration** lives in `package.json` → `build.win`:

| Field                 | Purpose                                                         |
| --------------------- | --------------------------------------------------------------- |
| `certificateFile`     | Path to the `.pfx` (PKCS#12) cert file. Default: `build/cert.pfx`. |
| `certificatePassword` | Documents the env var name (`WIN_CSC_KEY_PASSWORD`) — never store the actual password here. |
| `publisherName`       | Subject name shown in Windows' UAC / SmartScreen dialog.        |

**Required env var:**
- `WIN_CSC_KEY_PASSWORD` — password protecting your `.pfx` file.

**Optional env var:**
- `WIN_CSC_LINK` — overrides `certificateFile` (e.g. point at a CI secret path).
- `TEACHER_DESK_SKIP_SIGN=1` — let the build succeed even when no cert is present (handy for unsigned dev builds).

### Production: a real CA-issued certificate

To actually remove the SmartScreen warning for end users, you need a code-signing
certificate from a public CA (DigiCert, Sectigo, SSL.com, etc.):

- **OV (Organization Validation)** — cheaper, but new certs build "reputation"
  over downloads before SmartScreen stops warning users.
- **EV (Extended Validation)** — more expensive and requires a hardware token,
  but removes the SmartScreen warning **immediately** on the first download.

Once you have the `.pfx`, drop it at `teacher-desk/build/cert.pfx` (or set
`WIN_CSC_LINK`), set `WIN_CSC_KEY_PASSWORD`, and run `npm run build:win`. The
`.pfx` is gitignored so the private key never gets committed.

### Local / dev: self-signed certificate

For verifying the signing pipeline locally (does **not** remove SmartScreen,
because the cert isn't trusted by Windows):

```
npm run cert:dev                     # writes build/cert.pfx (password: teacherdesk)
WIN_CSC_KEY_PASSWORD=teacherdesk npm run build:win
```

After signing, the embedded signature can be inspected on Windows via
right-click → **Properties → Digital Signatures**, or on Linux with
`osslsigncode verify -in dist/TeacherDeskSetup.exe`.

See https://www.electron.build/code-signing for additional CA recommendations.

## Browser preview (no Electron)

```
PORT=5000 npm run preview
```
Storage falls back to `localStorage`; SQLite & native dialogs are stubbed out.
