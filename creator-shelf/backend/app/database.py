from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import event, text
from app.config import settings

engine = create_async_engine(
    f"sqlite+aiosqlite:///{settings.DATABASE_PATH}",
    echo=False,
    connect_args={"timeout": 30, "check_same_thread": False},
)


@event.listens_for(engine.sync_engine, "connect")
def _set_sqlite_pragma(dbapi_conn, _):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()


AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


def _run_migrations(sync_conn) -> None:
    existing_columns = {
        row[1]
        for row in sync_conn.execute(text("PRAGMA table_info(media_items)")).fetchall()
    }
    if "thumbnail_failure_count" not in existing_columns:
        sync_conn.execute(
            text(
                "ALTER TABLE media_items ADD COLUMN thumbnail_failure_count INTEGER NOT NULL DEFAULT 0"
            )
        )


async def init_db():
    from app import models  # noqa: F401
    import os
    os.makedirs(os.path.dirname(settings.DATABASE_PATH), exist_ok=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_run_migrations)
