import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db
from app.routers import creators, media, videos, photos, admin
from app.services.scanner import scan_nas
from app.database import AsyncSessionLocal


async def _background_scan():
    async with AsyncSessionLocal() as db:
        await scan_nas(db)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    asyncio.create_task(_background_scan())
    yield


app = FastAPI(title="CreatorShelf API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(creators.router)
app.include_router(media.router)
app.include_router(videos.router)
app.include_router(photos.router)
app.include_router(admin.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
