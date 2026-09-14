import React, { useState, useEffect } from 'react';
import { 
  Film, 
  Flame, 
  Share2, 
  CloudUpload, 
  Scan, 
  Type, 
  Music, 
  Layers, 
  Check, 
  Play, 
  RefreshCw,
  Sliders,
  Database,
  Eye,
  Smartphone,
  HardDrive,
  Plus,
  Sparkles,
  UploadCloud,
  Scissors,
  Clock,
  Search,
  Lock,
  Crown
} from 'lucide-react';
import { 
  MovieSource, 
  VideoClip, 
  CaptionStyle, 
  CaptionPosition, 
  TemplateConfig, 
  AudioTrack, 
  FramingConfig,
  SqlDatabaseStats 
} from './types';
import { TRENDING_AUDIO_LIBRARY, TEMPLATE_PRESETS } from './data/audioLibrary';
import { Header } from './components/Header';
import { VerticalVideoPlayer } from './components/VerticalVideoPlayer';
import { SmartFramingInspector } from './components/SmartFramingInspector';
import { CaptionEditor } from './components/CaptionEditor';
import { AudioLibraryDrawer } from './components/AudioLibraryDrawer';
import { BrandingTemplateDrawer } from './components/BrandingTemplateDrawer';
import { SocialPublisherModal } from './components/SocialPublisherModal';
import { CloudExportModal } from './components/CloudExportModal';
import { MovieUploader } from './components/MovieUploader';
import { SqlDatabaseModal } from './components/SqlDatabaseModal';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { AdminDashboardModal } from './components/AdminDashboardModal';
import { UpgradeModal } from './components/UpgradeModal';
import { 
  getActiveSession, 
  logoutUser, 
  UserAccount 
} from './utils/authManager';
import { 
  getLatestLocalVideo, 
  listLocalStoredVideos, 
  getLocalVideoFromStorage 
} from './utils/localVideoStorage';
import { 
  processLocalVideoFile, 
  generateLocalTestMovie,
  generateClipsForMovie,
  formatTimeCode
} from './utils/localMovieProcessor';

