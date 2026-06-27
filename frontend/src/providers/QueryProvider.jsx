import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

/**
 * QueryProvider — React Query Setup
 * يوفر caching ذكي، background refetch، و optimistic updates
 * لكل الـ API calls في التطبيق.
 */

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Background refetch every 5 minutes
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Cache for 10 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      // Retry 3 times on failure
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus (user returns to tab)
      refetchOnWindowFocus: true,
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

export default function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools — hidden in production */}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

/**
 * Access queryClient from outside React (e.g., in event listeners)
 */
export { queryClient };
