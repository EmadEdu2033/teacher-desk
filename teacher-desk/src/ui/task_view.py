import tkinter as tk
from tkinter import ttk, messagebox
from datetime import date, datetime
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from i18n import get_text, get_language
from utils import c
import storage


PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}


class QuickAddBar(tk.Frame):
    def __init__(self, parent, on_add, **kwargs):
        super().__init__(parent, **kwargs)
        self.on_add = on_add
        self.configure(bg=c("toolbar_bg"), pady=6, padx=12)
        self._build()

    def _build(self):
        self.entry_var = tk.StringVar()
        self.entry = tk.Entry(
            self, textvariable=self.entry_var,
            bg=c("input_bg"), fg=c("text_muted"),
            insertbackground=c("input_fg"),
            relief=tk.FLAT, bd=1,
            font=("Segoe UI", 10),
        )
        self.entry.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, ipady=7, padx=(0, 8))
        self.entry.insert(0, get_text("quick_add_task"))
        self.entry.bind("<FocusIn>", self._on_focus_in)
        self.entry.bind("<FocusOut>", self._on_focus_out)
        self.entry.bind("<Return>", self._on_enter)

        add_btn = tk.Button(
            self, text="+ " + get_text("new_task"),
            bg=c("accent"), fg="#FFFFFF",
            relief=tk.FLAT, cursor="hand2",
            font=("Segoe UI", 10, "bold"),
            padx=14, pady=6,
            command=self._on_add_button
        )
        add_btn.pack(side=tk.RIGHT)

    def _on_focus_in(self, e):
        if self.entry_var.get() == get_text("quick_add_task"):
            self.entry.delete(0, tk.END)
            self.entry.configure(fg=c("input_fg"))

    def _on_focus_out(self, e):
        if not self.entry_var.get().strip():
            self.entry.delete(0, tk.END)
            self.entry.insert(0, get_text("quick_add_task"))
            self.entry.configure(fg=c("text_muted"))

    def _on_enter(self, e):
        text = self.entry_var.get().strip()
        if text and text != get_text("quick_add_task"):
            self.on_add(title=text)
            self.entry.delete(0, tk.END)
            self.entry.insert(0, get_text("quick_add_task"))
            self.entry.configure(fg=c("text_muted"))

    def _on_add_button(self):
        text = self.entry_var.get().strip()
        if text and text != get_text("quick_add_task"):
            self.on_add(title=text)
            self.entry.delete(0, tk.END)
            self.entry.insert(0, get_text("quick_add_task"))
            self.entry.configure(fg=c("text_muted"))
        else:
            self.on_add(title="")


class FilterBar(tk.Frame):
    def __init__(self, parent, on_filter_change, on_search, **kwargs):
        super().__init__(parent, **kwargs)
        self.on_filter_change = on_filter_change
        self.on_search = on_search
        self.configure(bg=c("toolbar_bg"), pady=4, padx=12)
        self._active_filter = "all"
        self._build()

    def _build(self):
        filters = [
            ("all", get_text("all")),
            ("today", get_text("today")),
            ("upcoming", get_text("upcoming")),
            ("overdue", get_text("overdue")),
            ("completed", get_text("completed")),
            ("high_priority", get_text("high_priority")),
        ]

        self._filter_buttons = {}
        filter_frame = tk.Frame(self, bg=c("toolbar_bg"))
        filter_frame.pack(side=tk.LEFT, fill=tk.X)

        for key, label in filters:
            btn = tk.Label(
                filter_frame, text=label,
                bg=c("accent") if key == "all" else c("card_bg"),
                fg="#FFFFFF" if key == "all" else c("text_secondary"),
                font=("Segoe UI", 9),
                cursor="hand2",
                padx=10, pady=5,
                relief=tk.FLAT, bd=1
            )
            btn.pack(side=tk.LEFT, padx=2)
            btn.bind("<Button-1>", lambda e, k=key: self._set_filter(k))
            self._filter_buttons[key] = btn

        search_frame = tk.Frame(self, bg=c("toolbar_bg"))
        search_frame.pack(side=tk.RIGHT, padx=(8, 0))

        self.search_var = tk.StringVar()
        self.search_var.trace("w", lambda *a: self.on_search(self.search_var.get()))
        search_entry = tk.Entry(
            search_frame, textvariable=self.search_var,
            bg=c("input_bg"), fg=c("input_fg"),
            insertbackground=c("input_fg"),
            relief=tk.FLAT, bd=1,
            font=("Segoe UI", 9), width=18
        )
        search_entry.pack(ipady=5, padx=4)

    def _set_filter(self, key):
        self._active_filter = key
        for k, btn in self._filter_buttons.items():
            if k == key:
                btn.configure(bg=c("accent"), fg="#FFFFFF")
            else:
                btn.configure(bg=c("card_bg"), fg=c("text_secondary"))
        self.on_filter_change(key)

    def get_active_filter(self):
        return self._active_filter


