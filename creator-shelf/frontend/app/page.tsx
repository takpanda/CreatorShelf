"use client";
import { useState } from "react";
import Link from "next/link";
import { Heart, Users, Library, ArrowRight } from "lucide-react";
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
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 animate-fade-in">
      <header className="flex items-center justify-between mb-8 sm:mb-10">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-2 shadow-lg shadow-blue-950/50">
            <Library size={20} className="text-white" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">CreatorShelf</h1>
        </div>
        <nav className="flex gap-2">
          <Link
            href="/creators"
            className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white bg-gray-800/80 hover:bg-gray-700 px-3 py-2 rounded-lg transition"
          >
            <Users size={16} />
            <span className="hidden sm:inline">投稿者一覧</span>
          </Link>
          <Link
            href="/favorites"
            className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white bg-gray-800/80 hover:bg-gray-700 px-3 py-2 rounded-lg transition"
          >
            <Heart size={16} />
            <span className="hidden sm:inline">お気に入り</span>
          </Link>
        </nav>
      </header>

      <StatsBar />

      <RecentMedia onCreatorClick={setSelectedCreatorId} />

      <RecentCreators onCreatorClick={setSelectedCreatorId} />

      <section className="mt-12 text-center">
        <Link
          href="/creators"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl transition font-medium shadow-lg shadow-blue-950/50 hover:shadow-blue-900/50 active:scale-[0.98]"
        >
          投稿者一覧を見る
          <ArrowRight size={16} />
        </Link>
      </section>
    </div>
    </>
  );
}
