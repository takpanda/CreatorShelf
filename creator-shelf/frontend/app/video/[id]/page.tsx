"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchMedia, savePlayback, toggleFavoriteMedia, markSeen, MediaItem } from "@/lib/api";
import { useSwipe } from "@/lib/useSwipe";
import { ArrowLeft, Heart, ChevronLeft, ChevronRight, Repeat, Repeat1 } from "lucide-react";

type RepeatMode = "none" | "one" | "all";

export default function VideoPlayerPage({ params }: { params: { id: string } }) {
  const mediaId = Number(params.id);
  const searchParams = useSearchParams();
  const creatorId = Number(searchParams.get("creator"));
  const [playlist, setPlaylist] = useState<MediaItem[]>([]);
  const [current, setCurrent] = useState<MediaItem | null>(null);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("none");
  const [videoLoading, setVideoLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playlistRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!creatorId) return;
    let active = true;
    fetchMedia(creatorId, { type: "video", limit: "500" }).then((items) => {
      if (!active) return;
      const sorted = [...items].sort((a, b) => b.file_name.localeCompare(a.file_name));
      setPlaylist(sorted);
      const found = sorted.find((m) => m.id === mediaId) || sorted[0];
      setCurrent(found ?? null);
    });
    return () => {
      active = false;
    };
  }, [creatorId, mediaId]);

  useEffect(() => {
    if (!current || !playlistRef.current || !activeItemRef.current) return;
    const container = playlistRef.current;
    const item = activeItemRef.current;
    const containerTop = container.scrollTop;
    const containerCenter = containerTop + container.clientHeight / 2;
    const itemCenter = item.offsetTop + item.offsetHeight / 2;
    container.scrollTo({ top: itemCenter - container.clientHeight / 2, behavior: "smooth" });
  }, [current]);

  useEffect(() => {
    if (!current || !videoRef.current) return;
    if (current.playback_position && current.playback_position > 5) {
      videoRef.current.currentTime = current.playback_position;
    }
    markSeen(current.id, true);
    saveTimerRef.current = setInterval(() => {
      if (videoRef.current) {
        savePlayback(current.id, videoRef.current.currentTime, videoRef.current.duration || 0);
      }
    }, 10000);
    return () => { if (saveTimerRef.current) clearInterval(saveTimerRef.current); };
  }, [current]);

  const handleFav = async () => {
    if (!current) return;
    const updated = await toggleFavoriteMedia(current.id, !current.is_favorite);
    setCurrent(updated);
    setPlaylist((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  const idx = playlist.findIndex((m) => m.id === current?.id);
  const prev = idx > 0 ? playlist[idx - 1] : null;
  const next = idx < playlist.length - 1 ? playlist[idx + 1] : null;
  const swipeHandlers = useSwipe(
    () => { if (next) setCurrent(next); },
    () => { if (prev) setCurrent(prev); }
  );

  const cycleRepeat = () => {
    setRepeatMode((m) => (m === "none" ? "all" : m === "all" ? "one" : "none"));
  };

  const handleEnded = () => {
    if (!current) return;
    if (repeatMode === "one") return; // loop attr handles it
    if (repeatMode === "all") {
      const nextItem = next ?? playlist[0];
      if (nextItem) { setCurrent(nextItem); return; }
    }
    savePlayback(current.id, 0, 0);
  };

  const from = searchParams.get("from");
  const backHref = from === "home" ? "/" : `/creators/${creatorId}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <Link href={backHref} className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">
            {current?.video_title ?? current?.file_name}
          </h1>
          {current?.video_title && (
            <p className="text-xs text-gray-400 truncate">{current.file_name}</p>
          )}
        </div>
        <button onClick={handleFav} className="text-gray-400 hover:text-red-400 transition">
          <Heart size={20} fill={current?.is_favorite ? "currentColor" : "none"} className={current?.is_favorite ? "text-red-400" : ""} />
        </button>
        <button
          onClick={cycleRepeat}
          title={repeatMode === "none" ? "リピートなし" : repeatMode === "all" ? "全曲リピート" : "1曲リピート"}
          className={`transition ${repeatMode !== "none" ? "text-blue-400" : "text-gray-400 hover:text-white"}`}
        >
          {repeatMode === "one" ? <Repeat1 size={20} /> : <Repeat size={20} />}
        </button>
      </div>

      {current && (
        <div className="relative" {...swipeHandlers}>
          {videoLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl z-10 pointer-events-none">
              <div className="w-12 h-12 border-4 border-gray-600 border-t-white rounded-full animate-spin" />
            </div>
          )}
          <video
            ref={videoRef}
            key={current.id}
            src={`/api/videos/${current.id}/stream`}
            controls
            loop={repeatMode === "one"}
            className="w-full rounded-xl bg-black"
            onLoadStart={() => setVideoLoading(true)}
            onCanPlay={() => setVideoLoading(false)}
            onEnded={handleEnded}
          />
        </div>
      )}

      {current && (current.video_title || current.video_description) && (
        <div className="mt-4 bg-gray-800 rounded-xl p-4 space-y-2">
          {current.video_title && (
            <h2 className="text-base font-semibold">{current.video_title}</h2>
          )}
          {current.video_posted_at && (
            <p className="text-xs text-gray-400">{current.video_posted_at}</p>
          )}
          {current.video_description && (
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{current.video_description}</p>
          )}
        </div>
      )}

      <div className="flex justify-between mt-4">
        <button
          disabled={!prev}
          onClick={() => prev && setCurrent(prev)}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 px-4 py-2 rounded-lg transition text-sm"
        >
          <ChevronLeft size={16} /> 前の動画
        </button>
        <button
          disabled={!next}
          onClick={() => next && setCurrent(next)}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 px-4 py-2 rounded-lg transition text-sm"
        >
          次の動画 <ChevronRight size={16} />
        </button>
      </div>

      {playlist.length > 1 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-3">プレイリスト ({playlist.length})</h2>
          <div ref={playlistRef} className="space-y-1 max-h-60 overflow-y-auto">
            {playlist.map((m) => (
              <button
                key={m.id}
                ref={m.id === current?.id ? activeItemRef : null}
                onClick={() => setCurrent(m)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition flex items-center gap-2 ${m.id === current?.id ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700"}`}
              >
                {m.thumbnail_path && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/videos/${m.id}/thumbnail`}
                    alt=""
                    className="h-9 w-16 object-cover rounded flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="truncate">{m.video_title ?? m.file_name}</div>
                  {m.video_title && (
                    <div className={`text-xs truncate ${m.id === current?.id ? "text-blue-200" : "text-gray-500"}`}>{m.file_name}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