class TaskCard(tk.Frame):
    def __init__(self, parent, task_data, on_action, **kwargs):
        super().__init__(parent, **kwargs)
        self.task = task_data
        self.on_action = on_action
        self.configure(bg=c("card_bg"), bd=1, relief=tk.FLAT, cursor="hand2")
        self._build()

    def _priority_color(self, p):
        return {"high": c("priority_high"), "medium": c("priority_medium"), "low": c("priority_low")}.get(p, c("text_muted"))

    def _build(self):
        lang = get_language()

        accent_bar = tk.Frame(self, bg=self._priority_color(self.task["priority"]), width=4)
        accent_bar.pack(side=tk.LEFT, fill=tk.Y)

        content = tk.Frame(self, bg=c("card_bg"), padx=10, pady=8)
        content.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        top_row = tk.Frame(content, bg=c("card_bg"))
        top_row.pack(fill=tk.X)

        done = self.task.get("completed", False)
        check_text = "☑" if done else "☐"
        check_fg = c("accent") if done else c("text_secondary")

        check_btn = tk.Label(top_row, text=check_text, bg=c("card_bg"), fg=check_fg,
                             font=("Segoe UI", 14), cursor="hand2")
        check_btn.pack(side=tk.LEFT, padx=(0, 8))
        check_btn.bind("<Button-1>", lambda e: self.on_action("toggle", self.task["id"]))

        title_fg = c("completed_fg") if done else c("text_primary")
        title_font = ("Segoe UI", 10, "overstrike" if done else "normal")
        title = tk.Label(top_row, text=self.task["title"], bg=c("card_bg"),
                         fg=title_fg, font=title_font, anchor="w", wraplength=340,
                         justify="left")
        title.pack(side=tk.LEFT, fill=tk.X, expand=True)

        action_frame = tk.Frame(top_row, bg=c("card_bg"))
        action_frame.pack(side=tk.RIGHT)

        edit_btn = tk.Label(action_frame, text="✏", bg=c("card_bg"),
                            fg=c("text_muted"), font=("Segoe UI", 10), cursor="hand2")
        edit_btn.pack(side=tk.LEFT, padx=2)
        edit_btn.bind("<Button-1>", lambda e: self.on_action("edit", self.task["id"]))

        del_btn = tk.Label(action_frame, text="🗑", bg=c("card_bg"),
                           fg=c("danger"), font=("Segoe UI", 10), cursor="hand2")
        del_btn.pack(side=tk.LEFT, padx=2)
        del_btn.bind("<Button-1>", lambda e: self.on_action("delete", self.task["id"]))

        meta_row = tk.Frame(content, bg=c("card_bg"))
        meta_row.pack(fill=tk.X, pady=(3, 0))

        if self.task.get("due_date"):
            try:
                due = date.fromisoformat(self.task["due_date"])
                today = date.today()
                if due < today and not done:
                    date_color = c("danger")
                elif due == today and not done:
                    date_color = c("warning")
                else:
                    date_color = c("text_muted")
                due_label = tk.Label(meta_row, text=f"📅 {self.task['due_date']}",
                                     bg=c("card_bg"), fg=date_color,
                                     font=("Segoe UI", 8))
                due_label.pack(side=tk.LEFT, padx=(0, 8))
            except Exception:
                pass

        if self.task.get("category"):
            cat_label = tk.Label(meta_row, text=self.task["category"],
                                 bg=c("tag_bg"), fg=c("tag_fg"),
                                 font=("Segoe UI", 8), padx=6, pady=2,
                                 relief=tk.FLAT)
            cat_label.pack(side=tk.LEFT, padx=(0, 4))

        priority_label = tk.Label(
            meta_row,
            text=get_text(self.task.get("priority", "medium")),
            bg=c("card_bg"), fg=self._priority_color(self.task["priority"]),
            font=("Segoe UI", 8, "bold")
        )
        priority_label.pack(side=tk.LEFT)


