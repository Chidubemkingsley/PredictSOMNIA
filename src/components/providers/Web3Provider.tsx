'use client';

import { ReactNode, useState, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { somniaChainConfig } from '@/lib/web3-config';
import { Web3ErrorBoundary } from '@/components/Web3ErrorBoundary';

// Suppress WebSocket connection errors globally
if (typeof window !== 'undefined') {
  // Store original console.error
  const originalConsoleError = console.error;

  // Override console.error to filter out WebSocket susomniaription errors
  console.error = (...args: unknown[]) => {
    const errorString = args.join(' ');

    // Filter out WebSocket/WalletConnect susomniaription errors
    if (
      errorString.includes(
        'Connection interrupted while trying to susomniaribe'
      ) ||
      errorString.includes('WebSocket connection') ||
      errorString.includes('Fatal socket error') ||
      errorString.includes('Unauthorized: invalid key') ||
      errorString.includes('core/relayer') ||
      (errorString.includes('susomniaription') &&
        errorString.includes('interrupted'))
    ) {
      // Only log in development, suppress in production
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          '🔌 [Web3 Connection Info]:',
          errorString.includes('invalid key')
            ? 'WalletConnect disabled (no project ID). Using browser wallet only.'
            : 'Connection state changed.'
        );
      }
      return;
    }

    // Call original console.error for other errors
    originalConsoleError.apply(console, args);
  };

  // Global unhandled promise rejection handler for Web3 errors
  window.addEventListener('unhandledrejection', event => {
    const error = event.reason;
    const errorMsg = error?.message || String(error);

    if (
      errorMsg.includes('Connection interrupted') ||
      errorMsg.includes('susomniaribe') ||
      errorMsg.includes('WebSocket') ||
      errorMsg.includes('invalid key') ||
      errorMsg.includes('Fatal socket error')
    ) {
      // Prevent the error from being logged
      event.preventDefault();

      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.info(
          '🔌 Web3 connection handled:',
          errorMsg.slice(0, 80) + '...'
        );
      }
    }
  });
}

// Create QueryClient with proper error handling and retry logic
const makeQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Prevent refetch on window focus to reduce connection attempts
        refetchOnWindowFocus: false,
        // Retry failed requests with exponential backoff
        retry: 3,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Cache time
        staleTime: 60000, // 1 minute
      },
      mutations: {
        // Retry mutations on failure
        retry: 2,
      },
    },
  });
};

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function Web3Provider({ children }: { children: ReactNode }) {
  // Only create the query client once per browser session
  const [queryClient] = useState(() => getQueryClient());

  // Handle Web3 connection errors at the provider level
  useEffect(() => {
    // Additional error suppression for Web3Modal/WalletConnect errors
    const handleError = (event: ErrorEvent) => {
      const error = event.error || event.message;
      const errorString = String(error);

      if (
        errorString.includes('Connection interrupted') ||
        errorString.includes('susomniaribe') ||
        errorString.includes('WebSocket') ||
        errorString.includes('index.es.js') ||
        errorString.includes('Fatal socket error') ||
        errorString.includes('invalid key') ||
        errorString.includes('core/relayer')
      ) {
        event.preventDefault();
        event.stopPropagation();

        // Silent in production, info log in development
        if (process.env.NODE_ENV === 'development') {
          console.info('🔌 Web3 connection event handled');
        }
        return false;
      }
    };

    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <Web3ErrorBoundary>
      <WagmiProvider config={somniaChainConfig} reconnectOnMount={true}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            theme={darkTheme({
              accentColor: '#3B82F6',
              accentColorForeground: 'white',
              borderRadius: 'medium',
              fontStack: 'system',
            })}
            modalSize="compact"
          >
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </Web3ErrorBoundary>
  );
}
