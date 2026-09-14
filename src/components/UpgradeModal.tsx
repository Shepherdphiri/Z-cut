import React, { useState } from 'react';
import { 
  X, 
  Crown, 
  Check, 
  PhoneCall, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Film,
  Layers
} from 'lucide-react';
import { UserAccount, requestOfflinePayment } from '../utils/authManager';

interface UpgradeModalProps {
  currentUser: UserAccount | null;
  onClose: () => void;
  onOpenAuth: () => void;
  onUpgradeRequested: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  currentUser,
  onClose,
  onOpenAuth,
  onUpgradeRequested
}) => {
  const [isRequested, setIsRequested] = useState(
    currentUser?.paymentStatus === 'pending'
  );

  const handleRequestActivation = () => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    requestOfflinePayment(currentUser.id);
    setIsRequested(true);
    onUpgradeRequested();
  };

  const premiumPerks = [
    {
      title: 'Unlimited Clip Slicing',
      desc: 'Unlock all 1-minute clips across full movies without the 5-clip free limit.'
    },
    {
      title: 'Custom Branding & Watermarks',
      desc: 'Add custom channel tags, brand handles, and full-resolution visual hooks.'
    },
    {
      title: 'Batch ZIP Export',
      desc: 'Download all generated vertical reels simultaneously in 1080p & 4K.'
    },
    {
      title: 'Direct Master Admin Priority',
      desc: 'Instant priority support and custom assistance from Shepherd Zisper Phiri.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600 to-rose-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg ring-4 ring-amber-500/20">
            <Crown className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-['Outfit']">
            Upgrade to Z-cut PRO
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Unlimited movie clips, custom branding, and full high-resolution batch export.
          </p>
        </div>

        {/* Perks list */}
        <div className="space-y-2.5 mb-5">
          {premiumPerks.map((perk, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 flex items-start gap-3"
            >
              <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-['Outfit']">{perk.title}</h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">{perk.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Offline Payment Box */}
        <div className="p-4 rounded-2xl bg-amber-950/25 border border-amber-500/40 space-y-3 mb-5">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <PhoneCall className="w-4 h-4" />
            <span>Direct Offline Payment & Activation</span>
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed">
            Pay offline via EFT / Cash / e-Wallet. Contact Master Admin <strong>Shepherd Zisper Phiri</strong> to confirm payment and receive instant account unblocking:
          </p>

          <div className="p-3 rounded-xl bg-black/60 border border-amber-500/30 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] text-neutral-400 font-semibold uppercase">Admin Contact</p>
              <p className="text-sm font-extrabold text-white font-mono">+27687982000</p>
              <p className="text-[11px] text-neutral-300">Shepherd Zisper Phiri</p>
            </div>
            <a
              href="tel:+27687982000"
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1 shadow transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call / WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Action Button */}
        {!currentUser ? (
          <button
            onClick={onOpenAuth}
            className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <span>Sign In / Create Account to Request Upgrade</span>
          </button>
        ) : isRequested ? (
          <div className="p-3 rounded-2xl bg-emerald-950/50 border border-emerald-500/40 text-center">
            <p className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Activation Request Submitted to Shepherd</span>
            </p>
            <p className="text-[11px] text-neutral-400 mt-1">
              Once Master Admin verifies your offline payment, your account will be immediately unblocked to Premium.
            </p>
          </div>
        ) : (
          <button
            onClick={handleRequestActivation}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-95 text-white font-bold text-xs shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <Crown className="w-4 h-4" />
            <span>I Have Paid Offline — Request Activation</span>
          </button>
        )}
      </div>
    </div>
  );
};
