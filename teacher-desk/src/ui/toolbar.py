import tkinter as tk
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from i18n import get_text, get_language
from utils import c


class Toolbar(tk.Frame):
    def __init__(self, parent, callbacks, **kwargs):
        super().__init__(parent, **kwargs)
        self.callbacks = callbacks
        self._build()

    def _build(self):
        self.configure(bg=c("toolbar_bg"), pady=6, padx=12,
                       relief=tk.FLAT, bd=0)

        tk.Frame(self, bg=c("toolbar_border"), width=1).pack(side=tk.LEFT, fill=tk.Y, padx=6)

        self._new_note_btn = self._btn("new_note", self.callbacks.get("new_note"))
        self._new_task_btn = self._btn("new_task", self.callbacks.get("new_task"))

        tk.Frame(self, bg=c("toolbar_border"), width=1).pack(side=tk.LEFT, fill=tk.Y, padx=6)

        search_frame = tk.Frame(self, bg=c("input_bg"), relief=tk.FLAT, bd=1)
        search_frame.pack(side=tk.LEFT, padx=6)
        self.search_var = tk.StringVar()
        self.search_var.trace("w", self._on_search_change)
        search_entry = tk.Entry(
            search_frame, textvariable=self.search_var,
            bg=c("input_bg"), fg=c("text_muted"),
            insertbackground=c("input_fg"),
            relief=tk.FLAT, width=24,
            font=("Segoe UI", 9)
        )
        search_entry.pack(padx=8, pady=5)
        search_entry.insert(0, get_text("search"))
        search_entry.bind("<FocusIn>",
                          lambda e: search_entry.delete(0, tk.END)
                          if self.search_var.get() == get_text("search") else None)
        search_entry.bind("<FocusOut>",
                          lambda e: (search_entry.insert(0, get_text("search"))
                                     if not self.search_var.get() else None))

        tk.Frame(self, bg=c("toolbar_border"), width=1).pack(side=tk.LEFT, fill=tk.Y, padx=6)

        lang_btn = tk.Label(
            self, text="EN/ع",
            bg=c("toolbar_bg"), fg=c("toolbar_fg"),
            font=("Segoe UI", 9), cursor="hand2",
            padx=8, pady=4
        )
        lang_btn.pack(side=tk.LEFT, padx=2)
        lang_btn.bind("<Button-1>", lambda e: self.callbacks.get("toggle_language", lambda: None)())

        theme_cb = self.callbacks.get("toggle_theme")
        theme_btn = tk.Label(
            self, text="☀/🌙",
            bg=c("toolbar_bg"), fg=c("toolbar_fg"),
            font=("Segoe UI", 10), cursor="hand2",
            padx=8, pady=4
        )
        theme_btn.pack(side=tk.LEFT, padx=2)
        theme_btn.bind("<Button-1>", lambda e: self.callbacks.get("toggle_theme", lambda: None)())

    def _btn(self, text_key, command):
        btn = tk.Button(
            self, text=get_text(text_key),
            bg=c("accent"), fg="#FFFFFF",
            relief=tk.FLAT, cursor="hand2",
            font=("Segoe UI", 9, "bold"),
            padx=14, pady=6,
            command=command or (lambda: None)
        )
        btn.pack(side=tk.LEFT, padx=4)
        return btn

    def _on_search_change(self, *args):
        query = self.search_var.get()
        if query == get_text("search"):
            return
        cb = self.callbacks.get("search")
        if cb:
            cb(query)

    def apply_theme(self):
        self.configure(bg=c("toolbar_bg"))
        for widget in self.winfo_children():
            widget.destroy()
        self._build()
