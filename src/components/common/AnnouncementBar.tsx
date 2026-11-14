import { ArrowUpRight, Megaphone } from 'lucide-react';
import { useSiteSettings, isAnnouncementVisible } from '@/lib/site-settings';

export function AnnouncementBar() {
  const { data } = useSiteSettings();
  const bar = data?.announcement;
  if (!bar || !isAnnouncementVisible(bar)) return null;

  return (
    <div role="region" aria-label="Announcement" aria-live="polite" className="announcement-bar">
      <div className="announcement-bar-inner">
        <span className="announcement-bar-icon" aria-hidden="true">
          <Megaphone className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <div className="announcement-bar-copy">
          <span className="announcement-bar-label">Latest update</span>
          <div className="announcement-bar-scroll">
            <div className="announcement-bar-track">
              <span className="announcement-bar-message">{bar.text}</span>
              <span className="announcement-bar-message" aria-hidden="true">{bar.text}</span>
            </div>
          </div>
        </div>
        {bar.link_label && bar.link_url && (
          <a href={bar.link_url} className="announcement-bar-link">
            <span>{bar.link_label}</span>
            <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}