class TaskEditorDialog(tk.Toplevel):
    def __init__(self, parent, task_id=None, on_save=None, preset_title=""):
        super().__init__(parent)
        self.task_id = task_id
        self.on_save = on_save
        self.task_data = storage.get_task(task_id) if task_id else None
        self.preset_title = preset_title
        self._subtask_entries = []

        self._setup_window()
        self._build_ui()
        if self.task_data:
            self._populate(self.task_data)
        elif preset_title:
            self.title_var.set(preset_title)

        self.grab_set()
        self.focus_set()
        self.wait_window(self)

    def _setup_window(self):
        title = get_text("edit") if self.task_id else get_text("new_task")
        self.title(title)
        self.configure(bg=c("content_bg"))
        self.resizable(True, True)
        w, h = 520, 580
        sw = self.winfo_screenwidth()
        sh = self.winfo_screenheight()
        x = (sw - w) // 2
        y = (sh - h) // 2
        self.geometry(f"{w}x{h}+{x}+{y}")
        self.minsize(400, 440)
        self.protocol("WM_DELETE_WINDOW", self.destroy)

    def _lbl(self, parent, key):
        return tk.Label(parent, text=get_text(key) + ":",
                        bg=c("content_bg"), fg=c("text_secondary"),
                        font=("Segoe UI", 9))

    def _entry(self, parent, var, justify="left"):
        return tk.Entry(parent, textvariable=var,
                        bg=c("input_bg"), fg=c("input_fg"),
                        insertbackground=c("input_fg"),
                        relief=tk.FLAT, bd=1,
                        font=("Segoe UI", 10), justify=justify)

    def _build_ui(self):
        lang = get_language()

        canvas = tk.Canvas(self, bg=c("content_bg"), highlightthickness=0)
        scrollbar = tk.Scrollbar(self, orient="vertical", command=canvas.yview)
        canvas.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.inner = tk.Frame(canvas, bg=c("content_bg"))
        window = canvas.create_window((0, 0), window=self.inner, anchor="nw")

        def on_configure(e):
            canvas.configure(scrollregion=canvas.bbox("all"))
            canvas.itemconfig(window, width=canvas.winfo_width())
        self.inner.bind("<Configure>", on_configure)
        canvas.bind("<Configure>", lambda e: canvas.itemconfig(window, width=e.width))

        pad = {"padx": 16, "pady": 4}

        self._lbl(self.inner, "task_title").pack(anchor="w", **pad)
        self.title_var = tk.StringVar()
        self._entry(self.inner, self.title_var).pack(fill=tk.X, padx=16, pady=2, ipady=7)

        self._lbl(self.inner, "task_description").pack(anchor="w", **pad)
        desc_frame = tk.Frame(self.inner, bg=c("input_border"), bd=1)
        desc_frame.pack(fill=tk.X, padx=16, pady=2)
        self.desc_text = tk.Text(desc_frame, height=3, bg=c("input_bg"), fg=c("input_fg"),
                                 insertbackground=c("input_fg"),
                                 relief=tk.FLAT, bd=0, font=("Segoe UI", 10), wrap=tk.WORD)
        self.desc_text.pack(fill=tk.X, padx=4, pady=4)

        row1 = tk.Frame(self.inner, bg=c("content_bg"))
        row1.pack(fill=tk.X, padx=16, pady=4)

        left1 = tk.Frame(row1, bg=c("content_bg"))
        left1.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 8))
        self._lbl(left1, "priority").pack(anchor="w", pady=(0, 2))
        self.priority_var = tk.StringVar(value="medium")
        prio_frame = tk.Frame(left1, bg=c("content_bg"))
        prio_frame.pack(fill=tk.X)
        for p, label in [("high", get_text("high")), ("medium", get_text("medium")), ("low", get_text("low"))]:
            rb = tk.Radiobutton(prio_frame, text=label, variable=self.priority_var,
                                value=p, bg=c("content_bg"), fg=c("text_primary"),
                                activebackground=c("content_bg"), selectcolor=c("accent"),
                                font=("Segoe UI", 9))
            rb.pack(side=tk.LEFT, padx=4)

        right1 = tk.Frame(row1, bg=c("content_bg"))
        right1.pack(side=tk.RIGHT, fill=tk.X)
        self._lbl(right1, "due_date").pack(anchor="w", pady=(0, 2))
        self.due_var = tk.StringVar()
        self._entry(right1, self.due_var).pack(fill=tk.X, ipady=5)
        tk.Label(right1, text=get_text("date_format"),
                 bg=c("content_bg"), fg=c("text_muted"), font=("Segoe UI", 7)).pack(anchor="w")

        row2 = tk.Frame(self.inner, bg=c("content_bg"))
        row2.pack(fill=tk.X, padx=16, pady=4)

        left2 = tk.Frame(row2, bg=c("content_bg"))
        left2.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 8))
        self._lbl(left2, "category").pack(anchor="w", pady=(0, 2))
        self.category_var = tk.StringVar(value="Personal")
        categories = [c_["name"] for c_ in storage.get_categories()]
        cat_cb = ttk.Combobox(left2, textvariable=self.category_var,
                              values=categories, state="readonly",
                              font=("Segoe UI", 10))
        cat_cb.pack(fill=tk.X)

        right2 = tk.Frame(row2, bg=c("content_bg"))
        right2.pack(side=tk.RIGHT, fill=tk.X)
        self._lbl(right2, "status").pack(anchor="w", pady=(0, 2))
        self.status_var = tk.StringVar(value="pending")
        status_cb = ttk.Combobox(right2, textvariable=self.status_var,
                                 values=["pending", "in_progress", "done"],
                                 state="readonly", font=("Segoe UI", 10))
        status_cb.pack(fill=tk.X)

        self._lbl(self.inner, "subtasks").pack(anchor="w", **pad)
        self.subtask_frame = tk.Frame(self.inner, bg=c("content_bg"))
        self.subtask_frame.pack(fill=tk.X, padx=16, pady=2)

        self._existing_subtasks = []
        if self.task_id:
            subs = storage.get_subtasks(self.task_id)
            for sub in subs:
                self._add_subtask_row(sub["title"], sub["id"], sub["completed"])

        add_sub_frame = tk.Frame(self.inner, bg=c("content_bg"))
        add_sub_frame.pack(fill=tk.X, padx=16, pady=4)
        self.new_subtask_var = tk.StringVar()
        new_sub_entry = tk.Entry(add_sub_frame, textvariable=self.new_subtask_var,
                                 bg=c("input_bg"), fg=c("input_fg"),
                                 insertbackground=c("input_fg"),
                                 relief=tk.FLAT, bd=1, font=("Segoe UI", 9))
        new_sub_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, ipady=5)
        new_sub_entry.insert(0, get_text("add_subtask"))
        new_sub_entry.bind("<FocusIn>", lambda e: new_sub_entry.delete(0, tk.END)
                           if new_sub_entry.get() == get_text("add_subtask") else None)
        new_sub_entry.bind("<Return>", lambda e: self._add_new_subtask())
        add_sub_btn = tk.Button(add_sub_frame, text="+",
                                bg=c("accent"), fg="#FFFFFF",
                                relief=tk.FLAT, cursor="hand2",
                                font=("Segoe UI", 10, "bold"), padx=10,
                                command=self._add_new_subtask)
        add_sub_btn.pack(side=tk.LEFT, padx=(4, 0))

        btn_frame = tk.Frame(self.inner, bg=c("content_bg"))
        btn_frame.pack(fill=tk.X, padx=16, pady=(8, 16))

        tk.Button(btn_frame, text=get_text("save"),
                  bg=c("accent"), fg="#FFFFFF",
                  relief=tk.FLAT, cursor="hand2",
                  font=("Segoe UI", 10, "bold"),
                  padx=20, pady=7,
                  command=self._on_save).pack(side=tk.RIGHT, padx=(8, 0))

        tk.Button(btn_frame, text=get_text("cancel"),
                  bg=c("border"), fg=c("text_primary"),
                  relief=tk.FLAT, cursor="hand2",
                  font=("Segoe UI", 10),
                  padx=20, pady=7,
                  command=self.destroy).pack(side=tk.RIGHT)

    def _add_subtask_row(self, title, sub_id=None, completed=False):
        row = tk.Frame(self.subtask_frame, bg=c("content_bg"))
        row.pack(fill=tk.X, pady=1)
        var = tk.BooleanVar(value=completed)
        chk = tk.Checkbutton(row, variable=var, bg=c("content_bg"),
                             activebackground=c("content_bg"), cursor="hand2")
        chk.pack(side=tk.LEFT)
        lbl = tk.Label(row, text=title, bg=c("content_bg"), fg=c("text_primary"),
                       font=("Segoe UI", 9), anchor="w")
        lbl.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self._existing_subtasks.append({"id": sub_id, "title": title,
                                        "var": var, "row": row})

    def _add_new_subtask(self):
        title = self.new_subtask_var.get().strip()
        if title and title != get_text("add_subtask"):
            if self.task_id:
                sub = storage.add_subtask(self.task_id, title)
                self._add_subtask_row(title, sub["id"])
            else:
                self._add_subtask_row(title)
            self.new_subtask_var.set("")

    def _populate(self, task):
        self.title_var.set(task.get("title", ""))
        self.desc_text.delete("1.0", tk.END)
        self.desc_text.insert("1.0", task.get("description", ""))
        self.priority_var.set(task.get("priority", "medium"))
        self.due_var.set(task.get("due_date") or "")
        self.category_var.set(task.get("category", "Personal"))
        self.status_var.set(task.get("status", "pending"))

    def _on_save(self):
        title = self.title_var.get().strip()
        if not title:
            return
        desc = self.desc_text.get("1.0", tk.END).rstrip("\n")
        priority = self.priority_var.get()
        due_date = self.due_var.get().strip() or None
        category = self.category_var.get()
        status = self.status_var.get()
        completed = status == "done"

        if self.task_id:
            storage.update_task(self.task_id, title=title, description=desc,
                                priority=priority, due_date=due_date,
                                category=category, status=status,
                                completed=completed)
            task_id = self.task_id
        else:
            task = storage.create_task(title=title, description=desc,
                                       priority=priority, due_date=due_date,
                                       category=category)
            task_id = task["id"]
            for sub_info in self._existing_subtasks:
                storage.add_subtask(task_id, sub_info["title"])

        if self.on_save:
            self.on_save(task_id)
        self.destroy()


