import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, FileText, ClipboardList } from 'lucide-react';
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
  mode: 'questions' | 'dpp' | 'mock_test';
  created: number;
  skipped: number;
  mock_test_id?: string | null;
  message: string;
}

type GenMode = 'questions' | 'dpp' | 'mock_test';

const selectClass = 'w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900';

const MODE_TABS: { mode: GenMode; label: string; icon: typeof Sparkles; hint: string }[] = [
  { mode: 'questions', label: 'Questions', icon: Sparkles, hint: 'Generate questions for review' },
  { mode: 'dpp', label: 'DPP', icon: FileText, hint: 'Create a daily practice problem set' },
  { mode: 'mock_test', label: 'Mock Test', icon: ClipboardList, hint: 'Create a full mock test draft' },
];

export function AiGenerateForm() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<GenMode>('questions');
  const [chapterId, setChapterId] = useState('');
  const [type, setType] = useState<'MCQ' | 'NUMERICAL'>('MCQ');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [count, setCount] = useState(5);
  const [title, setTitle] = useState('');
  const [durationMin, setDurationMin] = useState(60);
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
    if ((mode === 'dpp' || mode === 'mock_test') && !title.trim()) {
      setError('Enter a title for the test or DPP.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: Record<string, unknown> = { mode, chapter_id: Number(chapterId), type, difficulty, count };
    if (mode === 'dpp' || mode === 'mock_test') {
      payload.title = title.trim();
      payload.duration_min = durationMin;
    }
    const { data, error: invokeError } = await supabase.functions.invoke<GenerateResult>('generate-ai-questions', {
      body: payload,
    });
    setSubmitting(false);

    queryClient.invalidateQueries({ queryKey: ['admin-ai-jobs'] });
    queryClient.invalidateQueries({ queryKey: ['ai-usage-ledger'] });

    if (invokeError || !data || data.status !== 'SUCCEEDED' || typeof data.created !== 'number') {
      setError('Generation did not finish. Check the generation jobs below for the reason, then try again.');
      return;
    }
    toast.success(data.message);
    if (mode === 'questions') {
      setTitle('');
    }
  };

  const activeTab = MODE_TABS.find((t) => t.mode === mode)!;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" aria-hidden /> AI Studio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {MODE_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.mode}
                onClick={() => { setMode(tab.mode); setError(null); }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  mode === tab.mode
                    ? 'bg-govt-600 text-white'
                    : 'bg-navy-50 text-navy-700 hover:bg-navy-100'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {tab.label}
              </button>
            );
          })}
        </div>

        <p className="text-sm text-navy-600">{activeTab.hint}. Questions are saved for review and stay hidden from students until published.</p>

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
          {(mode === 'dpp' || mode === 'mock_test') && (
            <>
              <label className="space-y-1 text-sm text-navy-700 sm:col-span-2">
                {mode === 'dpp' ? 'DPP title' : 'Mock test title'}
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={mode === 'dpp' ? 'e.g. DPP — Rotational Motion' : 'e.g. AI Mock — Kinematics'}
                  className={selectClass}
                />
              </label>
              <label className="space-y-1 text-sm text-navy-700">
                Duration (minutes)
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={durationMin}
                  onChange={(e) => setDurationMin(Math.min(300, Math.max(5, Number(e.target.value) || 60)))}
                  className={selectClass}
                />
              </label>
            </>
          )}
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <Button variant="primary" onClick={handleGenerate} loading={submitting} disabled={submitting}>
          {mode === 'questions' ? 'Generate questions' : mode === 'dpp' ? 'Create DPP' : 'Create mock test'}
        </Button>
      </CardContent>
    </Card>
  );
}
