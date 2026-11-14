import { Link } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { DEFAULT_SUPPORT_EMAIL, useSupportEmail } from '@/lib/site-settings';

function buildSections(supportEmail: string): { title: string; body: string[] }[] {
  return [
  {
    title: '1. Acceptance of these terms',
    body: [
      'By creating an account or using Mock Ninja, you agree to these Terms of Use and our Privacy Policy. If you do not agree, please do not use the platform.',
    ],
  },
  {
    title: '2. About Mock Ninja',
    body: [
      'Mock Ninja is an independent practice platform for JEE Main and JEE Advanced preparation. It offers mock tests, chapter practice, analytics and revision tools.',
      'Mock Ninja is not affiliated with, endorsed by, or connected to the National Testing Agency (NTA) or any government body. Practice results are for self-assessment only and do not predict or guarantee any official exam outcome.',
    ],
  },
  {
    title: '3. Accounts and eligibility',
    body: [
      'You must provide accurate information when you register, including your name, contact details and birth year, and keep it up to date.',
      `You are responsible for keeping your login details private and for all activity under your account. Tell us promptly at ${supportEmail} if you suspect unauthorised access.`,
      'Students under 18 need guardian consent before using certain features. We may ask for that consent during onboarding.',
    ],
  },
  {
    title: '4. Plans, payments and invoices',
    body: [
      'Some features require a paid plan. Plan names, prices and included features are shown on the Pricing and Plans pages at the time of purchase.',
      'Payments are processed by a third-party payment gateway. We do not store your full card details.',
      'Invoices are generated for completed payments and are available on the Billing page.',
      'Switching to the Free plan ends a paid plan immediately.',
    ],
  },
  {
    title: '5. Refund requests and cancellations',
    body: [
      'You can request a refund from the Billing page. Each request is reviewed by our team, and approved refunds are returned to the original payment method.',
      'Submitting a request does not by itself cancel your plan. To stop future charges, switch to the Free plan from the Plans page.',
    ],
  },
  {
    title: '6. Acceptable use',
    body: [
      'You agree not to share your account, resell access, or redistribute questions, solutions or other content from the platform.',
      'You must not scrape, copy in bulk, reverse engineer, or attempt to bypass security, rate limits or access controls.',
      'You must not interfere with other students, submit false reports, or use the platform for any unlawful purpose.',
    ],
  },
  {
    title: '7. Content and intellectual property',
    body: [
      'Questions, solutions, mock tests, explanations and other materials on Mock Ninja belong to Mock Ninja or its licensors. They are provided for your personal, non-commercial practice.',
      'Some questions may be drafted with the help of AI tools. Such questions are reviewed by our staff before they are published.',
      `If you believe content infringes your rights, contact us at ${supportEmail} with details of the material.`,
    ],
  },
  {
    title: '8. Leaderboards and sharing',
    body: [
      'Leaderboards and sharing features are optional. If you choose to join, only your chosen handle and scores are shown, and you can opt out at any time in Settings.',
    ],
  },
  {
    title: '9. Feedback',
    body: [
      'We may ask for ratings, reviews and feedback after you attempt tests. Feedback you choose to submit may be used to improve the platform.',
    ],
  },
  {
    title: '10. Availability and disclaimers',
    body: [
      'We work to keep the platform available, but it may be interrupted for maintenance, updates or circumstances beyond our control.',
      'The platform is provided as is. To the extent permitted by law, we do not guarantee specific results, rankings or scores.',
    ],
  },
  {
    title: '11. Suspension and termination',
    body: [
      'We may suspend or close accounts that breach these terms or put other users or the platform at risk. You may close your account at any time by contacting support.',
    ],
  },
  {
    title: '12. Changes to these terms',
    body: [
      'We may update these terms from time to time. The date at the top of this page shows when they were last changed. Continued use after a change means you accept the updated terms.',
    ],
  },
  {
    title: '13. Contact',
    body: [
      `For questions about these terms, email ${supportEmail} or visit our Contact page.`,
    ],
  },
  ];
}

export function TermsPage() {
  const { data: supportEmail = DEFAULT_SUPPORT_EMAIL } = useSupportEmail();
  const sections = buildSections(supportEmail);

  return (
    <PublicLayout>
      <div className="container-app py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-govt-300">Legal</p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Terms of Use</h1>
          <p className="mt-2 text-sm text-navy-400">Last updated: October 2026</p>

          <div className="mt-10 space-y-8">
            {sections.map((section, index) => (
              <section key={section.title} aria-labelledby={`terms-section-${index}`}>
                <h2 id={`terms-section-${index}`} className="text-lg font-semibold text-white">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-navy-300">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-12 border-t border-white/10 pt-6 text-sm text-navy-400">
            See also our <Link to="/contact" className="text-govt-300 underline underline-offset-4 hover:text-govt-200">contact page</Link>.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
