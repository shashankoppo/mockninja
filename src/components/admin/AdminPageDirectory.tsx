import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const ADMIN_PAGE_GROUPS: { label: string; pages: { to: string; name: string }[] }[] = [
  {
    label: 'Overview',
    pages: [{ to: '/admin', name: 'Dashboard' }],
  },
  {
    label: 'Content',
    pages: [
      { to: '/admin/topics', name: 'Topics' },
      { to: '/admin/questions', name: 'Question bank' },
      { to: '/admin/questions/import', name: 'Import questions' },
      { to: '/admin/question-reports', name: 'Question reports' },
      { to: '/admin/mocks', name: 'Mock builder' },
      { to: '/admin/homepage', name: 'Homepage' },
      { to: '/admin/content', name: 'Content' },
      { to: '/admin/resources', name: 'Resources' },
      { to: '/admin/ai', name: 'AI question studio' },
    ],
  },
  {
    label: 'Students',
    pages: [
      { to: '/admin/attempts', name: 'Attempts' },
      { to: '/admin/rankings', name: 'Rankings' },
      { to: '/admin/users', name: 'Users' },
      { to: '/admin/support', name: 'Support inbox' },
    ],
  },
  {
    label: 'Billing',
    pages: [
      { to: '/admin/billing', name: 'Billing' },
      { to: '/admin/subscriptions', name: 'Subscription plans' },
      { to: '/admin/transactions', name: 'Transactions' },
      { to: '/admin/user-subscriptions', name: 'User subscriptions' },
      { to: '/admin/announcement', name: 'Announcement bar' },
      { to: '/admin/reconciliation', name: 'Reconciliation' },
      { to: '/admin/promo-codes', name: 'Promo codes' },
    ],
  },
  {
    label: 'System',
    pages: [
      { to: '/admin/exam-settings', name: 'Exam settings' },
      { to: '/admin/proctoring', name: 'Proctoring' },
      { to: '/admin/settings/watermark', name: 'Watermarks' },
      { to: '/admin/reports', name: 'Reports' },
      { to: '/admin/analytics', name: 'Analytics' },
      { to: '/admin/settings', name: 'Settings' },
    ],
  },
];

export function AdminPageDirectory() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>All admin pages</CardTitle>
        <CardDescription>Open any admin page directly. Each link shows its web address.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {ADMIN_PAGE_GROUPS.map((group) => (
          <section key={group.label}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-navy-500">{group.label}</h3>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.pages.map((page) => (
                <li key={page.to}>
                  <Link
                    to={page.to}
                    className="block rounded-lg border border-navy-200 px-3 py-2 transition-colors hover:border-govt-300 hover:bg-govt-50"
                  >
                    <p className="text-sm font-semibold text-navy-900">{page.name}</p>
                    <p className="truncate font-mono text-xs text-navy-500">{page.to}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}
