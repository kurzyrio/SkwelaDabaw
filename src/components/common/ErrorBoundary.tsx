import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCw, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
    this.props.onReset?.();
  };

  public render() {
    if (this.state.hasError) {
      const isDev = Boolean(import.meta.env?.DEV);
      return (
        <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center p-6 text-center bg-[var(--card-bg)] text-[var(--text-primary)] rounded-3xl border border-[var(--card-border)] select-none animate-fade-in">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-3 shadow-inner">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm mb-1">
            {this.props.fallbackTitle || 'Unable to display view'}
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-xs mb-4">
            An unexpected error occurred while rendering. You can easily reload to restore this view.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs flex items-center gap-2 hover:opacity-95 active:scale-95 transition-all shadow-xs pressable cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Reload View</span>
            </button>
            {isDev && this.state.error && (
              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="px-3 py-2 rounded-xl bg-[var(--nested-bg)] text-[var(--text-secondary)] font-semibold text-xs flex items-center gap-1 border border-[var(--card-border)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <span>Details</span>
                {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          {isDev && this.state.showDetails && this.state.error && (
            <div className="mt-4 p-3 rounded-2xl bg-black/40 border border-red-500/30 text-left font-mono text-[11px] text-red-300 max-w-lg w-full overflow-x-auto max-h-48">
              <p className="font-bold">{this.state.error.name}: {this.state.error.message}</p>
              <pre className="mt-1 whitespace-pre-wrap opacity-80">{this.state.error.stack}</pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
