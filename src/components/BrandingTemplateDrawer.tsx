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
  Layers,
  Crown,
  Lock,
  ArrowRight
} from 'lucide-react';
import { TemplateConfig } from '../types';
import { TEMPLATE_PRESETS } from '../data/audioLibrary';

interface BrandingTemplateDrawerProps {
  template: TemplateConfig;
  onChangeTemplate: (updated: TemplateConfig) => void;
  isPremium?: boolean;
  onOpenUpgrade?: () => void;
}

export const BrandingTemplateDrawer: React.FC<BrandingTemplateDrawerProps> = ({
  template,
  onChangeTemplate,
  isPremium = false,
  onOpenUpgrade
}) => {
  const colorGrades = [
    { id: 'none', label: 'Original Rec.709', desc: 'Natural cinema colors' },
    { id: 'cinematic_teal', label: 'Teal & Orange', desc: 'Blockbuster contrast' },
    { id: 'warm_kodak', label: 'Warm Kodak 35mm', desc: 'Vintage film warmth' },
    { id: 'noir', label: 'Noir Black & White', desc: 'High drama grayscale' },
    { id: 'vibrant_pop', label: 'Vibrant HDR Pop', desc: 'Max saturation for feed thumb-stop' }
  ];

  const handleApplyPreset = (preset: any) => {
    if (!isPremium) {
      onOpenUpgrade?.();
      return;
    }
    onChangeTemplate({
      ...template,
      ...preset,
      hookIntro: { ...preset.hookIntro },
      progressBar: { ...preset.progressBar },
      watermark: { ...preset.watermark }
    });
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-white relative overflow-hidden">
      {/* Premium Gate Banner if not premium */}
      {!isPremium && (
        <div className="mb-4 p-3.5 rounded-xl bg-neutral-950 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-semibold text-white">
                  Branding & Watermarks (PRO Feature)
                </h4>
                <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Upgrade to PRO to customize channel watermarks, add viral hook banners, and set custom LUT grades.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenUpgrade}
            className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium shrink-0 flex items-center gap-1.5 transition-colors"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Unlock Branding</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm font-['Outfit']">Branded Visual Overlays & Intros</h3>
              {!isPremium && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> PRO
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400">
              Customize high-retention hook banners, progress bars, and cinematic color grades.
            </p>
          </div>
        </div>
      </div>

      {/* Content wrapper with disabled state if free */}
      <div className={`space-y-4 transition-opacity ${!isPremium ? 'opacity-80' : ''}`}>
        {/* Template Presets */}
        <div>
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
                  className={`p-2.5 rounded-xl border text-left transition-all relative ${
                    isMatch
                      ? 'border-rose-500 bg-rose-950/25 ring-1 ring-rose-500/50'
                      : 'border-neutral-800 bg-neutral-950/50 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-['Outfit']">{tp.name}</span>
                    {isMatch ? (
                      <Check className="w-3.5 h-3.5 text-rose-400 stroke-[3]" />
                    ) : !isPremium ? (
                      <Lock className="w-3 h-3 text-neutral-500" />
                    ) : null}
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
        <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-neutral-200">First-3-Seconds Viral Hook Banner</span>
            </div>
            <button
              onClick={() => {
                if (!isPremium) {
                  onOpenUpgrade?.();
                  return;
                }
                onChangeTemplate({
                  ...template,
                  hookIntro: { ...template.hookIntro, enabled: !template.hookIntro.enabled }
                });
              }}
              className={`w-8 h-4.5 rounded-full transition-colors relative p-0.5 ${
                template.hookIntro.enabled && isPremium ? 'bg-rose-600' : 'bg-neutral-800'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                  template.hookIntro.enabled && isPremium ? 'translate-x-3.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <input
            type="text"
            disabled={!isPremium}
            value={template.hookIntro.text}
            onChange={(e) =>
              onChangeTemplate({
                ...template,
                hookIntro: { ...template.hookIntro, text: e.target.value }
              })
            }
            placeholder="e.g. 🚨 WAIT FOR THE TWIST"
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 disabled:cursor-not-allowed"
          />
        </div>

        {/* Progress Bar & Watermark Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Progress Bar */}
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-200">Retention Progress Bar</span>
              <button
                onClick={() => {
                  if (!isPremium) {
                    onOpenUpgrade?.();
                    return;
                  }
                  onChangeTemplate({
                    ...template,
                    progressBar: { ...template.progressBar, enabled: !template.progressBar.enabled }
                  });
                }}
                className={`w-8 h-4.5 rounded-full transition-colors relative p-0.5 ${
                  template.progressBar.enabled && isPremium ? 'bg-rose-600' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                    template.progressBar.enabled && isPremium ? 'translate-x-3.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="color"
                disabled={!isPremium}
                value={template.progressBar.color}
                onChange={(e) =>
                  onChangeTemplate({
                    ...template,
                    progressBar: { ...template.progressBar, color: e.target.value }
                  })
                }
                className="w-7 h-7 rounded border border-neutral-700 bg-transparent cursor-pointer disabled:cursor-not-allowed"
              />
              <span className="text-xs font-mono text-neutral-400">{template.progressBar.color}</span>
            </div>
          </div>

          {/* Watermark Handle */}
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-200">Channel / Watermark Tag</span>
              <button
                onClick={() => {
                  if (!isPremium) {
                    onOpenUpgrade?.();
                    return;
                  }
                  onChangeTemplate({
                    ...template,
                    watermark: { ...template.watermark, enabled: !template.watermark.enabled }
                  });
                }}
                className={`w-8 h-4.5 rounded-full transition-colors relative p-0.5 ${
                  template.watermark.enabled && isPremium ? 'bg-rose-600' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                    template.watermark.enabled && isPremium ? 'translate-x-3.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <input
              type="text"
              disabled={!isPremium}
              value={isPremium ? template.watermark.text : 'Z-cut Pro (Free Tier)'}
              onChange={(e) =>
                onChangeTemplate({
                  ...template,
                  watermark: { ...template.watermark, text: e.target.value }
                })
              }
              placeholder="@your_channel"
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-rose-500 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Cinematic Color Grade Filter */}
        <div>
          <label className="text-xs font-semibold text-neutral-300 mb-2 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-rose-400" />
            <span>Cinematic Color Grade LUT</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {colorGrades.map((cg) => (
              <button
                key={cg.id}
                onClick={() => {
                  if (!isPremium) {
                    onOpenUpgrade?.();
                    return;
                  }
                  onChangeTemplate({ ...template, colorGrade: cg.id as any });
                }}
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
    </div>
  );
};
