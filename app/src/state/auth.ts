import { create } from 'zustand';
import { queryClient } from '@/lib/queryClient';

export interface GoogleUserProfile {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

interface GoogleAuthState {
  signedIn: boolean;
  user: GoogleUserProfile | null;
  lastSynced: number | null;
  isSyncing: boolean;
  signIn: (profile?: Partial<GoogleUserProfile>) => void;
  signOut: () => void;
  syncLibrary: () => Promise<void>;
}

const STORAGE_KEY = 'bitchord:google_auth';

function loadStoredAuth(): { signedIn: boolean; user: GoogleUserProfile | null; lastSynced: number | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { signedIn: false, user: null, lastSynced: null };
    const parsed = JSON.parse(raw);
    return {
      signedIn: !!parsed.signedIn,
      user: parsed.user ?? null,
      lastSynced: parsed.lastSynced ?? null,
    };
  } catch {
    return { signedIn: false, user: null, lastSynced: null };
  }
}

export const useGoogleAuth = create<GoogleAuthState>((set, get) => {
  const initial = loadStoredAuth();

  return {
    signedIn: initial.signedIn,
    user: initial.user,
    lastSynced: initial.lastSynced,
    isSyncing: false,

    signIn: (profile) => {
      const user: GoogleUserProfile = {
        id: profile?.id || 'google_user_default',
        name: profile?.name || 'Google User',
        email: profile?.email || 'user@gmail.com',
        avatarUrl: profile?.avatarUrl || '',
      };
      const now = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ signedIn: true, user, lastSynced: now }));
      set({ signedIn: true, user, lastSynced: now });
      void queryClient.invalidateQueries({ queryKey: ['music'] });
    },

    signOut: () => {
      localStorage.removeItem(STORAGE_KEY);
      set({ signedIn: false, user: null, lastSynced: null, isSyncing: false });
      void queryClient.invalidateQueries({ queryKey: ['music'] });
    },

    syncLibrary: async () => {
      set({ isSyncing: true });
      try {
        await queryClient.refetchQueries({ queryKey: ['music', 'library'] });
        const now = Date.now();
        const current = get();
        if (current.user) {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ signedIn: true, user: current.user, lastSynced: now }),
          );
        }
        set({ lastSynced: now, isSyncing: false });
      } catch {
        set({ isSyncing: false });
      }
    },
  };
});
