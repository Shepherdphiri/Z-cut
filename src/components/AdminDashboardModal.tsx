import React, { useState } from 'react';
import { 
  ShieldAlert, 
  X, 
  Users, 
  Crown, 
  KeyRound, 
  Search, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Edit3, 
  PhoneCall, 
  Lock,
  Unlock,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  UserAccount, 
  getAllAccounts, 
  updateUserPlan, 
  adminResetPassword, 
  deleteAccount 
} from '../utils/authManager';

interface AdminDashboardModalProps {
  onClose: () => void;
  onRefreshSession: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  onClose,
  onRefreshSession
}) => {
  const [accounts, setAccounts] = useState<UserAccount[]>(getAllAccounts());
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [revealedPasswords, setRevealedPasswords] = useState<{ [id: string]: boolean }>({});
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const reload = () => {
    const updated = getAllAccounts();
    setAccounts(updated);
    onRefreshSession();
  };

  const showFeedback = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleTogglePlan = (user: UserAccount) => {
    if (user.username.toLowerCase() === 'shepherd') return;
    const nextPlan = user.plan === 'premium' ? 'free' : 'premium';
    const nextStatus = nextPlan === 'premium' ? 'paid' : 'none';
    updateUserPlan(user.id, nextPlan, nextStatus);
    reload();
    showFeedback(`Updated ${user.username} to ${nextPlan.toUpperCase()}!`);
  };

  const handleResetPassword = (userId: string) => {
    if (!newPasswordInput.trim()) return;
    adminResetPassword(userId, newPasswordInput.trim());
    setEditingUserId(null);
    setNewPasswordInput('');
    reload();
    showFeedback('Password updated successfully!');
  };

  const handleDelete = (userId: string, username: string) => {
    if (username.toLowerCase() === 'shepherd') return;
    if (window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      deleteAccount(userId);
      reload();
      showFeedback(`Account ${username} deleted.`);
    }
  };

  const toggleRevealPassword = (id: string) => {
    setRevealedPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredAccounts = accounts.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.phone && u.phone.includes(searchQuery))
  );

  const totalUsers = accounts.length;
  const premiumCount = accounts.filter(u => u.plan === 'premium').length;
  const pendingOfflineCount = accounts.filter(u => u.paymentStatus === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white font-['Outfit']">
                  Master Admin Control Panel
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white uppercase tracking-wider">
                  Shepherd Admin
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Manage user accounts, offline payment unblocking, and password recovery.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-3 gap-2 p-3 sm:p-4 bg-neutral-950/50 border-b border-neutral-800/80">
          <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-neutral-400 uppercase font-semibold">Total Accounts</p>
              <p className="text-base font-bold text-white font-mono">{totalUsers}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-neutral-400 uppercase font-semibold">Active Premium</p>
              <p className="text-base font-bold text-emerald-400 font-mono">{premiumCount}</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-neutral-400 uppercase font-semibold">Pending Offline Payments</p>
              <p className="text-base font-bold text-amber-400 font-mono">{pendingOfflineCount}</p>
            </div>
          </div>
        </div>

        {/* Notification Banner */}
        {actionSuccessMsg && (
          <div className="bg-emerald-950/70 border-b border-emerald-600/40 px-4 py-2 text-xs font-bold text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Search & Actions Bar */}
        <div className="p-3 sm:p-4 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search accounts by username or phone..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-800 text-neutral-300 border border-neutral-700">
              <PhoneCall className="w-3.5 h-3.5 text-rose-400" />
              <span>Offline Contact: +27687982000</span>
            </span>
          </div>
        </div>

        {/* Users Table / List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-10 text-neutral-500 text-xs">
              No accounts matched your search.
            </div>
          ) : (
            filteredAccounts.map((user) => {
              const isShepherd = user.username.toLowerCase() === 'shepherd';
              const isRevealed = revealedPasswords[user.id] || false;
              const isEditing = editingUserId === user.id;

              return (
                <div
                  key={user.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isShepherd
                      ? 'bg-amber-950/20 border-amber-500/40 ring-1 ring-amber-500/20'
                      : user.paymentStatus === 'pending'
                      ? 'bg-amber-950/30 border-amber-600/60 ring-1 ring-amber-500/40 shadow-md'
                      : user.plan === 'premium'
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* User Info */}
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        isShepherd 
                          ? 'bg-amber-500 text-black' 
                          : user.plan === 'premium' 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-neutral-800 text-neutral-300'
                      }`}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-white font-['Outfit']">
                            {user.username}
                          </span>
                          {isShepherd && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              👑 MASTER ADMIN
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            user.plan === 'premium'
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-600/40'
                              : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                          }`}>
                            {user.plan === 'premium' ? 'PREMIUM (UNLIMITED)' : 'FREE (5 CLIPS MAX)'}
                          </span>

                          {user.paymentStatus === 'pending' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-black animate-pulse flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              PAYMENT AWAITING UNBLOCK
                            </span>
                          )}
                        </div>

                        {/* Password Display & Password Reset Tool */}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-400 flex-wrap">
                          <div className="flex items-center gap-1.5 bg-neutral-900 px-2 py-0.5 rounded-lg border border-neutral-800">
                            <KeyRound className="w-3 h-3 text-neutral-400" />
                            <span className="text-[11px] font-mono">
                              {isRevealed ? user.password : '••••••••'}
                            </span>
                            <button
                              onClick={() => toggleRevealPassword(user.id)}
                              className="text-neutral-500 hover:text-white ml-1"
                              title={isRevealed ? 'Hide password' : 'View password'}
                            >
                              {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>

                          <span className="text-[10px] text-neutral-500">
                            Created: {new Date(user.createdAt).toLocaleDateString()}
                          </span>

                          {user.phone && (
                            <span className="text-[10px] text-neutral-400">
                              📞 {user.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Admin Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap self-end lg:self-center shrink-0">
                      {/* Password Reset Helper */}
                      {isEditing ? (
                        <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-xl border border-neutral-700">
                          <input
                            type="text"
                            value={newPasswordInput}
                            onChange={(e) => setNewPasswordInput(e.target.value)}
                            placeholder="New password..."
                            className="bg-neutral-950 px-2 py-1 text-xs text-white rounded border border-neutral-800 w-28 focus:outline-none"
                          />
                          <button
                            onClick={() => handleResetPassword(user.id)}
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="px-1.5 py-1 text-neutral-400 hover:text-white text-[11px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingUserId(user.id);
                            setNewPasswordInput('');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold border border-neutral-700 flex items-center gap-1 transition-colors"
                          title="Change password to help user if they forgot"
                        >
                          <Edit3 className="w-3 h-3 text-sky-400" />
                          <span>Reset Password</span>
                        </button>
                      )}

                      {/* Unblock / Upgrade Button */}
                      {!isShepherd && (
                        <button
                          onClick={() => handleTogglePlan(user)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow ${
                            user.plan === 'premium'
                              ? 'bg-neutral-800 hover:bg-rose-950/50 hover:text-rose-400 text-neutral-300 border border-neutral-700'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {user.plan === 'premium' ? (
                            <>
                              <Lock className="w-3.5 h-3.5 text-neutral-400" />
                              <span>Downgrade to Free</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Unblock to Premium</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Delete Account */}
                      {!isShepherd && (
                        <button
                          onClick={() => handleDelete(user.id, user.username)}
                          className="p-2 rounded-xl bg-neutral-900 hover:bg-rose-900/50 text-neutral-500 hover:text-rose-400 border border-neutral-800 transition-colors"
                          title="Delete account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-400 gap-2">
          <span>Master Admin Portal • Full Access to All Accounts & Reset Keys</span>
          <span className="font-semibold text-neutral-300">Shepherd Zisper Phiri | +27687982000</span>
        </div>
      </div>
    </div>
  );
};
