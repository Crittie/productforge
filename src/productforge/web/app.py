"""FastAPI web application for ProductForge."""

from __future__ import annotations

import os

import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .routes import router

_DIR = os.path.dirname(os.path.abspath(__file__))

app = FastAPI(title="ProductForge", version="0.1.0")
app.include_router(router)
app.mount("/static", StaticFiles(directory=os.path.join(_DIR, "static")), name="static")


def main() -> None:
    """Entry point for `productforge` CLI command."""
    uvicorn.run(
        "productforge.web.app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )


if __name__ == "__main__":
    main()
