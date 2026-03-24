'use client';

import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            Something went wrong
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-md">
            {this.state.error?.message || 'An unexpected error occurred. Try refreshing the page.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <RotateCcw size={14} />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
