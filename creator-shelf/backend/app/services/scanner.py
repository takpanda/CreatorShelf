import asyncio
import os
import mimetypes
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import Creator, MediaItem, AppSetting
from app.config import settings
from app.services.thumbnail import get_video_duration

_scan_lock = asyncio.Lock()

VIDEO_EXTENSIONS = {".mp4", ".mov", ".mkv", ".webm"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def scan_nas(db: AsyncSession) -> dict:
    if _scan_lock.locked():
        return {"skipped": True, "reason": "scan already running"}
    async with _scan_lock:
        return await _scan_nas_impl(db)


async def _scan_nas_impl(db: AsyncSession) -> dict:
    video_root = Path(settings.VIDEO_ROOT)
    photo_root = Path(settings.PHOTO_ROOT)

    # 差分スキャン: 前回スキャン時刻を取得
    result = await db.execute(select(AppSetting).where(AppSetting.key == "last_scan_at"))
    setting = result.scalar_one_or_none()
    last_scan: datetime | None = datetime.fromisoformat(setting.value) if setting else None

    creators_map: dict[str, dict] = {}

    if video_root.exists():
        for creator_dir in sorted(video_root.iterdir()):
            if creator_dir.is_dir():
                name = creator_dir.name
                creators_map.setdefault(name, {})["video_folder"] = str(creator_dir)

    if photo_root.exists():
        for creator_dir in sorted(photo_root.iterdir()):
            if creator_dir.is_dir():
                name = creator_dir.name
                creators_map.setdefault(name, {})["photo_folder"] = str(creator_dir)

    scanned_creators = 0
    scanned_media = 0

    for name, folders in creators_map.items():
        result = await db.execute(select(Creator).where(Creator.name == name))
        creator = result.scalar_one_or_none()
        if creator is None:
            creator = Creator(name=name)
            db.add(creator)
            await db.flush()

        creator.video_folder_path = folders.get("video_folder")
        creator.photo_folder_path = folders.get("photo_folder")

        video_count = 0
        photo_count = 0
        last_added: datetime | None = None

        if creator.video_folder_path:
            for f in Path(creator.video_folder_path).iterdir():
                if f.is_file() and f.suffix.lower() in VIDEO_EXTENSIONS:
                    if last_scan and datetime.fromtimestamp(f.stat().st_mtime) <= last_scan:
                        video_count += 1
                        continue
                    item = await _upsert_media(db, creator, f, "video", "mp4")
                    if item:
                        video_count += 1
                        scanned_media += 1
                        mtime = datetime.fromtimestamp(f.stat().st_mtime)
                        if last_added is None or mtime > last_added:
                            last_added = mtime

        if creator.photo_folder_path:
            for f in Path(creator.photo_folder_path).iterdir():
                if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS:
                    if last_scan and datetime.fromtimestamp(f.stat().st_mtime) <= last_scan:
                        photo_count += 1
                        continue
                    item = await _upsert_media(db, creator, f, "image", "photo")
                    if item:
                        photo_count += 1
                        scanned_media += 1
                        mtime = datetime.fromtimestamp(f.stat().st_mtime)
                        if last_added is None or mtime > last_added:
                            last_added = mtime

        creator.video_count = video_count
        creator.photo_count = photo_count
        if last_added:
            creator.last_added_at = last_added
        creator.updated_at = _utcnow()

        scanned_creators += 1

    # mark missing files
    result = await db.execute(select(MediaItem).where(MediaItem.missing == False))  # noqa: E712
    for item in result.scalars():
        if not Path(item.file_path).exists():
            item.missing = True

    await _save_setting(db, "last_scan_at", _utcnow().isoformat())
    await db.commit()

    return {"creators": scanned_creators, "media": scanned_media}


async def _upsert_media(
    db: AsyncSession, creator: Creator, f: Path, media_type: str, source_root: str
) -> MediaItem | None:
    result = await db.execute(select(MediaItem).where(MediaItem.file_path == str(f)))
    item = result.scalar_one_or_none()
    stat = f.stat()
    mtime = datetime.fromtimestamp(stat.st_mtime)
    mime = mimetypes.guess_type(f.name)[0]

    if item is None:
        item = MediaItem(
            creator_id=creator.id,
            media_type=media_type,
            source_root=source_root,
            file_path=str(f),
            file_name=f.name,
            extension=f.suffix.lower(),
            mime_type=mime,
            size=stat.st_size,
            file_modified_at=mtime,
        )
        if media_type == "video":
            item.duration = await get_video_duration(str(f))
        db.add(item)
    else:
        item.missing = False
        item.file_modified_at = mtime
        item.size = stat.st_size
        if media_type == "video" and item.duration is None:
            item.duration = await get_video_duration(str(f))
    return item


async def _save_setting(db: AsyncSession, key: str, value: str):
    result = await db.execute(select(AppSetting).where(AppSetting.key == key))
    s = result.scalar_one_or_none()
    if s is None:
        db.add(AppSetting(key=key, value=value))
    else:
        s.value = value
