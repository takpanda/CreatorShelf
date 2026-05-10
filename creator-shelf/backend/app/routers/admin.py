import asyncio
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db, AsyncSessionLocal
from app.models import AppSetting, Creator, MediaItem
from app.services.scanner import scan_nas, scan_progress
from app.services.thumbnail import generate_image_thumbnail, generate_video_thumbnail, THUMBNAIL_FAILURE_THRESHOLD

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
    "skipped": 0,
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
    _scan_status["running"] = True
    task = asyncio.create_task(_run_scan_background())
    _tasks.add(task)
    task.add_done_callback(_tasks.discard)
    return {"status": "started"}


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


_tasks: set[asyncio.Task] = set()


async def _run_thumb_regen_background(missing_only: bool = False) -> None:
    _thumb_status["running"] = True
    _thumb_status["started_at"] = datetime.now(timezone.utc).isoformat()
    _thumb_status["finished_at"] = None
    _thumb_status["error"] = None
    _thumb_status["done"] = 0
    _thumb_status["generated"] = 0
    _thumb_status["current_file"] = None
    _thumb_status["skipped"] = 0
    try:
        async with AsyncSessionLocal() as db:
            if missing_only:
                result = await db.execute(
                    select(MediaItem.id).where(
                        MediaItem.missing == False,
                        MediaItem.thumbnail_path.is_(None),
                        MediaItem.thumbnail_failure_count < THUMBNAIL_FAILURE_THRESHOLD,
                    )
                )
                skipped_result = await db.execute(
                    select(MediaItem.id).where(
                        MediaItem.missing == False,
                        MediaItem.thumbnail_path.is_(None),
                        MediaItem.thumbnail_failure_count >= THUMBNAIL_FAILURE_THRESHOLD,
                    )
                )
            else:
                result = await db.execute(
                    select(MediaItem.id).where(
                        MediaItem.missing == False,
                        MediaItem.thumbnail_failure_count < THUMBNAIL_FAILURE_THRESHOLD,
                    )
                )  # noqa: E712
                skipped_result = await db.execute(
                    select(MediaItem.id).where(
                        MediaItem.missing == False,
                        MediaItem.thumbnail_failure_count >= THUMBNAIL_FAILURE_THRESHOLD,
                    )
                )
            item_ids = result.scalars().all()
            skipped_items = skipped_result.scalars().all()
            _thumb_status["total"] = len(item_ids)
            _thumb_status["skipped"] = len(skipped_items)
            generated = 0
            failed = 0
            failed_samples: list[str] = []
            batch_count = 0
            for item_id in item_ids:
                item = await db.get(MediaItem, item_id)
                if item is None:
                    continue
                _thumb_status["current_file"] = Path(item.file_path).name
                if item.media_type == "image":
                    p = generate_image_thumbnail(item.id, item.file_path)
                else:
                    p = generate_video_thumbnail(item.id, item.file_path)
                if p:
                    item.thumbnail_path = p
                    item.thumbnail_failure_count = 0
                    generated += 1
                else:
                    item.thumbnail_failure_count += 1
                    failed += 1
                    if len(failed_samples) < 5:
                        failed_samples.append(Path(item.file_path).name)
                _thumb_status["done"] += 1
                _thumb_status["generated"] = generated
                batch_count += 1
                if batch_count >= 50:
                    await db.commit()
                    batch_count = 0
                # 他のコルーチンに制御を渡してポーリングが通るようにする
                await asyncio.sleep(0)
            if batch_count:
                await db.commit()
            if failed > 0:
                sample_text = ", ".join(failed_samples)
                _thumb_status["error"] = f"{failed} 件のサムネイル生成に失敗しました。例: {sample_text}"
        _thumb_status["finished_at"] = datetime.now(timezone.utc).isoformat()
    except Exception as exc:
        _thumb_status["error"] = str(exc)
        _thumb_status["finished_at"] = datetime.now(timezone.utc).isoformat()
    finally:
        _thumb_status["running"] = False
        _thumb_status["current_file"] = None


@router.post("/thumbnails/regenerate")
async def regenerate_thumbnails(missing_only: bool = Query(False, alias="missingOnly")):
    if _thumb_status["running"]:
        return {"status": "already_running"}
    asyncio.create_task(_run_thumb_regen_background(missing_only))
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
        "skipped": _thumb_status["skipped"],
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
