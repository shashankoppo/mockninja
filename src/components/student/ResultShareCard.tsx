import { Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Belt, type BeltLevel } from '@/components/common/Belt';
import { toast } from '@/lib/toast';

interface ResultShareCardProps {
  belt: BeltLevel | null;
  title: string;
  score: number;
  totalMarks: number;
  percentage: number;
  accuracy: number;
  correct: number;
  wrong: number;
}

function buildResultSummary({ title, score, totalMarks, percentage, accuracy, correct, wrong }: ResultShareCardProps) {
  return `${title}: ${score} / ${totalMarks} marks (${percentage}%). Accuracy ${accuracy}%, ${correct} correct, ${wrong} wrong. Practised on Mock Ninja (independent practice platform).`;
}

export function ResultShareCard(props: ResultShareCardProps) {
  const summary = buildResultSummary(props);

  async function handleShare() {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: props.title, text: summary });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(summary);
      toast.success('Result summary copied.');
    } catch {
      toast.error('Could not copy. Select the text and copy it manually.');
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {props.belt && <Belt level={props.belt} size="md" showLabel />}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-navy-500">Share your result</p>
            <p className="mt-1 text-sm text-navy-700">{summary}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleShare} className="shrink-0">
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? <Share2 className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          Share
        </Button>
      </CardContent>
    </Card>
  );
}
