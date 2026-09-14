import React from 'react';
import { 
  Scan, 
  UserCheck, 
  SplitSquareVertical, 
  Crosshair, 
  Maximize2, 
  Layers, 
  Check, 
  Sliders
} from 'lucide-react';
import { FramingConfig, FramingMode } from '../types';

interface SmartFramingInspectorProps {
  framing: FramingConfig;
  onChangeFraming: (updated: FramingConfig) => void;
  manualPanOffset: number;
  onManualPanChange: (val: number) => void;
  videoSrc: string;
  movieThumbnail: string;
  currentPlayTime?: number;
}

export const SmartFramingInspector: React.FC<SmartFramingInspectorProps> = ({
  framing,
  onChangeFraming,
  manualPanOffset,
  onManualPanChange,
  videoSrc,
  movieThumbnail,
  currentPlayTime = 0
}) => {
  const inspectorVideoRef = React.useRef<HTMLVideoElement>(null);
  const [videoPlayFailed, setVideoPlayFailed] = React.useState(false);

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
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-white">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-neutral-800 text-rose-400 border border-neutral-700">
            <Scan className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm font-['Outfit']">Auto-Crop & Subject Centering</h3>
            <p className="text-[11px] text-neutral-400">
              Converts 16:9 widescreen movie frames into 9:16 vertical without cutting out actors.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 flex items-center gap-1">
          <Check className="w-2.5 h-2.5 text-emerald-400" />
          Active Trajectory
        </span>
      </div>

      {/* Mode Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {modes.map((m) => {
          const isSelected = framing.mode === m.id;
          const Icon = m.icon;
          return (
            <div
              key={m.id}
              onClick={() => handleModeSelect(m.id)}
              className={`cursor-pointer p-3 rounded-xl border transition-all flex items-start gap-2.5 ${
                isSelected
                  ? 'border-rose-500 bg-rose-950/25 ring-1 ring-rose-500/50'
                  : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  isSelected ? 'bg-rose-600 text-white' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-white font-['Outfit']">{m.label}</h4>
                  {isSelected && <Check className="w-3.5 h-3.5 text-rose-400 stroke-[3]" />}
                </div>
                <p className="text-[10px] text-neutral-400 mt-0.5 leading-relaxed">{m.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Crop Monitor (16:9 Movie frame with 9:16 Active Crop Box) */}
      <div className="mb-4 bg-neutral-950 p-3 rounded-xl border border-neutral-800">
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
          <span className="font-semibold text-neutral-300">Widescreen 16:9 to 9:16 Crop Boundary</span>
          <span className="font-mono text-[10px]">
            Shift X: {manualPanOffset > 0 ? `+${(manualPanOffset * 100).toFixed(0)}%` : `${(manualPanOffset * 100).toFixed(0)}%`}
          </span>
        </div>

        {/* 16:9 Cinema Canvas Simulator with Real Local Movie */}
        <div className="relative aspect-[16/9] w-full max-w-md mx-auto rounded-lg overflow-hidden border border-neutral-800 bg-neutral-950 flex items-center justify-center">
          {videoSrc && !videoPlayFailed ? (
            <video
              ref={inspectorVideoRef}
              src={videoSrc}
              playsInline
              muted
              loop
              autoPlay
              onError={() => setVideoPlayFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : movieThumbnail ? (
            <img
              src={movieThumbnail}
              alt="Source Frame"
              className="w-full h-full object-cover opacity-80"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-neutral-500 text-xs gap-1">
              <span>Local Movie Canvas</span>
              <span className="text-[10px] text-neutral-600">Select or drop a local file</span>
            </div>
          )}

          {/* 9:16 Vertical Box representing the cropped region */}
          <div
            className="absolute top-0 bottom-0 aspect-[9/16] border-2 border-rose-500 bg-rose-500/15 shadow-[0_0_18px_rgba(244,63,94,0.35)] transition-all duration-150 flex flex-col justify-between p-1 pointer-events-none"
            style={{
              left: `${50 + manualPanOffset * 28}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="flex justify-between items-center text-[8px] font-bold text-white bg-rose-600/95 px-1 py-0.5 rounded shadow">
              <span>9:16 CROP</span>
              <span>LIVE</span>
            </div>

            <div className="w-full text-center">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mx-auto shadow ring-2 ring-white/40" />
            </div>

            <div className="text-[8px] font-mono text-center text-rose-200 bg-black/70 px-1 py-0.5 rounded backdrop-blur">
              {framing.mode === 'speaker_tracking' ? 'Speaker Tracking' : framing.mode === 'dual_split' ? 'Split Focus' : 'Center Lock'}
            </div>
          </div>
        </div>
      </div>

      {/* Manual Fine-Tuning Sliders - Touch Friendly */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Manual Pan Offset */}
        <div className="bg-neutral-950/70 border border-neutral-800 p-3 rounded-xl">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-neutral-300 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-neutral-400" />
              <span>Horizontal Pan Fine-Tune</span>
            </span>
            <span className="font-mono text-rose-400 font-bold">
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
            className="w-full accent-rose-500 h-2 bg-neutral-900 rounded-lg cursor-pointer py-1"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
            <span>Left Actor</span>
            <span>Center (0.0)</span>
            <span>Right Actor</span>
          </div>
        </div>

        {/* Zoom Factor */}
        <div className="bg-neutral-950/70 border border-neutral-800 p-3 rounded-xl">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-neutral-300 flex items-center gap-1">
              <Maximize2 className="w-3.5 h-3.5 text-neutral-400" />
              <span>Crop Fill Scale</span>
            </span>
            <span className="font-mono text-rose-400 font-bold">
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
            className="w-full accent-rose-500 h-2 bg-neutral-900 rounded-lg cursor-pointer py-1"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
            <span>Standard (1.0x)</span>
            <span>Optimal (1.15x)</span>
            <span>Tight (1.4x)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
