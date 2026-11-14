import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

const faqItems: { question: string; answer: ReactNode }[] = [
  {
    question: 'Can I switch plans later?',
    answer: 'Yes, you can upgrade or switch at any time. Switching to the Free plan ends a paid plan immediately.',
  },
  {
    question: 'What payment methods will be supported?',
    answer: 'We will support UPI, credit/debit cards, and net banking through our secure payment gateway once activated.',
  },
  {
    question: 'Is there a free trial for paid plans?',
    answer: 'The Free plan is always available. Paid plan trials will be announced when payments go live.',
  },
  {
    question: 'Can I request a refund?',
    answer: 'Yes. Submit a refund request from the Billing page and our team will review it.',
  },
];

export function PlanFaq() {
  return (
    <section aria-labelledby="subscription-faq" className="mx-auto max-w-3xl">
      <h2 id="subscription-faq" className="mb-4 text-lg font-semibold text-white">Frequently asked questions</h2>
      <div className="space-y-3">
        {faqItems.map((item) => (
          <details
            key={item.question}
            className="group rounded-xl border border-white/10 bg-white/5 px-5 py-4 transition-colors open:bg-white/[0.07]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-white marker:hidden">
              {item.question}
              <ChevronDown className="h-4 w-4 shrink-0 text-navy-300 transition-transform duration-200 group-open:rotate-180" aria-hidden />
            </summary>
            <div className="mt-3 text-sm leading-relaxed text-navy-300">{item.answer}</div>
          </details>
        ))}
      </div>
    </section>
  );
}
