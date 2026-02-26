"""Cover page renderer.

Reference: White Space generate_workbook.py lines 209-234.
Supports editorial (right-aligned), clean (full-bleed), and warm (centered dark) layouts.
"""

from __future__ import annotations

import os

from reportlab.lib.colors import Color
from reportlab.lib.utils import ImageReader

from ..context import RenderContext, hex_to_color
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


def _draw_gradient_rect(ctx: RenderContext, x: float, y: float,
                        w: float, h: float,
                        color_top: Color, color_bottom: Color,
                        steps: int = 60) -> None:
    """Draw a vertical gradient rectangle from color_top to color_bottom."""
    step_h = h / steps
    for i in range(steps):
        t = i / (steps - 1) if steps > 1 else 0
        r = color_top.red + (color_bottom.red - color_top.red) * t
        g = color_top.green + (color_bottom.green - color_top.green) * t
        b = color_top.blue + (color_bottom.blue - color_top.blue) * t
        ctx.c.setFillColor(Color(r, g, b))
        ctx.c.rect(x, y + h - (i + 1) * step_h, w, step_h + 0.5,
                   fill=1, stroke=0)


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

    # Title — right-aligned, auto-fitted
    y = ctx.draw_title_fitted(
        title, ctx.font("heading"), max_size=28, min_size=18,
        color=ctx.color("ink"), x=ctx.margin_left, y=260,
        align="right",
    )

    # Sage accent line
    right_x = ctx.W - ctx.margin_right
    ctx.draw_accent_line(right_x - 180, y - 2, right_x, "accent")

    # Subtitle lines
    y -= 22
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
    """Full-bleed gradient cover, corner logo, bold title."""
    title = data.get("title", config.title)
    subtitles = data.get("subtitle", [])
    if isinstance(subtitles, str):
        subtitles = [subtitles]
    badge = data.get("badge", "")
    author = data.get("author", config.author)
    logo_path = data.get("logo_path", "")

    from reportlab.lib.units import inch

    # Full-page gradient — seamless primary to secondary
    ctx._page_num += 1
    primary = ctx.color("primary")
    secondary = ctx.color("secondary")
    _draw_gradient_rect(ctx, 0, 0, ctx.W, ctx.H, primary, secondary, steps=100)

    # Logo — top-left corner, tasteful size
    if logo_path:
        _draw_logo(ctx, logo_path, ctx.margin_left, ctx.H - 0.6 * inch,
                   align="left", max_w=60, max_h=60)

    # Thin accent line — visual anchor
    accent_y = ctx.H * 0.58
    ctx.c.setFillColor(ctx.color("accent"))
    ctx.c.rect(ctx.margin_left, accent_y, ctx.text_area_w * 0.3, 3,
               fill=1, stroke=0)

    # Badge
    if badge:
        ctx.c.setFillColor(ctx.color("accent"))
        ctx.c.roundRect(
            ctx.margin_left, accent_y + 16,
            1.5 * inch, 0.35 * inch, 3, fill=1, stroke=0,
        )
        ctx.c.setFillColor(ctx.color("background"))
        ctx.c.setFont(ctx.font("heading"), 11)
        ctx.c.drawString(ctx.margin_left + 0.25 * inch, accent_y + 26, badge)

    # Title — large, left-aligned, below accent line
    title_y = accent_y - 30
    title_text = " ".join(title) if isinstance(title, list) else title
    y = ctx.draw_title_fitted(
        title_text, ctx.font("heading"), max_size=36, min_size=22,
        color=ctx.color("background"), x=ctx.margin_left, y=title_y,
        max_width=ctx.text_area_w,
    )

    # Subtitle
    if subtitles:
        y -= 12
        ctx.c.setFont(ctx.font("body"), 13)
        ctx.c.setFillColor(ctx.color("muted"))
        for line in subtitles:
            ctx.c.drawString(ctx.margin_left, y, line)
            y -= 20

    # Author + accent line at bottom
    if author:
        ctx.c.setFillColor(ctx.color("muted"))
        ctx.c.setFont(ctx.font("body"), 11)
        ctx.c.drawString(ctx.margin_left, 1.5 * inch, f"By {author}")
        ctx.c.setStrokeColor(ctx.color("accent"))
        ctx.c.setLineWidth(2)
        ctx.c.line(
            ctx.margin_left, 1.2 * inch,
            ctx.margin_left + 2 * inch, 1.2 * inch,
        )

    ctx.new_page()


def _render_warm(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """Full-page dark gradient, centered title, warm amber accents."""
    title = data.get("title", config.title)
    subtitles = data.get("subtitle", [])
    if isinstance(subtitles, str):
        subtitles = [subtitles]
    brand = data.get("brand", "")
    logo_path = data.get("logo_path", "")

    # Full-page gradient — seamless dark transition
    ctx._page_num += 1
    primary = ctx.color("primary")
    secondary = ctx.color("secondary")
    _draw_gradient_rect(ctx, 0, 0, ctx.W, ctx.H, primary, secondary, steps=100)

    # Accent lines — top and bottom framing
    ctx.c.setStrokeColor(ctx.color("accent"))
    ctx.c.setLineWidth(1.5)
    ctx.c.line(60, ctx.H - 50, ctx.W - 60, ctx.H - 50)
    ctx.c.line(60, 50, ctx.W - 60, 50)

    # Logo — top-left corner
    if logo_path:
        _draw_logo(ctx, logo_path, 60, ctx.H - 60,
                   align="left", max_w=60, max_h=60)

    # Title — centered, auto-fitted
    y = ctx.H / 2 + 50
    title_text = " ".join(title) if isinstance(title, list) else title
    y = ctx.draw_title_fitted(
        title_text, ctx.font("heading"), max_size=32, min_size=18,
        color=ctx.color("background"), x=ctx.margin_left, y=y,
        align="center",
    )

    # Accent dash under title
    y -= 12
    ctx.c.setStrokeColor(ctx.color("accent"))
    ctx.c.setLineWidth(2)
    ctx.c.line(ctx.W / 2 - 30, y, ctx.W / 2 + 30, y)

    # Subtitle
    y -= 24
    ctx.c.setFont(ctx.font("body"), 13)
    ctx.c.setFillColor(ctx.color("muted"))
    for line in subtitles:
        ctx.c.drawCentredString(ctx.W / 2, y, line)
        y -= 20

    # Brand at bottom
    if brand:
        ctx.c.setFont(ctx.font("body"), 10)
        ctx.c.setFillColor(ctx.color("muted"))
        ctx.c.drawCentredString(ctx.W / 2, 70, brand)

    ctx.new_page()
