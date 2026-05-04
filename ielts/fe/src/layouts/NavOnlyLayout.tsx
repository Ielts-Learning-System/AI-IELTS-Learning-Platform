import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';

/**
 * Full-screen layout that renders only the top Navbar with no sidebar.
 * Used for immersive exam execution pages.
 */
export function NavOnlyLayout() {
  return (
    <div className="h-screen bg-white font-sans text-slate-900 flex flex-col overflow-hidden">
      <Navbar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
