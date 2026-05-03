import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Creator


@pytest.mark.asyncio
async def test_creator_stats_excludes_empty_creators():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False, future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        session.add_all(
            [
                Creator(name="empty", video_count=0, photo_count=0),
                Creator(name="video_creator", video_count=2, photo_count=0),
                Creator(name="photo_creator", video_count=0, photo_count=1, is_favorite=True),
            ]
        )
        await session.commit()

        non_empty = Creator.video_count + Creator.photo_count > 0
        result = await session.execute(
            select(
                func.count(Creator.id).filter(non_empty).label("creator_count"),
                func.count(Creator.id).filter(non_empty, Creator.is_favorite == True).label("favorite_count"),
            )
        )
        row = result.one()
        assert row.creator_count == 2
        assert row.favorite_count == 1


@pytest.mark.asyncio
async def test_list_creators_excludes_empty_creators():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False, future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        session.add_all(
            [
                Creator(name="empty", video_count=0, photo_count=0),
                Creator(name="video_creator", video_count=2, photo_count=0),
            ]
        )
        await session.commit()

        result = await session.execute(
            select(Creator).where((Creator.video_count + Creator.photo_count) > 0)
        )
        rows = result.scalars().all()
        assert len(rows) == 1
        assert rows[0].name == "video_creator"
