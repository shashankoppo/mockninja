import { type ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface PlaceholderProps {
  title: string;
  description: string;
  badge?: string;
  children?: ReactNode;
}

export function Placeholder({ title, description, badge = 'Coming soon', children }: PlaceholderProps) {
  return (
    <div className="document-page mx-auto max-w-3xl">
      <Card className="document-card">
        <CardHeader className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle className="text-white">{title}</CardTitle>
            <Badge variant="neutral">{badge}</Badge>
          </div>
          <CardDescription className="mt-3 max-w-2xl text-navy-300">{description}</CardDescription>
        </CardHeader>
        {children && <CardContent className="px-6 pb-6 text-navy-200 sm:px-8 sm:pb-8">{children}</CardContent>}
      </Card>
    </div>
  );
}
