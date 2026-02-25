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
