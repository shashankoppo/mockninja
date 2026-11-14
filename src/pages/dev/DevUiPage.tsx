import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip } from '@/components/ui/tooltip';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Belt } from '@/components/common/Belt';
import { PaletteSymbol, buildLegendRows } from '@/components/exam/PaletteSymbol';
import { NumericalKeypad } from '@/components/exam/NumericalKeypad';
import { QUESTION_STATES, STATE_ORDER, toPaletteStatus, type QuestionState } from '@/exam/questionStates';
import { toast } from '@/lib/toast';
import { Info, HelpCircle } from 'lucide-react';

export function DevUiPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-navy-50 py-10">
      <div className="container-app">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-navy-900">Component Gallery — Dev Test</h1>
          <p className="mt-1 text-sm text-navy-500">Every token and component state in one place.</p>
          <Badge variant="neutral" className="mt-3">Dev page — not in production nav</Badge>
        </div>

        <div className="grid gap-6">
          {/* Color tokens */}
          <Card>
            <CardHeader>
              <CardTitle>Color Tokens</CardTitle>
              <CardDescription>Brand and exam-palette colors with semantic meaning.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {[
                  { name: 'Navy 900', cls: 'bg-navy-900' },
                  { name: 'Navy 50', cls: 'bg-navy-50' },
                  { name: 'Emerald 500', cls: 'bg-emerald-500' },
                  { name: 'Amber 500', cls: 'bg-amber-500' },
                  { name: 'Violet 600', cls: 'bg-violet-600' },
                  { name: 'Orange 500', cls: 'bg-orange-500' },
                  { name: 'Slate 400', cls: 'bg-slate-400' },
                  { name: 'Error', cls: 'bg-error' },
                ].map((c) => (
                  <div key={c.name} className="flex flex-col items-center gap-1">
                    <div className={`h-14 w-14 rounded-lg ${c.cls}`} />
                    <span className="text-xs text-navy-500">{c.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Buttons */}
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
              <CardDescription>All variants, sizes, and states.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="success">Success</Button>
                <Button variant="primary" loading>Loading</Button>
                <Button variant="primary" disabled>Disabled</Button>
                <Button size="sm">Small</Button>
                <Button size="lg">Large</Button>
              </div>
            </CardContent>
          </Card>

          {/* Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Badges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Default</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="neutral">Neutral</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Progress + Skeleton */}
          <Card>
            <CardHeader>
              <CardTitle>Progress & Skeleton</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-sm text-navy-500">0%</p>
                <Progress value={0} />
              </div>
              <div>
                <p className="mb-2 text-sm text-navy-500">45%</p>
                <Progress value={45} />
              </div>
              <div>
                <p className="mb-2 text-sm text-navy-500">100%</p>
                <Progress value={100} />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Card>
            <CardHeader>
              <CardTitle>Tabs</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="physics">
                <TabsList>
                  <TabsTrigger value="physics">Physics</TabsTrigger>
                  <TabsTrigger value="chemistry">Chemistry</TabsTrigger>
                  <TabsTrigger value="maths">Maths</TabsTrigger>
                </TabsList>
                <TabsContent value="physics" className="mt-4 text-sm text-navy-600">Physics tab content.</TabsContent>
                <TabsContent value="chemistry" className="mt-4 text-sm text-navy-600">Chemistry tab content.</TabsContent>
                <TabsContent value="maths" className="mt-4 text-sm text-navy-600">Maths tab content.</TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Tooltip + Toast */}
          <Card>
            <CardHeader>
              <CardTitle>Tooltip & Toast</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Tooltip content="This is a tooltip">
                  <Button variant="outline">
                    <HelpCircle className="h-4 w-4" />
                    Hover me
                  </Button>
                </Tooltip>
                <Button
                  variant="outline"
                  onClick={() => toast.success('Saved successfully!')}
                >
                  Show toast
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toast.error('Something went wrong.')}
                >
                  Error toast
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Dialog */}
          <Card>
            <CardHeader>
              <CardTitle>Dialog</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setDialogOpen(true)}>Open dialog</Button>
              <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                title="Submit test?"
                description="You have 3 unanswered questions. Are you sure you want to submit?"
                footer={
                  <>
                    <Button variant="ghost" onClick={() => setDialogOpen(false)}>Go back</Button>
                    <Button variant="primary" onClick={() => setDialogOpen(false)}>Submit test</Button>
                  </>
                }
              />
            </CardContent>
          </Card>

          {/* Empty + Error states */}
          <Card>
            <CardHeader>
              <CardTitle>Empty & Error States</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <EmptyState
                  title="No mocks yet"
                  description="Your mocks will appear here once you start practising."
                  action={<Button variant="primary" size="sm">Browse mocks</Button>}
                />
                <ErrorState
                  title="Could not load"
                  description="Check your connection and try again."
                  action={<Button variant="outline" size="sm">Retry</Button>}
                />
              </div>
            </CardContent>
          </Card>

          {/* Exam palette states */}
          <Card>
            <CardHeader>
              <CardTitle>Exam Palette States</CardTitle>
              <CardDescription>The five question states used in the exam screen.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {[
                  { name: 'Not visited', cls: 'bg-slate-400 text-white' },
                  { name: 'Visited, not answered', cls: 'bg-orange-500 text-white' },
                  { name: 'Answered', cls: 'bg-emerald-500 text-white' },
                  { name: 'Marked for review', cls: 'bg-violet-600 text-white' },
                  { name: 'Answered + marked', cls: 'bg-violet-600 text-white ring-2 ring-emerald-500' },
                ].map((s) => (
                  <div key={s.name} className="flex flex-col items-center gap-1">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg text-sm font-bold ${s.cls}`}>
                      1
                    </div>
                    <span className="max-w-24 text-center text-xs text-navy-500">{s.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Belts */}
          <Card>
            <CardHeader>
              <CardTitle>Mastery Belts</CardTitle>
              <CardDescription>All seven belt levels at every size, with label and progress.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(['UNRATED', 'WHITE', 'YELLOW', 'GREEN', 'BLUE', 'BROWN', 'BLACK'] as const).map((level) => (
                <div key={level} data-testid={`belt-group-${level}`} className="space-y-2">
                  <p className="text-sm font-medium text-navy-700">{level}</p>
                  <div className="flex flex-wrap items-end gap-6">
                    <div className="flex flex-col items-center gap-1">
                      <Belt level={level} size="xs" showLabel />
                      <span className="text-2xs text-navy-400">xs</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Belt level={level} size="sm" showLabel />
                      <span className="text-2xs text-navy-400">sm</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Belt level={level} size="md" showLabel />
                      <span className="text-2xs text-navy-400">md</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <Belt level={level} size="lg" showLabel />
                      <span className="text-2xs text-navy-400">lg</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="border-t pt-4">
                <p className="mb-2 text-sm font-medium text-navy-700">With progress</p>
                <div className="flex flex-wrap gap-6">
                  <Belt level="YELLOW" size="md" showLabel progress={62} />
                  <Belt level="GREEN" size="md" showLabel progress={85} />
                  <Belt level="UNRATED" size="md" showLabel evidenceCount={3} minEvidence={8} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Numerical Keypad */}
          <Card>
            <CardHeader>
              <CardTitle>Numerical Keypad</CardTitle>
              <CardDescription>On-screen keypad for numerical answers. Physical keyboard is disabled in strict mode.</CardDescription>
            </CardHeader>
            <CardContent>
              <NumericalKeypad value="-42.5" onChange={() => undefined} />
            </CardContent>
          </Card>

          {/* Question Palette */}
          <Card>
            <CardHeader>
              <CardTitle>Question Palette</CardTitle>
              <CardDescription>All five states with counts and labels, from the single source of truth.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2" data-testid="palette-symbols">
                {STATE_ORDER.map((state, i) => (
                  <div key={state} className="flex flex-col items-center gap-1" data-testid={`palette-${state}`}>
                    <PaletteSymbol status={toPaletteStatus(state)} number={i + 1} />
                    <span className="text-2xs text-navy-500">{QUESTION_STATES[state].label}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4">
                <p className="mb-2 text-sm font-medium text-navy-700">Legend with counts</p>
                {buildLegendRows({
                  NOT_VISITED: 5,
                  NOT_ANSWERED: 3,
                  ANSWERED: 10,
                  MARKED: 2,
                  ANSWERED_MARKED: 1,
                }).map((row) => (
                  <div key={row.status} className="mb-1.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <PaletteSymbol status={row.status} number={0} size="sm" />
                      <span>{row.label}</span>
                    </div>
                    <span className="font-bold tabular-nums">{row.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-navy-400">
          <Info className="h-3 w-3" />
          Independent practice platform. Not affiliated with NTA.
        </p>
      </div>
    </div>
  );
}
