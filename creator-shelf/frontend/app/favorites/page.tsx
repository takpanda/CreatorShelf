"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { fetchCreators, fetchFavoriteMedia, toggleFavoriteCreator, toggleFavoriteMedia, formatDuration, Creator, MediaItem } from "@/lib/api";
import { ArrowLeft, Heart, Film, Image as ImageIcon, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import CreatorDetailPanel from "@/components/CreatorDetailPanel";

type FavTab = "creators" | "all" | "video" | "image";

const PAGE_SIZE = 30;

export default function FavoritesPage() {
  const [tab, setTab] = useState<FavTab>("creators");
  const [creators, setCreators] = useState<Creator[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCreatorId, setSelectedCreatorId] = useState<number | null>(null);
  const router = useRouter();

  // refs for infinite scroll
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadFavoritesPage = async () => {
    setLoading(true);
    offsetRef.current = 0;
    loadingMoreRef.current = false;
    hasMoreRef.current = true;
    setHasMore(true);
    setMedia([]);
    setCreators([]);

    try {
      if (tab === "creators") {
        const items = await fetchCreators({ favorite: "true" }, PAGE_SIZE, 0);
        setCreators(items);
        offsetRef.current = items.length;
        const more = items.length === PAGE_SIZE;
        hasMoreRef.current = more;
        setHasMore(more);
      } else {
        const type = tab === "all" ? undefined : tab;
        const params: Record<string, string> = {};
        if (type) params.type = type;
        const items = await fetchFavoriteMedia(params, PAGE_SIZE, 0);
        setMedia(items);
        offsetRef.current = items.length;
        const more = items.length === PAGE_SIZE;
        hasMoreRef.current = more;
        setHasMore(more);
      }
    } catch (error) {
      console.error("Failed to load favorites page", error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFavoritesPage();
  }, [tab]);

  const loadMore = async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      if (tab === "creators") {
        const items = await fetchCreators({ favorite: "true" }, PAGE_SIZE, offsetRef.current);
        setCreators((prev) => [...prev, ...items]);
        offsetRef.current += items.length;
        const more = items.length === PAGE_SIZE;
        hasMoreRef.current = more;
        setHasMore(more);
      } else {
        const type = tab === "all" ? undefined : tab;
        const params: Record<string, string> = {};
        if (type) params.type = type;
        const items = await fetchFavoriteMedia(params, PAGE_SIZE, offsetRef.current);
        setMedia((prev) => [...prev, ...items]);
        offsetRef.current += items.length;
        const more = items.length === PAGE_SIZE;
        hasMoreRef.current = more;
        setHasMore(more);
      }
    } catch (error) {
      console.error("Failed to load more favorites", error);
      hasMoreRef.current = false;
      setHasMore(false);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        void loadMore();
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [tab, loading]);

  const handleCreatorFav = async (c: Creator) => {
    const updated = await toggleFavoriteCreator(c.id, !c.is_favorite);
    setCreators((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
  };

  const handleMediaFav = async (e: React.MouseEvent, m: MediaItem) => {
    e.stopPropagation();
    const updated = await toggleFavoriteMedia(m.id, !m.is_favorite);
    setMedia((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
  };

  const tabs: { key: FavTab; label: string }[] = [
    { key: "creators", label: "投稿者" },
    { key: "all", label: "すべて" },
    { key: "video", label: "動画" },
    { key: "image", label: "画像" },
  ];

  return (
    <>
      {selectedCreatorId !== null && (
        <CreatorDetailPanel
          creatorId={selectedCreatorId}
          onClose={() => setSelectedCreatorId(null)}
        />
      )}
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="sticky top-0 z-10 bg-gray-950 pt-6 pb-3">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></Link>
          <h1 className="text-2xl font-bold flex-1">お気に入り</h1>
        </div>

        <div className="flex gap-2 mb-6 border-b border-gray-700 pb-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm transition ${tab === t.key ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400">読み込み中...</p>
      ) : tab === "creators" ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {creators.length === 0 && <p className="text-gray-400 col-span-full">お気に入り投稿者がいません</p>}
            {creators.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCreatorId(c.id)}
                className="bg-gray-800 rounded-xl p-4 hover:bg-gray-700 transition relative cursor-pointer"
              >
                <button onClick={(e) => { e.stopPropagation(); handleCreatorFav(c); }} className="absolute top-2 right-2 text-red-400 hover:text-gray-400 transition">
                  <Heart size={16} fill="currentColor" />
                </button>
                <div className="font-medium truncate pr-5">{c.name}</div>
                <div className="text-xs text-gray-400 mt-2 flex gap-3">
                  <span><Film size={11} className="inline mr-1" />{c.video_count}</span>
                  <span><ImageIcon size={11} className="inline mr-1" />{c.photo_count}</span>
                </div>
              </div>
            ))}
          </div>
          {loadingMore && (
            <div className="text-center py-6 text-gray-400">
              <svg className="animate-spin h-6 w-6 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm mt-2 block">読み込み中...</span>
            </div>
          )}
          <div ref={sentinelRef} className="h-4" />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {media.length === 0 && <p className="text-gray-400 col-span-full">お気に入りメディアがありません</p>}
            {media.map((m) => (
              <div
                key={m.id}
                className="bg-gray-800 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition relative group"
                onClick={() => m.media_type === "video" ? router.push(`/video/${m.id}?creator=${m.creator_id}`) : router.push(`/photo/${m.id}?creator=${m.creator_id}`)}
              >
                <div className="relative">
                  {m.thumbnail_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.media_type === "image" ? `/api/photos/${m.id}/thumbnail` : `/api/videos/${m.id}/thumbnail`} alt={m.file_name} className="w-full aspect-video object-cover" />
                  ) : (
                    <div className="w-full aspect-video bg-gray-700 flex items-center justify-center">
                      {m.media_type === "video" ? <Film size={28} className="text-gray-500" /> : <ImageIcon size={28} className="text-gray-500" />}
                    </div>
                  )}
                  {m.media_type === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <div className="bg-black/60 rounded-full p-2">
                        <Play size={18} fill="white" className="text-white" />
                      </div>
                    </div>
                  )}
                  {m.media_type === "video" && formatDuration(m.duration) && (
                    <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                      {formatDuration(m.duration)}
                    </div>
                  )}
                </div>
                <button onClick={(e) => handleMediaFav(e, m)} className="absolute top-1.5 right-1.5 text-red-400 hover:text-gray-400 transition">
                  <Heart size={14} fill="currentColor" />
                </button>
                <div className="p-2">
                  <div className="text-xs text-gray-300 truncate">{m.file_name}</div>
                </div>
              </div>
            ))}
          </div>
          {loadingMore && (
            <div className="text-center py-6 text-gray-400">
              <svg className="animate-spin h-6 w-6 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm mt-2 block">読み込み中...</span>
            </div>
          )}
          <div ref={sentinelRef} className="h-4" />
        </>
      )}
    </div>
    </>
  );
}
