import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Menu, MessageCircle, X, Youtube, Twitter, Instagram, Linkedin, Send } from 'lucide-react';
import { AnnouncementBar } from '@/components/common/AnnouncementBar';
import { BrandLogo } from '@/components/common/BrandLogo';
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher';
import { ThemeSwitcher } from '@/components/common/ThemeSwitcher';
import { usePublicSettings } from '@/lib/queries';

const SOCIAL_ICON_MAP: Record<string, typeof Youtube> = {
  YouTube: Youtube,
  Instagram: Instagram,
  X: Twitter,
  LinkedIn: Linkedin,
  Telegram: Send,
};

type OpenMenu = 'more' | 'mobile' | null;

export function PublicLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { data: settings } = usePublicSettings();
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  const whatsappNumber = settings?.contact_desks?.find((d) => d.whatsapp)?.whatsapp;

  // Hide the WhatsApp button inside the distraction-free exam runner.
  const hideWhatsApp = !whatsappNumber || pathname.startsWith('/exam/');
  const isActive = (path: string) => path === '/' ? pathname === '/' : pathname.startsWith(path);
  const navLinkClass = (path: string) => `nav-link rounded-md px-3 py-2 text-sm font-medium${isActive(path) ? ' nav-link-active' : ''}`;

  useEffect(() => {
    if (!openMenu) return;
    const activeRef = openMenu === 'more' ? moreRef : mobileRef;
    const onPointerDown = (event: PointerEvent) => {
      if (!activeRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenu]);

  const toggleMenu = (menu: Exclude<OpenMenu, null>) => setOpenMenu((current) => (current === menu ? null : menu));
  const closeMenus = () => setOpenMenu(null);

  const quickLinks = [
    { to: '/mock-tests', label: t('nav.mockTests') },
    { to: '/previous-year-papers', label: t('nav.pyqs') },
    { to: '/chapters', label: t('nav.chapterPractice') },
    { to: '/about', label: 'About' },
    { to: '/pricing', label: 'Pricing' },
  ];

  const examResources = [
    { to: '/trust', label: 'Trust Centre' },
    { to: '/faqs', label: 'FAQs' },
    { to: '/contact', label: 'Contact' },
    { to: '/revision-vault', label: 'Revision Vault' },
  ];

  const legalLinks = [
    { to: '/privacy', label: 'Privacy Policy' },
    { to: '/terms', label: 'Terms of Use' },
  ];

  const moreLinks = [
    { to: '/trust', label: 'Trust Centre' },
    { to: '/about', label: 'About' },
    { to: '/faq', label: 'FAQs' },
    { to: '/pricing', label: 'Pricing' },
    { to: '/contact', label: 'Contact support' },
    { to: '/privacy', label: 'Privacy' },
    { to: '/terms', label: 'Terms' },
    { to: '/revision-vault', label: 'Revision Vault' },
  ];

  const mobileLinks = [{ to: '/', label: t('nav.home') }, ...quickLinks, ...examResources, ...legalLinks];
  const moreActive = moreLinks.some((link) => isActive(link.to));

  return (
    <div className="flex min-h-screen flex-col bg-[#101117] surface-mesh">
      <AnnouncementBar />
      <header className="public-header sticky top-0 z-30 mx-3 mt-3 rounded-2xl border text-white shadow-lg backdrop-blur-xl sm:mx-4 sm:mt-4 xl:mx-5">
        <div className="container-app flex h-16 items-center justify-between gap-3">
          <BrandLogo to="/" variant="public" />
          <nav aria-label="Main" className="flex min-w-0 items-center gap-1 sm:gap-2">
            <div className="hidden items-center gap-0.5 xl:flex">
              <Link to="/" className={navLinkClass('/')}>{t('nav.home')}</Link>
              <Link to="/previous-year-papers" className={navLinkClass('/previous-year-papers')}>{t('nav.pyqs')}</Link>
              <Link to="/chapters" className={navLinkClass('/chapters')}>{t('nav.chapterPractice')}</Link>
              <Link to="/mock-tests" className={navLinkClass('/mock-tests')}>Test Series</Link>
              <div ref={moreRef} className="relative">
                <button
                  type="button"
                  aria-expanded={openMenu === 'more'}
                  aria-controls="public-more-menu"
                  onClick={() => toggleMenu('more')}
                  className={`public-menu-trigger nav-link flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium${moreActive ? ' nav-link-active' : ''}`}
                >
                  More <ChevronDown className="public-menu-chevron h-3.5 w-3.5 transition-transform duration-200" />
                </button>
                {openMenu === 'more' && (
                  <div id="public-more-menu" className="public-menu-panel absolute right-0 top-full z-40 mt-2 w-56 rounded-2xl border border-white/10 bg-[#191a27]/95 p-2 shadow-2xl backdrop-blur-xl">
                    {moreLinks.map((link) => (
                      <Link key={link.to} to={link.to} onClick={closeMenus} className="public-menu-link block rounded-xl px-3 py-2.5 text-sm text-navy-200 transition-colors hover:bg-white/10 hover:text-white">{link.label}</Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="header-actions flex items-center gap-1 sm:border-l sm:border-white/15 sm:pl-3">
              <ThemeSwitcher />
              <LanguageSwitcher className="hidden text-white/85 hover:bg-white/10 hover:text-white sm:inline-flex" />
              <Link to="/login" className="tap-target hidden items-center rounded-lg px-3 py-2 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 sm:inline-flex">{t('common.login')}</Link>
              <Link to="/signup" className="tap-target hidden items-center gap-1.5 rounded-xl bg-govt-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-govt-500 sm:inline-flex">{t('common.signup')}</Link>
            </div>

            <div ref={mobileRef} className="relative xl:hidden">
              <button
                type="button"
                aria-label={openMenu === 'mobile' ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={openMenu === 'mobile'}
                aria-controls="public-mobile-menu"
                onClick={() => toggleMenu('mobile')}
                className="public-menu-trigger tap-target flex items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition-colors duration-200 hover:border-white/30 hover:bg-white/10"
              >
                {openMenu === 'mobile' ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
              </button>
              {openMenu === 'mobile' && (
                <div id="public-mobile-menu" className="public-menu-panel absolute right-0 top-full z-40 mt-2 flex max-h-[calc(100dvh-6rem)] w-[min(18rem,calc(100vw-2rem))] flex-col overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#191a27]/95 p-2 shadow-2xl backdrop-blur-xl">
                  {mobileLinks.map((link) => (
                    <Link key={link.to} to={link.to} onClick={closeMenus} className="public-menu-link block rounded-xl px-3 py-3 text-sm text-navy-200 transition-colors hover:bg-white/10 hover:text-white">{link.label}</Link>
                  ))}
                  <div className="mt-2 flex items-center gap-2 border-t border-white/10 px-1 pt-3 sm:hidden">
                    <LanguageSwitcher className="text-white/85 hover:bg-white/10 hover:text-white" />
                    <Link to="/login" onClick={closeMenus} className="tap-target flex flex-1 items-center justify-center rounded-xl border border-white/15 text-sm font-semibold text-white transition-colors hover:bg-white/10">{t('common.login')}</Link>
                    <Link to="/signup" onClick={closeMenus} className="tap-target flex flex-1 items-center justify-center rounded-xl bg-govt-600 text-sm font-semibold text-white transition-colors hover:bg-govt-500">{t('common.signup')}</Link>
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>
      <main className="public-main flex-1">{children}</main>
      <footer className="border-t border-white/10 bg-[#0b0c14] text-navy-300">
        <div className="container-app py-12">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <BrandLogo to="/" variant="public" />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-navy-400">{settings?.tagline || t('app.tagline')}</p>
              <div className="mt-5 flex items-center gap-2">
                {(settings?.social_links ?? []).filter((s) => s.url).map((link) => {
                  const Icon = SOCIAL_ICON_MAP[link.platform] ?? Send;
                  return (
                    <a
                      key={link.platform}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={link.platform}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-navy-300 transition-[transform,color,background-color,border-color] duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10 hover:text-white"
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </a>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8">
              <div>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-white">Quick Links</h4>
                <nav className="flex flex-col gap-2.5 text-sm">
                  {quickLinks.map((l) => (
                    <Link key={l.to} to={l.to} className="text-navy-400 transition-colors hover:text-white">{l.label}</Link>
                  ))}
                </nav>
              </div>

              <div>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-white">Exam Resources</h4>
                <nav className="flex flex-col gap-2.5 text-sm">
                  {examResources.map((l) => (
                    <Link key={l.to} to={l.to} className="text-navy-400 transition-colors hover:text-white">{l.label}</Link>
                  ))}
                </nav>
              </div>

              <div>
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-white">Legal</h4>
                <nav className="flex flex-col gap-2.5 text-sm">
                  {legalLinks.map((l) => (
                    <Link key={l.to} to={l.to} className="text-navy-400 transition-colors hover:text-white">{l.label}</Link>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-navy-500 sm:flex-row">
            <p>© {new Date().getFullYear()} {settings?.copyright_line || t('app.name')}. All rights reserved.</p>
            <p className="text-center sm:text-right">Independent practice platform. Not affiliated with NTA.</p>
          </div>
          <div className="mt-3 flex flex-col items-center gap-1 text-xs text-navy-500">
            <p>Technical Partner <a href="https://evolucentsphere.com/" target="_blank" rel="noopener noreferrer" className="font-medium text-navy-300 transition-colors hover:text-white">ELSxGlobal</a> <span className="text-navy-600">|</span> Div of Evolucentsphere Private Limited</p>
          </div>
        </div>
      </footer>

      {!hideWhatsApp && (
        <a
          href={`https://wa.me/${whatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          className="wa-float fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" aria-hidden />
        </a>
      )}

      <style>{`
        @keyframes wa-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.5); }
          50% { box-shadow: 0 0 0 12px rgba(37, 211, 102, 0); }
        }
        .wa-float {
          animation: wa-pulse 2.2s ease-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .wa-float { animation: none; }
        }
      `}</style>
    </div>
  );
}
