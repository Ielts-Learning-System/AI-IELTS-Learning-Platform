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

export const useUserStore = create<UserState>()((set) => ({
  user: null,
  isAuthenticated: false,
  token: null,

  setAuth: (user, token) => {
    set({ 
      user, 
      token, 
      isAuthenticated: true 
    });
  },

  logout: () => {
    localStorage.clear();
    sessionStorage.clear();
    set({ 
      user: null, 
      token: null, 
      isAuthenticated: false 
    });
    window.location.replace('/');
  },
}));
