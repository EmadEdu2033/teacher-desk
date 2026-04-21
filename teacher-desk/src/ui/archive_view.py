import tkinter as tk
from tkinter import messagebox
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from i18n import get_text, get_language
from utils import c, get_note_colors
import storage


class ArchiveView(tk.Frame):
    def __init__(self, parent, **kwargs):
        super().__init__(parent, **kwargs)
        self.configure(bg=c("content_bg"))
        self._build()
        self.load()

    def _build(self):
        tabs = tk.Frame(self, bg=c("toolbar_bg"), pady=6, padx=12)
        tabs.pack(fill=tk.X)

        self._active_tab = "notes"
        self.notes_tab_btn = tk.Label(
            tabs, text=get_text("archived_notes"),
            bg=c("accent"), fg="#FFFFFF",
            font=("Segoe UI", 10, "bold"),
            padx=16, pady=6, cursor="hand2", relief=tk.FLAT
        )
        self.notes_tab_btn.pack(side=tk.LEFT, padx=(0, 4))
        self.notes_tab_btn.bind("<Button-1>", lambda e: self._switch_tab("notes"))

        self.tasks_tab_btn = tk.Label(
            tabs, text=get_text("archived_tasks"),
            bg=c("card_bg"), fg=c("text_secondary"),
            font=("Segoe UI", 10),
            padx=16, pady=6, cursor="hand2", relief=tk.FLAT
        )
        self.tasks_tab_btn.pack(side=tk.LEFT)
        self.tasks_tab_btn.bind("<Button-1>", lambda e: self._switch_tab("tasks"))

        tk.Frame(self, bg=c("border_light"), height=1).pack(fill=tk.X)

        list_outer = tk.Frame(self, bg=c("content_bg"))
        list_outer.pack(fill=tk.BOTH, expand=True)

        self.canvas = tk.Canvas(list_outer, bg=c("content_bg"), highlightthickness=0)
        scrollbar = tk.Scrollbar(list_outer, orient="vertical", command=self.canvas.yview)
        self.canvas.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.list_frame = tk.Frame(self.canvas, bg=c("content_bg"))
        self._window = self.canvas.create_window((0, 0), window=self.list_frame, anchor="nw")

        self.list_frame.bind("<Configure>",
                             lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all")))
        self.canvas.bind("<Configure>",
                         lambda e: self.canvas.itemconfig(self._window, width=e.width))
        self.canvas.bind("<MouseWheel>", self._on_mousewheel)
        self.canvas.bind("<Button-4>", self._on_mousewheel)
        self.canvas.bind("<Button-5>", self._on_mousewheel)

    def _on_mousewheel(self, event):
        if event.num == 4:
            self.canvas.yview_scroll(-1, "units")
        elif event.num == 5:
            self.canvas.yview_scroll(1, "units")
        else:
            self.canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

    def _switch_tab(self, tab):
        self._active_tab = tab
        if tab == "notes":
            self.notes_tab_btn.configure(bg=c("accent"), fg="#FFFFFF", font=("Segoe UI", 10, "bold"))
            self.tasks_tab_btn.configure(bg=c("card_bg"), fg=c("text_secondary"), font=("Segoe UI", 10))
        else:
            self.tasks_tab_btn.configure(bg=c("accent"), fg="#FFFFFF", font=("Segoe UI", 10, "bold"))
            self.notes_tab_btn.configure(bg=c("card_bg"), fg=c("text_secondary"), font=("Segoe UI", 10))
        self.load()

    def load(self):
        for w in self.list_frame.winfo_children():
            w.destroy()

        if self._active_tab == "notes":
            self._load_notes()
        else:
            self._load_tasks()

    def _load_notes(self):
        notes = storage.get_all_notes(archived=True)
        if not notes:
            tk.Label(self.list_frame, text=get_text("no_notes"),
                     bg=c("content_bg"), fg=c("text_muted"),
                     font=("Segoe UI", 11), pady=40).pack()
            return

        note_colors = get_note_colors()
        for note in notes:
            bg_c = note.get("color", "#FFE066")
            if bg_c in note_colors:
                _, bg_c, _ = note_colors[bg_c]

            card = tk.Frame(self.list_frame, bg=bg_c, bd=1, relief=tk.FLAT)
            card.pack(fill=tk.X, padx=12, pady=4)

            inner = tk.Frame(card, bg=bg_c, padx=10, pady=8)
            inner.pack(fill=tk.BOTH)

            title_row = tk.Frame(inner, bg=bg_c)
            title_row.pack(fill=tk.X)

            tk.Label(title_row, text=note.get("title") or "(no title)",
                     bg=bg_c, fg=c("text_primary"),
                     font=("Segoe UI", 10, "bold"), anchor="w").pack(side=tk.LEFT, fill=tk.X, expand=True)

            btn_frame = tk.Frame(title_row, bg=bg_c)
            btn_frame.pack(side=tk.RIGHT)

            restore_btn = tk.Label(btn_frame, text=get_text("unarchive"),
                                   bg=c("accent"), fg="#FFFFFF",
                                   font=("Segoe UI", 8), padx=6, pady=3, cursor="hand2")
            restore_btn.pack(side=tk.LEFT, padx=2)
            restore_btn.bind("<Button-1>",
                             lambda e, nid=note["id"]: self._restore_note(nid))

            del_btn = tk.Label(btn_frame, text=get_text("delete"),
                               bg=c("danger"), fg="#FFFFFF",
                               font=("Segoe UI", 8), padx=6, pady=3, cursor="hand2")
            del_btn.pack(side=tk.LEFT, padx=2)
            del_btn.bind("<Button-1>",
                         lambda e, nid=note["id"]: self._delete_note(nid))

            if note.get("body"):
                tk.Label(inner, text=note["body"][:120],
                         bg=bg_c, fg=c("text_secondary"),
                         font=("Segoe UI", 9), anchor="w",
                         wraplength=460, justify="left").pack(fill=tk.X, pady=(4, 0))

    def _load_tasks(self):
        tasks = storage.get_all_tasks(archived=True)
        if not tasks:
            tk.Label(self.list_frame, text=get_text("no_tasks"),
                     bg=c("content_bg"), fg=c("text_muted"),
                     font=("Segoe UI", 11), pady=40).pack()
            return

        for task in tasks:
            card = tk.Frame(self.list_frame, bg=c("card_bg"), bd=1, relief=tk.FLAT)
            card.pack(fill=tk.X, padx=12, pady=4)
            inner = tk.Frame(card, bg=c("card_bg"), padx=10, pady=8)
            inner.pack(fill=tk.BOTH)

            row = tk.Frame(inner, bg=c("card_bg"))
            row.pack(fill=tk.X)

            tk.Label(row, text=task.get("title", ""),
                     bg=c("card_bg"), fg=c("text_primary"),
                     font=("Segoe UI", 10, "bold"), anchor="w").pack(side=tk.LEFT, fill=tk.X, expand=True)

            restore_btn = tk.Label(row, text=get_text("unarchive"),
                                   bg=c("accent"), fg="#FFFFFF",
                                   font=("Segoe UI", 8), padx=6, pady=3, cursor="hand2")
            restore_btn.pack(side=tk.LEFT, padx=2)
            restore_btn.bind("<Button-1>",
                             lambda e, tid=task["id"]: self._restore_task(tid))

            del_btn = tk.Label(row, text=get_text("delete"),
                               bg=c("danger"), fg="#FFFFFF",
                               font=("Segoe UI", 8), padx=6, pady=3, cursor="hand2")
            del_btn.pack(side=tk.LEFT, padx=2)
            del_btn.bind("<Button-1>",
                         lambda e, tid=task["id"]: self._delete_task(tid))

    def _restore_note(self, note_id):
        storage.update_note(note_id, archived=False)
        self.load()

    def _delete_note(self, note_id):
        if messagebox.askyesno(get_text("delete"), get_text("confirm_delete")):
            storage.delete_note(note_id)
            self.load()

    def _restore_task(self, task_id):
        storage.update_task(task_id, archived=False)
        self.load()

    def _delete_task(self, task_id):
        if messagebox.askyesno(get_text("delete"), get_text("confirm_delete")):
            storage.delete_task(task_id)
            self.load()

    def apply_theme(self):
        self.configure(bg=c("content_bg"))
        self.canvas.configure(bg=c("content_bg"))
        self.list_frame.configure(bg=c("content_bg"))
        self.load()
