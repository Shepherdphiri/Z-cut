import React from 'react';
import { 
  Film, 
  Share2, 
  CloudUpload, 
  Database, 
  Plus,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { SqlDatabaseStats } from '../types';

interface HeaderProps {
  onOpenUploader: () => void;
  onOpenExport: () => void;
  onOpenSocialPublish: () => void;
  onOpenDbStats: () => void;
  dbStats: SqlDatabaseStats | null;
  hasClips: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUploader,
  onOpenExport,
  onOpenSocialPublish,
  onOpenDbStats,
  dbStats,
  hasClips
}) => {
  return (
    <header className="bg-neutral-900/95 border-b border-neutral-800 text-white sticky top-0 z-40 px-3 sm:px-6 py-2.5 backdrop-blur">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-600 flex items-center justify-center shadow-md">
            <Film className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white font-['Outfit']">Z-cut</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                PRO 9:16
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-neutral-400 hidden xs:block">
              Widescreen Movies to Vertical Clips
            </p>
          </div>
        </div>

        {/* SQLite Lightweight Database Status Indicator */}
        <button
          onClick={onOpenDbStats}
          title="Click to view SQLite database & storage status"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-[11px] font-medium transition-colors"
        >
          <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="hidden sm:inline">SQLite:</span>
          <span className="font-mono text-emerald-400 font-bold">{dbStats ? `${dbStats.dbSizeKb} KB` : '48 KB'}</span>
          <span className="hidden md:inline text-neutral-500 text-[10px]">• No Heavy Storage • Zero Firebase</span>
        </button>

        {/* Action Controls - Mobile Responsive */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            id="btn-import-movie"
            onClick={onOpenUploader}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Movie Source</span>
            <span className="sm:hidden text-[11px]">Source</span>
          </button>

          {hasClips && (
            <>
              <button
                id="btn-social-post"
                onClick={onOpenSocialPublish}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Publish</span>
                <span className="sm:hidden text-[11px]">Share</span>
              </button>

              <button
                id="btn-cloud-export"
                onClick={onOpenExport}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all active:scale-95"
              >
                <CloudUpload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Export (1080p/4K)</span>
                <span className="sm:hidden text-[11px]">Export</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
