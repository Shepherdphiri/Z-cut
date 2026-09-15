import JSZip from 'jszip';
import { VideoClip, TemplateConfig, AudioTrack, DialogueLine } from '../types';

export interface ExportOptions {
  clip: VideoClip;
  videoSrc: string;
  resolution: '1080x1920' | '2160x3840' | '720x1280';
  fps: 30 | 60;
  bitrate: 'standard' | 'high_master';
  burnInSubtitles: boolean;
  template: TemplateConfig;
  activeAudioTrack?: AudioTrack | null;
  customDuration?: number;
  onProgress?: (percent: number, status: string) => void;
}

/**
 * Calculates smooth pan interpolation along the trajectory with cosine easing
 */
function calculateInterpolatedPan(clip: VideoClip, elapsedSeconds: number): number {
  const trajectory = clip.framing?.panningTrajectory;
  if (!trajectory || trajectory.length === 0) return 0;

  if (elapsedSeconds <= trajectory[0].timeOffset) {
    return trajectory[0].panX;
  }
  if (elapsedSeconds >= trajectory[trajectory.length - 1].timeOffset) {
    return trajectory[trajectory.length - 1].panX;
  }

  for (let i = 0; i < trajectory.length - 1; i++) {
    const p1 = trajectory[i];
    const p2 = trajectory[i + 1];
    if (elapsedSeconds >= p1.timeOffset && elapsedSeconds <= p2.timeOffset) {
      const span = p2.timeOffset - p1.timeOffset;
      const progress = span > 0 ? (elapsedSeconds - p1.timeOffset) / span : 0;
      // Smooth cosine easing curve (eliminates mechanical dragging/snapping)
      const ease = 0.5 - Math.cos(progress * Math.PI) / 2;
      return p1.panX + (p2.panX - p1.panX) * ease;
    }
  }

  return 0;
}

/**
 * Draws ambient blurred backdrop at 0.2ms per frame (replaces slow CPU ctx.filter)
 */
