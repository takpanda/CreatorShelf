"use client";

import { useEffect, useState } from "react";
import { Users, Film, Image as ImageIcon, Heart, LucideIcon } from "lucide-react";
import { fetchStats } from "@/lib/api";

function StatCard({
  icon: Icon,
  value,
  label,
  iconClass,
  loading,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
  iconClass: string;
  loading: boolean;
}) {
  return (
    <div className="bg-gray-800/80 border border-gray-700/50 rounded-xl p-3 sm:p-4 flex items-center gap-3">
      <div className={`rounded-lg p-2 sm:p-2.5 shrink-0 ${iconClass}`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <div className="min-w-0">
        {loading ? (
          <div className="skeleton h-6 sm:h-7 w-12 rounded mb-1" />
        ) : (
          <div className="text-xl sm:text-2xl font-bold text-white tabular-nums">
            {value.toLocaleString()}
          </div>
        )}
        <div className="text-xs sm:text-sm text-gray-400">{label}</div>
      </div>
    </div>
  );
}

export default function StatsBar() {
  const [stats, setStats] = useState({ creator_count: 0, video_count: 0, photo_count: 0, favorite_count: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
      <StatCard icon={Users} value={stats.creator_count} label="投稿者" iconClass="bg-blue-500/15 text-blue-400" loading={loading} />
      <StatCard icon={Film} value={stats.video_count} label="動画" iconClass="bg-purple-500/15 text-purple-400" loading={loading} />
      <StatCard icon={ImageIcon} value={stats.photo_count} label="画像" iconClass="bg-green-500/15 text-green-400" loading={loading} />
      <StatCard icon={Heart} value={stats.favorite_count} label="お気に入り" iconClass="bg-pink-500/15 text-pink-400" loading={loading} />
    </div>
  );
}
