"""API and page routes for ProductForge."""

from __future__ import annotations

import json
import os
import tempfile
import uuid

from fastapi import APIRouter, Request, UploadFile, File
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.templating import Jinja2Templates

from ..engine.builder import PDFBuilder
from ..engine.models import ProductConfig

# Optional imports for content extraction (graceful fallback)
try:
    import fitz as _fitz  # PyMuPDF
except ImportError:
    _fitz = None

try:
    from docx import Document as _DocxDocument
except ImportError:
    _DocxDocument = None

_DIR = os.path.dirname(os.path.abspath(__file__))
_PRESET_DIR = os.path.join(_DIR, "..", "presets")
_UPLOAD_DIR = os.path.join(tempfile.gettempdir(), "productforge_uploads")
os.makedirs(_UPLOAD_DIR, exist_ok=True)

templates = Jinja2Templates(directory=os.path.join(_DIR, "templates"))
router = APIRouter()
builder = PDFBuilder()


def _load_presets() -> list[dict]:
    """Load all preset JSON files."""
    presets = []
    preset_dir = os.path.normpath(_PRESET_DIR)
    if not os.path.isdir(preset_dir):
        return presets
    for fname in sorted(os.listdir(preset_dir)):
        if fname.endswith(".json"):
            with open(os.path.join(preset_dir, fname)) as f:
                presets.append(json.load(f))
    return presets


@router.get("/", response_class=HTMLResponse)
async def index(request: Request) -> HTMLResponse:
    """Serve the chatbot UI."""
    presets = _load_presets()
    return templates.TemplateResponse("index.html", {
        "request": request,
        "presets": presets,
    })


@router.get("/api/presets")
async def get_presets() -> JSONResponse:
    """Return available design presets."""
    return JSONResponse(content=_load_presets())


@router.post("/api/upload-logo")
async def upload_logo(file: UploadFile = File(...)) -> JSONResponse:
    """Upload a logo image. Returns the server-side path for use in PDF generation."""
    if not file.content_type or not file.content_type.startswith("image/"):
        return JSONResponse(
            status_code=400,
            content={"error": "File must be an image (PNG, JPG, etc.)"},
        )

    ext = os.path.splitext(file.filename or "logo.png")[1] or ".png"
    filename = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(_UPLOAD_DIR, filename)

    contents = await file.read()
    with open(path, "wb") as f:
        f.write(contents)

    return JSONResponse(content={"path": path, "filename": file.filename})


def _extract_pdf(path: str) -> str:
    """Extract text from a PDF file, detecting headings and preserving line structure.

    Uses a two-pass approach:
    1. Find the dominant body font size
    2. Process line-by-line, merging only full-width wrapping lines
       while keeping short lines (bullet points, list items) separate
    """
    if _fitz is None:
        raise RuntimeError("PDF support requires pymupdf: pip install pymupdf")
    doc = _fitz.open(path)

    # First pass: find the dominant (most common) body font size
    size_counts: dict[float, int] = {}
    for page in doc:
        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                for span in line["spans"]:
                    if span["text"].strip():
                        s = round(span["size"], 1)
                        size_counts[s] = size_counts.get(s, 0) + len(span["text"])
    body_size = max(size_counts, key=size_counts.get) if size_counts else 12.0

    # Second pass: extract text line-by-line, preserving structure
    # Each entry: (text, is_heading, is_full_width)
    raw_lines: list[tuple[str, bool, bool]] = []

    for page in doc:
        for block in page.get_text("dict")["blocks"]:
            block_lines = block.get("lines", [])
            if not block_lines:
                continue

            # Block width from bounding box
            bbox = block.get("bbox", (0, 0, 0, 0))
            block_width = bbox[2] - bbox[0]

            for line in block_lines:
                text_parts: list[str] = []
                is_heading = False

                for span in line["spans"]:
                    text = span["text"].strip()
                    if not text:
                        continue
                    text_parts.append(text)
                    sz = round(span["size"], 1)
                    font = span.get("font", "")
                    if sz > body_size + 1.5 or (
                        sz >= body_size and "Bold" in font
                        and len(text) < 80
                    ):
                        is_heading = True

                full_text = " ".join(text_parts).strip()
                if not full_text:
                    continue

                # Check if this line fills the block width (wrapping text)
                line_bbox = line.get("bbox", (0, 0, 0, 0))
                line_width = line_bbox[2] - line_bbox[0]
                is_full_width = block_width > 50 and (line_width / block_width) > 0.85

                raw_lines.append((full_text, is_heading, is_full_width))

    doc.close()

    # Merge consecutive full-width body lines into paragraphs,
    # but keep short lines (list items, bullet points) separate
    paragraphs: list[str] = []
    i = 0
    while i < len(raw_lines):
        text, is_heading, is_full_width = raw_lines[i]

        if is_heading and len(text) < 120:
            paragraphs.append(f"# {text}")
            i += 1
            continue

        # For body text: merge consecutive full-width lines
        merged = text
        while (is_full_width and i + 1 < len(raw_lines)
               and not raw_lines[i + 1][1]):  # next is not heading
            i += 1
            next_text, _, next_full_width = raw_lines[i]
            merged += " " + next_text
            is_full_width = next_full_width

        paragraphs.append(merged)
        i += 1

    return "\n\n".join(paragraphs)


