import React, { useState } from 'react';
import { 
  X, 
  User, 
  Lock, 
  Phone, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Crown
} from 'lucide-react';
import { registerUser, loginUser, UserAccount } from '../utils/authManager';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: (user: UserAccount) => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  onSuccess,
  initialMode = 'login'
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotHelp, setShowForgotHelp] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (mode === 'register') {
      const res = registerUser(username, password, phone);
      if (res.success && res.user) {
        onSuccess(res.user);
        onClose();
      } else {
        setErrorMessage(res.message);
      }
    } else {
      const res = loginUser(username, password);
      if (res.success && res.user) {
        onSuccess(res.user);
        onClose();
      } else {
        setErrorMessage(res.message);
      }
    }
  };

  const handleFillAdmin = () => {
    setMode('login');
    setUsername('Shepherd');
    setPassword('shepherd@admin');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-rose-600/20 text-rose-500 border border-rose-500/30 flex items-center justify-center mx-auto mb-3">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-white font-['Outfit']">
            {mode === 'login' ? 'Sign In to Z-cut PRO' : 'Create Your Account'}
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            {mode === 'login' 
              ? 'Enter your name and password to access your saved clips'
              : 'Sign up with just your name & password in 5 seconds'}
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-600/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Your Name / Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Phone Number (Optional - for offline payment verification)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +27..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2 mt-2"
          >
            <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Forgot Password Helper */}
        {mode === 'login' && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => setShowForgotHelp(!showForgotHelp)}
              className="text-[11px] text-neutral-400 hover:text-rose-400 transition-colors inline-flex items-center gap-1"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Forgot your password?</span>
            </button>

            {showForgotHelp && (
              <div className="mt-2 p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-left text-[11px] text-neutral-300 space-y-1 animate-in fade-in">
                <p className="font-bold text-white flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Admin Password Assistance
                </p>
                <p className="text-neutral-400">
                  Master Admin <strong>Shepherd Zisper Phiri</strong> can retrieve or reset your password directly from the admin panel.
                </p>
                <div className="pt-1">
                  <a
                    href="tel:+27687982000"
                    className="inline-flex items-center gap-1 text-rose-400 font-bold hover:underline"
                  >
                    📞 Call or WhatsApp: +27687982000
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mode Switcher */}
        <div className="mt-4 pt-4 border-t border-neutral-800 text-center text-xs text-neutral-400">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                }}
                className="font-bold text-rose-400 hover:underline ml-1"
              >
                Sign Up Now
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className="font-bold text-rose-400 hover:underline ml-1"
              >
                Sign In
              </button>
            </p>
          )}
        </div>

        {/* Master Admin Credentials Fast-Fill helper */}
        <div className="mt-4 p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between gap-2">
          <div className="text-[10px] text-amber-200">
            <span className="font-bold">Admin:</span> Shepherd / shepherd@admin
          </div>
          <button
            type="button"
            onClick={handleFillAdmin}
            className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-500/40 transition-colors"
          >
            Fill Admin
          </button>
        </div>
      </div>
    </div>
  );
};
