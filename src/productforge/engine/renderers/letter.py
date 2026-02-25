"""Personal letter / intro page renderer.

Reference: White Space generate_workbook.py lines 237-263.
"""

from __future__ import annotations

from ..context import RenderContext
from ..models import ProductConfig


def render(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """Render a personal letter page.

    data fields:
        paragraphs: list[str] — text paragraphs ("" for blank line spacing)
        sign_off: str — e.g. "— Christie"
    """
    layout = config.design.layout

    if layout == "editorial":
        _render_editorial(ctx, data, config)
    elif layout == "warm":
        _render_warm(ctx, data, config)
    else:
        _render_clean(ctx, data, config)


def _render_editorial(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """Left-aligned letter on parchment. Italiana opening, CrimsonPro body."""
    ctx.start_page("background")

    paragraphs = data.get("paragraphs", [])
    sign_off = data.get("sign_off", "")

    y = ctx.H - ctx.margin_top - 80
    is_first_line = True
    max_w = ctx.text_area_w - 60

    for para in paragraphs:
        if para == "":
            y -= 14
        elif is_first_line:
            y = ctx.draw_text_wrapped(
                para, ctx.font("heading"), 16, ctx.color("ink"),
                ctx.margin_left, y, max_width=max_w,
                line_height_factor=1.65,
            )
            y -= 8
            is_first_line = False
        else:
            y = ctx.draw_text_wrapped(
                para, ctx.font("body"), 11, ctx.color("earth"),
                ctx.margin_left, y, max_width=max_w,
                line_height_factor=1.65,
            )
            y -= 4

    if sign_off:
        y -= 10
        ctx.c.setFont(ctx.font("body_italic"), 11)
        ctx.c.setFillColor(ctx.color("earth"))
        ctx.c.drawString(ctx.margin_left, y, sign_off)

    ctx.draw_page_number()
    ctx.new_page()


def _render_clean(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """White background, header bar, Helvetica body."""
    ctx.start_page("background")
    ctx.draw_header_bar()

    paragraphs = data.get("paragraphs", [])
    sign_off = data.get("sign_off", "")
    heading = data.get("heading", "")

    from reportlab.lib.units import inch

    y = ctx.H - 1.2 * inch

    if heading:
        ctx.c.setFont("Helvetica-Bold", 22)
        ctx.c.setFillColor(ctx.color("ink"))
        ctx.c.drawString(ctx.margin_left, y, heading)
        y -= 0.6 * inch

    ctx.c.setFont("Helvetica", 11)
    ctx.c.setFillColor(ctx.color("ink"))
    for para in paragraphs:
        if para == "":
            y -= 8
        else:
            y = ctx.draw_text_wrapped(
                para, "Helvetica", 11, ctx.color("ink"),
                ctx.margin_left, y,
            )
            y -= 4

    if sign_off:
        y -= 16
        ctx.c.setFont("Helvetica-Bold", 10)
        ctx.c.setFillColor(ctx.color("ink"))
        ctx.c.drawString(ctx.margin_left, y, sign_off)

    ctx.draw_page_number(style="center")
    ctx.new_page()


def _render_warm(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """Dark background, warm typography."""
    ctx.start_page("primary")

    # Accent line at top
    ctx.c.setStrokeColor(ctx.color("accent"))
    ctx.c.setLineWidth(0.5)
    ctx.c.line(72, ctx.H - 50, ctx.W - 72, ctx.H - 50)

    paragraphs = data.get("paragraphs", [])
    sign_off = data.get("sign_off", "")
    heading = data.get("heading", "")

    y = ctx.H - 100

    if heading:
        ctx.c.setFont("Helvetica-Bold", 22)
        ctx.c.setFillColor(ctx.color("background"))
        ctx.c.drawCentredString(ctx.W / 2, y, heading)
        y -= 40

    for para in paragraphs:
        if para == "":
            y -= 10
        else:
            y = ctx.draw_text_wrapped(
                para, "Helvetica", 11, ctx.color("background"),
                ctx.margin_left, y,
            )
            y -= 6

    if sign_off:
        y -= 20
        ctx.c.setFont("Helvetica-Oblique", 11)
        ctx.c.setFillColor(ctx.color("secondary"))
        ctx.c.drawString(ctx.margin_left, y, sign_off)

    ctx.draw_page_number(style="center")
    ctx.new_page()