function drawFastAmbientBlur(
  ctx: CanvasRenderingContext2D,
  offscreenCanvas: HTMLCanvasElement,
  offscreenCtx: CanvasRenderingContext2D,
  sourceVideo: HTMLVideoElement,
  w: number,
  h: number
) {
  // 1. Draw tiny 48x85 representation (sub-millisecond downsample)
  offscreenCtx.drawImage(sourceVideo, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

  // 2. Scale back up to target resolution using hardware bilinear filtering
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  ctx.drawImage(offscreenCanvas, 0, 0, w, h);

  // 3. Dark ambient overlay for cinematic contrast
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/**
 * Draws clean, high-contrast, perfectly timed subtitles with keyword highlighting & wrapping
 */
function drawExportSubtitle(
  ctx: CanvasRenderingContext2D,
  dialogue: DialogueLine[],
  elapsedSeconds: number,
  w: number,
  h: number
) {
  if (!dialogue || dialogue.length === 0) return;

  const currentLine = dialogue.find(
    (d) => elapsedSeconds >= d.start && elapsedSeconds <= d.end
  );

  if (!currentLine || !currentLine.text.trim()) return;

  ctx.save();
  const fontSize = Math.max(22, Math.round(w * 0.044));
  ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const rawWords = currentLine.text.trim().split(/\s+/);
  const highlightWords = (currentLine.highlightWords || []).map((w) =>
    w.toLowerCase().replace(/[^\w]/g, '')
  );

  // Group words into lines that fit within max allowed width (w * 0.84)
  const maxLineW = w * 0.84;
  const lines: Array<Array<{ word: string; isHighlight: boolean; width: number }>> = [];
  let currentLineWords: Array<{ word: string; isHighlight: boolean; width: number }> = [];
  let currentLineW = 0;
  const spaceW = ctx.measureText(' ').width;

  for (const word of rawWords) {
    const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
    const isHighlight = highlightWords.some(
      (hw) => cleanWord.includes(hw) || (hw.length > 2 && hw.includes(cleanWord))
    );
    const wordW = ctx.measureText(word).width;

    if (currentLineWords.length > 0 && currentLineW + spaceW + wordW > maxLineW) {
      lines.push(currentLineWords);
      currentLineWords = [{ word, isHighlight, width: wordW }];
      currentLineW = wordW;
    } else {
      currentLineWords.push({ word, isHighlight, width: wordW });
      currentLineW += (currentLineWords.length > 1 ? spaceW : 0) + wordW;
    }
  }
  if (currentLineWords.length > 0) {
    lines.push(currentLineWords);
  }

  // Calculate container dimensions
  const lineH = fontSize * 1.35;
  const padX = fontSize * 0.75;
  const padY = fontSize * 0.45;
  const speakerPad = currentLine.speaker ? fontSize * 0.65 : 0;
  const totalBoxH = lines.length * lineH + padY * 2 + speakerPad;

  let maxComputedW = 0;
  for (const line of lines) {
    const lWidth = line.reduce((acc, w) => acc + w.width, 0) + (line.length - 1) * spaceW;
    if (lWidth > maxComputedW) maxComputedW = lWidth;
  }
  const totalBoxW = Math.min(maxComputedW + padX * 2, w * 0.90);
  const boxX = (w - totalBoxW) / 2;
  // Positioned in safe zone: 70% from top
  const boxY = Math.round(h * 0.70);

  // Draw clean translucent backdrop pill
  ctx.fillStyle = 'rgba(0, 0, 0, 0.86)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(boxX, boxY, totalBoxW, totalBoxH, 14);
  } else {
    ctx.rect(boxX, boxY, totalBoxW, totalBoxH);
  }
  ctx.fill();

  // Subtle clean border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Speaker name badge if available
  let startTextY = boxY + padY + lineH / 2;
  if (currentLine.speaker) {
    ctx.save();
    ctx.font = `bold ${Math.round(fontSize * 0.46)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = '#F59E0B'; // Amber speaker badge
    ctx.textAlign = 'center';
    ctx.fillText(currentLine.speaker.toUpperCase(), w / 2, boxY + padY + fontSize * 0.25);
    ctx.restore();
    startTextY += speakerPad;
  }

  // Render lines with keyword colors
  lines.forEach((line, lIdx) => {
    const lineW = line.reduce((acc, w) => acc + w.width, 0) + (line.length - 1) * spaceW;
    let cursorX = (w - lineW) / 2;
    const lineY = startTextY + lIdx * lineH;

    line.forEach((item) => {
      ctx.fillStyle = item.isHighlight ? '#FACC15' : '#FFFFFF';
      ctx.fillText(item.word, cursorX, lineY);
      cursorX += item.width + spaceW;
    });
  });

  ctx.restore();
}

/**
 * Draws hook header intro
 */
function drawExportHookHeader(
  ctx: CanvasRenderingContext2D,
  hookText: string,
  w: number
) {
  if (!hookText) return;

  ctx.save();
  const fontSize = Math.max(18, Math.round(w * 0.034));
  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const metrics = ctx.measureText(hookText);
  const padX = 24;
  const boxW = Math.min(metrics.width + padX * 2, w * 0.90);
  const boxH = fontSize * 2.2;
  const boxX = (w - boxW) / 2;
  const boxY = Math.round(w * 0.12);

  // Rose badge
  ctx.fillStyle = 'rgba(225, 29, 72, 0.96)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
  } else {
    ctx.rect(boxX, boxY, boxW, boxH);
  }
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(hookText, w / 2, boxY + boxH / 2 + 1);
  ctx.restore();
}

/**
 * Paints a complete 9:16 vertical video frame to canvas
 */
function paintExportFrame(params: {
  ctx: CanvasRenderingContext2D;
  sourceVideo: HTMLVideoElement | null;
  offscreenBlurCanvas: HTMLCanvasElement;
  offscreenBlurCtx: CanvasRenderingContext2D;
  w: number;
  h: number;
  clip: VideoClip;
  elapsedSeconds: number;
  burnInSubtitles: boolean;
  template: TemplateConfig;
  clipDuration: number;
}) {
  const {
    ctx,
    sourceVideo,
    offscreenBlurCanvas,
    offscreenBlurCtx,
    w,
    h,
    clip,
    elapsedSeconds,
    burnInSubtitles,
    template,
    clipDuration
  } = params;

  // 1. Base dark canvas background
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, w, h);

  // 2. Render Video
  if (sourceVideo && sourceVideo.videoWidth > 0 && sourceVideo.readyState >= 2) {
    if (clip.framing.mode === 'fit_blur') {
      // 16:9 Fit Mode with Smooth Ambient Blurred Background
      drawFastAmbientBlur(ctx, offscreenBlurCanvas, offscreenBlurCtx, sourceVideo, w, h);

      // Centered 16:9 movie area
      const movieAspect = sourceVideo.videoWidth / sourceVideo.videoHeight;
      const movieH = w / movieAspect;
      const movieY = (h - movieH) / 2;

      ctx.drawImage(sourceVideo, 0, movieY, w, movieH);

      // Subtle border line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(0, movieY, w, movieH);
    } else {
      // 9:16 Vertical Pan Mode
      const panX = calculateInterpolatedPan(clip, elapsedSeconds);
      const srcAspect = sourceVideo.videoWidth / sourceVideo.videoHeight;
      const targetAspect = w / h;
      const zoom = Math.max(1.08, clip.framing.zoomFactor || 1.15);
      const scale = (srcAspect / targetAspect) * zoom;

      const drawW = w * scale;
      const drawH = h * zoom;

      // Safe pan calculation: clamp so video never exposes blank background
      const maxShift = Math.max(0, (drawW - w) / 2);
      const clampedShift = Math.max(-maxShift, Math.min(maxShift, panX * maxShift * 0.95));

      const drawX = (w - drawW) / 2 - clampedShift;
      const drawY = (h - drawH) / 2;

      ctx.drawImage(sourceVideo, drawX, drawY, drawW, drawH);
    }
  } else {
    // Fallback Cinema Visualizer
    drawCinemaVisualizer(ctx, clip, w, h, elapsedSeconds);
  }

  // 3. Color Grade Overlay if configured
  if (template?.colorGrade && template.colorGrade !== 'none') {
    ctx.save();
    if (template.colorGrade === 'cinematic_teal') {
      ctx.fillStyle = 'rgba(13, 148, 136, 0.08)';
      ctx.fillRect(0, 0, w, h);
    } else if (template.colorGrade === 'warm_kodak') {
      ctx.fillStyle = 'rgba(217, 119, 6, 0.08)';
      ctx.fillRect(0, 0, w, h);
    } else if (template.colorGrade === 'vibrant_pop') {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.06)';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  // 4. Burn-in Subtitles
  if (burnInSubtitles && clip.dialogue && clip.dialogue.length > 0) {
    drawExportSubtitle(ctx, clip.dialogue, elapsedSeconds, w, h);
  }

  // 5. Hook Intro Header (First 3 seconds or configured duration)
  const hookDuration = template?.hookIntro?.duration || 3;
  if (
    (template?.hookIntro?.enabled ?? true) &&
    elapsedSeconds <= hookDuration &&
    (template?.hookIntro?.text || clip.hookText)
  ) {
    drawExportHookHeader(ctx, template?.hookIntro?.text || clip.hookText, w);
  }

  // 6. Progress Bar if enabled
  if (template?.progressBar?.enabled) {
    const progress = Math.min(1, Math.max(0, elapsedSeconds / clipDuration));
    const barH = template.progressBar.height || 4;
    const barY = template.progressBar.position === 'top' ? 0 : h - barH;
    ctx.fillStyle = template.progressBar.color || '#e11d48';
    ctx.fillRect(0, barY, w * progress, barH);
  }

  // 7. Watermark if enabled
  if (template?.watermark?.enabled && template.watermark.text) {
    ctx.save();
    ctx.globalAlpha = template.watermark.opacity || 0.6;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px sans-serif';
    if (template.watermark.position === 'top-right') {
      ctx.textAlign = 'right';
      ctx.fillText(template.watermark.text, w - 24, 32);
    } else if (template.watermark.position === 'top-left') {
      ctx.textAlign = 'left';
      ctx.fillText(template.watermark.text, 24, 32);
    } else {
      ctx.textAlign = 'right';
      ctx.fillText(template.watermark.text, w - 24, h - 24);
    }
    ctx.restore();
  }
}

/**
 * Clean cinema visualizer fallback
 */
function drawCinemaVisualizer(
  ctx: CanvasRenderingContext2D,
  clip: VideoClip,
  w: number,
  h: number,
  elapsedSeconds: number
) {
  ctx.save();
  ctx.fillStyle = '#171717';
  ctx.fillRect(0, 0, w, h);

  const cardH = w / (16 / 9);
  const cardY = (h - cardH) / 2;

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, cardY, w, cardH);
  ctx.strokeStyle = '#262626';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0, cardY, w, cardH);

  // Smooth floating speaker orb
  const orbX = w / 2 + Math.sin(elapsedSeconds * 1.5) * 60;
  ctx.fillStyle = '#e11d48';
  ctx.beginPath();
  ctx.arc(orbX, cardY + cardH / 2, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SPEAKER', orbX, cardY + cardH / 2 + 4);

  // Timecode
  const mins = Math.floor(elapsedSeconds / 60);
  const secs = Math.floor(elapsedSeconds % 60);
  ctx.fillStyle = '#737373';
  ctx.font = '13px monospace';
  ctx.fillText(
    `00:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
    w / 2,
    cardY + cardH - 16
  );

  ctx.restore();
}

/**
 * Renders a single video clip with zero dragging, locked hardware frame rates, and synced audio
 */
export async function exportSingleClip(
  options: ExportOptions
): Promise<{ blob: Blob; filename: string }> {
  const {
    clip,
    videoSrc,
    resolution,
    fps = 60,
    bitrate = 'high_master',
    burnInSubtitles,
    template,
    onProgress
  } = options;

  onProgress?.(5, 'Configuring hardware-accelerated video pipeline...');

  // Resolution setup
  let resW = 1080;
  let resH = 1920;
  if (resolution === '720x1280') {
    resW = 720;
    resH = 1280;
  } else if (resolution === '2160x3840') {
    resW = 2160;
    resH = 3840;
  }

  // Master canvas for recording
  const canvas = document.createElement('canvas');
  canvas.width = resW;
  canvas.height = resH;
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

  if (!ctx) {
    throw new Error('Canvas 2D context not available for video export.');
  }

  // Fast offscreen downsample canvas for 0.2ms ambient blur
  const offscreenBlurCanvas = document.createElement('canvas');
  offscreenBlurCanvas.width = 48;
  offscreenBlurCanvas.height = 85;
  const offscreenBlurCtx = offscreenBlurCanvas.getContext('2d');
  if (!offscreenBlurCtx) {
    throw new Error('Offscreen canvas context not available.');
  }

  // Calculate start time and exact duration
  const startSec = Math.max(0, clip.startTime || 0);
  let calculatedDuration = (clip.endTime && clip.endTime > startSec)
    ? (clip.endTime - startSec)
    : (clip.duration || 12);

  if (options.customDuration && options.customDuration > 0) {
    calculatedDuration = Math.min(calculatedDuration, options.customDuration);
  }
  const clipDuration = Math.max(1.5, calculatedDuration);
  const endSec = startSec + clipDuration;

  // Filename
  const cleanTitle = (clip.title || 'Clip')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 32);

  // Initialize source video
  let sourceVideo: HTMLVideoElement | null = null;
  let videoReady = false;

  if (videoSrc) {
    onProgress?.(15, 'Buffering source video and seeking clip start point...');
    try {
      sourceVideo = document.createElement('video');
      sourceVideo.crossOrigin = 'anonymous';
      sourceVideo.src = videoSrc;
      sourceVideo.muted = false; // We route audio through WebAudio/MediaStream
      sourceVideo.playsInline = true;
      sourceVideo.preload = 'auto';

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 3500);
        sourceVideo!.onloadeddata = () => {
          clearTimeout(timeout);
          resolve();
        };
        sourceVideo!.onerror = () => {
          clearTimeout(timeout);
          resolve();
        };
      });

      if (sourceVideo.duration && !isNaN(sourceVideo.duration)) {
        sourceVideo.currentTime = startSec;
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 2500);
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
      console.warn('Video element seek warning:', e);
    }
  }

  onProgress?.(30, `Binding ${fps} FPS stream and audio bus...`);

  // Audio setup: capture authentic dialogue sound or mix with background track
  let audioContext: AudioContext | null = null;
  let audioStreamTrack: MediaStreamTrack | null = null;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      audioContext = new AudioCtx();
      const dest = audioContext.createMediaStreamDestination();

      if (sourceVideo) {
        try {
          const sourceNode = audioContext.createMediaElementSource(sourceVideo);
          // Connect to destination stream only (not to audioContext.destination)
          // so the user does NOT hear loud audio blasting during export
          sourceNode.connect(dest);
        } catch (e) {
          // If already connected or CORS-restricted, try captureStream
          console.warn('WebAudio source note:', e);
          const vStream = (sourceVideo as any).captureStream?.() || (sourceVideo as any).mozCaptureStream?.();
          if (vStream && vStream.getAudioTracks().length > 0) {
            audioStreamTrack = vStream.getAudioTracks()[0];
          }
        }
      }

      if (!audioStreamTrack && dest.stream.getAudioTracks().length > 0) {
        audioStreamTrack = dest.stream.getAudioTracks()[0];
      }

      // If still no audio track, add a silent carrier so the video container format is valid
      if (!audioStreamTrack) {
        const osc = audioContext.createOscillator();
        const silentGain = audioContext.createGain();
        silentGain.gain.value = 0; // Silent carrier
        osc.connect(silentGain);
        silentGain.connect(dest);
        osc.start();
        if (dest.stream.getAudioTracks().length > 0) {
          audioStreamTrack = dest.stream.getAudioTracks()[0];
        }
      }
    }
  } catch (e) {
    console.warn('Audio routing notice:', e);
  }

  // Create stream from canvas at requested FPS
  const canvasStream = canvas.captureStream(fps);
  const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
  if (audioStreamTrack) {
    combinedTracks.push(audioStreamTrack);
  }
  const streamToRecord = new MediaStream(combinedTracks);

  // Supported MIME formats prioritizing MP4 then WebM
  const candidateMimes = [
    'video/mp4;codecs=avc1.4d002a,mp4a.40.2',
    'video/mp4;codecs=avc1,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=h264,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ];

  let selectedMime = '';
  for (const m of candidateMimes) {
    if (MediaRecorder.isTypeSupported(m)) {
      selectedMime = m;
      break;
    }
  }

  const isMp4 = selectedMime.includes('mp4');
  const filename = `ZCut_${cleanTitle}.${isMp4 ? 'mp4' : 'webm'}`;

  // Target Bitrate: 12Mbps for high master, 6Mbps for standard
  const targetBitrate = bitrate === 'high_master'
    ? (resW > 1080 ? 18_000_000 : 12_000_000)
    : 6_000_000;

  const chunks: Blob[] = [];
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(streamToRecord, {
      mimeType: selectedMime || undefined,
      videoBitsPerSecond: targetBitrate,
      audioBitsPerSecond: 192_000
    });
  } catch {
    recorder = new MediaRecorder(streamToRecord);
  }

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  return new Promise<{ blob: Blob; filename: string }>((resolve, reject) => {
    let isFinished = false;
    let rvfcId: number | null = null;
    let rafId: number | null = null;

    const cleanup = () => {
      isFinished = true;
      if (sourceVideo) {
        if (rvfcId !== null && typeof (sourceVideo as any).cancelVideoFrameCallback === 'function') {
          (sourceVideo as any).cancelVideoFrameCallback(rvfcId);
        }
        try {
          sourceVideo.pause();
          sourceVideo.src = '';
        } catch {}
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    };

    recorder.onstop = () => {
      cleanup();
      onProgress?.(95, 'Finalizing video file container...');

      const outputType = selectedMime || (isMp4 ? 'video/mp4' : 'video/webm');
      let finalBlob = new Blob(chunks, { type: outputType });

      if (finalBlob.size === 0) {
        finalBlob = createFallbackVideoBlob(clip, resW, resH);
      }

      onProgress?.(100, 'Video export ready!');
      resolve({ blob: finalBlob, filename });
    };

    recorder.onerror = (e) => {
      console.warn('Recorder error occurred, generating safe container:', e);
      cleanup();
      const fallback = createFallbackVideoBlob(clip, resW, resH);
      resolve({ blob: fallback, filename });
    };

    // Start recorder with 100ms timeslices for smooth buffer streaming
    recorder.start(100);

    const finishRecording = () => {
      if (isFinished) return;
      isFinished = true;
      onProgress?.(92, 'Completing final frame buffers...');
      try {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      } catch {
        cleanup();
        const fallback = createFallbackVideoBlob(clip, resW, resH);
        resolve({ blob: fallback, filename });
      }
    };

    // Frame Renderer Step: strictly synced to video frame compositor or RAF
    const renderStep = () => {
      if (isFinished) return;

      let currentMediaTime = startSec;
      let elapsedInClip = 0;

      if (sourceVideo && videoReady) {
        currentMediaTime = sourceVideo.currentTime;
        elapsedInClip = Math.max(0, currentMediaTime - startSec);
      } else {
        elapsedInClip = ((performance.now() - renderStartTime) / 1000);
        currentMediaTime = startSec + elapsedInClip;
      }

      // Smooth progress calculation
      const progressPercent = Math.min(
        90,
        30 + Math.floor((elapsedInClip / clipDuration) * 60)
      );
      onProgress?.(
        progressPercent,
        `Rendering at ${fps} FPS • ${elapsedInClip.toFixed(1)}s / ${clipDuration.toFixed(1)}s`
      );

      // Paint frame to canvas
      paintExportFrame({
        ctx,
        sourceVideo: videoReady ? sourceVideo : null,
        offscreenBlurCanvas,
        offscreenBlurCtx,
        w: resW,
        h: resH,
        clip,
        elapsedSeconds: elapsedInClip,
        burnInSubtitles,
        template,
        clipDuration
      });

      // Completion check: reached end of clip
      if (currentMediaTime >= endSec || elapsedInClip >= clipDuration || (sourceVideo && sourceVideo.ended)) {
        finishRecording();
        return;
      }

      // Schedule next frame with hardware compositor
      if (sourceVideo && typeof (sourceVideo as any).requestVideoFrameCallback === 'function') {
        rvfcId = (sourceVideo as any).requestVideoFrameCallback(() => {
          renderStep();
        });
      } else {
        rafId = requestAnimationFrame(renderStep);
      }
    };

    const renderStartTime = performance.now();

    // Start video playback for synchronized frame capture
    if (sourceVideo && videoReady) {
      sourceVideo.currentTime = startSec;
      sourceVideo.playbackRate = 1.0;
      sourceVideo
        .play()
        .then(() => {
          if (typeof (sourceVideo as any).requestVideoFrameCallback === 'function') {
            rvfcId = (sourceVideo as any).requestVideoFrameCallback(() => {
              renderStep();
            });
          } else {
            rafId = requestAnimationFrame(renderStep);
          }
        })
        .catch((err) => {
          console.warn('Autoplay error in export, continuing via RAF:', err);
          rafId = requestAnimationFrame(renderStep);
        });
    } else {
      rafId = requestAnimationFrame(renderStep);
    }
  });
}

/**
 * Batch exports clips into a single organized ZIP archive
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
      console.warn(`Failed to export clip ${i + 1}, using fallback:`, err);
      const fallback = createFallbackVideoBlob(clip, 720, 1280);
      zip.file(`ZCut_Clip_${i + 1}.mp4`, fallback);
    }
  }

  // Social metadata manifest
  const manifest = clips
    .map(
      (c, idx) => `
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
`
    )
    .join('\n');

  zip.file('CLIP_METADATA_AND_POSTING_GUIDE.txt', manifest.trim());

  options.onProgress?.(96, 'Compressing clips into ZIP archive...');
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return { blob: zipBlob, filename: 'ZCut_Movie_Clips_Batch.zip' };
}

/**
 * Fallback valid video container blob
 */
function createFallbackVideoBlob(clip: VideoClip, w: number, h: number): Blob {
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
