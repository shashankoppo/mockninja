import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';

interface BookmarkButtonProps {
  questionId: string;
  attemptId?: string;
  isBookmarked: boolean;
  className?: string;
}

export function BookmarkButton({ questionId, attemptId, isBookmarked: initial, className }: BookmarkButtonProps) {
  const { user } = useAuth();
  const [bookmarked, setBookmarked] = useState(initial);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    if (!user || loading) return;
    setLoading(true);

    if (bookmarked) {
      const { error } = await supabase
        .from('question_bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('question_id', questionId);
      if (error) {
        toast.error('Failed to remove bookmark');
      } else {
        setBookmarked(false);
      }
    } else {
      const { error } = await supabase
        .from('question_bookmarks')
        .insert({
          user_id: user.id,
          question_id: questionId,
          attempt_id: attemptId || null,
        });
      if (error && error.code !== '23505') {
        toast.error('Failed to bookmark question');
      } else {
        setBookmarked(true);
        toast.success('Question bookmarked');
      }
    }
    setLoading(false);
  }, [user, questionId, attemptId, bookmarked, loading]);

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={bookmarked ? 'Remove bookmark' : 'Bookmark this question'}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-[color,background-color,border-color,opacity] tap-target disabled:opacity-50',
        bookmarked
          ? 'border-govt-500 bg-govt-50 text-govt-700'
          : 'border-[#E5E4F2] text-navy-600 hover:bg-[#FAFAFF]',
        className,
      )}
    >
      {bookmarked ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
    </button>
  );
}

export function useBookmarkStatus(questionIds: string[], userId: string | undefined) {
  return useQuery<Set<string>>({
    queryKey: ['bookmark-status', userId, questionIds],
    queryFn: async () => {
      if (!userId || questionIds.length === 0) return new Set<string>();
      const { data, error } = await supabase
        .from('question_bookmarks')
        .select('question_id')
        .eq('user_id', userId)
        .in('question_id', questionIds);
      if (error) throw error;
      return new Set((data || []).map((b) => b.question_id));
    },
    enabled: !!userId && questionIds.length > 0,
    staleTime: 10_000,
  });
}
