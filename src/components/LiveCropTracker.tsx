import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Radio, 
  Sliders, 
  Check, 
  Trash2, 
  MoveHorizontal, 
  Maximize2,
  Sparkles,
  MapPin,
  Film
} from 'lucide-react';
import { VideoClip, FramingConfig, FramingKeyframe } from '../types';

interface LiveCropTrackerProps {
  clip: VideoClip;
  videoSrc: string;
  movieThumbnail?: string;
  onUpdateFraming: (updatedFraming: FramingConfig) => void;
  currentPlayTime?: number;
  onManualPanChange?: (pan: number) => void;
  compact?: boolean;
}

/**
 * Calculates smooth cosine easing pan for any time offset
 */
function interpolatePan(trajectory: FramingKeyframe[], timeOffset: number): number {
  if (!trajectory || trajectory.length === 0) return 0;
  if (trajectory.length === 1) return trajectory[0].panX;

  if (timeOffset <= trajectory[0].timeOffset) return trajectory[0].panX;
  if (timeOffset >= trajectory[trajectory.length - 1].timeOffset) {
    return trajectory[trajectory.length - 1].panX;
  }

  for (let i = 0; i < trajectory.length - 1; i++) {
    const p1 = trajectory[i];
    const p2 = trajectory[i + 1];
    if (timeOffset >= p1.timeOffset && timeOffset <= p2.timeOffset) {
      const span = p2.timeOffset - p1.timeOffset;
      const progress = span > 0 ? (timeOffset - p1.timeOffset) / span : 0;
      const ease = 0.5 - Math.cos(progress * Math.PI) / 2;
      return p1.panX + (p2.panX - p1.panX) * ease;
    }
  }

  return 0;
}

