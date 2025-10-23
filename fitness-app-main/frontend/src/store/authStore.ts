import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'gym_manager' | 'trainee' | 'trainer' | 'head_admin';
  picture?: string;
}

interface AuthState {
  user: User | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setSessionToken: (token: string | null) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  sessionToken: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setSessionToken: async (token) => {
    if (token) {
      await SecureStore.setItemAsync('session_token', token);
    } else {
      await SecureStore.deleteItemAsync('session_token');
    }
    set({ sessionToken: token });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('session_token');
    set({ user: null, sessionToken: null, isAuthenticated: false });
  },

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('session_token');
      if (token) {
        set({ sessionToken: token, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      set({ isLoading: false });
    }
  },
}));
