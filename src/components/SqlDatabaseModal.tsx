import React, { useEffect, useState } from 'react';
import { Database, HardDrive, ShieldCheck, Check, RefreshCw, Layers, Table } from 'lucide-react';
import { SqlDatabaseStats } from '../types';

interface SqlDatabaseModalProps {
  onClose: () => void;
}

export const SqlDatabaseModal: React.FC<SqlDatabaseModalProps> = ({ onClose }) => {
  const [stats, setStats] = useState<SqlDatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setStats({
          database: data.database || 'SQLite (Pure SQL)',
          dbSizeKb: data.dbSizeKb || 48,
          totalClipsInDb: data.totalClipsInDb || 0,
          totalSocialPostsInDb: data.totalSocialPostsInDb || 0
        });
      }

      const postsRes = await fetch('/api/db/social-posts');
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(postsData.posts || []);
      }
    } catch (e) {
      console.warn('Failed to fetch DB stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-xl w-full p-5 sm:p-6 text-white shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg font-['Outfit']">SQLite Database & Storage Monitor</h2>
              <p className="text-xs text-neutral-400">
                Lightweight embedded SQL storage with zero raw video file bloat.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Database Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-4">
          <div className="p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block mb-1">Database Engine</span>
            <span className="text-xs sm:text-sm font-bold text-emerald-400 font-mono flex items-center gap-1">
              <Database className="w-3.5 h-3.5" />
              SQLite 3
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800">
            <span className="text-[11px] text-neutral-400 block mb-1">Disk Footprint</span>
            <span className="text-xs sm:text-sm font-bold text-white font-mono">
              {stats ? `${stats.dbSizeKb} KB` : '48 KB'}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-neutral-400 block mb-1">Firebase Dependencies</span>
            <span className="text-xs sm:text-sm font-bold text-neutral-300 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Zero (None)
            </span>
          </div>
        </div>

        {/* Storage Architecture Explanation */}
        <div className="p-3.5 rounded-2xl bg-neutral-950/60 border border-neutral-800 text-xs space-y-2 mb-4">
          <div className="flex items-center gap-2 text-neutral-200 font-semibold">
            <HardDrive className="w-4 h-4 text-rose-400" />
            <span>Zero Heavy Video Storage Architecture</span>
          </div>
          <p className="text-neutral-400 text-[11px] leading-relaxed">
            Movies and long video streams are referenced purely by URL, frame pointers, crop coordinates, and text timestamps. No bulky gigabyte video files are ever saved onto the server disk, ensuring maximum speed, minimal RAM usage, and instant responsiveness.
          </p>
        </div>

        {/* SQL Tables Overview */}
        <div className="space-y-2 mb-4">
          <span className="text-xs font-semibold text-neutral-300 block">
            SQL Database Schema (`zcut.sqlite`)
          </span>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-300">projects</span>
              <span className="text-neutral-500">ID, URLs, duration</span>
            </div>
            <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-300">clips</span>
              <span className="text-neutral-500">crop & timings</span>
            </div>
            <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-300">social_accounts</span>
              <span className="text-neutral-500">TikTok, IG, Shorts</span>
            </div>
            <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-300">social_posts</span>
              <span className="text-emerald-400 font-bold">{posts.length} logs</span>
            </div>
          </div>
        </div>

        {/* Recent Social Posts Log from SQL */}
        {posts.length > 0 && (
          <div className="mb-4">
            <span className="text-xs font-semibold text-neutral-300 mb-1.5 block">
              Recent Social Media Activity (from SQL Table)
            </span>
            <div className="max-h-28 overflow-y-auto space-y-1 pr-1 text-xs">
              {posts.map((p, i) => (
                <div key={i} className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                  <div className="truncate mr-2">
                    <span className="font-bold text-white capitalize mr-1.5">{p.platform}:</span>
                    <span className="text-neutral-400 truncate">{p.caption}</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 shrink-0 font-semibold">
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
          <button
            onClick={fetchStats}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh SQL</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
