import { Bell, Crown } from 'lucide-react';
import { useUserStore } from '../../store/useUserStore';

export function Navbar() {
  const { user } = useUserStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-indigo-100 bg-white px-6 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
          I
        </div>
        <span className="text-xl font-bold text-indigo-950">IELTS Master</span>
      </div>

      <div className="flex items-center gap-4">
        <button className="flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-200">
          <Crown className="h-4 w-4" />
          Nâng cấp VIP
        </button>

        <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500"></span>
        </button>

        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-slate-700">{user?.name}</span>
            <span className="text-xs text-slate-500">Band Target: 7.5</span>
          </div>
          <img 
            src={user?.avatar} 
            alt="Avatar" 
            className="h-9 w-9 rounded-full border-2 border-indigo-100 object-cover"
          />
        </div>
      </div>
    </header>
  );
}
