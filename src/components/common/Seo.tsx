import { useEffect } from 'react';

interface SeoProps {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  keywords?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
}

const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://mockninja.in';

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setOg(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

const JSONLD_ID = 'seo-jsonld-dynamic';

function setJsonLd(data: Record<string, unknown>) {
  let el = document.getElementById(JSONLD_ID) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = JSONLD_ID;
    el.setAttribute('type', 'application/ld+json');
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function Seo({ title, description, path = '', image, keywords, type = 'website', noindex, jsonLd }: SeoProps) {
  useEffect(() => {
    const fullTitle = title.includes('Mock Ninja') ? title : `${title} — Mock Ninja`;
    document.title = fullTitle;

    if (description) setMeta('description', description);
    if (keywords) setMeta('keywords', keywords);

    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large');

    setOg('og:title', fullTitle);
    if (description) setOg('og:description', description);
    setOg('og:type', type);
    setOg('og:url', `${SITE_URL}${path}`);
    setOg('og:site_name', 'Mock Ninja');
    setOg('og:locale', 'en_IN');
    setOg('og:locale:alternate', 'hi_IN');
    if (image) setOg('og:image', image);

    setMeta('twitter:title', fullTitle);
    if (description) setMeta('twitter:description', description);
    setMeta('twitter:card', 'summary_large_image');
    if (image) setMeta('twitter:image', image);

    setCanonical(`${SITE_URL}${path}`);

    if (jsonLd) {
      setJsonLd(jsonLd);
    } else {
      const existing = document.getElementById(JSONLD_ID);
      if (existing) existing.remove();
    }
  }, [title, description, path, image, keywords, type, noindex, jsonLd]);

  return null;
}
