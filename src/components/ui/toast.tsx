import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        classNames: {
          toast: 'rounded-xl border border-navy-200 bg-white text-navy-900 shadow-card',
          title: 'font-semibold text-sm',
          description: 'text-sm text-navy-500',
        },
      }}
    />
  );
}
