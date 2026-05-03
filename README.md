<div align="center">

# 📚 Teacher Desk

### The Ultimate Desktop Productivity Workspace for Online Educators

Teacher Desk is a focused Windows desktop workspace built for online teachers, tutors, and remote educators who need a faster, calmer, and more organized way to manage live teaching sessions.

Built by **FutureTeach**.

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Platform: Windows](https://img.shields.io/badge/Platform-Windows-0078D6)
![Built with Electron](https://img.shields.io/badge/Built%20with-Electron-47848F)
![TypeScript 5.9](https://img.shields.io/badge/TypeScript-5.9-3178C6)
![pnpm workspace](https://img.shields.io/badge/pnpm-workspace-F69220)

[Features](#-features) • [Demo](#-see-teacher-desk-in-action) • [Quick Start](#-quick-start) • [Project Structure](#-project-structure) • [Tech Stack](#-tech-stack) • [Contributing](#-contributing)

</div>

---

## ❓ Why Teacher Desk?

Online educators often teach in high-pressure, multitasking environments. Teacher Desk gives them one local, private workspace designed specifically for that reality.

| Challenge teachers face | How Teacher Desk helps |
| --- | --- |
| Notes are scattered across apps, papers, and chats | A visual **Sticky Notes Wall** keeps everything in one place |
| Tasks and follow-ups get forgotten between lessons | A **Smart Task Manager** tracks deadlines, subtasks, and reminders |
| Teachers need private content hidden from screen sharing | **Podium Mode** protects private workspace content during live sessions |
| Many tools are cloud-dependent or privacy-invasive | **Local-first storage** keeps data on-device with backup and restore |

---

## 🚀 Features

### 📝 Sticky Notes Wall
A flexible visual workspace for quick teaching notes and live session planning.

- Drag and resize notes freely
- Color-code content for fast scanning
- Adjust note font size per widget
- Auto-save changes locally

### ✅ Smart Task Manager
A built-in task system designed for teaching workflows, prep, and follow-up.

- Priorities and due dates
- Subtasks for lesson prep and admin work
- Reminder support
- Category-based organization

### 🎭 Podium Mode
Keep your private teacher workspace out of student view during live sessions.

- Helps hide content from OBS, Zoom, Teams, and similar capture workflows
- One-click toggle behavior
- Designed for real-world screen-sharing scenarios

### 🌐 Multilingual UI
Built for teachers working in multilingual environments.

- English and Arabic support
- Full RTL handling for Arabic
- Practical educator-first interface copy

### 💾 Privacy-First Storage
Your teaching workspace stays yours.

- SQLite local storage
- Local backup and restore flows
- No mandatory cloud dependency

### 🎨 Theming
A workspace that stays usable for long teaching sessions.

- Light and dark themes
- Per-widget visual customization
- Color choices that support categorization and focus

---

## ✨ See Teacher Desk in Action

<div align="center">

[![Watch the demo video](https://img.shields.io/badge/Watch-Demo%20Video-blue?style=for-the-badge)](https://github.com/user-attachments/assets/00fba191-49d7-412c-b7e5-d614f75403f1)

[Download the full demo video](./demo/teacher-desk-demo.mp4)

</div>

---

## ⚡ Quick Start

### For End Users (Windows)

1. Go to the repository **Releases** page.
2. Download the latest Windows installer.
3. Run the installer.
4. Launch **Teacher Desk** from the Desktop or Start Menu.

### For Developers

#### Prerequisites

- Node.js **22+**
- pnpm **9+**
- Windows recommended for the Electron desktop workflow

#### Windows setup

```powershell
nvm install 22
nvm use 22
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

#### Run locally

```bash
cd teacher-desk
pnpm install
pnpm start
```

#### Browser preview

```bash
PORT=5000 pnpm run preview
```

---

## 🛠️ Build Instructions

### Development build

```bash
cd teacher-desk
pnpm install
pnpm run build:unpacked
```

### Signed production build

```bash
cd teacher-desk
WIN_CSC_KEY_PASSWORD=<your-pfx-password> pnpm run build:win
```

### Skip signing for development

```bash
cd teacher-desk
TEACHER_DESK_SKIP_SIGN=1 pnpm run build:win
```

### Environment Variables

| Variable | Purpose |
| --- | --- |
| `WIN_CSC_KEY_PASSWORD` | Password for the Windows code-signing certificate |
| `WIN_CSC_LINK` | Optional override path for the `.pfx` certificate |
| `TEACHER_DESK_SKIP_SIGN` | Skip signing during development builds |
| `PORT` | Browser preview port, defaults to `5000` |

---

## 🗂️ Project Structure

```text
teacher-desk/
├── teacher-desk/
│   ├── src/
│   ├── scripts/
│   ├── main.js
│   ├── preload.js
│   ├── renderer/
│   └── package.json
├── lib/
├── artifacts/
│   ├── teacher-desk-landing/
│   └── teacher-desk-marketing-video/
├── demo/
├── scripts/
├── package.json
└── pnpm-workspace.yaml
```

---

## 🧱 Tech Stack

| Technology | Purpose |
| --- | --- |
| Electron | Windows desktop application shell |
| TypeScript 5.9 | Type-safe tooling and shared packages |
| SQLite | Local-first persistent storage |
| Vite | Fast frontend and artifact workflows |
| pnpm Workspaces | Monorepo and dependency management |

---

## 🛣️ Roadmap

### Completed

- [x] Sticky notes workspace
- [x] Smart task manager with subtasks
- [x] Local SQLite persistence
- [x] Backup and restore support
- [x] Arabic + English multilingual UI
- [x] Podium mode for screen-share privacy

### Upcoming

- [ ] macOS and Linux support
- [ ] Plugin system
- [ ] Voice notes
- [ ] Student roster tools
- [ ] Lesson templates
- [ ] Cloud sync

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes with clear messages
4. Push your branch to GitHub
5. Open a Pull Request with context and screenshots where relevant

---

## ⚠️ Known Issues

- Windows-only tray behavior is currently the primary supported desktop experience
- Screen capture protection can vary depending on the broadcasting or meeting tool
- High-DPI scaling behavior may vary slightly across devices and display settings

---

## 🆘 Support

- Open a bug report or feature request in [GitHub Issues](https://github.com/EmadEdu2033/teacher-desk/issues)
- Use [GitHub Discussions](https://github.com/EmadEdu2033/teacher-desk/discussions) for broader ideas and product conversations

---

<div align="center">

**Made with ❤️ for Teachers, by Teachers**

**Built by FutureTeach · Empowering educators worldwide**

[Back to Top](#-teacher-desk)

</div>
