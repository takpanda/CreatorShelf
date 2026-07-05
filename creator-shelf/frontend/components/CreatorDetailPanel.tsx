"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
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
import VideoPlayerOverlay from "@/components/VideoPlayerOverlay";
import PhotoViewerOverlay from "@/components/PhotoViewerOverlay";
import { SkeletonGrid, EmptyState, FavoriteButton, Spinner } from "@/components/ui";

type Tab = "all" | "video" | "image" | "favorite" | "unseen";

const PAGE_SIZE = 48;

interface CreatorDetailPanelProps {
  creatorId: number;
  onClose: () => void;
}

export default function CreatorDetailPanel({ creatorId, onClose }: CreatorDetailPanelProps) {
  const [creator, setCreator] = useState<Creator | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState("newest");
  const [overlay, setOverlay] = useState<{ type: "video" | "photo"; id: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const [hasMore, setHasMore] = useState(true);
  const hasMoreRef = useRef(true);
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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
    const abortController = new AbortController();
    offsetRef.current = 0;
    loadingRef.current = true;
    hasMoreRef.current = true;
    setMedia([]);
    setHasMore(true);
    setLoading(true);
    fetchMedia(creatorId, { ...buildMediaParams(tab, sort), limit: String(PAGE_SIZE), offset: "0" }).then((data) => {
      if (abortController.signal.aborted) return;
      setMedia(data);
      offsetRef.current = data.length;
      hasMoreRef.current = data.length === PAGE_SIZE;
      setHasMore(data.length === PAGE_SIZE);
    }).finally(() => {
      if (abortController.signal.aborted) return;
      loadingRef.current = false;
      setLoading(false);
    });
    return () => abortController.abort();
  }, [creatorId, tab, sort, buildMediaParams]);

  useEffect(() => {
    fetchCreator(creatorId).then(setCreator);
  }, [creatorId]);

  // creatorId が変わったらスクロールをトップに戻す
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [creatorId]);

  // パネル表示中は背景のスクロールをロック
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Escキーで閉じる(オーバーレイ表示中はオーバーレイ側を優先)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !overlay) onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [overlay, onClose]);

  // Intersection Observer で末尾検知 → 追加読み込み
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        if (loadingRef.current || loadingMoreRef.current || !hasMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
        fetchMedia(creatorId, {
          ...buildMediaParams(tab, sort),
          limit: String(PAGE_SIZE),
          offset: String(offsetRef.current),
        }).then((data) => {
          setMedia((prev) => [...prev, ...data]);
          offsetRef.current += data.length;
          hasMoreRef.current = data.length === PAGE_SIZE;
          setHasMore(data.length === PAGE_SIZE);
        }).finally(() => {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        });
      },
      { rootMargin: "300px", root: scrollRef.current }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [creatorId, tab, sort, buildMediaParams]);

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
    <div className="fixed inset-0 z-50 bg-gray-950 overflow-y-auto animate-fade-in" ref={scrollRef}>
      <div className="max-w-7xl mx-auto px-4 pb-6">
        <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur-sm pt-6 pb-2 border-b border-gray-800/80 -mx-4 px-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-800 p-2 -ml-2 rounded-lg transition"
              aria-label="一覧に戻る"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl sm:text-2xl font-bold flex-1 truncate">{creator?.name ?? "..."}</h1>
            {creator && (
              <div className="flex gap-2 items-center shrink-0">
                <Link
                  href={`/slideshow/${creatorId}`}
                  className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg text-sm transition"
                >
                  <Presentation size={15} />
                  <span className="hidden sm:inline">スライドショー</span>
                </Link>
                <button
                  onClick={handleCreatorFav}
                  aria-label={creator.is_favorite ? "お気に入り解除" : "お気に入り登録"}
                  className={`p-2 rounded-lg transition hover:bg-gray-800 ${creator.is_favorite ? "text-red-400" : "text-gray-400 hover:text-red-400"}`}
                >
                  <Heart size={20} fill={creator.is_favorite ? "currentColor" : "none"} />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pb-2">
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
                className="bg-gray-800 text-white px-2 py-1.5 rounded-lg text-sm border border-transparent focus:outline-none focus:border-blue-500 cursor-pointer"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="file_name">ファイル名順</option>
                <option value="newest">新しい順</option>
                <option value="oldest">古い順</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-4">
        {loading ? (
          <SkeletonGrid count={12} />
        ) : media.length === 0 ? (
          <EmptyState
            icon={tab === "favorite" ? Heart : Film}
            message="メディアがありません"
            hint={tab !== "all" ? "別のタブを選択してみてください" : undefined}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 animate-fade-in">
            {media.map((m) => (
              <div
                key={m.id}
                className="relative bg-gray-800/80 border border-gray-700/50 rounded-xl overflow-hidden cursor-pointer hover:border-blue-500 transition group"
                onClick={() => {
                  setOverlay({ type: m.media_type === "video" ? "video" : "photo", id: m.id });
                }}
              >
                <div className="relative overflow-hidden">
                  {m.thumbnail_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.media_type === "image" ? `/api/photos/${m.id}/thumbnail` : `/api/videos/${m.id}/thumbnail`}
                      alt={m.file_name}
                      loading="lazy"
                      className="w-full aspect-video object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full aspect-video bg-gray-700 flex items-center justify-center">
                      {m.media_type === "video" ? <Film size={32} className="text-gray-500" /> : <ImageIcon size={32} className="text-gray-500" />}
                    </div>
                  )}
                  {m.media_type === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/20">
                      <div className="bg-black/60 backdrop-blur-sm rounded-full p-3">
                        <Play size={20} fill="white" className="text-white" />
                      </div>
                    </div>
                  )}
                  {m.media_type === "video" && formatDuration(m.duration) && (
                    <div className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-sm text-white text-xs px-1.5 py-0.5 rounded-md">
                      {formatDuration(m.duration)}
                    </div>
                  )}
                  {!m.is_seen && (
                    <span
                      className="absolute top-2 left-2 w-2 h-2 rounded-full bg-blue-400 ring-2 ring-gray-950/60"
                      title="未閲覧"
                    />
                  )}
                </div>
                <FavoriteButton
                  active={m.is_favorite}
                  onClick={(e) => handleMediaFav(e, m)}
                  size={14}
                  className="absolute top-1 right-1"
                />
                <div className="p-2">
                  {m.media_type === "video" && m.video_title && (
                    <div className="text-xs text-white font-medium truncate mb-0.5">{m.video_title}</div>
                  )}
                  {m.media_type === "image" && m.photo_title && (
                    <div className="text-xs text-white font-medium truncate mb-0.5">{m.photo_title}</div>
                  )}
                  <div className="text-xs text-gray-400 truncate">{m.file_name}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* センチネル：無限スクロール用 */}
        <div ref={sentinelRef} className="h-10 mt-4 flex items-center justify-center">
          {loadingMore && <Spinner />}
          {!loading && !loadingMore && !hasMore && media.length > 0 && (
            <span className="text-gray-600 text-sm">すべて表示しました</span>
          )}
        </div>
        </div>
      </div>

      {overlay?.type === "video" && (
        <VideoPlayerOverlay
          mediaId={overlay.id}
          creatorId={creatorId}
          onClose={() => setOverlay(null)}
        />
      )}
      {overlay?.type === "photo" && (
        <PhotoViewerOverlay
          mediaId={overlay.id}
          creatorId={creatorId}
          onClose={() => setOverlay(null)}
        />
      )}
    </div>
  );
}
