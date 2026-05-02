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

MAX_LOG_ENTRIES = 200

# スキャン進捗 (admin.py から参照)
scan_progress: dict = {
    "current_creator": None,
    "current_file": None,
    "total_creators": 0,
    "done_creators": 0,
    "new_files": [],   # [{creator, file, type}]
    "skipped": 0,
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def scan_nas(db: AsyncSession) -> dict:
    if _scan_lock.locked():
        return {"skipped": True, "reason": "scan already running"}
    async with _scan_lock:
        return await _scan_nas_impl(db)


async def _scan_nas_impl(db: AsyncSession) -> dict:
    video_roots = [Path(p) for p in settings.video_roots_list]
    photo_roots = [Path(p) for p in settings.photo_roots_list]

    # 差分スキャン: 前回スキャン時刻を取得
    result = await db.execute(select(AppSetting).where(AppSetting.key == "last_scan_at"))
    setting = result.scalar_one_or_none()
    last_scan: datetime | None = datetime.fromisoformat(setting.value) if setting else None

    # creators_map[name] = {"video_folders": [...], "photo_folders": [...]}
    creators_map: dict[str, dict] = {}

    # 進捗リセット
    scan_progress["current_creator"] = None
    scan_progress["current_file"] = None
    scan_progress["total_creators"] = 0
    scan_progress["done_creators"] = 0
    scan_progress["new_files"] = []
    scan_progress["skipped"] = 0

    for video_root in video_roots:
        if video_root.exists():
            for creator_dir in sorted(video_root.iterdir()):
                if creator_dir.is_dir():
                    name = creator_dir.name
                    entry = creators_map.setdefault(name, {"video_folders": [], "photo_folders": []})
                    entry["video_folders"].append(str(creator_dir))

    for photo_root in photo_roots:
        if photo_root.exists():
            for creator_dir in sorted(photo_root.iterdir()):
                if creator_dir.is_dir():
                    name = creator_dir.name
                    entry = creators_map.setdefault(name, {"video_folders": [], "photo_folders": []})
                    entry["photo_folders"].append(str(creator_dir))

    scanned_creators = 0
    scanned_media = 0

    scan_progress["total_creators"] = len(creators_map)

    for name, folders in creators_map.items():
        scan_progress["current_creator"] = name
        result = await db.execute(select(Creator).where(Creator.name == name))
        creator = result.scalar_one_or_none()
        if creator is None:
            creator = Creator(name=name)
            db.add(creator)
            await db.flush()

        result = await db.execute(select(MediaItem).where(MediaItem.creator_id == creator.id))
        indexed_media_by_path = {item.file_path: item for item in result.scalars().all()}

        video_folders = folders["video_folders"]
        photo_folders = folders["photo_folders"]

        # カンマ区切りで複数パスを保存
        creator.video_folder_path = ",".join(video_folders) if video_folders else None
        creator.photo_folder_path = ",".join(photo_folders) if photo_folders else None

        video_count = 0
        photo_count = 0
        last_added: datetime | None = None

        for vf in video_folders:
            for f in Path(vf).iterdir():
                if f.is_file() and f.suffix.lower() in VIDEO_EXTENSIONS:
                    scan_progress["current_file"] = f.name
                    existing_item = indexed_media_by_path.get(str(f))
                    if (
                        existing_item is not None
                        and existing_item.missing is False
                        and last_scan
                        and datetime.fromtimestamp(f.stat().st_mtime) <= last_scan
                    ):
                        video_count += 1
                        scan_progress["skipped"] += 1
                        await asyncio.sleep(0)
                        continue
                    item = await _upsert_media(db, creator, f, "video", "mp4", existing_item)
                    if item:
                        indexed_media_by_path[str(f)] = item
                        video_count += 1
                        scanned_media += 1
                        mtime = datetime.fromtimestamp(f.stat().st_mtime)
                        if last_added is None or mtime > last_added:
                            last_added = mtime
                        _append_log(name, f.name, "video")

        for pf in photo_folders:
            for f in Path(pf).iterdir():
                if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS:
                    scan_progress["current_file"] = f.name
                    existing_item = indexed_media_by_path.get(str(f))
                    if (
                        existing_item is not None
                        and existing_item.missing is False
                        and last_scan
                        and datetime.fromtimestamp(f.stat().st_mtime) <= last_scan
                    ):
                        photo_count += 1
                        scan_progress["skipped"] += 1
                        await asyncio.sleep(0)
                        continue
                    item = await _upsert_media(db, creator, f, "image", "photo", existing_item)
                    if item:
                        indexed_media_by_path[str(f)] = item
                        photo_count += 1
                        scanned_media += 1
                        mtime = datetime.fromtimestamp(f.stat().st_mtime)
                        if last_added is None or mtime > last_added:
                            last_added = mtime
                        _append_log(name, f.name, "image")

        creator.video_count = video_count
        creator.photo_count = photo_count
        if last_added:
            creator.last_added_at = last_added
        creator.updated_at = _utcnow()

        scanned_creators += 1
        scan_progress["done_creators"] = scanned_creators
        scan_progress["current_file"] = None

    # mark missing files
    result = await db.execute(select(MediaItem).where(MediaItem.missing == False))  # noqa: E712
    for item in result.scalars():
        if not Path(item.file_path).exists():
            item.missing = True

    await _save_setting(db, "last_scan_at", _utcnow().isoformat())
    await db.commit()

    scan_progress["current_creator"] = None
    scan_progress["current_file"] = None

    return {"creators": scanned_creators, "media": scanned_media}


def _append_log(creator: str, filename: str, media_type: str) -> None:
    scan_progress["new_files"].append({"creator": creator, "file": filename, "type": media_type})
    if len(scan_progress["new_files"]) > MAX_LOG_ENTRIES:
        scan_progress["new_files"] = scan_progress["new_files"][-MAX_LOG_ENTRIES:]


async def _upsert_media(
    db: AsyncSession,
    creator: Creator,
    f: Path,
    media_type: str,
    source_root: str,
    item: MediaItem | None = None,
) -> MediaItem | None:
    if item is None:
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
