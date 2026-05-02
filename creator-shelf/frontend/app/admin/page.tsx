"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface ScanProgress {
  current_creator: string | null;
  current_file: string | null;
  total_creators: number;
  done_creators: number;
  skipped: number;
  new_files: { creator: string; file: string; type: string }[];
}

interface ScanStatus {
  running: boolean;
  last_scan_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  progress: ScanProgress | null;
  last_result: {
    creators?: number;
    media?: number;
    skipped?: boolean;
  } | null;
}

interface ThumbStatus {
  running: boolean;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  total: number;
  done: number;
  current_file: string | null;
  generated: number;
  skipped: number;
}

function formatJST(iso: string | null): string {
  if (!iso) return "—";
  // タイムゾーン指定がない場合のみ UTC として扱う
  const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(iso);
  const d = new Date(hasTimezone ? iso : iso + "Z");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

export default function AdminPage() {
  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [integrityResult, setIntegrityResult] = useState<any>(null);
  const [thumbStatus, setThumbStatus] = useState<ThumbStatus | null>(null);
  const [isStartingScan, setIsStartingScan] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thumbPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // ポーリングのギャップでクリエイター名が消えないよう最後の値を保持
  const lastCreatorRef = useRef<string | null>(null);
  const lastFileRef = useRef<string | null>(null);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/admin/scan/status");
    const data: ScanStatus = await res.json();
    if (data.progress?.current_creator) lastCreatorRef.current = data.progress.current_creator;
    if (data.progress?.current_file) lastFileRef.current = data.progress.current_file;
    if (!data.running) { lastCreatorRef.current = null; lastFileRef.current = null; }
    setStatus(data);
    return data;
  }, []);

  const fetchThumbStatus = useCallback(async () => {
    const res = await fetch("/api/admin/thumbnails/status");
    const data: ThumbStatus = await res.json();
    setThumbStatus(data);
    return data;
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const stopThumbPolling = useCallback(() => {
    if (thumbPollRef.current) {
      clearInterval(thumbPollRef.current);
      thumbPollRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      const data = await fetchStatus();
      if (!data.running) stopPolling();
    }, 2000);
  }, [fetchStatus, stopPolling]);

  const startThumbPolling = useCallback(() => {
    stopThumbPolling();
    thumbPollRef.current = setInterval(async () => {
      const data = await fetchThumbStatus();
      if (!data.running) stopThumbPolling();
    }, 1000);
  }, [fetchThumbStatus, stopThumbPolling]);

  useEffect(() => {
    fetchStatus().then((data) => {
      if (data.running) startPolling();
    });
    fetchThumbStatus().then((data) => {
      if (data.running) startThumbPolling();
    });
    return () => { stopPolling(); stopThumbPolling(); };
  }, [fetchStatus, fetchThumbStatus, startPolling, startThumbPolling, stopPolling, stopThumbPolling]);

  const runScan = async () => {
    setIsStartingScan(true);
    try {
      const res = await fetch("/api/admin/scan", { method: "POST" });
      if (!res.ok) {
        throw new Error("スキャンの開始に失敗しました");
      }
      await fetchStatus();
      startPolling();
    } catch (error) {
      console.error(error);
      await fetchStatus();
    } finally {
      setIsStartingScan(false);
    }
  };

  const checkIntegrity = async () => {
    const res = await fetch("/api/admin/integrity");
    setIntegrityResult(await res.json());
  };

  const regenThumbs = async (missingOnly = false) => {
    const url = `/api/admin/thumbnails/regenerate${missingOnly ? "?missingOnly=true" : ""}`;
    await fetch(url, { method: "POST" });
    await fetchThumbStatus();
    startThumbPolling();
  };

  const confirmRegenThumbs = async () => {
    if (!window.confirm("サムネイルを再生成します。よろしいですか？")) {
      return;
    }
    await regenThumbs(false);
  };

  const isRunning = status?.running ?? false;
  const isThumbRunning = thumbStatus?.running ?? false;
  const isScanBusy = isRunning || isStartingScan;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/" className="text-gray-400 hover:text-white"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold">管理</h1>
      </div>

      <section className="bg-gray-800 rounded-xl p-6 mb-4">
        <h2 className="text-lg font-semibold mb-4">NASスキャン</h2>

        {/* ステータスパネル */}
        <div className="bg-gray-900 rounded-lg p-4 mb-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {isStartingScan && !isRunning ? (
              <>
                <Loader2 size={16} className="animate-spin text-blue-400" />
                <span className="text-blue-400 font-medium">スキャン開始待機中...</span>
              </>
            ) : isRunning ? (
              <>
                <Loader2 size={16} className="animate-spin text-blue-400" />
                <span className="text-blue-400 font-medium">スキャン実行中...</span>
              </>
            ) : status?.error ? (
              <>
                <XCircle size={16} className="text-red-400" />
                <span className="text-red-400 font-medium">エラー</span>
              </>
            ) : status?.finished_at ? (
              <>
                <CheckCircle2 size={16} className="text-green-400" />
                <span className="text-green-400 font-medium">完了</span>
              </>
            ) : (
              <span className="text-gray-500">待機中</span>
            )}
          </div>

          {status?.started_at && (
            <div className="text-gray-400">
              開始: <span className="text-gray-200">{formatJST(status.started_at)}</span>
            </div>
          )}
          {status?.finished_at && (
            <div className="text-gray-400">
              完了: <span className="text-gray-200">{formatJST(status.finished_at)}</span>
            </div>
          )}
          {status?.last_scan_at && (
            <div className="text-gray-400">
              前回スキャン: <span className="text-gray-200">{formatJST(status.last_scan_at)}</span>
            </div>
          )}

          {/* 実行中の詳細進捗 */}
          {isRunning && status?.progress && (
            <div className="mt-2 space-y-1 border-t border-gray-700 pt-2">
              {status.progress.total_creators > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.round((status.progress.done_creators / status.progress.total_creators) * 100)}%` }}
                    />
                  </div>
                  <span className="text-gray-400 text-xs whitespace-nowrap">
                    {status.progress.done_creators} / {status.progress.total_creators}
                  </span>
                </div>
              )}
              {status.progress.current_creator ?? lastCreatorRef.current ? (
                <div className="text-gray-400 text-xs">
                  クリエイター: <span className="text-blue-300 font-medium">{status.progress.current_creator ?? lastCreatorRef.current}</span>
                </div>
              ) : null}
              {status.progress.current_file ?? lastFileRef.current ? (
                <div className="text-gray-400 text-xs truncate">
                  処理中: <span className="text-gray-200">{status.progress.current_file ?? lastFileRef.current}</span>
                </div>
              ) : null}
              {status.progress.skipped > 0 && (
                <div className="text-gray-500 text-xs">スキップ: {status.progress.skipped} 件</div>
              )}
            </div>
          )}

          {status?.error && (
            <div className="text-red-300 bg-red-900/30 rounded p-2 mt-1">
              {status.error}
            </div>
          )}

          {!isRunning && status?.last_result && !status.last_result.skipped && (
            <div className="flex gap-4 pt-1">
              <span className="text-gray-400">
                クリエイター: <span className="text-white font-medium">{status.last_result.creators ?? 0}</span>
              </span>
              <span className="text-gray-400">
                新規メディア: <span className="text-white font-medium">{status.last_result.media ?? 0}</span>
              </span>
            </div>
          )}

          {/* 新規追加ファイルのログ */}
          {!isRunning && status?.progress && status.progress.new_files.length > 0 && (
            <div className="mt-2 border-t border-gray-700 pt-2">
              <div className="text-gray-400 text-xs mb-1">新規追加ファイル ({status.progress.new_files.length}件)</div>
              <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                {status.progress.new_files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={`shrink-0 px-1 py-0.5 rounded text-xs font-medium ${f.type === "video" ? "bg-blue-900 text-blue-300" : "bg-pink-900 text-pink-300"}`}>
                      {f.type === "video" ? "動画" : "写真"}
                    </span>
                    <span className="text-gray-400 shrink-0">{f.creator}</span>
                    <span className="text-gray-200 truncate">{f.file}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={runScan}
            disabled={isScanBusy}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg transition flex items-center gap-2"
          >
            {isScanBusy && <Loader2 size={14} className="animate-spin" />}
            {isRunning ? "スキャン中..." : isStartingScan ? "スキャン開始待機中..." : "スキャン実行"}
          </button>
          <button
            onClick={fetchStatus}
            className="text-gray-400 hover:text-white px-3 py-2 rounded-lg transition"
            title="ステータス更新"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </section>

      <section className="bg-gray-800 rounded-xl p-6 mb-4">
        <h2 className="text-lg font-semibold mb-3">サムネイル再生成</h2>

        {/* サムネイル進捗パネル */}
        {thumbStatus && (thumbStatus.running || thumbStatus.finished_at || thumbStatus.error) && (
          <div className="bg-gray-900 rounded-lg p-4 mb-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              {isThumbRunning ? (
                <>
                  <Loader2 size={16} className="animate-spin text-yellow-400" />
                  <span className="text-yellow-400 font-medium">生成中...</span>
                </>
              ) : thumbStatus.error ? (
                <>
                  <XCircle size={16} className="text-red-400" />
                  <span className="text-red-400 font-medium">エラー</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} className="text-green-400" />
                  <span className="text-green-400 font-medium">完了</span>
                </>
              )}
            </div>

            {/* プログレスバー */}
            {thumbStatus.total > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.round((thumbStatus.done / thumbStatus.total) * 100)}%` }}
                    />
                  </div>
                  <span className="text-gray-400 text-xs whitespace-nowrap">
                    {thumbStatus.done} / {thumbStatus.total}
                  </span>
                </div>
                <div className="text-gray-500 text-xs text-right">
                  {Math.round((thumbStatus.done / thumbStatus.total) * 100)}%
                </div>
              </div>
            )}

            {thumbStatus.current_file && (
              <div className="text-gray-400 text-xs truncate">
                処理中: <span className="text-gray-200">{thumbStatus.current_file}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-xs text-gray-400">
              {!isThumbRunning && thumbStatus.generated > 0 && (
                <div>
                  生成済み: <span className="text-white font-medium">{thumbStatus.generated}</span> 件
                </div>
              )}
              {thumbStatus.skipped > 0 && (
                <div className="text-gray-500">
                  スキップ: <span className="text-white font-medium">{thumbStatus.skipped}</span> 件
                </div>
              )}
            </div>

            {thumbStatus.error && (
              <div className="text-red-300 bg-red-900/30 rounded p-2 mt-1">
                {thumbStatus.error}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={confirmRegenThumbs}
            disabled={isThumbRunning}
            className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg transition flex items-center gap-2"
          >
            {isThumbRunning && <Loader2 size={14} className="animate-spin" />}
            {isThumbRunning ? "生成中..." : "再生成"}
          </button>
          <button
            onClick={() => regenThumbs(true)}
            disabled={isThumbRunning}
            className="bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg transition"
            title="DB上でサムネイル未作成のアイテムだけを生成します"
          >
            未作成のみ再生成
          </button>
        </div>
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

