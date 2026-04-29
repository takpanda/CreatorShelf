"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AdminPage() {
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<any>(null);

  const runScan = async () => {
    setScanLoading(true);
    try {
      const res = await fetch("/api/admin/scan", { method: "POST" });
      setScanResult(await res.json());
    } finally {
      setScanLoading(false);
    }
  };

  const checkIntegrity = async () => {
    const res = await fetch("/api/admin/integrity");
    setIntegrityResult(await res.json());
  };

  const regenThumbs = async () => {
    const res = await fetch("/api/admin/thumbnails/regenerate", { method: "POST" });
    const d = await res.json();
    alert(`サムネイル生成完了: ${d.generated}件`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold">管理</h1>
      </div>

      <section className="bg-gray-800 rounded-xl p-6 mb-4">
        <h2 className="text-lg font-semibold mb-3">NASスキャン</h2>
        <button
          onClick={runScan}
          disabled={scanLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg transition"
        >
          {scanLoading ? "スキャン中..." : "スキャン実行"}
        </button>
        {scanResult && (
          <pre className="mt-3 text-sm text-gray-300 bg-gray-900 p-3 rounded-lg">
            {JSON.stringify(scanResult, null, 2)}
          </pre>
        )}
      </section>

      <section className="bg-gray-800 rounded-xl p-6 mb-4">
        <h2 className="text-lg font-semibold mb-3">サムネイル再生成</h2>
        <button
          onClick={regenThumbs}
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-5 py-2 rounded-lg transition"
        >
          再生成
        </button>
      </section>

      <section className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-3">整合性チェック</h2>
        <button
          onClick={checkIntegrity}
          className="bg-green-700 hover:bg-green-600 text-white px-5 py-2 rounded-lg transition"
        >
          チェック実行
        </button>
        {integrityResult && (
          <pre className="mt-3 text-sm text-gray-300 bg-gray-900 p-3 rounded-lg overflow-auto">
            {JSON.stringify(integrityResult, null, 2)}
          </pre>
        )}
      </section>
    </div>
  );
}
