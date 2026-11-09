import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCw, AlertTriangle, ChevronDown, ChevronUp, ArrowLeft, Bug, Send, X, CheckCircle2, Loader2 } from 'lucide-react';
import { db } from '../../db';
import { recordError } from '../../services/errorTelemetryService';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
  onGoBack?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  isReportModalOpen: boolean;
  userActionDescription: string;
  isSubmittingReport: boolean;
  reportSubmitted: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    isReportModalOpen: false,
    userActionDescription: '',
    isSubmittingReport: false,
    reportSubmitted: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught unhandled error:', error, errorInfo);
    this.setState({ errorInfo });

    try {
      recordError(error, {
        componentStack: errorInfo.componentStack ?? undefined,
        context: `ErrorBoundary: ${this.props.fallbackTitle || 'Component View'}`,
        source: 'React.ErrorBoundary'
      });
    } catch {}
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      isReportModalOpen: false,
      userActionDescription: '',
      isSubmittingReport: false,
      reportSubmitted: false
    });
    this.props.onReset?.();
  };

  private handleGoBack = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      isReportModalOpen: false
    });

    if (this.props.onGoBack) {
      this.props.onGoBack();
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      this.props.onReset?.();
    }
  };

  private handleOpenReport = () => {
    this.setState({
      isReportModalOpen: true,
      reportSubmitted: false,
      userActionDescription: ''
    });
  };

  private handleSubmitReport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    this.setState({ isSubmittingReport: true });

    const pageName = this.props.fallbackTitle || 'Application View';
    const errorMsg = this.state.error?.message || 'Unknown render exception';
    const errorStack = this.state.error?.stack || '';
    const componentStack = this.state.errorInfo?.componentStack || '';
    const userNotes = this.state.userActionDescription.trim() || 'No user comments provided';

    const fullDiagnosticMessage = [
      `[CRASH REPORT - ${pageName.toUpperCase()}]`,
      `User Notes: ${userNotes}`,
      `Error: ${this.state.error?.name || 'Error'}: ${errorMsg}`,
      `Component: ${pageName}`,
      `Time: ${new Date().toLocaleString()}`,
      `URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`,
      `User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`,
      `\n--- Stack Trace ---\n${errorStack}`,
      componentStack ? `\n--- Component Tree ---\n${componentStack}` : ''
    ].filter(Boolean).join('\n');

    // 1. Offline persistence in Dexie
    try {
      await db.feedback.add({
        name: 'Student Crash Diagnostic',
        campus: 'davao-general',
        category: 'Crash / Bug Report',
        rating: 1,
        subject: `Crash Report: ${pageName}`,
        message: fullDiagnosticMessage,
        status: 'New',
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('[ErrorBoundary] Failed to persist report in Dexie:', err);
    }

    // 2. Dispatch to live server feedback endpoint
    try {
      await fetch('https://skweladabaw.kurzyrio.site/api/feedback.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Student Crash Diagnostic',
          email: '',
          campus: 'davao-general',
          category: 'Crash / Bug Report',
          rating: 1,
          subject: `Crash in ${pageName}`,
          message: fullDiagnosticMessage
        })
      });
    } catch (err) {
      console.warn('[ErrorBoundary] Remote feedback dispatch offline or failed:', err);
    }

    this.setState({ isSubmittingReport: false, reportSubmitted: true });

    setTimeout(() => {
      this.setState({ isReportModalOpen: false });
    }, 2000);
  };

  public render() {
    if (this.state.hasError) {
      const pageTitle = this.props.fallbackTitle || 'Application Shell';

      return (
        <div className="w-full h-full min-h-[340px] flex flex-col items-center justify-center p-6 text-center bg-[var(--card-bg)] text-[var(--text-primary)] rounded-3xl border border-[var(--card-border)] select-none animate-fade-in shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-3 shadow-inner">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <h3 className="font-bold text-sm mb-1 text-[var(--text-primary)]">
            {pageTitle}
          </h3>

          <p className="text-xs text-[var(--text-secondary)] max-w-xs mb-5 leading-relaxed">
            An unexpected error occurred while displaying this page. You can reload, return back, or send a report.
          </p>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-sm w-full">
            <button
              type="button"
              onClick={this.handleGoBack}
              className="px-3.5 py-2 rounded-xl bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--card-border)] font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs pressable cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              <span>Go Back</span>
            </button>

            <button
              type="button"
              onClick={this.handleReset}
              className="px-3.5 py-2 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs flex items-center gap-1.5 hover:opacity-95 active:scale-95 transition-all shadow-xs pressable cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Reload View</span>
            </button>

            <button
              type="button"
              onClick={this.handleOpenReport}
              className="px-3.5 py-2 rounded-xl bg-[var(--nested-bg)] hover:bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--card-border)] font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs pressable cursor-pointer"
            >
              <Bug className="w-3.5 h-3.5 text-amber-500" />
              <span>Report</span>
            </button>

            {this.state.error && (
              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="px-2.5 py-2 rounded-xl bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs flex items-center gap-1 cursor-pointer transition-colors"
                title="Toggle technical error details"
              >
                <span>Details</span>
                {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* Technical Error Details Drawer */}
          {this.state.showDetails && this.state.error && (
            <div className="mt-4 p-3.5 rounded-2xl bg-black/40 border border-red-500/30 text-left font-mono text-[11px] text-red-300 max-w-lg w-full overflow-x-auto max-h-48 select-text">
              <p className="font-bold text-red-400">{this.state.error.name}: {this.state.error.message}</p>
              {this.state.error.stack && (
                <pre className="mt-1.5 whitespace-pre-wrap opacity-80 text-[10px] leading-relaxed">
                  {this.state.error.stack}
                </pre>
              )}
            </div>
          )}

          {/* Report Diagnostic Modal */}
          {this.state.isReportModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in text-left select-text">
              <div 
                className="w-full max-w-md bg-[var(--card-bg)] border border-[var(--card-border)] rounded-3xl p-5 shadow-2xl text-[var(--text-primary)] space-y-4 animate-scale-up"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                      <Bug className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">Report Issue</h4>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Page: <span className="font-semibold text-[var(--text-primary)]">{pageTitle}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => this.setState({ isReportModalOpen: false })}
                    className="w-7 h-7 rounded-full bg-[var(--nested-bg)] hover:bg-[var(--nested-border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {this.state.reportSubmitted ? (
                  <div className="py-6 flex flex-col items-center justify-center text-center space-y-2 animate-fade-in">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 mb-1">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-sm text-[var(--text-primary)]">Report Submitted</p>
                    <p className="text-xs text-[var(--text-secondary)] max-w-xs">
                      Thank you! Your crash diagnostic was captured to help us patch this issue in the next update.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={this.handleSubmitReport} className="space-y-3.5">
                    <div className="p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] space-y-1">
                      <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                        Captured Exception
                      </span>
                      <p className="text-xs font-mono text-amber-500 truncate">
                        {this.state.error?.name || 'Error'}: {this.state.error?.message || 'Render crash'}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--text-primary)] block">
                        What were you doing before this happened?
                      </label>
                      <textarea
                        rows={3}
                        value={this.state.userActionDescription}
                        onChange={(e) => this.setState({ userActionDescription: e.target.value })}
                        placeholder="e.g., opened Settings from the bottom navigation, tapped a theme button, etc."
                        className="w-full p-3 rounded-2xl bg-[var(--nested-bg)] border border-[var(--card-border)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-hidden focus:border-[var(--btn-primary-bg)] transition-colors resize-none"
                        autoFocus
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => this.setState({ isReportModalOpen: false })}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={this.state.isSubmittingReport}
                        className="px-4 py-2 rounded-xl bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] font-bold text-xs flex items-center gap-1.5 hover:opacity-95 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {this.state.isSubmittingReport ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Send Report</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
