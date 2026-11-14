import { StudentLayout } from '@/layouts/StudentLayout';
import { PerformanceAnalytics } from '@/components/student/PerformanceAnalytics';

export function AnalyticsPage() {
  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Performance Analytics</h1>
          <p className="text-sm text-navy-400">Detailed breakdown of your accuracy, speed, and subject-wise trends.</p>
        </div>
        <PerformanceAnalytics />
      </div>
    </StudentLayout>
  );
}
