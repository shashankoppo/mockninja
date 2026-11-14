import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { fetchRevisionNotes } from '@/lib/revision';

export function RevisionNoteReaderPage() {
  const { noteId } = useParams<{ noteId: string }>();

  const { data: notes, isLoading, isError, refetch } = useQuery({
    queryKey: ['revision-notes'],
    queryFn: fetchRevisionNotes,
  });

  const { note, siblings } = useMemo(() => {
    const current = (notes ?? []).find((item) => item.id === noteId) ?? null;
    const chapterNotes = current
      ? (notes ?? []).filter((item) => item.chapter.id === current.chapter.id)
      : [];
    return { note: current, siblings: chapterNotes };
  }, [notes, noteId]);

  const index = note ? siblings.findIndex((item) => item.id === note.id) : -1;
  const previous = index > 0 ? siblings[index - 1] : null;
  const next = index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;
  const paragraphs = note ? note.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) : [];

  return (
    <StudentLayout>
      <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
        <Link to="/revision-vault/notes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-govt-300 hover:text-govt-200">
          <ArrowLeft className="h-4 w-4" aria-hidden /> All chapter notes
        </Link>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : isError ? (
          <ErrorState
            title="This note could not load"
            description="Check your connection and try again."
            action={<button onClick={() => refetch()} className="text-sm font-semibold text-govt-300 hover:text-govt-200">Try again</button>}
          />
        ) : !note ? (
          <EmptyState title="Note not found" description="It may have been unpublished or the link is out of date." />
        ) : (
          <article className="rounded-2xl border border-white/10 bg-[#11121c] p-6 shadow-card sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">
              {note.chapter.subject.name} · Class {note.chapter.class_level} · {note.chapter.name}
            </p>
            <h1 className="mt-3 text-2xl font-bold leading-tight text-white sm:text-3xl">{note.title}</h1>
            <div className="mt-6 space-y-5 text-base leading-[1.7] text-navy-200">
              {paragraphs.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </article>
        )}

        {note && (
          <nav className="grid gap-3 sm:grid-cols-2" aria-label="Chapter note navigation">
            {previous ? (
              <Link to={`/revision-vault/notes/${previous.id}`} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:border-white/25">
                <ChevronLeft className="h-4 w-4 shrink-0 text-navy-400" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-xs text-navy-400">Previous</span>
                  <span className="block truncate text-sm font-semibold text-white">{previous.title}</span>
                </span>
              </Link>
            ) : <span />}
            {next && (
              <Link to={`/revision-vault/notes/${next.id}`} className="flex items-center justify-end gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-right transition-colors hover:border-white/25">
                <span className="min-w-0">
                  <span className="block text-xs text-navy-400">Next</span>
                  <span className="block truncate text-sm font-semibold text-white">{next.title}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-navy-400" aria-hidden />
              </Link>
            )}
          </nav>
        )}
      </div>
    </StudentLayout>
  );
}
