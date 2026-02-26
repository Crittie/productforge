"""Writing / journal page renderer with faint lines and margin quotes.

Reference: White Space generate_workbook.py lines 296-339.
"""

from __future__ import annotations

from reportlab.lib.utils import simpleSplit

from ..context import RenderContext
from ..models import ProductConfig


def render(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """Render a writing page with lines and optional margin quote.

    data fields:
        prompt_number: str — reference to the prompt this writing page follows (optional)
        quote: str — margin quote at bottom-left (optional)
        line_spacing: float — spacing between lines (default 28)
    """
    layout = config.design.layout

    if layout == "editorial":
        _render_editorial(ctx, data, config)
    elif layout == "warm":
        _render_warm(ctx, data, config)
    else:
        _render_clean(ctx, data, config)


def _render_editorial(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """Parchment background, faint lines, quote in bottom-left."""
    ctx.start_page("background")

    prompt_number = data.get("prompt_number", "")
    quote = data.get("quote", "")
    line_spacing = data.get("line_spacing", 28)

    # Prompt number reference — top left
    if prompt_number:
        ctx.c.setFont(ctx.font("mono"), 9)
        ctx.c.setFillColor(ctx.color("accent"))
        ctx.c.drawString(ctx.margin_left, ctx.H - ctx.margin_top - 10, prompt_number)

    # Writing lines
    line_start_y = ctx.H - ctx.margin_top - 30
    line_end_y = ctx.margin_bottom + 40
    ctx.draw_writing_lines(line_start_y, line_end_y, spacing=line_spacing)

    # Margin quote — bottom-left
    if quote:
        q_font = ctx.font("body_italic")
        q_size = 8.5
        q_color = ctx.color("earth")

        qx = ctx.margin_left
        qy = ctx.margin_bottom + 5

        ctx.c.setFont(q_font, q_size)
        ctx.c.setFillColor(q_color)
        lines = simpleSplit(quote, q_font, q_size, 260)
        # Draw bottom-up so multi-line quotes stack correctly
        for line in reversed(lines):
            ctx.c.drawString(qx, qy, line)
            qy += q_size * 1.5

    ctx.draw_page_number()
    ctx.new_page()


def _render_clean(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """White background, header bar, writing lines."""
    ctx.start_page("background")
    ctx.draw_header_bar()

    prompt_number = data.get("prompt_number", "")
    heading = data.get("heading", "Your Notes")
    line_spacing = data.get("line_spacing", 28)

    from reportlab.lib.units import inch

    y = ctx.H - 1.0 * inch

    if heading:
        ctx.c.setFont(ctx.font("heading"), 14)
        ctx.c.setFillColor(ctx.color("ink"))
        ctx.c.drawString(ctx.margin_left, y, heading)
        y -= 0.5 * inch

    if prompt_number:
        ctx.c.setFont(ctx.font("body"), 10)
        ctx.c.setFillColor(ctx.color("muted"))
        ctx.c.drawString(ctx.margin_left, y, f"Prompt {prompt_number}")
        y -= 0.3 * inch

    ctx.draw_writing_lines(y, ctx.margin_bottom + 40, spacing=line_spacing)

    ctx.draw_page_number(style="center")
    ctx.new_page()


def _render_warm(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """Dark background, faint writing lines in muted color."""
    ctx.start_page("primary")

    # Accent line at top
    ctx.c.setStrokeColor(ctx.color("accent"))
    ctx.c.setLineWidth(0.5)
    ctx.c.line(72, ctx.H - 50, ctx.W - 72, ctx.H - 50)

    prompt_number = data.get("prompt_number", "")
    quote = data.get("quote", "")
    line_spacing = data.get("line_spacing", 28)

    y = ctx.H - 80

    if prompt_number:
        ctx.c.setFont(ctx.font("body"), 11)
        ctx.c.setFillColor(ctx.color("accent"))
        ctx.c.drawString(ctx.margin_left, y, f"Day {prompt_number}")
        y -= 30

    # Writing lines (use muted color on dark bg)
    ctx.draw_writing_lines(y, ctx.margin_bottom + 50, spacing=line_spacing, color_name="muted")

    # Quote at bottom
    if quote:
        ctx.c.setFont(ctx.font("body_italic"), 8.5)
        ctx.c.setFillColor(ctx.color("secondary"))
        lines = simpleSplit(quote, ctx.font("body_italic"), 8.5, 260)
        qy = ctx.margin_bottom + 10
        for line in reversed(lines):
            ctx.c.drawString(ctx.margin_left, qy, line)
            qy += 13

    # Footer
    ctx.c.setFont(ctx.font("body"), 7)
    ctx.c.setFillColor(ctx.color("muted"))
    ctx.c.drawCentredString(ctx.W / 2, 36, config.author or "")

    ctx.draw_page_number(style="center")
    ctx.new_page()
