import sys
import os

src_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, src_dir)

import tkinter as tk
from tkinter import messagebox

from storage.database import init_db, get_setting, set_setting
from i18n import set_language, get_language, get_text
from utils.theme import load_theme, set_theme, get_theme_name, c
import storage


class App(tk.Tk):
    def __init__(self):
        super().__init__()

        init_db()
        saved_lang = get_setting("language", "en")
        set_language(saved_lang)
        load_theme()

        self._current_view = None
        self._setup_window()
        self._build_layout()

        last_view = get_setting("last_view", "wall")
        self._navigate(last_view)

    def _setup_window(self):
        self.title(get_text("app_title"))
        self.configure(bg=c("bg"))
        sw = self.winfo_screenwidth()
        sh = self.winfo_screenheight()
        w = min(1200, sw - 80)
        h = min(800, sh - 80)
        x = (sw - w) // 2
        y = (sh - h) // 2
        self.geometry(f"{w}x{h}+{x}+{y}")
        self.minsize(800, 560)
        self.protocol("WM_DELETE_WINDOW", self._on_close)

        try:
            icon_path = os.path.join(os.path.dirname(src_dir), "icon.ico")
            if os.path.exists(icon_path):
                self.iconbitmap(icon_path)
        except Exception:
            pass

    def _build_layout(self):
        from ui.sidebar import Sidebar
        from ui.toolbar import Toolbar

        self._sidebar = Sidebar(self, on_navigate=self._navigate)
        self._sidebar.pack(side=tk.LEFT, fill=tk.Y)

        right_pane = tk.Frame(self, bg=c("content_bg"))
        right_pane.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self._toolbar = Toolbar(right_pane, callbacks={
            "new_note": self._on_new_note,
            "new_task": self._on_new_task,
            "search": self._on_search,
            "toggle_language": self._toggle_language,
            "toggle_theme": self._toggle_theme,
        })
        self._toolbar.pack(fill=tk.X)

        tk.Frame(right_pane, bg=c("toolbar_border"), height=1).pack(fill=tk.X)

        self._content_area = tk.Frame(right_pane, bg=c("content_bg"))
        self._content_area.pack(fill=tk.BOTH, expand=True)

        self._views = {}

    def _get_or_create_view(self, name):
        if name not in self._views:
            from ui.wall_canvas import WallCanvas
            from ui.task_view import TaskView
            from ui.archive_view import ArchiveView
            from ui.settings_view import SettingsView

            if name == "wall":
                view = WallCanvas(
                    self._content_area,
                    on_edit_note=self._on_edit_note,
                    bg=c("wall_bg")
                )
                view.load_notes()
            elif name == "tasks":
                view = TaskView(self._content_area, bg=c("content_bg"))
            elif name == "archive":
                view = ArchiveView(self._content_area, bg=c("content_bg"))
            elif name == "settings":
                view = SettingsView(
                    self._content_area,
                    on_language_change=self._on_language_changed,
                    on_theme_change=self._on_theme_changed,
                    bg=c("content_bg")
                )
            else:
                return None
            self._views[name] = view
        return self._views[name]

    def _navigate(self, section: str):
        if self._current_view:
            self._current_view.pack_forget()
        self._current_view_name = section
        view = self._get_or_create_view(section)
        if view:
            view.pack(fill=tk.BOTH, expand=True)
            self._current_view = view
            self._sidebar.set_active(section)
            set_setting("last_view", section)

            if section == "archive" and hasattr(view, "load"):
                view.load()

    def _on_new_note(self):
        self._navigate("wall")
        wall = self._get_or_create_view("wall")
        from ui.note_editor import NoteEditorDialog
        NoteEditorDialog(self, note_id=None, on_save=lambda nid: wall.refresh_note(nid))

    def _on_new_task(self):
        self._navigate("tasks")
        task_view = self._get_or_create_view("tasks")
        from ui.task_view import TaskEditorDialog
        TaskEditorDialog(self, task_id=None, on_save=lambda tid: task_view.load_tasks())

    def _on_edit_note(self, note_id):
        wall = self._get_or_create_view("wall")
        from ui.note_editor import NoteEditorDialog
        NoteEditorDialog(self, note_id=note_id, on_save=lambda nid: wall.refresh_note(nid))

    def _on_search(self, query: str):
        view_name = getattr(self, "_current_view_name", "wall")
        if view_name == "wall":
            wall = self._get_or_create_view("wall")
            if hasattr(wall, "search_notes"):
                wall.search_notes(query)

    def _toggle_language(self):
        current = get_language()
        new_lang = "ar" if current == "en" else "en"
        set_language(new_lang)
        storage.set_setting("language", new_lang)
        self._apply_language_change(new_lang)

    def _toggle_theme(self):
        current = get_theme_name()
        new_theme = "dark" if current == "light" else "light"
        set_theme(new_theme)
        self._apply_theme_change(new_theme)

    def _on_language_changed(self, lang):
        self._apply_language_change(lang)

    def _on_theme_changed(self, theme):
        self._apply_theme_change(theme)

    def _apply_language_change(self, lang):
        self.title(get_text("app_title"))
        self._views = {}
        self._current_view = None
        for widget in self._content_area.winfo_children():
            widget.destroy()
        for widget in self.winfo_children():
            if hasattr(widget, "apply_theme"):
                widget.apply_theme()
        self._toolbar.apply_theme()
        self._sidebar.apply_theme()
        self._navigate(getattr(self, "_current_view_name", "wall"))

    def _apply_theme_change(self, theme):
        self.configure(bg=c("bg"))
        self._views = {}
        self._current_view = None
        for widget in self._content_area.winfo_children():
            widget.destroy()
        self._toolbar.apply_theme()
        self._sidebar.apply_theme()
        self._navigate(getattr(self, "_current_view_name", "wall"))

    def _on_close(self):
        self.destroy()


def main():
    app = App()
    app.mainloop()


if __name__ == "__main__":
    main()
