/**
 * Web Audio Synthesizer for Z-cut trending audio tracks and sound previews.
 * Generates rich musical loops natively in browser without CORS/external network dependencies.
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private timer: number | null = null;
  private currentTrackId: string | null = null;
  private masterGain: GainNode | null = null;
  private duckingGain: GainNode | null = null;
  private customAudioEl: HTMLAudioElement | null = null;
  private currentVolume: number = 0.5;
  private isDucked: boolean = false;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.duckingGain = this.ctx.createGain();

      this.duckingGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public playTrack(trackTone: string, volume: number = 0.5, ducked: boolean = false, customAudioUrl?: string) {
    this.init();
    this.stop();
    this.isPlaying = true;
    this.currentTrackId = trackTone;
    this.currentVolume = volume;
    this.isDucked = ducked;

    // If custom audio URL (local file or recorded voiceover)
    if (customAudioUrl || trackTone === 'custom_file') {
      const audioUrl = customAudioUrl;
      if (!audioUrl) return;
      if (!this.customAudioEl) {
        this.customAudioEl = new Audio();
        this.customAudioEl.loop = true;
      }
      this.customAudioEl.src = audioUrl;
      this.customAudioEl.volume = Math.max(0, Math.min(1, volume * (ducked ? 0.25 : 1.0)));
      this.customAudioEl.play().catch(e => console.warn('Custom audio play error:', e));
      return;
    }

    if (!this.ctx || !this.masterGain || !this.duckingGain) return;

    this.masterGain.gain.setValueAtTime(volume, this.ctx.currentTime);
    this.setDucking(ducked ? 0.25 : 1.0);

    let step = 0;
    const bpm = trackTone === 'phonk_groove' ? 140 : trackTone === 'upbeat_fun' ? 128 : 95;
    const intervalMs = (60 / bpm / 2) * 1000; // 8th note

    this.timer = window.setInterval(() => {
      if (!this.isPlaying || !this.ctx || !this.duckingGain) return;
      const t = this.ctx.currentTime;

      switch (trackTone) {
        case 'synth_bass': {
          // Deep punchy trap 808 & hi-hat
          if (step % 8 === 0 || step % 8 === 6) {
            this.playSubBass(t, step % 8 === 6 ? 48.99 : 43.65, 0.4); // G1/F1
          }
          if (step % 2 === 1) {
            this.playHiHat(t, 0.05);
          }
          if (step % 4 === 2) {
            this.playSnare(t, 0.15);
          }
          break;
        }
        case 'piano_chill': {
          // Lo-Fi warm electric piano chords
          const chordNotes = [
            [261.63, 329.63, 392.00, 493.88], // Cmaj7
            [220.00, 261.63, 329.63, 392.00], // Am7
            [174.61, 220.00, 261.63, 329.63], // Fmaj7
            [196.00, 246.94, 293.66, 349.23], // G7
          ];
          const chordIdx = Math.floor(step / 8) % 4;
          if (step % 8 === 0) {
            chordNotes[chordIdx].forEach((freq) => {
              this.playElectorPiano(t, freq, 0.8);
            });
          }
          if (step % 4 === 2) {
            this.playVinylCrack(t);
          }
          break;
        }
        case 'tension_pulse': {
          // Cinematic tension pulse drone
          const pulseFreq = step % 4 === 0 ? 55 : 65.41;
          this.playCinematicDrone(t, pulseFreq, 0.25);
          break;
        }
        case 'phonk_groove': {
          // Cowbell synth + heavy drift kick
          const cowbellTones = [440, 523.25, 587.33, 659.25, 523.25];
          const note = cowbellTones[(step * 2) % cowbellTones.length];
          this.playPhonkCowbell(t, note, 0.08);
          if (step % 4 === 0) {
            this.playSubBass(t, 55, 0.2);
          }
          break;
        }
        default: {
          // Upbeat melodic bounce
          const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
          const freq = scale[step % scale.length];
          this.playElectorPiano(t, freq, 0.18);
          if (step % 4 === 0) {
            this.playSubBass(t, 65.4, 0.2);
          }
          break;
        }
      }

      step++;
    }, intervalMs);
  }

  public setDucking(multiplier: number) {
    this.isDucked = multiplier < 0.5;
    if (this.customAudioEl) {
      this.customAudioEl.volume = Math.max(0, Math.min(1, this.currentVolume * multiplier));
    }
    if (!this.ctx || !this.duckingGain) return;
    this.duckingGain.gain.setTargetAtTime(multiplier, this.ctx.currentTime, 0.15);
  }

  public setVolume(val: number) {
    this.currentVolume = Math.max(0, Math.min(1, val));
    if (this.customAudioEl) {
      this.customAudioEl.volume = this.currentVolume * (this.isDucked ? 0.25 : 1.0);
    }
    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.setValueAtTime(this.currentVolume, this.ctx.currentTime);
  }

  public stop() {
    this.isPlaying = false;
    this.currentTrackId = null;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.customAudioEl) {
      this.customAudioEl.pause();
      this.customAudioEl.currentTime = 0;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentTrack(): string | null {
    return this.currentTrackId;
  }

  // Synthesis voices
  private playSubBass(t: number, freq: number, duration: number) {
    if (!this.ctx || !this.duckingGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.8, t + duration);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.duckingGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  private playElectorPiano(t: number, freq: number, duration: number) {
    if (!this.ctx || !this.duckingGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.duckingGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  private playCinematicDrone(t: number, freq: number, duration: number) {
    if (!this.ctx || !this.duckingGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, t);
    filter.frequency.exponentialRampToValueAtTime(600, t + duration * 0.5);
    filter.frequency.exponentialRampToValueAtTime(200, t + duration);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.duckingGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  private playPhonkCowbell(t: number, freq: number, duration: number) {
    if (!this.ctx || !this.duckingGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.duckingGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  private playHiHat(t: number, duration: number) {
    if (!this.ctx || !this.duckingGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'highpass' as any;
    osc.frequency.setValueAtTime(8000, t);

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(this.duckingGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  private playSnare(t: number, duration: number) {
    if (!this.ctx || !this.duckingGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + duration);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.duckingGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  private playVinylCrack(t: number) {
    if (!this.ctx || !this.duckingGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(3200, t);
    gain.gain.setValueAtTime(0.015, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.duckingGain);
    osc.start(t);
    osc.stop(t + 0.04);
  }
}

export const audioSynth = new AudioSynthesizer();
