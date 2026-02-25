"""Section header / divider renderer (v2 — Luminous Pulse style)."""

from __future__ import annotations

from ..context import RenderContext
from ..models import ProductConfig


def render(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """Render a section divider page.

    data fields:
        title: str — section title
        subtitle: str (optional)
        epigraph: str (optional) — a quote or thematic line
    """
    ctx.start_page("primary")

    title = data.get("title", "")
    subtitle = data.get("subtitle", "")
    epigraph = data.get("epigraph", "")

    y = ctx.H / 2 + 30

    # Title
    ctx.c.setFont("Helvetica-Bold", 28)
    ctx.c.setFillColor(ctx.color("background"))
    ctx.c.drawCentredString(ctx.W / 2, y, title)
    y -= 40

    # Subtitle
    if subtitle:
        ctx.c.setFont("Helvetica", 13)
        ctx.c.setFillColor(ctx.color("secondary"))
        ctx.c.drawCentredString(ctx.W / 2, y, subtitle)
        y -= 30

    # Accent line
    ctx.c.setStrokeColor(ctx.color("accent"))
    ctx.c.setLineWidth(0.5)
    ctx.c.line(ctx.W / 2 - 60, y, ctx.W / 2 + 60, y)
    y -= 30

    # Epigraph
    if epigraph:
        ctx.c.setFont("Helvetica-Oblique", 11)
        ctx.c.setFillColor(ctx.color("muted"))
        y = ctx.draw_text_wrapped(
            epigraph, "Helvetica-Oblique", 11, ctx.color("muted"),
            ctx.margin_left + 40, y,
            max_width=ctx.text_area_w - 80,
        )

    ctx.draw_page_number(style="center")
    ctx.new_page()
