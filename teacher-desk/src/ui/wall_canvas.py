import tkinter as tk
from tkinter import messagebox
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from i18n import get_text
from utils import c, get_note_colors
import storage

NOTE_MIN_W = 160
NOTE_MIN_H = 120
RESIZE_HANDLE = 14
HEADER_H = 32


class NoteWidget:
    def __init__(self, canvas, note_data, on_update=None):
        self.canvas = canvas
        self.note_id = note_data["id"]
        self.x = note_data["x"]
        self.y = note_data["y"]
        self.w = note_data["width"]
        self.h = note_data["height"]
        self.color = note_data["color"]
        self.title = note_data["title"]
        self.body = note_data["body"]
        self.pinned = note_data["pinned"]
        self.on_update = on_update

        self._drag_start = None
        self._resize_start = None
        self._items = []
        self.draw()

    def draw(self):
        for item in self._items:
            try:
                self.canvas.delete(item)
            except Exception:
                pass
        self._items = []

        x, y, w, h = self.x, self.y, self.w, self.h
        theme = c("note_shadow")
        note_colors = get_note_colors()
        bg = self.color
        fg = "#333333"
        if self.color in note_colors:
            _, bg, fg = note_colors[self.color]
        else:
            for _, (name, bg_c, fg_c) in note_colors.items():
                if bg_c == self.color:
                    bg, fg = bg_c, fg_c
                    break

        shadow_offset = 4
        shadow = self.canvas.create_rectangle(
            x + shadow_offset, y + shadow_offset,
            x + w + shadow_offset, y + h + shadow_offset,
            fill="#00000025", outline="", tags=("note", f"note_{self.note_id}", "shadow")
        )
        self._items.append(shadow)

        body_rect = self.canvas.create_rectangle(
            x, y, x + w, y + h,
            fill=bg, outline=fg + "40", width=1,
            tags=("note", f"note_{self.note_id}", "body")
        )
        self._items.append(body_rect)

        header = self.canvas.create_rectangle(
            x, y, x + w, y + HEADER_H,
            fill=self._darken(bg, 20), outline="",
            tags=("note", f"note_{self.note_id}", "header")
        )
        self._items.append(header)

        pin_text = "📌 " if self.pinned else ""
        title_display = pin_text + (self.title or "")
        title_item = self.canvas.create_text(
            x + 10, y + HEADER_H // 2,
            text=title_display, anchor="w",
            font=("Segoe UI", 9, "bold"),
            fill=fg, width=w - 50,
            tags=("note", f"note_{self.note_id}", "title")
        )
        self._items.append(title_item)

        body_text = self.canvas.create_text(
            x + 10, y + HEADER_H + 8,
            text=self.body,
            anchor="nw",
            font=("Segoe UI", 9),
            fill=fg,
            width=w - 20,
            tags=("note", f"note_{self.note_id}", "body_text")
        )
        self._items.append(body_text)

        resize_handle = self.canvas.create_rectangle(
            x + w - RESIZE_HANDLE, y + h - RESIZE_HANDLE,
            x + w, y + h,
            fill=self._darken(bg, 30), outline="",
            tags=("note", f"note_{self.note_id}", "resize")
        )
        self._items.append(resize_handle)

        resize_dots = self.canvas.create_text(
            x + w - RESIZE_HANDLE // 2, y + h - RESIZE_HANDLE // 2,
            text="⤡", font=("Segoe UI", 8), fill=fg + "80",
            tags=("note", f"note_{self.note_id}", "resize")
        )
        self._items.append(resize_dots)

        for item in self._items:
            self.canvas.tag_bind(item, "<ButtonPress-1>", self._on_press)
            self.canvas.tag_bind(item, "<B1-Motion>", self._on_drag)
            self.canvas.tag_bind(item, "<ButtonRelease-1>", self._on_release)
            self.canvas.tag_bind(item, "<Double-Button-1>", self._on_double_click)
            self.canvas.tag_bind(item, "<Button-3>", self._on_right_click)

        for item in self._items[-2:]:
            self.canvas.tag_bind(item, "<ButtonPress-1>", self._on_resize_press)
            self.canvas.tag_bind(item, "<B1-Motion>", self._on_resize_drag)
            self.canvas.tag_bind(item, "<ButtonRelease-1>", self._on_resize_release)

    def _darken(self, hex_color, amount=20):
        try:
            hex_color = hex_color.lstrip("#")
            r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
            r = max(0, r - amount)
            g = max(0, g - amount)
            b = max(0, b - amount)
            return f"#{r:02X}{g:02X}{b:02X}"
        except Exception:
            return hex_color

    def bring_to_front(self):
        for item in self._items:
            self.canvas.tag_raise(item)

    def _on_press(self, event):
        self.bring_to_front()
        storage.bring_to_front(self.note_id)
        self._drag_start = (event.x, event.y, self.x, self.y)

    def _on_drag(self, event):
        if self._drag_start and not self._resize_start:
            dx = event.x - self._drag_start[0]
            dy = event.y - self._drag_start[1]
            self.x = self._drag_start[2] + dx
            self.y = self._drag_start[3] + dy
            self.draw()

    def _on_release(self, event):
        if self._drag_start:
            storage.update_note_position(self.note_id, self.x, self.y)
            self._drag_start = None

    def _on_resize_press(self, event):
        self._drag_start = None
        self._resize_start = (event.x, event.y, self.w, self.h)

    def _on_resize_drag(self, event):
        if self._resize_start:
            dx = event.x - self._resize_start[0]
            dy = event.y - self._resize_start[1]
            new_w = max(NOTE_MIN_W, self._resize_start[2] + dx)
            new_h = max(NOTE_MIN_H, self._resize_start[3] + dy)
            self.w = new_w
            self.h = new_h
            self.draw()

    def _on_resize_release(self, event):
        if self._resize_start:
            storage.update_note_size(self.note_id, self.w, self.h)
            self._resize_start = None

    def _on_double_click(self, event):
        if self.on_update:
            self.on_update("edit", self.note_id)

    def _on_right_click(self, event):
        if self.on_update:
            self.on_update("context_menu", self.note_id, event.x_root, event.y_root)

    def update_data(self, note_data):
        self.color = note_data["color"]
        self.title = note_data["title"]
        self.body = note_data["body"]
        self.pinned = note_data["pinned"]
        self.x = note_data["x"]
        self.y = note_data["y"]
        self.w = note_data["width"]
        self.h = note_data["height"]
        self.draw()

    def destroy(self):
        for item in self._items:
            try:
                self.canvas.delete(item)
            except Exception:
                pass
        self._items = []


