import { useEffect } from 'react';

interface SeoProps {
  title: string;
  description?: string;
  path?: string;
  image?: string;
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

export function Seo({ title, description, path = '', image }: SeoProps) {
  useEffect(() => {
    const fullTitle = title.includes('Mock Ninja') ? title : `${title} — Mock Ninja`;
    document.title = fullTitle;
    if (description) setMeta('description', description);
    setOg('og:title', fullTitle);
    if (description) setOg('og:description', description);
    setOg('og:type', 'website');
    setOg('og:url', `${SITE_URL}${path}`);
    setOg('og:site_name', 'Mock Ninja');
    if (image) setOg('og:image', image);
    setMeta('twitter:title', fullTitle);
    if (description) setMeta('twitter:description', description);
    setMeta('twitter:card', 'summary_large_image');
    setCanonical(`${SITE_URL}${path}`);
  }, [title, description, path, image]);

  return null;
}