export default function App() {
  // Active movie source & extracted clips (Loaded strictly from local storage)
  const [currentMovie, setCurrentMovie] = useState<MovieSource | null>(null);
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string>('');
  const [currentPlayerTime, setCurrentPlayerTime] = useState<number>(0);
  const [isLoadingInitialStorage, setIsLoadingInitialStorage] = useState<boolean>(true);

  // Slicing configuration: default 60s (1-minute) clips across whole movie
  const [segmentDuration, setSegmentDuration] = useState<number>(60);
  const [clipSearchQuery, setClipSearchQuery] = useState<string>('');

  // Active Tab in Editor Panel
  const [activeEditorTab, setActiveEditorTab] = useState<'framing' | 'captions' | 'audio' | 'branding'>('framing');

  // Mobile View Switcher: on mobile, toggle between watching the video or tweaking the controls
  const [mobileActiveView, setMobileActiveView] = useState<'player' | 'tools'>('player');

  // Customization state for current clip
  const [subtitlesEnabled, setSubtitlesEnabled] = useState<boolean>(true);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>('hormozi');
  const [captionPosition, setCaptionPosition] = useState<CaptionPosition>('lower');
  const [captionFontSize, setCaptionFontSize] = useState<number>(18);
  const [highlightColor, setHighlightColor] = useState<string>('#FACC15');

  // Template config
  const [template, setTemplate] = useState<TemplateConfig>(TEMPLATE_PRESETS[0]);

  // Audio track & ducking
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<AudioTrack | null>(TRENDING_AUDIO_LIBRARY[0]);
  const [audioDuckingEnabled, setAudioDuckingEnabled] = useState<boolean>(true);
  const [speechVolume, setSpeechVolume] = useState<number>(1.0);
  const [musicVolume, setMusicVolume] = useState<number>(0.35);

  // Framing fine tune
  const [manualPanOffset, setManualPanOffset] = useState<number>(0);

  // SQLite Database stats
  const [dbStats, setDbStats] = useState<SqlDatabaseStats | null>(null);

  // Modals
  const [showUploader, setShowUploader] = useState<boolean>(false);
  const [showSocialPublish, setShowSocialPublish] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showDbModal, setShowDbModal] = useState<boolean>(false);

  // User Session & Admin & Upgrade Modals
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getActiveSession());
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);

  const isPremium = currentUser?.plan === 'premium' || currentUser?.role === 'admin';

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
  };

  // Load latest stored video from local IndexedDB on application launch
  useEffect(() => {
    const restoreFromLocalStorage = async () => {
      try {
        setIsLoadingInitialStorage(true);
        const stored = await getLatestLocalVideo();
        if (stored && stored.blob) {
          const { movie, clips } = await processLocalVideoFile(stored.blob, stored.name, 60);
          setCurrentMovie(movie);
          setClips(clips);
          if (clips.length > 0) {
            setSelectedClipId(clips[0].id);
          }
        }
      } catch (e) {
        console.warn('Could not restore movie from local storage:', e);
      } finally {
        setIsLoadingInitialStorage(false);
      }
    };

    restoreFromLocalStorage();
  }, []);

  // Sync health & DB stats with backend SQLite
  useEffect(() => {
    const fetchDbStats = async () => {
      try {
        const healthRes = await fetch('/api/health');
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          setDbStats({
            database: healthData.database,
            dbSizeKb: healthData.dbSizeKb || 48,
            totalClipsInDb: healthData.totalClipsInDb || clips.length,
            totalSocialPostsInDb: healthData.totalSocialPostsInDb || 0
          });
        }
      } catch (e) {
        console.warn('SQLite health check:', e);
      }
    };

    fetchDbStats();
  }, [clips.length]);

  // Sync active project to SQLite when currentMovie or clips change
  useEffect(() => {
    if (!currentMovie) return;
    const syncToSql = async () => {
      try {
        await fetch('/api/db/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project: {
              id: currentMovie.id,
              title: currentMovie.title,
              videoUrl: currentMovie.videoUrl,
              thumbnailUrl: currentMovie.thumbnailUrl,
              durationFormatted: currentMovie.durationFormatted,
              durationSeconds: currentMovie.durationSeconds,
              genre: currentMovie.genre
            },
            clips: clips
          })
        });
      } catch (e) {
        console.warn('SQLite sync warning:', e);
      }
    };

    syncToSql();
  }, [currentMovie?.id, clips]);

  // Active clip reference
  const activeClip = clips.find(c => c.id === selectedClipId) || clips[0];

  const handleRegenerateClips = (durationSeconds: number = 60) => {
    if (!currentMovie) return;
    setSegmentDuration(durationSeconds);
    const recomputed = generateClipsForMovie(currentMovie.title, currentMovie.durationSeconds, durationSeconds);
    setClips(recomputed);
    if (recomputed.length > 0) {
      setSelectedClipId(recomputed[0].id);
      setManualPanOffset(0);
    }
  };

  const filteredClips = clips.filter((c, idx) => {
    if (!clipSearchQuery.trim()) return true;
    const q = clipSearchQuery.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.hookText.toLowerCase().includes(q) ||
      `part ${idx + 1}`.includes(q) ||
      `clip ${idx + 1}`.includes(q)
    );
  });

  const handleMovieSelected = (newMovie: MovieSource, newClips: VideoClip[]) => {
    setCurrentMovie(newMovie);
    setClips(newClips);
    if (newClips.length > 0) {
      setSelectedClipId(newClips[0].id);
      setManualPanOffset(0);
    }
  };

  const handleFramingChange = (newFraming: FramingConfig) => {
    if (!activeClip) return;
    setClips(prev =>
      prev.map(c => (c.id === activeClip.id ? { ...c, framing: newFraming } : c))
    );
  };

  const handleQuickLocalTest = async () => {
    try {
      setIsLoadingInitialStorage(true);
      const { movie, clips } = await generateLocalTestMovie();
      handleMovieSelected(movie, clips);
    } catch (e) {
      console.error('Failed to generate local test movie:', e);
    } finally {
      setIsLoadingInitialStorage(false);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsLoadingInitialStorage(true);
      const { movie, clips } = await processLocalVideoFile(file, undefined, 60);
      handleMovieSelected(movie, clips);
    } catch (err) {
      console.error('File process failed:', err);
    } finally {
      setIsLoadingInitialStorage(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-['Plus_Jakarta_Sans'] pb-16 lg:pb-0 antialiased">
      {/* Navigation Bar */}
      <Header
        onOpenUploader={() => setShowUploader(true)}
        onOpenExport={() => setShowExportModal(true)}
        onOpenSocialPublish={() => setShowSocialPublish(true)}
        onOpenDbStats={() => setShowDbModal(true)}
        dbStats={dbStats}
        hasClips={clips.length > 0}
        currentUser={currentUser}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenAdmin={() => setShowAdminModal(true)}
        onOpenUpgrade={() => setShowUpgradeModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Studio Body - Fully Responsive */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-5 flex flex-col gap-4">
        {isLoadingInitialStorage ? (
          <div className="py-24 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 text-rose-500 flex items-center justify-center mx-auto animate-pulse shadow-lg">
              <Film className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-base sm:text-lg font-['Outfit'] text-white">
              Loading Local Storage Movie...
            </h3>
            <p className="text-xs text-neutral-400">
              Retrieving video stream directly from device memory with zero cloud transfer.
            </p>
          </div>
        ) : !currentMovie ? (
          /* Empty State: Prompt User to Select Local Movie */
          <div className="my-8 max-w-2xl mx-auto w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-10 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-rose-600/20 text-rose-500 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
              <Film className="w-8 h-8" />
            </div>

            <h2 className="font-extrabold text-xl sm:text-2xl text-white font-['Outfit']">
              Load a Movie from Local Storage
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-md mx-auto">
              Select any widescreen film or video from your computer or phone. Z-cut processes it 100% locally and automatically frames it into 9:16 vertical clips.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <label className="cursor-pointer w-full sm:w-auto px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95">
                <UploadCloud className="w-4 h-4" />
                <span>Select Local Video File</span>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleQuickLocalTest}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Create Local Test Video (12s)</span>
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-neutral-800 flex items-center justify-center gap-2 text-[11px] text-neutral-500">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Local Storage • Zero Cloud Uploads • Pure SQLite Metadata</span>
            </div>
          </div>
        ) : (
          /* Active Editing Studio */
          <>
            {/* Top Movie Ingest Ribbon & Clips Carousel */}
            <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3 sm:p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-12 h-8 sm:w-14 sm:h-9 rounded-lg overflow-hidden border border-neutral-700 shrink-0 bg-neutral-800">
                    {currentMovie.thumbnailUrl ? (
                      <img
                        src={currentMovie.thumbnailUrl}
                        alt={currentMovie.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-4 h-4 text-neutral-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <h1 className="font-bold text-sm sm:text-base text-white font-['Outfit'] truncate">
                        {currentMovie.title}
                      </h1>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-emerald-400 border border-neutral-700 shrink-0 flex items-center gap-1">
                        <HardDrive className="w-2.5 h-2.5" />
                        LOCAL
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5 truncate">
                      {currentMovie.durationFormatted} • {currentMovie.genre}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowUploader(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
                    <span>Change Local File</span>
                  </button>
                </div>
              </div>

              {/* Extracted 1-Minute Clips Section - Full Movie Coverage */}
              <div className="mt-3 space-y-2.5">
                {/* Duration Mode Bar & Batch Export Trigger */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-neutral-950/70 border border-neutral-800 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-neutral-300 flex items-center gap-1.5 text-[11px] sm:text-xs">
                      <Scissors className="w-3.5 h-3.5 text-rose-400" />
                      Clip Length:
                    </span>
                    <div className="inline-flex rounded-lg bg-neutral-900 border border-neutral-800 p-0.5">
                      <button
                        onClick={() => handleRegenerateClips(60)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                          segmentDuration === 60
                            ? 'bg-rose-600 text-white shadow'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        1 Min (60s)
                      </button>
                      <button
                        onClick={() => handleRegenerateClips(30)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                          segmentDuration === 30
                            ? 'bg-rose-600 text-white shadow'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        30s
                      </button>
                      <button
                        onClick={() => handleRegenerateClips(90)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                          segmentDuration === 90
                            ? 'bg-rose-600 text-white shadow'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        90s
                      </button>
                      <button
                        onClick={() => handleRegenerateClips(120)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                          segmentDuration === 120
                            ? 'bg-rose-600 text-white shadow'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        2 Min
                      </button>
                    </div>

                    <button
                      onClick={() => handleRegenerateClips(60)}
                      title="Re-slice whole movie into consecutive 1-minute segments"
                      className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3 text-rose-400" />
                      <span>Re-Slice 1-Min Clips</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-emerald-400 font-bold hidden md:inline">
                      100% of movie covered ({clips.length} {segmentDuration === 60 ? '1-min' : `${segmentDuration}s`} clips)
                    </span>
                    <button
                      onClick={() => setShowExportModal(true)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1 transition-colors"
                    >
                      <Layers className="w-3 h-3 text-amber-400" />
                      <span>Batch Export ({clips.length})</span>
                    </button>
                  </div>
                </div>

                {/* Search / Part Jump Header */}
                <div className="flex items-center justify-between gap-2 text-xs text-neutral-400">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-300">
                      Movie Parts ({clips.length} Clips)
                    </span>
                    {!isPremium ? (
                      <button
                        onClick={() => setShowUpgradeModal(true)}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-bold bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors"
                      >
                        <Lock className="w-2.5 h-2.5" />
                        <span>5 Free Clips • Upgrade for All {clips.length}</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Crown className="w-2.5 h-2.5 text-amber-400" />
                        <span>Unlimited Pro Clips ({clips.length})</span>
                      </span>
                    )}
                  </div>

                  {clips.length > 4 && (
                    <div className="relative">
                      <input
                        type="text"
                        value={clipSearchQuery}
                        onChange={(e) => setClipSearchQuery(e.target.value)}
                        placeholder="Search Part #..."
                        className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-0.5 text-[11px] text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 w-28 sm:w-36"
                      />
                      {clipSearchQuery && (
                        <button
                          onClick={() => setClipSearchQuery('')}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-[10px]"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Clips Grid / Scrollable Ribbon */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {filteredClips.map((clip) => {
                    const isSelected = clip.id === activeClip?.id;
                    const originalIndex = clips.findIndex(c => c.id === clip.id);
                    const isClipLocked = !isPremium && originalIndex >= 5;

                    return (
                      <div
                        key={clip.id}
                        onClick={() => {
                          if (isClipLocked) {
                            setShowUpgradeModal(true);
                            return;
                          }
                          setSelectedClipId(clip.id);
                          setManualPanOffset(0);
                        }}
                        className={`cursor-pointer p-3 rounded-xl border transition-all flex flex-col justify-between ${
                          isClipLocked
                            ? 'border-amber-500/30 bg-amber-950/10 hover:border-amber-500/50'
                            : isSelected
                            ? 'border-rose-500 bg-rose-950/30 ring-1 ring-rose-500/50 shadow-md'
                            : 'border-neutral-800 bg-neutral-950/50 hover:border-neutral-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-neutral-300 font-mono text-[11px] flex items-center gap-1">
                              <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-white font-bold">
                                PART {originalIndex + 1}
                              </span>
                              <span className="text-neutral-500">
                                {formatTimeCode(clip.startTime)} - {formatTimeCode(clip.endTime)}
                              </span>
                            </span>
                            {isClipLocked ? (
                              <div className="flex items-center gap-1 text-amber-400 font-bold text-[10px] bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-500/30">
                                <Lock className="w-2.5 h-2.5" />
                                <span>PRO</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-amber-400 font-bold text-[10px] bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                                <Flame className="w-2.5 h-2.5 fill-amber-400" />
                                <span>{clip.viralScore}%</span>
                              </div>
                            )}
                          </div>

                          <h4 className="font-bold text-xs text-white font-['Outfit'] line-clamp-1 mt-1">
                            {clip.title}
                          </h4>
                          <p className="text-[11px] text-neutral-300 mt-0.5 truncate italic">
                            "{clip.hookText}"
                          </p>
                        </div>

                        <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-400">
                          <span className="capitalize">{clip.framing.mode.replace('_', ' ')} • {clip.duration}s</span>
                          {isClipLocked ? (
                            <span className="text-amber-400 font-bold flex items-center gap-1">
                              <Crown className="w-2.5 h-2.5" /> Unlock
                            </span>
                          ) : isSelected ? (
                            <span className="text-rose-400 font-bold flex items-center gap-1">
                              <Play className="w-2.5 h-2.5 fill-rose-400" />
                              Playing
                            </span>
                          ) : (
                            <span className="text-neutral-500 group-hover:text-neutral-300">
                              Select
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Mobile View Toggle Buttons (Visible only on mobile screens < 1024px) */}
            <div className="lg:hidden flex items-center gap-2 p-1 bg-neutral-900 border border-neutral-800 rounded-2xl">
              <button
                onClick={() => setMobileActiveView('player')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  mobileActiveView === 'player'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>9:16 Video Player</span>
              </button>
              <button
                onClick={() => setMobileActiveView('tools')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  mobileActiveView === 'tools'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Editing Tools & Mix</span>
              </button>
            </div>

            {/* Central Workspace: 9:16 Video Player & Tool Inspector */}
            {activeClip && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left Column: 9:16 Vertical Video Screen */}
                <div className={`lg:col-span-5 flex flex-col items-center w-full ${
                  mobileActiveView === 'tools' ? 'hidden lg:flex' : 'flex'
                }`}>
                  <div className="w-full flex items-center justify-between text-xs text-neutral-400 mb-2 px-1 max-w-[340px]">
                    <span className="font-bold text-neutral-200 font-['Outfit'] flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-rose-400" />
                      9:16 Vertical Canvas
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      1080x1920 Pro
                    </span>
                  </div>

                  <VerticalVideoPlayer
                    clip={activeClip}
                    videoSrc={currentMovie.videoUrl}
                    subtitlesEnabled={subtitlesEnabled}
                    onToggleSubtitles={setSubtitlesEnabled}
                    captionStyle={captionStyle}
                    captionPosition={captionPosition}
                    captionFontSize={captionFontSize}
                    highlightColor={highlightColor}
                    template={template}
                    activeAudioTrack={selectedAudioTrack}
                    audioDuckingEnabled={audioDuckingEnabled}
                    speechVolume={speechVolume}
                    musicVolume={musicVolume}
                    manualPanOffset={manualPanOffset}
                    onTimeUpdate={(t) => setCurrentPlayerTime(t)}
                    onOpenUploader={() => setShowUploader(true)}
                  />

                  {/* Quick Action buttons right under player on mobile */}
                  <div className="lg:hidden w-full max-w-[340px] mt-3 flex items-center gap-2">
                    <button
                      onClick={() => setShowSocialPublish(true)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-neutral-900 border border-neutral-800 text-white flex items-center justify-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5 text-sky-400" />
                      <span>Share Post</span>
                    </button>
                    <button
                      onClick={() => setShowExportModal(true)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center gap-1.5"
                    >
                      <CloudUpload className="w-3.5 h-3.5" />
                      <span>Export 4K/1080p</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: Multi-tab Tool Suite */}
                <div className={`lg:col-span-7 space-y-4 w-full ${
                  mobileActiveView === 'player' ? 'hidden lg:block' : 'block'
                }`}>
                  {/* Tool Navigation Tabs - Responsive Scroll */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-1.5 flex items-center gap-1 overflow-x-auto scrollbar-none">
                    <button
                      onClick={() => setActiveEditorTab('framing')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        activeEditorTab === 'framing'
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      <Scan className="w-4 h-4" />
                      <span>Auto-Crop & Framing</span>
                    </button>

                    <button
                      onClick={() => setActiveEditorTab('captions')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        activeEditorTab === 'captions'
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      <Type className="w-4 h-4" />
                      <span>Subtitles</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                        subtitlesEnabled 
                          ? activeEditorTab === 'captions' ? 'bg-white/20 text-white' : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : activeEditorTab === 'captions' ? 'bg-black/40 text-neutral-200' : 'bg-neutral-800 text-neutral-500'
                      }`}>
                        {subtitlesEnabled ? 'ON' : 'OFF'}
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveEditorTab('audio')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        activeEditorTab === 'audio'
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      <Music className="w-4 h-4" />
                      <span>Music & Ducking</span>
                    </button>

                    <button
                      onClick={() => setActiveEditorTab('branding')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        activeEditorTab === 'branding'
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                      <span>Branding & Hook Intros</span>
                      {!isPremium && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          PRO
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Active Tab Component */}
                  <div>
                    {activeEditorTab === 'framing' && (
                      <SmartFramingInspector
                        framing={activeClip.framing}
                        onChangeFraming={handleFramingChange}
                        manualPanOffset={manualPanOffset}
                        onManualPanChange={setManualPanOffset}
                        videoSrc={currentMovie.videoUrl}
                        movieThumbnail={currentMovie.thumbnailUrl}
                        currentPlayTime={activeClip.startTime + currentPlayerTime}
                      />
                    )}

                    {activeEditorTab === 'captions' && (
                      <CaptionEditor
                        subtitlesEnabled={subtitlesEnabled}
                        onToggleSubtitles={setSubtitlesEnabled}
                        captionStyle={captionStyle}
                        onChangeStyle={setCaptionStyle}
                        captionPosition={captionPosition}
                        onChangePosition={setCaptionPosition}
                        fontSize={captionFontSize}
                        onChangeFontSize={setCaptionFontSize}
                        highlightColor={highlightColor}
                        onChangeHighlightColor={setHighlightColor}
                        dialogue={activeClip.dialogue}
                      />
                    )}

                    {activeEditorTab === 'audio' && (
                      <AudioLibraryDrawer
                        selectedTrack={selectedAudioTrack}
                        onSelectTrack={setSelectedAudioTrack}
                        audioDuckingEnabled={audioDuckingEnabled}
                        onToggleAudioDucking={setAudioDuckingEnabled}
                        speechVolume={speechVolume}
                        onChangeSpeechVolume={setSpeechVolume}
                        musicVolume={musicVolume}
                        onChangeMusicVolume={setMusicVolume}
                      />
                    )}

                    {activeEditorTab === 'branding' && (
                      <BrandingTemplateDrawer
                        template={template}
                        onChangeTemplate={setTemplate}
                        isPremium={isPremium}
                        onOpenUpgrade={() => setShowUpgradeModal(true)}
                      />
                    )}
                  </div>

                  {/* Quick Actions Footer Bar */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-xs text-white">Social Media Distribution</h4>
                      <p className="text-[11px] text-neutral-400">
                        Direct share to TikTok, Instagram Reels, and YouTube Shorts.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowSocialPublish(true)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5 text-sky-400" />
                        <span>Direct Social Post</span>
                      </button>

                      <button
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all active:scale-95"
                      >
                        <CloudUpload className="w-4 h-4" />
                        <span>Cloud Export (4K / 1080p)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {showUploader && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <MovieUploader
            onMovieSelected={handleMovieSelected}
            onClose={() => setShowUploader(false)}
            currentMovieId={currentMovie?.id}
          />
        </div>
      )}

      {showSocialPublish && activeClip && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <SocialPublisherModal
            clip={activeClip}
            onClose={() => setShowSocialPublish(false)}
          />
        </div>
      )}

      {showExportModal && activeClip && (
        <CloudExportModal
          clip={activeClip}
          allClips={clips}
          template={template}
          activeAudioTrack={selectedAudioTrack}
          videoSrc={currentMovie ? currentMovie.videoUrl : ''}
          subtitlesEnabled={subtitlesEnabled}
          isPremium={isPremium}
          onOpenUpgrade={() => setShowUpgradeModal(true)}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {showDbModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <SqlDatabaseModal
            onClose={() => setShowDbModal(false)}
          />
        </div>
      )}

      {/* Auth Modal (Sign In / Register) */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={(user) => {
            setCurrentUser(user);
          }}
        />
      )}

      {/* Master Admin Dashboard Modal */}
      {showAdminModal && (
        <AdminDashboardModal
          onClose={() => {
            setShowAdminModal(false);
            // Refresh current session state if admin modified own/other accounts
            setCurrentUser(getActiveSession());
          }}
          onUserUpdated={() => {
            setCurrentUser(getActiveSession());
          }}
        />
      )}

      {/* Upgrade to Premium Modal (Offline Payment) */}
      {showUpgradeModal && (
        <UpgradeModal
          currentUser={currentUser}
          onClose={() => setShowUpgradeModal(false)}
          onOpenAuth={() => {
            setShowUpgradeModal(false);
            setShowAuthModal(true);
          }}
          onUpgradeRequested={() => {
            setCurrentUser(getActiveSession());
          }}
        />
      )}

      {/* Persistent Footer */}
      <Footer />
    </div>
  );
}
