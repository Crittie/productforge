"""Tests for individual page renderers."""

import json
import os

import pytest

from productforge.engine.builder import PDFBuilder
from productforge.engine.models import ProductConfig

FONT_DIR = os.path.join(os.path.dirname(__file__), "..", "fonts")

EDITORIAL_DESIGN = {
    "colors": {
        "background": "#F7F4EF", "ink": "#111110", "earth": "#2E2A25",
        "muted": "#A09890", "accent": "#8A9E8C", "line": "#A09890",
        "primary": "#111110", "secondary": "#8A9E8C",
    },
    "fonts": {
        "heading": "Italiana", "body": "CrimsonPro",
        "body_italic": "CrimsonProItalic", "mono": "DMMono",
    },
    "layout": "editorial",
}

CLEAN_DESIGN = {
    "colors": {
        "primary": "#1a2744", "secondary": "#2d3436", "accent": "#e17055",
        "background": "#ffffff", "muted": "#b2bec3", "line": "#f5f6fa",
        "ink": "#2d3436", "earth": "#2d3436",
    },
    "fonts": {
        "heading": "Helvetica-Bold", "body": "Helvetica",
        "body_italic": "Helvetica-Oblique", "mono": "Courier",
    },
    "layout": "clean",
}

WARM_DESIGN = {
    "colors": {
        "primary": "#1a1a2e", "secondary": "#B4A7D6", "accent": "#F4C430",
        "background": "#e8e8e8", "muted": "#999999", "line": "#2a3a5c",
        "ink": "#FFFFFF", "earth": "#e8e8e8",
    },
    "fonts": {
        "heading": "Helvetica-Bold", "body": "Helvetica",
        "body_italic": "Helvetica-Oblique", "mono": "Courier",
    },
    "layout": "warm",
}


@pytest.fixture
def builder():
    return PDFBuilder(font_dir=FONT_DIR)


def _build_single_page(builder, design, page_type, page_data):
    """Helper to build a PDF with a single page."""
    config = ProductConfig.from_dict({
        "title": "Test",
        "design": design,
        "pages": [{"type": page_type, "data": page_data}],
    })
    return builder.build(config)


class TestCoverRenderer:
    def test_editorial_cover(self, builder):
        pdf = _build_single_page(builder, EDITORIAL_DESIGN, "cover", {
            "title": "Test Title",
            "subtitle": ["line one", "line two"],
            "brand": "test brand",
        })
        assert pdf[:5] == b"%PDF-"

    def test_clean_cover(self, builder):
        pdf = _build_single_page(builder, CLEAN_DESIGN, "cover", {
            "title": "Clean Title",
            "badge": "FREE",
        })
        assert pdf[:5] == b"%PDF-"

    def test_warm_cover(self, builder):
        pdf = _build_single_page(builder, WARM_DESIGN, "cover", {
            "title": "Warm Title",
            "subtitle": ["A warm subtitle"],
        })
        assert pdf[:5] == b"%PDF-"


class TestLetterRenderer:
    def test_editorial_letter(self, builder):
        pdf = _build_single_page(builder, EDITORIAL_DESIGN, "letter", {
            "paragraphs": ["Opening line.", "", "Body paragraph."],
            "sign_off": "\u2014 Test",
        })
        assert pdf[:5] == b"%PDF-"

    def test_clean_letter(self, builder):
        pdf = _build_single_page(builder, CLEAN_DESIGN, "letter", {
            "heading": "Why These Prompts?",
            "paragraphs": ["A good reason."],
        })
        assert pdf[:5] == b"%PDF-"


class TestPromptRenderer:
    def test_editorial_prompt(self, builder):
        pdf = _build_single_page(builder, EDITORIAL_DESIGN, "prompt", {
            "number": "01",
            "prompt": "What is your hidden skill?",
            "example": "I can read a room.",
        })
        assert pdf[:5] == b"%PDF-"

    def test_clean_prompt(self, builder):
        pdf = _build_single_page(builder, CLEAN_DESIGN, "prompt", {
            "number": "1",
            "title": "The Status Report Generator",
            "prompt": "Generate a status report.",
            "pro_tip": "Save as a template.",
            "time_saved": "60-90 min",
        })
        assert pdf[:5] == b"%PDF-"


class TestWritingRenderer:
    def test_editorial_writing(self, builder):
        pdf = _build_single_page(builder, EDITORIAL_DESIGN, "writing", {
            "prompt_number": "01",
            "quote": "\u201cI write entirely to find out what I\u2019m thinking.\u201d \u2014 Joan Didion",
        })
        assert pdf[:5] == b"%PDF-"


class TestCTARenderer:
    def test_editorial_cta(self, builder):
        pdf = _build_single_page(builder, EDITORIAL_DESIGN, "cta", {
            "headline": ["If six questions changed something,", "the full workbook has fifty."],
            "bridge": "you already know how to do this.",
            "links": [
                {"display": "example.com", "url": "https://example.com"},
            ],
        })
        assert pdf[:5] == b"%PDF-"

    def test_clean_cta(self, builder):
        pdf = _build_single_page(builder, CLEAN_DESIGN, "cta", {
            "headline": ["Want 45 More Prompts?"],
            "body": ["These 5 prompts are from my complete guide."],
            "links": [
                {"display": "Get the Full Guide", "url": "https://example.com", "label": "On Gumroad"},
            ],
            "sign_off": "\u2014 Christie Parrow",
        })
        assert pdf[:5] == b"%PDF-"


class TestTOCRenderer:
    def test_toc(self, builder):
        pdf = _build_single_page(builder, CLEAN_DESIGN, "toc", {
            "heading": "What\u2019s Inside",
            "entries": [
                {"number": "1", "title": "Chapter One", "description": "The beginning"},
                {"number": "2", "title": "Chapter Two", "description": "The middle"},
            ],
            "footer_text": "Total: 50 prompts",
        })
        assert pdf[:5] == b"%PDF-"


class TestSectionRenderer:
    def test_section(self, builder):
        pdf = _build_single_page(builder, WARM_DESIGN, "section", {
            "title": "Remember",
            "subtitle": "Week One",
            "epigraph": "The feeling follows the words.",
        })
        assert pdf[:5] == b"%PDF-"


class TestCrossPreset:
    """Verify that all page types work with all layouts."""

    @pytest.mark.parametrize("design", [EDITORIAL_DESIGN, CLEAN_DESIGN, WARM_DESIGN])
    def test_all_page_types(self, builder, design):
        pages = [
            {"type": "cover", "data": {"title": "Test"}},
            {"type": "letter", "data": {"paragraphs": ["Hello."]}},
            {"type": "prompt", "data": {"number": "01", "prompt": "Test?"}},
            {"type": "writing", "data": {}},
            {"type": "cta", "data": {"headline": ["Buy now"]}},
        ]
        config = ProductConfig.from_dict({
            "title": "Cross Test",
            "design": design,
            "pages": pages,
        })
        pdf = builder.build(config)
        assert pdf[:5] == b"%PDF-"
        assert len(pdf) > 1000
