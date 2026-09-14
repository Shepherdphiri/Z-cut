import { MovieSource, VideoClip, FramingConfig } from '../types';
import { saveLocalVideoToStorage, StoredLocalVideoRecord } from './localVideoStorage';

export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins.toString().padStart(2, '0')}m`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Capture a real frame thumbnail from a video element
 */
export function captureFrameThumbnail(video: HTMLVideoElement, width = 640, height = 360): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx && video.videoWidth > 0) {
      ctx.drawImage(video, 0, 0, width, height);
      return canvas.toDataURL('image/jpeg', 0.85);
    }
  } catch (e) {
    console.warn('Could not capture frame to canvas:', e);
  }
  // Fallback dark gradient canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#1c1917');
    grad.addColorStop(1, '#09090b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOCAL MOVIE SOURCE', width / 2, height / 2);
    return canvas.toDataURL('image/jpeg', 0.8);
  }
  return '';
}

export function formatTimeCode(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generates vertical 9:16 clips for the ENTIRE loaded movie.
 * Segments the full movie duration into 1-minute (60 seconds) clips from beginning to end.
 */
export function generateClipsForMovie(
  title: string,
  totalDuration: number,
  targetClipDurationSeconds: number = 60
): VideoClip[] {
  const clips: VideoClip[] = [];
  const safeTotal = Math.max(5, Math.round(totalDuration));
  const segmentDuration = Math.max(10, targetClipDurationSeconds); // Default 60s (1 min)

  // Rotating bank of high-engagement viral hook titles for multi-part video series
  const hookTemplates = [
    'THE UNEXPECTED OPENING 🤯',
    'THINGS ESCALATE QUICKLY ⚡',
    'NO ONE SAW THIS COMING 😱',
    'HE ACTUALLY DID IT 🎯',
    'THE TENSION REACHES PEAK 🔥',
    'LISTEN TO THIS DIALOGUE 🎬',
    'THE BIGGEST PLOT TWIST 💥',
    'THIS SCENE IS UNREAL 🚨',
    'WAIT FOR HIS NEXT MOVE 👀',
    'THE FINAL CONFRONTATION 💣',
    'PURE CINEMATIC CHILLS 🥶',
    'YOU WON\'T BELIEVE THE ENDING 🏆',
    'THE SITUATION SPINS OUT OF CONTROL 🌪️',
    'THE TRUTH FINALLY COMES OUT 🔍',
    'NEVER UNDERESTIMATE THEM ⚔️',
    'A DECISION THAT CHANGES EVERYTHING ⏳'
  ];

  const dialoguePool = [
    [
      { text: 'Pay close attention to what happens next.', words: ['attention', 'happens', 'next'] },
      { text: 'We only have one shot to make this work.', words: ['one', 'shot', 'work'] },
      { text: 'Are you sure about this?', words: ['sure', 'this'] },
      { text: 'There is no going back now.', words: ['no', 'going', 'back'] }
    ],
    [
      { text: 'Did you think this would stay hidden forever?', words: ['think', 'hidden', 'forever'] },
      { text: 'I planned for this exact moment.', words: ['planned', 'exact', 'moment'] },
      { text: 'You have no idea what you are dealing with.', words: ['no', 'idea', 'dealing'] }
    ],
    [
      { text: 'Look at what is unfolding right before your eyes.', words: ['unfolding', 'right', 'eyes'] },
      { text: 'Everything they told us was calculated.', words: ['everything', 'calculated'] },
      { text: 'Watch the background carefully.', words: ['watch', 'background', 'carefully'] }
    ],
    [
      { text: 'If we stay here, we lose everything.', words: ['stay', 'lose', 'everything'] },
      { text: 'Then what do you propose we do?', words: ['what', 'propose', 'do'] },
      { text: 'We move right now without hesitating.', words: ['move', 'right', 'now', 'hesitating'] }
    ]
  ];

  let currentStart = 0;
  let partNumber = 1;

  while (currentStart < safeTotal) {
    let currentEnd = currentStart + segmentDuration;
    // If the remaining sliver of the movie after this clip is tiny (< 8 seconds), extend this clip to cover the end
    if (safeTotal - currentEnd > 0 && safeTotal - currentEnd < 8) {
      currentEnd = safeTotal;
    } else {
      currentEnd = Math.min(safeTotal, currentEnd);
    }

    const clipDuration = Math.round(currentEnd - currentStart);
    if (clipDuration <= 0) break;

    const startFormatted = formatTimeCode(currentStart);
    const endFormatted = formatTimeCode(currentEnd);
    const hook = hookTemplates[(partNumber - 1) % hookTemplates.length];
    const dialogueSet = dialoguePool[(partNumber - 1) % dialoguePool.length];

    // Framing mode rotation across parts including fit_blur and speaker tracking
    const framingModes: Array<'speaker_tracking' | 'dual_split' | 'center_lock' | 'fit_blur'> = [
      'speaker_tracking',
      'fit_blur',
      'center_lock',
      'dual_split'
    ];
    const framingMode = framingModes[(partNumber - 1) % framingModes.length];

    // Dynamic panning keyframes across the 1-minute segment
    const panningTrajectory = [
      { timeOffset: 0, panX: ((partNumber % 3) - 1) * 0.15 },
      { timeOffset: Math.round(clipDuration * 0.25), panX: 0.2 },
      { timeOffset: Math.round(clipDuration * 0.5), panX: -0.2 },
      { timeOffset: Math.round(clipDuration * 0.75), panX: 0.1 },
      { timeOffset: clipDuration, panX: 0.0 }
    ];

    // Spaced dialogue subtitles within the clip's local timeline (0 to clipDuration)
    const dialogue = dialogueSet.map((d, dIdx) => {
      const step = clipDuration / (dialogueSet.length + 1);
      const start = Math.round((dIdx + 0.5) * step * 10) / 10;
      const end = Math.min(clipDuration - 0.5, Math.round((start + 4.5) * 10) / 10);
      return {
        start,
        end,
        speaker: dIdx % 2 === 0 ? 'Speaker 1' : 'Speaker 2',
        text: d.text,
        highlightWords: d.words
      };
    });

    const viralScore = 91 + ((partNumber * 7) % 9);

    clips.push({
      id: `clip-part-${partNumber}`,
      title: `${title} - Part ${partNumber} (${startFormatted} - ${endFormatted})`,
      hookText: `PART ${partNumber}: ${hook}`,
      startTime: currentStart,
      endTime: currentEnd,
      duration: clipDuration,
      viralScore: viralScore,
      viralReason: `1-minute vertical cut (${startFormatted} - ${endFormatted}) covering whole movie timeline.`,
      framing: {
        mode: framingMode,
        primarySubject: framingMode === 'dual_split' ? 'Split Dialogue Centering' : framingMode === 'fit_blur' ? '16:9 Full Frame with Ambient Blur' : 'Speaker Pan Trajectory',
        panningTrajectory,
        zoomFactor: 1.15,
        blurBackground: true,
        faceTrackingEnabled: true,
        antiBlankShield: true
      },
      dialogue,
      socialCaption: `Part ${partNumber} of ${title} (${startFormatted} - ${endFormatted}). What would you do next? Follow for Part ${partNumber + 1}!`,
      hashtags: ['#filmtok', '#movieclips', `#part${partNumber}`, '#cinema', '#zcut', '#vertical'],
      recommendedAudioVibe: partNumber % 2 === 0 ? 'Cinematic Tension Pulse' : 'Bass Drop Tension'
    });

    currentStart = currentEnd;
    partNumber++;
  }

  return clips;
}

