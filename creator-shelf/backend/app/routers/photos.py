from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import MediaItem
from app.services.thumbnail import generate_image_thumbnail

router = APIRouter(prefix="/api/photos", tags=["photos"])


@router.get("/{media_id}/image")
async def get_photo(media_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MediaItem).where(MediaItem.id == media_id, MediaItem.media_type == "image")
    )
    item = result.scalar_one_or_none()
    if item is None or item.missing:
        raise HTTPException(status_code=404, detail="Photo not found")
    path = Path(item.file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")
    return FileResponse(str(path), media_type=item.mime_type or "image/jpeg")


@router.get("/{media_id}/thumbnail")
async def get_photo_thumbnail(media_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MediaItem).where(MediaItem.id == media_id, MediaItem.media_type == "image")
    )
    item = result.scalar_one_or_none()
    if item is None or item.missing:
        raise HTTPException(status_code=404, detail="Photo not found")

    thumb_path = item.thumbnail_path
    if not thumb_path or not Path(thumb_path).exists():
        thumb_path = generate_image_thumbnail(media_id, item.file_path)
        if thumb_path:
            item.thumbnail_path = thumb_path
            await db.commit()

    if thumb_path and Path(thumb_path).exists():
        return FileResponse(thumb_path, media_type="image/jpeg")
    raise HTTPException(status_code=404, detail="Thumbnail not available")
