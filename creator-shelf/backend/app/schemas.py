from datetime import datetime
from pydantic import BaseModel


class CreatorOut(BaseModel):
    id: int
    name: str
    video_folder_path: str | None
    photo_folder_path: str | None
    video_count: int
    photo_count: int
    thumbnail_path: str | None
    is_favorite: bool
    favorite_at: datetime | None
    last_added_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MediaItemOut(BaseModel):
    id: int
    creator_id: int
    media_type: str
    source_root: str
    file_path: str
    file_name: str
    extension: str
    mime_type: str | None
    size: int | None
    width: int | None
    height: int | None
    duration: float | None
    thumbnail_path: str | None
    is_favorite: bool
    favorite_at: datetime | None
    is_seen: bool
    seen_at: datetime | None
    playback_position: float | None
    last_viewed_at: datetime | None
    file_modified_at: datetime | None
    created_at: datetime
    updated_at: datetime
    missing: bool
    # txt ファイルから取得するオプション情報（動画）
    video_title: str | None = None
    video_posted_at: str | None = None
    video_description: str | None = None
    # txt ファイルから取得するオプション情報（画像）
    photo_title: str | None = None
    photo_description: str | None = None

    model_config = {"from_attributes": True}


class FavoriteUpdate(BaseModel):
    isFavorite: bool


class SeenUpdate(BaseModel):
    isSeen: bool


class PlaybackUpdate(BaseModel):
    position: float
    duration: float


class SlideshowItem(BaseModel):
    id: int
    url: str
    thumbnailUrl: str | None
    favorite: bool


class SlideshowResponse(BaseModel):
    creator: dict
    items: list[SlideshowItem]