class WallCanvas(tk.Frame):
    def __init__(self, parent, on_edit_note, **kwargs):
        super().__init__(parent, **kwargs)
        self.on_edit_note = on_edit_note
        self._note_widgets = {}
        self._build()

    def _build(self):
        self.configure(bg=c("wall_bg"))

        hscroll = tk.Scrollbar(self, orient=tk.HORIZONTAL)
        vscroll = tk.Scrollbar(self, orient=tk.VERTICAL)

        self.canvas = tk.Canvas(
            self,
            bg=c("wall_bg"),
            highlightthickness=0,
            xscrollcommand=hscroll.set,
            yscrollcommand=vscroll.set,
            scrollregion=(0, 0, 3000, 2500),
        )
        hscroll.config(command=self.canvas.xview)
        vscroll.config(command=self.canvas.yview)

        hscroll.pack(side=tk.BOTTOM, fill=tk.X)
        vscroll.pack(side=tk.RIGHT, fill=tk.Y)
        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self._draw_grid()

        self.canvas.bind("<MouseWheel>", self._on_mousewheel)
        self.canvas.bind("<Button-4>", self._on_mousewheel)
        self.canvas.bind("<Button-5>", self._on_mousewheel)

    def _draw_grid(self):
        self.canvas.delete("grid")
        grid_color = c("wall_grid")
        for x in range(0, 3000, 40):
            self.canvas.create_line(x, 0, x, 2500, fill=grid_color, tags="grid", width=1)
        for y in range(0, 2500, 40):
            self.canvas.create_line(0, y, 3000, y, fill=grid_color, tags="grid", width=1)

    def _on_mousewheel(self, event):
        if event.num == 4:
            self.canvas.yview_scroll(-1, "units")
        elif event.num == 5:
            self.canvas.yview_scroll(1, "units")
        else:
            self.canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

    def load_notes(self):
        for nw in self._note_widgets.values():
            nw.destroy()
        self._note_widgets = {}

        notes = storage.get_all_notes(archived=False)
        for note in notes:
            nw = NoteWidget(
                self.canvas, note,
                on_update=self._handle_note_event
            )
            self._note_widgets[note["id"]] = nw

        self._sort_by_z_order(notes)

    def _sort_by_z_order(self, notes):
        sorted_notes = sorted(notes, key=lambda n: n.get("z_order", 0))
        for note in sorted_notes:
            nid = note["id"]
            if nid in self._note_widgets:
                self._note_widgets[nid].bring_to_front()

    def add_note(self, note_data):
        nw = NoteWidget(
            self.canvas, note_data,
            on_update=self._handle_note_event
        )
        self._note_widgets[note_data["id"]] = nw
        nw.bring_to_front()

    def refresh_note(self, note_id):
        note = storage.get_note(note_id)
        if not note:
            return
        if note_id in self._note_widgets:
            if note.get("archived"):
                self._note_widgets[note_id].destroy()
                del self._note_widgets[note_id]
            else:
                self._note_widgets[note_id].update_data(note)
        else:
            if not note.get("archived"):
                nw = NoteWidget(self.canvas, note, on_update=self._handle_note_event)
                self._note_widgets[note_id] = nw

    def remove_note(self, note_id):
        if note_id in self._note_widgets:
            self._note_widgets[note_id].destroy()
            del self._note_widgets[note_id]

    def _handle_note_event(self, action, note_id, *args):
        if action == "edit":
            self.on_edit_note(note_id)
        elif action == "context_menu":
            x_root, y_root = args[0], args[1]
            self._show_context_menu(note_id, x_root, y_root)

    def _show_context_menu(self, note_id, x, y):
        note = storage.get_note(note_id)
        if not note:
            return
        menu = tk.Menu(self, tearoff=0, bg=c("card_bg"), fg=c("text_primary"),
                       activebackground=c("accent"), activeforeground="#FFFFFF",
                       font=("Segoe UI", 9))
        menu.add_command(label=get_text("edit"),
                         command=lambda: self.on_edit_note(note_id))
        menu.add_separator()
        pin_label = get_text("unpin") if note["pinned"] else get_text("pin")
        menu.add_command(label=pin_label,
                         command=lambda: self._toggle_pin(note_id))
        menu.add_command(label=get_text("duplicate"),
                         command=lambda: self._duplicate_note(note_id))
        menu.add_separator()
        menu.add_command(label=get_text("change_color"),
                         command=lambda: self._show_color_menu(note_id, x, y))
        menu.add_separator()
        menu.add_command(label=get_text("archive_action"),
                         command=lambda: self._archive_note(note_id))
        menu.add_command(label=get_text("delete"),
                         foreground=c("danger"),
                         command=lambda: self._delete_note(note_id))
        menu.post(x, y)

    def _toggle_pin(self, note_id):
        note = storage.get_note(note_id)
        if note:
            storage.update_note(note_id, pinned=not note["pinned"])
            self.refresh_note(note_id)

    def _duplicate_note(self, note_id):
        new_note = storage.duplicate_note(note_id)
        if new_note:
            self.add_note(new_note)

    def _archive_note(self, note_id):
        storage.update_note(note_id, archived=True)
        self.remove_note(note_id)

    def _delete_note(self, note_id):
        if messagebox.askyesno(get_text("delete"), get_text("confirm_delete")):
            storage.delete_note(note_id)
            self.remove_note(note_id)

    def _show_color_menu(self, note_id, x, y):
        colors = get_note_colors()
        menu = tk.Menu(self, tearoff=0, bg=c("card_bg"), fg=c("text_primary"),
                       activebackground=c("accent"), activeforeground="#FFFFFF",
                       font=("Segoe UI", 9))
        for key, (name, bg, _fg) in colors.items():
            menu.add_command(
                label=f"  {name}",
                background=bg,
                command=lambda k=key: self._change_note_color(note_id, k)
            )
        menu.post(x, y)

    def _change_note_color(self, note_id, color_key):
        storage.update_note(note_id, color=color_key)
        self.refresh_note(note_id)

    def apply_theme(self):
        self.configure(bg=c("wall_bg"))
        self.canvas.configure(bg=c("wall_bg"))
        self._draw_grid()
        for nw in self._note_widgets.values():
            nw.draw()

    def search_notes(self, query: str):
        if not query.strip():
            self.load_notes()
            return
        results = storage.search_notes(query)
        result_ids = {n["id"] for n in results}
        for nid, nw in list(self._note_widgets.items()):
            if nid not in result_ids:
                nw.destroy()
                del self._note_widgets[nid]
        for note in results:
            if note["id"] not in self._note_widgets:
                nw = NoteWidget(self.canvas, note, on_update=self._handle_note_event)
                self._note_widgets[note["id"]] = nw
