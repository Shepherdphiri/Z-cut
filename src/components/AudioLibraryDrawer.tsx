import React, { useState } from 'react';
import { 
  Music, 
  Play, 
  Pause, 
  Volume2, 
  Sparkles, 
  Sliders, 
  Check, 
  ShieldCheck, 
  Flame, 
  Radio, 
  VolumeX,
  AudioWaveform
} from 'lucide-react';
import { AudioTrack } from '../types';
import { TRENDING_AUDIO_LIBRARY } from '../data/audioLibrary';
import { audioSynth } from '../utils/audioSynth';

interface AudioLibraryDrawerProps {
  selectedTrack: AudioTrack | null;
  onSelectTrack: (track: AudioTrack | null) => void;
  audioDuckingEnabled: boolean;
  onToggleAudioDucking: (enabled: boolean) => void;
  speechVolume: number;
  onChangeSpeechVolume: (vol: number) => void;
  musicVolume: number;
  onChangeMusicVolume: (vol: number) => void;
}

export const AudioLibraryDrawer: React.FC<AudioLibraryDrawerProps> = ({
  selectedTrack,
  onSelectTrack,
  audioDuckingEnabled,
  onToggleAudioDucking,
  speechVolume,
  onChangeSpeechVolume,
  musicVolume,
  onChangeMusicVolume
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All Tracks' },
    { id: 'trending', label: '🔥 Trending TikTok' },
    { id: 'cinematic', label: '🎬 Cinematic' },
    { id: 'lofi', label: '☕ Lo-Fi Chill' },
    { id: 'phonk', label: '⚡ Phonk Drift' },
    { id: 'upbeat', label: '✨ Upbeat Viral' }
  ];

  const filteredTracks = activeCategory === 'all'
    ? TRENDING_AUDIO_LIBRARY
    : TRENDING_AUDIO_LIBRARY.filter(t => t.category === activeCategory);

  const togglePreview = (track: AudioTrack) => {
    if (playingTrackId === track.id) {
      audioSynth.stop();
      setPlayingTrackId(null);
    } else {
      audioSynth.playTrack(track.audioTone, musicVolume, false);
      setPlayingTrackId(track.id);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-white">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm font-['Outfit']">Trending Audio & Royalty-Free Music</h3>
            <p className="text-[11px] text-neutral-400">
              Licensed sound library with auto-ducking to keep movie speech crystal clear.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          Royalty-Free
        </span>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? 'bg-rose-600 text-white shadow'
                : 'bg-neutral-800/80 text-neutral-400 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Track List */}
      <div className="space-y-2 mb-4 max-h-56 overflow-y-auto pr-1">
        {filteredTracks.map((track) => {
          const isSelected = selectedTrack?.id === track.id;
          const isCurrentlyAuditioning = playingTrackId === track.id;

          return (
            <div
              key={track.id}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                isSelected
                  ? 'border-rose-500 bg-rose-950/25 ring-1 ring-rose-500/50'
                  : 'border-neutral-800 bg-neutral-950/50 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Play preview button */}
                <button
                  onClick={() => togglePreview(track)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
                    isCurrentlyAuditioning
                      ? 'bg-rose-600 text-white'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                  }`}
                  title="Audition music loop"
                >
                  {isCurrentlyAuditioning ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  )}
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold font-['Outfit'] text-white truncate">
                      {track.title}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-400 px-1 py-0.5 rounded bg-neutral-800 shrink-0">
                      {track.bpm} BPM
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                    {track.artist} • {track.durationSeconds}s
                  </p>
                </div>
              </div>

              {/* Mini Waveform Visualization */}
              <div className="hidden sm:flex items-center gap-0.5 h-6 w-20 shrink-0">
                {track.waveform.slice(0, 14).map((val, idx) => (
                  <div
                    key={idx}
                    className={`w-1 rounded-full transition-all ${
                      isCurrentlyAuditioning
                        ? 'bg-rose-400 animate-pulse'
                        : isSelected
                        ? 'bg-rose-500/70'
                        : 'bg-neutral-700'
                    }`}
                    style={{ height: `${Math.max(15, val * 0.25)}px` }}
                  />
                ))}
              </div>

              {/* Select track button */}
              <button
                onClick={() => {
                  onSelectTrack(isSelected ? null : track);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1 ${
                  isSelected
                    ? 'bg-rose-600 text-white shadow'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                }`}
              >
                {isSelected ? (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Active</span>
                  </>
                ) : (
                  <span>Apply</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Audio Mix & Intelligent Ducking Panel */}
      <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3 space-y-3">
        {/* Smart Ducking Toggle */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-amber-500/20 text-amber-400">
              <AudioWaveform className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white font-['Outfit']">
                Smart Dialogue Audio Ducking
              </p>
              <p className="text-[10px] text-neutral-400">
                Lowers music automatically by 70% when actors speak
              </p>
            </div>
          </div>
          <button
            onClick={() => onToggleAudioDucking(!audioDuckingEnabled)}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
              audioDuckingEnabled ? 'bg-rose-600' : 'bg-neutral-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                audioDuckingEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Volume Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-neutral-300 font-medium">Original Movie Speech</span>
              <span className="font-mono text-neutral-400">{(speechVolume * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={speechVolume}
              onChange={(e) => onChangeSpeechVolume(parseFloat(e.target.value))}
              className="w-full accent-rose-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-neutral-300 font-medium">Background Music</span>
              <span className="font-mono text-neutral-400">{(musicVolume * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={musicVolume}
              onChange={(e) => onChangeMusicVolume(parseFloat(e.target.value))}
              className="w-full accent-rose-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
