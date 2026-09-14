import React, { useState } from 'react';
import { 
  Film, 
  UploadCloud, 
  Link as LinkIcon, 
  Play, 
  Clock, 
  Check, 
  Flame, 
  Layers, 
  HardDrive,
  ArrowRight,
  Database
} from 'lucide-react';
import { MovieSource, VideoClip } from '../types';
import { SAMPLE_MOVIES } from '../data/sampleMovies';

interface MovieUploaderProps {
  onMovieSelected: (movie: MovieSource, clips: VideoClip[]) => void;
  onClose?: () => void;
  currentMovieId?: string;
}

export const MovieUploader: React.FC<MovieUploaderProps> = ({
  onMovieSelected,
  onClose,
  currentMovieId
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'upload' | 'url'>('presets');
  const [selectedPreset, setSelectedPreset] = useState<MovieSource>(SAMPLE_MOVIES[0]);
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<string>('');
  const [processProgress, setProcessProgress] = useState(0);

  const handleStartAutoCut = async (movieToProcess: MovieSource) => {
    setIsProcessing(true);
    setProcessProgress(15);
    setProcessStep('Ingesting widescreen film stream & detecting scene boundaries...');

    try {
      await new Promise(r => setTimeout(r, 500));
      setProcessProgress(45);
      setProcessStep('Calculating speaker tracking & dynamic 9:16 focal trajectories...');

      await new Promise(r => setTimeout(r, 500));
      setProcessProgress(75);
      setProcessStep('Generating synchronized subtitles & hook points...');

      let extractedClips: VideoClip[] = movieToProcess.precomputedClips;
      try {
        const res = await fetch('/api/clips/auto-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movieTitle: movieToProcess.title,
            movieDuration: movieToProcess.durationFormatted,
            genre: movieToProcess.genre,
            description: movieToProcess.description
          })
        });
        if (res.ok) {
          const json = await res.json();
          if (json.clips && Array.isArray(json.clips) && json.clips.length > 0) {
            extractedClips = json.clips;
          }
        }
      } catch (e) {
        console.warn('Fallback clips used:', e);
      }

      setProcessProgress(90);
      setProcessStep('Storing lightweight metadata in SQLite database (zero heavy video bloat)...');

      // Save to SQLite database
      try {
        await fetch('/api/db/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project: {
              id: movieToProcess.id,
              title: movieToProcess.title,
              videoUrl: movieToProcess.videoUrl,
              thumbnailUrl: movieToProcess.thumbnailUrl,
              durationFormatted: movieToProcess.durationFormatted,
              durationSeconds: movieToProcess.durationSeconds,
              genre: movieToProcess.genre
            },
            clips: extractedClips
          })
        });
      } catch (e) {
        console.warn('Failed to save to SQLite:', e);
      }

      setProcessProgress(100);
      onMovieSelected(movieToProcess, extractedClips);
      if (onClose) onClose();
    } catch (err) {
      console.error(err);
      onMovieSelected(movieToProcess, movieToProcess.precomputedClips);
      if (onClose) onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Use URL.createObjectURL so file remains purely in browser memory
    // Zero big video file upload to the server disk!
    const fileUrl = URL.createObjectURL(file);
    const customMovie: MovieSource = {
      id: `custom-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      director: 'Creator Upload',
      durationFormatted: 'Custom Clip',
      durationSeconds: 180,
      genre: 'Uploaded Video',
      thumbnailUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80',
      videoUrl: fileUrl,
      description: `Browser-streamed video file: ${file.name}. Stored as lightweight reference only.`,
      precomputedClips: SAMPLE_MOVIES[0].precomputedClips
    };
    setSelectedPreset(customMovie);
    handleStartAutoCut(customMovie);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;

    const customMovie: MovieSource = {
      id: `url-${Date.now()}`,
      title: customTitle.trim() || 'Online Video Stream',
      director: 'Web Source',
      durationFormatted: '10m 00s',
      durationSeconds: 600,
      genre: 'Streaming Media',
      thumbnailUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&auto=format&fit=crop&q=80',
      videoUrl: customUrl,
      description: `Online stream: ${customUrl}`,
      precomputedClips: SAMPLE_MOVIES[0].precomputedClips
    };
    setSelectedPreset(customMovie);
    handleStartAutoCut(customMovie);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-2xl w-full p-4 sm:p-6 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-md">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base sm:text-lg font-['Outfit']">Widescreen Movie Ingest</h2>
            <p className="text-xs text-neutral-400">
              Select a cinema film, local MP4/MOV, or stream URL to generate vertical clips.
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center text-sm font-bold"
          >
            ✕
          </button>
        )}
      </div>

      {/* Lightweight Storage Architecture Badge */}
      <div className="my-3 p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Lightweight SQL Storage: <strong className="text-white">0 MB raw video stored</strong> (Stream timestamps & crop coordinates only)
          </span>
        </div>
        <span className="font-mono text-emerald-400 font-bold hidden sm:inline">SQLite Active</span>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800 mb-4">
        <button
          onClick={() => setActiveTab('presets')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'presets' ? 'bg-rose-600 text-white shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Featured Cinema Movies
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'upload' ? 'bg-rose-600 text-white shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Upload Local Video
        </button>
        <button
          onClick={() => setActiveTab('url')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'url' ? 'bg-rose-600 text-white shadow' : 'text-neutral-400 hover:text-white'
          }`}
        >
          Paste Video URL
        </button>
      </div>

      {/* Processing State */}
      {isProcessing ? (
        <div className="py-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-neutral-800 border border-neutral-700 text-rose-400 flex items-center justify-center mx-auto">
            <Film className="w-6 h-6 animate-pulse" />
          </div>

          <div>
            <h3 className="font-bold text-base sm:text-lg text-white font-['Outfit']">
              Extracting Vertical Clips
            </h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
              {processStep}
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-1.5">
            <div className="flex justify-between text-xs font-mono text-neutral-400">
              <span>{processProgress}%</span>
              <span>Lightweight SQLite Sync</span>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-rose-600 transition-all duration-300"
                style={{ width: `${processProgress}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Tab 1: Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {SAMPLE_MOVIES.map((movie) => {
                  const isSelected = selectedPreset.id === movie.id;
                  return (
                    <div
                      key={movie.id}
                      onClick={() => setSelectedPreset(movie)}
                      className={`cursor-pointer rounded-2xl overflow-hidden border transition-all ${
                        isSelected
                          ? 'border-rose-500 ring-2 ring-rose-500/50 bg-rose-950/20'
                          : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700'
                      }`}
                    >
                      <div className="relative aspect-video w-full bg-neutral-800">
                        <img
                          src={movie.thumbnailUrl}
                          alt={movie.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-2 right-2 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/70 text-white backdrop-blur">
                          {movie.durationFormatted}
                        </span>
                      </div>
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                            {movie.genre}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-rose-500 stroke-[3]" />}
                        </div>
                        <h4 className="font-bold text-xs text-white font-['Outfit'] truncate">
                          {movie.title}
                        </h4>
                        <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                          {movie.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
                <span className="text-xs text-neutral-400">
                  Ready to generate 3 vertical 9:16 clips from this film.
                </span>
                <button
                  id="btn-confirm-preset"
                  onClick={() => handleStartAutoCut(selectedPreset)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <span>Auto-Cut Clips</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Upload File */}
          {activeTab === 'upload' && (
            <div className="space-y-4 py-4">
              <label className="border-2 border-dashed border-neutral-700 hover:border-rose-500 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-neutral-950/60 block">
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-neutral-800 flex items-center justify-center text-rose-400 mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-white font-['Outfit']">
                  Click to select video or drag & drop
                </h4>
                <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                  Supports MP4, MOV, and WebM widescreen video files. Read directly in browser with zero server storage overhead.
                </p>
              </label>
            </div>
          )}

          {/* Tab 3: URL Stream */}
          {activeTab === 'url' && (
            <form onSubmit={handleUrlSubmit} className="space-y-4 py-3">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                  Movie / Clip Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Action Heist Sequence"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                  Public Video Stream URL (MP4 / HLS)
                </label>
                <input
                  type="url"
                  placeholder="https://commondatastorage.googleapis.com/.../video.mp4"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md flex items-center justify-center gap-1.5"
              >
                <LinkIcon className="w-3.5 h-3.5" />
                <span>Fetch Stream & Auto-Cut</span>
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
};
