from storage.database import get_setting, set_setting

THEMES = {
    "light": {
        "bg": "#F5F5F0",
        "sidebar_bg": "#2C3E50",
        "sidebar_fg": "#ECF0F1",
        "sidebar_hover": "#34495E",
        "sidebar_active": "#1ABC9C",
        "content_bg": "#F5F5F0",
        "toolbar_bg": "#FFFFFF",
        "toolbar_fg": "#2C3E50",
        "toolbar_border": "#E0E0E0",
        "wall_bg": "#E8E8E0",
        "wall_grid": "#D5D5C8",
        "text_primary": "#1A1A1A",
        "text_secondary": "#666666",
        "text_muted": "#999999",
        "border": "#D0D0D0",
        "border_light": "#E8E8E8",
        "button_bg": "#2C3E50",
        "button_fg": "#FFFFFF",
        "button_hover": "#34495E",
        "accent": "#1ABC9C",
        "accent_hover": "#16A085",
        "danger": "#E74C3C",
        "warning": "#F39C12",
        "success": "#27AE60",
        "card_bg": "#FFFFFF",
        "card_border": "#E0E0E0",
        "card_shadow": "#00000020",
        "input_bg": "#FFFFFF",
        "input_fg": "#1A1A1A",
        "input_border": "#CCCCCC",
        "note_shadow": "#00000030",
        "scrollbar": "#BBBBBB",
        "tag_bg": "#E8F4FD",
        "tag_fg": "#2980B9",
        "priority_high": "#E74C3C",
        "priority_medium": "#F39C12",
        "priority_low": "#27AE60",
        "completed_fg": "#999999",
    },
    "dark": {
        "bg": "#1A1A2E",
        "sidebar_bg": "#16213E",
        "sidebar_fg": "#E0E0E0",
        "sidebar_hover": "#1E3A5F",
        "sidebar_active": "#0F9B8E",
        "content_bg": "#1A1A2E",
        "toolbar_bg": "#16213E",
        "toolbar_fg": "#E0E0E0",
        "toolbar_border": "#2A2A4A",
        "wall_bg": "#141428",
        "wall_grid": "#1E1E38",
        "text_primary": "#E8E8E8",
        "text_secondary": "#AAAAAA",
        "text_muted": "#777777",
        "border": "#2A2A4A",
        "border_light": "#222240",
        "button_bg": "#0F9B8E",
        "button_fg": "#FFFFFF",
        "button_hover": "#0D8578",
        "accent": "#0F9B8E",
        "accent_hover": "#0D8578",
        "danger": "#C0392B",
        "warning": "#D68910",
        "success": "#1E8449",
        "card_bg": "#1E1E3A",
        "card_border": "#2A2A4A",
        "card_shadow": "#00000050",
        "input_bg": "#252545",
        "input_fg": "#E8E8E8",
        "input_border": "#3A3A5A",
        "note_shadow": "#00000060",
        "scrollbar": "#444460",
        "tag_bg": "#1A2A3A",
        "tag_fg": "#5DADE2",
        "priority_high": "#C0392B",
        "priority_medium": "#D68910",
        "priority_low": "#1E8449",
        "completed_fg": "#666688",
    }
}

NOTE_COLORS = {
    "light": {
        "#FFE066": ("Yellow", "#FFE066", "#5C4A00"),
        "#FFB3C1": ("Pink", "#FFB3C1", "#7A1E2E"),
        "#B3D9FF": ("Blue", "#B3D9FF", "#0D3D6B"),
        "#B8F0B8": ("Green", "#B8F0B8", "#1A5C1A"),
        "#FFD4A8": ("Orange", "#FFD4A8", "#7A3500"),
        "#DDB3FF": ("Purple", "#DDB3FF", "#4A0080"),
        "#F5F5F0": ("White", "#F5F5F0", "#333333"),
    },
    "dark": {
        "#8A6E00": ("Yellow", "#8A6E00", "#FFE566"),
        "#8A2040": ("Pink", "#8A2040", "#FFB3C6"),
        "#0D4A8A": ("Blue", "#0D4A8A", "#B3D9FF"),
        "#1A5C1A": ("Green", "#1A5C1A", "#B8F0B8"),
        "#7A3500": ("Orange", "#7A3500", "#FFD4A8"),
        "#4A0080": ("Purple", "#4A0080", "#DDB3FF"),
        "#2A2A4A": ("White", "#2A2A4A", "#E0E0E0"),
    }
}

_current_theme = "light"


def get_theme_name() -> str:
    return _current_theme


def set_theme(name: str):
    global _current_theme
    if name in THEMES:
        _current_theme = name
        set_setting("theme", name)


def load_theme():
    global _current_theme
    saved = get_setting("theme", "light")
    _current_theme = saved if saved in THEMES else "light"
    return _current_theme


def c(key: str) -> str:
    return THEMES.get(_current_theme, THEMES["light"]).get(key, "#000000")


def get_note_colors() -> dict:
    return NOTE_COLORS.get(_current_theme, NOTE_COLORS["light"])
