from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import MediaItem
from app.schemas import PlaybackUpdate, MediaItemOut
from app.services.streaming import stream_video
from app.services.thumbnail import generate_video_thumbnail, THUMBNAIL_FAILURE_THRESHOLD
from pathlib import Path
from fastapi.responses import FileResponse

router = APIRouter(prefix="/api/videos", tags=["videos"])


@router.get("/{media_id}/stream")
async def video_stream(
    media_id: int,
    range: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MediaItem).where(MediaItem.id == media_id, MediaItem.media_type == "video")
    )
    item = result.scalar_one_or_none()
    if item is None or item.missing:
        raise HTTPException(status_code=404, detail="Video not found")
    return await stream_video(item.file_path, range)


@router.patch("/{media_id}/playback", response_model=MediaItemOut)
async def update_playback(
    media_id: int, body: PlaybackUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(MediaItem).where(MediaItem.id == media_id))
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Media not found")
    item.playback_position = body.position
    item.last_viewed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/{media_id}/thumbnail")
async def get_video_thumbnail(media_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MediaItem).where(MediaItem.id == media_id, MediaItem.media_type == "video")
    )
    item = result.scalar_one_or_none()
    if item is None or item.missing:
        raise HTTPException(status_code=404, detail="Video not found")
    thumb_path = item.thumbnail_path
    if not thumb_path or not Path(thumb_path).exists():
        if item.thumbnail_failure_count >= THUMBNAIL_FAILURE_THRESHOLD:
            raise HTTPException(status_code=404, detail="Thumbnail not available")

        thumb_path = generate_video_thumbnail(media_id, item.file_path)
        if thumb_path:
            item.thumbnail_path = thumb_path
            item.thumbnail_failure_count = 0
        else:
            item.thumbnail_failure_count += 1
        await db.commit()
    if thumb_path and Path(thumb_path).exists():
        return FileResponse(thumb_path, media_type="image/jpeg")
    raise HTTPException(status_code=404, detail="Thumbnail not available")
