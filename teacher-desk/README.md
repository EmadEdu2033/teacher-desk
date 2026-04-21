# Teacher Desk

A lightweight, fully offline Windows desktop productivity app for online teachers.

## Features

- **Sticky Notes Wall** — drag and place notes freely, resize, color-code, pin, archive
- **Task Manager** — priorities, due dates, categories, subtasks, filters
- **Bilingual** — full English and Arabic support with RTL layout
- **Light & Dark themes**
- **Auto-save** — everything persists automatically via SQLite
- **Backup / Import / Export** — local data safety
- **No login, no internet, no cloud**

## Requirements

- **Python 3.11+**
- Standard library only (`tkinter`, `sqlite3` are built-in)
- No third-party runtime dependencies

## Running Directly

```batch
# Windows
run.bat

# Or directly
python src/main.py
```

## Building the Windows .exe

### Prerequisites
- Python 3.11+ on Windows with `pip`
- Run:

```batch
build_windows.bat
```

The portable `.exe` will appear in `release\TeacherDesk.exe`.

### Manual Build

```batch
pip install pyinstaller
pyinstaller teacher_desk.spec --clean --noconfirm
```

Output: `dist\TeacherDesk.exe`

## Portable Distribution

Copy `TeacherDesk.exe` anywhere. On first launch, a `TeacherDeskData\` folder
is created next to the `.exe` holding the SQLite database. If that location is
read-only (e.g. Program Files), it falls back to:
`%LOCALAPPDATA%\TeacherDesk\`

## Data Location

| Scenario | Data Location |
|---|---|
| Portable (exe in writable folder) | `TeacherDeskData\` beside the exe |
| Read-only install location | `%LOCALAPPDATA%\TeacherDesk\` |
| Development (running with Python) | `data\` beside the project root |

## Project Structure

```
teacher-desk/
├── src/
│   ├── main.py              # App entry point
│   ├── ui/
│   │   ├── sidebar.py       # Navigation sidebar
│   │   ├── toolbar.py       # Top toolbar
│   │   ├── wall_canvas.py   # Sticky notes wall
│   │   ├── note_editor.py   # Note create/edit dialog
│   │   ├── task_view.py     # Task manager view
│   │   ├── archive_view.py  # Archive view
│   │   └── settings_view.py # Settings view
│   ├── storage/
│   │   ├── database.py      # SQLite init, backup, reset
│   │   ├── notes_repo.py    # Note CRUD operations
│   │   └── tasks_repo.py    # Task CRUD operations
│   ├── i18n/
│   │   └── translations.py  # English + Arabic strings
│   └── utils/
│       └── theme.py         # Light/dark theme colors
├── requirements.txt         # PyInstaller only
├── teacher_desk.spec        # PyInstaller spec
├── build_windows.bat        # One-click Windows build
└── run.bat                  # Quick dev run
```

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Enter` | Save note (in editor) |
| `Escape` | Close dialog |
| `Enter` | Add quick task |
| `Double-click` note | Open note editor |
| `Right-click` note | Context menu (pin, color, archive, delete) |

## Categories (default)

- Lessons
- Students  
- Meetings
- Admin
- Personal

## Notes on Arabic Support

- Language can be switched at any time in Settings or via the toolbar toggle
- Arabic text input works in all text fields
- RTL alignment is applied in Arabic mode
- Mixed Arabic/English content in notes is handled correctly
