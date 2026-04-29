"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { fetchSlideshow, toggleFavoriteMedia, SlideshowItem } from "@/lib/api";
import {
  ArrowLeft,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Heart,
  Shuffle,
  Maximize2,
  Minimize2,
} from "lucide-react";

const INTERVALS = [2, 3, 5, 8, 10];

export default function SlideshowPage({ params }: { params: { id: string } }) {
  const creatorId = Number(params.id);
  const [items, setItems] = useState<SlideshowItem[]>([]);
  const [creatorName, setCreatorName] = useState("");
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [interval, setIntervalSec] = useState(5);
  const [fullscreen, setFullscreen] = useState(false);
  const [favOnly, setFavOnly] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (fav = false) => {
      const params: Record<string, string> = {};
      if (fav) params.favorite = "true";
      const data = await fetchSlideshow(creatorId, params);
      setCreatorName(data.creator.name);
      setItems(data.items);
      setIdx(0);
    },
    [creatorId]
  );

  useEffect(() => { load(); }, [load]);

  const goNext = useCallback(() => setIdx((i) => (i + 1) % items.length), [items.length]);
  const goPrev = () => setIdx((i) => (i - 1 + items.length) % items.length);

  useEffect(() => {
    if (!playing || items.length === 0) return;
    timerRef.current = setTimeout(goNext, interval * 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [playing, idx, interval, goNext, items.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); setPlaying((p) => !p); }
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "f" || e.key === "F") setFullscreen((f) => !f);
      if (e.key === "Escape") setFullscreen(false);
      if (e.key === "b" || e.key === "B") handleFav();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const handleFav = async () => {
    if (items.length === 0) return;
    const item = items[idx];
    const updated = await toggleFavoriteMedia(item.id, !item.favorite);
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, favorite: updated.is_favorite } : x)));
  };

  const shuffle = () => {
    setItems((prev) => [...prev].sort(() => Math.random() - 0.5));
    setIdx(0);
  };

  const current = items[idx];

  return (
    <div className={`${fullscreen ? "fixed inset-0 z-50 bg-black" : "max-w-5xl mx-auto px-4 py-6"}`}>
      {!fullscreen && (
        <div className="flex items-center gap-3 mb-4">
          <Link href={`/creators/${creatorId}`} className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></Link>
          <h1 className="text-xl font-bold flex-1">{creatorName} — スライドショー</h1>
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input type="checkbox" checked={favOnly} onChange={(e) => { setFavOnly(e.target.checked); load(e.target.checked); }} />
            お気に入りのみ
          </label>
        </div>
      )}

      <div className={`relative ${fullscreen ? "h-full flex items-center justify-center" : "bg-black rounded-xl overflow-hidden"}`}>
        {current && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.id}
            src={current.url}
            alt=""
            className={`${fullscreen ? "max-h-full max-w-full" : "w-full max-h-[65vh]"} object-contain`}
          />
        )}
        {items.length === 0 && (
          <div className="flex items-center justify-center h-64 text-gray-500">画像がありません</div>
        )}

        <button onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 rounded-full p-2 transition">
          <ChevronLeft size={24} />
        </button>
        <button onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 rounded-full p-2 transition">
          <ChevronRight size={24} />
        </button>
      </div>

      <div className={`flex items-center justify-center gap-4 mt-4 ${fullscreen ? "absolute bottom-4 left-0 right-0" : ""}`}>
        <button onClick={goPrev} className="text-gray-400 hover:text-white transition"><ChevronLeft size={20} /></button>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg transition flex items-center gap-2"
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
          {playing ? "一時停止" : "再生"}
        </button>
        <button onClick={goNext} className="text-gray-400 hover:text-white transition"><ChevronRight size={20} /></button>
        <button onClick={handleFav} className={`transition ${current?.favorite ? "text-red-400" : "text-gray-400 hover:text-red-400"}`}>
          <Heart size={18} fill={current?.favorite ? "currentColor" : "none"} />
        </button>
        <button onClick={shuffle} className="text-gray-400 hover:text-white transition" title="ランダム">
          <Shuffle size={18} />
        </button>
        <select
          className="bg-gray-800 text-white text-sm px-2 py-1 rounded-lg"
          value={interval}
          onChange={(e) => setIntervalSec(Number(e.target.value))}
        >
          {INTERVALS.map((s) => <option key={s} value={s}>{s}秒</option>)}
        </select>
        <button onClick={() => setFullscreen((f) => !f)} className="text-gray-400 hover:text-white transition">
          {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>

      {!fullscreen && (
        <div className="text-center text-sm text-gray-400 mt-2">
          {idx + 1} / {items.length}
        </div>
      )}
    </div>
  );
}
