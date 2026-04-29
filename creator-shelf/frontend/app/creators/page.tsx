"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchCreators, toggleFavoriteCreator, Creator } from "@/lib/api";
import { Heart, Film, Image as ImageIcon, Search, ArrowLeft } from "lucide-react";

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "video" | "photo" | "both">("all");
  const [sort, setSort] = useState("name");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params: Record<string, string> = { sort };
    if (q) params.q = q;
    if (filter === "video") params.has_video = "true";
    if (filter === "photo") params.has_photo = "true";
    if (filter === "both") { params.has_video = "true"; params.has_photo = "true"; }
    try {
      setCreators(await fetchCreators(params));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [q, filter, sort]);

  const handleFavorite = async (e: React.MouseEvent, c: Creator) => {
    e.preventDefault();
    const updated = await toggleFavoriteCreator(c.id, !c.is_favorite);
    setCreators((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
  };

  return (
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
            <Link
              key={c.id}
              href={`/creators/${c.id}`}
              className="bg-gray-800 rounded-xl p-4 hover:bg-gray-700 transition relative group"
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