/**
 * Process a user-selected local video file into MovieSource & VideoClip[]
 */
export function processLocalVideoFile(
  file: File | Blob,
  customName?: string,
  targetClipDurationSeconds: number = 60
): Promise<{ movie: MovieSource; clips: VideoClip[] }> {
  return new Promise((resolve, reject) => {
    const fileName = customName || (file instanceof File ? file.name : 'local_movie.mp4');
    const cleanTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const objectUrl = URL.createObjectURL(file);

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;

    // Timeout safety
    const timeout = setTimeout(() => {
      // If metadata takes too long, resolve with fallback duration
      const duration = 60;
      const clips = generateClipsForMovie(cleanTitle, duration, targetClipDurationSeconds);
      const movie: MovieSource = {
        id: `local-${Date.now()}`,
        title: cleanTitle,
        director: 'Local Video File',
        durationFormatted: formatDuration(duration),
        durationSeconds: duration,
        genre: 'Local Storage Video',
        thumbnailUrl: '',
        videoUrl: objectUrl,
        description: `Local storage movie: ${cleanTitle}`,
        precomputedClips: clips
      };
      resolve({ movie, clips });
    }, 4000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      const rawDuration = video.duration;
      const duration = !rawDuration || isNaN(rawDuration) || rawDuration <= 0 ? 60 : Math.round(rawDuration);
      const seekTarget = Math.min(1.0, duration / 2);

      // Seek to capture real thumbnail
      video.currentTime = seekTarget;
    };

    video.onseeked = async () => {
      const rawDuration = video.duration;
      const duration = !rawDuration || isNaN(rawDuration) || rawDuration <= 0 ? 60 : Math.round(rawDuration);
      const thumbnailUrl = captureFrameThumbnail(video);
      const clips = generateClipsForMovie(cleanTitle, duration, targetClipDurationSeconds);

      const movie: MovieSource = {
        id: `local-${Date.now()}`,
        title: cleanTitle,
        director: 'Local Storage File',
        durationFormatted: formatDuration(duration),
        durationSeconds: duration,
        genre: 'Local Video',
        thumbnailUrl: thumbnailUrl,
        videoUrl: objectUrl,
        description: `Local storage movie: ${cleanTitle} (${formatDuration(duration)})`,
        precomputedClips: clips
      };

      // Store in browser IndexedDB
      try {
        const record: StoredLocalVideoRecord = {
          id: movie.id,
          name: fileName,
          size: file.size || 0,
          type: file.type || 'video/mp4',
          blob: file,
          duration: duration,
          durationFormatted: formatDuration(duration),
          thumbnailUrl: thumbnailUrl,
          lastModified: Date.now(),
          createdAt: Date.now()
        };
        await saveLocalVideoToStorage(record);
      } catch (err) {
        console.warn('Could not save video blob to IndexedDB:', err);
      }

      resolve({ movie, clips });
    };

    video.onerror = (e) => {
      clearTimeout(timeout);
      console.warn('Error reading local video metadata:', e);
      // Fallback
      const duration = 30;
      const clips = generateClipsForMovie(cleanTitle, duration);
      const movie: MovieSource = {
        id: `local-${Date.now()}`,
        title: cleanTitle,
        director: 'Local Video File',
        durationFormatted: formatDuration(duration),
        durationSeconds: duration,
        genre: 'Local Video',
        thumbnailUrl: '',
        videoUrl: objectUrl,
        description: `Local storage movie: ${cleanTitle}`,
        precomputedClips: clips
      };
      resolve({ movie, clips });
    };
  });
}

