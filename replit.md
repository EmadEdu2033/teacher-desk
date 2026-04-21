# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Teacher Desk — Python Desktop App

A fully offline Windows desktop productivity app for online teachers.
Located in `teacher-desk/`.

### Stack
- **Language**: Python 3.11
- **UI**: Tkinter (standard library)
- **Database**: SQLite (standard library)
- **Packaging**: PyInstaller (produces portable Windows .exe)

### Running
```bash
# From teacher-desk/ directory
python3 src/main.py
```

### Building Windows .exe
```batch
# On a Windows machine with Python 3.11+
build_windows.bat
```

### Project Structure
```
teacher-desk/
├── src/
│   ├── main.py              # App entry point + shell
│   ├── ui/                  # All GUI components
│   │   ├── sidebar.py       # Left navigation
│   │   ├── toolbar.py       # Top toolbar
│   │   ├── wall_canvas.py   # Sticky notes wall (drag/drop)
│   │   ├── note_editor.py   # Note create/edit dialog
│   │   ├── task_view.py     # Task manager
│   │   ├── archive_view.py  # Archive browser
│   │   └── settings_view.py # Settings, theme, backup
│   ├── storage/             # SQLite persistence layer
│   ├── i18n/                # English + Arabic translations
│   └── utils/               # Theme colors
├── teacher_desk.spec        # PyInstaller spec
├── build_windows.bat        # One-click build script
└── README.md
```

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
