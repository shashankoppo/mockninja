import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type AppRole } from '@/lib/auth';
import { LoadingScreen } from '@/components/auth/LoadingScreen';

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: AppRole[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { session, profile, loading, needsOnboarding, mfaPending } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!session || mfaPending) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
