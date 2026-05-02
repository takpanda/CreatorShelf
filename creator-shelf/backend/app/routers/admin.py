import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db, AsyncSessionLocal
from app.models import AppSetting, Creator, MediaItem
from app.services.scanner import scan_nas, scan_progress
from app.services.thumbnail import generate_image_thumbnail, generate_video_thumbnail

router = APIRouter(prefix="/api/admin", tags=["admin"])

_scan_status: dict = {
    "running": False,
    "last_result": None,
    "started_at": None,
    "finished_at": None,
    "error": None,
}

_thumb_status: dict = {
    "running": False,
    "started_at": None,
    "finished_at": None,
    "error": None,
    "total": 0,
    "done": 0,
    "current_file": None,
    "generated": 0,
}


async def _run_scan_background() -> None:
    _scan_status["running"] = True
    _scan_status["started_at"] = datetime.now(timezone.utc).isoformat()
    _scan_status["error"] = None
    try:
        async with AsyncSessionLocal() as db:
            result = await scan_nas(db)
        _scan_status["last_result"] = result
        _scan_status["finished_at"] = datetime.now(timezone.utc).isoformat()
    except Exception as exc:
        _scan_status["error"] = str(exc)
        _scan_status["finished_at"] = datetime.now(timezone.utc).isoformat()
    finally:
        _scan_status["running"] = False


@router.post("/scan")
async def trigger_scan():
    if _scan_status["running"]:
        return {"status": "already_running"}
    asyncio.create_task(_run_scan_background())
    return {"status": "started"}


@router.get("/scan/progress/stream")
async def scan_progress_stream(request: Request):
    """SSE endpoint: スキャン進捗をリアルタイムでストリーム送信する"""

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                data = {
                    "running": _scan_status["running"],
                    "started_at": _scan_status["started_at"],
                    "finished_at": _scan_status["finished_at"],
                    "error": _scan_status["error"],
                    "last_result": _scan_status["last_result"],
                    "progress": {
                        "current_creator": scan_progress["current_creator"],
                        "current_file": scan_progress["current_file"],
                        "total_creators": scan_progress["total_creators"],
                        "done_creators": scan_progress["done_creators"],
                        "skipped": scan_progress["skipped"],
                        "new_files": scan_progress["new_files"][-50:],
                    },
                }
                yield f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.3)
        except asyncio.CancelledError:
            pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@router.get("/scan/status")
async def scan_status(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AppSetting).where(AppSetting.key == "last_scan_at"))
    setting = result.scalar_one_or_none()
    return {
        "running": _scan_status["running"],
        "last_scan_at": setting.value if setting else None,
        "last_result": _scan_status["last_result"],
        "started_at": _scan_status["started_at"],
        "finished_at": _scan_status["finished_at"],
        "error": _scan_status["error"],
        "progress": {
            "current_creator": scan_progress["current_creator"],
            "current_file": scan_progress["current_file"],
            "total_creators": scan_progress["total_creators"],
            "done_creators": scan_progress["done_creators"],
            "skipped": scan_progress["skipped"],
            "new_files": scan_progress["new_files"],
        },
    }


async def _run_thumb_regen_background() -> None:
    _thumb_status["running"] = True
    _thumb_status["started_at"] = datetime.now(timezone.utc).isoformat()
    _thumb_status["finished_at"] = None
    _thumb_status["error"] = None
    _thumb_status["done"] = 0
    _thumb_status["generated"] = 0
    _thumb_status["current_file"] = None
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(MediaItem).where(MediaItem.missing == False))  # noqa: E712
            items = result.scalars().all()
            _thumb_status["total"] = len(items)
            generated = 0
            for item in items:
                _thumb_status["current_file"] = Path(item.file_path).name
                if item.media_type == "image":
                    p = generate_image_thumbnail(item.id, item.file_path)
                else:
                    p = generate_video_thumbnail(item.id, item.file_path)
                if p:
                    item.thumbnail_path = p
                    generated += 1
                _thumb_status["done"] += 1
                _thumb_status["generated"] = generated
                # 他のコルーチンに制御を渡してポーリングが通るようにする
                await asyncio.sleep(0)
            await db.commit()
        _thumb_status["finished_at"] = datetime.now(timezone.utc).isoformat()
    except Exception as exc:
        _thumb_status["error"] = str(exc)
        _thumb_status["finished_at"] = datetime.now(timezone.utc).isoformat()
    finally:
        _thumb_status["running"] = False
        _thumb_status["current_file"] = None


@router.post("/thumbnails/regenerate")
async def regenerate_thumbnails():
    if _thumb_status["running"]:
        return {"status": "already_running"}
    asyncio.create_task(_run_thumb_regen_background())
    return {"status": "started"}


@router.get("/thumbnails/status")
async def thumbnail_status():
    return {
        "running": _thumb_status["running"],
        "started_at": _thumb_status["started_at"],
        "finished_at": _thumb_status["finished_at"],
        "error": _thumb_status["error"],
        "total": _thumb_status["total"],
        "done": _thumb_status["done"],
        "current_file": _thumb_status["current_file"],
        "generated": _thumb_status["generated"],
    }


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
