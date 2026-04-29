import os
from pathlib import Path
from fastapi import HTTPException
from fastapi.responses import StreamingResponse


CHUNK_SIZE = 1024 * 1024  # 1MB


async def stream_video(file_path: str, range_header: str | None) -> StreamingResponse:
    path = Path(file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    file_size = path.stat().st_size
    start = 0
    end = file_size - 1

    if range_header:
        try:
            range_val = range_header.replace("bytes=", "")
            parts = range_val.split("-")
            start = int(parts[0]) if parts[0] else 0
            end = int(parts[1]) if parts[1] else file_size - 1
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid Range header")

    if start > end or start < 0 or end >= file_size:
        raise HTTPException(
            status_code=416,
            detail="Requested Range Not Satisfiable",
            headers={"Content-Range": f"bytes */{file_size}"},
        )

    content_length = end - start + 1

    async def file_iterator():
        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = content_length
            while remaining > 0:
                chunk = f.read(min(CHUNK_SIZE, remaining))
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk

    status_code = 206 if range_header else 200
    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": "video/mp4",
    }

    return StreamingResponse(file_iterator(), status_code=status_code, headers=headers)
