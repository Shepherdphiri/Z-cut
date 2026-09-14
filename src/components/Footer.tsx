import React from 'react';
import { Film, PhoneCall, ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-neutral-950 border-t border-neutral-800/80 text-neutral-400 py-6 px-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        {/* Brand & Developer credit */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-rose-600 flex items-center justify-center text-white">
              <Film className="w-3.5 h-3.5" />
            </div>
            <span className="font-extrabold text-white font-['Outfit'] tracking-tight">Z-cut PRO</span>
          </div>

          <span className="hidden sm:inline text-neutral-600">•</span>

          <p className="text-neutral-300 font-medium">
            Developed by <strong className="text-white font-semibold">Shepherd Zisper Phiri</strong> |{' '}
            <a
              href="tel:+27687982000"
              className="text-rose-400 hover:text-rose-300 transition-colors font-mono font-bold inline-flex items-center gap-1"
            >
              <PhoneCall className="w-3 h-3" />
              <span>+27687982000</span>
            </a>
          </p>
        </div>

        {/* Status / Copyright */}
        <div className="flex items-center gap-3 text-[11px] text-neutral-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Master Admin Verified</span>
          </span>
          <span>•</span>
          <span>© {new Date().getFullYear()} Z-cut. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
};
