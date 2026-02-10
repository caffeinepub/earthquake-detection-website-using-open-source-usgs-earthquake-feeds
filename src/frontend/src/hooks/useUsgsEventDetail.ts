import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '../lib/fetchJson';
import { UsgsEventDetail } from '../lib/usgsEventDetailTypes';

interface UseUsgsEventDetailOptions {
  detailUrl: string | null;
  enabled?: boolean;
}

/**
 * React Query hook for fetching USGS event detail JSON.
 * Caches the detail response by URL and only fetches when enabled.
 */
export function useUsgsEventDetail({ detailUrl, enabled = true }: UseUsgsEventDetailOptions) {
  return useQuery<UsgsEventDetail>({
    queryKey: ['usgs-event-detail', detailUrl],
    queryFn: async () => {
      if (!detailUrl) {
        throw new Error('Detail URL is required');
      }
      return fetchJson<UsgsEventDetail>(detailUrl);
    },
    enabled: enabled && !!detailUrl,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}
