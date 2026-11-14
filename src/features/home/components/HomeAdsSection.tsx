import { Link } from 'react-router-dom';
import { ChevronRight, Sparkles, Tag, GraduationCap, Star, Layers } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AD_KIND_LABELS, type AdItem, type AdKind } from '@/features/home/types/advertisements';

const KIND_META: Record<AdKind, { icon: typeof Sparkles; accent: string; badge: string }> = {
  TEST_SERIES: { icon: Layers, accent: 'from-teal-500/15 to-cyan-500/10', badge: 'bg-teal-500/15 text-teal-300 border-teal-500/25' },
  OFFER: { icon: Tag, accent: 'from-amber-500/15 to-orange-500/10', badge: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
  FEATURE: { icon: Sparkles, accent: 'from-sky-500/15 to-blue-500/10', badge: 'bg-sky-500/15 text-sky-300 border-sky-500/25' },
  COURSE: { icon: GraduationCap, accent: 'from-violet-500/15 to-indigo-500/10', badge: 'bg-violet-500/15 text-violet-300 border-violet-500/25' },
  BANNER: { icon: Star, accent: 'from-emerald-500/15 to-green-500/10', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' },
  GENERAL: { icon: Sparkles, accent: 'from-slate-500/15 to-slate-400/10', badge: 'bg-slate-500/15 text-slate-300 border-slate-500/25' },
};

function isInternal(url: string) {
  return url.startsWith('/');
}

function CTAButton({ ad }: { ad: AdItem }) {
  return isInternal(ad.cta_url)
    ? <Link to={ad.cta_url}><Button variant="outline" fullWidth>{ad.cta_label} <ChevronRight className="h-4 w-4" /></Button></Link>
    : <a href={ad.cta_url} target="_blank" rel="noreferrer"><Button variant="outline" fullWidth>{ad.cta_label} <ChevronRight className="h-4 w-4" /></Button></a>;
}

function CardAd({ ad }: { ad: AdItem }) {
  const meta = KIND_META[ad.kind];
  const Icon = meta.icon;
  return (
    <Card className={`flex flex-col overflow-hidden bg-gradient-to-br ${meta.accent} border-white/10 transition-transform duration-300 hover:-translate-y-1`}>
      {ad.image_url && <img src={ad.image_url} alt="" loading="lazy" className="h-40 w-full object-cover" />}
      <CardContent className="flex flex-1 flex-col p-6">
        <span className={`mb-3 w-fit rounded-full border px-3 py-0.5 text-xs font-semibold ${meta.badge}`}>
          <Icon className="mr-1 inline h-3 w-3" />{AD_KIND_LABELS[ad.kind]}
        </span>
        <h3 className="text-lg font-bold text-white">{ad.title}</h3>
        {ad.body && <p className="mt-2 flex-1 text-sm text-navy-300">{ad.body}</p>}
        <div className="mt-5"><CTAButton ad={ad} /></div>
      </CardContent>
    </Card>
  );
}

function BannerAd({ ad }: { ad: AdItem }) {
  const meta = KIND_META[ad.kind];
  const Icon = meta.icon;
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r ${meta.accent}`}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 85% 30%, rgba(255,255,255,.12), transparent 40%)' }} />
      <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <span className={`mb-2 w-fit rounded-full border px-3 py-0.5 text-xs font-semibold ${meta.badge}`}>{AD_KIND_LABELS[ad.kind]}</span>
            <h3 className="text-xl font-bold text-white">{ad.title}</h3>
            {ad.body && <p className="mt-1 max-w-2xl text-sm text-navy-300">{ad.body}</p>}
          </div>
        </div>
        <div className="shrink-0 sm:w-auto">
          {isInternal(ad.cta_url)
            ? <Link to={ad.cta_url}><Button variant="primary">{ad.cta_label} <ChevronRight className="h-4 w-4" /></Button></Link>
            : <a href={ad.cta_url} target="_blank" rel="noreferrer"><Button variant="primary">{ad.cta_label} <ChevronRight className="h-4 w-4" /></Button></a>}
        </div>
      </div>
    </div>
  );
}

function FeatureAd({ ad }: { ad: AdItem }) {
  const meta = KIND_META[ad.kind];
  const Icon = meta.icon;
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${meta.accent}`}>
      {ad.image_url && <div className="absolute inset-0 z-0 opacity-30"><img src={ad.image_url} alt="" className="h-full w-full object-cover" /></div>}
      <div className="relative z-10 flex h-full flex-col gap-3 p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
          <Icon className="h-7 w-7 text-white" />
        </div>
        <span className={`w-fit rounded-full border px-3 py-0.5 text-xs font-semibold ${meta.badge}`}>{AD_KIND_LABELS[ad.kind]}</span>
        <h3 className="text-lg font-bold text-white">{ad.title}</h3>
        {ad.body && <p className="flex-1 text-sm text-navy-300">{ad.body}</p>}
        <div className="mt-2"><CTAButton ad={ad} /></div>
      </div>
    </div>
  );
}

const GROUP_ORDER: AdKind[] = ['BANNER', 'OFFER', 'TEST_SERIES', 'COURSE', 'FEATURE', 'GENERAL'];

export function HomeAdsSection({ items }: { items: AdItem[] }) {
  const active = items.filter((ad) => ad.is_active && ad.title && ad.cta_url);
  if (active.length === 0) return null;

  const byKind = new Map<AdKind, AdItem[]>();
  for (const ad of active) {
    const arr = byKind.get(ad.kind) ?? [];
    arr.push(ad);
    byKind.set(ad.kind, arr);
  }

  const groups = GROUP_ORDER
    .filter((k) => byKind.has(k))
    .map((k) => ({ kind: k, ads: byKind.get(k) as AdItem[] }));

  let isFirst = true;
  return (
    <section className="landing-section py-16 sm:py-20">
      <div className="container-app space-y-14">
        {groups.map((group) => {
          const meta = KIND_META[group.kind];
          const Icon = meta.icon;
          const isBanner = group.kind === 'BANNER';
          const isFeature = group.kind === 'FEATURE';
          const sectionTitle = isFirst
            ? 'Featured Offers & Test Series'
            : AD_KIND_LABELS[group.kind] + 's';
          isFirst = false;
          return (
            <div key={group.kind} className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white govt-heading sm:text-2xl">{sectionTitle}</h2>
              </div>
              {isBanner ? (
                <div className="space-y-4">{group.ads.map((ad) => <BannerAd key={ad.id} ad={ad} />)}</div>
              ) : isFeature ? (
                <div className="grid gap-6 md:grid-cols-2">{group.ads.map((ad) => <FeatureAd key={ad.id} ad={ad} />)}</div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{group.ads.map((ad) => <CardAd key={ad.id} ad={ad} />)}</div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
