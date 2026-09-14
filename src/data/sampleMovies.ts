import { MovieSource } from '../types';

export const SAMPLE_MOVIES: MovieSource[] = [
  {
    id: 'movie-tears-of-steel',
    title: 'Tears of Steel (Sci-Fi Epic)',
    director: 'Ian Hubert',
    durationFormatted: '12m 14s',
    durationSeconds: 734,
    genre: 'Cyberpunk / Sci-Fi / Action',
    thumbnailUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    description: 'In a dystopian future, a group of scientists and warriors assemble in the Oude Kerk to stage a desperate mission to save mankind from destructive robotics.',
    precomputedClips: [
      {
        id: 'clip-tos-1',
        title: 'The Cybernetic Revelation',
        hookText: 'THE MOMENT EVERYTHING CHANGED 🤯',
        startTime: 110,
        endTime: 142,
        duration: 32,
        viralScore: 98,
        viralReason: 'Sudden emotional confrontation with mechanical arm reveal. Hook in 0.8s drives 96% retention.',
        framing: {
          mode: 'speaker_tracking',
          primarySubject: 'Celia (Right) to Thom (Left)',
          panningTrajectory: [
            { timeOffset: 0, panX: 0.35 },
            { timeOffset: 7, panX: -0.2 },
            { timeOffset: 16, panX: 0.3 },
            { timeOffset: 25, panX: 0.0 }
          ],
          zoomFactor: 1.15,
          blurBackground: true
        },
        dialogue: [
          { start: 0.5, end: 4.8, speaker: 'Thom', text: 'You changed yourself. For what? An algorithm?', highlightWords: ['changed', 'algorithm'] },
          { start: 5.2, end: 9.8, speaker: 'Celia', text: 'I replaced what was frail so our species could survive.', highlightWords: ['frail', 'survive'] },
          { start: 10.4, end: 15.5, speaker: 'Thom', text: 'If there is no humanity left in you, survival is meaningless.', highlightWords: ['humanity', 'meaningless'] }
        ],
        socialCaption: 'The acting and VFX in this scene still give me chills. What would you do in Thom\'s position? 🤖💔 Cut automatically with Z-cut.',
        hashtags: ['#filmtok', '#scifi', '#movieclips', '#cinema', '#zcut', '#cyberpunk'],
        recommendedAudioVibe: 'Cinematic Tension Pulse'
      },
      {
        id: 'clip-tos-2',
        title: 'Target Locked: The Rocket Launch',
        hookText: 'WAIT TILL HE PRESSES THE BUTTON 🚀',
        startTime: 345,
        endTime: 375,
        duration: 30,
        viralScore: 95,
        viralReason: 'High visual velocity, countdown pacing, and explosive action climax.',
        framing: {
          mode: 'dual_split',
          primarySubject: 'Pilot & Rocket Array',
          panningTrajectory: [
            { timeOffset: 0, panX: -0.3 },
            { timeOffset: 10, panX: 0.3 },
            { timeOffset: 20, panX: 0.0 }
          ],
          zoomFactor: 1.1,
          blurBackground: false
        },
        dialogue: [
          { start: 0.2, end: 3.5, speaker: 'Commander', text: 'All units, lock on target coordinates now!', highlightWords: ['target', 'coordinates'] },
          { start: 4.0, end: 7.8, speaker: 'Tech', text: 'Thrusters online. Thirty seconds to orbital launch.', highlightWords: ['thrusters', 'launch'] },
          { start: 8.2, end: 12.0, speaker: 'Commander', text: 'No turning back now. Fire all engines!', highlightWords: ['turning', 'fire'] }
        ],
        socialCaption: 'That countdown gave me pure adrenaline! 30 seconds of non-stop intensity 🔥 #movieclips #action #vfx',
        hashtags: ['#scifimovies', '#actionscene', '#vfxartist', '#filmtok', '#zcut'],
        recommendedAudioVibe: 'Bass Drop Phonk'
      },
      {
        id: 'clip-tos-3',
        title: 'The Final Apology',
        hookText: 'HE FINALLY ADMITTED THE TRUTH... 😢',
        startTime: 512,
        endTime: 546,
        duration: 34,
        viralScore: 92,
        viralReason: 'Intimate character apology after forty years of estrangement. High resonance with commentary creators.',
        framing: {
          mode: 'center_lock',
          primarySubject: 'Old Thom Monologue',
          panningTrajectory: [
            { timeOffset: 0, panX: 0.0 },
            { timeOffset: 15, panX: 0.1 },
            { timeOffset: 30, panX: 0.0 }
          ],
          zoomFactor: 1.2,
          blurBackground: true
        },
        dialogue: [
          { start: 0.4, end: 5.0, speaker: 'Thom', text: 'I spent forty years blaming the machines.', highlightWords: ['forty', 'years', 'blaming'] },
          { start: 5.6, end: 10.2, speaker: 'Thom', text: 'When the only thing that failed was my courage to apologize.', highlightWords: ['failed', 'courage', 'apologize'] },
          { start: 10.8, end: 15.0, speaker: 'Celia', text: 'It took you long enough.', highlightWords: ['long', 'enough'] }
        ],
        socialCaption: 'The hardest sentence in any language is admitting you were wrong. 🥺 Watch till the last line.',
        hashtags: ['#emotional', '#moviequotes', '#deepthoughts', '#filmtok', '#cinema'],
        recommendedAudioVibe: 'Lo-Fi Chill Piano'
      }
    ]
  },
  {
    id: 'movie-sintel',
    title: 'Sintel: The Dragon Hunter',
    director: 'Colin Levy',
    durationFormatted: '15m 20s',
    durationSeconds: 920,
    genre: 'Fantasy / Adventure / Drama',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    description: 'A lonely young warrior discovers a wounded baby dragon and embarks on a dangerous pilgrimage across snow peaks and ruins to reclaim her companion.',
    precomputedClips: [
      {
        id: 'clip-sintel-1',
        title: 'The Snowy Mountain Ascent',
        hookText: 'NEVER GIVE UP ON WHAT YOU LOVE 🏔️',
        startTime: 85,
        endTime: 118,
        duration: 33,
        viralScore: 97,
        viralReason: 'Awe-inspiring cinematic landscapes with visceral physical struggle. Inspiring audio quote hooks.',
        framing: {
          mode: 'speaker_tracking',
          primarySubject: 'Sintel Climbing Ice',
          panningTrajectory: [
            { timeOffset: 0, panX: -0.15 },
            { timeOffset: 12, panX: 0.25 },
            { timeOffset: 25, panX: 0.0 }
          ],
          zoomFactor: 1.1,
          blurBackground: false
        },
        dialogue: [
          { start: 0.3, end: 4.5, speaker: 'Sintel', text: 'The cold bites deeper with every step.', highlightWords: ['cold', 'deeper'] },
          { start: 5.0, end: 9.6, speaker: 'Sintel', text: 'They told me dragons forget. But I remember.', highlightWords: ['dragons', 'remember'] },
          { start: 10.2, end: 14.8, speaker: 'Shaman', text: 'What you seek at the summit may not be what you left behind.', highlightWords: ['summit', 'behind'] }
        ],
        socialCaption: 'The visual storytelling here is unbelievable. Would you cross a frozen mountain for a pet dragon? 🐉❄️',
        hashtags: ['#fantasymovies', '#dragon', '#cinematography', '#epic', '#filmtok'],
        recommendedAudioVibe: 'Cinematic Tension Pulse'
      },
      {
        id: 'clip-sintel-2',
        title: 'The Ruins Encounter',
        hookText: 'SHE REALIZED TOO LATE... 💔',
        startTime: 620,
        endTime: 655,
        duration: 35,
        viralScore: 99,
        viralReason: 'Famous heart-wrenching plot twist with highest shock and comment rate on social feeds.',
        framing: {
          mode: 'dual_split',
          primarySubject: 'Sintel & Dragon Eye',
          panningTrajectory: [
            { timeOffset: 0, panX: 0.2 },
            { timeOffset: 15, panX: -0.3 },
            { timeOffset: 28, panX: 0.0 }
          ],
          zoomFactor: 1.25,
          blurBackground: true
        },
        dialogue: [
          { start: 0.4, end: 4.2, speaker: 'Sintel', text: 'Scales of obsidian. The scar upon the wing.', highlightWords: ['obsidian', 'scar'] },
          { start: 4.8, end: 8.5, speaker: 'Sintel', text: 'It was you all along... Scales!', highlightWords: ['you', 'all', 'along'] },
          { start: 9.0, end: 13.5, speaker: 'Echo', text: 'In our fury, we blind ourselves to the ones we cherish.', highlightWords: ['fury', 'blind', 'cherish'] }
        ],
        socialCaption: 'This movie ending broke an entire generation of animation fans. The foreshadowing is crazy 😭',
        hashtags: ['#movieendings', '#plottwist', '#sadmovies', '#filmtok', '#animation'],
        recommendedAudioVibe: 'Emotional Piano & Cello'
      }
    ]
  },
  {
    id: 'movie-big-buck-bunny',
    title: 'The Forest Sovereign',
    director: 'Sacha Goedegebure',
    durationFormatted: '9m 56s',
    durationSeconds: 596,
    genre: 'Comedy / Nature / Revenge',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    description: 'A gentle giant woodland creature is pushed too far by forest bullies and engineers a hilariously intricate series of Rube Goldberg booby traps.',
    precomputedClips: [
      {
        id: 'clip-bbb-1',
        title: 'The Rube Goldberg Trap',
        hookText: 'WHEN THE QUIET GUY HAS HAD ENOUGH 💀',
        startTime: 320,
        endTime: 352,
        duration: 32,
        viralScore: 96,
        viralReason: 'Satisfying karma, physical slapstick comedy, and viral TikTok meme sound potential.',
        framing: {
          mode: 'speaker_tracking',
          primarySubject: 'Bunny & Traps',
          panningTrajectory: [
            { timeOffset: 0, panX: -0.3 },
            { timeOffset: 10, panX: 0.2 },
            { timeOffset: 22, panX: 0.0 }
          ],
          zoomFactor: 1.1,
          blurBackground: false
        },
        dialogue: [
          { start: 0.2, end: 3.8, speaker: 'Narrator', text: 'They thought he was soft because he loved butterflies.', highlightWords: ['soft', 'butterflies'] },
          { start: 4.2, end: 8.0, speaker: 'Narrator', text: 'They never suspected he studied physics.', highlightWords: ['never', 'physics'] },
          { start: 8.5, end: 12.0, speaker: 'Narrator', text: 'Newton\'s third law was about to hit the forest.', highlightWords: ['third', 'law', 'hit'] }
        ],
        socialCaption: 'The engineer of the forest doesn\'t mess around 😂 Karma hits fast! #funny #karma #memes #viral #zcut',
        hashtags: ['#memetok', '#funnyclips', '#instantkarma', '#cartoon', '#zcut'],
        recommendedAudioVibe: 'Upbeat Pop Energy'
      }
    ]
  }
];
