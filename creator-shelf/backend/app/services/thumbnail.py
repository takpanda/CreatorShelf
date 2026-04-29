import os
import subprocess
from pathlib import Path
from PIL import Image, ImageOps
from app.config import settings


THUMB_SIZE = (320, 320)


def _thumb_path(media_id: int) -> Path:
    d = Path(settings.THUMBNAIL_DIR)
    d.mkdir(parents=True, exist_ok=True)
    return d / f"{media_id}.jpg"


def generate_image_thumbnail(media_id: int, source_path: str) -> str | None:
    out = _thumb_path(media_id)
    if out.exists():
        return str(out)
    try:
        with Image.open(source_path) as img:
            img = ImageOps.exif_transpose(img)
            img.thumbnail(THUMB_SIZE)
            img = img.convert("RGB")
            img.save(out, "JPEG", quality=85)
        return str(out)
    except Exception:
        return None


def generate_video_thumbnail(media_id: int, source_path: str) -> str | None:
    out = _thumb_path(media_id)
    if out.exists():
        return str(out)
    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y", "-ss", "3",
                "-i", source_path,
                "-vframes", "1",
                "-vf", f"scale={THUMB_SIZE[0]}:-1",
                str(out),
            ],
            capture_output=True,
            timeout=30,
        )
        if result.returncode == 0 and out.exists():
            return str(out)
        return None
    except Exception:
        return None


def get_video_duration(source_path: str) -> float | None:
    try:
        result = subprocess.run(
            [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                source_path,
            ],
            capture_output=True,
            text=True,
            timeout=10,
        )
        val = result.stdout.strip()
        return float(val) if val else None
    except Exception:
        return None
