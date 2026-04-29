import asyncio
from pathlib import Path
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import AppSetting, Creator, MediaItem
from app.services.scanner import scan_nas
from app.services.thumbnail import generate_image_thumbnail, generate_video_thumbnail

router = APIRouter(prefix="/api/admin", tags=["admin"])

_scan_status = {"running": False, "last_result": None}


@router.post("/scan")
async def trigger_scan(db: AsyncSession = Depends(get_db)):
    if _scan_status["running"]:
        return {"status": "already_running"}
    _scan_status["running"] = True
    try:
        result = await scan_nas(db)
        _scan_status["last_result"] = result
        return {"status": "ok", "result": result}
    finally:
        _scan_status["running"] = False


@router.get("/scan/status")
async def scan_status(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AppSetting).where(AppSetting.key == "last_scan_at"))
    setting = result.scalar_one_or_none()
    return {
        "running": _scan_status["running"],
        "last_scan_at": setting.value if setting else None,
        "last_result": _scan_status["last_result"],
    }


@router.post("/thumbnails/regenerate")
async def regenerate_thumbnails(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MediaItem).where(MediaItem.missing == False))  # noqa: E712
    items = result.scalars().all()
    generated = 0
    for item in items:
        if item.media_type == "image":
            p = generate_image_thumbnail(item.id, item.file_path)
        else:
            p = generate_video_thumbnail(item.id, item.file_path)
        if p:
            item.thumbnail_path = p
            generated += 1
    await db.commit()
    return {"generated": generated}


@router.get("/integrity")
async def check_integrity(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Creator))
    creators = result.scalars().all()

    video_only = []
    photo_only = []
    both = []

    for c in creators:
        has_v = (c.video_count or 0) > 0
        has_p = (c.photo_count or 0) > 0
        if has_v and has_p:
            both.append(c.name)
        elif has_v:
            video_only.append(c.name)
        elif has_p:
            photo_only.append(c.name)

    result2 = await db.execute(select(MediaItem).where(MediaItem.missing == True))  # noqa: E712
    missing_items = [{"id": m.id, "file_path": m.file_path} for m in result2.scalars()]

    return {
        "video_only": video_only,
        "photo_only": photo_only,
        "both": both,
        "missing_files": missing_items,
    }