class TaskView(tk.Frame):
    def __init__(self, parent, **kwargs):
        super().__init__(parent, **kwargs)
        self._active_filter = "all"
        self._search_query = ""
        self._configure()
        self._build()
        self.load_tasks()

    def _configure(self):
        self.configure(bg=c("content_bg"))

    def _build(self):
        self.quick_add = QuickAddBar(self, on_add=self._on_quick_add)
        self.quick_add.pack(fill=tk.X, pady=(0, 1))

        tk.Frame(self, bg=c("border_light"), height=1).pack(fill=tk.X)

        self.filter_bar = FilterBar(
            self,
            on_filter_change=self._on_filter_change,
            on_search=self._on_search
        )
        self.filter_bar.pack(fill=tk.X, pady=(0, 1))

        tk.Frame(self, bg=c("border_light"), height=1).pack(fill=tk.X)

        list_outer = tk.Frame(self, bg=c("content_bg"))
        list_outer.pack(fill=tk.BOTH, expand=True)

        self.canvas = tk.Canvas(list_outer, bg=c("content_bg"), highlightthickness=0)
        scrollbar = tk.Scrollbar(list_outer, orient="vertical", command=self.canvas.yview)
        self.canvas.configure(yscrollcommand=scrollbar.set)

        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.task_list_frame = tk.Frame(self.canvas, bg=c("content_bg"))
        self._window = self.canvas.create_window((0, 0), window=self.task_list_frame, anchor="nw")

        self.task_list_frame.bind("<Configure>", self._on_frame_configure)
        self.canvas.bind("<Configure>", self._on_canvas_configure)
        self.canvas.bind("<MouseWheel>", self._on_mousewheel)
        self.canvas.bind("<Button-4>", self._on_mousewheel)
        self.canvas.bind("<Button-5>", self._on_mousewheel)

        self.empty_label = tk.Label(
            self.task_list_frame, text=get_text("no_tasks"),
            bg=c("content_bg"), fg=c("text_muted"),
            font=("Segoe UI", 12)
        )

    def _on_frame_configure(self, e):
        self.canvas.configure(scrollregion=self.canvas.bbox("all"))

    def _on_canvas_configure(self, e):
        self.canvas.itemconfig(self._window, width=e.width)

    def _on_mousewheel(self, event):
        if event.num == 4:
            self.canvas.yview_scroll(-1, "units")
        elif event.num == 5:
            self.canvas.yview_scroll(1, "units")
        else:
            self.canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

    def _on_quick_add(self, title=""):
        TaskEditorDialog(
            self, task_id=None, on_save=self._on_task_saved,
            preset_title=title
        )

    def _on_filter_change(self, filter_type):
        self._active_filter = filter_type
        self.load_tasks()

    def _on_search(self, query):
        self._search_query = query
        self.load_tasks()

    def _on_task_saved(self, task_id):
        self.load_tasks()

    def _on_task_action(self, action, task_id):
        if action == "toggle":
            storage.toggle_task_complete(task_id)
            self.load_tasks()
        elif action == "edit":
            TaskEditorDialog(self, task_id=task_id, on_save=self._on_task_saved)
        elif action == "delete":
            if messagebox.askyesno(get_text("delete"), get_text("confirm_delete")):
                storage.delete_task(task_id)
                self.load_tasks()

    def load_tasks(self):
        for widget in self.task_list_frame.winfo_children():
            widget.destroy()

        search = self._search_query if self._search_query.strip() else None
        tasks = storage.get_all_tasks(
            archived=False,
            filter_type=self._active_filter,
            search=search
        )

        if not tasks:
            self.empty_label = tk.Label(
                self.task_list_frame, text=get_text("no_tasks"),
                bg=c("content_bg"), fg=c("text_muted"),
                font=("Segoe UI", 12), pady=40
            )
            self.empty_label.pack()
            return

        for task in tasks:
            card = TaskCard(
                self.task_list_frame, task,
                on_action=self._on_task_action,
                bg=c("card_bg")
            )
            card.pack(fill=tk.X, padx=12, pady=4)
            card.bind("<Double-Button-1>",
                      lambda e, tid=task["id"]: TaskEditorDialog(
                          self, task_id=tid, on_save=self._on_task_saved))

        self.canvas.update_idletasks()
        self.canvas.configure(scrollregion=self.canvas.bbox("all"))

    def apply_theme(self):
        self._configure()
        self.load_tasks()
