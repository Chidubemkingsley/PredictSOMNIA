'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary to catch Web3 connection errors and display a fallback UI
 * Prevents the entire app from crashing due to connection issues
 */
export class Web3ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a Web3/connection related error
    const isWeb3Error =
      error.message.includes('Connection interrupted') ||
      error.message.includes('connection') ||
      error.message.includes('susomniaribe') ||
      error.message.includes('WebSocket') ||
      error.message.includes('RPC');

    if (isWeb3Error) {
      console.warn('Web3 connection error caught by boundary:', error);
      return { hasError: true, error };
    }

    // Re-throw non-Web3 errors
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Web3ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Reload the page to reset the connection
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-center">
              <div className="rounded-full bg-yellow-100 p-3">
                <svg
                  className="h-6 w-6 text-yellow-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            <h2 className="mb-2 text-center text-xl font-semibold text-gray-900">
              Connection Issue
            </h2>

            <p className="mb-4 text-center text-sm text-gray-600">
              We&apos;re having trouble connecting to the blockchain network. This
              could be due to:
            </p>

            <ul className="mb-6 list-inside list-disc space-y-1 text-sm text-gray-600">
              <li>Temporary network interruption</li>
              <li>RPC endpoint unavailability</li>
              <li>Your internet connection</li>
            </ul>

            <div className="space-y-2">
              <button
                onClick={this.handleReset}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Reconnect
              </button>

              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Try Again
              </button>
            </div>

            {this.state.error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-xs text-gray-500">
                  Technical Details
                </summary>
                <pre className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs text-gray-700">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
