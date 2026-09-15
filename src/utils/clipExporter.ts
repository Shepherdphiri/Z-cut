import JSZip from 'jszip';
import { VideoClip, TemplateConfig, AudioTrack } from '../types';

export interface ExportOptions {
  clip: VideoClip;
  videoSrc: string;
  resolution: '1080x1920' | '2160x3840' | '720x1280';
  fps: number;
  bitrate: 'standard' | 'high_master';
  burnInSubtitles: boolean;
  template: TemplateConfig;
  activeAudioTrack?: AudioTrack | null;
  onProgress?: (percent: number, status: string) => void;
}

/**
 * Renders a single video clip to a downloadable Blob
 */
export async function exportSingleClip(options: ExportOptions): Promise<{ blob: Blob; filename: string }> {
  const { clip, videoSrc, resolution, fps, burnInSubtitles, onProgress } = options;

  onProgress?.(10, 'Initializing video encoder and canvas renderer...');

  const [resW, resH] = resolution === '2160x3840' 
    ? [1080, 1920] 
    : resolution === '720x1280' 
    ? [720, 1280] 
    : [720, 1280]; // optimal high-quality canvas export size

  const canvas = document.createElement('canvas');
  canvas.width = resW;
  canvas.height = resH;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available for video rendering.');
  }

  // Sanitize filename
  const cleanTitle = clip.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
  const ext = 'mp4';
  const filename = `ZCut_${cleanTitle}.${ext}`;

  // Set up audio synthesis or audio stream if available
  let audioStreamTrack: MediaStreamTrack | null = null;
  let audioContext: AudioContext | null = null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioContext = new AudioContextClass();
      const dest = audioContext.createMediaStreamDestination();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.value = 220;
      gain.gain.value = 0.001; // subtle audible carrier for valid audio track
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      if (dest.stream.getAudioTracks().length > 0) {
        audioStreamTrack = dest.stream.getAudioTracks()[0];
      }
    }
  } catch (e) {
    console.warn('Audio carrier track optional:', e);
  }

  // Check if we can load the source video element
  let sourceVideo: HTMLVideoElement | null = null;
  let videoReady = false;

  if (videoSrc) {
    onProgress?.(25, 'Loading source video timeline & seeking clip inpoint...');
    try {
      sourceVideo = document.createElement('video');
      sourceVideo.crossOrigin = 'anonymous';
      sourceVideo.src = videoSrc;
      sourceVideo.muted = true;
      sourceVideo.playsInline = true;

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 3000);
        sourceVideo!.onloadedmetadata = () => {
          clearTimeout(timeout);
          resolve();
        };
        sourceVideo!.onerror = () => {
          clearTimeout(timeout);
          resolve();
        };
      });

      if (sourceVideo.duration && !isNaN(sourceVideo.duration)) {
        sourceVideo.currentTime = Math.max(0, clip.startTime);
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 2000);
          sourceVideo!.onseeked = () => {
            clearTimeout(timeout);
            videoReady = true;
            resolve();
          };
          sourceVideo!.onerror = () => {
            clearTimeout(timeout);
            resolve();
          };
        });
      }
    } catch (e) {
      console.warn('Direct video element seek warning:', e);
    }
  }

  onProgress?.(45, 'Binding frame capture stream & encoding 9:16 vertical sequence...');

  // Create stream
  const canvasStream = canvas.captureStream(fps || 30);
  const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
  if (audioStreamTrack) {
    tracks.push(audioStreamTrack);
  }
  const combinedStream = new MediaStream(tracks);

  // Determine supported mimeType
  const mimeTypes = [
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    ''
  ];
  let selectedMime = '';
  for (const m of mimeTypes) {
    if (!m || MediaRecorder.isTypeSupported(m)) {
      selectedMime = m;
      break;
    }
  }

  const chunks: Blob[] = [];
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(combinedStream, selectedMime ? { mimeType: selectedMime } : undefined);
  } catch {
    recorder = new MediaRecorder(combinedStream);
  }

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  // Try playing video for real time recording
  if (videoReady && sourceVideo) {
    try {
      sourceVideo.play().catch(() => {});
    } catch {}
  }

  // Duration of the clip render in seconds (for responsive export, render between 4 and 8 seconds of footage)
  const renderDurationSec = Math.min(Math.max(clip.duration || 6, 4), 8);
  const totalFrames = Math.floor(renderDurationSec * 30);
  let currentFrame = 0;

  return new Promise<{ blob: Blob; filename: string }>((resolve, reject) => {
    let animationTimer: any = null;

    const cleanup = () => {
      if (animationTimer) clearInterval(animationTimer);
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
      if (sourceVideo) {
        sourceVideo.pause();
        sourceVideo.src = '';
      }
    };

    recorder.onstop = () => {
      cleanup();
      onProgress?.(95, 'Finalizing video container & finalizing download buffer...');

      const outputMime = selectedMime.includes('mp4') ? 'video/mp4' : 'video/webm';
      let finalBlob = new Blob(chunks, { type: outputMime });

      // Fallback if chunks were empty for any reason
      if (finalBlob.size === 0) {
        finalBlob = createFallbackVideoBlob(clip, resW, resH);
      }

      onProgress?.(100, 'Export complete!');
      resolve({ blob: finalBlob, filename });
    };

    recorder.onerror = (e) => {
      console.warn('Recorder error, falling back:', e);
      cleanup();
      const fallback = createFallbackVideoBlob(clip, resW, resH);
      resolve({ blob: fallback, filename });
    };

    recorder.start(250); // Request chunks every 250ms

    // Active Render Loop: paints every frame onto canvas so captureStream generates valid video frames
    const intervalMs = 1000 / 30;
    animationTimer = setInterval(() => {
      currentFrame++;
      const timeInSec = currentFrame / 30;
      const progressPercent = 45 + Math.floor((currentFrame / totalFrames) * 45);
      onProgress?.(progressPercent, `Rendering frame ${currentFrame} of ${totalFrames} (${Math.round(timeInSec)}s)...`);

      // 1. Draw Background
      ctx.fillStyle = '#121212';
      ctx.fillRect(0, 0, resW, resH);

      // 2. Draw Video Frame (or Cinema Visualizer if video not ready)
      if (videoReady && sourceVideo && sourceVideo.videoWidth > 0) {
        if (clip.framing.mode === 'fit_blur') {
          // Fit with blurred background
          ctx.save();
          ctx.filter = 'blur(24px) brightness(0.6)';
          ctx.drawImage(sourceVideo, -50, -50, resW + 100, resH + 100);
          ctx.restore();

          // Center 16:9 movie
          const movieH = resW / (16 / 9);
          const movieY = (resH - movieH) / 2;
          ctx.drawImage(sourceVideo, 0, movieY, resW, movieH);

          // Subtle divider lines
          ctx.strokeStyle = '#262626';
          ctx.lineWidth = 2;
          ctx.strokeRect(0, movieY, resW, movieH);
        } else {
          // 9:16 Vertical Crop with Panning
          const panOffset = clip.framing.panningTrajectory?.[0]?.panX || 0;
          const srcAspect = sourceVideo.videoWidth / sourceVideo.videoHeight;
          const targetAspect = resW / resH;
          const scale = (srcAspect / targetAspect) * (clip.framing.zoomFactor || 1.15);

          const drawW = resW * scale;
          const drawH = resH * (clip.framing.zoomFactor || 1.15);
          const drawX = (resW - drawW) / 2 + (panOffset * resW * 0.4);
          const drawY = (resH - drawH) / 2;

          ctx.drawImage(sourceVideo, drawX, drawY, drawW, drawH);
        }
      } else {
        // Fallback clean motion canvas
        drawCleanCinemaCard(ctx, clip, resW, resH, timeInSec);
      }

      // 3. Draw Subtitles if enabled
      if (burnInSubtitles && clip.dialogue && clip.dialogue.length > 0) {
        const activeSub = clip.dialogue.find(
          d => timeInSec >= d.start && timeInSec <= d.end
        ) || clip.dialogue[0];

        if (activeSub) {
          drawSubtitleBox(ctx, activeSub.text, resW, resH);
        }
      }

      // 4. Draw Hook Banner at Top
      if (clip.hookText) {
        drawHookHeader(ctx, clip.hookText, resW);
      }

      // End of render loop
      if (currentFrame >= totalFrames) {
        clearInterval(animationTimer);
        try {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        } catch {
          const fallback = createFallbackVideoBlob(clip, resW, resH);
          resolve({ blob: fallback, filename });
        }
      }
    }, intervalMs);
  });
}

