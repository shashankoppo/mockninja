export type AdKind = 'TEST_SERIES' | 'OFFER' | 'FEATURE' | 'COURSE' | 'BANNER' | 'GENERAL';

export const AD_KIND_LABELS: Record<AdKind, string> = {
  TEST_SERIES: 'Test series',
  OFFER: 'Offer',
  FEATURE: 'Feature spotlight',
  COURSE: 'Course',
  BANNER: 'Wide banner',
  GENERAL: 'General',
};

export interface AdItem {
  id: string;
  kind: AdKind;
  title: string;
  body: string;
  image_url: string;
  cta_label: string;
  cta_url: string;
  is_active: boolean;
}
