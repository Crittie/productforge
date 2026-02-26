"""Prompt / content page renderer.

Reference: White Space generate_workbook.py lines 266-292.
"""

from __future__ import annotations

from ..context import RenderContext
from ..models import ProductConfig


def render(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """Render a prompt page.

    data fields:
        number: str — e.g. "01"
        prompt: str — the main prompt text
        example: str — example answer (optional)
    """
    layout = config.design.layout

    if layout == "editorial":
        _render_editorial(ctx, data, config)
    elif layout == "warm":
        _render_warm(ctx, data, config)
    else:
        _render_clean(ctx, data, config)


def _render_editorial(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """Sage number top-left, right-aligned prompt, italic example below."""
    ctx.start_page("background")

    number = data.get("number", "")
    prompt_text = data.get("prompt", "")
    example = data.get("example", "")

    # Prompt number — top left, DM Mono, sage
    ctx.c.setFont(ctx.font("mono"), 9)
    ctx.c.setFillColor(ctx.color("accent"))
    ctx.c.drawString(ctx.margin_left, ctx.H - ctx.margin_top - 10, number)

    # Prompt text — right-aligned, upper-center area
    prompt_y = ctx.H - ctx.margin_top - 140
    prompt_y = ctx.draw_right_aligned_text(
        prompt_text,
        ctx.font("heading"), 17, ctx.color("ink"),
        prompt_y,
        max_width=ctx.text_area_w - 40,
    )

    # Example answer — right-aligned, italic
    if example:
        example_y = prompt_y - 35
        ctx.draw_right_aligned_text(
            example,
            ctx.font("body_italic"), 12, ctx.color("earth"),
            example_y,
            max_width=ctx.text_area_w - 40,
        )

    ctx.draw_page_number()
    ctx.new_page()


def _render_clean(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """Header bar, numbered badge, prompt box, pro tip, before/after."""
    ctx.start_page("background")
    ctx.draw_header_bar()

    from reportlab.lib.units import inch

    number = data.get("number", "")
    title = data.get("title", "")
    prompt_text = data.get("prompt", "")
    example = data.get("example", "")
    pro_tip = data.get("pro_tip", "")
    time_saved = data.get("time_saved", "")

    y = ctx.H - 0.7 * inch

    # Header bar with number and title
    light = ctx.color("line")
    ctx.draw_rounded_rect(
        ctx.margin_left, y - 0.55 * inch,
        ctx.text_area_w, 0.6 * inch, 4,
        fill_color=light,
    )

    # Number circle
    ctx.draw_numbered_circle(
        ctx.margin_left + 0.25 * inch, y - 0.25 * inch,
        str(number), ctx.color("accent"), ctx.color("background"),
    )

    # Title
    if title:
        ctx.c.setFont(ctx.font("heading"), 14)
        ctx.c.setFillColor(ctx.color("ink"))
        ctx.c.drawString(ctx.margin_left + 0.6 * inch, y - 0.2 * inch, title)

    # Time saved
    if time_saved:
        ctx.c.setFillColor(ctx.color("accent"))
        ctx.c.setFont(ctx.font("heading"), 9)
        ctx.c.drawString(
            ctx.margin_left + 0.6 * inch, y - 0.42 * inch,
            f"Time Saved: {time_saved}",
        )

    y -= 0.85 * inch

    # Prompt text in a box
    if prompt_text:
        import textwrap
        lines = []
        for raw_line in prompt_text.strip().split("\n"):
            if len(raw_line) > 78:
                lines.extend(textwrap.wrap(raw_line, 78) or [""])
            else:
                lines.append(raw_line)

        line_height = 10
        box_height = len(lines) * line_height + 16

        ctx.draw_rounded_rect(
            ctx.margin_left, y - box_height,
            ctx.text_area_w, box_height, 4,
            fill_color=ctx.color("line"),
            stroke_color=ctx.color("muted"),
        )

        ctx.c.setFont("Courier", 8)
        ctx.c.setFillColor(ctx.color("ink"))
        text_y = y - 10
        for line in lines:
            ctx.c.drawString(ctx.margin_left + 8, text_y, line)
            text_y -= line_height

        y -= box_height + 0.2 * inch

    # Example
    if example:
        ctx.c.setFont(ctx.font("body"), 10)
        ctx.c.setFillColor(ctx.color("ink"))
        y = ctx.draw_text_wrapped(
            example, ctx.font("body"), 10, ctx.color("ink"),
            ctx.margin_left, y,
        )
        y -= 0.15 * inch

    # Pro tip
    if pro_tip:
        ctx.c.setFont(ctx.font("heading"), 9)
        ctx.c.setFillColor(ctx.color("accent"))
        ctx.c.drawString(ctx.margin_left, y, "Pro Tip: ")

        import textwrap
        tip_lines = textwrap.wrap(pro_tip, 82)
        ctx.c.setFont(ctx.font("body"), 9)
        ctx.c.setFillColor(ctx.color("ink"))
        if tip_lines:
            ctx.c.drawString(ctx.margin_left + 45, y, tip_lines[0])
            y -= 12
            for line in tip_lines[1:]:
                ctx.c.drawString(ctx.margin_left, y, line)
                y -= 12

    ctx.draw_page_number(style="center")
    ctx.new_page()


def _render_warm(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """Dark background, amber section label, warm prompt styling."""
    ctx.start_page("primary")

    # Accent line at top
    ctx.c.setStrokeColor(ctx.color("accent"))
    ctx.c.setLineWidth(0.5)
    ctx.c.line(72, ctx.H - 50, ctx.W - 72, ctx.H - 50)

    number = data.get("number", "")
    prompt_text = data.get("prompt", "")
    example = data.get("example", "")

    y = ctx.H - 100

    # Number label
    if number:
        ctx.c.setFont(ctx.font("body"), 11)
        ctx.c.setFillColor(ctx.color("accent"))
        ctx.c.drawString(ctx.margin_left, y, f"DAY {number}")
        y -= 30

    # Prompt
    if prompt_text:
        ctx.c.setFont(ctx.font("heading"), 20)
        ctx.c.setFillColor(ctx.color("background"))
        y = ctx.draw_text_wrapped(
            prompt_text, ctx.font("heading"), 20, ctx.color("background"),
            ctx.margin_left, y, line_height_factor=1.5,
        )
        y -= 20

    # Example
    if example:
        ctx.c.setFont(ctx.font("body"), 11)
        ctx.c.setFillColor(ctx.color("secondary"))
        y = ctx.draw_text_wrapped(
            example, ctx.font("body"), 11, ctx.color("secondary"),
            ctx.margin_left, y,
        )

    ctx.draw_page_number(style="center")
    ctx.new_page()
