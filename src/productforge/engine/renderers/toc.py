"""Table of contents renderer (v2 — PM Prompts style)."""

from __future__ import annotations

from ..context import RenderContext
from ..models import ProductConfig


def render(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """Render a table of contents page.

    data fields:
        heading: str — e.g. "What's Inside"
        entries: list[dict] — each with "number", "title", "description"
        footer_text: str (optional)
    """
    ctx.start_page("background")

    layout = config.design.layout
    if layout == "clean":
        ctx.draw_header_bar()

    from reportlab.lib.units import inch

    heading = data.get("heading", "What\u2019s Inside")
    entries = data.get("entries", [])
    footer_text = data.get("footer_text", "")

    y = ctx.H - 1.2 * inch

    ctx.c.setFont("Helvetica-Bold", 22)
    ctx.c.setFillColor(ctx.color("ink"))
    ctx.c.drawString(ctx.margin_left, y, heading)
    y -= 0.7 * inch

    for entry in entries:
        num = entry.get("number", "")
        title = entry.get("title", "")
        desc = entry.get("description", "")

        # Number circle
        ctx.draw_numbered_circle(
            ctx.margin_left + 0.15 * inch, y - 0.05 * inch,
            str(num), ctx.color("accent"), ctx.color("background"),
        )

        # Title
        ctx.c.setFont("Helvetica-Bold", 12)
        ctx.c.setFillColor(ctx.color("ink"))
        ctx.c.drawString(ctx.margin_left + 0.55 * inch, y, title)

        # Description
        if desc:
            ctx.c.setFont("Helvetica", 10)
            ctx.c.setFillColor(ctx.color("muted"))
            ctx.c.drawString(ctx.margin_left + 0.55 * inch, y - 0.22 * inch, desc)

        y -= 0.65 * inch

    # Footer box
    if footer_text:
        y -= 0.2 * inch
        ctx.draw_rounded_rect(
            ctx.margin_left, y - 0.6 * inch,
            ctx.text_area_w, 0.7 * inch, 5,
            fill_color=ctx.color("primary"),
        )
        ctx.c.setFillColor(ctx.color("background"))
        ctx.c.setFont("Helvetica-Bold", 12)
        ctx.c.drawString(ctx.margin_left + 0.25 * inch, y - 0.35 * inch, footer_text)

    ctx.draw_page_number(style="center")
    ctx.new_page()
