export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export interface Creator {
  id: number;
  name: string;
  video_count: number;
  photo_count: number;
  thumbnail_path: string | null;
  is_favorite: boolean;
  favorite_at: string | null;
  last_added_at: string | null;
}

export interface MediaItem {
  id: number;
  creator_id: number;
  media_type: "video" | "image";
  file_name: string;
  extension: string;
  duration: number | null;
  thumbnail_path: string | null;
  is_favorite: boolean;
  is_seen: boolean;
  playback_position: number | null;
  video_title: string | null;
  video_posted_at: string | null;
  video_description: string | null;
  photo_title: string | null;
  photo_description: string | null;
}

export interface SlideshowItem {
  id: number;
  url: string;
  thumbnailUrl: string | null;
  favorite: boolean;
}

export async function fetchCreators(
  params: Record<string, string> = {},
  limit = 30,
  offset = 0
): Promise<Creator[]> {
  const p = new URLSearchParams({ ...params, limit: String(limit), offset: String(offset) });
  const res = await fetch(`/api/creators?${p.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch creators");
  return res.json();
}

export async function fetchCreator(id: number): Promise<Creator> {
  const res = await fetch(`/api/creators/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch creator");
  return res.json();
}

export async function fetchMedia(
  creatorId: number,
  params: Record<string, string> = {}
): Promise<MediaItem[]> {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`/api/creators/${creatorId}/media${q ? "?" + q : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch media");
  return res.json();
}

export async function toggleFavoriteCreator(id: number, isFavorite: boolean): Promise<Creator> {
  const res = await fetch(`/api/creators/${id}/favorite`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isFavorite }),
  });
  if (!res.ok) throw new Error("Failed to update favorite");
  return res.json();
}

export async function toggleFavoriteMedia(id: number, isFavorite: boolean): Promise<MediaItem> {
  const res = await fetch(`/api/media/${id}/favorite`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isFavorite }),
  });
  if (!res.ok) throw new Error("Failed to update favorite");
  return res.json();
}

export async function fetchStats(): Promise<{ creator_count: number; video_count: number; photo_count: number; favorite_count: number }> {
  const res = await fetch(`/api/creators/stats`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export interface RecentMediaItem {
  id: number;
  creator_id: number;
  creator_name: string;
  media_type: "video" | "image";
  thumbnail_path: string | null;
  file_name: string;
  duration: number | null;
  file_modified_at: string | null;
}

export async function fetchRecentMedia(type: "all" | "video" | "image" = "all", limit = 12): Promise<RecentMediaItem[]> {
  const res = await fetch(`/api/media/recent?type=${type}&limit=${limit}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch recent media");
  return res.json();
}

export async function markSeen(id: number, isSeen: boolean): Promise<MediaItem> {
  const res = await fetch(`/api/media/${id}/seen`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isSeen }),
  });
  if (!res.ok) throw new Error("Failed to update seen");
  return res.json();
}

export async function savePlayback(id: number, position: number, duration: number): Promise<void> {
  await fetch(`/api/videos/${id}/playback`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ position, duration }),
  });
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export async function fetchSlideshow(
  creatorId: number,
  params: Record<string, string> = {}
): Promise<{ creator: { id: number; name: string }; items: SlideshowItem[] }> {
  const q = new URLSearchParams(params).toString();
  const res = await fetch(`/api/creators/${creatorId}/slideshow${q ? "?" + q : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch slideshow");
  return res.json();
}
