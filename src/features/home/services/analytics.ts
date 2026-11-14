type AnalyticsEvent =
  | { event: 'homepage_view'; locale: string; signed_in: boolean }
  | { event: 'primary_cta_click'; cta_key: string; section: string; destination_key: string }
  | { event: 'exam_category_selected'; category_id: string; result_count: number }
  | { event: 'series_card_open'; series_id: string; position: number; section: string }
  | { event: 'homepage_api_failure'; service_key: string; status_class: string }
  | { event: 'popular_test_open'; series_id: string; position: number; section: string }
  | { event: 'free_test_open'; series_id: string; position: number; section: string };

const QUEUE: AnalyticsEvent[] = [];

export function trackEvent(evt: AnalyticsEvent): void {
  if (typeof window === 'undefined') return;
  QUEUE.push(evt);
  if (import.meta.env.DEV) {
    console.debug('[analytics]', evt);
  }
}

export function flushAnalytics(): AnalyticsEvent[] {
  const items = [...QUEUE];
  QUEUE.length = 0;
  return items;
}
