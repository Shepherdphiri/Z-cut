export type FramingMode = 'speaker_tracking' | 'dual_split' | 'center_lock' | 'fit_blur';

export type CaptionStyle = 'hormozi' | 'beast' | 'minimal' | 'bold_stroke' | 'clean_sub';

export type CaptionPosition = 'top' | 'middle' | 'lower';

export interface DialogueLine {
  start: number;
  end: number;
  speaker: string;
  text: string;
  highlightWords: string[];
}

export interface FramingKeyframe {
  timeOffset: number; // seconds from clip start
  panX: number; // -1.0 (far left) to 1.0 (far right), 0 is center
}

export interface FramingConfig {
  mode: FramingMode;
  primarySubject: string;
  panningTrajectory: FramingKeyframe[];
  zoomFactor: number; // 1.0 to 1.5
  blurBackground: boolean;
  faceTrackingEnabled?: boolean;
  antiBlankShield?: boolean;
}

export interface VideoClip {
  id: string;
  projectId?: string;
  title: string;
  hookText: string;
  startTime: number;
  endTime: number;
  duration: number;
  viralScore: number;
  viralReason: string;
  framing: FramingConfig;
  dialogue: DialogueLine[];
  socialCaption: string;
  hashtags: string[];
  recommendedAudioVibe: string;
}

export interface MovieSource {
  id: string;
  title: string;
  director?: string;
  durationFormatted: string;
  durationSeconds: number;
  genre: string;
  thumbnailUrl: string;
  videoUrl: string;
  description: string;
  precomputedClips: VideoClip[];
}

export interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  category: 'trending' | 'cinematic' | 'lofi' | 'phonk' | 'upbeat' | 'custom';
  durationSeconds: number;
  bpm: number;
  waveform: number[];
  audioTone: 'synth_bass' | 'piano_chill' | 'tension_pulse' | 'phonk_groove' | 'upbeat_fun' | 'custom_file';
  customAudioUrl?: string;
  isVoiceover?: boolean;
}

export interface TemplateConfig {
  id: string;
  name: string;
  hookIntro: {
    enabled: boolean;
    text: string;
    duration: number;
  };
  progressBar: {
    enabled: boolean;
    color: string;
    height: number;
    position: 'bottom' | 'top';
  };
  watermark: {
    enabled: boolean;
    text: string;
    position: 'top-right' | 'top-left' | 'bottom-right';
    opacity: number;
  };
  colorGrade: 'none' | 'cinematic_teal' | 'warm_kodak' | 'noir' | 'vibrant_pop';
}

export interface SocialAccountRecord {
  id: string;
  platform: 'tiktok' | 'instagram' | 'youtube_shorts' | 'twitter';
  account_handle: string;
  status: string;
  webhook_url?: string;
}

export interface SocialPostRecord {
  id: string;
  clip_id: string;
  platform: string;
  caption: string;
  hashtags: string;
  scheduled_time: string | null;
  status: 'published' | 'scheduled';
  direct_url: string;
  created_at: string;
}

export interface SqlDatabaseStats {
  database: string;
  dbSizeKb: number;
  totalClipsInDb: number;
  totalSocialPostsInDb: number;
}
