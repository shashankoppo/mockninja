import { useTranslation } from 'react-i18next';
import { Math } from '@/components/Math';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const samples = [
  { label: 'Quadratic formula', tex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', display: true },
  { label: '3×3 matrix', tex: '\\begin{pmatrix} 1 & 2 & 3 \\\\ 4 & 5 & 6 \\\\ 7 & 8 & 9 \\end{pmatrix}', display: true },
  { label: 'Definite integral', tex: '\\int_0^{\\pi} \\sin^2(x)\\, dx = \\frac{\\pi}{2}', display: true },
  { label: 'Vector cross product', tex: '\\vec{a} \\times \\vec{b} = \\begin{vmatrix} \\hat{i} & \\hat{j} & \\hat{k} \\\\ a_1 & a_2 & a_3 \\\\ b_1 & b_2 & b_3 \\end{vmatrix}', display: true },
  { label: 'Chemical equation (mhchem)', tex: '\\ce{2H2 + O2 -> 2H2O}', display: true },
  { label: 'Greek symbols', tex: '\\alpha, \\beta, \\gamma, \\delta, \\epsilon, \\theta, \\lambda, \\mu, \\pi, \\sigma, \\omega', display: false },
];

export function DevMathPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-navy-50 py-10">
      <div className="container-app">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-navy-900">Math Rendering — Dev Test</h1>
          <p className="mt-1 text-sm text-navy-500">
            KaTeX + mhchem. Verify all samples render correctly at 360px width.
          </p>
          <Badge variant="neutral" className="mt-3">Dev page — not in production nav</Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {samples.map((s) => (
            <Card key={s.label}>
              <CardHeader>
                <CardTitle className="text-base">{s.label}</CardTitle>
                <CardDescription className="font-mono text-xs">{s.tex}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg border border-navy-200 bg-white p-4">
                  <Math display={s.display}>{s.tex}</Math>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-navy-400">{t('app.independent')}</p>
      </div>
    </div>
  );
}
