import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-navy-50 p-6 text-center">
          <h1 className="text-2xl font-bold text-navy-900">Something went wrong</h1>
          <p className="mt-2 text-navy-500">{this.state.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg bg-govt-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-govt-700 tap-target"
          >
            Reload the page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
