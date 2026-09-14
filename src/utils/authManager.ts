export interface UserAccount {
  id: string;
  username: string;
  password: string; // Stored so admin can help if user forgets password
  role: 'admin' | 'user';
  plan: 'free' | 'premium';
  paymentStatus: 'none' | 'pending' | 'paid';
  createdAt: number;
  phone?: string;
  lastLoginAt?: number;
}

const STORAGE_KEY = 'zcut_accounts_db_v1';
const CURRENT_USER_KEY = 'zcut_active_session_user';

// Master Admin Seed
const MASTER_ADMIN: UserAccount = {
  id: 'admin_master_shepherd',
  username: 'Shepherd',
  password: 'shepherd@admin',
  role: 'admin',
  plan: 'premium',
  paymentStatus: 'paid',
  createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
  phone: '+27687982000'
};

export function getAllAccounts(): UserAccount[] {
  if (typeof window === 'undefined') return [MASTER_ADMIN];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = [MASTER_ADMIN];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed: UserAccount[] = JSON.parse(raw);
    // Ensure master admin always exists and has admin credentials
    const adminIdx = parsed.findIndex(u => u.username.toLowerCase() === 'shepherd');
    if (adminIdx === -1) {
      parsed.unshift(MASTER_ADMIN);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } else {
      // Ensure Shepherd always has admin role and correct credentials
      parsed[adminIdx].role = 'admin';
      parsed[adminIdx].plan = 'premium';
      if (!parsed[adminIdx].password) {
        parsed[adminIdx].password = 'shepherd@admin';
      }
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load accounts:', err);
    return [MASTER_ADMIN];
  }
}

export function saveAllAccounts(accounts: UserAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.error('Failed to save accounts:', err);
  }
}

export function getCurrentUser(): UserAccount | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    const all = getAllAccounts();
    return all.find(u => u.id === session.id) || null;
  } catch (err) {
    return null;
  }
}

export const getActiveSession = getCurrentUser;

export function setCurrentUserSession(user: UserAccount | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ id: user.id, username: user.username }));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (err) {
    console.error('Failed to update session:', err);
  }
}

export function registerUser(username: string, password: string, phone?: string): { success: boolean; message: string; user?: UserAccount } {
  const trimmedUser = username.trim();
  const trimmedPass = password.trim();

  if (!trimmedUser || !trimmedPass) {
    return { success: false, message: 'Please enter both a Name/Username and Password.' };
  }

  if (trimmedPass.length < 4) {
    return { success: false, message: 'Password must be at least 4 characters long.' };
  }

  const all = getAllAccounts();
  const exists = all.some(u => u.username.toLowerCase() === trimmedUser.toLowerCase());
  if (exists) {
    return { success: false, message: 'An account with this name already exists. Please login or pick another name.' };
  }

  const isMasterAdmin = trimmedUser.toLowerCase() === 'shepherd';

  const newUser: UserAccount = {
    id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    username: trimmedUser,
    password: trimmedPass,
    role: isMasterAdmin ? 'admin' : 'user',
    plan: isMasterAdmin ? 'premium' : 'free',
    paymentStatus: isMasterAdmin ? 'paid' : 'none',
    createdAt: Date.now(),
    phone: phone?.trim() || undefined,
    lastLoginAt: Date.now()
  };

  all.push(newUser);
  saveAllAccounts(all);
  setCurrentUserSession(newUser);

  return { success: true, message: 'Account created successfully!', user: newUser };
}

export function loginUser(username: string, password: string): { success: boolean; message: string; user?: UserAccount } {
  const trimmedUser = username.trim();
  const trimmedPass = password.trim();

  const all = getAllAccounts();
  const matched = all.find(u => u.username.toLowerCase() === trimmedUser.toLowerCase());

  if (!matched) {
    return { success: false, message: 'No account found with this username. Please sign up.' };
  }

  if (matched.password !== trimmedPass) {
    return { success: false, message: 'Incorrect password. Contact Admin Shepherd Zisper Phiri (+27687982000) for help.' };
  }

  matched.lastLoginAt = Date.now();
  saveAllAccounts(all);
  setCurrentUserSession(matched);

  return { success: true, message: `Welcome back, ${matched.username}!`, user: matched };
}

export function logoutUser(): void {
  setCurrentUserSession(null);
}

export function updateUserPlan(userId: string, plan: 'free' | 'premium', paymentStatus: 'none' | 'pending' | 'paid' = 'paid'): boolean {
  const all = getAllAccounts();
  const user = all.find(u => u.id === userId);
  if (!user) return false;

  user.plan = plan;
  user.paymentStatus = paymentStatus;
  saveAllAccounts(all);
  return true;
}

export function requestOfflinePayment(userId: string): boolean {
  const all = getAllAccounts();
  const user = all.find(u => u.id === userId);
  if (!user) return false;

  user.paymentStatus = 'pending';
  saveAllAccounts(all);
  return true;
}

export function adminResetPassword(userId: string, newPassword: string): boolean {
  const all = getAllAccounts();
  const user = all.find(u => u.id === userId);
  if (!user) return false;

  user.password = newPassword.trim();
  saveAllAccounts(all);
  return true;
}

export function deleteAccount(userId: string): boolean {
  const all = getAllAccounts();
  const user = all.find(u => u.id === userId);
  if (!user || user.username.toLowerCase() === 'shepherd') {
    return false; // Cannot delete master admin
  }

  const filtered = all.filter(u => u.id !== userId);
  saveAllAccounts(filtered);
  return true;
}
