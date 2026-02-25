"""Font registration with fallback logic."""

from __future__ import annotations

import os
import warnings

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Built-in fonts directory (next to productforge package)
_BUILTIN_FONT_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "..", "fonts",
)
_BUILTIN_FONT_DIR = os.path.normpath(_BUILTIN_FONT_DIR)

# Font file mapping: registered name -> filename
BUNDLED_FONTS: dict[str, str] = {
    "Italiana": "Italiana-Regular.ttf",
    "CrimsonPro": "CrimsonPro-Regular.ttf",
    "CrimsonProItalic": "CrimsonPro-Italic.ttf",
    "DMMono": "DMMono-Regular.ttf",
}

# Fallback mapping when a custom font is missing
FALLBACKS: dict[str, str] = {
    "Italiana": "Helvetica",
    "CrimsonPro": "Helvetica",
    "CrimsonProItalic": "Helvetica-Oblique",
    "DMMono": "Courier",
}

_registered: set[str] = set()


def register_bundled_fonts(font_dir: str | None = None) -> dict[str, str]:
    """Register all bundled fonts. Returns a mapping of name -> actual registered name.

    If a font file is missing, falls back to a built-in ReportLab font
    and emits a warning.
    """
    search_dir = font_dir or _BUILTIN_FONT_DIR
    resolved: dict[str, str] = {}

    for name, filename in BUNDLED_FONTS.items():
        if name in _registered:
            resolved[name] = name
            continue

        path = os.path.join(search_dir, filename)
        if os.path.isfile(path):
            try:
                pdfmetrics.registerFont(TTFont(name, path))
                _registered.add(name)
                resolved[name] = name
            except Exception as exc:
                fallback = FALLBACKS.get(name, "Helvetica")
                warnings.warn(
                    f"Failed to register font '{name}' from {path}: {exc}. "
                    f"Using {fallback}.",
                    stacklevel=2,
                )
                resolved[name] = fallback
        else:
            fallback = FALLBACKS.get(name, "Helvetica")
            warnings.warn(
                f"Font file not found: {path}. Using {fallback}.",
                stacklevel=2,
            )
            resolved[name] = fallback

    return resolved


def resolve_font(name: str) -> str:
    """Resolve a font name, returning the registered name or a fallback."""
    if name in _registered:
        return name
    return FALLBACKS.get(name, name)
