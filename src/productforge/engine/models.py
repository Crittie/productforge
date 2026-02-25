"""Data models for ProductForge configuration."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class FontSpec:
    """Reference to a font file with optional style variant."""

    family: str
    file: str  # filename in fonts/ directory


@dataclass
class LinkSpec:
    """A hyperlink with display text and URL."""

    url: str
    display: str


@dataclass
class DesignSystem:
    """Visual design configuration for a product."""

    colors: dict[str, str] = field(default_factory=dict)
    # Keys: primary, secondary, accent, background, muted, line, ink, earth

    fonts: dict[str, str] = field(default_factory=dict)
    # Keys: heading, body, body_italic, mono — values are registered font names

    page_size: str = "letter"  # "letter" | "a4"

    margins: dict[str, float] = field(default_factory=lambda: {
        "left": 90,
        "right": 90,
        "top": 80,
        "bottom": 60,
    })

    layout: str = "editorial"  # "clean" | "warm" | "editorial"


@dataclass
class PageSpec:
    """A single page definition."""

    type: str  # "cover" | "letter" | "prompt" | "writing" | "cta" | "toc" | "section"
    data: dict = field(default_factory=dict)


@dataclass
class ProductConfig:
    """Complete product configuration."""

    title: str
    subtitle: str = ""
    author: str = ""
    filename: str = "output.pdf"
    design: DesignSystem = field(default_factory=DesignSystem)
    links: dict[str, LinkSpec] = field(default_factory=dict)
    pages: list[PageSpec] = field(default_factory=list)

    @classmethod
    def from_dict(cls, data: dict) -> ProductConfig:
        """Build a ProductConfig from a plain dictionary (e.g. parsed JSON)."""
        design_data = data.get("design", {})
        design = DesignSystem(
            colors=design_data.get("colors", {}),
            fonts=design_data.get("fonts", {}),
            page_size=design_data.get("page_size", "letter"),
            margins=design_data.get("margins", {
                "left": 90, "right": 90, "top": 80, "bottom": 60,
            }),
            layout=design_data.get("layout", "editorial"),
        )

        links = {}
        for name, link_data in data.get("links", {}).items():
            links[name] = LinkSpec(
                url=link_data["url"],
                display=link_data["display"],
            )

        pages = []
        for page_data in data.get("pages", []):
            pages.append(PageSpec(
                type=page_data["type"],
                data=page_data.get("data", {}),
            ))

        return cls(
            title=data.get("title", "Untitled"),
            subtitle=data.get("subtitle", ""),
            author=data.get("author", ""),
            filename=data.get("filename", "output.pdf"),
            design=design,
            links=links,
            pages=pages,
        )