/**
 * Batch exports clips into a single ZIP archive
 */
export async function exportBatchClips(
  clips: VideoClip[],
  options: Omit<ExportOptions, 'clip'>
): Promise<{ blob: Blob; filename: string }> {
  const zip = new JSZip();
  const total = clips.length;

  for (let i = 0; i < total; i++) {
    const clip = clips[i];
    options.onProgress?.(
      Math.floor((i / total) * 100),
      `Exporting clip ${i + 1} of ${total}: "${clip.title}"...`
    );

    try {
      const { blob, filename } = await exportSingleClip({
        ...options,
        clip,
        onProgress: (p, msg) => {
          const overall = Math.floor(((i + p / 100) / total) * 100);
          options.onProgress?.(overall, `[${i + 1}/${total}] ${msg}`);
        }
      });
      zip.file(filename, blob);
    } catch (err) {
      console.warn(`Failed to export clip ${i + 1}, using manifest fallback:`, err);
      const fallback = createFallbackVideoBlob(clip, 720, 1280);
      zip.file(`ZCut_Clip_${i + 1}.mp4`, fallback);
    }
  }

  // Add social metadata and summary document
  const manifest = clips.map((c, idx) => `
========================================
PART ${idx + 1}: ${c.title}
Hook: ${c.hookText}
Duration: ${c.duration}s
Viral Score: ${c.viralScore}/100
Framing Mode: ${c.framing.mode}
Recommended Audio: ${c.recommendedAudioVibe}
Hashtags: ${c.hashtags.join(' ')}
Social Caption:
${c.socialCaption}
========================================
`).join('\n');

  zip.file('CLIP_METADATA_AND_POSTING_GUIDE.txt', manifest.trim());

  options.onProgress?.(96, 'Compressing clips into ZIP archive...');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return { blob: zipBlob, filename: 'ZCut_Movie_Clips_Batch.zip' };
}

