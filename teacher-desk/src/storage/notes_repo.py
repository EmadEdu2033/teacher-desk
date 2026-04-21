import json
from typing import List, Optional, Dict, Any
from .database import get_connection


def _row_to_dict(row) -> Dict[str, Any]:
    d = dict(row)
    d["tags"] = json.loads(d.get("tags", "[]") or "[]")
    d["pinned"] = bool(d.get("pinned", 0))
    d["archived"] = bool(d.get("archived", 0))
    return d


def get_all_notes(archived: bool = False) -> List[Dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM notes WHERE archived=? ORDER BY pinned DESC, z_order ASC, id ASC",
        (1 if archived else 0,)
    ).fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]


def get_note(note_id: int) -> Optional[Dict]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM notes WHERE id=?", (note_id,)).fetchone()
    conn.close()
    return _row_to_dict(row) if row else None


def create_note(title="", body="", color="#FFE066", x=100.0, y=100.0,
                width=220.0, height=180.0) -> Dict:
    conn = get_connection()
    max_z = conn.execute("SELECT MAX(z_order) FROM notes").fetchone()[0] or 0
    c = conn.execute(
        """INSERT INTO notes (title, body, color, x, y, width, height, z_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (title, body, color, x, y, width, height, max_z + 1)
    )
    note_id = c.lastrowid
    conn.commit()
    row = conn.execute("SELECT * FROM notes WHERE id=?", (note_id,)).fetchone()
    conn.close()
    return _row_to_dict(row)


def update_note(note_id: int, **kwargs) -> bool:
    if not kwargs:
        return False
    if "tags" in kwargs and isinstance(kwargs["tags"], list):
        kwargs["tags"] = json.dumps(kwargs["tags"], ensure_ascii=False)
    if "pinned" in kwargs:
        kwargs["pinned"] = 1 if kwargs["pinned"] else 0
    if "archived" in kwargs:
        kwargs["archived"] = 1 if kwargs["archived"] else 0
    kwargs["updated_at"] = "datetime('now')"
    set_clause = ", ".join(
        f"{k}=datetime('now')" if v == "datetime('now')" else f"{k}=?"
        for k, v in kwargs.items()
    )
    values = [v for v in kwargs.values() if v != "datetime('now')"]
    values.append(note_id)
    conn = get_connection()
    conn.execute(f"UPDATE notes SET {set_clause} WHERE id=?", values)
    conn.commit()
    conn.close()
    return True


def update_note_position(note_id: int, x: float, y: float):
    conn = get_connection()
    conn.execute(
        "UPDATE notes SET x=?, y=?, updated_at=datetime('now') WHERE id=?",
        (x, y, note_id)
    )
    conn.commit()
    conn.close()


def update_note_size(note_id: int, width: float, height: float):
    conn = get_connection()
    conn.execute(
        "UPDATE notes SET width=?, height=?, updated_at=datetime('now') WHERE id=?",
        (width, height, note_id)
    )
    conn.commit()
    conn.close()


def bring_to_front(note_id: int):
    conn = get_connection()
    max_z = conn.execute("SELECT MAX(z_order) FROM notes WHERE archived=0").fetchone()[0] or 0
    conn.execute("UPDATE notes SET z_order=? WHERE id=?", (max_z + 1, note_id))
    conn.commit()
    conn.close()


def delete_note(note_id: int):
    conn = get_connection()
    conn.execute("DELETE FROM notes WHERE id=?", (note_id,))
    conn.commit()
    conn.close()


def duplicate_note(note_id: int) -> Optional[Dict]:
    note = get_note(note_id)
    if not note:
        return None
    return create_note(
        title=note["title"],
        body=note["body"],
        color=note["color"],
        x=note["x"] + 30,
        y=note["y"] + 30,
        width=note["width"],
        height=note["height"]
    )


def search_notes(query: str) -> List[Dict]:
    conn = get_connection()
    q = f"%{query}%"
    rows = conn.execute(
        "SELECT * FROM notes WHERE archived=0 AND (title LIKE ? OR body LIKE ?) ORDER BY pinned DESC, updated_at DESC",
        (q, q)
    ).fetchall()
    conn.close()
    return [_row_to_dict(r) for r in rows]