def _extract_docx(path: str) -> str:
    """Extract text from a .docx file, preserving headings as markdown."""
    if _DocxDocument is None:
        raise RuntimeError("DOCX support requires python-docx: pip install python-docx")
    doc = _DocxDocument(path)
    sections: list[str] = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        style = para.style.name or ""
        if style.startswith("Heading"):
            sections.append(f"# {text}")
        else:
            sections.append(text)
    return "\n\n".join(sections)


@router.post("/api/extract")
async def extract_content(file: UploadFile = File(...)) -> JSONResponse:
    """Extract text content from an uploaded PDF, DOCX, or text file."""
    fname = (file.filename or "").lower()
    contents = await file.read()

    # Save to temp file for libraries that need a path
    ext = os.path.splitext(fname)[1] or ".txt"
    tmp_path = os.path.join(_UPLOAD_DIR, f"{uuid.uuid4().hex}{ext}")
    with open(tmp_path, "wb") as f:
        f.write(contents)

    try:
        if fname.endswith(".pdf"):
            text = _extract_pdf(tmp_path)
        elif fname.endswith((".docx", ".doc")):
            text = _extract_docx(tmp_path)
        elif fname.endswith((".txt", ".md", ".text", ".markdown")):
            text = contents.decode("utf-8", errors="replace")
        else:
            return JSONResponse(
                status_code=400,
                content={"error": f"Unsupported file type: {ext}. Use PDF, DOCX, TXT, or MD."},
            )
    except RuntimeError as exc:
        return JSONResponse(status_code=400, content={"error": str(exc)})
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to extract text: {exc}"},
        )
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    return JSONResponse(content={
        "text": text,
        "filename": file.filename,
        "length": len(text),
    })


@router.post("/api/generate")
async def generate_pdf(request: Request) -> Response:
    """Generate a PDF from a JSON config and return it as a download."""
    try:
        data = await request.json()
    except Exception:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid JSON in request body."},
        )

    if not data.get("pages"):
        return JSONResponse(
            status_code=400,
            content={"error": "No pages defined. Add at least one page."},
        )

    try:
        config = ProductConfig.from_dict(data)
        pdf_bytes = builder.build(config)
    except ValueError as exc:
        return JSONResponse(
            status_code=400,
            content={"error": str(exc)},
        )
    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={"error": f"PDF generation failed: {exc}"},
        )

    filename = config.filename or "output.pdf"
    if not filename.endswith(".pdf"):
        filename += ".pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
