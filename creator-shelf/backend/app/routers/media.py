from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import MediaItem, Creator
from app.schemas import MediaItemOut, FavoriteUpdate, SeenUpdate, SlideshowResponse, SlideshowItem
from app.services.txt_parser import parse_video_txt, parse_photo_txt


def _enrich(item: MediaItem) -> dict:
    """MediaItem を dict に変換し、txt 情報を付与する。"""
    d = MediaItemOut.model_validate(item).model_dump()
    if item.file_path:
        if item.media_type == "video":
            info = parse_video_txt(item.file_path)
            if info:
                d.update(info)
        elif item.media_type == "image":
            info = parse_photo_txt(item.file_path)
            if info:
                d.update(info)
    return d

router = APIRouter(tags=["media"])


@router.get("/api/media/recent")
async def list_recent_media(
    type: str = Query("all"),
    limit: int = Query(12, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(MediaItem, Creator.name.label("creator_name")).join(
        Creator, MediaItem.creator_id == Creator.id
    ).where(MediaItem.missing == False)  # noqa: E712
    if type == "video":
        stmt = stmt.where(MediaItem.media_type == "video")
    elif type == "image":
        stmt = stmt.where(MediaItem.media_type == "image")
    stmt = stmt.order_by(MediaItem.file_modified_at.desc().nullslast()).limit(limit)
    result = await db.execute(stmt)
    rows = result.all()
    items = []
    for item, creator_name in rows:
        d = _enrich(item)
        d["creator_name"] = creator_name
        items.append(d)
    return items


@router.get("/api/creators/{creator_id}/media", response_model=list[MediaItemOut])
async def list_creator_media(
    creator_id: int,
    type: str = Query("all"),
    favorite: bool | None = Query(None),
    seen: str | None = Query(None),
    sort: str = Query("newest"),
    limit: int = Query(50, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(MediaItem).where(
        MediaItem.creator_id == creator_id,
        MediaItem.missing == False,  # noqa: E712
    )
    if type == "video":
        stmt = stmt.where(MediaItem.media_type == "video")
    elif type == "image":
        stmt = stmt.where(MediaItem.media_type == "image")
    if favorite is True:
        stmt = stmt.where(MediaItem.is_favorite == True)  # noqa: E712
    if seen == "seen":
        stmt = stmt.where(MediaItem.is_seen == True)  # noqa: E712
    elif seen == "unseen":
        stmt = stmt.where(MediaItem.is_seen == False)  # noqa: E712

    if sort == "file_name":
        stmt = stmt.order_by(MediaItem.file_name)
    elif sort == "newest":
        stmt = stmt.order_by(MediaItem.file_modified_at.desc())
    elif sort == "oldest":
        stmt = stmt.order_by(MediaItem.file_modified_at.asc())
    elif sort == "favorite":
        stmt = stmt.order_by(MediaItem.favorite_at.desc().nullslast())

    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    return [_enrich(item) for item in result.scalars().all()]


@router.get("/api/media/{media_id}", response_model=MediaItemOut)
async def get_media(media_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MediaItem).where(MediaItem.id == media_id))
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Media not found")
    return _enrich(item)


@router.patch("/api/media/{media_id}/favorite", response_model=MediaItemOut)
async def update_media_favorite(
    media_id: int, body: FavoriteUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(MediaItem).where(MediaItem.id == media_id))
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Media not found")
    item.is_favorite = body.isFavorite
    item.favorite_at = datetime.now(timezone.utc).replace(tzinfo=None) if body.isFavorite else None
    await db.commit()
    await db.refresh(item)
    return _enrich(item)


@router.patch("/api/media/{media_id}/seen", response_model=MediaItemOut)
async def update_media_seen(
    media_id: int, body: SeenUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(MediaItem).where(MediaItem.id == media_id))
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=404, detail="Media not found")
    item.is_seen = body.isSeen
    item.seen_at = datetime.now(timezone.utc).replace(tzinfo=None) if body.isSeen else None
    await db.commit()
    await db.refresh(item)
    return _enrich(item)


@router.get("/api/creators/{creator_id}/slideshow", response_model=SlideshowResponse)
async def get_slideshow(
    creator_id: int,
    favorite: bool | None = Query(None),
    order: str = Query("filename"),
    limit: int = Query(500, ge=1, le=2000),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Creator).where(Creator.id == creator_id))
    creator = result.scalar_one_or_none()
    if creator is None:
        raise HTTPException(status_code=404, detail="Creator not found")

    stmt = select(MediaItem).where(
        MediaItem.creator_id == creator_id,
        MediaItem.media_type == "image",
        MediaItem.missing == False,  # noqa: E712
    )
    if favorite is True:
        stmt = stmt.where(MediaItem.is_favorite == True)  # noqa: E712

    if order == "newest":
        stmt = stmt.order_by(MediaItem.file_modified_at.desc())
    elif order == "oldest":
        stmt = stmt.order_by(MediaItem.file_modified_at.asc())
    elif order == "random":
        from sqlalchemy import func
        stmt = stmt.order_by(func.random())
    else:
        stmt = stmt.order_by(MediaItem.file_name)

    stmt = stmt.limit(limit)
    items_result = await db.execute(stmt)
    items = items_result.scalars().all()

    return SlideshowResponse(
        creator={"id": creator.id, "name": creator.name},
        items=[
            SlideshowItem(
                id=m.id,
                url=f"/api/photos/{m.id}/image",
                thumbnailUrl=f"/api/photos/{m.id}/thumbnail" if m.thumbnail_path else None,
                favorite=m.is_favorite,
            )
            for m in items
        ],
    )