/**
 * Generates a 100% local, synthetic 12-second cinema test video in browser memory.
 * No external network, zero downloads. Uses HTML5 Canvas + Web Audio API + MediaRecorder.
 */
export function generateLocalTestMovie(): Promise<{ movie: MovieSource; clips: VideoClip[] }> {
  return new Promise((resolve, reject) => {
    try {
      const width = 1280;
      const height = 720;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas 2D context not available');
      }

      const stream = canvas.captureStream(30);

      // Web Audio synth for the test stream
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      let audioCtx: AudioContext | null = null;
      let dest: MediaStreamAudioDestinationNode | null = null;

      if (AudioCtx) {
        try {
          audioCtx = new AudioCtx();
          dest = audioCtx.createMediaStreamDestination();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(110, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
          osc.connect(gain);
          gain.connect(dest);
          osc.start();
        } catch (e) {
          console.warn('Audio synth not initialized for test clip:', e);
        }
      }

      const combinedTracks = [...stream.getVideoTracks()];
      if (dest && dest.stream.getAudioTracks().length > 0) {
        combinedTracks.push(dest.stream.getAudioTracks()[0]);
      }
      const combinedStream = new MediaStream(combinedTracks);

      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '';
      }

      const recorder = new MediaRecorder(combinedStream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const totalFrames = 30 * 12; // 12 seconds @ 30fps
      let frame = 0;

      recorder.onstop = async () => {
        if (audioCtx) {
          audioCtx.close().catch(() => {});
        }
        const blob = new Blob(chunks, { type: 'video/webm' });
        const res = await processLocalVideoFile(blob, 'Cinema_Action_Local_Test.mp4');
        resolve(res);
      };

      recorder.start();

      // Render loop for test video
      function drawFrame() {
        if (frame >= totalFrames) {
          recorder.stop();
          return;
        }

        const t = frame / 30; // seconds
        const progress = t / 12;

        // Dark cinema studio background
        const grad = ctx!.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#0a0a0a');
        grad.addColorStop(0.5, '#141414');
        grad.addColorStop(1, '#050505');
        ctx!.fillStyle = grad;
        ctx!.fillRect(0, 0, width, height);

        // Grid lines
        ctx!.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx!.lineWidth = 1;
        for (let x = 0; x < width; x += 80) {
          ctx!.beginPath();
          ctx!.moveTo(x, 0);
          ctx!.lineTo(x, height);
          ctx!.stroke();
        }
        for (let y = 0; y < height; y += 80) {
          ctx!.beginPath();
          ctx!.moveTo(0, y);
          ctx!.lineTo(width, y);
          ctx!.stroke();
        }

        // Speaker 1 (Left Actor - Cyan)
        const leftPanX = 320 + Math.sin(t * 1.5) * 60;
        ctx!.save();
        ctx!.fillStyle = 'rgba(6, 182, 212, 0.15)';
        ctx!.beginPath();
        ctx!.arc(leftPanX, 360, 110, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.strokeStyle = '#06b6d4';
        ctx!.lineWidth = 3;
        ctx!.stroke();

        ctx!.fillStyle = '#ffffff';
        ctx!.font = 'bold 20px Outfit, sans-serif';
        ctx!.textAlign = 'center';
        ctx!.fillText('ACTOR A (LEFT)', leftPanX, 350);
        ctx!.fillStyle = '#06b6d4';
        ctx!.font = '14px monospace';
        ctx!.fillText('SPEAKER 1', leftPanX, 380);
        ctx!.restore();

        // Speaker 2 (Right Actor - Rose)
        const rightPanX = 960 + Math.cos(t * 1.5) * 60;
        ctx!.save();
        ctx!.fillStyle = 'rgba(244, 63, 94, 0.15)';
        ctx!.beginPath();
        ctx!.arc(rightPanX, 360, 110, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.strokeStyle = '#f43f5e';
        ctx!.lineWidth = 3;
        ctx!.stroke();

        ctx!.fillStyle = '#ffffff';
        ctx!.font = 'bold 20px Outfit, sans-serif';
        ctx!.textAlign = 'center';
        ctx!.fillText('ACTOR B (RIGHT)', rightPanX, 350);
        ctx!.fillStyle = '#f43f5e';
        ctx!.font = '14px monospace';
        ctx!.fillText('SPEAKER 2', rightPanX, 380);
        ctx!.restore();

        // Center cinema title & timecode
        ctx!.fillStyle = '#f43f5e';
        ctx!.font = '900 36px Outfit, sans-serif';
        ctx!.textAlign = 'center';
        ctx!.fillText('CINEMA LOCAL TEST SEQUENCE', width / 2, 160);

        ctx!.fillStyle = '#a3a3a3';
        ctx!.font = '16px monospace';
        ctx!.fillText('16:9 Widescreen Stream • 1280x720 • Local Browser Generation', width / 2, 200);

        // Digital countdown
        ctx!.fillStyle = '#facc15';
        ctx!.font = 'bold 44px monospace';
        const remaining = (12 - t).toFixed(1);
        ctx!.fillText(`00:${remaining.padStart(4, '0')}`, width / 2, 540);

        // Progress line
        ctx!.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx!.fillRect(200, 600, width - 400, 8);
        ctx!.fillStyle = '#f43f5e';
        ctx!.fillRect(200, 600, (width - 400) * progress, 8);

        frame++;
        requestAnimationFrame(drawFrame);
      }

      drawFrame();
    } catch (err) {
      reject(err);
    }
  });
}
