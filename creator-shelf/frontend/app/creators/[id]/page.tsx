"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fetchCreator,
  fetchMedia,
  toggleFavoriteCreator,
  toggleFavoriteMedia,
  formatDuration,
  Creator,
  MediaItem,
} from "@/lib/api";
import {
  ArrowLeft,
  Heart,
  Play,
  Image as ImageIcon,
  Film,
  Presentation,
} from "lucide-react";

type Tab = "all" | "video" | "image" | "favorite" | "unseen";

const PAGE_SIZE = 48;

export default function CreatorDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const router = useRouter();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState("file_name");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const buildMediaParams = useCallback((t: Tab, s: string): Record<string, string> => {
    const p: Record<string, string> = { sort: s };
    if (t === "video") p.type = "video";
    else if (t === "image") p.type = "image";
    else if (t === "favorite") p.favorite = "true";
    else if (t === "unseen") p.seen = "unseen";
    return p;
  }, []);

  // タブ/ソート変更時はリセットして最初から読み込み
  useEffect(() => {
    offsetRef.current = 0;
    setMedia([]);
    setHasMore(true);
    setLoading(true);
    fetchMedia(id, { ...buildMediaParams(tab, sort), limit: String(PAGE_SIZE), offset: "0" }).then((data) => {
      setMedia(data);
      offsetRef.current = data.length;
      setHasMore(data.length === PAGE_SIZE);
    }).finally(() => setLoading(false));
  }, [id, tab, sort, buildMediaParams]);

  useEffect(() => {
    fetchCreator(id).then(setCreator);
  }, [id]);

  // Intersection Observer で末尾検知 → 追加読み込み
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        fetchMedia(id, {
          ...buildMediaParams(tab, sort),
          limit: String(PAGE_SIZE),
          offset: String(offsetRef.current),
        }).then((data) => {
          setMedia((prev) => [...prev, ...data]);
          offsetRef.current += data.length;
          setHasMore(data.length === PAGE_SIZE);
        }).finally(() => setLoadingMore(false));
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [id, tab, sort, hasMore, loadingMore, buildMediaParams]);

  const handleCreatorFav = async () => {
    if (!creator) return;
    const updated = await toggleFavoriteCreator(creator.id, !creator.is_favorite);
    setCreator(updated);
  };

  const handleMediaFav = async (e: React.MouseEvent, m: MediaItem) => {
    e.stopPropagation();
    const updated = await toggleFavoriteMedia(m.id, !m.is_favorite);
    setMedia((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "すべて" },
    { key: "video", label: "動画" },
    { key: "image", label: "画像" },
    { key: "favorite", label: "お気に入り" },
    { key: "unseen", label: "未閲覧" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/creators" className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold flex-1">{creator?.name ?? "..."}</h1>
        {creator && (
          <div className="flex gap-3 items-center">
            <Link
              href={`/slideshow/${id}`}
              className="flex items-center gap-1 bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-sm transition"
            >
              <Presentation size={15} /> スライドショー
            </Link>
            <button onClick={handleCreatorFav} className="text-gray-400 hover:text-red-400 transition">
              <Heart size={20} fill={creator.is_favorite ? "currentColor" : "none"} className={creator.is_favorite ? "text-red-400" : ""} />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-4 border-b border-gray-700 pb-2">
        <div className="flex gap-1.5 overflow-x-auto flex-1 min-w-0 scrollbar-hide">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                tab === t.key ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-shrink-0">
          <select
            className="bg-gray-800 text-white px-2 py-1.5 rounded-lg text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="file_name">ファイル名順</option>
            <option value="newest">新しい順</option>
            <option value="oldest">古い順</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400">読み込み中...</p>
      ) : media.length === 0 ? (
        <p className="text-gray-400">メディアがありません</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {media.map((m) => (
            <div
              key={m.id}
              className="relative bg-gray-800 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition group"
              onClick={() => {
                if (m.media_type === "video") {
                  router.push(`/video/${m.id}?creator=${id}`);
                } else {
                  router.push(`/photo/${m.id}?creator=${id}`);
                }
              }}
            >
              <div className="relative">
                {m.thumbnail_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.media_type === "image" ? `/api/photos/${m.id}/thumbnail` : `/api/videos/${m.id}/thumbnail`}
                    alt={m.file_name}
                    className="w-full aspect-video object-cover"
                  />
                ) : (
                  <div className="w-full aspect-video bg-gray-700 flex items-center justify-center">
                    {m.media_type === "video" ? <Film size={32} className="text-gray-500" /> : <ImageIcon size={32} className="text-gray-500" />}
                  </div>
                )}
                {m.media_type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <div className="bg-black/60 rounded-full p-3">
                      <Play size={20} fill="white" className="text-white" />
                    </div>
                  </div>
                )}
                {m.media_type === "video" && formatDuration(m.duration) && (
                  <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                    {formatDuration(m.duration)}
                  </div>
                )}
              </div>
              <button
                onClick={(e) => handleMediaFav(e, m)}
                className="absolute top-1.5 right-1.5 text-gray-400 hover:text-red-400 transition"
              >
                <Heart size={14} fill={m.is_favorite ? "currentColor" : "none"} className={m.is_favorite ? "text-red-400" : ""} />
              </button>
              <div className="p-2">
                {m.media_type === "video" && m.video_title && (
                  <div className="text-xs text-white font-medium truncate mb-0.5">{m.video_title}</div>
                )}
                {m.media_type === "image" && m.photo_title && (
                  <div className="text-xs text-white font-medium truncate mb-0.5">{m.photo_title}</div>
                )}
                <div className="text-xs text-gray-300 truncate">{m.file_name}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* センチネル：無限スクロール用 */}
      <div ref={sentinelRef} className="h-10 mt-4 flex items-center justify-center">
        {loadingMore && <span className="text-gray-400 text-sm">読み込み中...</span>}
        {!loading && !loadingMore && !hasMore && media.length > 0 && (
          <span className="text-gray-600 text-sm">すべて表示しました</span>
        )}
      </div>
    </div>
  );
}
