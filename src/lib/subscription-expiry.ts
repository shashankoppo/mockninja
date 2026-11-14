import { supabase } from '@/lib/supabase';

export const EXPIRY_ALERT_DAYS = 7;

export async function countExpiringPaidSubscriptions(): Promise<number> {
  const now = new Date();
  const horizon = new Date(now.getTime() + EXPIRY_ALERT_DAYS * 24 * 60 * 60 * 1000);
  const { count, error } = await supabase
    .from('user_subscriptions')
    .select('id, plan:plan_id!inner(price_inr)', { count: 'exact', head: true })
    .eq('status', 'ACTIVE')
    .gt('plan.price_inr', 0)
    .gte('expires_at', now.toISOString())
    .lte('expires_at', horizon.toISOString());
  if (error) throw error;
  return count ?? 0;
}
