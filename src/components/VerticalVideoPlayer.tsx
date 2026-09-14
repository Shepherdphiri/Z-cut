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
  AudioWaveform
} from 'lucide-react';
import { 
  VideoClip, 
  CaptionStyle, 
  CaptionPosition, 
  TemplateConfig,
  AudioTrack
} from '../types';
import { audioSynth } from '../utils/audioSynth';

interface VerticalVideoPlayerProps {
  clip: VideoClip;
  videoSrc: string;
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
}

export const VerticalVideoPlayer: React.FC<VerticalVideoPlayerProps> = ({
  clip,
  videoSrc,
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
  onTimeUpdate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(clip.duration || 30);
  const [isMuted, setIsMuted] = useState(false);
  const [isDuckingActive, setIsDuckingActive] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);

  // Sync with clip boundaries
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = clip.startTime;
      setCurrentTime(0);
      setDuration(clip.duration);
    }
  }, [clip.id, clip.startTime, clip.duration]);

  // Handle active audio track and ducking
  useEffect(() => {
    if (isPlaying && activeAudioTrack) {
      audioSynth.playTrack(activeAudioTrack.audioTone, musicVolume, isDuckingActive && audioDuckingEnabled);
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
    if (!trajectory || trajectory.length === 0) return manualPanOffset;

    if (timeOffset <= trajectory[0].timeOffset) {
      return trajectory[0].panX + manualPanOffset;
    }
    if (timeOffset >= trajectory[trajectory.length - 1].timeOffset) {
      return trajectory[trajectory.length - 1].panX + manualPanOffset;
    }

    for (let i = 0; i < trajectory.length - 1; i++) {
      const p1 = trajectory[i];
      const p2 = trajectory[i + 1];
      if (timeOffset >= p1.timeOffset && timeOffset <= p2.timeOffset) {
        const span = p2.timeOffset - p1.timeOffset;
        const progress = span > 0 ? (timeOffset - p1.timeOffset) / span : 0;
        const ease = 0.5 - Math.cos(progress * Math.PI) / 2;
        const interpolated = p1.panX + (p2.panX - p1.panX) * ease;
        return Math.max(-1, Math.min(1, interpolated + manualPanOffset));
      }
    }
    return manualPanOffset;
  };

  const currentPan = calculateCurrentPan(currentTime);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const vTime = videoRef.current.currentTime;
    const clipTime = vTime - clip.startTime;

    if (clipTime >= duration || vTime >= clip.endTime) {
      videoRef.current.currentTime = clip.startTime;
      setCurrentTime(0);
      return;
    }

    if (clipTime < 0) {
      videoRef.current.currentTime = clip.startTime;
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
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn('Playback caught:', e);
        setIsPlaying(true);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRelativeTime = parseFloat(e.target.value);
    setCurrentTime(newRelativeTime);
    if (videoRef.current) {
      videoRef.current.currentTime = clip.startTime + newRelativeTime;
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

  const panShiftPercent = currentPan * 38;

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
      {/* 9:16 Vertical Video Screen Frame - Fully Mobile Friendly */}
      <div 
        id="vertical-preview-viewport"
        className="relative w-full max-w-[310px] sm:max-w-[330px] md:max-w-[340px] aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border-4 border-neutral-800 ring-1 ring-neutral-700/50 flex items-center justify-center group mx-auto"
      >
        {/* Background Blurred Ambient Fill */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
          <video
            src={videoSrc}
            className="w-full h-full object-cover blur-2xl scale-125"
            muted
          />
        </div>

        {/* Main Video Element with Subject Tracking */}
        {clip.framing.mode === 'dual_split' ? (
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
                onError={() => setHasVideoError(true)}
                onLoadedData={() => setVideoLoaded(true)}
                style={{
                  filter: getColorGradeFilter(),
                  transform: `scale(${clip.framing.zoomFactor * 1.8}) translateX(${-25}%)`,
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
                src={videoSrc}
                playsInline
                loop
                muted
                style={{
                  filter: getColorGradeFilter(),
                  transform: `scale(${clip.framing.zoomFactor * 1.8}) translateX(${25}%)`,
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
          // Single Frame with Smooth Subject Tracking Pan
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden z-10">
            <video
              ref={videoRef}
              src={videoSrc}
              playsInline
              loop
              muted={isMuted}
              onTimeUpdate={handleTimeUpdate}
              onError={() => setHasVideoError(true)}
              onLoadedData={() => setVideoLoaded(true)}
              style={{
                filter: getColorGradeFilter(),
                height: '100%',
                maxWidth: 'none',
                transform: `scale(${clip.framing.zoomFactor * 1.05}) translateX(${-panShiftPercent}%)`,
                transformOrigin: 'center center'
              }}
              className="object-cover transition-transform duration-300 ease-out"
            />
          </div>
        )}

        {/* Fallback Simulation Card if offline or source error */}
        {hasVideoError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-neutral-900 via-neutral-950 to-black z-10">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
              <Scan className="w-6 h-6" />
            </div>
            <p className="font-bold text-sm text-white font-['Outfit']">{clip.title}</p>
            <p className="text-xs text-neutral-400 mt-1">
              Smart Framing Active (Pan: {currentPan.toFixed(2)})
            </p>
            <span className="mt-3 px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px] font-mono font-bold">
              {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
            </span>
          </div>
        )}

        {/* Branded Hook Intro (First 3 seconds) */}
        {template.hookIntro.enabled && currentTime < template.hookIntro.duration && (
          <div className="absolute top-10 left-3 right-3 z-30 transition-all duration-300 animate-bounce">
            <div className="bg-rose-600 text-white font-black text-center text-xs sm:text-sm py-2 px-3 rounded-xl shadow-xl border-2 border-white/80 tracking-wide uppercase font-['Outfit']">
              {template.hookIntro.text || clip.hookText}
            </div>
          </div>
        )}

        {/* Dynamic Auto-Caption Overlay (Word-by-Word Karaoke Style) */}
        {activeLine && (
          <div className={`absolute ${getCaptionPositionClass()} left-3 right-3 z-30 flex justify-center pointer-events-none px-2`}>
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

        {/* Live Tracking Indicator Tag */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-neutral-700/60 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-neutral-200">
            {clip.framing.mode === 'speaker_tracking' ? 'Speaker Tracking' : '9:16 Centered'}
          </span>
          <span className="text-[10px] font-mono text-amber-400">
            {currentPan > 0 ? `+${(currentPan * 100).toFixed(0)}%` : `${(currentPan * 100).toFixed(0)}%`}
          </span>
        </div>

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

      {/* Playback Controls & Scrubber - Mobile Friendly 44px Touch Targets */}
      <div className="w-full max-w-[310px] sm:max-w-[330px] md:max-w-[340px] mt-3 bg-neutral-900 border border-neutral-800 rounded-2xl p-3 text-white mx-auto">
        {/* Scrubber */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-mono text-neutral-400 w-10 text-right">
            {currentTime.toFixed(1)}s
          </span>
          <input
            type="range"
            min="0"
            max={duration || 30}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 accent-rose-500 h-2 bg-neutral-800 rounded-lg cursor-pointer py-2"
          />
          <span className="text-[11px] font-mono text-neutral-400 w-10">
            {duration.toFixed(1)}s
          </span>
        </div>

        {/* Control Buttons (Min 40-44px touch size) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={togglePlay}
              id="btn-play-pause"
              className="w-10 h-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors active:scale-95"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = clip.startTime;
                  setCurrentTime(0);
                }
              }}
              className="w-10 h-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors active:scale-95"
              title="Restart from beginning"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-10 h-10 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors active:scale-95"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 text-amber-400 font-bold bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              <span>{clip.viralScore}%</span>
            </div>
            <span className="text-[11px] text-neutral-400 font-mono hidden xs:inline">9:16</span>
          </div>
        </div>
      </div>
    </div>
  );
};
