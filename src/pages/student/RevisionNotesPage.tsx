import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronRight, Search } from 'lucide-react';
import { StudentLayout } from '@/layouts/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { fetchRevisionNotes, type RevisionNote } from '@/lib/revision';

interface ChapterGroup {
  chapterId: number;
  chapterName: string;
  subjectName: string;
  notes: RevisionNote[];
}

export function RevisionNotesPage() {
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');

  const { data: notes, isLoading, isError, refetch } = useQuery({
    queryKey: ['revision-notes'],
    queryFn: fetchRevisionNotes,
  });

  const subjects = useMemo(
    () => [...new Set((notes ?? []).map((note) => note.chapter.subject.name))].sort(),
    [notes],
  );

  const groups = useMemo<ChapterGroup[]>(() => {
    const term = search.trim().toLowerCase();
    const byChapter = new Map<number, ChapterGroup>();
    for (const note of notes ?? []) {
      if (subjectFilter !== 'all' && note.chapter.subject.name !== subjectFilter) continue;
      if (term && !`${note.title} ${note.chapter.name}`.toLowerCase().includes(term)) continue;
      const existing = byChapter.get(note.chapter.id);
      if (existing) {
        existing.notes.push(note);
      } else {
        byChapter.set(note.chapter.id, {
          chapterId: note.chapter.id,
          chapterName: note.chapter.name,
          subjectName: note.chapter.subject.name,
          notes: [note],
        });
      }
    }
    return [...byChapter.values()].sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName) || a.chapterName.localeCompare(b.chapterName),
    );
  }, [notes, search, subjectFilter]);

  return (
    <StudentLayout>
      <div className="space-y-4 sm:space-y-6">
        <section className="rounded-2xl border border-white/10 bg-[#11121c] p-6 shadow-card sm:p-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-sky-300">
            <BookOpen className="h-3.5 w-3.5" /> Revision Vault
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Chapter Notes</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-300">
            Short reading notes on the core ideas of each chapter. Open a chapter note, read it end to end, then test yourself with the practice questions.
          </p>
        </section>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" aria-hidden />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by note or chapter..."
              aria-label="Search chapter notes"
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-navy-500 focus:border-govt-400 focus:outline-none focus:ring-1 focus:ring-govt-400"
            />
          </div>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            aria-label="Filter by subject"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-navy-200"
          >
            <option value="all">All subjects</option>
            {subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : isError ? (
          <ErrorState
            title="Chapter notes could not load"
            description="Check your connection and try again."
            action={<button onClick={() => refetch()} className="text-sm font-semibold text-govt-300 hover:text-govt-200">Try again</button>}
          />
        ) : groups.length === 0 ? (
          <EmptyState
            title={search || subjectFilter !== 'all' ? 'No matching notes' : 'No chapter notes yet'}
            description={search || subjectFilter !== 'all' ? 'Try a different search or subject.' : 'Notes for your chapters will appear here as they are published.'}
          />
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {groups.map((group) => (
              <section key={group.chapterId} aria-labelledby={`chapter-${group.chapterId}`}>
                <div className="mb-3 flex items-baseline gap-2">
                  <h2 id={`chapter-${group.chapterId}`} className="text-base font-semibold text-white">{group.chapterName}</h2>
                  <span className="text-xs text-navy-400">{group.subjectName}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {group.notes.map((note) => (
                    <Link key={note.id} to={`/revision-vault/notes/${note.id}`} className="group block focus:outline-none">
                      <Card className="h-full border-white/10 bg-[#11121c] transition-[transform,border-color] duration-300 motion-safe:group-hover:-translate-y-0.5 group-hover:border-white/25 group-focus-visible:ring-2 group-focus-visible:ring-govt-400">
                        <CardContent className="flex items-center justify-between gap-3 p-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{note.title}</p>
                            <p className="mt-1 text-xs text-navy-400">Reading time about {estimateMinutes(note.body)} min</p>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-navy-400 transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}

function estimateMinutes(body: string): number {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}
