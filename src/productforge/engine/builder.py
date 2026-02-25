"""PDFBuilder — orchestrator that generates a PDF from a ProductConfig."""

from __future__ import annotations

import io

from reportlab.lib.pagesizes import letter, A4
from reportlab.pdfgen.canvas import Canvas

from .context import RenderContext, PAGE_SIZES
from .fonts import register_bundled_fonts
from .models import ProductConfig, PageSpec

from .renderers import (
    cover, letter as letter_renderer, prompt, writing, cta, toc, section, chapter,
)


RENDERERS: dict[str, object] = {
    "cover": cover,
    "letter": letter_renderer,
    "prompt": prompt,
    "writing": writing,
    "cta": cta,
    "toc": toc,
    "section": section,
    "chapter": chapter,
}


class PDFBuilder:
    """Generate a PDF from a ProductConfig."""

    def __init__(self, font_dir: str | None = None) -> None:
        self._font_dir = font_dir

    def build(self, config: ProductConfig) -> bytes:
        """Generate PDF from config, return bytes."""
        register_bundled_fonts(self._font_dir)

        buf = io.BytesIO()
        page_size = PAGE_SIZES.get(config.design.page_size, letter)
        c = Canvas(buf, pagesize=page_size)

        if config.title:
            c.setTitle(config.title)
        if config.author:
            c.setAuthor(config.author)

        ctx = RenderContext(c, config.design)

        for page_spec in config.pages:
            renderer_mod = RENDERERS.get(page_spec.type)
            if renderer_mod is None:
                raise ValueError(f"Unknown page type: {page_spec.type!r}")
            renderer_mod.render(ctx, page_spec.data, config)

        c.save()
        return buf.getvalue()
