import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, mfaPending } = useAuth();
  if (loading) return null;
  if (session && !mfaPending) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
