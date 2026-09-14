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
  Smartphone
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
import { SAMPLE_MOVIES } from './data/sampleMovies';
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

export default function App() {
  // Active movie source & extracted clips
  const [currentMovie, setCurrentMovie] = useState<MovieSource>(SAMPLE_MOVIES[0]);
  const [clips, setClips] = useState<VideoClip[]>(SAMPLE_MOVIES[0].precomputedClips);
  const [selectedClipId, setSelectedClipId] = useState<string>(SAMPLE_MOVIES[0].precomputedClips[0].id);

  // Active Tab in Editor Panel
  const [activeEditorTab, setActiveEditorTab] = useState<'framing' | 'captions' | 'audio' | 'branding'>('framing');

  // Mobile View Switcher: on mobile, toggle between watching the video or tweaking the controls
  const [mobileActiveView, setMobileActiveView] = useState<'player' | 'tools'>('player');

  // Customization state for current clip
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

  // Sync initial project & clips to SQLite database on startup
  useEffect(() => {
    const initSqlSync = async () => {
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

        const healthRes = await fetch('/api/health');
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          setDbStats({
            database: healthData.database,
            dbSizeKb: healthData.dbSizeKb || 48,
            totalClipsInDb: healthData.totalClipsInDb || 3,
            totalSocialPostsInDb: healthData.totalSocialPostsInDb || 0
          });
        }
      } catch (e) {
        console.warn('Initial SQLite sync error:', e);
      }
    };
    initSqlSync();
  }, []);

  // Get active clip
  const activeClip = clips.find(c => c.id === selectedClipId) || clips[0];

  const handleMovieSelected = (newMovie: MovieSource, newClips: VideoClip[]) => {
    setCurrentMovie(newMovie);
    setClips(newClips);
    if (newClips.length > 0) {
      setSelectedClipId(newClips[0].id);
      setManualPanOffset(0);
    }
  };

  const handleFramingChange = (newFraming: FramingConfig) => {
    setClips(prev =>
      prev.map(c => (c.id === activeClip.id ? { ...c, framing: newFraming } : c))
    );
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-['Plus_Jakarta_Sans'] pb-16 lg:pb-6 antialiased">
      {/* Navigation Bar */}
      <Header
        onOpenUploader={() => setShowUploader(true)}
        onOpenExport={() => setShowExportModal(true)}
        onOpenSocialPublish={() => setShowSocialPublish(true)}
        onOpenDbStats={() => setShowDbModal(true)}
        dbStats={dbStats}
        hasClips={clips.length > 0}
      />

      {/* Main Studio Body - Fully Responsive */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-5 flex flex-col gap-4">
        {/* Top Movie Ingest Ribbon & Clips Carousel */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-3 sm:p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <img
                src={currentMovie.thumbnailUrl}
                alt={currentMovie.title}
                className="w-12 h-8 sm:w-14 sm:h-9 rounded-lg object-cover border border-neutral-700 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="font-bold text-sm sm:text-base text-white font-['Outfit'] truncate">
                    {currentMovie.title}
                  </h1>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 shrink-0">
                    16:9
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
                <span>Change Film</span>
              </button>
            </div>
          </div>

          {/* Extracted Clips Selector - Touch Friendly & Horizontally Scrollable on Mobile */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
              <span className="font-semibold text-neutral-300">
                Extracted 9:16 Vertical Clips ({clips.length})
              </span>
              <span className="text-[10px] sm:text-xs">Tap a clip to inspect</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
              {clips.map((clip, index) => {
                const isSelected = clip.id === activeClip.id;
                return (
                  <div
                    key={clip.id}
                    onClick={() => {
                      setSelectedClipId(clip.id);
                      setManualPanOffset(0);
                    }}
                    className={`cursor-pointer p-3 rounded-xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-rose-500 bg-rose-950/25 ring-1 ring-rose-500/50 shadow'
                        : 'border-neutral-800 bg-neutral-950/50 hover:border-neutral-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-neutral-400 font-mono">
                          Clip #{index + 1} ({clip.duration}s)
                        </span>
                        <div className="flex items-center gap-1 text-amber-400 font-bold text-[11px] bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                          <Flame className="w-3 h-3 fill-amber-400" />
                          <span>{clip.viralScore}%</span>
                        </div>
                      </div>

                      <h4 className="font-bold text-xs text-white font-['Outfit'] line-clamp-1">
                        {clip.title}
                      </h4>
                      <p className="text-[11px] text-neutral-300 mt-0.5 truncate">
                        "{clip.hookText}"
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-400">
                      <span className="capitalize">{clip.framing.mode.replace('_', ' ')}</span>
                      {isSelected && (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                          Active
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
                <span>Auto-Captions</span>
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
                />
              )}

              {activeEditorTab === 'captions' && (
                <CaptionEditor
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
      </main>

      {/* Ingestion Modal */}
      {showUploader && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <MovieUploader
            onMovieSelected={handleMovieSelected}
            onClose={() => setShowUploader(false)}
            currentMovieId={currentMovie.id}
          />
        </div>
      )}

      {/* Real Social Publisher Modal */}
      {showSocialPublish && (
        <SocialPublisherModal
          clip={activeClip}
          videoSrc={currentMovie.videoUrl}
          onClose={() => setShowSocialPublish(false)}
        />
      )}

      {/* Cloud Export Modal */}
      {showExportModal && (
        <CloudExportModal
          clip={activeClip}
          allClips={clips}
          template={template}
          activeAudioTrack={selectedAudioTrack}
          videoSrc={currentMovie.videoUrl}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* SQLite Database Modal */}
      {showDbModal && (
        <SqlDatabaseModal
          onClose={() => setShowDbModal(false)}
        />
      )}
    </div>
  );
}
