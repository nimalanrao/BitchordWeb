import { useState, useEffect } from 'react';
import { create } from 'zustand';

const ACCESS_KEY_STORAGE = 'bitchord:access_granted';
export const REQUIRED_ACCESS_KEY = 'kushagrahatescustomization';

interface AccessGateState {
  isGranted: boolean;
  grantAccess: (key: string) => boolean;
  revokeAccess: () => void;
}

function checkAccess(): boolean {
  try {
    return localStorage.getItem(ACCESS_KEY_STORAGE) === 'true';
  } catch {
    return false;
  }
}

export const useAccessGate = create<AccessGateState>((set) => ({
  isGranted: checkAccess(),
  grantAccess: (key: string) => {
    if (key.trim() === REQUIRED_ACCESS_KEY) {
      try {
        localStorage.setItem(ACCESS_KEY_STORAGE, 'true');
      } catch {
        // Ignore storage errors
      }
      set({ isGranted: true });
      return true;
    }
    return false;
  },
  revokeAccess: () => {
    try {
      localStorage.removeItem(ACCESS_KEY_STORAGE);
    } catch {
      // Ignore
    }
    set({ isGranted: false });
  },
}));
