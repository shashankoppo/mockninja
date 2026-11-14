import { supabase } from '@/lib/supabase';
import type { PersonalizedSummary } from './types';

const MIN_QUESTIONS_FOR_WEAK_TOPIC = 10;

export async function fetchPersonalizedSummary(userId: string): Promise<PersonalizedSummary> {
  const [attemptsResult, masteryResult] = await Promise.all([
    supabase
      .from('attempts')
      .select('id, score, started_at, status')
      .eq('user_id', userId)
      .eq('status', 'SUBMITTED')
      .order('started_at', { ascending: false })
      .limit(20),
    supabase
      .from('mastery_scores')
      .select(`
        score, belt, evidence_count, chapter_id,
        chapter:chapters ( name )
      `)
      .eq('user_id', userId)
      .order('score', { ascending: true })
      .limit(5),
  ]);

  if (attemptsResult.error) throw attemptsResult.error;
  if (masteryResult.error) throw masteryResult.error;

  const attempts = attemptsResult.data || [];
  const masteryRows = (masteryResult.data || []) as unknown as Array<{
    score: number;
    belt: string;
    evidence_count: number;
    chapter: { name: string } | null;
  }>;

  const scores = attempts.map((a) => Number(a.score) || 0);
  const totalAttempts = attempts.length;
  const avgScore = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const lastAttemptDate = attempts.length > 0 ? attempts[0].started_at : null;

  const weakChapters = masteryRows
    .filter((m) => m.evidence_count >= MIN_QUESTIONS_FOR_WEAK_TOPIC && m.chapter)
    .map((m) => ({
      name: m.chapter?.name ?? 'Unknown',
      belt: m.belt,
      score: Number(m.score) || 0,
    }));

  return {
    totalAttempts,
    avgScore,
    bestScore,
    lastAttemptDate,
    weakChapters,
    hasData: totalAttempts > 0,
  };
}
