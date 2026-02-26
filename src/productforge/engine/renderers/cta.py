"""Call-to-action page renderer with hyperlinks.

Reference: White Space generate_workbook.py lines 343-370.
"""

from __future__ import annotations

from ..context import RenderContext
from ..models import ProductConfig


def render(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """Render a CTA page.

    data fields:
        headline: str | list[str] — main CTA headline
        bridge: str — emotional bridge line (optional)
        links: list[dict] — each with "display" and "url" keys
        sign_off: str (optional)
    """
    layout = config.design.layout

    if layout == "editorial":
        _render_editorial(ctx, data, config)
    elif layout == "warm":
        _render_warm(ctx, data, config)
    else:
        _render_clean(ctx, data, config)


def _render_editorial(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """Right-aligned CTA on parchment."""
    ctx.start_page("background")

    headline = data.get("headline", [])
    if isinstance(headline, str):
        headline = [headline]
    bridge = data.get("bridge", "")
    links = data.get("links", [])

    right_x = ctx.W - ctx.margin_right
    y = ctx.H // 2 + 20

    # Headline lines
    ctx.c.setFont(ctx.font("heading"), 17)
    ctx.c.setFillColor(ctx.color("ink"))
    for line in headline:
        ctx.c.drawRightString(right_x, y, line)
        y -= 28

    # Bridge / emotional beat
    if bridge:
        y -= 12
        ctx.c.setFont(ctx.font("body_italic"), 11)
        ctx.c.setFillColor(ctx.color("earth"))
        ctx.c.drawRightString(right_x, y, bridge)
        y -= 50
    else:
        y -= 30

    # Links
    ctx.c.setFont(ctx.font("mono"), 9)
    ctx.c.setFillColor(ctx.color("muted"))
    for link in links:
        display = link.get("display", "")
        url = link.get("url", "")
        ctx.c.drawRightString(right_x, y, display)
        if url:
            # Approximate link area
            text_width = ctx.c.stringWidth(display, ctx.font("mono"), 9)
            ctx.draw_link(right_x - text_width, y - 3, text_width, 14, url)
        y -= 22

    ctx.draw_page_number()
    ctx.new_page()


def _render_clean(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """White background, header bar, centered CTA with button-like link boxes."""
    ctx.start_page("background")
    ctx.draw_header_bar()

    from reportlab.lib.units import inch

    headline = data.get("headline", [])
    if isinstance(headline, str):
        headline = [headline]
    bridge = data.get("bridge", "")
    body = data.get("body", [])
    if isinstance(body, str):
        body = [body]
    links = data.get("links", [])
    sign_off = data.get("sign_off", "")

    y = ctx.H - 1.2 * inch

    # Headline
    ctx.c.setFont(ctx.font("heading"), 24)
    ctx.c.setFillColor(ctx.color("ink"))
    for line in headline:
        ctx.c.drawString(ctx.margin_left, y, line)
        y -= 36

    y -= 10

    # Body text
    for para in body:
        if para == "":
            y -= 8
        else:
            y = ctx.draw_text_wrapped(
                para, ctx.font("body"), 11, ctx.color("ink"),
                ctx.margin_left, y,
            )
            y -= 4

    y -= 20

    # Links as boxes
    for link in links:
        display = link.get("display", "")
        url = link.get("url", "")
        label = link.get("label", "")

        if label:
            ctx.c.setFont(ctx.font("heading"), 11)
            ctx.c.setFillColor(ctx.color("accent"))
            ctx.c.drawString(ctx.margin_left, y, label)
            y -= 16

        ctx.draw_rounded_rect(
            ctx.margin_left, y - 0.6 * inch,
            ctx.text_area_w, 0.65 * inch, 5,
            fill_color=ctx.color("primary"),
        )
        ctx.c.setFillColor(ctx.color("background"))
        ctx.c.setFont(ctx.font("heading"), 12)
        ctx.c.drawCentredString(ctx.W / 2, y - 0.35 * inch, display)
        if url:
            ctx.draw_link(
                ctx.margin_left, y - 0.6 * inch,
                ctx.text_area_w, 0.65 * inch, url,
            )
        y -= 0.9 * inch

    # Sign off
    if sign_off:
        y -= 10
        ctx.c.setFont(ctx.font("heading"), 10)
        ctx.c.setFillColor(ctx.color("ink"))
        ctx.c.drawString(ctx.margin_left, y, sign_off)

    ctx.draw_page_number(style="center")
    ctx.new_page()


def _render_warm(ctx: RenderContext, data: dict, config: ProductConfig) -> None:
    """Dark background, centered CTA with amber accents."""
    ctx.start_page("primary")

    headline = data.get("headline", [])
    if isinstance(headline, str):
        headline = [headline]
    bridge = data.get("bridge", "")
    links = data.get("links", [])

    y = ctx.H / 2 + 60

    # Headline
    ctx.c.setFont(ctx.font("heading"), 22)
    ctx.c.setFillColor(ctx.color("background"))
    for line in headline:
        ctx.c.drawCentredString(ctx.W / 2, y, line)
        y -= 32

    # Bridge
    if bridge:
        y -= 10
        ctx.c.setFont(ctx.font("body_italic"), 13)
        ctx.c.setFillColor(ctx.color("secondary"))
        ctx.c.drawCentredString(ctx.W / 2, y, bridge)
        y -= 40

    # Links
    ctx.c.setFont(ctx.font("body"), 10)
    ctx.c.setFillColor(ctx.color("accent"))
    for link in links:
        display = link.get("display", "")
        url = link.get("url", "")
        ctx.c.drawCentredString(ctx.W / 2, y, display)
        if url:
            text_width = ctx.c.stringWidth(display, ctx.font("body"), 10)
            ctx.draw_link(
                ctx.W / 2 - text_width / 2, y - 3,
                text_width, 14, url,
            )
        y -= 22

    ctx.draw_page_number(style="center")
    ctx.new_page()
