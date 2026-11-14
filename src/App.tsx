import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { MaintenanceGate } from '@/components/common/MaintenanceGate';
import { BeltSprite } from '@/components/common/Belt';
import { ThemeProvider } from '@/lib/theme';
import { Toaster } from '@/components/ui/toast';
import { AuthProvider } from '@/lib/auth';
import { Seo } from '@/components/common/Seo';
import { appRoutes } from '@/routes/appRoutes';
import '@/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false },
  },
});

const ROUTE_META: Record<string, { title: string; description: string }> = {
  '/': { title: 'Mock Ninja — JEE mock tests that tell you what to fix next', description: 'Independent JEE Main and JEE Advanced mock-test and practice platform. Realistic tests, honest scoring, clear weak-topic tracking.' },
  '/about': { title: 'About Mock Ninja', description: 'An independent JEE practice platform built for honest, data-driven preparation. Not affiliated with NTA.' },
  '/mock-tests': { title: 'Mock Tests — JEE Main & Advanced', description: 'Browse full-length, subject-wise, and chapter mock tests for JEE Main and Advanced.' },
  '/previous-year-papers': { title: 'Previous Year Papers — JEE', description: 'Practice with previous-year JEE questions organised by year, subject, and chapter.' },
  '/chapters': { title: 'Chapter Practice — JEE PCM', description: 'Practice questions by chapter across Physics, Chemistry, and Mathematics.' },
  '/revision-vault': { title: 'Revision Vault', description: 'Revision notes and formula flashcards for JEE Physics, Chemistry, and Mathematics.' },
  '/pricing': { title: 'Pricing — Mock Ninja', description: 'Free and paid plans for JEE mock-test practice. No hidden charges.' },
  '/faq': { title: 'FAQ — Mock Ninja', description: 'Frequently asked questions about Mock Ninja mock tests, scoring, and subscriptions.' },
  '/contact': { title: 'Contact Mock Ninja', description: 'Get help with your Mock Ninja account, tests, or subscriptions.' },
  '/trust': { title: 'Trust Centre — Mock Ninja', description: 'How Mock Ninja keeps your data safe and your scores honest.' },
  '/privacy': { title: 'Privacy Policy — Mock Ninja', description: 'How Mock Ninja collects, uses, and protects your personal data.' },
  '/terms': { title: 'Terms of Service — Mock Ninja', description: 'The terms and conditions for using Mock Ninja.' },
};

function getRouteMeta(pathname: string) {
  if (ROUTE_META[pathname]) return ROUTE_META[pathname];
  if (pathname.startsWith('/login')) return { title: 'Sign In — Mock Ninja', description: 'Sign in to your Mock Ninja account.' };
  if (pathname.startsWith('/signup')) return { title: 'Sign Up — Mock Ninja', description: 'Create a Mock Ninja account and start practising.' };
  if (pathname.startsWith('/admin')) return { title: 'Admin — Mock Ninja', description: '' };
  if (pathname.startsWith('/dashboard')) return { title: 'Dashboard — Mock Ninja', description: '' };
  if (pathname.startsWith('/mocks')) return { title: 'Mock Tests — Mock Ninja', description: '' };
  if (pathname.startsWith('/exam')) return { title: 'Exam — Mock Ninja', description: '' };
  if (pathname.startsWith('/results')) return { title: 'Results — Mock Ninja', description: '' };
  if (pathname.startsWith('/leaderboard')) return { title: 'Leaderboard — Mock Ninja', description: '' };
  if (pathname.startsWith('/progress') || pathname.startsWith('/performance')) return { title: 'Progress — Mock Ninja', description: '' };
  if (pathname.startsWith('/mastery')) return { title: 'Mastery — Mock Ninja', description: '' };
  return { title: 'Mock Ninja', description: '' };
}

function RouteMetaManager() {
  const { pathname } = useLocation();
  const meta = getRouteMeta(pathname);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return <Seo title={meta.title} description={meta.description} path={pathname} />;
}

function AppRoutes() {
  return (
    <Routes>
      {appRoutes.map((route) => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
          <BrowserRouter>
            <OfflineBanner />
            <RouteMetaManager />
            <MaintenanceGate>
              <AppRoutes />
            </MaintenanceGate>
            <Toaster />
          </BrowserRouter>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
