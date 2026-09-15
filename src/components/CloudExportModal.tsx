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
  const [durationMode, setDurationMode] = useState<'15' | '30' | 'full'>('15');

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
      desc: 'Silky smooth 60 FPS hardware-synced lightweight export',
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
      ? Math.min(15, clip.duration || 15)
      : durationMode === '30'
        ? Math.min(30, clip.duration || 30)
        : undefined;

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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full p-6 text-neutral-100 shadow-xl overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-rose-500">
              <FileVideo className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {isBatchMode ? 'Batch Export Clips' : 'Export Video Clip'}
              </h2>
              <p className="text-xs text-neutral-400">
                {isBatchMode 
                  ? `Rendering ${isPremium ? allClips.length : Math.min(5, allClips.length)} clips to ZIP`
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
          <div className="mt-4 p-3 bg-red-950/40 border border-red-800 rounded-lg flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{exportError}</span>
          </div>
        )}

        {/* Finished / Ready State */}
        {downloadReady && downloadUrl ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">
                Export Ready
              </h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
                Your video file has been generated and your download should start automatically.
              </p>
            </div>

            {!isBatchMode && downloadUrl && (
              <div className="flex justify-center my-2">
                <video
                  src={downloadUrl}
                  controls
                  playsInline
                  autoPlay
                  loop
                  muted
                  className="h-48 rounded-xl border border-neutral-800 bg-black aspect-[9/16] shadow-md"
                />
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 max-w-md mx-auto text-left text-xs space-y-2">
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
                <span>Framing:</span>
                <span className="font-medium text-neutral-200">
                  {clip.framing.mode === 'fit_blur' ? '16:9 Fit with Blurred Background' : '9:16 Vertical Pan'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <a
                href={downloadUrl}
                download={downloadFilename}
                className="px-5 py-2.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2 transition-colors"
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
          <div className="mt-4 space-y-4">
            {/* Options Row: Batch Mode & Subtitles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Batch Export */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-neutral-400" />
                  <div>
                    <p className="text-xs font-semibold text-white">Batch Export (ZIP)</p>
                    <p className="text-[10px] text-neutral-400">
                      {isPremium 
                        ? `Export all ${allClips.length} clips in one archive`
                        : `Export up to ${Math.min(5, allClips.length)} free clips`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBatchMode(!isBatchMode)}
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                    isBatchMode ? 'bg-rose-600' : 'bg-neutral-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      isBatchMode ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Subtitles */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Subtitles className="w-4 h-4 text-neutral-400" />
                  <div>
                    <p className="text-xs font-semibold text-white">Burn-in Subtitles</p>
                    <p className="text-[10px] text-neutral-400">
                      {burnInSubtitles ? 'Subtitles rendered into video' : 'Export clean video without text'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBurnInSubtitles(!burnInSubtitles)}
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                    burnInSubtitles ? 'bg-rose-600' : 'bg-neutral-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      burnInSubtitles ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Live Crop & Manual Tracking Studio for Single Clip Export */}
            {!isBatchMode && (
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowLiveCrop(!showLiveCrop)}
                  className="w-full p-3 flex items-center justify-between hover:bg-neutral-900/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-400">
                      <Crop className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">Live Crop & Manual Tracking</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-rose-600 text-white shadow">
                          Interactive
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400">
                        Drag the 9:16 crop window or record custom pan tracking to bake into export
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-neutral-400 hidden sm:inline">
                      {activeClipState.framing?.panningTrajectory?.length || 0} Keyframe Points
                    </span>
                    {showLiveCrop ? (
                      <ChevronUp className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                </button>

                {showLiveCrop && (
                  <div className="p-3 pt-0 border-t border-neutral-900 space-y-2">
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

            {/* Clip Length & Fast Export Speed Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-neutral-300">
                  Clip Length & Speed
                </label>
                <span className="text-[10px] text-emerald-400 font-medium">⚡ Fast Render</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: '15',
                    title: '15s Viral Cut',
                    sub: 'Fastest (~15s) • TikTok & Shorts',
                    badge: 'Fast'
                  },
                  {
                    id: '30',
                    title: '30s Standard',
                    sub: 'Balanced (~30s) • Reels cut',
                    badge: 'Recommended'
                  },
                  {
                    id: 'full',
                    title: `Full (${Math.round(clip.duration || 60)}s)`,
                    sub: 'Full scene segment',
                    badge: 'Complete'
                  }
                ].map((item) => {
                  const isSel = durationMode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setDurationMode(item.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition-all relative ${
                        isSel
                          ? 'border-rose-600 bg-neutral-800/80 text-white'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isSel ? 'text-white' : 'text-neutral-300'}`}>
                          {item.title}
                        </span>
                        <span className={`text-[8px] px-1 py-0.2 rounded border ${
                          isSel 
                            ? 'bg-rose-600/30 text-rose-300 border-rose-500/40' 
                            : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                        }`}>
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-1 leading-tight">{item.sub}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resolution Selection */}
            <div>
              <label className="text-xs font-medium text-neutral-300 mb-2 block">
                Format & Resolution
              </label>
              <div className="space-y-2">
                {resolutions.map((r) => {
                  const isSelected = resolution === r.id;
                  return (
                    <div
                      key={r.id}
                      onClick={() => setResolution(r.id as any)}
                      className={`cursor-pointer p-3 rounded-xl border transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'border-rose-600 bg-neutral-800/80'
                          : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                          isSelected ? 'bg-rose-600 text-white' : 'bg-neutral-800 text-neutral-400'
                        }`}>
                          <FileVideo className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-white">{r.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                              {r.tag}
                            </span>
                          </div>
                          <p className="text-[10px] text-neutral-400 mt-0.5">{r.desc}</p>
                        </div>
                      </div>

                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-rose-600 text-white' : 'border border-neutral-700'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Framerate Controls */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-neutral-300">
                    Framerate
                  </span>
                  <span className="text-[9px] text-emerald-400 font-medium">Hardware Synced</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[60, 30].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFps(f as any)}
                      className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        fps === f ? 'bg-rose-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {f} FPS
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl">
                <span className="text-[11px] font-medium text-neutral-300 block mb-1.5">
                  Bitrate Quality
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'high_master', label: 'High' },
                    { id: 'standard', label: 'Standard' }
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBitrate(b.id as any)}
                      className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        bitrate === b.id ? 'bg-rose-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Export Progress Bar */}
            {isExporting && (
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-medium truncate pr-2">
                    {currentStep}
                  </span>
                  <span className="font-mono text-neutral-400">{exportProgress}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-rose-600 transition-all duration-200"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Direct in-browser render & download</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-export"
                  type="button"
                  onClick={handleStartExport}
                  disabled={isExporting}
                  className="px-5 py-2 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Exporting ({exportProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>{isBatchMode ? `Export ${allClips.length} Clips` : 'Export Clip'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
