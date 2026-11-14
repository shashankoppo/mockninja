import { Copy } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';

interface SolutionsShareDialogProps {
  open: boolean;
  onClose: () => void;
  mockTitle: string;
}

function buildShareLinks(text: string, url: string) {
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);
  return [
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}` },
    { label: 'Telegram', href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}` },
    { label: 'X', href: `https://x.com/intent/post?text=${encodedText}&url=${encodedUrl}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
  ];
}

export function SolutionsShareDialog({ open, onClose, mockTitle }: SolutionsShareDialogProps) {
  const siteUrl = window.location.origin;
  const text = `I practised ${mockTitle} on Mock Ninja, an independent practice platform.`;
  const links = buildShareLinks(text, siteUrl);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(siteUrl);
      toast.success('Link copied.');
    } catch {
      toast.error('Could not copy. Select the link and copy it manually.');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Share your practice"
      description="Share the Mock Ninja link with friends. Your answers and solutions are not included."
      footer={<Button variant="ghost" onClick={onClose}>Close</Button>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-navy-200 bg-white px-3 py-2.5 text-sm font-semibold text-navy-800 transition-colors hover:bg-navy-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-govt-500"
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-navy-200 bg-navy-50/50 p-3 sm:flex-row sm:items-center">
          <span className="min-w-0 flex-1 truncate text-sm text-navy-700">{siteUrl}</span>
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copy link
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
