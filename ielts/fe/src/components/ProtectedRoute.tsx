import { Outlet } from 'react-router-dom';
import { useUserStore } from '../store/useUserStore';

export default function ProtectedRoute() {
  const { isAuthenticated, token } = useUserStore();
  const isAuthed = isAuthenticated && !!token;

  if (!isAuthed) {
    return <Outlet />;
  }

  return <Outlet />;
}
