import { PublicLayout } from '@/layouts/PublicLayout';
import { Placeholder } from '@/pages/Placeholder';

export function PrivacyPage() {
  return (
    <PublicLayout>
      <div className="container-app py-16">
        <Placeholder
          title="Privacy Policy"
          description="Draft: pending legal review. Covers what data we collect, why, how long we keep it, and your rights. Arrives in Phase 10."
          badge="Draft"
        />
      </div>
    </PublicLayout>
  );
}
