"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchMedia, toggleFavoriteMedia, markSeen, MediaItem } from "@/lib/api";
import { useSwipe } from "@/lib/useSwipe";
import { ArrowLeft, Heart, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";

export default function PhotoViewerPage({ params }: { params: { id: string } }) {
  const mediaId = Number(params.id);
  const searchParams = useSearchParams();
  const creatorId = Number(searchParams.get("creator"));
  const [playlist, setPlaylist] = useState<MediaItem[]>([]);
  const [current, setCurrent] = useState<MediaItem | null>(null);
  const [imgLoading, setImgLoading] = useState(false);

  useEffect(() => {
    if (!creatorId) return;
    fetchMedia(creatorId, { type: "image", limit: "1000" }).then((items) => {
      setPlaylist(items);
      const found = items.find((m) => m.id === mediaId) || items[0];
      setCurrent(found ?? null);
    });
  }, [creatorId, mediaId]);

  useEffect(() => {
    if (current) markSeen(current.id, true);
  }, [current]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const idx = playlist.findIndex((m) => m.id === current?.id);
  const goPrev = () => { setImgLoading(true); if (idx > 0) setCurrent(playlist[idx - 1]); };
  const goNext = () => { setImgLoading(true); if (idx < playlist.length - 1) setCurrent(playlist[idx + 1]); };
  const swipeHandlers = useSwipe(goNext, goPrev);

  const handleFav = async () => {
    if (!current) return;
    const updated = await toggleFavoriteMedia(current.id, !current.is_favorite);
    setCurrent(updated);
    setPlaylist((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  const from = searchParams.get("from");
  const backHref = from === "home" ? "/" : `/creators/${creatorId}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href={backHref} className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></Link>
        <h1 className="text-lg font-semibold flex-1 truncate">
          {current?.photo_title ?? current?.file_name}
        </h1>
        <button onClick={handleFav} className="text-gray-400 hover:text-red-400 transition">
          <Heart size={20} fill={current?.is_favorite ? "currentColor" : "none"} className={current?.is_favorite ? "text-red-400" : ""} />
        </button>
        {current && (
          <a href={`/api/photos/${current.id}/image`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
            <Maximize2 size={18} />
          </a>
        )}
      </div>

      {current && (
        <div className="relative" {...swipeHandlers}>
          {imgLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl z-10">
              <div className="w-10 h-10 border-4 border-gray-600 border-t-white rounded-full animate-spin" />
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={current.id}
            src={`/api/photos/${current.id}/image`}
            alt={current.file_name}
            className="w-full rounded-xl object-contain max-h-[70vh] bg-black"
            onLoadStart={() => setImgLoading(true)}
            onLoad={() => setImgLoading(false)}
          />
          <button
            onClick={goPrev}
            disabled={idx <= 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 disabled:opacity-20 rounded-full p-2 transition"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={goNext}
            disabled={idx >= playlist.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 disabled:opacity-20 rounded-full p-2 transition"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      )}

      <div className="text-center text-sm text-gray-400 mt-3">
        {idx + 1} / {playlist.length}
      </div>

      {current?.photo_description && (
        <div className="mt-4 bg-gray-800 rounded-xl p-4">
          {current.photo_title && (
            <h2 className="text-white font-semibold mb-2">{current.photo_title}</h2>
          )}
          <p className="text-gray-300 text-sm whitespace-pre-wrap">{current.photo_description}</p>
        </div>
      )}
    </div>
  );
}
