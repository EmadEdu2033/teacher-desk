import tkinter as tk
from tkinter import ttk
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from i18n import get_text, get_language
from utils import c, get_note_colors
import storage


class NoteEditorDialog(tk.Toplevel):
    def __init__(self, parent, note_id=None, on_save=None):
        super().__init__(parent)
        self.note_id = note_id
        self.on_save = on_save
        self.note_data = storage.get_note(note_id) if note_id else None
        self._result = None

        self._setup_window()
        self._build_ui()

        if self.note_data:
            self._populate(self.note_data)

        self.grab_set()
        self.focus_set()
        self.wait_window(self)

    def _setup_window(self):
        title = get_text("edit") if self.note_id else get_text("new_note")
        self.title(title)
        self.configure(bg=c("content_bg"))
        self.resizable(True, True)
        w, h = 480, 420
        sw = self.winfo_screenwidth()
        sh = self.winfo_screenheight()
        x = (sw - w) // 2
        y = (sh - h) // 2
        self.geometry(f"{w}x{h}+{x}+{y}")
        self.minsize(380, 340)
        self.protocol("WM_DELETE_WINDOW", self._on_cancel)

    def _build_ui(self):
        lang = get_language()
        anchor = "e" if lang == "ar" else "w"
        justify = "right" if lang == "ar" else "left"

        pad = {"padx": 16, "pady": 6}

        tk.Label(self, text=get_text("note_title"),
                 bg=c("content_bg"), fg=c("text_secondary"),
                 font=("Segoe UI", 9), anchor=anchor).pack(fill=tk.X, **pad)

        self.title_var = tk.StringVar()
        title_entry = tk.Entry(
            self, textvariable=self.title_var,
            bg=c("input_bg"), fg=c("input_fg"),
            insertbackground=c("input_fg"),
            relief=tk.FLAT, bd=1,
            font=("Segoe UI", 11),
            justify=justify
        )
        title_entry.pack(fill=tk.X, padx=16, pady=2, ipady=6)
        title_entry.focus_set()

        tk.Label(self, text=get_text("note_body"),
                 bg=c("content_bg"), fg=c("text_secondary"),
                 font=("Segoe UI", 9), anchor=anchor).pack(fill=tk.X, **pad)

        body_frame = tk.Frame(self, bg=c("input_border"), bd=1)
        body_frame.pack(fill=tk.BOTH, expand=True, padx=16, pady=2)

        self.body_text = tk.Text(
            body_frame,
            bg=c("input_bg"), fg=c("input_fg"),
            insertbackground=c("input_fg"),
            relief=tk.FLAT, bd=0,
            font=("Segoe UI", 10),
            wrap=tk.WORD,
            spacing1=2, spacing2=2, spacing3=2,
        )
        if lang == "ar":
            self.body_text.configure(justify=tk.RIGHT)

        body_scroll = tk.Scrollbar(body_frame, command=self.body_text.yview)
        self.body_text.configure(yscrollcommand=body_scroll.set)

        if lang == "ar":
            body_scroll.pack(side=tk.LEFT, fill=tk.Y)
        else:
            body_scroll.pack(side=tk.RIGHT, fill=tk.Y)
        self.body_text.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        color_frame = tk.Frame(self, bg=c("content_bg"))
        color_frame.pack(fill=tk.X, padx=16, pady=8)

        tk.Label(color_frame, text=get_text("note_color") + ":",
                 bg=c("content_bg"), fg=c("text_secondary"),
                 font=("Segoe UI", 9)).pack(side=tk.LEFT, padx=(0, 8))

        self.selected_color = tk.StringVar(value="#FFE066")
        if self.note_data:
            self.selected_color.set(self.note_data.get("color", "#FFE066"))

        self._color_buttons = {}
        note_colors = get_note_colors()
        for key, (name, bg, fg_c) in note_colors.items():
            btn = tk.Label(
                color_frame, bg=bg, width=3,
                relief=tk.FLAT, cursor="hand2",
                bd=2
            )
            btn.pack(side=tk.LEFT, padx=2)
            btn.bind("<Button-1>", lambda e, k=key, b=btn: self._select_color(k, b))
            self._color_buttons[key] = btn

        self._highlight_selected_color()

        btn_frame = tk.Frame(self, bg=c("content_bg"))
        btn_frame.pack(fill=tk.X, padx=16, pady=(4, 12))

        save_btn = tk.Button(
            btn_frame, text=get_text("save"),
            bg=c("accent"), fg="#FFFFFF",
            relief=tk.FLAT, cursor="hand2",
            font=("Segoe UI", 10, "bold"),
            padx=20, pady=6,
            command=self._on_save
        )
        save_btn.pack(side=tk.RIGHT, padx=(8, 0))

        cancel_btn = tk.Button(
            btn_frame, text=get_text("cancel"),
            bg=c("border"), fg=c("text_primary"),
            relief=tk.FLAT, cursor="hand2",
            font=("Segoe UI", 10),
            padx=20, pady=6,
            command=self._on_cancel
        )
        cancel_btn.pack(side=tk.RIGHT)

        self.bind("<Control-Return>", lambda e: self._on_save())
        self.bind("<Escape>", lambda e: self._on_cancel())

    def _populate(self, note):
        self.title_var.set(note.get("title", ""))
        self.body_text.delete("1.0", tk.END)
        self.body_text.insert("1.0", note.get("body", ""))
        self.selected_color.set(note.get("color", "#FFE066"))
        self._highlight_selected_color()

    def _select_color(self, key, btn):
        self.selected_color.set(key)
        self._highlight_selected_color()

    def _highlight_selected_color(self):
        sel = self.selected_color.get()
        note_colors = get_note_colors()
        for key, btn in self._color_buttons.items():
            if key == sel:
                btn.configure(relief=tk.SOLID, bd=3)
            else:
                btn.configure(relief=tk.FLAT, bd=2)

    def _on_save(self):
        title = self.title_var.get().strip()
        body = self.body_text.get("1.0", tk.END).rstrip("\n")
        color = self.selected_color.get()

        if self.note_id:
            storage.update_note(self.note_id, title=title, body=body, color=color)
            self._result = self.note_id
        else:
            note = storage.create_note(title=title, body=body, color=color,
                                       x=120, y=100)
            self._result = note["id"]

        if self.on_save:
            self.on_save(self._result)
        self.destroy()

    def _on_cancel(self):
        self._result = None
        self.destroy()
