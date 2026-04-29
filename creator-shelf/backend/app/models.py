from datetime import datetime
from sqlalchemy import Boolean, DateTime, Float, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Creator(Base):
    __tablename__ = "creators"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    video_folder_path: Mapped[str | None] = mapped_column(Text)
    photo_folder_path: Mapped[str | None] = mapped_column(Text)
    video_count: Mapped[int] = mapped_column(Integer, default=0)
    photo_count: Mapped[int] = mapped_column(Integer, default=0)
    thumbnail_path: Mapped[str | None] = mapped_column(Text)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    favorite_at: Mapped[datetime | None] = mapped_column(DateTime)
    last_added_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())


class MediaItem(Base):
    __tablename__ = "media_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    creator_id: Mapped[int] = mapped_column(Integer, nullable=False)
    media_type: Mapped[str] = mapped_column(Text, nullable=False)  # video / image
    source_root: Mapped[str] = mapped_column(Text, nullable=False)  # mp4 / photo
    file_path: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    file_name: Mapped[str] = mapped_column(Text, nullable=False)
    extension: Mapped[str] = mapped_column(Text, nullable=False)
    mime_type: Mapped[str | None] = mapped_column(Text)
    size: Mapped[int | None] = mapped_column(Integer)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    duration: Mapped[float | None] = mapped_column(Float)
    thumbnail_path: Mapped[str | None] = mapped_column(Text)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    favorite_at: Mapped[datetime | None] = mapped_column(DateTime)
    is_seen: Mapped[bool] = mapped_column(Boolean, default=False)
    seen_at: Mapped[datetime | None] = mapped_column(DateTime)
    playback_position: Mapped[float | None] = mapped_column(Float)
    last_viewed_at: Mapped[datetime | None] = mapped_column(DateTime)
    file_modified_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    missing: Mapped[bool] = mapped_column(Boolean, default=False)


class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(Text, primary_key=True)
    value: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
