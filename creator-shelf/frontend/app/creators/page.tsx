"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { fetchCreators, toggleFavoriteCreator, Creator } from "@/lib/api";
import { Heart, Film, Image as ImageIcon, Search, ArrowLeft } from "lucide-react";
import CreatorDetailPanel from "@/components/CreatorDetailPanel";

const PAGE_SIZE = 30;

export default function CreatorsPage() {
  const [selectedCreatorId, setSelectedCreatorId] = useState<number | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "video" | "photo" | "both">("all");
  const [sort, setSort] = useState("name");
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const [hasMore, setHasMore] = useState(true);
  const hasMoreRef = useRef(true);
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const buildParams = useCallback(() => {
    const params: Record<string, string> = { sort };
    if (q) params.q = q;
    if (filter === "video") params.has_video = "true";
    if (filter === "photo") params.has_photo = "true";
    if (filter === "both") { params.has_video = "true"; params.has_photo = "true"; }
    return params;
  }, [q, filter, sort]);

  // フィルタ/ソート変更時はリセットして最初から読み込み
  useEffect(() => {
    const abortController = new AbortController();
    offsetRef.current = 0;
    loadingRef.current = true;
    hasMoreRef.current = true;
    setCreators([]);
    setHasMore(true);
    setLoading(true);
    fetchCreators(buildParams(), PAGE_SIZE, 0).then((data) => {
      if (abortController.signal.aborted) return;
      setCreators(data);
      offsetRef.current = data.length;
      hasMoreRef.current = data.length === PAGE_SIZE;
      setHasMore(data.length === PAGE_SIZE);
    }).finally(() => {
      if (abortController.signal.aborted) return;
      loadingRef.current = false;
      setLoading(false);
    });
    return () => abortController.abort();
  }, [q, filter, sort]);

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
        fetchCreators(buildParams(), PAGE_SIZE, offsetRef.current).then((data) => {
          setCreators((prev) => [...prev, ...data]);
          offsetRef.current += data.length;
          hasMoreRef.current = data.length === PAGE_SIZE;
          setHasMore(data.length === PAGE_SIZE);
        }).finally(() => {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        });
      },
      { rootMargin: "300px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [buildParams]);

  const handleFavorite = async (e: React.MouseEvent, c: Creator) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = await toggleFavoriteCreator(c.id, !c.is_favorite);
    setCreators((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
  };

  return (
    <>
    {selectedCreatorId !== null && (
      <CreatorDetailPanel
        creatorId={selectedCreatorId}
        onClose={() => setSelectedCreatorId(null)}
      />
    )}
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold">投稿者一覧</h1>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="bg-gray-800 text-white pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="投稿者名検索..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm focus:outline-none"
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
        >
          <option value="all">すべて</option>
          <option value="video">動画あり</option>
          <option value="photo">画像あり</option>
          <option value="both">両方あり</option>
        </select>
        <select
          className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm focus:outline-none"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="name">名前順</option>
          <option value="last_added">最終追加日</option>
          <option value="favorite">お気に入り</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400">読み込み中...</p>
      ) : creators.length === 0 ? (
        <p className="text-gray-400">投稿者が見つかりません</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {creators.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedCreatorId(c.id)}
              className="bg-gray-800 rounded-xl p-4 hover:bg-gray-700 transition relative group cursor-pointer"
            >
              <button
                onClick={(e) => handleFavorite(e, c)}
                className="absolute top-2 right-2 text-gray-500 hover:text-red-400 transition"
              >
                <Heart size={16} fill={c.is_favorite ? "currentColor" : "none"} className={c.is_favorite ? "text-red-400" : ""} />
              </button>
              <div className="font-medium truncate pr-5">{c.name}</div>
              <div className="text-xs text-gray-400 mt-2 flex gap-3">
                <span><Film size={11} className="inline mr-1" />{c.video_count}</span>
                <span><ImageIcon size={11} className="inline mr-1" />{c.photo_count}</span>
              </div>
              {c.last_added_at && (
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(c.last_added_at).toLocaleDateString("ja-JP")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {/* センチネル：常にDOMに存在させることでObserverが確実に監視できる */}
      <div ref={sentinelRef} className="h-10 mt-4 flex items-center justify-center">
        {loadingMore && <span className="text-gray-400 text-sm">読み込み中...</span>}
        {!loading && !loadingMore && !hasMore && creators.length > 0 && (
          <span className="text-gray-600 text-sm">すべて表示しました</span>
        )}
      </div>
    </div>
    </>
  );
}
