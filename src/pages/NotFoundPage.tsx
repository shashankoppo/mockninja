import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-navy-50 px-6 text-center">
      <p className="text-7xl font-bold text-govt-600">404</p>
      <h1 className="mt-4 text-2xl font-bold text-navy-900">Page not found</h1>
      <p className="mt-2 max-w-md text-navy-500">
        The page you are looking for does not exist or may have moved.
      </p>
      <Link to="/" className="mt-6">
        <Button variant="primary">
          <Home className="h-4 w-4" />
          Go home
        </Button>
      </Link>
    </div>
  );
}
