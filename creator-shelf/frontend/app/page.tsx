"use client";
import { useState } from "react";
import Link from "next/link";
import { Heart, Users } from "lucide-react";
import StatsBar from "@/components/StatsBar";
import RecentCreators from "@/components/RecentCreators";
import RecentMedia from "@/components/RecentMedia";
import CreatorDetailPanel from "@/components/CreatorDetailPanel";

export default function HomePage() {
  const [selectedCreatorId, setSelectedCreatorId] = useState<number | null>(null);

  return (
    <>
      {selectedCreatorId !== null && (
        <CreatorDetailPanel
          creatorId={selectedCreatorId}
          onClose={() => setSelectedCreatorId(null)}
        />
      )}
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="flex items-center justify-between mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">CreatorShelf</h1>
        <nav className="flex gap-3">
          <Link href="/creators" className="flex items-center gap-1 text-gray-300 hover:text-white transition">
            <Users size={18} />
            <span className="hidden sm:inline">投稿者一覧</span>
          </Link>
          <Link href="/favorites" className="flex items-center gap-1 text-gray-300 hover:text-white transition">
            <Heart size={18} />
            <span className="hidden sm:inline">お気に入り</span>
          </Link>
        </nav>
      </header>

      <StatsBar />

      <RecentMedia onCreatorClick={setSelectedCreatorId} />

      <RecentCreators onCreatorClick={setSelectedCreatorId} />

      <section className="mt-10 text-center">
        <Link href="/creators" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition font-medium">
          投稿者一覧を見る
        </Link>
      </section>
    </div>
    </>
  );
}
