import React, { useState } from 'react';
import { 
  Download, 
  CheckCircle2, 
  FileVideo, 
  Layers, 
  Check, 
  HardDrive,
  Subtitles,
  AlertCircle,
  X,
  Radio,
  Crop,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { VideoClip, TemplateConfig, AudioTrack, FramingConfig } from '../types';
import { exportSingleClip, exportBatchClips } from '../utils/clipExporter';
import { LiveCropTracker } from './LiveCropTracker';

interface CloudExportModalProps {
  clip: VideoClip;
  allClips: VideoClip[];
  template: TemplateConfig;
  activeAudioTrack: AudioTrack | null;
  videoSrc: string;
  movieThumbnail?: string;
  subtitlesEnabled?: boolean;
  isPremium?: boolean;
  onOpenUpgrade?: () => void;
  onUpdateClip?: (updated: VideoClip) => void;
  onClose: () => void;
}

export const CloudExportModal: React.FC<CloudExportModalProps> = ({
  clip,
  allClips,
  template,
  activeAudioTrack,
  videoSrc,
  movieThumbnail,
  subtitlesEnabled = true,
  isPremium = false,
  onOpenUpgrade,
  onUpdateClip,
  onClose
}) => {
  const [activeClipState, setActiveClipState] = useState<VideoClip>(clip);
  const [showLiveCrop, setShowLiveCrop] = useState<boolean>(true);
  const [resolution, setResolution] = useState<'1080x1920' | '2160x3840' | '720x1280'>('1080x1920');
  const [fps, setFps] = useState<30 | 60>(60);
  const [bitrate, setBitrate] = useState<'standard' | 'high_master'>('high_master');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [downloadReady, setDownloadReady] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState<string>('');
  const [exportError, setExportError] = useState<string | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [burnInSubtitles, setBurnInSubtitles] = useState(subtitlesEnabled ?? false);
  // Default to 'full' so the clip is never cut off prematurely
  const [durationMode, setDurationMode] = useState<'15' | '30' | 'full'>('full');

  const fullClipDuration = Math.round(
    (clip.endTime && clip.startTime && clip.endTime > clip.startTime)
      ? (clip.endTime - clip.startTime)
      : (clip.duration || 60)
  );

  const currentExportDurationSeconds = durationMode === '15'
    ? Math.min(15, fullClipDuration)
    : durationMode === '30'
      ? Math.min(30, fullClipDuration)
      : fullClipDuration;

  const resolutions = [
    {
      id: '1080x1920',
      name: '1080p FHD (9:16)',
      desc: 'High-definition vertical format for Shorts, TikTok, and Reels',
      tag: 'Recommended',
      width: 1080,
      height: 1920
    },
    {
      id: '720x1280',
      name: '720p HD (9:16)',
      desc: 'Silky smooth 60 FPS lightweight fast export',
      tag: 'Fast & Smooth',
      width: 720,
      height: 1280
    },
    {
      id: '2160x3840',
      name: '4K Ultra HD (9:16)',
      desc: 'Maximum bitrate and ultra high resolution master',
      tag: '4K Master',
      width: 2160,
      height: 3840
    }
  ];

  const handleStartExport = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportProgress(5);
    setCurrentStep('Preparing render pipeline...');

    const selectedDurationSeconds = durationMode === '15'
      ? Math.min(15, fullClipDuration)
      : durationMode === '30'
        ? Math.min(30, fullClipDuration)
        : undefined; // undefined exports full clip duration

    try {
      if (isBatchMode) {
        // Handle Batch Export
        const allowedClips = isPremium ? allClips : allClips.slice(0, 5);
        const result = await exportBatchClips(allowedClips, {
          videoSrc,
          resolution,
          fps,
          bitrate,
          burnInSubtitles,
          template,
          activeAudioTrack,
          customDuration: selectedDurationSeconds,
          onProgress: (p, msg) => {
            setExportProgress(p);
            setCurrentStep(msg);
          }
        });

        const url = URL.createObjectURL(result.blob);
        setDownloadUrl(url);
        setDownloadFilename(result.filename);
        setDownloadReady(true);
        setIsExporting(false);

        // Auto trigger download for ease of use
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        // Single Clip Export with Live Recorded Tracking baked in
        const result = await exportSingleClip({
          clip: activeClipState,
          videoSrc,
          resolution,
          fps,
          bitrate,
          burnInSubtitles,
          template,
          activeAudioTrack,
          customDuration: selectedDurationSeconds,
          onProgress: (p, msg) => {
            setExportProgress(p);
            setCurrentStep(msg);
          }
        });

        const url = URL.createObjectURL(result.blob);
        setDownloadUrl(url);
        setDownloadFilename(result.filename);
        setDownloadReady(true);
        setIsExporting(false);

        // Auto trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err: any) {
      console.error('Export failed:', err);
      setExportError(err?.message || 'Video export encountered an issue. Please try a different resolution.');
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-4xl xl:max-w-5xl w-full max-h-[92vh] flex flex-col text-neutral-100 shadow-2xl overflow-hidden relative">
        {/* Fixed Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-neutral-800 flex items-center justify-between shrink-0 bg-neutral-900/95">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-rose-500">
              <FileVideo className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">
                  {isBatchMode ? 'Batch Export Clips' : 'Export Video Clip'}
                </h2>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-500/30 font-mono">
                  {resolution} • {fps} FPS
                </span>
              </div>
              <p className="text-xs text-neutral-400 truncate max-w-md">
                {isBatchMode 
                  ? `Rendering ${isPremium ? allClips.length : Math.min(5, allClips.length)} clips to ZIP archive`
                  : clip.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Notice if any */}
        {exportError && (
          <div className="mx-4 mt-3 p-3 bg-red-950/40 border border-red-800 rounded-lg flex items-center gap-2 text-xs text-red-300 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{exportError}</span>
          </div>
        )}

        {/* Finished / Ready State */}
        {downloadReady && downloadUrl ? (
          <div className="flex-1 overflow-y-auto p-6 text-center space-y-4 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">
                Export Complete & Smooth
              </h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
                Your vertical video file is ready! The automatic download has started.
              </p>
            </div>

            {!isBatchMode && downloadUrl && (
              <div className="flex justify-center my-1">
                <video
                  src={downloadUrl}
                  controls
                  playsInline
                  autoPlay
                  loop
                  muted
                  className="h-44 rounded-xl border border-neutral-800 bg-black aspect-[9/16] shadow-xl"
                />
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 w-full max-w-md mx-auto text-left text-xs space-y-1.5">
              <div className="flex items-center justify-between text-neutral-400">
                <span>File Name:</span>
                <span className="font-medium text-white font-mono truncate max-w-[220px]">
                  {downloadFilename}
                </span>
              </div>
              <div className="flex items-center justify-between text-neutral-400">
                <span>Resolution / Codec:</span>
                <span className="font-medium text-neutral-200 font-mono">{resolution} • {fps} FPS Smooth</span>
              </div>
              <div className="flex items-center justify-between text-neutral-400">
                <span>Framing Mode:</span>
                <span className="font-medium text-neutral-200">
                  {clip.framing.mode === 'fit_blur' ? '16:9 Fit with Blurred Background' : '9:16 Vertical Pan'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <a
                href={downloadUrl}
                download={downloadFilename}
                className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2 transition-colors shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span>Download Again</span>
              </a>
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Main 2-Column Configuration Body */
          <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-3.5 space-y-3 scrollbar-thin">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
              {/* Left Column (7 cols): Live Crop + Subtitles/Batch + Duration Mode */}
              <div className="lg:col-span-7 space-y-3">
                {/* Options Row: Batch Mode & Subtitles */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Batch Export */}
                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-white">Batch Mode</p>
                        <p className="text-[10px] text-neutral-400">
                          {isBatchMode ? `All ${allClips.length} clips` : 'Single clip'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBatchMode(!isBatchMode)}
                      className={`w-8 h-4.5 rounded-full transition-colors relative p-0.5 ${
                        isBatchMode ? 'bg-rose-600' : 'bg-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                          isBatchMode ? 'translate-x-3.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Subtitles */}
                  <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Subtitles className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-white">Subtitles</p>
                        <p className="text-[10px] text-neutral-400">
                          {burnInSubtitles ? 'Burned into video' : 'Clean export'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBurnInSubtitles(!burnInSubtitles)}
                      className={`w-8 h-4.5 rounded-full transition-colors relative p-0.5 ${
                        burnInSubtitles ? 'bg-rose-600' : 'bg-neutral-800'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                          burnInSubtitles ? 'translate-x-3.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Live Crop & Manual Tracking Studio */}
                {!isBatchMode && (
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowLiveCrop(!showLiveCrop)}
                      className="w-full p-2.5 flex items-center justify-between hover:bg-neutral-900/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-400">
                          <Crop className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white">Live Crop & Manual Tracking</span>
                            <span className="text-[8px] px-1 py-0.2 rounded font-mono font-bold bg-rose-600 text-white shadow">
                              Interactive
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-400">
                            Drag crop window or record custom pan tracking baked into export
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-neutral-400 hidden sm:inline">
                          {activeClipState.framing?.panningTrajectory?.length || 0} Pts
                        </span>
                        {showLiveCrop ? (
                          <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                        )}
                      </div>
                    </button>

                    {showLiveCrop && (
                      <div className="p-2.5 pt-0 border-t border-neutral-900 space-y-2">
                        <LiveCropTracker
                          clip={activeClipState}
                          videoSrc={videoSrc}
                          movieThumbnail={movieThumbnail}
                          compact={true}
                          onUpdateFraming={(updatedFraming: FramingConfig) => {
                            const updated = { ...activeClipState, framing: updatedFraming };
                            setActiveClipState(updated);
                            onUpdateClip?.(updated);
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Clip Length & Duration Selector - Defaults to FULL */}
                <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-200">
                      Clip Export Duration
                    </span>
                    <span className="text-[10px] text-emerald-400 font-medium">⚡ No Truncation</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        id: 'full',
                        title: `Full (${fullClipDuration}s)`,
                        sub: 'Complete scene without cutoff',
                        badge: 'Default / Full'
                      },
                      {
                        id: '30',
                        title: '30s Standard',
                        sub: 'Reels / Shorts cut',
                        badge: 'Shorts'
                      },
                      {
                        id: '15',
                        title: '15s Viral Cut',
                        sub: 'Fast viral teaser',
                        badge: 'Fast'
                      }
                    ].map((item) => {
                      const isSel = durationMode === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setDurationMode(item.id as any)}
                          className={`p-2 rounded-lg border text-left transition-all relative ${
                            isSel
                              ? 'border-rose-600 bg-neutral-800/90 text-white shadow-sm'
                              : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`text-[11px] font-bold ${isSel ? 'text-white' : 'text-neutral-300'}`}>
                              {item.title}
                            </span>
                            <span className={`text-[7px] px-1 py-0.2 rounded border ${
                              isSel 
                                ? 'bg-rose-600/30 text-rose-300 border-rose-500/40' 
                                : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                            }`}>
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-[9px] text-neutral-400 leading-tight">{item.sub}</p>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-neutral-400">
                    Exporting <span className="text-white font-mono font-bold">{currentExportDurationSeconds} seconds</span> with hardware-synced 60 FPS video & audio.
                  </p>
                </div>
              </div>

              {/* Right Column (5 cols): Format & Resolution + Framerate & Bitrate + Spec Summary */}
              <div className="lg:col-span-5 space-y-3">
                {/* Resolution Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-300 block">
                    Format & Resolution
                  </label>
                  <div className="space-y-1.5">
                    {resolutions.map((r) => {
                      const isSelected = resolution === r.id;
                      return (
                        <div
                          key={r.id}
                          onClick={() => setResolution(r.id as any)}
                          className={`cursor-pointer p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-rose-600 bg-neutral-800/90'
                              : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs ${
                              isSelected ? 'bg-rose-600 text-white' : 'bg-neutral-800 text-neutral-400'
                            }`}>
                              <FileVideo className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-white">{r.name}</span>
                                <span className="text-[8px] px-1 py-0.2 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                                  {r.tag}
                                </span>
                              </div>
                              <p className="text-[9px] text-neutral-400">{r.desc}</p>
                            </div>
                          </div>

                          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-rose-600 text-white' : 'border border-neutral-700'
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[2.5]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Framerate & Bitrate Controls */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-neutral-950 border border-neutral-800 p-2.5 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-neutral-300">
                        Framerate
                      </span>
                      <span className="text-[8px] text-emerald-400 font-medium">Synced</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {[60, 30].map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFps(f as any)}
                          className={`py-1 rounded-md text-[11px] font-medium transition-colors ${
                            fps === f ? 'bg-rose-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {f} FPS
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-neutral-950 border border-neutral-800 p-2.5 rounded-xl">
                    <span className="text-[10px] font-medium text-neutral-300 block mb-1">
                      Bitrate Quality
                    </span>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { id: 'high_master', label: 'High' },
                        { id: 'standard', label: 'Standard' }
                      ].map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setBitrate(b.id as any)}
                          className={`py-1 rounded-md text-[11px] font-medium transition-colors ${
                            bitrate === b.id ? 'bg-rose-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Export Spec Summary Card */}
                <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800/80 text-[11px] space-y-1.5 text-neutral-300">
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                    Render Specification
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Output:</span>
                    <span className="font-mono text-white font-medium">{resolution} • {fps} FPS</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Duration:</span>
                    <span className="font-mono text-emerald-400 font-medium">{currentExportDurationSeconds}s (Complete)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Audio Sync:</span>
                    <span className="text-neutral-200">Balanced Master Bus</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">Tracking:</span>
                    <span className="text-rose-400 font-mono">
                      {activeClipState.framing?.panningTrajectory?.length || 0} Keyframe Points
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Export Progress Bar (visible while actively rendering) */}
            {isExporting && (
              <div className="p-3 rounded-xl bg-neutral-950 border border-rose-500/30 space-y-1.5 shadow-lg">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-200 font-medium truncate pr-2 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    {currentStep}
                  </span>
                  <span className="font-mono text-rose-400 font-bold">{exportProgress}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-rose-600 transition-all duration-200"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fixed Footer */}
        {!downloadReady && (
          <div className="px-4 py-2.5 sm:px-5 sm:py-3 border-t border-neutral-800 bg-neutral-900/95 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
              <HardDrive className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Hardware-accelerated render & instant download</span>
              <span className="sm:hidden">Hardware render</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isExporting}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-export"
                type="button"
                onClick={handleStartExport}
                disabled={isExporting}
                className="px-5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2 transition-all shadow-md hover:shadow-rose-900/20 disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Rendering ({exportProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>{isBatchMode ? `Export ${allClips.length} Clips` : `Export (${currentExportDurationSeconds}s)`}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
