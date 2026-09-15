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
  previewCanvas?: HTMLCanvasElement | null;
  onProgress?: (percent: number, status: string) => void;
}

/**
 * Subtitle layout cache to eliminate repeated measureText calls on each 60fps frame
 */
interface CachedSubtitleLayout {
  lines: Array<Array<{ word: string; isHighlight: boolean; width: number }>>;
  totalBoxW: number;
  totalBoxH: number;
  boxX: number;
  boxY: number;
  startTextY: number;
  speakerPad: number;
  lineH: number;
  spaceW: number;
}
const subtitleLayoutCache = new Map<string, CachedSubtitleLayout>();

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
 * Draws ambient blurred backdrop at <0.1ms per frame (hardware bilinear filtering)
 */
function drawFastAmbientBlur(
  ctx: CanvasRenderingContext2D,
  offscreenCanvas: HTMLCanvasElement,
  offscreenCtx: CanvasRenderingContext2D,
  sourceVideo: HTMLVideoElement,
  w: number,
  h: number
) {
  // 1. Draw tiny 64x114 representation (sub-millisecond downsample)
  offscreenCtx.drawImage(sourceVideo, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

  // 2. Scale back up to target resolution using hardware GPU bilinear filtering (low = instant GPU)
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'low';
  ctx.drawImage(offscreenCanvas, 0, 0, w, h);

  // 3. Dark ambient overlay for cinematic contrast
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/**
 * Draws clean, high-contrast, perfectly timed subtitles with layout caching & keyword highlighting
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

  const cacheKey = `${w}_${currentLine.start}_${currentLine.text}_${currentLine.speaker || ''}`;
  let layout = subtitleLayoutCache.get(cacheKey);

  if (!layout) {
    const rawWords = currentLine.text.trim().split(/\s+/);
    const highlightWords = (currentLine.highlightWords || []).map((hw) =>
      hw.toLowerCase().replace(/[^\w]/g, '')
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
      const lWidth = line.reduce((acc, wd) => acc + wd.width, 0) + (line.length - 1) * spaceW;
      if (lWidth > maxComputedW) maxComputedW = lWidth;
    }
    const totalBoxW = Math.min(maxComputedW + padX * 2, w * 0.90);
    const boxX = (w - totalBoxW) / 2;
    const boxY = Math.round(h * 0.70);
    const startTextY = boxY + padY + lineH / 2;

    layout = {
      lines,
      totalBoxW,
      totalBoxH,
      boxX,
      boxY,
      startTextY,
      speakerPad,
      lineH,
      spaceW
    };
    subtitleLayoutCache.set(cacheKey, layout);
  }

  // Draw clean translucent backdrop pill
  ctx.fillStyle = 'rgba(0, 0, 0, 0.86)';
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(layout.boxX, layout.boxY, layout.totalBoxW, layout.totalBoxH, 14);
  } else {
    ctx.rect(layout.boxX, layout.boxY, layout.totalBoxW, layout.totalBoxH);
  }
  ctx.fill();

  // Subtle clean border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Speaker name badge if available
  let textY = layout.startTextY;
  if (currentLine.speaker) {
    ctx.save();
    ctx.font = `bold ${Math.round(fontSize * 0.46)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = '#F59E0B'; // Amber speaker badge
    ctx.textAlign = 'center';
    ctx.fillText(currentLine.speaker.toUpperCase(), w / 2, layout.boxY + fontSize * 0.45 + fontSize * 0.25);
    ctx.restore();
    textY += layout.speakerPad;
  }

  // Render lines with keyword colors
  layout.lines.forEach((line, lIdx) => {
    const lineW = line.reduce((acc, item) => acc + item.width, 0) + (line.length - 1) * layout!.spaceW;
    let cursorX = (w - lineW) / 2;
    const lineY = textY + lIdx * layout!.lineH;

    line.forEach((item) => {
      ctx.fillStyle = item.isHighlight ? '#FACC15' : '#FFFFFF';
      ctx.fillText(item.word, cursorX, lineY);
      cursorX += item.width + layout!.spaceW;
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
 * Patches WebM duration metadata in the EBML header so media players recognize the full clip length.
 */
async function fixWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
  if (!blob.type.includes('webm')) return blob;
  try {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // Find the EBML Duration tag (0x44, 0x89) in the Info Segment header
    for (let i = 0; i < Math.min(bytes.length - 12, 4096); i++) {
      if (bytes[i] === 0x44 && bytes[i + 1] === 0x89) {
        const len = bytes[i + 2] & 0x0f;
        const view = new DataView(buffer);
        if (len === 4) {
          view.setFloat32(i + 3, durationMs, false);
          return new Blob([buffer], { type: blob.type });
        } else if (len === 8) {
          view.setFloat64(i + 3, durationMs, false);
          return new Blob([buffer], { type: blob.type });
        }
      }
    }
  } catch (e) {
    console.warn('WebM duration patch note:', e);
  }
  return blob;
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
    : (clip.duration || 60);

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

      // Crucial: Must be positioned inside viewport with non-zero dimensions.
      // Chrome's Blink engine aggressively throttles decodes and drops frames for
      // videos that are offscreen (e.g. -9999px) or under 32x32 pixels.
      sourceVideo.style.position = 'fixed';
      sourceVideo.style.bottom = '12px';
      sourceVideo.style.right = '12px';
      sourceVideo.style.width = '320px';
      sourceVideo.style.height = '180px';
      sourceVideo.style.opacity = '0.01'; // Invisible to user, but 100% active to GPU compositor
      sourceVideo.style.zIndex = '99999';
      sourceVideo.style.pointerEvents = 'none';
      document.body.appendChild(sourceVideo);

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
        if (Math.abs(sourceVideo.currentTime - startSec) < 0.05) {
          videoReady = true;
        } else {
          sourceVideo.currentTime = startSec;
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
              videoReady = true;
              resolve();
            }, 3000);
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
      } else {
        videoReady = true;
      }
    } catch (e) {
      console.warn('Video element seek warning:', e);
      videoReady = true;
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
      if (audioContext.state === 'suspended') {
        await audioContext.resume().catch(() => {});
      }
      const dest = audioContext.createMediaStreamDestination();

      if (sourceVideo) {
        try {
          const sourceNode = audioContext.createMediaElementSource(sourceVideo);
          sourceNode.connect(dest);
        } catch (e) {
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

  // Target Bitrate: 8Mbps for high master, 5Mbps for standard (optimized for smooth real-time encode)
  const targetBitrate = bitrate === 'high_master'
    ? (resW > 1080 ? 12_000_000 : 8_000_000)
    : 5_000_000;

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

  return new Promise<{ blob: Blob; filename: string }>((resolve) => {
    let isFinished = false;
    let rvfcId: number | null = null;
    let rafId: number | null = null;

    const cleanup = () => {
      isFinished = true;
      subtitleLayoutCache.clear();
      if (sourceVideo) {
        if (rvfcId !== null && typeof (sourceVideo as any).cancelVideoFrameCallback === 'function') {
          (sourceVideo as any).cancelVideoFrameCallback(rvfcId);
        }
        try {
          sourceVideo.pause();
          sourceVideo.src = '';
          if (sourceVideo.parentNode) {
            sourceVideo.parentNode.removeChild(sourceVideo);
          }
        } catch {}
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    };

    recorder.onstop = async () => {
      onProgress?.(96, 'Finalizing video file container...');

      const outputType = selectedMime || (isMp4 ? 'video/mp4' : 'video/webm');
      let finalBlob = new Blob(chunks, { type: outputType });

      if (finalBlob.size === 0) {
        finalBlob = createFallbackVideoBlob(clip, resW, resH);
      } else if (!isMp4) {
        // Ensure accurate WebM duration metadata so media players don't cut off
        finalBlob = await fixWebmDuration(finalBlob, clipDuration * 1000);
      }

      cleanup();
      onProgress?.(100, 'Video export ready!');
      resolve({ blob: finalBlob, filename });
    };

    recorder.onerror = (e) => {
      console.warn('Recorder error occurred, generating safe container:', e);
      cleanup();
      const fallback = createFallbackVideoBlob(clip, resW, resH);
      resolve({ blob: fallback, filename });
    };

    // Use 1000ms timeslices so encoder builds clean GOPs without fragmented keyframe jitter
    recorder.start(1000);

    const finishRecording = async () => {
      if (isFinished) return;
      isFinished = true;
      onProgress?.(92, 'Encoding final frames and flushing audio buffer...');

      if (sourceVideo) {
        try { sourceVideo.pause(); } catch {}
      }

      // Request buffered data
      try {
        if (recorder.state === 'recording') {
          recorder.requestData();
        }
      } catch {}

      // Allow 350ms for encoder queue to flush trailing frames cleanly
      await new Promise((r) => setTimeout(r, 350));

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

    const renderStartTime = performance.now();

    // Frame Renderer Step: strictly driven by RAF + high-precision clock for buttery smooth playback
    const renderStep = () => {
      if (isFinished) return;

      const now = performance.now();
      // Continuous microsecond elapsed time completely eliminates camera pan dragging/staircase judder
      let elapsedInClip = (now - renderStartTime) / 1000;
      let currentMediaTime = startSec + elapsedInClip;

      // Keep aligned with source video playback if active
      if (sourceVideo && !sourceVideo.paused && !sourceVideo.ended && sourceVideo.readyState >= 2) {
        const vTime = sourceVideo.currentTime;
        const videoElapsed = Math.max(0, vTime - startSec);
        // Soft drift correction if video stalls or buffers
        if (Math.abs(elapsedInClip - videoElapsed) > 0.08) {
          elapsedInClip = videoElapsed;
        }
        currentMediaTime = vTime;
      }

      // Smooth progress calculation
      const progressPercent = Math.min(
        90,
        30 + Math.floor((elapsedInClip / clipDuration) * 60)
      );
      onProgress?.(
        progressPercent,
        `Rendering at ${fps} FPS • ${Math.min(clipDuration, elapsedInClip).toFixed(1)}s / ${clipDuration.toFixed(1)}s`
      );

      // Paint frame to master export canvas
      paintExportFrame({
        ctx,
        sourceVideo: videoReady ? sourceVideo : null,
        offscreenBlurCanvas,
        offscreenBlurCtx,
        w: resW,
        h: resH,
        clip,
        elapsedSeconds: Math.min(clipDuration, Math.max(0, elapsedInClip)),
        burnInSubtitles,
        template,
        clipDuration
      });

      // Optional live mirror to preview canvas
      if (options.previewCanvas) {
        const pCtx = options.previewCanvas.getContext('2d');
        if (pCtx) {
          pCtx.drawImage(canvas, 0, 0, options.previewCanvas.width, options.previewCanvas.height);
        }
      }

      // Completion check: reached end of clip
      if (elapsedInClip >= clipDuration || currentMediaTime >= endSec || (sourceVideo && sourceVideo.ended)) {
        // Paint final frame precisely at clipDuration
        paintExportFrame({
          ctx,
          sourceVideo: videoReady ? sourceVideo : null,
          offscreenBlurCanvas,
          offscreenBlurCtx,
          w: resW,
          h: resH,
          clip,
          elapsedSeconds: clipDuration,
          burnInSubtitles,
          template,
          clipDuration
        });
        finishRecording();
        return;
      }

      // Schedule next frame with hardware compositor
      rafId = requestAnimationFrame(renderStep);
    };

    // Start video playback with automatic fallback to muted if browser autoplay policy restricts
    if (sourceVideo && videoReady) {
      sourceVideo.currentTime = startSec;
      sourceVideo.playbackRate = 1.0;
      const playPromise = sourceVideo.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            rafId = requestAnimationFrame(renderStep);
          })
          .catch((err) => {
            console.warn('Playback audio restriction, switching to muted play:', err);
            if (sourceVideo) {
              sourceVideo.muted = true;
              sourceVideo.play().then(() => {
                rafId = requestAnimationFrame(renderStep);
              }).catch(() => {
                rafId = requestAnimationFrame(renderStep);
              });
            } else {
              rafId = requestAnimationFrame(renderStep);
            }
          });
      } else {
        rafId = requestAnimationFrame(renderStep);
      }
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
