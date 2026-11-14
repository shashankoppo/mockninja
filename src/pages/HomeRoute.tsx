import { useAuth } from '@/lib/auth';
import { LandingPage } from '@/pages/LandingPage';
import { SignedInHome } from '@/features/home/components/SignedInHome';
import { Skeleton } from '@/components/ui/skeleton';

export function HomeRoute() {
  const { session, loading } = useAuth();

  if (loading && session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d0e15]">
        <Skeleton className="h-96 w-full max-w-3xl" />
      </div>
    );
  }

  return session ? <SignedInHome /> : <LandingPage />;
}
