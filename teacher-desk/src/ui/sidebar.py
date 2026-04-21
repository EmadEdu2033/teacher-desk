import tkinter as tk
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from i18n import get_text
from utils import c


NAV_ITEMS = [
    ("wall", "🗒"),
    ("tasks", "✅"),
    ("archive", "📁"),
    ("settings", "⚙"),
]


class Sidebar(tk.Frame):
    def __init__(self, parent, on_navigate, **kwargs):
        super().__init__(parent, **kwargs)
        self.on_navigate = on_navigate
        self._active = "wall"
        self._buttons = {}
        self._build()

    def _build(self):
        self.configure(bg=c("sidebar_bg"), width=180)
        self.pack_propagate(False)

        title_frame = tk.Frame(self, bg=c("sidebar_bg"), pady=20)
        title_frame.pack(fill=tk.X)

        tk.Label(title_frame, text=get_text("app_title"),
                 bg=c("sidebar_bg"), fg=c("sidebar_fg"),
                 font=("Segoe UI", 14, "bold"),
                 pady=8, padx=16, anchor="w").pack(fill=tk.X)

        tk.Frame(self, bg=c("sidebar_hover"), height=1).pack(fill=tk.X, padx=16, pady=(0, 8))

        for key, icon in NAV_ITEMS:
            btn = tk.Label(
                self, text=f" {icon}  {get_text(key)}",
                bg=c("sidebar_active") if key == self._active else c("sidebar_bg"),
                fg="#FFFFFF" if key == self._active else c("sidebar_fg"),
                font=("Segoe UI", 10, "bold" if key == self._active else "normal"),
                anchor="w", padx=16, pady=12,
                cursor="hand2"
            )
            btn.pack(fill=tk.X, pady=1)
            btn.bind("<Button-1>", lambda e, k=key: self._on_click(k))
            btn.bind("<Enter>", lambda e, b=btn, k=key: b.configure(
                bg=c("sidebar_active") if k == self._active else c("sidebar_hover")
            ))
            btn.bind("<Leave>", lambda e, b=btn, k=key: b.configure(
                bg=c("sidebar_active") if k == self._active else c("sidebar_bg")
            ))
            self._buttons[key] = btn

    def _on_click(self, key):
        self._set_active(key)
        self.on_navigate(key)

    def _set_active(self, key):
        self._active = key
        for k, btn in self._buttons.items():
            if k == key:
                btn.configure(
                    bg=c("sidebar_active"), fg="#FFFFFF",
                    font=("Segoe UI", 10, "bold")
                )
            else:
                btn.configure(
                    bg=c("sidebar_bg"), fg=c("sidebar_fg"),
                    font=("Segoe UI", 10)
                )

    def set_active(self, key):
        self._set_active(key)

    def apply_theme(self):
        self.configure(bg=c("sidebar_bg"))
        for widget in self.winfo_children():
            widget.destroy()
        self._buttons = {}
        self._build()
        self._set_active(self._active)
