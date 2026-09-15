import React, { useState, useRef, useEffect } from 'react';
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
  AudioWaveform,
  Upload,
  Mic,
  Square,
  Trash2,
  FileAudio,
  Plus
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
  const [customTracks, setCustomTracks] = useState<AudioTrack[]>([]);

  // Voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categories = [
    { id: 'all', label: 'All Tracks' },
    { id: 'custom', label: '🎤 Voice & Local' },
    { id: 'trending', label: '🔥 Trending TikTok' },
    { id: 'cinematic', label: '🎬 Cinematic' },
    { id: 'lofi', label: '☕ Lo-Fi Chill' },
    { id: 'phonk', label: '⚡ Phonk Drift' },
    { id: 'upbeat', label: '✨ Upbeat Viral' }
  ];

  const allAvailableTracks = [...customTracks, ...TRENDING_AUDIO_LIBRARY];

  const filteredTracks = activeCategory === 'all'
    ? allAvailableTracks
    : activeCategory === 'custom'
    ? customTracks
    : TRENDING_AUDIO_LIBRARY.filter(t => t.category === activeCategory);

  const togglePreview = (track: AudioTrack) => {
    if (playingTrackId === track.id) {
      audioSynth.stop();
      setPlayingTrackId(null);
    } else {
      audioSynth.playTrack(track.audioTone, musicVolume, false, track.customAudioUrl);
      setPlayingTrackId(track.id);
    }
  };

  // Local File Upload Handler
  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const audioUrl = URL.createObjectURL(file);
    const audioTest = new Audio(audioUrl);

    audioTest.onloadedmetadata = () => {
      const duration = Math.round(audioTest.duration) || 30;
      const cleanName = file.name.replace(/\.[^/.]+$/, '');
      const newTrack: AudioTrack = {
        id: 'local_' + Date.now(),
        title: cleanName.length > 25 ? cleanName.substring(0, 25) + '...' : cleanName,
        artist: 'Local File',
        category: 'custom',
        durationSeconds: duration,
        bpm: 120,
        waveform: Array.from({ length: 20 }, () => Math.floor(Math.random() * 60 + 30)),
        audioTone: 'custom_file',
        customAudioUrl: audioUrl
      };

      setCustomTracks(prev => [newTrack, ...prev]);
      setActiveCategory('custom');
      onSelectTrack(newTrack);
    };
  };

  // Start Voice Recording
  const startRecordingVoice = async () => {
    setVoiceError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setVoiceError('Microphone not supported on this device/browser.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioBlob(audioBlob);
        setRecordedAudioUrl(url);

        // Stop all mic tracks
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecordingVoice(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone permission error:', err);
      setVoiceError('Please allow microphone permissions to record your voice.');
    }
  };

  // Stop Voice Recording
  const stopRecordingVoice = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  // Save Recorded Voice as Track
  const handleSaveVoiceTrack = () => {
    if (!recordedAudioUrl) return;

    const newTrack: AudioTrack = {
      id: 'voice_' + Date.now(),
      title: `Voiceover #${customTracks.length + 1} (${recordingSeconds}s)`,
      artist: 'Recorded Voice',
      category: 'custom',
      durationSeconds: Math.max(1, recordingSeconds),
      bpm: 100,
      waveform: Array.from({ length: 20 }, () => Math.floor(Math.random() * 70 + 20)),
      audioTone: 'custom_file',
      customAudioUrl: recordedAudioUrl,
      isVoiceover: true
    };

    setCustomTracks(prev => [newTrack, ...prev]);
    onSelectTrack(newTrack);
    setActiveCategory('custom');
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setRecordingSeconds(0);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-neutral-800 mb-4 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <Music className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm font-['Outfit']">Music, Voiceover & Intelligent Ducking</h3>
            <p className="text-[11px] text-neutral-400">
              Add royalty-free music, record a live voiceover, or upload your own local audio.
            </p>
          </div>
        </div>

        {/* Action Buttons: Add Voice / Add Local File */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Add Local File button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleLocalFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            title="Upload audio file (.mp3, .wav, .m4a)"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Add Local Audio</span>
          </button>

          {/* Record Voiceover button */}
          <button
            onClick={() => {
              if (isRecordingVoice) {
                stopRecordingVoice();
              } else {
                startRecordingVoice();
              }
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              isRecordingVoice
                ? 'bg-rose-600 text-white'
                : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40'
            }`}
          >
            {isRecordingVoice ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop ({recordingSeconds}s)</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-rose-400" />
                <span>Record Voice</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Voice Recording In-Progress Banner */}
      {isRecordingVoice && (
        <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-600/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <div>
              <p className="text-xs font-bold text-white">Recording Voiceover...</p>
              <p className="text-[10px] text-rose-300">Speak into your microphone now</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-extrabold text-white">
              00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
            </span>
            <button
              onClick={stopRecordingVoice}
              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Newly Recorded Voice Ready to Save Banner */}
      {!isRecordingVoice && recordedAudioUrl && (
        <div className="mb-4 p-3.5 rounded-xl bg-neutral-950 border border-emerald-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Recorded Voiceover Ready ({recordingSeconds}s)</p>
              <p className="text-[10px] text-neutral-400">Audition recording or apply directly to clip</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <audio src={recordedAudioUrl} controls className="h-7 w-44" />
            <button
              onClick={handleSaveVoiceTrack}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Voice</span>
            </button>
            <button
              onClick={() => {
                setRecordedAudioBlob(null);
                setRecordedAudioUrl(null);
              }}
              className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white"
              title="Discard"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Mic Error Banner */}
      {voiceError && (
        <div className="mb-4 p-2.5 rounded-xl bg-rose-950/60 border border-rose-600/50 text-rose-300 text-xs flex items-center justify-between">
          <span>{voiceError}</span>
          <button onClick={() => setVoiceError(null)} className="text-xs text-neutral-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

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
            {cat.id === 'custom' && customTracks.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                {customTracks.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Track List */}
      <div className="space-y-2 mb-4 max-h-56 overflow-y-auto pr-1">
        {filteredTracks.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-neutral-800 rounded-xl">
            <FileAudio className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
            <p className="text-xs text-neutral-400">No custom tracks or voiceovers yet.</p>
            <p className="text-[10px] text-neutral-500 mt-1">
              Click <strong>Add Local Audio</strong> or <strong>Record Voice</strong> above to add one.
            </p>
          </div>
        ) : (
          filteredTracks.map((track) => {
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
                      {track.isVoiceover && (
                        <span className="text-[9px] font-bold text-rose-300 bg-rose-950/60 border border-rose-700/50 px-1 py-0.5 rounded shrink-0">
                          VOICE
                        </span>
                      )}
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
                          ? 'bg-rose-400'
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
          })
        )}
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
                Lowers music/audio automatically by 70% when actors speak
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
              <span className="text-neutral-300 font-medium">Background Music / Voice Track</span>
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
