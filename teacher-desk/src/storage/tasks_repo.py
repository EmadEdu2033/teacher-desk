import json
from typing import List, Optional, Dict, Any
from .database import get_connection


def _row_to_dict(row) -> Dict[str, Any]:
    d = dict(row)
    d["tags"] = json.loads(d.get("tags", "[]") or "[]")
    d["completed"] = bool(d.get("completed", 0))
    d["archived"] = bool(d.get("archived", 0))
    return d


def get_all_tasks(archived: bool = False, filter_type: str = "all",
                  category: str = None, search: str = None) -> List[Dict]:
    conn = get_connection()
    sql = "SELECT * FROM tasks WHERE archived=?"
    params: list = [1 if archived else 0]

    from datetime import date
    today = date.today().isoformat()

    if filter_type == "today":
        sql += " AND due_date=? AND completed=0"
        params.append(today)
    elif filter_type == "upcoming":
        sql += " AND due_date>? AND completed=0"
        params.append(today)
    elif filter_type == "overdue":
        sql += " AND due_date<? AND completed=0"
        params.append(today)
    elif filter_type == "completed":
        sql += " AND completed=1"
    elif filter_type == "high_priority":
        sql += " AND priority='high' AND completed=0"

    if category:
        sql += " AND category=?"
        params.append(category)

    if search:
        sql += " AND (title LIKE ? OR description LIKE ?)"
        q = f"%{search}%"
        params.extend([q, q])

    sql += " ORDER BY completed ASC, priority DESC, due_date ASC, sort_order ASC, id ASC"
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


def get_task(task_id: int) -> Optional[Dict]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
    conn.close()
    return _row_to_dict(row) if row else None


def create_task(title: str, description: str = "", priority: str = "medium",
                due_date: str = None, category: str = "Personal",
                tags: list = None) -> Dict:
    tags = tags or []
    conn = get_connection()
    max_order = conn.execute("SELECT MAX(sort_order) FROM tasks").fetchone()[0] or 0
    c = conn.execute(
        """INSERT INTO tasks (title, description, priority, due_date, category, tags, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (title, description, priority, due_date, category,
         json.dumps(tags, ensure_ascii=False), max_order + 1)
    )
    task_id = c.lastrowid
    conn.commit()
    row = conn.execute("SELECT * FROM tasks WHERE id=?", (task_id,)).fetchone()
    conn.close()
    return _row_to_dict(row)


def update_task(task_id: int, **kwargs) -> bool:
    if not kwargs:
        return False
    if "tags" in kwargs and isinstance(kwargs["tags"], list):
        kwargs["tags"] = json.dumps(kwargs["tags"], ensure_ascii=False)
    if "completed" in kwargs:
        kwargs["completed"] = 1 if kwargs["completed"] else 0
    if "archived" in kwargs:
        kwargs["archived"] = 1 if kwargs["archived"] else 0
    set_parts = [f"{k}=?" for k in kwargs.keys()]
    set_parts.append("updated_at=datetime('now')")
    values = list(kwargs.values())
    values.append(task_id)
    conn = get_connection()
    conn.execute(f"UPDATE tasks SET {', '.join(set_parts)} WHERE id=?", values)
    conn.commit()
    conn.close()
    return True


def toggle_task_complete(task_id: int) -> bool:
    conn = get_connection()
    row = conn.execute("SELECT completed FROM tasks WHERE id=?", (task_id,)).fetchone()
    if not row:
        conn.close()
        return False
    new_val = 0 if row["completed"] else 1
    conn.execute(
        "UPDATE tasks SET completed=?, updated_at=datetime('now') WHERE id=?",
        (new_val, task_id)
    )
    conn.commit()
    conn.close()
    return bool(new_val)


def delete_task(task_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM subtasks WHERE task_id=?", (task_id,))
    conn.execute("DELETE FROM tasks WHERE id=?", (task_id,))
    conn.commit()
    conn.close()


def get_subtasks(task_id: int) -> List[Dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM subtasks WHERE task_id=? ORDER BY sort_order ASC, id ASC",
        (task_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_subtask(task_id: int, title: str) -> Dict:
    conn = get_connection()
    max_order = conn.execute(
        "SELECT MAX(sort_order) FROM subtasks WHERE task_id=?", (task_id,)
    ).fetchone()[0] or 0
    c = conn.execute(
        "INSERT INTO subtasks (task_id, title, sort_order) VALUES (?, ?, ?)",
        (task_id, title, max_order + 1)
    )
    sub_id = c.lastrowid
    conn.commit()
    row = conn.execute("SELECT * FROM subtasks WHERE id=?", (sub_id,)).fetchone()
    conn.close()
    return dict(row)


def toggle_subtask(subtask_id: int) -> bool:
    conn = get_connection()
    row = conn.execute("SELECT completed FROM subtasks WHERE id=?", (subtask_id,)).fetchone()
    if not row:
        conn.close()
        return False
    new_val = 0 if row["completed"] else 1
    conn.execute("UPDATE subtasks SET completed=? WHERE id=?", (new_val, subtask_id))
    conn.commit()
    conn.close()
    return bool(new_val)


def delete_subtask(subtask_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM subtasks WHERE id=?", (subtask_id,))
    conn.commit()
    conn.close()


def get_categories() -> List[Dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM categories ORDER BY sort_order ASC, name ASC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_category(name: str, color: str = "#6C757D") -> Dict:
    conn = get_connection()
    max_order = conn.execute("SELECT MAX(sort_order) FROM categories").fetchone()[0] or 0
    c = conn.execute(
        "INSERT OR IGNORE INTO categories (name, color, sort_order) VALUES (?, ?, ?)",
        (name, color, max_order + 1)
    )
    conn.commit()
    cat_id = c.lastrowid
    row = conn.execute("SELECT * FROM categories WHERE id=?", (cat_id,)).fetchone()
    conn.close()
    return dict(row) if row else {}
