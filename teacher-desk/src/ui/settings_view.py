import tkinter as tk
from tkinter import messagebox, filedialog
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from i18n import get_text, get_language, set_language, LANGUAGES
from utils import c, get_theme_name, set_theme, THEMES
import storage


class SettingsView(tk.Frame):
    def __init__(self, parent, on_language_change, on_theme_change, **kwargs):
        super().__init__(parent, **kwargs)
        self.on_language_change = on_language_change
        self.on_theme_change = on_theme_change
        self.configure(bg=c("content_bg"))
        self._build()

    def _build(self):
        outer = tk.Frame(self, bg=c("content_bg"))
        outer.pack(fill=tk.BOTH, expand=True, padx=32, pady=24)

        self._section(outer, get_text("language"))
        lang_frame = tk.Frame(outer, bg=c("content_bg"))
        lang_frame.pack(fill=tk.X, pady=(0, 20))

        self.lang_var = tk.StringVar(value=get_language())
        for code, name in LANGUAGES.items():
            rb = tk.Radiobutton(
                lang_frame, text=name,
                variable=self.lang_var, value=code,
                bg=c("content_bg"), fg=c("text_primary"),
                activebackground=c("content_bg"),
                selectcolor=c("accent"),
                font=("Segoe UI", 11),
                cursor="hand2",
                command=self._on_lang_change
            )
            rb.pack(side=tk.LEFT, padx=(0, 16))

        self._section(outer, get_text("app_theme"))
        theme_frame = tk.Frame(outer, bg=c("content_bg"))
        theme_frame.pack(fill=tk.X, pady=(0, 20))

        self.theme_var = tk.StringVar(value=get_theme_name())
        for name in THEMES:
            label = get_text(name)
            rb = tk.Radiobutton(
                theme_frame, text=label,
                variable=self.theme_var, value=name,
                bg=c("content_bg"), fg=c("text_primary"),
                activebackground=c("content_bg"),
                selectcolor=c("accent"),
                font=("Segoe UI", 11),
                cursor="hand2",
                command=self._on_theme_change
            )
            rb.pack(side=tk.LEFT, padx=(0, 16))

        self._section(outer, "Data")
        data_frame = tk.Frame(outer, bg=c("content_bg"))
        data_frame.pack(fill=tk.X, pady=(0, 20))

        self._btn(data_frame, get_text("backup_export"), self._export_backup, c("button_bg"))
        self._btn(data_frame, get_text("backup_import"), self._import_backup, c("button_bg"))
        self._btn(data_frame, get_text("reset_data"), self._reset_data, c("danger"))

        self._section(outer, get_text("about"))
        tk.Label(outer, text=get_text("about_text"),
                 bg=c("content_bg"), fg=c("text_secondary"),
                 font=("Segoe UI", 10), anchor="w", justify="left").pack(anchor="w")

        data_path_label = tk.Label(
            outer,
            text=f"Data folder: {storage.DATA_DIR}",
            bg=c("content_bg"), fg=c("text_muted"),
            font=("Segoe UI", 8), anchor="w"
        )
        data_path_label.pack(anchor="w", pady=(8, 0))

    def _section(self, parent, title):
        tk.Label(parent, text=title,
                 bg=c("content_bg"), fg=c("text_primary"),
                 font=("Segoe UI", 13, "bold"), anchor="w").pack(anchor="w", pady=(8, 4))
        tk.Frame(parent, bg=c("border"), height=1).pack(fill=tk.X, pady=(0, 8))

    def _btn(self, parent, text, command, bg):
        btn = tk.Button(
            parent, text=text,
            bg=bg, fg="#FFFFFF",
            relief=tk.FLAT, cursor="hand2",
            font=("Segoe UI", 10),
            padx=16, pady=8,
            command=command
        )
        btn.pack(side=tk.LEFT, padx=(0, 8), pady=4)

    def _on_lang_change(self):
        lang = self.lang_var.get()
        set_language(lang)
        storage.set_setting("language", lang)
        self.on_language_change(lang)

    def _on_theme_change(self):
        theme = self.theme_var.get()
        set_theme(theme)
        self.on_theme_change(theme)

    def _export_backup(self):
        path = filedialog.asksaveasfilename(
            title=get_text("backup_export"),
            defaultextension=".db",
            filetypes=[("Database files", "*.db"), ("All files", "*.*")],
            initialfile="teacher_desk_backup.db"
        )
        if path:
            storage.export_backup(path)
            messagebox.showinfo(get_text("backup_export"), get_text("backup_success"))

    def _import_backup(self):
        path = filedialog.askopenfilename(
            title=get_text("backup_import"),
            filetypes=[("Database files", "*.db"), ("All files", "*.*")]
        )
        if path:
            storage.import_backup(path)
            messagebox.showinfo(get_text("backup_import"), get_text("import_success"))

    def _reset_data(self):
        if messagebox.askyesno(get_text("reset_data"), get_text("confirm_reset")):
            storage.reset_data()
            messagebox.showinfo(get_text("reset_data"), get_text("reset_success"))

    def apply_theme(self):
        self.configure(bg=c("content_bg"))
        for widget in self.winfo_children():
            widget.destroy()
        self._build()
