import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isVip: boolean;
  role: string; // added for user role
  subscriptionPlan: 'Free' | 'VIP_1_MONTH' | 'VIP_6_MONTH' | 'VIP_1_YEAR';
  vipValidUntil: string | null;
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

// rehydrate from localStorage on module load (survives page refresh)
const _savedToken = localStorage.getItem('accessToken');
const _savedUser  = (() => { try { return JSON.parse(localStorage.getItem('user') || ''); } catch { return null; } })();

export const useUserStore = create<UserState>()((set) => ({
  user:            _savedUser  || null,
  isAuthenticated: !!(_savedToken && _savedUser),
  token:           _savedToken || null,

  setAuth: (user, token) => {
    // persist token so apiClient interceptor (localStorage.getItem('accessToken')) works
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ 
      user, 
      token, 
      isAuthenticated: true 
    });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    sessionStorage.clear();
    set({ 
      user: null, 
      token: null, 
      isAuthenticated: false 
    });
    window.location.replace('/');
  },
}));
