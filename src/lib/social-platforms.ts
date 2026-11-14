const PLATFORM_DOMAINS: Record<string, string[]> = {
  YouTube: ['youtube.com', 'youtu.be'],
  Instagram: ['instagram.com'],
  X: ['x.com', 'twitter.com'],
  Telegram: ['t.me', 'telegram.me'],
  LinkedIn: ['linkedin.com'],
  Facebook: ['facebook.com', 'fb.com'],
  WhatsApp: ['wa.me', 'whatsapp.com'],
};

export function isAllowedSocialUrl(platform: string, url: string): boolean {
  if (!url) return true;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  const domains = PLATFORM_DOMAINS[platform];
  if (!domains) return platform === 'OTHER';
  const host = parsed.hostname.toLowerCase();
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}
