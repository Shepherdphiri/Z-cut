import React from 'react';
import { 
  Film, 
  Share2, 
  CloudUpload, 
  Database, 
  Plus,
  Sliders,
  CheckCircle2,
  User,
  Crown,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { SqlDatabaseStats } from '../types';
import { UserAccount } from '../utils/authManager';

interface HeaderProps {
  onOpenUploader: () => void;
  onOpenExport: () => void;
  onOpenSocialPublish: () => void;
  onOpenDbStats: () => void;
  dbStats: SqlDatabaseStats | null;
  hasClips: boolean;
  currentUser: UserAccount | null;
  onOpenAuth: () => void;
  onOpenAdmin: () => void;
  onOpenUpgrade: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUploader,
  onOpenExport,
  onOpenSocialPublish,
  onOpenDbStats,
  dbStats,
  hasClips,
  currentUser,
  onOpenAuth,
  onOpenAdmin,
  onOpenUpgrade,
  onLogout
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const isPremium = currentUser?.plan === 'premium' || isAdmin;

  return (
    <header className="bg-neutral-900/95 border-b border-neutral-800 text-white sticky top-0 z-40 px-3 sm:px-6 py-2 backdrop-blur">
      <div className="w-full flex items-center justify-between gap-2 sm:gap-4">
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
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-[11px] font-medium transition-colors"
        >
          <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>SQLite:</span>
          <span className="font-mono text-emerald-400 font-bold">{dbStats ? `${dbStats.dbSizeKb} KB` : '48 KB'}</span>
          <span className="text-neutral-500 text-[10px]">• Local File Slicing</span>
        </button>

        {/* Action Controls & User/Admin Account Area */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            id="btn-import-movie"
            onClick={onOpenUploader}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
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
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Publish</span>
              </button>

              <button
                id="btn-cloud-export"
                onClick={onOpenExport}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all active:scale-95"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </>
          )}

          {/* ADMIN ONLY MENU BUTTON: only admin can see what in the admin menu */}
          {isAdmin && (
            <button
              id="btn-admin-dashboard"
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30 text-xs font-extrabold shadow-sm transition-all"
              title="Open Master Admin Control Panel"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Admin Menu</span>
              <span className="sm:hidden text-[11px]">Admin</span>
            </button>
          )}

          {/* Upgrade Button (visible if not premium) */}
          {!isPremium && (
            <button
              id="btn-upgrade-pro"
              onClick={onOpenUpgrade}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors"
            >
              <Crown className="w-3.5 h-3.5 text-amber-200" />
              <span className="hidden sm:inline">Upgrade PRO</span>
              <span className="sm:hidden text-[11px]">PRO</span>
            </button>
          )}

          {/* Account Login / Profile Status */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 pl-1 border-l border-neutral-800">
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-neutral-950 border border-neutral-800"
                title={`Logged in as ${currentUser.username} (${currentUser.plan.toUpperCase()})`}
              >
                <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[11px] font-black ${
                  isAdmin ? 'bg-amber-500 text-black' : isPremium ? 'bg-rose-500 text-white' : 'bg-neutral-800 text-neutral-300'
                }`}>
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-white max-w-[80px] truncate hidden sm:inline">
                  {currentUser.username}
                </span>
                <span className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold uppercase ${
                  isAdmin ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : isPremium ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-neutral-800 text-neutral-400'
                }`}>
                  {isAdmin ? 'ADMIN' : currentUser.plan}
                </span>
              </div>

              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-bold transition-colors"
            >
              <User className="w-3.5 h-3.5 text-rose-400" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