export const LiveCropTracker: React.FC<LiveCropTrackerProps> = ({
  clip,
  videoSrc,
  movieThumbnail,
  onUpdateFraming,
  currentPlayTime,
  onManualPanChange,
  compact = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const duration = clip.duration || 60;
  const startTime = clip.startTime || 0;
  const endTime = clip.endTime || startTime + duration;

  // Keyframes state
  const [keyframes, setKeyframes] = useState<FramingKeyframe[]>(() => {
    return clip.framing?.panningTrajectory && clip.framing.panningTrajectory.length > 0
      ? [...clip.framing.panningTrajectory]
      : [
          { timeOffset: 0, panX: 0 },
          { timeOffset: duration, panX: 0 }
        ];
  });

  // Current local clip playback time (0 to duration)
  const [localTime, setLocalTime] = useState<number>(0);
  const [currentPan, setCurrentPan] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [videoLoadError, setVideoLoadError] = useState<boolean>(false);

  // Sync keyframes if clip changes
  useEffect(() => {
    if (clip.framing?.panningTrajectory && clip.framing.panningTrajectory.length > 0) {
      setKeyframes([...clip.framing.panningTrajectory]);
    }
  }, [clip.id, clip.framing?.panningTrajectory]);

  // Sync video time when currentPlayTime prop arrives (if not playing internally)
  useEffect(() => {
    if (!isPlaying && !isRecording && currentPlayTime !== undefined && videoRef.current) {
      const relTime = Math.max(0, Math.min(duration, currentPlayTime - startTime));
      if (Math.abs(videoRef.current.currentTime - (startTime + relTime)) > 0.4) {
        videoRef.current.currentTime = startTime + relTime;
        setLocalTime(relTime);
        const pan = interpolatePan(keyframes, relTime);
        setCurrentPan(pan);
      }
    }
  }, [currentPlayTime, startTime, duration, isPlaying, isRecording, keyframes]);

  // Keep currentPan synced to trajectory when not dragging
  useEffect(() => {
    if (!isDragging) {
      const pan = interpolatePan(keyframes, localTime);
      setCurrentPan(pan);
      onManualPanChange?.(pan);
    }
  }, [localTime, keyframes, isDragging, onManualPanChange]);

  // Save keyframes to parent framing config
  const commitKeyframes = useCallback((newKeyframes: FramingKeyframe[]) => {
    // Sort chronologically and deduplicate
    const sorted = [...newKeyframes].sort((a, b) => a.timeOffset - b.timeOffset);
    const cleaned: FramingKeyframe[] = [];
    for (const k of sorted) {
      if (cleaned.length === 0) {
        cleaned.push(k);
      } else {
        const last = cleaned[cleaned.length - 1];
        if (Math.abs(k.timeOffset - last.timeOffset) < 0.15) {
          // Replace close keyframe
          cleaned[cleaned.length - 1] = k;
        } else {
          cleaned.push(k);
        }
      }
    }

    // Ensure boundary points exist
    if (cleaned.length === 0 || cleaned[0].timeOffset > 0) {
      cleaned.unshift({ timeOffset: 0, panX: cleaned[0]?.panX || 0 });
    }
    if (cleaned[cleaned.length - 1].timeOffset < duration) {
      cleaned.push({ timeOffset: duration, panX: cleaned[cleaned.length - 1].panX });
    }

    setKeyframes(cleaned);
    onUpdateFraming({
      ...clip.framing,
      mode: 'speaker_tracking',
      panningTrajectory: cleaned
    });
  }, [clip.framing, duration, onUpdateFraming]);

  // Video timeupdate loop
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const vTime = videoRef.current.currentTime;
    const rel = vTime - startTime;

    if (rel >= duration || vTime >= endTime) {
      if (isRecording) {
        // Automatically stop recording at clip end
        stopRecording();
      } else if (isPlaying) {
        // Loop playback
        videoRef.current.currentTime = startTime;
        setLocalTime(0);
      }
      return;
    }

    if (rel >= 0) {
      setLocalTime(rel);

      // If recording, continuously stamp keyframes with current dragged/held pan
      if (isRecording) {
        setKeyframes(prev => {
          const updated = [...prev];
          const existingIdx = updated.findIndex(k => Math.abs(k.timeOffset - rel) < 0.12);
          if (existingIdx !== -1) {
            updated[existingIdx] = { timeOffset: Number(rel.toFixed(2)), panX: Number(currentPan.toFixed(2)) };
          } else {
            updated.push({ timeOffset: Number(rel.toFixed(2)), panX: Number(currentPan.toFixed(2)) });
          }
          return updated.sort((a, b) => a.timeOffset - b.timeOffset);
        });
      }
    }
  };

  // Drag-and-drop calculation for the 9:16 crop window
  const updatePanFromClientX = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;

    // Relative X inside 16:9 container from 0.0 to 1.0
    const relX = (clientX - rect.left) / rect.width;

    // Center is 0.5. Normalize to pan range [-0.85, +0.85]
    // 9:16 aspect ratio in 16:9 box covers ~31.6% width, so max excursion from center is ~34.2%
    const normalized = (relX - 0.5) / 0.35;
    const clamped = Math.max(-0.85, Math.min(0.85, normalized));

    setCurrentPan(clamped);
    onManualPanChange?.(clamped);

    // If recording, capture keyframe in real time
    if (isRecording) {
      setKeyframes(prev => {
        const updated = [...prev];
        const existingIdx = updated.findIndex(k => Math.abs(k.timeOffset - localTime) < 0.12);
        if (existingIdx !== -1) {
          updated[existingIdx] = { timeOffset: Number(localTime.toFixed(2)), panX: Number(clamped.toFixed(2)) };
        } else {
          updated.push({ timeOffset: Number(localTime.toFixed(2)), panX: Number(clamped.toFixed(2)) });
        }
        return updated.sort((a, b) => a.timeOffset - b.timeOffset);
      });
    }
  }, [localTime, isRecording, onManualPanChange]);

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    updatePanFromClientX(clientX);

    const handlePointerMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      updatePanFromClientX(currentX);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);
  };

  // Playback & Record Controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime >= endTime || videoRef.current.currentTime < startTime) {
        videoRef.current.currentTime = startTime;
      }
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const startRecording = () => {
    if (!videoRef.current) return;
    setIsRecording(true);
    setIsPlaying(true);
    // Start recording from current position or rewind if at end
    if (videoRef.current.currentTime >= endTime - 1) {
      videoRef.current.currentTime = startTime;
      setLocalTime(0);
    }
    videoRef.current.play().catch(() => {});
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsPlaying(false);
    commitKeyframes(keyframes);
  };

  const resetToStart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = startTime;
    setLocalTime(0);
    const pan = interpolatePan(keyframes, 0);
    setCurrentPan(pan);
    onManualPanChange?.(pan);
  };

  const handleSeek = (newLocalTime: number) => {
    const clamped = Math.max(0, Math.min(duration, newLocalTime));
    setLocalTime(clamped);
    if (videoRef.current) {
      videoRef.current.currentTime = startTime + clamped;
    }
    const pan = interpolatePan(keyframes, clamped);
    setCurrentPan(pan);
    onManualPanChange?.(pan);
  };

  const stampKeyframeAtCurrentTime = () => {
    const updated = [...keyframes];
    const existingIdx = updated.findIndex(k => Math.abs(k.timeOffset - localTime) < 0.2);
    if (existingIdx !== -1) {
      updated[existingIdx] = { timeOffset: Number(localTime.toFixed(2)), panX: Number(currentPan.toFixed(2)) };
    } else {
      updated.push({ timeOffset: Number(localTime.toFixed(2)), panX: Number(currentPan.toFixed(2)) });
    }
    commitKeyframes(updated);
  };

  const clearRecordedPath = () => {
    const defaultTrajectory = [
      { timeOffset: 0, panX: 0 },
      { timeOffset: duration, panX: 0 }
    ];
    setKeyframes(defaultTrajectory);
    setCurrentPan(0);
    onManualPanChange?.(0);
    commitKeyframes(defaultTrajectory);
  };

  // Convert panX [-0.85, 0.85] to CSS percentage left (center is 50%)
  const cropLeftPercent = 50 + currentPan * 32;

  return (
    <div className="w-full space-y-2">
      {/* 16:9 Cinema Canvas with Draggable 9:16 Crop Boundary */}
      <div className="relative">
        <div 
          ref={containerRef}
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          className={`relative aspect-video w-full max-h-[155px] sm:max-h-[170px] max-w-[420px] mx-auto rounded-xl overflow-hidden border-2 bg-neutral-950 select-none cursor-grab active:cursor-grabbing transition-colors ${
            isRecording 
              ? 'border-rose-500 shadow-[0_0_24px_rgba(244,63,94,0.4)]' 
              : 'border-neutral-800 hover:border-neutral-700'
          }`}
        >
          {/* Underlying Video */}
          {videoSrc && !videoLoadError ? (
            <video
              ref={videoRef}
              src={videoSrc}
              playsInline
              muted
              onTimeUpdate={handleTimeUpdate}
              onError={() => setVideoLoadError(true)}
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : movieThumbnail ? (
            <img
              src={movieThumbnail}
              alt="Source Frame"
              className="w-full h-full object-cover opacity-80 pointer-events-none"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500 text-xs gap-1">
              <Film className="w-6 h-6 text-neutral-600" />
              <span>16:9 Movie Frame</span>
            </div>
          )}

          {/* Dimmed Letterbox areas on Left & Right */}
          <div 
            className="absolute top-0 bottom-0 left-0 bg-black/60 pointer-events-none backdrop-blur-[1px] transition-all duration-75"
            style={{ width: `calc(${cropLeftPercent}% - (100% * 9 / 32))` }}
          />
          <div 
            className="absolute top-0 bottom-0 right-0 bg-black/60 pointer-events-none backdrop-blur-[1px] transition-all duration-75"
            style={{ left: `calc(${cropLeftPercent}% + (100% * 9 / 32))` }}
          />

          {/* The Draggable 9:16 Crop Boundary Window */}
          <div
            className={`absolute top-0 bottom-0 aspect-[9/16] border-2 shadow-2xl flex flex-col justify-between p-1 transition-all duration-75 ${
              isRecording
                ? 'border-rose-400 bg-rose-500/20 ring-2 ring-rose-500/40 shadow-rose-950/80'
                : 'border-rose-500 bg-rose-500/10 hover:border-rose-400'
            }`}
            style={{
              left: `${cropLeftPercent}%`,
              transform: 'translateX(-50%)'
            }}
          >
            {/* Top Crop Badge */}
            <div className="flex justify-between items-center text-[8px] font-extrabold text-white">
              <span className="bg-black/80 px-1 py-0.2 rounded backdrop-blur border border-white/20">
                9:16
              </span>
              <span className={`px-1 py-0.2 rounded font-black flex items-center gap-1 ${
                isRecording 
                  ? 'bg-rose-600 animate-pulse text-white shadow' 
                  : 'bg-rose-600/90 text-white'
              }`}>
                {isRecording ? (
                  <>
                    <span className="w-1 h-1 rounded-full bg-white animate-ping" />
                    <span>REC</span>
                  </>
                ) : (
                  <span>LIVE</span>
                )}
              </span>
            </div>

            {/* Center Grab Handle & Target Crosshair */}
            <div className="w-full flex flex-col items-center justify-center">
              <div className="px-1.5 py-0.5 rounded-full bg-black/80 backdrop-blur border border-rose-500/60 shadow text-rose-300 flex items-center gap-1 text-[9px] font-bold">
                <MoveHorizontal className="w-2.5 h-2.5 text-rose-400" />
                <span>DRAG</span>
              </div>
            </div>

            {/* Bottom Coordinate & Time Stamp */}
            <div className="flex items-center justify-between text-[8px] font-mono font-bold bg-black/80 px-1 py-0.2 rounded text-neutral-200 backdrop-blur border border-white/10">
              <span>{currentPan >= 0 ? `+${(currentPan * 100).toFixed(0)}%` : `${(currentPan * 100).toFixed(0)}%`}</span>
              <span className="text-rose-400">{localTime.toFixed(1)}s</span>
            </div>
          </div>
        </div>

        {/* Floating helper note */}
        <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1 px-1">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <strong className="text-neutral-300">Drag Box:</strong> Steer vertical framing live
          </span>
          <span className="font-mono text-neutral-400 text-[9px]">
            {keyframes.length} Keyframe{keyframes.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Primary Action Controls Bar */}
      <div className="p-2 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1.5">
        <div className="flex items-center justify-between flex-wrap gap-1.5">
          {/* Playback & Record Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={togglePlay}
              disabled={isRecording}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white transition-colors disabled:opacity-50"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            </button>

            <button
              type="button"
              onClick={resetToStart}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              title="Rewind to Start"
            >
              <RotateCcw className="w-3 h-3" />
            </button>

            {/* Live Recording Button */}
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-md transition-all"
              >
                <Radio className="w-3 h-3 animate-pulse" />
                <span>Record Pan</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="px-2.5 py-1 rounded-lg bg-white text-rose-900 font-extrabold text-[11px] flex items-center gap-1 shadow animate-pulse transition-all"
              >
                <div className="w-2 h-2 rounded-sm bg-rose-600" />
                <span>Save Track</span>
              </button>
            )}
          </div>

          {/* Quick Actions: Stamp Keyframe & Clear */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={stampKeyframeAtCurrentTime}
              title="Pin keyframe at this moment"
              className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-medium flex items-center gap-1 transition-colors border border-neutral-700"
            >
              <MapPin className="w-2.5 h-2.5 text-amber-400" />
              <span>Pin Keyframe</span>
            </button>

            <button
              type="button"
              onClick={clearRecordedPath}
              title="Reset tracking to center"
              className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-500 hover:text-rose-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Interactive Timeline & Keyframe Scrubber */}
        <div className="space-y-0.5 pt-1 border-t border-neutral-800/80">
          <div className="flex items-center justify-between text-[9px] text-neutral-400 font-mono">
            <span>{localTime.toFixed(1)}s / {duration.toFixed(0)}s</span>
            <span className="text-neutral-500">Timeline Keyframes</span>
          </div>

          <div className="relative h-4 flex items-center">
            {/* Base timeline rail */}
            <div 
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickRel = (e.clientX - rect.left) / rect.width;
                handleSeek(clickRel * duration);
              }}
              className="w-full h-2 rounded-full bg-neutral-900 border border-neutral-800 cursor-pointer relative overflow-hidden"
            >
              {/* Progress bar */}
              <div 
                className="h-full bg-rose-600/80 transition-all duration-75"
                style={{ width: `${(localTime / duration) * 100}%` }}
              />
            </div>

            {/* Keyframe markers dots */}
            {keyframes.map((kf, idx) => {
              const left = (kf.timeOffset / duration) * 100;
              return (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSeek(kf.timeOffset);
                  }}
                  title={`Keyframe @ ${kf.timeOffset.toFixed(1)}s (Pan: ${(kf.panX * 100).toFixed(0)}%)`}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-amber-400 border border-black shadow cursor-pointer hover:scale-125 transition-transform z-10"
                  style={{ left: `${Math.max(2, Math.min(98, left))}%` }}
                />
              );
            })}

            {/* Current Playhead Handle */}
            <div 
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-rose-600 shadow-md pointer-events-none z-20"
              style={{ left: `${Math.max(1, Math.min(99, (localTime / duration) * 100))}%` }}
            />
          </div>
        </div>

        {/* Quick Position Presets */}
        {!compact && (
          <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-1 flex-wrap">
            <span className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wider">
              Quick Positions:
            </span>
            <div className="flex items-center gap-1">
              {[
                { label: 'Left Actor', pan: -0.45 },
                { label: 'Center (0.0)', pan: 0.0 },
                { label: 'Right Actor', pan: 0.45 }
              ].map((pos) => (
                <button
                  key={pos.label}
                  type="button"
                  onClick={() => {
                    setCurrentPan(pos.pan);
                    onManualPanChange?.(pos.pan);
                    stampKeyframeAtCurrentTime();
                  }}
                  className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-[10px] font-medium text-neutral-300 border border-neutral-800 transition-colors"
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
