"use client";

import { useEffect, useState } from "react";
import { Film, Image as ImageIcon } from "lucide-react";
import { fetchCreators, Creator } from "@/lib/api";

interface RecentCreatorsProps {
  onCreatorClick?: (id: number) => void;
}

function sampleCreators(creators: Creator[], count: number): Creator[] {
  const array = [...creators];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array.slice(0, count);
}

export default function RecentCreators({ onCreatorClick }: RecentCreatorsProps) {
  const [recent, setRecent] = useState<Creator[]>([]);
  const [favorites, setFavorites] = useState<Creator[]>([]);

  useEffect(() => {
    fetchCreators({ sort: "last_added", limit: "6" } as any)
      .then((creators) => {
        setRecent(creators.slice(0, 6));
      })
      .catch(() => {});

    fetchCreators({ favorite: "true", limit: "200" } as any)
      .then((creators) => {
        setFavorites(sampleCreators(creators, 4));
      })
      .catch(() => {});
  }, []);

  return (
    <>
      {favorites.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-200">お気に入り投稿者</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {favorites.map((c) => (
              <div
                key={c.id}
                onClick={() => onCreatorClick?.(c.id)}
                className="bg-gray-800 rounded-xl p-4 hover:bg-gray-700 transition cursor-pointer"
              >
                <div className="font-medium truncate">{c.name}</div>
                <div className="text-sm text-gray-400 mt-1">
                  <Film size={12} className="inline mr-1" />{c.video_count}
                  <ImageIcon size={12} className="inline ml-3 mr-1" />{c.photo_count}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-4 text-gray-200">最近追加された投稿者</h2>
        {recent.length === 0 ? (
          <p className="text-gray-400">投稿者が見つかりません。スキャンを実行してください。</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recent.map((c) => (
              <div
                key={c.id}
                onClick={() => onCreatorClick?.(c.id)}
                className="bg-gray-800 rounded-xl p-4 hover:bg-gray-700 transition cursor-pointer"
              >
                <div className="font-medium truncate text-sm">{c.name}</div>
                <div className="text-xs text-gray-400 mt-1">
                  <Film size={11} className="inline mr-1" />{c.video_count}
                  <ImageIcon size={11} className="inline ml-2 mr-1" />{c.photo_count}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
