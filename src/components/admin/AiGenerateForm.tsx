import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

interface ChapterOption {
  id: number;
  name: string;
  subject: { name: string } | null;
}

interface GenerateResult {
  job_id: string;
  status: 'SUCCEEDED' | 'FAILED';
  created: number;
  skipped: number;
  message: string;
}

const selectClass = 'w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900';

export function AiGenerateForm() {
  const queryClient = useQueryClient();
  const [chapterId, setChapterId] = useState('');
  const [type, setType] = useState<'MCQ' | 'NUMERICAL'>('MCQ');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [count, setCount] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: chapters } = useQuery({
    queryKey: ['admin-ai-chapters'],
    queryFn: async () => {
      const { data, error: fetchError } = await supabase
        .from('chapters')
        .select('id, name, subject:subject_id(name)')
        .order('subject_id')
        .order('ordinal');
      if (fetchError) throw fetchError;
      return (data ?? []) as unknown as ChapterOption[];
    },
  });

  const handleGenerate = async () => {
    if (!chapterId) {
      setError('Choose a chapter first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const { data, error: invokeError } = await supabase.functions.invoke<GenerateResult>('generate-ai-questions', {
      body: { chapter_id: Number(chapterId), type, difficulty, count },
    });
    setSubmitting(false);

    queryClient.invalidateQueries({ queryKey: ['admin-ai-jobs'] });
    queryClient.invalidateQueries({ queryKey: ['ai-usage-ledger'] });

    if (invokeError || !data || data.status !== 'SUCCEEDED' || typeof data.created !== 'number') {
      setError('Question generation did not finish. Check the generation jobs below for the reason, then try again.');
      return;
    }
    toast.success(data.message);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" aria-hidden /> Generate draft questions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-navy-600">
          Generated questions are saved for review. They stay hidden from students until they are reviewed and published.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-navy-700 sm:col-span-2">
            Chapter
            <select value={chapterId} onChange={(e) => setChapterId(e.target.value)} className={selectClass}>
              <option value="">Choose a chapter</option>
              {(chapters ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.subject?.name ? `${c.subject.name} · ${c.name}` : c.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-navy-700">
            Type
            <select value={type} onChange={(e) => setType(e.target.value as 'MCQ' | 'NUMERICAL')} className={selectClass}>
              <option value="MCQ">Single choice (MCQ)</option>
              <option value="NUMERICAL">Numerical</option>
            </select>
          </label>
          <label className="space-y-1 text-sm text-navy-700">
            Difficulty
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as 'EASY' | 'MEDIUM' | 'HARD')} className={selectClass}>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </label>
          <label className="space-y-1 text-sm text-navy-700">
            How many (1 to 10)
            <input
              type="number"
              min={1}
              max={10}
              value={count}
              onChange={(e) => setCount(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}
              className={selectClass}
            />
          </label>
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <Button variant="primary" onClick={handleGenerate} loading={submitting} disabled={submitting}>
          Generate for review
        </Button>
      </CardContent>
    </Card>
  );
}
