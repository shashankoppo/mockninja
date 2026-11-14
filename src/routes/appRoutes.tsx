import { lazy, Suspense, type ReactElement } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PublicOnlyRoute } from '@/components/auth/PublicOnlyRoute';
import { LoadingScreen } from '@/components/auth/LoadingScreen';
import type { AppRole } from '@/lib/auth';

import { LandingPage } from '@/pages/LandingPage';
import { HomeRoute } from '@/pages/HomeRoute';
import { NotFoundPage } from '@/pages/NotFoundPage';

const LoginPage = lazy(() => import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('@/pages/auth/SignupPage').then((m) => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const OnboardingPage = lazy(() => import('@/pages/auth/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));
const VerifyEmailPage = lazy(() => import('@/pages/auth/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })));

const DashboardPage = lazy(() => import('@/pages/student/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const AttemptedTestsPage = lazy(() => import('@/pages/student/AttemptedTestsPage').then((m) => ({ default: m.AttemptedTestsPage })));
const MocksPage = lazy(() => import('@/pages/student/MocksPage').then((m) => ({ default: m.MocksPage })));
const MockDetailPage = lazy(() => import('@/pages/student/MockDetailPage').then((m) => ({ default: m.MockDetailPage })));
const ExamPage = lazy(() => import('@/pages/student/ExamPage').then((m) => ({ default: m.ExamPage })));
const ResultsPage = lazy(() => import('@/pages/student/ResultsPage').then((m) => ({ default: m.ResultsPage })));
const RankPredictorPage = lazy(() => import('@/pages/student/RankPredictorPage').then((m) => ({ default: m.RankPredictorPage })));
const SolutionsPage = lazy(() => import('@/pages/student/SolutionsPage').then((m) => ({ default: m.SolutionsPage })));
const FocusPage = lazy(() => import('@/pages/student/FocusPage').then((m) => ({ default: m.FocusPage })));
const ProgressPage = lazy(() => import('@/pages/student/ProgressPage').then((m) => ({ default: m.ProgressPage })));
const LeaderboardPage = lazy(() => import('@/pages/student/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })));
const SettingsPage = lazy(() => import('@/pages/student/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const MasteryPage = lazy(() => import('@/pages/student/MasteryPage').then((m) => ({ default: m.MasteryPage })));
const StudyPlanPage = lazy(() => import('@/pages/student/StudyPlanPage').then((m) => ({ default: m.StudyPlanPage })));
const MistakeNotebookPage = lazy(() => import('@/pages/student/MistakeNotebookPage').then((m) => ({ default: m.MistakeNotebookPage })));
const DppStudentPage = lazy(() => import('@/pages/student/DppStudentPage').then((m) => ({ default: m.DppStudentPage })));
const CustomPracticePage = lazy(() => import('@/pages/student/CustomPracticePage').then((m) => ({ default: m.CustomPracticePage })));
const CustomPracticeHistoryPage = lazy(() => import('@/pages/student/CustomPracticeHistoryPage').then((m) => ({ default: m.CustomPracticeHistoryPage })));
const ResourcesPage = lazy(() => import('@/pages/student/ResourcesPage').then((m) => ({ default: m.ResourcesPage })));
const AccountPage = lazy(() => import('@/pages/student/AccountPage').then((m) => ({ default: m.AccountPage })));
const ReattemptPage = lazy(() => import('@/pages/student/ReattemptPage').then((m) => ({ default: m.ReattemptPage })));
const BookmarksPage = lazy(() => import('@/pages/student/BookmarksPage').then((m) => ({ default: m.BookmarksPage })));
const RevisionNotesPage = lazy(() => import('@/pages/student/RevisionNotesPage').then((m) => ({ default: m.RevisionNotesPage })));
const RevisionNoteReaderPage = lazy(() => import('@/pages/student/RevisionNoteReaderPage').then((m) => ({ default: m.RevisionNoteReaderPage })));
const FormulaFlashcardsPage = lazy(() => import('@/pages/student/FormulaFlashcardsPage').then((m) => ({ default: m.FormulaFlashcardsPage })));
const RevisionAccessGate = lazy(() => import('@/components/student/revision/RevisionAccessGate').then((m) => ({ default: m.RevisionAccessGate })));
const SubscriptionPlansPage = lazy(() => import('@/pages/student/SubscriptionPlansPage').then((m) => ({ default: m.SubscriptionPlansPage })));
const CheckoutPage = lazy(() => import('@/pages/student/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const PaymentSuccessPage = lazy(() => import('@/pages/student/PaymentSuccessPage').then((m) => ({ default: m.PaymentSuccessPage })));
const PaymentFailurePage = lazy(() => import('@/pages/student/PaymentFailurePage').then((m) => ({ default: m.PaymentFailurePage })));
const BillingPage = lazy(() => import('@/pages/student/BillingPage').then((m) => ({ default: m.BillingPage })));
const NotificationsSupportPage = lazy(() => import('@/pages/student/NotificationsSupportPage').then((m) => ({ default: m.NotificationsSupportPage })));
const ReportQuestionPage = lazy(() => import('@/pages/student/ReportQuestionPage').then((m) => ({ default: m.ReportQuestionPage })));
const TestSeriesPage = lazy(() => import('@/pages/student/TestSeriesPage').then((m) => ({ default: m.TestSeriesPage })));
const AnalyticsPage = lazy(() => import('@/pages/student/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));

const TrustPage = lazy(() => import('@/pages/public/TrustPage').then((m) => ({ default: m.TrustPage })));
const AboutPage = lazy(() => import('@/pages/public/AboutPage').then((m) => ({ default: m.AboutPage })));
const PrivacyPage = lazy(() => import('@/pages/public/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('@/pages/public/TermsPage').then((m) => ({ default: m.TermsPage })));
const MockTestsPage = lazy(() => import('@/pages/public/MockTestsPage').then((m) => ({ default: m.MockTestsPage })));
const PreviousYearPapersPage = lazy(() => import('@/pages/public/PreviousYearPapersPage').then((m) => ({ default: m.PreviousYearPapersPage })));
const ChaptersPage = lazy(() => import('@/pages/public/ChaptersPage').then((m) => ({ default: m.ChaptersPage })));
const RevisionVaultPage = lazy(() => import('@/pages/public/RevisionVaultPage').then((m) => ({ default: m.RevisionVaultPage })));
const PricingPage = lazy(() => import('@/pages/public/PricingPage').then((m) => ({ default: m.PricingPage })));
const FaqPage = lazy(() => import('@/pages/public/FaqPage').then((m) => ({ default: m.FaqPage })));
const ContactPage = lazy(() => import('@/pages/public/ContactPage').then((m) => ({ default: m.ContactPage })));

const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const AdminQuestionsPage = lazy(() => import('@/pages/admin/AdminQuestionsPage').then((m) => ({ default: m.AdminQuestionsPage })));
const AdminMocksPage = lazy(() => import('@/pages/admin/AdminMocksPage').then((m) => ({ default: m.AdminMocksPage })));
const AdminAiPage = lazy(() => import('@/pages/admin/AdminAiPage').then((m) => ({ default: m.AdminAiPage })));
const AdminReportsPage = lazy(() => import('@/pages/admin/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage })));
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage })));
const AdminTopicsPage = lazy(() => import('@/pages/admin/AdminTopicsPage').then((m) => ({ default: m.AdminTopicsPage })));
const AdminImportPage = lazy(() => import('@/pages/admin/AdminImportPage').then((m) => ({ default: m.AdminImportPage })));
const AdminProctoringPage = lazy(() => import('@/pages/admin/AdminProctoringPage').then((m) => ({ default: m.AdminProctoringPage })));
const AdminExamSettingsPage = lazy(() => import('@/pages/admin/AdminPages').then((m) => ({ default: m.AdminExamSettingsPage })));
const AdminAttemptsPage = lazy(() => import('@/pages/admin/AdminPages').then((m) => ({ default: m.AdminAttemptsPage })));
const AdminRankingsPage = lazy(() => import('@/pages/admin/AdminPages').then((m) => ({ default: m.AdminRankingsPage })));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminPages').then((m) => ({ default: m.AdminUsersPage })));
const AdminDeletionRequestsPage = lazy(() => import('@/pages/admin/AdminPages').then((m) => ({ default: m.AdminDeletionRequestsPage })));
const AdminBillingPage = lazy(() => import('@/pages/admin/AdminPages').then((m) => ({ default: m.AdminBillingPage })));
const AdminResourcesPage = lazy(() => import('@/pages/admin/AdminPages').then((m) => ({ default: m.AdminResourcesPage })));
const AdminContentPage = lazy(() => import('@/pages/admin/AdminPages').then((m) => ({ default: m.AdminContentPage })));
const AdminSupportPage = lazy(() => import('@/pages/admin/AdminPages').then((m) => ({ default: m.AdminSupportPage })));
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminPages').then((m) => ({ default: m.AdminSettingsPage })));
const AdminSiteSettingsPage = lazy(() => import('@/pages/admin/AdminPages').then((m) => ({ default: m.AdminSiteSettingsPage })));
const AdminSubscriptionPlansPage = lazy(() => import('@/pages/admin/AdminSubscriptionPlansPage').then((m) => ({ default: m.AdminSubscriptionPlansPage })));
const AdminHomepagePage = lazy(() => import('@/pages/admin/AdminHomepagePage').then((m) => ({ default: m.AdminHomepagePage })));
const AdminQuestionReportsPage = lazy(() => import('@/pages/admin/AdminQuestionReportsPage').then((m) => ({ default: m.AdminQuestionReportsPage })));
const AdminTransactionsPage = lazy(() => import('@/pages/admin/AdminTransactionsPage').then((m) => ({ default: m.AdminTransactionsPage })));
const AdminUserSubscriptionsPage = lazy(() => import('@/pages/admin/AdminUserSubscriptionsPage').then((m) => ({ default: m.AdminUserSubscriptionsPage })));
const AdminAnnouncementPage = lazy(() => import('@/pages/admin/AdminAnnouncementPage').then((m) => ({ default: m.AdminAnnouncementPage })));
const AdminReconciliationPage = lazy(() => import('@/pages/admin/AdminReconciliationPage').then((m) => ({ default: m.AdminReconciliationPage })));
const AdminPromoCodesPage = lazy(() => import('@/pages/admin/AdminPromoCodesPage').then((m) => ({ default: m.AdminPromoCodesPage })));
const AdminTestSeriesPage = lazy(() => import('@/pages/admin/AdminTestSeriesPage').then((m) => ({ default: m.AdminTestSeriesPage })));
const AdminTestFeedbackPage = lazy(() => import('@/pages/admin/AdminTestFeedbackPage').then((m) => ({ default: m.AdminTestFeedbackPage })));
const AdminLeaderboardSettingsPage = lazy(() => import('@/pages/admin/AdminLeaderboardSettingsPage').then((m) => ({ default: m.AdminLeaderboardSettingsPage })));
const AdminIntegrityPage = lazy(() => import('@/pages/admin/AdminIntegrityPage').then((m) => ({ default: m.AdminIntegrityPage })));
const AdminWatermarkSettingsPage = lazy(() => import('@/pages/admin/AdminWatermarkSettingsPage').then((m) => ({ default: m.AdminWatermarkSettingsPage })));

const DevMathPage = lazy(() => import('@/pages/dev/DevMathPage').then((m) => ({ default: m.DevMathPage })));
const DevUiPage = lazy(() => import('@/pages/dev/DevUiPage').then((m) => ({ default: m.DevUiPage })));

const ADMIN_ONLY: AppRole[] = ['ADMIN'];

const withSuspense = (element: ReactElement) => (
  <Suspense fallback={<LoadingScreen />}>{element}</Suspense>
);

const withAdmin = (element: ReactElement) => (
  withSuspense(<ProtectedRoute roles={[...ADMIN_ONLY]}>{element}</ProtectedRoute>)
);

const withAuth = (element: ReactElement) => (
  withSuspense(<ProtectedRoute>{element}</ProtectedRoute>)
);

const withPublicOnly = (element: ReactElement) => (
  withSuspense(<PublicOnlyRoute>{element}</PublicOnlyRoute>)
);

export const appRoutes: AppRoute[] = [
  // Public — eager loaded (landing page is the first thing users see)
  { path: '/', element: <HomeRoute /> },
  { path: '/login', element: withPublicOnly(<LoginPage />) },
  { path: '/signup', element: withPublicOnly(<SignupPage />) },
  { path: '/forgot-password', element: withPublicOnly(<ForgotPasswordPage />) },
  { path: '/reset-password', element: withPublicOnly(<ResetPasswordPage />) },
  { path: '/verify-email', element: withSuspense(<VerifyEmailPage />) },
  { path: '/onboarding', element: withAuth(<OnboardingPage />) },
  { path: '/trust', element: withSuspense(<TrustPage />) },
  { path: '/about', element: withSuspense(<AboutPage />) },
  { path: '/privacy', element: withSuspense(<PrivacyPage />) },
  { path: '/terms', element: withSuspense(<TermsPage />) },
  { path: '/mock-tests', element: withSuspense(<MockTestsPage />) },
  { path: '/previous-year-papers', element: withSuspense(<PreviousYearPapersPage />) },
  { path: '/chapters', element: withSuspense(<ChaptersPage />) },
  { path: '/revision-vault', element: withSuspense(<RevisionVaultPage />) },
  { path: '/dpp', element: withAuth(<DppStudentPage />) },
  { path: '/dpp/custom', element: withAuth(<CustomPracticePage />) },
  { path: '/dpp/custom/history', element: withAuth(<CustomPracticeHistoryPage />) },
  { path: '/pricing', element: withSuspense(<PricingPage />) },
  { path: '/faq', element: withSuspense(<FaqPage />) },
  { path: '/faqs', element: withSuspense(<FaqPage />) },
  { path: '/contact', element: withSuspense(<ContactPage />) },

  // Student
  { path: '/dashboard', element: withAuth(<DashboardPage />) },
  { path: '/attempted-tests', element: withAuth(<AttemptedTestsPage />) },
  { path: '/mocks', element: withAuth(<MocksPage />) },
  { path: '/mocks/:id', element: withAuth(<MockDetailPage />) },
  { path: '/exam/:attemptId', element: withAuth(<ExamPage />) },
  { path: '/results/:attemptId', element: withAuth(<ResultsPage />) },
  { path: '/rank-predictor/:attemptId', element: withAuth(<RankPredictorPage />) },
  { path: '/solution/:attemptId', element: withAuth(<SolutionsPage />) },
  { path: '/solution', element: withAuth(<SolutionsPage />) },
  { path: '/exam/:attemptId/reattempt', element: withAuth(<ReattemptPage />) },
  { path: '/mastery', element: withAuth(<MasteryPage />) },
  { path: '/performance', element: withAuth(<ProgressPage />) },
  { path: '/progress', element: withAuth(<ProgressPage />) },
  { path: '/leaderboard', element: withAuth(<LeaderboardPage />) },
  { path: '/study-plan', element: withAuth(<StudyPlanPage />) },
  { path: '/mistake-notebook', element: withAuth(<MistakeNotebookPage />) },
  { path: '/focus', element: withAuth(<FocusPage />) },
  { path: '/resources', element: withAuth(<ResourcesPage />) },
  { path: '/account', element: withAuth(<AccountPage />) },
  { path: '/settings', element: withAuth(<SettingsPage />) },
  { path: '/bookmarks', element: withAuth(<BookmarksPage />) },
  { path: '/revision-vault/notes', element: withAuth(<Suspense fallback={<LoadingScreen />}><RevisionAccessGate><RevisionNotesPage /></RevisionAccessGate></Suspense>) },
  { path: '/revision-vault/notes/:noteId', element: withAuth(<Suspense fallback={<LoadingScreen />}><RevisionAccessGate><RevisionNoteReaderPage /></RevisionAccessGate></Suspense>) },
  { path: '/revision-vault/flashcards', element: withAuth(<Suspense fallback={<LoadingScreen />}><RevisionAccessGate><FormulaFlashcardsPage /></RevisionAccessGate></Suspense>) },
  { path: '/subscription', element: withAuth(<SubscriptionPlansPage />) },
  { path: '/checkout', element: withAuth(<CheckoutPage />) },
  { path: '/payment/success', element: withAuth(<PaymentSuccessPage />) },
  { path: '/payment/failure', element: withAuth(<PaymentFailurePage />) },
  { path: '/payment/pending', element: withAuth(<PaymentFailurePage />) },
  { path: '/billing', element: withAuth(<BillingPage />) },
  { path: '/notifications', element: withAuth(<NotificationsSupportPage />) },
  { path: '/billing/transactions', element: withAuth(<BillingPage />) },
  { path: '/dashboard/billing', element: withAuth(<BillingPage />) },
  { path: '/report-question', element: withAuth(<ReportQuestionPage />) },
  { path: '/series', element: withAuth(<TestSeriesPage />) },
  { path: '/test-series', element: withAuth(<TestSeriesPage />) },
  { path: '/analytics', element: withAuth(<AnalyticsPage />) },

  // Admin
  { path: '/admin', element: withAdmin(<AdminDashboardPage />) },
  { path: '/admin/topics', element: withAdmin(<AdminTopicsPage />) },
  { path: '/admin/questions', element: withAdmin(<AdminQuestionsPage />) },
  { path: '/admin/questions/import', element: withAdmin(<AdminImportPage />) },
  { path: '/admin/mocks', element: withAdmin(<AdminMocksPage />) },
  { path: '/admin/exam-settings', element: withAdmin(<Suspense fallback={<LoadingScreen />}><AdminExamSettingsPage /></Suspense>) },
  { path: '/admin/attempts', element: withAdmin(<Suspense fallback={<LoadingScreen />}><AdminAttemptsPage /></Suspense>) },
  { path: '/admin/rankings', element: withAdmin(<Suspense fallback={<LoadingScreen />}><AdminRankingsPage /></Suspense>) },
  { path: '/admin/proctoring', element: withAdmin(<AdminProctoringPage />) },
  { path: '/admin/integrity', element: withAdmin(<AdminIntegrityPage />) },
  { path: '/admin/announcement', element: withAdmin(<AdminAnnouncementPage />) },
  { path: '/admin/users', element: withAdmin(<Suspense fallback={<LoadingScreen />}><AdminUsersPage /></Suspense>) },
  { path: '/admin/users/deletions', element: withAdmin(<Suspense fallback={<LoadingScreen />}><AdminDeletionRequestsPage /></Suspense>) },
  { path: '/admin/billing', element: withAdmin(<Suspense fallback={<LoadingScreen />}><AdminBillingPage /></Suspense>) },
  { path: '/admin/subscriptions', element: withAdmin(<AdminSubscriptionPlansPage />) },
  { path: '/admin/resources', element: withAdmin(<Suspense fallback={<LoadingScreen />}><AdminResourcesPage /></Suspense>) },
  { path: '/admin/content', element: withAdmin(<Suspense fallback={<LoadingScreen />}><AdminContentPage /></Suspense>) },
  { path: '/admin/support', element: withAdmin(<Suspense fallback={<LoadingScreen />}><AdminSupportPage /></Suspense>) },
  { path: '/admin/ai', element: withAdmin(<AdminAiPage />) },
  { path: '/admin/reports', element: withAdmin(<AdminReportsPage />) },
  { path: '/admin/question-reports', element: withAdmin(<AdminQuestionReportsPage />) },
  { path: '/admin/analytics', element: withAdmin(<AdminAnalyticsPage />) },
  { path: '/admin/settings', element: withAdmin(<Suspense fallback={<LoadingScreen />}><AdminSettingsPage /></Suspense>) },
  { path: '/admin/settings/site', element: withAdmin(<Suspense fallback={<LoadingScreen />}><AdminSiteSettingsPage /></Suspense>) },
  { path: '/admin/settings/leaderboard', element: withAdmin(<AdminLeaderboardSettingsPage />) },
  { path: '/admin/settings/watermark', element: withAdmin(<AdminWatermarkSettingsPage />) },
  { path: '/admin/homepage', element: withAdmin(<AdminHomepagePage />) },
  { path: '/admin/transactions', element: withAdmin(<AdminTransactionsPage />) },
  { path: '/admin/user-subscriptions', element: withAdmin(<AdminUserSubscriptionsPage />) },
  { path: '/admin/reconciliation', element: withAdmin(<AdminReconciliationPage />) },
  { path: '/admin/promo-codes', element: withAdmin(<AdminPromoCodesPage />) },
  { path: '/admin/test-series', element: withAdmin(<AdminTestSeriesPage />) },
  { path: '/admin/test-feedback', element: withAdmin(<AdminTestFeedbackPage />) },

  // Dev
  { path: '/dev/math', element: withSuspense(<DevMathPage />) },
  { path: '/dev/ui', element: withSuspense(<DevUiPage />) },

  // 404 — eager loaded so users see it instantly
  { path: '*', element: <NotFoundPage /> },
];

type AppRoute = { path: string; element: ReactElement };
