"use client";

import { Heart, LucideIcon } from "lucide-react";

/** サムネイル付きカードのスケルトン表示 */
export function SkeletonGrid({
  count = 12,
  gridClass = "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3",
  withThumbnail = true,
}: {
  count?: number;
  gridClass?: string;
  withThumbnail?: boolean;
}) {
  return (
    <div className={gridClass} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden bg-gray-800/60">
          {withThumbnail && <div className="skeleton aspect-video rounded-none" />}
          <div className="p-3 space-y-2">
            <div className="skeleton h-3 w-3/4 rounded" />
            <div className="skeleton h-2.5 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** アイコン付きの空状態表示 */
export function EmptyState({
  icon: Icon,
  message,
  hint,
}: {
  icon: LucideIcon;
  message: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="bg-gray-800/80 rounded-2xl p-4 mb-4">
        <Icon size={32} className="text-gray-500" />
      </div>
      <p className="text-gray-400 font-medium">{message}</p>
      {hint && <p className="text-gray-600 text-sm mt-1">{hint}</p>}
    </div>
  );
}

/** タップしやすいお気に入りボタン(サムネイル上に重ねる用) */
export function FavoriteButton({
  active,
  onClick,
  size = 16,
  className = "",
}: {
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
  size?: number;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={active ? "お気に入り解除" : "お気に入り登録"}
      className={`p-2 rounded-full bg-gray-950/60 backdrop-blur-sm transition hover:bg-gray-950/80 hover:scale-110 active:scale-95 ${
        active ? "text-red-400" : "text-gray-300 hover:text-red-400"
      } ${className}`}
    >
      <Heart size={size} fill={active ? "currentColor" : "none"} />
    </button>
  );
}

/** 追加読み込み用スピナー */
export function Spinner({ label = "読み込み中..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-gray-400 text-sm py-2">
      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span>{label}</span>
    </div>
  );
}
