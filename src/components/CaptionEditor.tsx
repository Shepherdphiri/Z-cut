import React from 'react';
import { 
  Type, 
  AlignVerticalSpaceAround, 
  Palette, 
  Clock, 
  Check, 
  Sliders,
  Subtitles,
  Eye,
  EyeOff
} from 'lucide-react';
import { CaptionStyle, CaptionPosition, DialogueLine } from '../types';

interface CaptionEditorProps {
  subtitlesEnabled?: boolean;
  onToggleSubtitles?: (enabled: boolean) => void;
  captionStyle: CaptionStyle;
  onChangeStyle: (style: CaptionStyle) => void;
  captionPosition: CaptionPosition;
  onChangePosition: (pos: CaptionPosition) => void;
  fontSize: number;
  onChangeFontSize: (size: number) => void;
  highlightColor: string;
  onChangeHighlightColor: (color: string) => void;
  dialogue: DialogueLine[];
  onUpdateDialogue?: (lines: DialogueLine[]) => void;
}

export const CaptionEditor: React.FC<CaptionEditorProps> = ({
  subtitlesEnabled = true,
  onToggleSubtitles,
  captionStyle,
  onChangeStyle,
  captionPosition,
  onChangePosition,
  fontSize,
  onChangeFontSize,
  highlightColor,
  onChangeHighlightColor,
  dialogue
}) => {
  const styles: { id: CaptionStyle; name: string; desc: string; sample: string }[] = [
    {
      id: 'hormozi',
      name: 'Hormozi Pop',
      desc: 'Bold punchy subtitles with colored keyword highlights',
      sample: 'WAIT FOR THE REACTION'
    },
    {
      id: 'beast',
      name: 'Beast Karaoke',
      desc: 'Energetic highlighted container for high retention',
      sample: 'UNBELIEVABLE MOMENT!'
    },
    {
      id: 'minimal',
      name: 'Minimalist Cinema',
      desc: 'Subtle translucent backdrop for documentary and drama',
      sample: 'Every choice we made...'
    },
    {
      id: 'bold_stroke',
      name: 'Bold Stroke',
      desc: 'Black outlined text with maximum readability',
      sample: 'THE REAL DISCOVERY'
    },
    {
      id: 'clean_sub',
      name: 'Clean Subtitle',
      desc: 'Standard broadcast captions with neutral background',
      sample: 'Listen closely to what happens next.'
    }
  ];

  const colorPresets = [
    { label: 'Gold', color: '#FACC15' },
    { label: 'Coral', color: '#F43F5E' },
    { label: 'Mint', color: '#10B981' },
    { label: 'Cyan', color: '#06B6D4' },
    { label: 'White', color: '#FFFFFF' }
  ];

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-white">
      {/* Header with On/Off Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800 mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border transition-colors ${
            subtitlesEnabled 
              ? 'bg-rose-950/40 text-rose-400 border-rose-500/40' 
              : 'bg-neutral-800/80 text-neutral-400 border-neutral-700'
          }`}>
            <Subtitles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm font-['Outfit']">Auto-Captions & Subtitles</h3>
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border transition-all ${
                subtitlesEnabled 
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40' 
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}>
                {subtitlesEnabled ? 'SUBTITLES ON' : 'SUBTITLES OFF'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Word-by-word synchronized subtitles formatted for TikTok and Reels.
            </p>
          </div>
        </div>

        {/* Master ON/OFF Switch */}
        {onToggleSubtitles && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs font-semibold text-neutral-300">
              {subtitlesEnabled ? 'Enabled' : 'Disabled'}
            </span>
            <button
              type="button"
              id="toggle-subtitles-btn"
              onClick={() => onToggleSubtitles(!subtitlesEnabled)}
              className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-neutral-900 ${
                subtitlesEnabled ? 'bg-rose-600' : 'bg-neutral-700'
              }`}
              role="switch"
              aria-checked={subtitlesEnabled}
              title={subtitlesEnabled ? 'Click to turn subtitles OFF' : 'Click to turn subtitles ON'}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  subtitlesEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {/* When Subtitles are OFF Alert Banner */}
      {!subtitlesEnabled && (
        <div className="mb-4 p-3.5 rounded-xl bg-neutral-950/90 border border-neutral-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400">
              <EyeOff className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-200">Subtitles are turned OFF</p>
              <p className="text-[11px] text-neutral-400">
                Videos will play cleanly and export without overlaying text captions.
              </p>
            </div>
          </div>
          {onToggleSubtitles && (
            <button
              onClick={() => onToggleSubtitles(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow transition-all active:scale-95"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Turn Subtitles ON</span>
            </button>
          )}
        </div>
      )}

      {/* Style Preset Selector */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-neutral-300 mb-2 block">
          Subtitle Style Presets
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {styles.map((s) => {
            const isSelected = captionStyle === s.id;
            return (
              <div
                key={s.id}
                onClick={() => onChangeStyle(s.id)}
                className={`cursor-pointer p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
                  isSelected
                    ? 'border-rose-500 bg-rose-950/25 ring-1 ring-rose-500/50'
                    : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white font-['Outfit']">{s.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-rose-400 stroke-[3]" />}
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-0.5">{s.desc}</p>
                </div>
                <div className="mt-2 text-[10px] font-mono text-neutral-300 bg-neutral-900 px-2 py-1 rounded border border-neutral-800 truncate">
                  {s.sample}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Position & Appearance Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {/* Vertical Position */}
        <div className="bg-neutral-950/70 border border-neutral-800 p-3 rounded-xl">
          <label className="text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1">
            <AlignVerticalSpaceAround className="w-3.5 h-3.5 text-neutral-400" />
            <span>Position</span>
          </label>
          <div className="grid grid-cols-3 gap-1">
            {(['top', 'middle', 'lower'] as CaptionPosition[]).map((pos) => (
              <button
                key={pos}
                onClick={() => onChangePosition(pos)}
                className={`py-2 rounded-lg text-xs font-bold capitalize transition-all active:scale-95 ${
                  captionPosition === pos
                    ? 'bg-rose-600 text-white'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size Slider */}
        <div className="bg-neutral-950/70 border border-neutral-800 p-3 rounded-xl">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-neutral-300">Size</span>
            <span className="font-mono text-rose-400 font-bold">{fontSize}px</span>
          </div>
          <input
            type="range"
            min="14"
            max="32"
            value={fontSize}
            onChange={(e) => onChangeFontSize(parseInt(e.target.value))}
            className="w-full accent-rose-500 h-2 bg-neutral-900 rounded-lg cursor-pointer py-1"
          />
        </div>

        {/* Highlight Color */}
        <div className="bg-neutral-950/70 border border-neutral-800 p-3 rounded-xl">
          <label className="text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1">
            <Palette className="w-3.5 h-3.5 text-neutral-400" />
            <span>Keyword Color</span>
          </label>
          <div className="flex items-center gap-1.5">
            {colorPresets.map((c) => (
              <button
                key={c.color}
                onClick={() => onChangeHighlightColor(c.color)}
                className={`w-7 h-7 rounded-full border transition-all ${
                  highlightColor === c.color
                    ? 'border-white scale-110 ring-2 ring-rose-500'
                    : 'border-neutral-700 opacity-80 hover:opacity-100'
                }`}
                style={{ backgroundColor: c.color }}
                title={c.label}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Transcript Synchronized Dialogue List */}
      <div>
        <div className="flex items-center justify-between text-xs text-neutral-300 mb-2">
          <span className="font-semibold flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span>Synchronized Dialogue Lines ({dialogue.length})</span>
          </span>
          <span className="text-[10px] text-neutral-500 font-mono">Word-level timings</span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {dialogue.map((line, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800/80 flex items-start justify-between gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-neutral-800 text-rose-300">
                    {line.speaker}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">
                    {line.start.toFixed(1)}s - {line.end.toFixed(1)}s
                  </span>
                </div>
                <p className="text-xs text-neutral-200 line-clamp-2">"{line.text}"</p>
              </div>

              <div className="flex flex-wrap gap-1 max-w-[120px] justify-end">
                {line.highlightWords.map((hw, hIdx) => (
                  <span
                    key={hIdx}
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800"
                    style={{ color: highlightColor }}
                  >
                    {hw}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
