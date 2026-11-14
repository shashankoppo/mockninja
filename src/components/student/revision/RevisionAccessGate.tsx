import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { useAuth } from '@/lib/auth';
import { fetchHasPaidAccess } from '@/lib/revision';

export function RevisionAccessGate({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const { data: hasAccess, isLoading, isError, refetch } = useQuery({
    queryKey: ['revision-paid-access', userId],
    queryFn: () => fetchHasPaidAccess(userId),
    enabled: userId !== '',
  });

  if (isLoading) {
    return (
      <StudentLayout>
        <Skeleton className="h-72 w-full" />
      </StudentLayout>
    );
  }

  if (isError) {
    return (
      <StudentLayout>
        <ErrorState
          title="Revision Vault could not be checked"
          description="Check your connection and try again."
          action={<button onClick={() => refetch()} className="text-sm font-semibold text-govt-300 hover:text-govt-200">Try again</button>}
        />
      </StudentLayout>
    );
  }

  if (hasAccess) return <>{children}</>;

  return (
    <StudentLayout>
      <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-[#11121c] p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
          <Lock className="h-5 w-5 text-amber-300" aria-hidden />
        </div>
        <h1 className="text-xl font-bold text-white">Revision Vault is for paid plans</h1>
        <p className="mt-2 text-sm leading-relaxed text-navy-300">
          Chapter notes and formula flashcards unlock with an active paid plan. Your free account keeps access to free mock tests.
        </p>
        <Link to="/subscription" className="mt-6 inline-block">
          <Button>View plans</Button>
        </Link>
      </div>
    </StudentLayout>
  );
}
