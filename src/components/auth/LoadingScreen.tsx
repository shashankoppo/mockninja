import { Loader2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-50">
      <Loader2 className="h-8 w-8 animate-spin text-govt-600" />
    </div>
  );
}