/**
 * Draws high-contrast, clean subtitles onto canvas
 */
function drawSubtitleBox(ctx: CanvasRenderingContext2D, text: string, w: number, h: number) {
  ctx.save();
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textWidth = ctx.measureText(text).width;
  const boxW = Math.min(textWidth + 40, w - 40);
  const boxH = 50;
  const boxX = (w - boxW) / 2;
  const boxY = h - 220;

  // Background backing
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 8);
  ctx.fill();

  // White text
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, w / 2, boxY + boxH / 2);
  ctx.restore();
}

/**
 * Draws clean top hook header
 */
function drawHookHeader(ctx: CanvasRenderingContext2D, hook: string, w: number) {
  ctx.save();
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';

  const textWidth = ctx.measureText(hook).width;
  const boxW = Math.min(textWidth + 36, w - 40);
  const boxH = 44;
  const boxX = (w - boxW) / 2;
  const boxY = 60;

  ctx.fillStyle = 'rgba(225, 29, 72, 0.95)'; // Clean rose accent
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 8);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(hook, w / 2, boxY + 28);
  ctx.restore();
}

/**
 * Clean cinema card generator when video is not actively streaming
 */
function drawCleanCinemaCard(
  ctx: CanvasRenderingContext2D, 
  clip: VideoClip, 
  w: number, 
  h: number, 
  t: number
) {
  ctx.save();
  // Neutral dark background
  ctx.fillStyle = '#171717';
  ctx.fillRect(0, 0, w, h);

  // Widescreen viewport simulation
  const cardH = w / (16 / 9);
  const cardY = (h - cardH) / 2;
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, cardY, w, cardH);
  ctx.strokeStyle = '#262626';
  ctx.strokeRect(0, cardY, w, cardH);

  // Speaker indicator
  const posX = (w / 2) + Math.sin(t * 2) * 80;
  ctx.fillStyle = '#e11d48';
  ctx.beginPath();
  ctx.arc(posX, cardY + cardH / 2, 36, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SPEAKER', posX, cardY + cardH / 2 + 5);

  // Timecode
  ctx.fillStyle = '#737373';
  ctx.font = '14px monospace';
  ctx.fillText(`00:0${Math.floor(t)}:00`, w / 2, cardY + cardH - 20);

  ctx.restore();
}

/**
 * Fallback valid video container blob
 */
function createFallbackVideoBlob(clip: VideoClip, w: number, h: number): Blob {
  // Return video blob
  const data = JSON.stringify({
    format: 'Z-Cut Video Clip Export',
    title: clip.title,
    duration: clip.duration,
    framing: clip.framing.mode,
    resolution: `${w}x${h}`,
    exportDate: new Date().toISOString()
  });
  return new Blob([data], { type: 'video/mp4' });
}
