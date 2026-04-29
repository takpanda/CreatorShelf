import Link from "next/link";
import { fetchCreators, Creator } from "@/lib/api";
import { Heart, Film, Image as ImageIcon, Users } from "lucide-react";

export default async function HomePage() {
  let creators: Creator[] = [];
  try {
    creators = await fetchCreators({ sort: "last_added", limit: "6" } as any);
  } catch {}

  const favorites = creators.filter((c: any) => c.is_favorite).slice(0, 4);
  const recent = creators.slice(0, 6);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-10">
        <h1 className="text-3xl font-bold text-white">CreatorShelf</h1>
        <nav className="flex gap-4">
          <Link href="/creators" className="flex items-center gap-1 text-gray-300 hover:text-white transition">
            <Users size={18} /> 投稿者一覧
          </Link>
          <Link href="/favorites" className="flex items-center gap-1 text-gray-300 hover:text-white transition">
            <Heart size={18} /> お気に入り
          </Link>
        </nav>
      </header>

      {favorites.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-gray-200">お気に入り投稿者</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {favorites.map((c: any) => (
              <Link key={c.id} href={`/creators/${c.id}`} className="bg-gray-800 rounded-xl p-4 hover:bg-gray-700 transition">
                <div className="font-medium truncate">{c.name}</div>
                <div className="text-sm text-gray-400 mt-1">
                  <Film size={12} className="inline mr-1" />{c.video_count}
                  <ImageIcon size={12} className="inline ml-3 mr-1" />{c.photo_count}
                </div>
              </Link>
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
            {recent.map((c: any) => (
              <Link key={c.id} href={`/creators/${c.id}`} className="bg-gray-800 rounded-xl p-4 hover:bg-gray-700 transition">
                <div className="font-medium truncate text-sm">{c.name}</div>
                <div className="text-xs text-gray-400 mt-1">
                  <Film size={11} className="inline mr-1" />{c.video_count}
                  <ImageIcon size={11} className="inline ml-2 mr-1" />{c.photo_count}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10 text-center">
        <Link href="/creators" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition font-medium">
          投稿者一覧を見る
        </Link>
      </section>
    </div>
  );
}
