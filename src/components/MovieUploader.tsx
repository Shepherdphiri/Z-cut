import React, { useState, useEffect } from 'react';
import { 
  Film, 
  UploadCloud, 
  Database, 
  HardDrive,
  Trash2,
  Sparkles,
  Play,
  Check,
  AlertCircle
} from 'lucide-react';
import { MovieSource, VideoClip } from '../types';
import { processLocalVideoFile, generateLocalTestMovie } from '../utils/localMovieProcessor';
import { 
  listLocalStoredVideos, 
  getLocalVideoFromStorage, 
  deleteLocalStoredVideo,
  StoredLocalVideoRecord
} from '../utils/localVideoStorage';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<string>('');
  const [processProgress, setProcessProgress] = useState(0);
  const [storedVideos, setStoredVideos] = useState<Array<Omit<StoredLocalVideoRecord, 'blob'>>>([]);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadStoredVideoList();
  }, []);

  const loadStoredVideoList = async () => {
    try {
      const list = await listLocalStoredVideos();
      setStoredVideos(list);
    } catch (e) {
      console.warn('Failed to list stored local videos:', e);
    }
  };

  const handleSelectLocalStoredVideo = async (recordMeta: Omit<StoredLocalVideoRecord, 'blob'>) => {
    try {
      setIsProcessing(true);
      setProcessProgress(30);
      setProcessStep('Retrieving video stream from browser local storage (IndexedDB)...');

      const fullRecord = await getLocalVideoFromStorage(recordMeta.id);
      if (!fullRecord) {
        throw new Error('Video file was not found in browser storage.');
      }

      setProcessProgress(70);
      setProcessStep('Loading vertical 9:16 cuts and keyframes...');

      const { movie, clips } = await processLocalVideoFile(fullRecord.blob, fullRecord.name, 60);

      setProcessProgress(100);
      onMovieSelected(movie, clips);
      if (onClose) onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading stored video');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteStoredVideo = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteLocalStoredVideo(id);
      await loadStoredVideoList();
    } catch (err) {
      console.warn('Error deleting video:', err);
    }
  };

  const handleFileProcess = async (file: File) => {
    if (!file) return;
    setErrorMessage(null);
    setIsProcessing(true);
    setProcessProgress(20);
    setProcessStep(`Reading local file: ${file.name}...`);

    try {
      await new Promise(r => setTimeout(r, 200));
      setProcessProgress(45);
      setProcessStep('Inspecting video dimensions, duration & capturing frame thumbnail...');

      const { movie, clips } = await processLocalVideoFile(file, undefined, 60);

      setProcessProgress(80);
      setProcessStep('Generating 1-minute vertical clips covering entire movie timeline...');

      // Save metadata to SQLite
      try {
        await fetch('/api/db/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project: {
              id: movie.id,
              title: movie.title,
              videoUrl: movie.videoUrl,
              thumbnailUrl: movie.thumbnailUrl,
              durationFormatted: movie.durationFormatted,
              durationSeconds: movie.durationSeconds,
              genre: movie.genre
            },
            clips: clips
          })
        });
      } catch (e) {
        console.warn('Could not sync to SQLite:', e);
      }

      setProcessProgress(100);
      setProcessStep('Done! Ready to edit.');
      await loadStoredVideoList();
      onMovieSelected(movie, clips);
      if (onClose) onClose();
    } catch (err: any) {
      console.error('File process failed:', err);
      setErrorMessage(err.message || 'Failed to process local video file. Make sure it is an MP4, MOV, or WebM file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleGenerateLocalTest = async () => {
    setErrorMessage(null);
    setIsProcessing(true);
    setProcessProgress(25);
    setProcessStep('Rendering 16:9 cinema test stream in browser memory...');

    try {
      const { movie, clips } = await generateLocalTestMovie();
      setProcessProgress(80);
      setProcessStep('Calculating 9:16 focal trajectories & speaker tracking...');

      // Sync metadata to SQLite
      try {
        await fetch('/api/db/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project: {
              id: movie.id,
              title: movie.title,
              videoUrl: movie.videoUrl,
              thumbnailUrl: movie.thumbnailUrl,
              durationFormatted: movie.durationFormatted,
              durationSeconds: movie.durationSeconds,
              genre: movie.genre
            },
            clips: clips
          })
        });
      } catch (e) {
        console.warn('Could not sync to SQLite:', e);
      }

      setProcessProgress(100);
      await loadStoredVideoList();
      onMovieSelected(movie, clips);
      if (onClose) onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate local test movie.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-xl w-full p-4 sm:p-6 text-white shadow-2xl relative max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-600 flex items-center justify-center text-white shadow-md">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base sm:text-lg font-['Outfit']">Load Movie from Local Storage</h2>
            <p className="text-xs text-neutral-400">
              Only local video files from your device. Zero external URLs or servers.
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center text-sm font-bold transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Storage Architecture Badge */}
      <div className="my-3 p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Storage: <strong className="text-white">100% Local Device Storage</strong> (IndexedDB + SQLite)
          </span>
        </div>
        <span className="font-mono text-emerald-400 font-bold text-[11px] hidden sm:inline">Offline Ready</span>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Processing State */}
      {isProcessing ? (
        <div className="py-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-xl bg-neutral-800 border border-neutral-700 text-rose-500 flex items-center justify-center mx-auto">
            <Film className="w-6 h-6" />
          </div>

          <div>
            <h3 className="font-bold text-base sm:text-lg text-white font-['Outfit']">
              Processing Local Movie
            </h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              {processStep}
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-1.5 px-4">
            <div className="flex justify-between text-xs font-mono text-neutral-400">
              <span>{processProgress}%</span>
              <span>Local Storage Ingest</span>
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
        <div className="space-y-4 pt-2">
          {/* Main Dropzone / File Picker */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all bg-neutral-950/60 ${
              dragActive
                ? 'border-rose-500 bg-rose-950/20 scale-[0.99]'
                : 'border-neutral-700 hover:border-neutral-500'
            }`}
          >
            <input
              type="file"
              id="local-video-file-input"
              accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <label
              htmlFor="local-video-file-input"
              className="cursor-pointer flex flex-col items-center justify-center w-full h-full"
            >
              <div className="w-14 h-14 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-rose-400 mb-3 shadow-md group-hover:scale-105 transition-transform">
                <UploadCloud className="w-7 h-7" />
              </div>

              <h3 className="font-bold text-sm sm:text-base text-white font-['Outfit']">
                Select Video File from Computer or Phone
              </h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                Drag and drop your MP4, WebM, or MOV widescreen file here, or click to browse local files.
              </p>

              <div className="mt-4 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg transition-transform active:scale-95">
                Browse Local Files
              </div>
            </label>
          </div>

          {/* Quick Local Generator Button */}
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-left">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-neutral-200">No video file on hand right now?</h4>
                <p className="text-[11px] text-neutral-400">
                  Generate a 12-second local widescreen test clip in browser memory.
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerateLocalTest}
              className="w-full sm:w-auto shrink-0 px-3 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
            >
              Create Local Test Video
            </button>
          </div>

          {/* Stored Videos Section - Grid Layout */}
          {storedVideos.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-rose-400" />
                <span>Previously Saved in Local Storage ({storedVideos.length})</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {storedVideos.map((item) => {
                  const isCurrent = currentMovieId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectLocalStoredVideo(item)}
                      className={`group relative rounded-xl border p-2 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] ${
                        isCurrent
                          ? 'border-rose-500 bg-rose-950/30 ring-1 ring-rose-500/50 shadow-md'
                          : 'border-neutral-800 bg-neutral-950/80 hover:border-neutral-700 hover:bg-neutral-900'
                      }`}
                    >
                      {/* Movie Thumbnail Card */}
                      <div className="w-full aspect-video rounded-lg bg-neutral-900 overflow-hidden border border-neutral-800 relative mb-2">
                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film className="w-5 h-5 text-neutral-600" />
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[9px] font-mono font-bold text-neutral-200">
                          {item.durationFormatted}
                        </span>
                        {isCurrent && (
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-rose-600 text-[9px] font-bold text-white shadow">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Info & Title */}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate font-['Outfit']">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                          {(item.size / (1024 * 1024)).toFixed(1)} MB • IndexedDB
                        </p>
                      </div>

                      {/* Action Row */}
                      <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                        {isCurrent ? (
                          <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[3]" /> Loaded
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectLocalStoredVideo(item)}
                            className="px-2.5 py-1 rounded-md bg-neutral-800 hover:bg-rose-600 hover:text-white text-[10px] font-bold text-neutral-200 transition-colors"
                          >
                            Load Movie
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteStoredVideo(e, item.id)}
                          title="Delete from local storage"
                          className="p-1 rounded-md hover:bg-neutral-800 text-neutral-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
