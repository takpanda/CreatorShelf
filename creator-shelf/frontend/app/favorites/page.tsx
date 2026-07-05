"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { fetchCreators, fetchFavoriteMedia, toggleFavoriteCreator, toggleFavoriteMedia, formatDuration, Creator, MediaItem } from "@/lib/api";
import { ArrowLeft, Heart, Film, Image as ImageIcon, Play, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import CreatorDetailPanel from "@/components/CreatorDetailPanel";
import { SkeletonGrid, EmptyState, FavoriteButton, Spinner } from "@/components/ui";

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
        const items = await fetchCreators({ favorite: "true", sort: "name" }, PAGE_SIZE, 0);
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
        const items = await fetchCreators({ favorite: "true", sort: "name" }, PAGE_SIZE, offsetRef.current);
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
    <div className="max-w-6xl mx-auto px-4 pb-8">
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur-sm pt-6 pb-2 border-b border-gray-800/80 -mx-4 px-4">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/"
            className="text-gray-400 hover:text-white hover:bg-gray-800 p-2 -ml-2 rounded-lg transition"
            aria-label="ホームに戻る"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold flex-1">お気に入り</h1>
        </div>

        <div className="flex gap-1.5 pb-2 overflow-x-auto scrollbar-hide">
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
      </div>

      <div className="pt-4">
      {loading ? (
        <SkeletonGrid
          count={10}
          gridClass={tab === "creators"
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
            : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"}
          withThumbnail={tab !== "creators"}
        />
      ) : tab === "creators" ? (
        <>
          {creators.length === 0 ? (
            <EmptyState
              icon={Users}
              message="お気に入り投稿者がいません"
              hint="投稿者カードのハートから登録できます"
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-fade-in">
              {creators.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCreatorId(c.id)}
                  className="bg-gray-800/80 border border-gray-700/50 rounded-xl p-4 hover:bg-gray-700/80 hover:border-gray-600 transition relative cursor-pointer"
                >
                  <FavoriteButton
                    active={c.is_favorite}
                    onClick={(e) => { e.stopPropagation(); handleCreatorFav(c); }}
                    size={14}
                    className="absolute top-1.5 right-1.5"
                  />
                  <div className="font-medium truncate pr-8">{c.name}</div>
                  <div className="text-xs text-gray-400 mt-2 flex items-center gap-3">
                    <span className="flex items-center gap-1"><Film size={11} />{c.video_count}</span>
                    <span className="flex items-center gap-1"><ImageIcon size={11} />{c.photo_count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {loadingMore && <Spinner />}
          <div ref={sentinelRef} className="h-4" />
        </>
      ) : (
        <>
          {media.length === 0 ? (
            <EmptyState
              icon={Heart}
              message="お気に入りメディアがありません"
              hint="メディアカードのハートから登録できます"
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 animate-fade-in">
              {media.map((m) => (
                <div
                  key={m.id}
                  className="bg-gray-800/80 border border-gray-700/50 rounded-xl overflow-hidden cursor-pointer hover:border-blue-500 transition relative group"
                  onClick={() => m.media_type === "video" ? router.push(`/video/${m.id}?creator=${m.creator_id}`) : router.push(`/photo/${m.id}?creator=${m.creator_id}`)}
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
                        {m.media_type === "video" ? <Film size={28} className="text-gray-500" /> : <ImageIcon size={28} className="text-gray-500" />}
                      </div>
                    )}
                    {m.media_type === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/20">
                        <div className="bg-black/60 backdrop-blur-sm rounded-full p-2">
                          <Play size={18} fill="white" className="text-white" />
                        </div>
                      </div>
                    )}
                    {m.media_type === "video" && formatDuration(m.duration) && (
                      <div className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-sm text-white text-xs px-1.5 py-0.5 rounded-md">
                        {formatDuration(m.duration)}
                      </div>
                    )}
                  </div>
                  <FavoriteButton
                    active={m.is_favorite}
                    onClick={(e) => handleMediaFav(e, m)}
                    size={14}
                    className="absolute top-1 right-1"
                  />
                  <div className="p-2">
                    <div className="text-xs text-gray-400 truncate">{m.file_name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {loadingMore && <Spinner />}
          <div ref={sentinelRef} className="h-4" />
        </>
      )}
      </div>
    </div>
    </>
  );
}
