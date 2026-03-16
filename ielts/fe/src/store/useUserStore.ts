import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isVip: boolean;
  role: string; // added for user role
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      token: null,

      setAuth: (user, token) => {
        localStorage.setItem('token', token);
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
    }),
    {
      name: 'user-store', // key for localStorage
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated,
        token: state.token 
      }),
    }
  )
);
