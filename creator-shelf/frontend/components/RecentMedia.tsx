"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Film, Image as ImageIcon } from "lucide-react";
import { fetchRecentMedia, RecentMediaItem } from "@/lib/api";

interface CreatorGroup {
  creator_id: number;
  creator_name: string;
  count: number;
  thumbnail_path: string | null;
  media_type: "video" | "image";
  first_id: number;
}

function groupByCreator(items: RecentMediaItem[]): CreatorGroup[] {
  const map = new Map<number, CreatorGroup>();
  for (const item of items) {
    if (!map.has(item.creator_id)) {
      map.set(item.creator_id, {
        creator_id: item.creator_id,
        creator_name: item.creator_name,
        count: 1,
        thumbnail_path: item.thumbnail_path,
        media_type: item.media_type,
        first_id: item.id,
      });
    } else {
      map.get(item.creator_id)!.count += 1;
    }
  }
  return Array.from(map.values());
}

function CreatorCard({ group }: { group: CreatorGroup }) {
  const isVideo = group.media_type === "video";
  const thumbSrc = group.thumbnail_path
    ? (isVideo
        ? `/api/videos/${group.first_id}/thumbnail`
        : `/api/photos/${group.first_id}/thumbnail`)
    : null;

  return (
    <Link
      href={`/creators/${group.creator_id}`}
      className="bg-gray-800 rounded-xl overflow-hidden hover:bg-gray-700 transition"
    >
      <div className="relative aspect-video bg-gray-900 flex items-center justify-center">
        {thumbSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbSrc} alt={group.creator_name} className="w-full h-full object-cover" />
        ) : (
          <div className="text-gray-600">
            {isVideo ? <Film size={32} /> : <ImageIcon size={32} />}
          </div>
        )}
        <span className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
          {group.count}件
        </span>
      </div>
      <div className="p-2">
        <div className="text-xs font-medium text-gray-200 truncate">{group.creator_name}</div>
      </div>
    </Link>
  );
}

export default function RecentMedia() {
  const [videoGroups, setVideoGroups] = useState<CreatorGroup[]>([]);
  const [imageGroups, setImageGroups] = useState<CreatorGroup[]>([]);

  useEffect(() => {
    fetchRecentMedia("video", 30)
      .then((items) => setVideoGroups(groupByCreator(items)))
      .catch(() => {});
    fetchRecentMedia("image", 60)
      .then((items) => setImageGroups(groupByCreator(items)))
      .catch(() => {});
  }, []);

  return (
    <>
      {videoGroups.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-200 flex items-center gap-2">
            <Film size={20} className="text-purple-400" /> 最近追加された動画
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {videoGroups.slice(0, 6).map((g) => (
              <CreatorCard key={g.creator_id} group={g} />
            ))}
          </div>
        </section>
      )}

      {imageGroups.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-200 flex items-center gap-2">
            <ImageIcon size={20} className="text-green-400" /> 最近追加された画像
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {imageGroups.slice(0, 6).map((g) => (
              <CreatorCard key={g.creator_id} group={g} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
