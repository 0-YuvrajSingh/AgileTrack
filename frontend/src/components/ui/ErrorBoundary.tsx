import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white p-8 rounded-xl border border-slate-200 shadow-stripe">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto mb-4 text-xl font-bold">
              ⚠️
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-500 mb-6">
              The application encountered an unexpected error. Don't worry, your data is safe.
            </p>
            {this.state.error && (
              <pre className="text-left text-xs bg-slate-50 p-3 rounded border border-slate-100 text-slate-600 mb-6 max-h-32 overflow-auto font-mono">
                {this.state.error.toString()}
              </pre>
            )}
            <Button className="w-full" onClick={this.handleReset}>
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
