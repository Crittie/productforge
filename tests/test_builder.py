"""Tests for PDFBuilder."""

import json
import os

import pytest

from productforge.engine.builder import PDFBuilder
from productforge.engine.models import ProductConfig

EXAMPLES_DIR = os.path.join(os.path.dirname(__file__), "..", "examples")
FONT_DIR = os.path.join(os.path.dirname(__file__), "..", "fonts")


def _load_example(name: str) -> dict:
    path = os.path.join(EXAMPLES_DIR, name)
    with open(path) as f:
        return json.load(f)


@pytest.fixture
def builder():
    return PDFBuilder(font_dir=FONT_DIR)


class TestPDFBuilder:
    def test_white_space_workbook_generates(self, builder):
        """The full White Space workbook config should produce a valid PDF."""
        data = _load_example("white-space-workbook.json")
        config = ProductConfig.from_dict(data)
        pdf_bytes = builder.build(config)

        assert len(pdf_bytes) > 1000
        assert pdf_bytes[:5] == b"%PDF-"

    def test_white_space_workbook_page_count(self, builder):
        """The workbook should have 15 pages (cover + letter + 6*(prompt+writing) + cta)."""
        data = _load_example("white-space-workbook.json")
        config = ProductConfig.from_dict(data)
        assert len(config.pages) == 15

    def test_empty_pages_produces_valid_pdf(self, builder):
        """Build with no pages should produce a valid (blank) PDF."""
        config = ProductConfig(title="Empty")
        pdf_bytes = builder.build(config)
        assert pdf_bytes[:5] == b"%PDF-"

    def test_minimal_cover_only(self, builder):
        """A single cover page should produce valid PDF bytes."""
        config = ProductConfig.from_dict({
            "title": "Test",
            "design": {
                "colors": {
                    "background": "#F7F4EF",
                    "ink": "#111110",
                    "earth": "#2E2A25",
                    "muted": "#A09890",
                    "accent": "#8A9E8C",
                    "line": "#A09890",
                    "primary": "#111110",
                    "secondary": "#8A9E8C",
                },
                "fonts": {
                    "heading": "Italiana",
                    "body": "CrimsonPro",
                    "body_italic": "CrimsonProItalic",
                    "mono": "DMMono",
                },
                "layout": "editorial",
            },
            "pages": [
                {"type": "cover", "data": {"title": "Test Cover"}},
            ],
        })
        pdf_bytes = builder.build(config)
        assert pdf_bytes[:5] == b"%PDF-"

    def test_unknown_page_type_raises(self, builder):
        """An unknown page type should raise ValueError."""
        config = ProductConfig.from_dict({
            "title": "Test",
            "pages": [{"type": "nonexistent", "data": {}}],
        })
        with pytest.raises(ValueError, match="Unknown page type"):
            builder.build(config)


class TestProductConfig:
    def test_from_dict_defaults(self):
        config = ProductConfig.from_dict({})
        assert config.title == "Untitled"
        assert config.pages == []
        assert config.design.page_size == "letter"

    def test_from_dict_full(self):
        data = _load_example("white-space-workbook.json")
        config = ProductConfig.from_dict(data)
        assert config.title == "What AI Can\u2019t Do \u2014 a white space workbook"
        assert config.author == "Christie Parrow"
        assert config.design.layout == "editorial"
        assert config.design.colors["accent"] == "#8A9E8C"
        assert len(config.pages) == 15

    def test_from_dict_links(self):
        config = ProductConfig.from_dict({
            "links": {
                "site": {"url": "https://example.com", "display": "example.com"},
            },
        })
        assert "site" in config.links
        assert config.links["site"].url == "https://example.com"
