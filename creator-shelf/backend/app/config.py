from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # 後方互換用（単一パス）
    VIDEO_ROOT: str = "/media/mp4"
    PHOTO_ROOT: str = "/media/photo"
    # 複数パス指定用（カンマ区切り）。設定時は VIDEO_ROOT / PHOTO_ROOT を上書き
    VIDEO_ROOTS: str = ""
    PHOTO_ROOTS: str = ""
    DATABASE_PATH: str = "/app/data/app.db"
    THUMBNAIL_DIR: str = "/app/cache/thumbnails"
    SCAN_INTERVAL_MINUTES: int = 60
    TZ: str = "Asia/Tokyo"

    model_config = {"env_file": ".env"}

    @property
    def video_roots_list(self) -> list[str]:
        src = self.VIDEO_ROOTS.strip() or self.VIDEO_ROOT
        return [p.strip() for p in src.split(",") if p.strip()]

    @property
    def photo_roots_list(self) -> list[str]:
        src = self.PHOTO_ROOTS.strip() or self.PHOTO_ROOT
        return [p.strip() for p in src.split(",") if p.strip()]


settings = Settings()
