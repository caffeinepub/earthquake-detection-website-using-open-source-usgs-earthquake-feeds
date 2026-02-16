import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UsgsResponse, TimeWindow } from '../lib/usgsTypes';
import { fetchJson } from '../lib/fetchJson';
import { getUsgsFeedUrl } from '../lib/usgsFeeds';

export function useUsgsEarthquakes(timeWindow: TimeWindow) {
  const queryClient = useQueryClient();

  const query = useQuery<UsgsResponse>({
    queryKey: ['earthquakes', timeWindow],
    queryFn: async () => {
      const url = getUsgsFeedUrl(timeWindow);
      return fetchJson<UsgsResponse>(url);
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Auto-refetch every 60 seconds
    refetchOnWindowFocus: true,
  });

  // Manual refresh function that forces a network fetch regardless of staleTime
  const forceRefresh = async () => {
    // Invalidate the query to mark it as stale, then refetch
    await queryClient.invalidateQueries({ 
      queryKey: ['earthquakes', timeWindow],
      refetchType: 'active'
    });
  };

  return {
    ...query,
    forceRefresh,
  };
}
