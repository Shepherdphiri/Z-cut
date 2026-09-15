import React from 'react';
import { 
  Scan, 
  UserCheck, 
  SplitSquareVertical, 
  Crosshair, 
  Maximize2, 
  Layers, 
  Check, 
  Sliders,
  ShieldCheck,
  Sparkles,
  Radio
} from 'lucide-react';
import { FramingConfig, FramingMode, VideoClip } from '../types';
import { LiveCropTracker } from './LiveCropTracker';

interface SmartFramingInspectorProps {
  framing: FramingConfig;
  onChangeFraming: (updated: FramingConfig) => void;
  manualPanOffset: number;
  onManualPanChange: (val: number) => void;
  videoSrc: string;
  movieThumbnail: string;
  currentPlayTime?: number;
  clip?: VideoClip;
}

export const SmartFramingInspector: React.FC<SmartFramingInspectorProps> = ({
  framing,
  onChangeFraming,
  manualPanOffset,
  onManualPanChange,
  videoSrc,
  movieThumbnail,
  currentPlayTime = 0,
  clip
}) => {
  const inspectorVideoRef = React.useRef<HTMLVideoElement>(null);
  const [videoPlayFailed, setVideoPlayFailed] = React.useState(false);

  // Fallback clip structure if clip prop isn't passed
  const activeClip: VideoClip = clip || {
    id: 'active_clip',
    title: 'Current Scene',
    hookText: 'Movie scene',
    startTime: 0,
    endTime: 60,
    duration: 60,
    viralScore: 95,
    viralReason: 'High visual dynamic',
    framing,
    dialogue: [],
    socialCaption: '',
    hashtags: [],
    recommendedAudioVibe: 'Cinematic'
  };

  // Sync inspection video time when currentPlayTime changes
  React.useEffect(() => {
    if (inspectorVideoRef.current && !isNaN(currentPlayTime)) {
      // Only seek if difference is noticeable to avoid stutter
      if (Math.abs(inspectorVideoRef.current.currentTime - currentPlayTime) > 0.6) {
        inspectorVideoRef.current.currentTime = currentPlayTime;
      }
    }
  }, [currentPlayTime]);
  const modes: { id: FramingMode; label: string; desc: string; icon: any }[] = [
    {
      id: 'speaker_tracking',
      label: 'Speaker Centering & Pan',
      desc: 'Dynamically pans 9:16 crop window to follow whoever is speaking',
      icon: UserCheck
    },
    {
      id: 'dual_split',
      label: 'Dual Split-Screen',
      desc: 'Stacks two speakers vertically (top: protagonist, bottom: reaction)',
      icon: SplitSquareVertical
    },
    {
      id: 'center_lock',
      label: 'Dynamic Center Lock',
      desc: 'Locks strictly to center with action dynamic zoom',
      icon: Crosshair
    },
    {
      id: 'fit_blur',
      label: 'Fit with Blurred Fill',
      desc: 'Fits widescreen 16:9 movie with ambient blurred mirror background',
      icon: Layers
    }
  ];

  const handleModeSelect = (mode: FramingMode) => {
    onChangeFraming({
      ...framing,
      mode
    });
  };

  const handleZoomChange = (val: number) => {
    onChangeFraming({
      ...framing,
      zoomFactor: val
    });
  };

  return (
    <div className="bg-neutral-900/95 border border-neutral-800 rounded-2xl p-3 text-white">
      {/* Title */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-neutral-800 text-rose-400 border border-neutral-700">
            <Scan className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm font-['Outfit']">Auto-Crop & Subject Centering</h3>
            <p className="text-[10px] text-neutral-400">
              Converts 16:9 movie frames into 9:16 vertical without cutting out actors.
            </p>
          </div>
        </div>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 flex items-center gap-1">
          <Check className="w-2.5 h-2.5 text-emerald-400" />
          Active Trajectory
        </span>
      </div>

      {/* Mode Selection Grid - 4 Columns on desktop for ultra-compact vertical height */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 mb-2.5">
        {modes.map((m) => {
          const isSelected = framing.mode === m.id;
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              onClick={() => handleModeSelect(m.id)}
              className={`cursor-pointer p-2 rounded-xl border transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-rose-500 bg-rose-950/25 ring-1 ring-rose-500/50'
                  : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    isSelected ? 'bg-rose-600 text-white' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                {isSelected && <Check className="w-3 h-3 text-rose-400 stroke-[3]" />}
              </div>
              <div>
                <h4 className="font-bold text-[11px] text-white font-['Outfit'] truncate">{m.label}</h4>
                <p className="text-[9px] text-neutral-400 line-clamp-1 mt-0.5 leading-tight">{m.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Crop / Fit Monitor & Live Drag-to-Crop Tracker */}
      <div className="mb-2.5 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white flex items-center gap-1 text-[11px]">
              <Radio className="w-3 h-3 text-rose-500 animate-pulse" />
              <span>{framing.mode === 'fit_blur' ? '16:9 Full Frame with Ambient Blur' : 'Live Crop & Manual Tracking'}</span>
            </span>
          </div>
          {framing.mode !== 'fit_blur' && (
            <span className="text-[9px] font-mono font-bold text-rose-400 bg-rose-950/40 border border-rose-500/30 px-1.5 py-0.5 rounded-full">
              Drag box or record live
            </span>
          )}
        </div>

        {framing.mode === 'fit_blur' ? (
          /* 9:16 Simulator showing full 16:9 movie fitted with ambient blurred mirrors */
          <div className="relative aspect-[9/16] h-44 mx-auto rounded-xl overflow-hidden border border-neutral-700 bg-black flex items-center justify-center shadow-xl">
            {/* Ambient blurred wings */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {videoSrc && !videoPlayFailed ? (
                <video
                  src={videoSrc}
                  playsInline
                  muted
                  loop
                  autoPlay
                  className="w-full h-full object-cover blur-xl scale-125 opacity-70"
                />
              ) : movieThumbnail ? (
                <img
                  src={movieThumbnail}
                  alt="Ambient"
                  className="w-full h-full object-cover blur-xl scale-125 opacity-70"
                />
              ) : (
                <div className="w-full h-full bg-neutral-900 blur-xl" />
              )}
              <div className="absolute inset-0 bg-black/25" />
            </div>

            {/* Widescreen 16:9 movie fitted horizontally */}
            <div className="w-full aspect-video relative z-10 bg-black border-y border-white/20 shadow-2xl flex items-center justify-center">
              {videoSrc && !videoPlayFailed ? (
                <video
                  ref={inspectorVideoRef}
                  src={videoSrc}
                  playsInline
                  muted
                  loop
                  autoPlay
                  onError={() => setVideoPlayFailed(true)}
                  className="w-full h-full object-contain"
                />
              ) : movieThumbnail ? (
                <img
                  src={movieThumbnail}
                  alt="Source Frame"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-[10px] text-neutral-400">16:9 Movie Fitted</span>
              )}
              <div className="absolute top-1 right-1 text-[8px] font-black px-1.5 py-0.5 rounded bg-black/70 text-amber-300">
                16:9 FIT
              </div>
            </div>

            <div className="absolute bottom-2 left-2 right-2 text-[8px] text-center font-bold text-amber-200 bg-black/80 py-0.5 px-1.5 rounded-md backdrop-blur border border-amber-500/20 z-20">
              16:9 Full Frame • Zero Cropping • Blurred Mirror Fill
            </div>
          </div>
        ) : (
          /* Live Interactive Draggable 9:16 Crop Boundary with Real-Time Manual Tracking Recorder */
          <LiveCropTracker
            clip={activeClip}
            videoSrc={videoSrc}
            movieThumbnail={movieThumbnail}
            onUpdateFraming={onChangeFraming}
            currentPlayTime={currentPlayTime}
            onManualPanChange={onManualPanChange}
          />
        )}
      </div>

      {/* Face Tracking & Frame Boundary Controls */}
      <div className="mb-2.5 bg-neutral-950 border border-neutral-800 p-2.5 rounded-xl">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-300 flex items-center justify-center border border-neutral-700">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <h5 className="font-semibold text-xs text-white flex items-center gap-1.5">
                <span>Face Tracking Auto-Center</span>
                <span className={`text-[8px] px-1.5 py-0.2 rounded border font-medium ${
                  framing.faceTrackingEnabled !== false 
                    ? 'bg-neutral-800 text-neutral-200 border-neutral-700' 
                    : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                }`}>
                  {framing.faceTrackingEnabled !== false ? 'Enabled' : 'Disabled'}
                </span>
              </h5>
              <p className="text-[9px] text-neutral-400">
                Detects subjects across widescreen frames and steers vertical framing
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onChangeFraming({
                ...framing,
                faceTrackingEnabled: framing.faceTrackingEnabled === false ? true : false
              });
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              framing.faceTrackingEnabled !== false
                ? 'bg-neutral-700 hover:bg-neutral-600 text-white'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border border-neutral-700'
            }`}
          >
            <span>{framing.faceTrackingEnabled !== false ? 'Turn Off' : 'Turn On'}</span>
          </button>
        </div>
      </div>

      {/* Manual Fine-Tuning Sliders - Touch Friendly */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Manual Pan Offset */}
        <div className="bg-neutral-950/70 border border-neutral-800 p-2 rounded-xl">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="font-semibold text-neutral-300 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-neutral-400" />
              <span>Horizontal Pan</span>
            </span>
            <span className="font-mono text-rose-400 font-bold text-[10px]">
              {manualPanOffset.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="-0.8"
            max="0.8"
            step="0.05"
            value={manualPanOffset}
            onChange={(e) => onManualPanChange(parseFloat(e.target.value))}
            className="w-full accent-rose-500 h-1.5 bg-neutral-900 rounded-lg cursor-pointer py-1"
          />
          <div className="flex justify-between text-[9px] text-neutral-500 mt-0.5">
            <span>Left Actor</span>
            <span>Center (0.0)</span>
            <span>Right Actor</span>
          </div>
        </div>

        {/* Zoom Factor */}
        <div className="bg-neutral-950/70 border border-neutral-800 p-2 rounded-xl">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="font-semibold text-neutral-300 flex items-center gap-1">
              <Maximize2 className="w-3 h-3 text-neutral-400" />
              <span>Crop Fill Scale</span>
            </span>
            <span className="font-mono text-rose-400 font-bold text-[10px]">
              {framing.zoomFactor.toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min="1.0"
            max="1.4"
            step="0.02"
            value={framing.zoomFactor}
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            className="w-full accent-rose-500 h-1.5 bg-neutral-900 rounded-lg cursor-pointer py-1"
          />
          <div className="flex justify-between text-[9px] text-neutral-500 mt-0.5">
            <span>Standard (1.0x)</span>
            <span>Optimal (1.15x)</span>
            <span>Tight (1.4x)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
