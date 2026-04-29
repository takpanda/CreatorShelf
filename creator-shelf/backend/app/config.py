from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    VIDEO_ROOT: str = "/media/mp4"
    PHOTO_ROOT: str = "/media/photo"
    DATABASE_PATH: str = "/app/data/app.db"
    THUMBNAIL_DIR: str = "/app/cache/thumbnails"
    SCAN_INTERVAL_MINUTES: int = 60
    TZ: str = "Asia/Tokyo"

    model_config = {"env_file": ".env"}


settings = Settings()
