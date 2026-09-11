import React, { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[AgriSmart ErrorBoundary caught]:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false });
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full py-16 px-4 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
            Application View Error
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mb-4 leading-relaxed">
            AgriSmart encountered an unexpected display error. Your farm telemetry data remains safe.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white text-xs font-medium transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
