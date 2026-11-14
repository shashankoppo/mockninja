import { useQuery } from '@tanstack/react-query';
import {
  fetchPlatformStats,
  fetchTestimonials,
  fetchFaqs,
  fetchFeaturedTests,
  fetchFreeTests,
  fetchExamCategories,
  fetchHomepageContent,
} from './home-service';
import { fetchPersonalizedSummary } from './personalized-service';
import { useAuth } from '@/lib/auth';

const STALE_PUBLIC = 5 * 60 * 1000;
const STALE_PERSONAL = 60 * 1000;

export function usePlatformStats() {
  return useQuery({
    queryKey: ['home-platform-stats'],
    queryFn: fetchPlatformStats,
    staleTime: STALE_PUBLIC,
  });
}

export function useTestimonials() {
  return useQuery({
    queryKey: ['home-testimonials'],
    queryFn: fetchTestimonials,
    staleTime: STALE_PUBLIC,
  });
}

export function useFaqs() {
  return useQuery({
    queryKey: ['home-faqs'],
    queryFn: fetchFaqs,
    staleTime: STALE_PUBLIC,
  });
}

export function useFeaturedTests(limit = 9) {
  return useQuery({
    queryKey: ['home-featured-tests', limit],
    queryFn: () => fetchFeaturedTests(limit),
    staleTime: STALE_PUBLIC,
  });
}

export function useFreeTests(limit = 6) {
  return useQuery({
    queryKey: ['home-free-tests', limit],
    queryFn: () => fetchFreeTests(limit),
    staleTime: STALE_PUBLIC,
  });
}

export function useExamCategories() {
  return useQuery({
    queryKey: ['home-exam-categories'],
    queryFn: fetchExamCategories,
    staleTime: STALE_PUBLIC,
  });
}

export function useHomepageContent() {
  return useQuery({
    queryKey: ['home-content'],
    queryFn: fetchHomepageContent,
    staleTime: STALE_PUBLIC,
  });
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: ['subscription-plans-public'],
    queryFn: async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, slug, description, price_inr, billing_period, features_json, is_active, sort_order, pricing_model, mock_quota')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data || [];
    },
    staleTime: STALE_PUBLIC,
  });
}

export function usePersonalizedSummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['home-personalized', user?.id],
    queryFn: () => {
      if (!user) return null;
      return fetchPersonalizedSummary(user.id);
    },
    enabled: !!user,
    staleTime: STALE_PERSONAL,
  });
}
