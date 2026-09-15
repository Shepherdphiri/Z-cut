import React, { useRef, useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Scan, 
  Flame, 
  Sliders,
  AudioWaveform,
  Subtitles,
  UserCheck,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  VideoClip, 
  CaptionStyle, 
  CaptionPosition, 
  TemplateConfig,
  AudioTrack
} from '../types';
import { audioSynth } from '../utils/audioSynth';
import { 
  detectFacesFromVideoFrame, 
  clampPanToSafeLimits, 
  calculateSafePanLimits,
  DetectedFace 
} from '../utils/faceTracker';

interface VerticalVideoPlayerProps {
  clip: VideoClip;
  videoSrc: string;
  subtitlesEnabled?: boolean;
  onToggleSubtitles?: (enabled: boolean) => void;
  captionStyle: CaptionStyle;
  captionPosition: CaptionPosition;
  captionFontSize: number;
  highlightColor: string;
  template: TemplateConfig;
  activeAudioTrack: AudioTrack | null;
  audioDuckingEnabled: boolean;
  speechVolume: number;
  musicVolume: number;
  manualPanOffset: number;
  onTimeUpdate?: (currentTime: number) => void;
  onOpenUploader?: () => void;
}

export const VerticalVideoPlayer: React.FC<VerticalVideoPlayerProps> = ({
  clip,
  videoSrc,
  subtitlesEnabled = false,
  onToggleSubtitles,
  captionStyle,
  captionPosition,
  captionFontSize,
  highlightColor,
  template,
  activeAudioTrack,
  audioDuckingEnabled,
  speechVolume,
  musicVolume,
  manualPanOffset,
  onTimeUpdate,
  onOpenUploader
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const speakerBVideoRef = useRef<HTMLVideoElement>(null);
  const bgVideoRef = useRef<HTMLVideoElement>(null);
  const lastScanRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(clip.duration || 30);
  const [isMuted, setIsMuted] = useState(false);
  const [isDuckingActive, setIsDuckingActive] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [localSubtitlesEnabled, setLocalSubtitlesEnabled] = useState(false);

  // Face Tracking and Anti-Blank Geometry State
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [smoothedFaceX, setSmoothedFaceX] = useState<number>(0);
  const [videoAspect, setVideoAspect] = useState<number>(16 / 9);

  const effectiveSubtitlesEnabled = subtitlesEnabled !== undefined ? subtitlesEnabled : localSubtitlesEnabled;

  const handleToggleSubtitles = () => {
    const next = !effectiveSubtitlesEnabled;
    if (onToggleSubtitles) {
      onToggleSubtitles(next);
    } else {
      setLocalSubtitlesEnabled(next);
    }
  };

  const handleVideoMetadata = () => {
    if (videoRef.current && videoRef.current.videoHeight > 0) {
      const aspect = videoRef.current.videoWidth / videoRef.current.videoHeight;
      if (!isNaN(aspect) && aspect > 0.3) {
        setVideoAspect(aspect);
      }
    }
  };

  // Sync with clip boundaries & reset errors on source change
  useEffect(() => {
    setHasVideoError(false);
    setVideoLoaded(false);
    setDetectedFaces([]);
    setSmoothedFaceX(0);

    const startPos = Math.max(0, clip.startTime);
    if (videoRef.current) {
      try {
        videoRef.current.currentTime = startPos;
        if (speakerBVideoRef.current) {
          speakerBVideoRef.current.currentTime = startPos;
        }
        if (bgVideoRef.current) {
          bgVideoRef.current.currentTime = startPos;
        }
      } catch (e) {
        console.warn('Seek error:', e);
      }
      setCurrentTime(0);
      setDuration(clip.duration);
    }
  }, [videoSrc, clip.id, clip.startTime, clip.duration]);

  // Handle active audio track and ducking
  useEffect(() => {
    if (isPlaying && activeAudioTrack) {
      audioSynth.playTrack(
        activeAudioTrack.audioTone, 
        musicVolume, 
        isDuckingActive && audioDuckingEnabled,
        activeAudioTrack.customAudioUrl
      );
    } else if (!isPlaying) {
      audioSynth.stop();
    }
    return () => {
      audioSynth.stop();
    };
  }, [isPlaying, activeAudioTrack?.id, musicVolume]);

  // Update ducking gain when speech happens
  useEffect(() => {
    if (activeAudioTrack && isPlaying) {
      audioSynth.setDucking(isDuckingActive && audioDuckingEnabled ? 0.25 : 1.0);
    }
  }, [isDuckingActive, audioDuckingEnabled, activeAudioTrack, isPlaying]);

  // Calculate dynamic panX from framing keyframes based on current relative time
  const calculateCurrentPan = (timeOffset: number): number => {
    const trajectory = clip.framing.panningTrajectory;
    if (!trajectory || trajectory.length === 0) return 0;

    if (timeOffset <= trajectory[0].timeOffset) {
      return trajectory[0].panX;
    }
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
  };

  // Face Tracking & Anti-Blank Space Calculation
  const isFaceTrackingActive = clip.framing.faceTrackingEnabled !== false && clip.framing.mode === 'speaker_tracking';
  const trajectoryPan = calculateCurrentPan(currentTime);

  // Steer towards detected face if speaker_tracking mode is active
  const targetPan = (isFaceTrackingActive && detectedFaces.length > 0)
    ? (smoothedFaceX * 0.65 + trajectoryPan * 0.35 + manualPanOffset)
    : (trajectoryPan + manualPanOffset);

  // Anti-Blank Space bounds guarantee
  const safeZoomFactor = Math.max(1.08, clip.framing.zoomFactor || 1.15);
  const { clampedShiftPercent, clampedPan } = clampPanToSafeLimits(
    targetPan,
    videoAspect,
    safeZoomFactor
  );

  const currentPan = clampedPan;
  const panShiftPercent = clampedShiftPercent;

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const vTime = videoRef.current.currentTime;
    const clipTime = vTime - clip.startTime;

    // Keep secondary split screen and ambient background in sync
    if (speakerBVideoRef.current && Math.abs(speakerBVideoRef.current.currentTime - vTime) > 0.25) {
      speakerBVideoRef.current.currentTime = vTime;
    }
    if (bgVideoRef.current && Math.abs(bgVideoRef.current.currentTime - vTime) > 0.25) {
      bgVideoRef.current.currentTime = vTime;
    }

    // Periodic optical face tracking scan
    const now = performance.now();
    if (now - lastScanRef.current > 200 && videoRef.current) {
      lastScanRef.current = now;
      try {
        const faces = detectFacesFromVideoFrame(videoRef.current);
        if (faces && faces.length > 0) {
          setDetectedFaces(faces);
          setSmoothedFaceX((prev) => prev * 0.7 + faces[0].normCenterX * 0.3);
        }
      } catch {
        // Continue on frame read error
      }
    }

    if (clipTime >= duration || vTime >= clip.endTime) {
      const resetTime = Math.max(0, clip.startTime);
      videoRef.current.currentTime = resetTime;
      if (speakerBVideoRef.current) speakerBVideoRef.current.currentTime = resetTime;
      if (bgVideoRef.current) bgVideoRef.current.currentTime = resetTime;
      setCurrentTime(0);
      return;
    }

    if (clipTime < 0) {
      const resetTime = Math.max(0, clip.startTime);
      videoRef.current.currentTime = resetTime;
      if (speakerBVideoRef.current) speakerBVideoRef.current.currentTime = resetTime;
      if (bgVideoRef.current) bgVideoRef.current.currentTime = resetTime;
      setCurrentTime(0);
      return;
    }

    setCurrentTime(clipTime);
    if (onTimeUpdate) onTimeUpdate(clipTime);

    // Detect if current time overlaps with active spoken dialogue line
    const activeSpeech = clip.dialogue.some(
      (line) => clipTime >= line.start && clipTime <= line.end
    );
    setIsDuckingActive(activeSpeech);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      if (speakerBVideoRef.current) speakerBVideoRef.current.pause();
      if (bgVideoRef.current) bgVideoRef.current.pause();
      setIsPlaying(false);
    } else {
      const vTime = videoRef.current.currentTime;
      if (vTime >= clip.endTime || vTime < clip.startTime) {
        const startTime = Math.max(0, clip.startTime);
        videoRef.current.currentTime = startTime;
        if (speakerBVideoRef.current) speakerBVideoRef.current.currentTime = startTime;
        if (bgVideoRef.current) bgVideoRef.current.currentTime = startTime;
      }
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            if (speakerBVideoRef.current) {
              speakerBVideoRef.current.play().catch(() => {});
            }
            if (bgVideoRef.current) {
              bgVideoRef.current.play().catch(() => {});
            }
          })
          .catch((e) => {
            console.warn('Playback error caught:', e);
            if (videoRef.current) {
              videoRef.current.muted = true;
              setIsMuted(true);
              videoRef.current.play().then(() => {
                setIsPlaying(true);
                if (bgVideoRef.current) bgVideoRef.current.play().catch(() => {});
              }).catch(() => setIsPlaying(false));
            }
          });
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRelativeTime = parseFloat(e.target.value);
    setCurrentTime(newRelativeTime);
    const targetTime = clip.startTime + newRelativeTime;
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
    if (speakerBVideoRef.current) {
      speakerBVideoRef.current.currentTime = targetTime;
    }
    if (bgVideoRef.current) {
      bgVideoRef.current.currentTime = targetTime;
    }
  };

  // Find active dialogue line for auto captions
  const activeLine = clip.dialogue.find(
    (line) => currentTime >= line.start && currentTime <= line.end
  );

  // Color Grade Filter CSS
  const getColorGradeFilter = () => {
    switch (template.colorGrade) {
      case 'cinematic_teal':
        return 'contrast(1.15) saturate(1.2) hue-rotate(-5deg)';
      case 'warm_kodak':
        return 'sepia(0.2) contrast(1.1) brightness(1.05) saturate(1.15)';
      case 'noir':
        return 'grayscale(1) contrast(1.3) brightness(0.95)';
      case 'vibrant_pop':
        return 'saturate(1.4) contrast(1.1)';
      default:
        return 'none';
    }
  };

  const getCaptionPositionClass = () => {
    switch (captionPosition) {
      case 'top':
        return 'top-16';
      case 'middle':
        return 'top-1/2 -translate-y-1/2';
      case 'lower':
      default:
        return 'bottom-20';
    }
  };

  return (
    <div className="flex flex-col items-center select-none w-full">
      {/* 9:16 Vertical Video Screen Frame - Compact Viewport Fit */}
      <div 
        id="vertical-preview-viewport"
        className="relative aspect-[9/16] h-[330px] sm:h-[360px] md:h-[390px] lg:h-[410px] max-h-[calc(100vh-210px)] w-auto bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-neutral-800 ring-1 ring-neutral-700/50 flex items-center justify-center group mx-auto"
      >
        {/* Background Blurred Ambient Mirror Fill (Synchronized) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <video
            ref={bgVideoRef}
            src={videoSrc}
            playsInline
            loop
            muted
            className={`w-full h-full object-cover blur-3xl scale-125 transition-opacity duration-300 ${
              clip.framing.mode === 'fit_blur' ? 'opacity-90 saturate-150 brightness-75' : 'opacity-35 saturate-125'
            }`}
            style={{
              filter: `${getColorGradeFilter()} blur(32px) brightness(0.7) saturate(1.4)`,
            }}
          />
          {clip.framing.mode === 'fit_blur' && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />
          )}
        </div>

        {/* Top-Left Live Status Pill: Face Tracking / Fit Blur Indicator */}
        <div className="absolute top-2.5 left-2.5 z-25 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-full border border-neutral-700/60 shadow-lg pointer-events-none">
          <span className={`w-1.5 h-1.5 rounded-full ${clip.framing.mode === 'fit_blur' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          <span className="text-[9px] font-bold text-neutral-200">
            {clip.framing.mode === 'fit_blur'
              ? '16:9 Fit • Ambient Blur'
              : clip.framing.mode === 'dual_split'
              ? 'Dual Split-Screen'
              : isFaceTrackingActive && detectedFaces.length > 0
              ? 'Face Tracking Locked'
              : 'Anti-Blank Centered'}
          </span>
          {clip.framing.mode !== 'fit_blur' && (
            <span className="text-[8px] font-mono text-amber-400">
              {currentPan >= 0 ? `+${(currentPan * 100).toFixed(0)}%` : `${(currentPan * 100).toFixed(0)}%`}
            </span>
          )}
        </div>

        {/* Main Video Element */}
        {!videoSrc ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-neutral-950 z-20">
            <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 text-rose-500 flex items-center justify-center mb-3">
              <Scan className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-sm text-white font-['Outfit']">No Local Movie Loaded</h4>
            <p className="text-xs text-neutral-400 mt-1 max-w-[220px]">
              Select a video file from local storage to preview the vertical 9:16 cut.
            </p>
            {onOpenUploader && (
              <button
                onClick={onOpenUploader}
                className="mt-4 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg transition-all"
              >
                Browse Local Storage
              </button>
            )}
          </div>
        ) : clip.framing.mode === 'fit_blur' ? (
          // Mode: Fit 16:9 Content with Ambient Blurred Mirror Background
          <div className="absolute inset-0 flex items-center justify-center z-10 p-0 pointer-events-none">
            <div className="w-full relative shadow-[0_12px_45px_rgba(0,0,0,0.9)] ring-1 ring-white/15 rounded-xl overflow-hidden aspect-video bg-black flex items-center justify-center pointer-events-auto">
              <video
                ref={videoRef}
                src={videoSrc}
                playsInline
                loop
                muted={isMuted}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleVideoMetadata}
                onPlay={() => {
                  setIsPlaying(true);
                  if (bgVideoRef.current) bgVideoRef.current.play().catch(() => {});
                }}
                onPause={() => {
                  setIsPlaying(false);
                  if (bgVideoRef.current) bgVideoRef.current.pause();
                }}
                onError={() => {
                  if (videoSrc) setHasVideoError(true);
                }}
                onLoadedData={() => {
                  setVideoLoaded(true);
                  setHasVideoError(false);
                  if (bgVideoRef.current && videoRef.current) {
                    bgVideoRef.current.currentTime = videoRef.current.currentTime;
                  }
                }}
                style={{
                  filter: getColorGradeFilter(),
                }}
                className="w-full h-full object-contain"
              />
              <div className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded bg-black/70 text-amber-300 backdrop-blur border border-white/10 pointer-events-none">
                16:9 FIT
              </div>
            </div>
          </div>
        ) : clip.framing.mode === 'dual_split' ? (
          // Dual vertical split screen (Speaker A top, Speaker B bottom)
          <div className="absolute inset-0 flex flex-col z-10">
            <div className="relative flex-1 overflow-hidden border-b-2 border-neutral-900">
              <video
                ref={videoRef}
                src={videoSrc}
                playsInline
                loop
                muted={isMuted}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleVideoMetadata}
                onPlay={() => {
                  setIsPlaying(true);
                  if (bgVideoRef.current) bgVideoRef.current.play().catch(() => {});
                }}
                onPause={() => {
                  setIsPlaying(false);
                  if (bgVideoRef.current) bgVideoRef.current.pause();
                }}
                onError={() => setHasVideoError(true)}
                onLoadedData={() => {
                  setVideoLoaded(true);
                  setHasVideoError(false);
                  if (bgVideoRef.current && videoRef.current) {
                    bgVideoRef.current.currentTime = videoRef.current.currentTime;
                  }
                }}
                style={{
                  filter: getColorGradeFilter(),
                  transform: `scale(${safeZoomFactor * 1.6}) translateX(${-25}%)`,
                  transformOrigin: 'center center'
                }}
                className="w-full h-full object-cover transition-transform duration-200"
              />
              <span className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-rose-300 backdrop-blur">
                SPEAKER A
              </span>
            </div>
            <div className="relative flex-1 overflow-hidden">
              <video
                ref={speakerBVideoRef}
                src={videoSrc}
                playsInline
                loop
                muted
                style={{
                  filter: getColorGradeFilter(),
                  transform: `scale(${safeZoomFactor * 1.6}) translateX(${25}%)`,
                  transformOrigin: 'center center'
                }}
                className="w-full h-full object-cover transition-transform duration-200"
              />
              <span className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-sky-300 backdrop-blur">
                SPEAKER B
              </span>
            </div>
          </div>
        ) : (
          // Single Frame with Smooth Face Tracking Pan & Anti-Blank Protection
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden z-10">
            <video
              ref={videoRef}
              src={videoSrc}
              playsInline
              loop
              muted={isMuted}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleVideoMetadata}
              onPlay={() => {
                setIsPlaying(true);
                if (bgVideoRef.current) bgVideoRef.current.play().catch(() => {});
              }}
              onPause={() => {
                setIsPlaying(false);
                if (bgVideoRef.current) bgVideoRef.current.pause();
              }}
              onError={() => {
                if (videoSrc) setHasVideoError(true);
              }}
              onLoadedData={() => {
                setVideoLoaded(true);
                setHasVideoError(false);
                if (bgVideoRef.current && videoRef.current) {
                  bgVideoRef.current.currentTime = videoRef.current.currentTime;
                }
              }}
              style={{
                filter: getColorGradeFilter(),
                height: '100%',
                maxWidth: 'none',
                transform: `scale(${safeZoomFactor * 1.05}) translateX(${-panShiftPercent}%)`,
                transformOrigin: 'center center'
              }}
              className="object-cover transition-transform duration-200 ease-out"
            />

            {/* Cyber Actor Reticle on Detected Face */}
            {isFaceTrackingActive && detectedFaces.length > 0 && (
              <div 
                className="absolute pointer-events-none transition-all duration-300 ease-out border border-emerald-400/60 rounded-lg shadow-[0_0_12px_rgba(52,211,153,0.35)]"
                style={{
                  width: `${Math.max(48, Math.min(80, detectedFaces[0].width * 260))}px`,
                  height: `${Math.max(54, Math.min(88, detectedFaces[0].height * 320))}px`,
                  top: `${Math.max(16, Math.min(48, detectedFaces[0].y * 100))}%`,
                  left: '50%',
                  transform: 'translate(-50%, -15%)'
                }}
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-[8px] font-bold px-1 py-0.5 rounded whitespace-nowrap flex items-center gap-1 shadow">
                  <UserCheck className="w-2.5 h-2.5 text-emerald-400" />
                  <span>FACE LOCKED</span>
                </div>
                <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-emerald-400" />
                <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-emerald-400" />
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-emerald-400" />
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-emerald-400" />
              </div>
            )}
          </div>
        )}

        {/* Local Video Error Notice */}
        {hasVideoError && videoSrc && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-neutral-950 z-20">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
              <Scan className="w-6 h-6" />
            </div>
            <p className="font-bold text-sm text-white font-['Outfit']">Playback Issue</p>
            <p className="text-xs text-neutral-400 mt-1 max-w-[200px]">
              This local file format or codec might not be supported directly by your browser.
            </p>
            {onOpenUploader && (
              <button
                onClick={onOpenUploader}
                className="mt-3 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 border border-neutral-700"
              >
                Choose Another Video
              </button>
            )}
          </div>
        )}

        {/* Branded Hook Intro (First 3 seconds) */}
        {template.hookIntro.enabled && currentTime < template.hookIntro.duration && (
          <div className="absolute top-10 left-3 right-3 z-30 transition-opacity duration-300">
            <div className="bg-rose-600 text-white font-bold text-center text-xs sm:text-sm py-2 px-3 rounded-lg shadow-lg border border-white/40 tracking-wide uppercase">
              {template.hookIntro.text || clip.hookText}
            </div>
          </div>
        )}

        {/* Dynamic Auto-Caption Overlay (Word-by-Word Karaoke Style) */}
        {effectiveSubtitlesEnabled && activeLine && (
          <div className={`absolute ${getCaptionPositionClass()} left-3 right-3 z-30 flex justify-center pointer-events-none px-2 animate-in fade-in duration-150`}>
            {captionStyle === 'hormozi' && (
              <div className="bg-black/75 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/20 text-center max-w-[95%] shadow-xl">
                <p 
                  className="font-black tracking-wide leading-snug uppercase drop-shadow-[0_4px_4px_rgba(0,0,0,1)] text-white"
                  style={{ fontSize: `${captionFontSize}px` }}
                >
                  {activeLine.text.split(' ').map((word, wIdx) => {
                    const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
                    const isHighlighted = activeLine.highlightWords.some(
                      (hw) => cleanWord.includes(hw.toLowerCase())
                    );
                    return (
                      <span
                        key={wIdx}
                        className={`inline-block mx-1 ${isHighlighted ? 'font-extrabold scale-105' : ''}`}
                        style={{
                          color: isHighlighted ? highlightColor : '#FFFFFF'
                        }}
                      >
                        {word}
                      </span>
                    );
                  })}
                </p>
                <div className="mt-1 text-[9px] text-amber-300 font-bold uppercase tracking-wider">
                  <span>{activeLine.speaker}</span>
                </div>
              </div>
            )}

            {captionStyle === 'beast' && (
              <div className="bg-amber-400 text-black px-4 py-2 rounded-2xl font-black text-center max-w-[95%] shadow-lg border-2 border-black uppercase">
                <p style={{ fontSize: `${captionFontSize}px` }} className="leading-tight">
                  {activeLine.text}
                </p>
              </div>
            )}

            {captionStyle === 'minimal' && (
              <div className="text-center max-w-[90%]">
                <p 
                  className="text-white font-medium drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] tracking-tight leading-relaxed bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10"
                  style={{ fontSize: `${Math.max(14, captionFontSize - 4)}px` }}
                >
                  {activeLine.text}
                </p>
              </div>
            )}

            {captionStyle === 'bold_stroke' && (
              <div className="text-center max-w-[95%] bg-black/40 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                <p 
                  className="font-black text-white uppercase tracking-wider"
                  style={{ 
                    fontSize: `${captionFontSize}px`,
                    textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000'
                  }}
                >
                  {activeLine.text}
                </p>
              </div>
            )}

            {captionStyle === 'clean_sub' && (
              <div className="bg-neutral-900/90 text-white px-3.5 py-1.5 rounded-lg text-center max-w-[90%] border border-neutral-700">
                <p style={{ fontSize: `${captionFontSize}px` }} className="font-semibold">
                  {activeLine.text}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Template: Watermark Handle */}
        {template.watermark.enabled && template.watermark.text && (
          <div 
            className={`absolute ${
              template.watermark.position === 'top-right'
                ? 'top-4 right-4'
                : template.watermark.position === 'top-left'
                ? 'top-4 left-4'
                : 'bottom-16 right-4'
            } z-20 pointer-events-none text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-white/90 border border-white/20`}
            style={{ opacity: template.watermark.opacity }}
          >
            {template.watermark.text}
          </div>
        )}

        {/* Subtitles Quick Toggle Pill (Top Overlay) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleSubtitles();
          }}
          className={`absolute ${
            template.watermark.enabled && template.watermark.text && template.watermark.position === 'top-right'
              ? 'top-11 right-4'
              : 'top-4 right-4'
          } z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold transition-all shadow-lg active:scale-95 cursor-pointer ${
            effectiveSubtitlesEnabled
              ? 'bg-black/75 backdrop-blur text-emerald-400 border-emerald-500/40 hover:bg-neutral-900'
              : 'bg-black/85 backdrop-blur text-neutral-400 border-neutral-700 hover:text-white'
          }`}
          title={effectiveSubtitlesEnabled ? 'Subtitles are ON. Click to turn OFF' : 'Subtitles are OFF. Click to turn ON'}
        >
          <Subtitles className="w-3 h-3" />
          <span>{effectiveSubtitlesEnabled ? 'CC ON' : 'CC OFF'}</span>
        </button>

        {/* Audio Ducking Indicator Badge */}
        {audioDuckingEnabled && isDuckingActive && activeAudioTrack && (
          <div className="absolute bottom-16 left-4 z-20 flex items-center gap-1 bg-amber-500 text-black px-2 py-0.5 rounded-full text-[9px] font-extrabold shadow-lg pointer-events-none">
            <AudioWaveform className="w-2.5 h-2.5" />
            <span>Music Ducked</span>
          </div>
        )}

        {/* Click-to-Play/Pause Overlay */}
        <div 
          onClick={togglePlay}
          className="absolute inset-0 z-20 cursor-pointer flex items-center justify-center transition-colors"
        >
          {!isPlaying && (
            <div className="w-14 h-14 rounded-full bg-rose-600/95 hover:bg-rose-500 text-white flex items-center justify-center shadow-2xl pl-1 transform group-hover:scale-105 transition-transform">
              <Play className="w-6 h-6 fill-white" />
            </div>
          )}
        </div>

        {/* Template: Scrubbable Progress Bar */}
        {template.progressBar.enabled && (
          <div 
            className={`absolute ${template.progressBar.position === 'top' ? 'top-0' : 'bottom-0'} left-0 right-0 z-30`}
            style={{ height: `${template.progressBar.height}px` }}
          >
            <div className="w-full h-full bg-white/20">
              <div 
                className="h-full transition-all duration-100"
                style={{ 
                  width: `${(currentTime / duration) * 100}%`,
                  backgroundColor: template.progressBar.color 
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Playback Controls & Scrubber - Compact Viewport Fit */}
      <div className="w-full max-w-[240px] sm:max-w-[260px] md:max-w-[275px] mt-2 bg-neutral-900/90 border border-neutral-800 rounded-xl p-2 text-white mx-auto shadow-md">
        {/* Scrubber */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[10px] font-mono text-neutral-400 w-8 text-right">
            {currentTime.toFixed(1)}s
          </span>
          <input
            type="range"
            min="0"
            max={duration || 30}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 accent-rose-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer py-1"
          />
          <span className="text-[10px] font-mono text-neutral-400 w-8">
            {duration.toFixed(1)}s
          </span>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={togglePlay}
              id="btn-play-pause"
              className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors active:scale-95"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = clip.startTime;
                  setCurrentTime(0);
                }
              }}
              className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors active:scale-95"
              title="Restart from beginning"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors active:scale-95"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* Subtitles ON/OFF Button (CC) */}
            <button
              onClick={handleToggleSubtitles}
              id="btn-subtitles-toggle"
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-95 border ${
                effectiveSubtitlesEnabled
                  ? 'bg-rose-950/40 text-rose-400 border-rose-500/40 hover:bg-rose-900/50'
                  : 'bg-neutral-800 text-neutral-500 border-neutral-700 hover:text-neutral-300'
              }`}
              title={effectiveSubtitlesEnabled ? 'Subtitles are ON. Click to turn OFF (CC)' : 'Subtitles are OFF. Click to turn ON (CC)'}
            >
              <div className="relative flex items-center justify-center">
                <Subtitles className="w-3.5 h-3.5" />
                {!effectiveSubtitlesEnabled && (
                  <div className="absolute w-4 h-0.5 bg-rose-500 -rotate-45 rounded" />
                )}
              </div>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <div className="flex items-center gap-1 text-amber-400 font-bold bg-neutral-950 px-2 py-0.5 rounded-lg border border-neutral-800 text-[10px]">
              <Flame className="w-3 h-3 fill-amber-400" />
              <span>{clip.viralScore}%</span>
            </div>
            <span className="text-[10px] text-neutral-500 font-mono hidden xs:inline">9:16</span>
          </div>
        </div>
      </div>
    </div>
  );
};
