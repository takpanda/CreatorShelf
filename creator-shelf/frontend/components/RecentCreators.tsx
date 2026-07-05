"use client";

import { useEffect, useState } from "react";
import { Film, Image as ImageIcon, Heart, User, Users } from "lucide-react";
import { fetchCreators, Creator } from "@/lib/api";
import { EmptyState } from "@/components/ui";

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

function CreatorAvatar({ creator }: { creator: Creator }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="w-10 h-10 rounded-lg bg-gray-700 shrink-0 overflow-hidden flex items-center justify-center">
      {failed ? (
        <User size={18} className="text-gray-500" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/creators/${creator.id}/thumbnail`}
          alt=""
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

function CreatorCard({ creator, onClick }: { creator: Creator; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-gray-800/80 border border-gray-700/50 rounded-xl p-3 hover:bg-gray-700/80 hover:border-gray-600 transition cursor-pointer flex items-center gap-3"
    >
      <CreatorAvatar creator={creator} />
      <div className="min-w-0">
        <div className="font-medium truncate text-sm text-gray-100">{creator.name}</div>
        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2.5">
          <span className="flex items-center gap-1"><Film size={11} />{creator.video_count}</span>
          <span className="flex items-center gap-1"><ImageIcon size={11} />{creator.photo_count}</span>
        </div>
      </div>
    </div>
  );
}

export default function RecentCreators({ onCreatorClick }: RecentCreatorsProps) {
  const [recent, setRecent] = useState<Creator[]>([]);
  const [favorites, setFavorites] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCreators({ sort: "last_added", limit: "6" } as any)
      .then((creators) => {
        setRecent(creators.slice(0, 6));
      })
      .catch(() => {})
      .finally(() => setLoading(false));

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
          <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-200 flex items-center gap-2">
            <Heart size={18} className="text-pink-400" /> お気に入り投稿者
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {favorites.map((c) => (
              <CreatorCard key={c.id} creator={c} onClick={() => onCreatorClick?.(c.id)} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-200 flex items-center gap-2">
          <Users size={18} className="text-blue-400" /> 最近追加された投稿者
        </h2>
        {!loading && recent.length === 0 ? (
          <EmptyState
            icon={Users}
            message="投稿者が見つかりません"
            hint="管理画面からスキャンを実行してください"
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {recent.map((c) => (
              <CreatorCard key={c.id} creator={c} onClick={() => onCreatorClick?.(c.id)} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
