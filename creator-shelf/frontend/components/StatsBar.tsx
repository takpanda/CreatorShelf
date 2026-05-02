"use client";

import { useEffect, useState } from "react";
import { Users, Film, Image as ImageIcon, Heart } from "lucide-react";
import { fetchStats } from "@/lib/api";

export default function StatsBar() {
  const [stats, setStats] = useState({ creator_count: 0, video_count: 0, photo_count: 0, favorite_count: 0 });

  useEffect(() => {
    fetchStats().then(setStats).catch(() => {});
  }, []);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
      <div className="bg-gray-800 rounded-xl p-3 sm:p-5 flex items-center gap-3">
        <Users size={24} className="text-blue-400 shrink-0 sm:hidden" />
        <Users size={32} className="text-blue-400 shrink-0 hidden sm:block" />
        <div className="min-w-0">
          <div className="text-xl sm:text-2xl font-bold text-white">{stats.creator_count.toLocaleString()}</div>
          <div className="text-xs sm:text-sm text-gray-400">投稿者</div>
        </div>
      </div>
      <div className="bg-gray-800 rounded-xl p-3 sm:p-5 flex items-center gap-3">
        <Film size={24} className="text-purple-400 shrink-0 sm:hidden" />
        <Film size={32} className="text-purple-400 shrink-0 hidden sm:block" />
        <div className="min-w-0">
          <div className="text-xl sm:text-2xl font-bold text-white">{stats.video_count.toLocaleString()}</div>
          <div className="text-xs sm:text-sm text-gray-400">動画</div>
        </div>
      </div>
      <div className="bg-gray-800 rounded-xl p-3 sm:p-5 flex items-center gap-3">
        <ImageIcon size={24} className="text-green-400 shrink-0 sm:hidden" />
        <ImageIcon size={32} className="text-green-400 shrink-0 hidden sm:block" />
        <div className="min-w-0">
          <div className="text-xl sm:text-2xl font-bold text-white">{stats.photo_count.toLocaleString()}</div>
          <div className="text-xs sm:text-sm text-gray-400">画像</div>
        </div>
      </div>
      <div className="bg-gray-800 rounded-xl p-3 sm:p-5 flex items-center gap-3">
        <Heart size={24} className="text-pink-400 shrink-0 sm:hidden" />
        <Heart size={32} className="text-pink-400 shrink-0 hidden sm:block" />
        <div className="min-w-0">
          <div className="text-xl sm:text-2xl font-bold text-white">{stats.favorite_count.toLocaleString()}</div>
          <div className="text-xs sm:text-sm text-gray-400">お気に入り</div>
        </div>
      </div>
    </div>
  );
}
