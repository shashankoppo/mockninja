import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, X, Plus, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Belt } from '@/components/common/Belt';

interface FocusTopic {
  chapter_id: number;
  position: number;
}

export function FocusPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: focusTopics, isLoading: focusLoading } = useQuery({
    queryKey: ['focus-topics', user?.id],
    queryFn: async () => {
      if (!user) return [] as FocusTopic[];
      const { data, error } = await supabase
        .from('student_focus_topics')
        .select('chapter_id, position')
        .eq('user_id', user.id)
        .order('position');
      if (error) throw error;
      return (data || []) as FocusTopic[];
    },
    enabled: !!user,
  });

  const { data: mastery } = useQuery({
    queryKey: ['mastery-focus', user?.id],
    queryFn: async () => {
      if (!user) return [] as { chapter_id: number; belt: string; score: number; evidence_count: number }[];
      const { data, error } = await supabase
        .from('mastery_scores')
        .select('chapter_id, belt, score, evidence_count')
        .eq('user_id', user.id);
      if (error) throw error;
      return (data || []) as { chapter_id: number; belt: string; score: number; evidence_count: number }[];
    },
    enabled: !!user,
  });

  const { data: chapters } = useQuery({
    queryKey: ['chapters-all-focus'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chapters')
        .select('id, name, subject_id, subject:subject_id ( name )')
        .order('subject_id')
        .order('ordinal');
      if (error) throw error;
      return (data || []) as unknown as { id: number; name: string; subject_id: number; subject: { name: string } }[];
    },
  });

  const masteryMap = new Map((mastery || []).map((m) => [m.chapter_id, m]));
  const focusIds = new Set((focusTopics || []).map((f) => f.chapter_id));

  const addFocus = async (chapterId: number) => {
    if (!user || focusIds.size >= 5) return;
    const { error } = await supabase
      .from('student_focus_topics')
      .insert({ user_id: user.id, chapter_id: chapterId, position: focusIds.size });
    if (error) {
      if (error.code === 'P0001') return;
      throw error;
    }
    queryClient.invalidateQueries({ queryKey: ['focus-topics', user.id] });
  };

  const removeFocus = async (chapterId: number) => {
    if (!user) return;
    const { error } = await supabase
      .from('student_focus_topics')
      .delete()
      .eq('user_id', user.id)
      .eq('chapter_id', chapterId);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['focus-topics', user.id] });
  };

  const movePosition = async (chapterId: number, dir: -1 | 1) => {
    if (!user) return;
    const topics = [...(focusTopics || [])].sort((a, b) => a.position - b.position);
    const idx = topics.findIndex((t) => t.chapter_id === chapterId);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= topics.length) return;

    const a = topics[idx];
    const b = topics[swapIdx];

    const updates = await Promise.all([
      supabase.from('student_focus_topics').update({ position: b.position }).eq('user_id', user.id).eq('chapter_id', a.chapter_id),
      supabase.from('student_focus_topics').update({ position: a.position }).eq('user_id', user.id).eq('chapter_id', b.chapter_id),
    ]);
    const failed = updates.find((result) => result.error);
    if (failed?.error) throw failed.error;
    queryClient.invalidateQueries({ queryKey: ['focus-topics', user.id] });
  };

  const filteredChapters = (chapters || []).filter((c) => {
    if (focusIds.has(c.id)) return false;
    if (search) {
      return c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.subject.name.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  }).slice(0, 20);

  const focusList = [...(focusTopics || [])].sort((a, b) => a.position - b.position);

  if (focusLoading) {
    return (
      <StudentLayout>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('focus.title')}</h1>
          <p className="text-sm text-navy-300">{t('focus.desc')}</p>
        </div>

        {/* Current focus topics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('focus.myTopics')}</CardTitle>
            <CardDescription>
              {focusList.length} / 5 {t('focus.selected')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {focusList.length === 0 ? (
              <EmptyState
                title={t('focus.noneSelected')}
                description={t('focus.noneSelectedDesc')}
              />
            ) : (
              <div className="space-y-2">
                {focusList.map((ft, idx) => {
                  const ch = chapters?.find((c) => c.id === ft.chapter_id);
                  const m = masteryMap.get(ft.chapter_id);
                  return (
                    <div
                      key={ft.chapter_id}
                      className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
                    >
                      <GripVertical className="h-5 w-5 shrink-0 text-navy-300" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-white">{ch?.name || `#${ft.chapter_id}`}</p>
                        <p className="text-xs text-navy-400">{ch?.subject.name}</p>
                      </div>
                      {m && (
                        <Belt level={m.belt} size="xs" showLabel />
                      )}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => movePosition(ft.chapter_id, -1)}
                          disabled={idx === 0}
                          className="rounded p-1 text-navy-400 hover:bg-white/10 disabled:opacity-30"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => movePosition(ft.chapter_id, 1)}
                          disabled={idx === focusList.length - 1}
                          className="rounded p-1 text-navy-400 hover:bg-white/10 disabled:opacity-30"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeFocus(ft.chapter_id)}
                          className="rounded p-1 text-red-300 hover:bg-red-500/10"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add new topics */}
        {focusIds.size < 5 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('focus.addTopics')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('focus.searchPlaceholder')}
                  className="w-full rounded-lg border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-navy-400 focus:border-govt-400 focus:outline-none focus:ring-1 focus:ring-govt-400"
                />
              </div>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {filteredChapters.length === 0 ? (
                  <p className="py-4 text-center text-sm text-navy-400">{t('focus.noResults')}</p>
                ) : (
                  filteredChapters.map((ch) => {
                    const m = masteryMap.get(ch.id);
                    return (
                      <button
                        key={ch.id}
                        onClick={() => addFocus(ch.id)}
                        className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-left hover:border-govt-400/40 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-navy-100">{ch.name}</p>
                          <p className="text-xs text-navy-400">{ch.subject.name}</p>
                        </div>
                        {m && (
                          <Belt level={m.belt} size="xs" showLabel />
                        )}
                        <Plus className="h-4 w-4 text-govt-300" />
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
}

