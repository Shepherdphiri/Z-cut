import { AudioTrack } from '../types';

export const TRENDING_AUDIO_LIBRARY: AudioTrack[] = [
  {
    id: 'audio-trap-808',
    title: 'Midnight Tokyo Drift',
    artist: 'Z-Cut Sound Lab',
    category: 'trending',
    durationSeconds: 45,
    bpm: 140,
    waveform: [20, 45, 80, 95, 70, 85, 100, 65, 40, 80, 90, 100, 75, 50, 85, 95, 40, 70, 90],
    audioTone: 'synth_bass'
  },
  {
    id: 'audio-tension-pulse',
    title: 'Oppenheimer Gravity Drone',
    artist: 'Hans Pulse',
    category: 'cinematic',
    durationSeconds: 50,
    bpm: 90,
    waveform: [30, 40, 50, 65, 80, 85, 90, 95, 98, 100, 92, 85, 75, 60, 50, 40, 30],
    audioTone: 'tension_pulse'
  },
  {
    id: 'audio-lofi-nostalgia',
    title: 'Rainy Coffee in Shibuya',
    artist: 'Nostalgic Keys',
    category: 'lofi',
    durationSeconds: 60,
    bpm: 82,
    waveform: [35, 50, 45, 60, 55, 70, 65, 75, 60, 50, 65, 55, 70, 60, 45, 35],
    audioTone: 'piano_chill'
  },
  {
    id: 'audio-phonk-speed',
    title: 'Shadow Phonk & Cowbell Overdrive',
    artist: 'Drift Mafia',
    category: 'phonk',
    durationSeconds: 40,
    bpm: 145,
    waveform: [60, 85, 100, 90, 95, 100, 85, 70, 95, 100, 80, 90, 100, 85, 95],
    audioTone: 'phonk_groove'
  },
  {
    id: 'audio-upbeat-tiktok',
    title: 'Good Vibrations Daily',
    artist: 'Sunny Beats Collective',
    category: 'upbeat',
    durationSeconds: 45,
    bpm: 124,
    waveform: [40, 60, 75, 85, 90, 75, 80, 95, 85, 90, 100, 80, 70, 85, 90, 65],
    audioTone: 'upbeat_fun'
  }
];

export const TEMPLATE_PRESETS = [
  {
    id: 'tpl-viral-hook',
    name: 'Viral TikTok Beast',
    hookIntro: {
      enabled: true,
      text: 'WAIT FOR THE END 😱',
      style: 'banner' as const,
      duration: 3
    },
    progressBar: {
      enabled: true,
      color: '#E11D48',
      height: 4,
      position: 'bottom' as const
    },
    watermark: {
      enabled: true,
      text: '@zcut_creator',
      position: 'top-right' as const,
      opacity: 0.85
    },
    colorGrade: 'cinematic_teal' as const
  },
  {
    id: 'tpl-cinema-master',
    name: 'Cinema 4K Master',
    hookIntro: {
      enabled: false,
      text: 'CINEMATIC SPOTLIGHT',
      style: 'pill' as const,
      duration: 2.5
    },
    progressBar: {
      enabled: true,
      color: '#3B82F6',
      height: 3,
      position: 'bottom' as const
    },
    watermark: {
      enabled: true,
      text: 'Z-CUT CINEMA',
      position: 'top-left' as const,
      opacity: 0.7
    },
    colorGrade: 'warm_kodak' as const
  },
  {
    id: 'tpl-minimalist-reels',
    name: 'Instagram Clean Aesthetic',
    hookIntro: {
      enabled: true,
      text: 'PART 1 / 3 ⚡',
      style: 'pill' as const,
      duration: 2.5
    },
    progressBar: {
      enabled: true,
      color: '#10B981',
      height: 3,
      position: 'bottom' as const
    },
    watermark: {
      enabled: false,
      text: '',
      position: 'bottom-right' as const,
      opacity: 0.6
    },
    colorGrade: 'vibrant_pop' as const
  }
];
