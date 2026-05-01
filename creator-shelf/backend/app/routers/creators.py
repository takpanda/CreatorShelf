from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import Creator
from app.schemas import CreatorOut, FavoriteUpdate

router = APIRouter(prefix="/api/creators", tags=["creators"])


@router.get("", response_model=list[CreatorOut])
async def list_creators(
    q: str | None = Query(None),
    favorite: bool | None = Query(None),
    has_video: bool | None = Query(None),
    has_photo: bool | None = Query(None),
    sort: str = Query("name"),
    limit: int = Query(30, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Creator)
    if q:
        stmt = stmt.where(Creator.name.ilike(f"%{q}%"))
    if favorite is True:
        stmt = stmt.where(Creator.is_favorite == True)  # noqa: E712
    if has_video is True:
        stmt = stmt.where(Creator.video_count > 0)
    if has_photo is True:
        stmt = stmt.where(Creator.photo_count > 0)

    if sort == "name":
        stmt = stmt.order_by(Creator.name)
    elif sort == "last_added":
        stmt = stmt.order_by(Creator.last_added_at.desc())
    elif sort == "favorite":
        stmt = stmt.order_by(Creator.favorite_at.desc().nullslast())

    stmt = stmt.limit(limit).offset(offset)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{creator_id}", response_model=CreatorOut)
async def get_creator(creator_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Creator).where(Creator.id == creator_id))
    creator = result.scalar_one_or_none()
    if creator is None:
        raise HTTPException(status_code=404, detail="Creator not found")
    return creator


@router.patch("/{creator_id}/favorite", response_model=CreatorOut)
async def update_creator_favorite(
    creator_id: int, body: FavoriteUpdate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Creator).where(Creator.id == creator_id))
    creator = result.scalar_one_or_none()
    if creator is None:
        raise HTTPException(status_code=404, detail="Creator not found")
    creator.is_favorite = body.isFavorite
    creator.favorite_at = datetime.now(timezone.utc).replace(tzinfo=None) if body.isFavorite else None
    await db.commit()
    await db.refresh(creator)
    return creator
