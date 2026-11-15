"""Blanko PPAT API — entrypoint FastAPI."""
import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from .api.routes import router  # noqa: E402


def _cors_origins() -> list[str]:
    raw = (os.getenv("CORS_ORIGINS") or "*").strip()
    if raw == "*":
        return ["*"]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]

app = FastAPI(
    title="Blanko PPAT API",
    description="Backend aplikasi pembuatan blanko/dokumen PPAT otomatis.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),  # produksi: isi CORS_ORIGINS di .env
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {"app": "Blanko PPAT API", "docs": "/docs", "health": "/api/v1/health"}
