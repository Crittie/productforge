"""RenderContext — shared drawing utilities wrapping a ReportLab canvas."""

from __future__ import annotations

from reportlab.lib.colors import Color, HexColor
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.utils import simpleSplit
from reportlab.pdfgen.canvas import Canvas

from .models import DesignSystem


PAGE_SIZES = {
    "letter": letter,
    "a4": A4,
}


def hex_to_color(hex_str: str) -> Color:
    """Convert a hex color string to a ReportLab Color."""
    return HexColor(hex_str)


class RenderContext:
    """Wraps a ReportLab canvas with shared drawing utilities.

    All drawing methods operate in ReportLab's coordinate system
    (origin at bottom-left, y increases upward).
    """

    def __init__(self, canvas: Canvas, design: DesignSystem) -> None:
        self.c = canvas
        self.design = design

        page_size = PAGE_SIZES.get(design.page_size, letter)
        self.W: float = page_size[0]
        self.H: float = page_size[1]

        self.margin_left: float = design.margins.get("left", 90)
        self.margin_right: float = design.margins.get("right", 90)
        self.margin_top: float = design.margins.get("top", 80)
        self.margin_bottom: float = design.margins.get("bottom", 60)

        self.text_area_w: float = self.W - self.margin_left - self.margin_right

        self._page_num = 0

    @property
    def page_num(self) -> int:
        return self._page_num

    # -- Colors ---------------------------------------------------------------

    def color(self, name: str) -> Color:
        """Look up a color by name from the design system."""
        hex_val = self.design.colors.get(name, "#000000")
        return hex_to_color(hex_val)

    def font(self, role: str) -> str:
        """Look up a font name by role from the design system."""
        return self.design.fonts.get(role, "Helvetica")

    # -- Background -----------------------------------------------------------

    def fill_background(self, color_name: str | None = None) -> None:
        """Fill the entire page with a solid color."""
        if color_name:
            c = self.color(color_name)
        else:
            c = self.color("background")
        self.c.setFillColor(c)
        self.c.rect(0, 0, self.W, self.H, fill=1, stroke=0)

    # -- Text -----------------------------------------------------------------

    def draw_text_wrapped(
        self,
        text: str,
        font: str,
        size: float,
        color: Color,
        x: float,
        y: float,
        max_width: float | None = None,
        line_height_factor: float = 1.65,
    ) -> float:
        """Draw left-aligned wrapped text. Returns y after last line."""
        if max_width is None:
            max_width = self.text_area_w
        self.c.setFont(font, size)
        self.c.setFillColor(color)
        lines = simpleSplit(text, font, size, max_width)
        line_height = size * line_height_factor
        for line in lines:
            self.c.drawString(x, y, line)
            y -= line_height
        return y

    def draw_right_aligned_text(
        self,
        text: str,
        font: str,
        size: float,
        color: Color,
        y: float,
        max_width: float | None = None,
        line_height_factor: float = 1.55,
    ) -> float:
        """Draw right-aligned wrapped text. Returns y after last line."""
        if max_width is None:
            max_width = self.text_area_w
        self.c.setFont(font, size)
        self.c.setFillColor(color)
        lines = simpleSplit(text, font, size, max_width)
        line_height = size * line_height_factor
        right_x = self.W - self.margin_right
        for line in lines:
            self.c.drawRightString(right_x, y, line)
            y -= line_height
        return y

    def draw_centered_text(
        self,
        text: str,
        font: str,
        size: float,
        color: Color,
        y: float,
    ) -> float:
        """Draw a single line of centered text. Returns y after the line."""
        self.c.setFont(font, size)
        self.c.setFillColor(color)
        self.c.drawCentredString(self.W / 2, y, text)
        return y - size * 1.5

    # -- Fitted title ---------------------------------------------------------

    def draw_title_fitted(
        self,
        text: str,
        font: str,
        max_size: float,
        min_size: float,
        color: Color,
        x: float,
        y: float,
        max_width: float | None = None,
        align: str = "left",
        line_height_factor: float = 1.3,
    ) -> float:
        """Draw a title that auto-scales to fit within max_width.

        Starts at max_size and shrinks until the text wraps to at most
        3 lines, down to min_size. Returns y after the last line.
        """
        if max_width is None:
            max_width = self.text_area_w
        # Find best font size
        size = max_size
        while size > min_size:
            lines = simpleSplit(text, font, size, max_width)
            if len(lines) <= 3:
                break
            size -= 1
        else:
            lines = simpleSplit(text, font, min_size, max_width)
            size = min_size

        self.c.setFont(font, size)
        self.c.setFillColor(color)
        line_height = size * line_height_factor
        for line in lines:
            if align == "center":
                self.c.drawCentredString(self.W / 2, y, line)
            elif align == "right":
                right_x = self.W - self.margin_right
                self.c.drawRightString(right_x, y, line)
            else:
                self.c.drawString(x, y, line)
            y -= line_height
        return y

    # -- Shapes ---------------------------------------------------------------

    def draw_rounded_rect(
        self,
        x: float,
        y: float,
        w: float,
        h: float,
        radius: float = 5,
        fill_color: Color | None = None,
        stroke_color: Color | None = None,
    ) -> None:
        """Draw a rounded rectangle."""
        if fill_color:
            self.c.setFillColor(fill_color)
        if stroke_color:
            self.c.setStrokeColor(stroke_color)
            self.c.setLineWidth(0.5)
        self.c.roundRect(
            x, y, w, h, radius,
            fill=1 if fill_color else 0,
            stroke=1 if stroke_color else 0,
        )

    def draw_numbered_circle(
        self,
        x: float,
        y: float,
        number: str,
        bg_color: Color,
        text_color: Color,
        radius: float = 13,
        font_size: float = 11,
    ) -> None:
        """Draw a circle with a number inside."""
        self.c.setFillColor(bg_color)
        self.c.circle(x, y, radius, fill=1, stroke=0)
        self.c.setFillColor(text_color)
        self.c.setFont("Helvetica-Bold", font_size)
        self.c.drawCentredString(x, y - font_size * 0.35, number)

    # -- Lines ----------------------------------------------------------------

    def draw_writing_lines(
        self,
        y_start: float,
        y_end: float,
        spacing: float = 28,
        color_name: str = "line",
        line_width: float = 0.3,
    ) -> None:
        """Draw faint horizontal writing lines."""
        color = self.color(color_name)
        self.c.setStrokeColor(color)
        self.c.setLineWidth(line_width)
        y = y_start
        while y >= y_end:
            self.c.line(self.margin_left, y, self.W - self.margin_right, y)
            y -= spacing

    def draw_accent_line(
        self,
        x1: float,
        y: float,
        x2: float,
        color_name: str = "accent",
        width: float = 0.5,
    ) -> None:
        """Draw a thin accent line."""
        self.c.setStrokeColor(self.color(color_name))
        self.c.setLineWidth(width)
        self.c.line(x1, y, x2, y)

    # -- Links ----------------------------------------------------------------

    def draw_link(self, x: float, y: float, w: float, h: float, url: str) -> None:
        """Add a clickable hyperlink region."""
        self.c.linkURL(url, (x, y, x + w, y + h), relative=0)

    # -- Page numbers ---------------------------------------------------------

    def draw_page_number(self, style: str = "right") -> None:
        """Draw a page number at the bottom of the page."""
        if self._page_num < 2:
            return
        self.c.setFont(self.font("mono"), 7)
        self.c.setFillColor(self.color("muted"))
        text = str(self._page_num)
        if style == "center":
            self.c.drawCentredString(self.W / 2, self.margin_bottom - 20, text)
        else:
            self.c.drawRightString(
                self.W - self.margin_right, self.margin_bottom - 20, text,
            )

    # -- Page management ------------------------------------------------------

    def new_page(self) -> None:
        """End the current page (calls showPage). Does not increment page number."""
        self.c.showPage()

    def start_page(self, background: str | None = "background") -> None:
        """Start a new page with optional background fill. Increments page counter."""
        self._page_num += 1
        if background:
            self.fill_background(background)

    # -- Header bar (Clean layout) --------------------------------------------

    def draw_header_bar(self, color_name: str = "primary") -> None:
        """Draw a thin header bar across the top of the page."""
        self.c.setFillColor(self.color(color_name))
        self.c.rect(0, self.H - 18, self.W, 18, fill=1, stroke=0)
