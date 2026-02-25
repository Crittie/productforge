"""Cover page renderer.

Reference: White Space generate_workbook.py lines 209-234.
Supports editorial (right-aligned), clean (centered), and warm (centered dark) layouts.
"""

from __future__ import annotations

import os

from reportlab.lib.utils import ImageReader

from ..context import RenderContext
from ..models import ProductConfig


def _draw_logo(ctx: RenderContext, logo_path: str, x: float, y: float,
               max_w: float = 150, max_h: float = 80, align: str = "center") -> float:
    """Draw a logo image, constrained to max dimensions. Returns y after logo."""
    if not logo_path or not os.path.isfile(logo_path):
        return y
    try:
        img = ImageReader(logo_path)
        iw, ih = img.getSize()
        scale = min(max_w / iw, max_h / ih, 1.0)
        draw_w = iw * scale
        draw_h = ih * scale
        if align == "center":
            draw_x = (ctx.W - draw_w) / 2
        elif align == "right":
            draw_x = ctx.W - ctx.margin_right - draw_w
        else:
            draw_x = x
        ctx.c.drawImage(img, draw_x, y - draw_h, draw_w, draw_h, mask="auto")
        return y - draw_h - 16
    except Exception:
        return y


def render(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """Render a cover page.

    data fields:
        title: str (optional, defaults to config.title)
        subtitle: str | list[str] (optional)
        badge: str (optional, e.g. "FREE GUIDE")
        brand: str (optional, e.g. "white space")
        logo_path: str (optional, absolute path to logo image)
    """
    layout = config.design.layout

    if layout == "editorial":
        _render_editorial(ctx, data, config)
    elif layout == "warm":
        _render_warm(ctx, data, config)
    else:
        _render_clean(ctx, data, config)


def _render_editorial(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """Parchment background, right-aligned title in lower third."""
    ctx.start_page("background")

    title = data.get("title", config.title)
    subtitles = data.get("subtitle", [])
    if isinstance(subtitles, str):
        subtitles = [subtitles]
    brand = data.get("brand", "")
    logo_path = data.get("logo_path", "")

    # Logo — right-aligned, upper area
    if logo_path:
        _draw_logo(ctx, logo_path, 0, ctx.H - ctx.margin_top - 20,
                   align="right", max_w=120, max_h=60)

    # Title — right-aligned, lower third
    ctx.c.setFont(ctx.font("heading"), 26)
    ctx.c.setFillColor(ctx.color("ink"))
    ctx.c.drawRightString(ctx.W - ctx.margin_right, 240, title)

    # Sage accent line
    right_x = ctx.W - ctx.margin_right
    ctx.draw_accent_line(right_x - 180, 218, right_x, "accent")

    # Subtitle lines
    y = 195
    ctx.c.setFont(ctx.font("mono"), 8)
    ctx.c.setFillColor(ctx.color("muted"))
    for line in subtitles:
        ctx.c.drawRightString(right_x, y, line)
        y -= 12

    # Brand name
    if brand:
        ctx.c.setFont(ctx.font("mono"), 7)
        ctx.c.setFillColor(ctx.color("muted"))
        ctx.c.drawRightString(right_x, 130, brand)

    ctx.new_page()


def _render_clean(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """Navy background, centered title, badge, accent line."""
    ctx.start_page("primary")

    title = data.get("title", config.title)
    subtitles = data.get("subtitle", [])
    if isinstance(subtitles, str):
        subtitles = [subtitles]
    badge = data.get("badge", "")
    author = data.get("author", config.author)
    logo_path = data.get("logo_path", "")

    from reportlab.lib.units import inch

    # Logo — top center
    if logo_path:
        _draw_logo(ctx, logo_path, 0, ctx.H - 0.8 * inch,
                   align="center", max_w=180, max_h=80)

    # Accent line
    ctx.c.setFillColor(ctx.color("accent"))
    ctx.c.rect(0, ctx.H - 2.5 * inch, ctx.W, 0.15 * inch, fill=1, stroke=0)

    # Badge
    if badge:
        ctx.c.setFillColor(ctx.color("accent"))
        ctx.c.roundRect(
            ctx.margin_left, ctx.H - 3.1 * inch,
            1.5 * inch, 0.35 * inch, 3, fill=1, stroke=0,
        )
        ctx.c.setFillColor(ctx.color("background"))
        ctx.c.setFont("Helvetica-Bold", 11)
        ctx.c.drawString(
            ctx.margin_left + 0.25 * inch,
            ctx.H - 3.0 * inch,
            badge,
        )

    # Title lines
    ctx.c.setFillColor(ctx.color("background"))
    ctx.c.setFont("Helvetica-Bold", 34)
    y = ctx.H - 3.9 * inch
    for line in (title if isinstance(title, list) else [title]):
        ctx.c.drawString(ctx.margin_left, y, line)
        y -= 0.6 * inch

    # Subtitle
    if subtitles:
        ctx.c.setFont("Helvetica", 14)
        ctx.c.setFillColor(ctx.color("muted"))
        y -= 0.1 * inch
        for line in subtitles:
            ctx.c.drawString(ctx.margin_left, y, line)
            y -= 20

    # Author at bottom
    if author:
        ctx.c.setFillColor(ctx.color("muted"))
        ctx.c.setFont("Helvetica", 11)
        ctx.c.drawString(ctx.margin_left, 1.5 * inch, f"By {author}")
        ctx.c.setStrokeColor(ctx.color("accent"))
        ctx.c.setLineWidth(2)
        ctx.c.line(
            ctx.margin_left, 1.2 * inch,
            ctx.margin_left + 2 * inch, 1.2 * inch,
        )

    ctx.new_page()


def _render_warm(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """Dark navy background, centered title, warm amber accents."""
    ctx.start_page("primary")

    title = data.get("title", config.title)
    subtitles = data.get("subtitle", [])
    if isinstance(subtitles, str):
        subtitles = [subtitles]
    brand = data.get("brand", "")
    logo_path = data.get("logo_path", "")

    # Logo — centered above title
    if logo_path:
        _draw_logo(ctx, logo_path, 0, ctx.H / 2 + 140,
                   align="center", max_w=180, max_h=95)

    # Title — centered
    y = ctx.H / 2 + 40
    ctx.c.setFont("Helvetica-Bold", 30)
    ctx.c.setFillColor(ctx.color("background"))
    title_lines = title if isinstance(title, list) else [title]
    for line in title_lines:
        ctx.c.drawCentredString(ctx.W / 2, y, line)
        y -= 40

    # Subtitle
    y -= 10
    ctx.c.setFont("Helvetica", 13)
    ctx.c.setFillColor(ctx.color("secondary"))
    for line in subtitles:
        ctx.c.drawCentredString(ctx.W / 2, y, line)
        y -= 20

    # Brand at bottom
    if brand:
        ctx.c.setFont("Helvetica", 10)
        ctx.c.setFillColor(ctx.color("muted"))
        ctx.c.drawCentredString(ctx.W / 2, 60, brand)

    ctx.new_page()
