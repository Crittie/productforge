"""Chapter renderer — multi-paragraph ebook content with automatic page overflow.

Handles the core content pages of an ebook. Unlike single-page renderers,
chapters automatically flow across multiple pages when content exceeds
available space. Never splits a paragraph across pages.
"""

from __future__ import annotations

from reportlab.lib.utils import simpleSplit

from ..context import RenderContext
from ..models import ProductConfig


def render(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """Render a chapter (potentially multi-page).

    data fields:
        chapter_number: str (optional) — e.g. "1" or "Chapter 1"
        chapter_title: str (optional) — e.g. "Getting Started"
        paragraphs: list[str] — body text ("" for blank line spacing)
    """
    layout = config.design.layout

    if layout == "editorial":
        _render_editorial(ctx, data, config)
    elif layout == "warm":
        _render_warm(ctx, data, config)
    else:
        _render_clean(ctx, data, config)


def _text_height(text: str, font: str, size: float, max_width: float,
                 line_height_factor: float = 1.65) -> float:
    """Calculate the height a wrapped text block will consume."""
    lines = simpleSplit(text, font, size, max_width)
    return len(lines) * size * line_height_factor


# ---------------------------------------------------------------------------
# Accent sidebar (shared design element)
# ---------------------------------------------------------------------------

def _draw_sidebar(ctx: RenderContext, color_name: str = "accent",
                  width: float = 3, x_offset: float = 28) -> None:
    """Draw a thin vertical accent sidebar on the left edge."""
    ctx.c.setFillColor(ctx.color(color_name))
    ctx.c.rect(x_offset, ctx.margin_bottom, width,
               ctx.H - ctx.margin_top - ctx.margin_bottom, fill=1, stroke=0)


# ---------------------------------------------------------------------------
# Editorial layout
# ---------------------------------------------------------------------------

def _render_editorial(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    ctx.start_page("background")

    chapter_number = data.get("chapter_number", "")
    chapter_title = data.get("chapter_title", "")
    paragraphs = data.get("paragraphs", [])

    body_font = ctx.font("body")
    body_size = 11
    body_color = ctx.color("earth")
    max_w = ctx.text_area_w - 60
    para_gap = 4
    blank_gap = 14
    bottom_limit = ctx.margin_bottom + 30

    y = ctx.H - ctx.margin_top - 40

    # Chapter number
    if chapter_number:
        ctx.c.setFont(ctx.font("mono"), 9)
        ctx.c.setFillColor(ctx.color("accent"))
        ctx.c.drawString(ctx.margin_left, y, chapter_number)
        y -= 30

    # Chapter title
    if chapter_title:
        y = ctx.draw_title_fitted(
            chapter_title, ctx.font("heading"), max_size=20, min_size=14,
            color=ctx.color("ink"), x=ctx.margin_left, y=y,
            max_width=max_w, line_height_factor=1.4,
        )
        # Decorative accent line under title
        ctx.draw_accent_line(
            ctx.margin_left, y - 4,
            ctx.margin_left + 60, "accent", width=1.5,
        )
        y -= 20

    # Body paragraphs with page overflow
    for para in paragraphs:
        if para == "":
            y -= blank_gap
            continue

        needed = _text_height(para, body_font, body_size, max_w)

        # If paragraph won't fit, start a new page
        if y - needed < bottom_limit:
            ctx.draw_page_number()
            ctx.new_page()
            ctx.start_page("background")
            y = ctx.H - ctx.margin_top - 40

        y = ctx.draw_text_wrapped(
            para, body_font, body_size, body_color,
            ctx.margin_left, y, max_width=max_w,
        )
        y -= para_gap

    ctx.draw_page_number()
    ctx.new_page()


# ---------------------------------------------------------------------------
# Clean layout
# ---------------------------------------------------------------------------

def _render_clean(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    from reportlab.lib.units import inch

    ctx.start_page("background")
    ctx.draw_header_bar()
    _draw_sidebar(ctx, "accent", width=3, x_offset=28)

    chapter_number = data.get("chapter_number", "")
    chapter_title = data.get("chapter_title", "")
    paragraphs = data.get("paragraphs", [])

    body_font = ctx.font("body")
    body_size = 11
    body_color = ctx.color("ink")
    max_w = ctx.text_area_w
    para_gap = 6
    blank_gap = 12
    bottom_limit = ctx.margin_bottom + 30
    line_height = 1.85  # More generous line spacing for readability

    y = ctx.H - 0.8 * inch

    # Chapter number badge
    if chapter_number:
        ctx.draw_numbered_circle(
            ctx.margin_left + 0.2 * inch, y - 0.05 * inch,
            str(chapter_number), ctx.color("accent"), ctx.color("background"),
            radius=15, font_size=12,
        )
        y -= 0.5 * inch

    # Chapter title — auto-fitted
    if chapter_title:
        y = ctx.draw_title_fitted(
            chapter_title, "Helvetica-Bold", max_size=20, min_size=14,
            color=ctx.color("ink"), x=ctx.margin_left, y=y,
            max_width=max_w,
        )
        # Decorative line under title
        ctx.draw_accent_line(
            ctx.margin_left, y - 4,
            ctx.margin_left + 80, "accent", width=2,
        )
        y -= 20

    is_first_page = True

    # Body paragraphs
    for para in paragraphs:
        if para == "":
            y -= blank_gap
            continue

        needed = _text_height(para, body_font, body_size, max_w,
                              line_height_factor=line_height)

        if y - needed < bottom_limit:
            ctx.draw_page_number(style="center")
            ctx.new_page()
            ctx.start_page("background")
            ctx.draw_header_bar()
            _draw_sidebar(ctx, "accent", width=3, x_offset=28)
            y = ctx.H - 0.8 * inch
            is_first_page = False

        y = ctx.draw_text_wrapped(
            para, body_font, body_size, body_color,
            ctx.margin_left, y, max_width=max_w,
            line_height_factor=line_height,
        )
        y -= para_gap

    ctx.draw_page_number(style="center")
    ctx.new_page()


# ---------------------------------------------------------------------------
# Warm layout
# ---------------------------------------------------------------------------

def _render_warm(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    ctx.start_page("primary")

    # Accent line at top
    ctx.c.setStrokeColor(ctx.color("accent"))
    ctx.c.setLineWidth(0.5)
    ctx.c.line(72, ctx.H - 50, ctx.W - 72, ctx.H - 50)

    # Thin sidebar
    _draw_sidebar(ctx, "accent", width=2, x_offset=30)

    chapter_number = data.get("chapter_number", "")
    chapter_title = data.get("chapter_title", "")
    paragraphs = data.get("paragraphs", [])

    body_font = ctx.font("body")
    body_size = 11
    body_color = ctx.color("background")
    max_w = ctx.text_area_w
    para_gap = 6
    blank_gap = 12
    bottom_limit = ctx.margin_bottom + 40
    line_height = 1.85

    y = ctx.H - 90

    # Chapter number label
    if chapter_number:
        ctx.c.setFont("Helvetica", 11)
        ctx.c.setFillColor(ctx.color("accent"))
        ctx.c.drawString(ctx.margin_left, y, f"CHAPTER {chapter_number}")
        y -= 30

    # Chapter title
    if chapter_title:
        y = ctx.draw_title_fitted(
            chapter_title, "Helvetica-Bold", max_size=20, min_size=14,
            color=ctx.color("background"), x=ctx.margin_left, y=y,
            max_width=max_w,
        )
        # Decorative accent dash
        ctx.c.setStrokeColor(ctx.color("accent"))
        ctx.c.setLineWidth(2)
        ctx.c.line(ctx.margin_left, y - 4, ctx.margin_left + 50, y - 4)
        y -= 24

    # Body paragraphs
    for para in paragraphs:
        if para == "":
            y -= blank_gap
            continue

        needed = _text_height(para, body_font, body_size, max_w,
                              line_height_factor=line_height)

        if y - needed < bottom_limit:
            ctx.draw_page_number(style="center")
            ctx.new_page()
            ctx.start_page("primary")
            # Re-draw decorative elements on continuation pages
            ctx.c.setStrokeColor(ctx.color("accent"))
            ctx.c.setLineWidth(0.5)
            ctx.c.line(72, ctx.H - 50, ctx.W - 72, ctx.H - 50)
            _draw_sidebar(ctx, "accent", width=2, x_offset=30)
            y = ctx.H - 80

        y = ctx.draw_text_wrapped(
            para, body_font, body_size, body_color,
            ctx.margin_left, y, max_width=max_w,
            line_height_factor=line_height,
        )
        y -= para_gap

    # Footer
    if config.author:
        ctx.c.setFont("Helvetica", 7)
        ctx.c.setFillColor(ctx.color("muted"))
        ctx.c.drawCentredString(ctx.W / 2, 36, config.author)

    ctx.draw_page_number(style="center")
    ctx.new_page()
