"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { fetchCreators, toggleFavoriteCreator, Creator } from "@/lib/api";
import { Film, Image as ImageIcon, Search, ArrowLeft, LayoutGrid, Users } from "lucide-react";
import CreatorDetailPanel from "@/components/CreatorDetailPanel";
import { SkeletonGrid, EmptyState, FavoriteButton, Spinner } from "@/components/ui";

const PAGE_SIZE = 30;

export default function CreatorsPage() {
  const [selectedCreatorId, setSelectedCreatorId] = useState<number | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "video" | "photo" | "both">("all");
  const [sort, setSort] = useState("last_added");
  const [showThumbnail, setShowThumbnail] = useState(true);
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
    if (!sentinel || loading) return;
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
  }, [buildParams, loading]);

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
    <div className="max-w-6xl mx-auto px-4">
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur-sm pt-6 pb-3 border-b border-gray-800/80 -mx-4 px-4">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/"
            className="text-gray-400 hover:text-white hover:bg-gray-800 p-2 -ml-2 rounded-lg transition"
            aria-label="ホームに戻る"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold">投稿者一覧</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px] sm:flex-none sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full bg-gray-800 text-white pl-9 pr-4 py-2 rounded-lg text-sm placeholder:text-gray-500 border border-transparent focus:outline-none focus:border-blue-500 transition"
              placeholder="投稿者名検索..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-transparent focus:outline-none focus:border-blue-500 cursor-pointer"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">すべて</option>
            <option value="video">動画あり</option>
            <option value="photo">画像あり</option>
            <option value="both">両方あり</option>
          </select>
          <select
            className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm border border-transparent focus:outline-none focus:border-blue-500 cursor-pointer"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="name">名前順</option>
            <option value="last_added">最終追加日</option>
            <option value="favorite">お気に入り</option>
          </select>
          <button
            onClick={() => setShowThumbnail((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition ${
              showThumbnail ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
            title="サムネイル表示切替"
          >
            <LayoutGrid size={14} />
            <span className="hidden sm:inline">サムネイル</span>
          </button>
        </div>
      </div>
      <div className="pt-4 pb-8">

      {loading ? (
        <SkeletonGrid
          count={15}
          gridClass="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          withThumbnail={showThumbnail}
        />
      ) : creators.length === 0 ? (
        <EmptyState
          icon={Users}
          message="投稿者が見つかりません"
          hint={q ? "検索条件を変更してみてください" : "管理画面からスキャンを実行してください"}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-fade-in">
          {creators.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedCreatorId(c.id)}
              className="bg-gray-800/80 border border-gray-700/50 rounded-xl overflow-hidden hover:border-gray-500 transition relative group cursor-pointer"
            >
              {/* サムネイル */}
              {showThumbnail && (
                <div className="relative w-full aspect-video bg-gray-700 overflow-hidden">
                  <img
                    src={`/api/creators/${c.id}/thumbnail`}
                    alt={c.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
              <FavoriteButton
                active={c.is_favorite}
                onClick={(e) => handleFavorite(e, c)}
                size={14}
                className="absolute top-1.5 right-1.5"
              />
              <div className="p-3">
                <div className={`font-medium truncate text-sm ${showThumbnail ? "" : "pr-8"}`}>{c.name}</div>
                <div className="text-xs text-gray-400 mt-1.5 flex items-center gap-3">
                  <span className="flex items-center gap-1"><Film size={11} />{c.video_count}</span>
                  <span className="flex items-center gap-1"><ImageIcon size={11} />{c.photo_count}</span>
                </div>
                {c.last_added_at && (
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(c.last_added_at).toLocaleDateString("ja-JP")}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* センチネル：常にDOMに存在させることでObserverが確実に監視できる */}
      <div ref={sentinelRef} className="h-10 mt-4 flex items-center justify-center">
        {loadingMore && <Spinner />}
        {!loading && !loadingMore && !hasMore && creators.length > 0 && (
          <span className="text-gray-600 text-sm">すべて表示しました</span>
        )}
      </div>
      </div>
    </div>
    </>
  );
}
