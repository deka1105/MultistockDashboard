import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 25_000,        // 25s — slightly under the 30s cache TTL
      gcTime: 5 * 60 * 1000,   // 5 min garbage collection
      retry: 2,
      refetchOnWindowFocus: true,
    },
  },
})
