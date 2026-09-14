import React from 'react';
import { 
  Sparkles, 
  Palette, 
  Tag, 
  Flame, 
  Sliders, 
  SlidersHorizontal, 
  Check, 
  Film,
  Camera,
  Layers
} from 'lucide-react';
import { TemplateConfig } from '../types';
import { TEMPLATE_PRESETS } from '../data/audioLibrary';

interface BrandingTemplateDrawerProps {
  template: TemplateConfig;
  onChangeTemplate: (updated: TemplateConfig) => void;
}

export const BrandingTemplateDrawer: React.FC<BrandingTemplateDrawerProps> = ({
  template,
  onChangeTemplate
}) => {
  const colorGrades = [
    { id: 'none', label: 'Original Rec.709', desc: 'Natural cinema colors' },
    { id: 'cinematic_teal', label: 'Teal & Orange', desc: 'Blockbuster contrast' },
    { id: 'warm_kodak', label: 'Warm Kodak 35mm', desc: 'Vintage film warmth' },
    { id: 'noir', label: 'Noir Black & White', desc: 'High drama grayscale' },
    { id: 'vibrant_pop', label: 'Vibrant HDR Pop', desc: 'Max saturation for feed thumb-stop' }
  ];

  const handleApplyPreset = (preset: any) => {
    onChangeTemplate({
      ...template,
      ...preset,
      hookIntro: { ...preset.hookIntro },
      progressBar: { ...preset.progressBar },
      watermark: { ...preset.watermark }
    });
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-white">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm font-['Outfit']">Branded Visual Overlays & Intros</h3>
            <p className="text-[11px] text-neutral-400">
              Customize high-retention hook banners, progress bars, and cinematic color grades.
            </p>
          </div>
        </div>
      </div>

      {/* Template Presets */}
      <div className="mb-4">
        <label className="text-xs font-semibold text-neutral-300 mb-2 block">
          Branded Preset Styles
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {TEMPLATE_PRESETS.map((tp) => {
            const isMatch = template.name === tp.name;
            return (
              <button
                key={tp.id}
                onClick={() => handleApplyPreset(tp)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isMatch
                    ? 'border-rose-500 bg-rose-950/25 ring-1 ring-rose-500/50'
                    : 'border-neutral-800 bg-neutral-950/50 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-['Outfit']">{tp.name}</span>
                  {isMatch && <Check className="w-3.5 h-3.5 text-rose-400 stroke-[3]" />}
                </div>
                <div className="flex items-center gap-1 mt-2 text-[10px] text-neutral-400">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tp.progressBar.color }} />
                  <span>{tp.progressBar.color}</span>
                  <span>•</span>
                  <span>{tp.colorGrade}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Viral Hook Intro Config */}
      <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3 mb-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-neutral-200">First-3-Seconds Viral Hook Banner</span>
          </div>
          <button
            onClick={() =>
              onChangeTemplate({
                ...template,
                hookIntro: { ...template.hookIntro, enabled: !template.hookIntro.enabled }
              })
            }
            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
              template.hookIntro.enabled ? 'bg-rose-600' : 'bg-neutral-800'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                template.hookIntro.enabled ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {template.hookIntro.enabled && (
          <div className="space-y-2 pt-1">
            <input
              type="text"
              value={template.hookIntro.text}
              onChange={(e) =>
                onChangeTemplate({
                  ...template,
                  hookIntro: { ...template.hookIntro, text: e.target.value }
                })
              }
              placeholder="e.g. WAIT TILL THE END 😱"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 font-bold"
            />
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span>Display Duration</span>
              <span className="font-mono">{template.hookIntro.duration} seconds</span>
            </div>
            <input
              type="range"
              min="1.5"
              max="5"
              step="0.5"
              value={template.hookIntro.duration}
              onChange={(e) =>
                onChangeTemplate({
                  ...template,
                  hookIntro: { ...template.hookIntro, duration: parseFloat(e.target.value) }
                })
              }
              className="w-full accent-rose-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* Progress Bar & Watermark Customization */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {/* Progress Bar */}
        <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-200">Animated Progress Bar</span>
            <button
              onClick={() =>
                onChangeTemplate({
                  ...template,
                  progressBar: { ...template.progressBar, enabled: !template.progressBar.enabled }
                })
              }
              className={`w-8 h-4.5 rounded-full transition-colors relative p-0.5 ${
                template.progressBar.enabled ? 'bg-rose-600' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                  template.progressBar.enabled ? 'translate-x-3.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-2">
            {['#E11D48', '#3B82F6', '#10B981', '#F59E0B', '#FFFFFF'].map((color) => (
              <button
                key={color}
                onClick={() =>
                  onChangeTemplate({
                    ...template,
                    progressBar: { ...template.progressBar, color }
                  })
                }
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  template.progressBar.color === color
                    ? 'scale-110 border-white shadow'
                    : 'border-transparent opacity-60'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Watermark Handle */}
        <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-neutral-200">Channel / Watermark Tag</span>
            <button
              onClick={() =>
                onChangeTemplate({
                  ...template,
                  watermark: { ...template.watermark, enabled: !template.watermark.enabled }
                })
              }
              className={`w-8 h-4.5 rounded-full transition-colors relative p-0.5 ${
                template.watermark.enabled ? 'bg-rose-600' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                  template.watermark.enabled ? 'translate-x-3.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <input
            type="text"
            value={template.watermark.text}
            onChange={(e) =>
              onChangeTemplate({
                ...template,
                watermark: { ...template.watermark, text: e.target.value }
              })
            }
            placeholder="@your_channel"
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* Cinematic Color Grade Filter */}
      <div>
        <label className="text-xs font-semibold text-neutral-300 mb-2 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-rose-400" />
          Cinematic Color Grade LUT
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {colorGrades.map((cg) => (
            <button
              key={cg.id}
              onClick={() => onChangeTemplate({ ...template, colorGrade: cg.id as any })}
              className={`p-2 rounded-xl text-left border transition-all ${
                template.colorGrade === cg.id
                  ? 'border-rose-500 bg-rose-950/30 text-white'
                  : 'border-neutral-800 bg-neutral-950/40 text-neutral-400 hover:text-white'
              }`}
            >
              <span className="text-[11px] font-bold block truncate font-['Outfit']">{cg.label}</span>
              <span className="text-[9px] text-neutral-500 block truncate">{cg.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
