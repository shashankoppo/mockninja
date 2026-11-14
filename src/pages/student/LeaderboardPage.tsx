import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Lock, Eye, EyeOff } from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Belt } from '@/components/common/Belt';


interface LeaderboardRow {
  handle: string;
  user_id: string;
  subject_score: number;
  question_count: number;
  belt: string;
  rank: number;
}

export function LeaderboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);

  const { data: subjects } = useQuery({
    queryKey: ['subjects-lb'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subjects').select('id, name').order('id');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: publicProfile } = useQuery({
    queryKey: ['public-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('public_profiles')
        .select('handle, opt_in_leaderboard')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: leaderboard, isLoading: lbLoading } = useQuery({
    queryKey: ['leaderboard', selectedSubject],
    queryFn: async () => {
      if (!selectedSubject) return [] as LeaderboardRow[];
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_subject_id: selectedSubject,
        p_limit: 50,
      });
      if (error) throw error;
      return (data || []) as LeaderboardRow[];
    },
    enabled: !!selectedSubject,
  });

  const optedIn = publicProfile?.opt_in_leaderboard ?? false;
  const yourRow = (leaderboard || []).find((row) => row.user_id === user?.id);

  useEffect(() => {
    if (subjects && subjects.length > 0 && selectedSubject === null) {
      setSelectedSubject(subjects[0].id);
    }
  }, [subjects, selectedSubject]);

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('leaderboard.title')}</h1>
          <p className="text-sm text-navy-300">{t('leaderboard.desc')}</p>
        </div>

        {/* Opt-in status */}
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              {optedIn ? (
                <Eye className="h-5 w-5 text-emerald-300" />
              ) : (
                <EyeOff className="h-5 w-5 text-navy-400" />
              )}
              <div>
                <p className="text-sm font-semibold text-white">
                  {optedIn ? t('leaderboard.optedIn') : t('leaderboard.optedOut')}
                </p>
                <p className="text-xs text-navy-300">
                  {optedIn ? t('leaderboard.optedInDesc') : t('leaderboard.optedOutDesc')}
                </p>
              </div>
            </div>
            <span className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium',
              optedIn ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-navy-300',
            )}>
              {optedIn ? t('leaderboard.visible') : t('leaderboard.hidden')}
            </span>
          </CardContent>
        </Card>

        {/* Subject tabs */}
        {subjects && subjects.length > 0 && (
          <div className="flex gap-2">
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSubject(s.id)}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  selectedSubject === s.id
                    ? 'bg-govt-500 text-white'
                    : 'bg-white/5 text-navy-200 hover:bg-white/10',
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {yourRow && (
          <Card className="border-govt-400/30 bg-govt-500/10">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-govt-300">Your current rank</p>
                <p className="mt-1 text-sm text-navy-100">{yourRow.question_count} questions completed in this subject</p>
              </div>
              <p className="text-3xl font-bold text-white">#{yourRow.rank}</p>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard */}
        {lbLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : !selectedSubject ? (
          <EmptyState title={t('leaderboard.noSubjects')} description={t('leaderboard.noSubjectsDesc')} />
        ) : (leaderboard || []).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Lock className="h-10 w-10 text-navy-300" />
              <p className="text-sm text-navy-300">{t('leaderboard.tooFew')}</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="h-5 w-5 text-amber-500" />
                {t('leaderboard.rankings')}
              </CardTitle>
              <CardDescription>{t('leaderboard.rankingsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {(leaderboard || []).map((row) => {
                  const isYou = row.user_id === user?.id;
                  return (
                    <div
                      key={row.user_id}
                      className={cn(
                        'flex items-center gap-4 rounded-lg p-3',
                        isYou ? 'border-2 border-govt-400/60 bg-govt-500/15' : 'border border-white/10 bg-white/5',
                      )}
                    >
                      <div className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
                        row.rank === 1 ? 'bg-amber-500/20 text-amber-300'
                        : row.rank === 2 ? 'bg-white/15 text-navy-100'
                        : row.rank === 3 ? 'bg-orange-500/20 text-orange-300'
                        : 'bg-white/10 text-navy-300',
                      )}>
                        {row.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {row.handle}
                          {isYou && <span className="ml-2 text-xs text-govt-300">({t('leaderboard.you')})</span>}
                        </p>
                        <p className="text-xs text-navy-400">
                          {row.question_count} {t('leaderboard.questions')}
                        </p>
                      </div>
                      <Belt level={row.belt} size="xs" showLabel />
                      <span className="text-lg font-bold text-white">
                        {Math.round(row.subject_score)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
}
