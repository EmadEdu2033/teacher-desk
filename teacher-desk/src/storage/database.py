import sqlite3
import os
import sys
import json
import shutil
from pathlib import Path


def get_data_dir() -> Path:
    if getattr(sys, 'frozen', False):
        exe_dir = Path(sys.executable).parent
        data_dir = exe_dir / "TeacherDeskData"
    else:
        data_dir = Path(__file__).parent.parent.parent / "data"
    try:
        data_dir.mkdir(parents=True, exist_ok=True)
        test_file = data_dir / ".write_test"
        test_file.write_text("ok")
        test_file.unlink()
        return data_dir
    except (OSError, PermissionError):
        fallback = Path.home() / "AppData" / "Local" / "TeacherDesk"
        fallback.mkdir(parents=True, exist_ok=True)
        return fallback


DATA_DIR = get_data_dir()
DB_PATH = DATA_DIR / "teacher_desk.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_connection()
    c = conn.cursor()

    c.executescript("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL DEFAULT '',
            body TEXT NOT NULL DEFAULT '',
            color TEXT NOT NULL DEFAULT '#FFE066',
            x REAL NOT NULL DEFAULT 100,
            y REAL NOT NULL DEFAULT 100,
            width REAL NOT NULL DEFAULT 220,
            height REAL NOT NULL DEFAULT 180,
            pinned INTEGER NOT NULL DEFAULT 0,
            archived INTEGER NOT NULL DEFAULT 0,
            tags TEXT NOT NULL DEFAULT '[]',
            z_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            priority TEXT NOT NULL DEFAULT 'medium',
            due_date TEXT,
            status TEXT NOT NULL DEFAULT 'pending',
            category TEXT NOT NULL DEFAULT 'Personal',
            tags TEXT NOT NULL DEFAULT '[]',
            completed INTEGER NOT NULL DEFAULT 0,
            archived INTEGER NOT NULL DEFAULT 0,
            linked_note_id INTEGER,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (linked_note_id) REFERENCES notes(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS subtasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            completed INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            color TEXT NOT NULL DEFAULT '#6C757D',
            sort_order INTEGER NOT NULL DEFAULT 0
        );
    """)

    defaults = [
        ("theme", "light"),
        ("language", "en"),
        ("last_view", "wall"),
        ("wall_scroll_x", "0"),
        ("wall_scroll_y", "0"),
    ]
    for key, value in defaults:
        c.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, value))

    default_categories = [
        ("Lessons", "#4A90D9", 1),
        ("Students", "#7ED957", 2),
        ("Meetings", "#F5A623", 3),
        ("Admin", "#9B59B6", 4),
        ("Personal", "#E74C3C", 5),
    ]
    for name, color, order in default_categories:
        c.execute("INSERT OR IGNORE INTO categories (name, color, sort_order) VALUES (?, ?, ?)", (name, color, order))

    conn.commit()
    conn.close()


def get_setting(key: str, default=None):
    conn = get_connection()
    row = conn.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    conn.close()
    if row:
        return row["value"]
    return default


def set_setting(key: str, value: str):
    conn = get_connection()
    conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, str(value)))
    conn.commit()
    conn.close()


def export_backup(dest_path: str):
    shutil.copy2(str(DB_PATH), dest_path)


def import_backup(src_path: str):
    conn = sqlite3.connect(src_path)
    conn.close()
    shutil.copy2(src_path, str(DB_PATH))


def reset_data():
    conn = get_connection()
    conn.execute("DELETE FROM subtasks")
    conn.execute("DELETE FROM tasks")
    conn.execute("DELETE FROM notes")
    conn.commit()
    conn.close()
