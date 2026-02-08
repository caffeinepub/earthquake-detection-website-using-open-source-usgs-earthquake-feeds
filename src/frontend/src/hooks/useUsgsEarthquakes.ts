import { useQuery } from '@tanstack/react-query';
import { UsgsResponse, TimeWindow } from '../lib/usgsTypes';
import { fetchJson } from '../lib/fetchJson';
import { getUsgsFeedUrl } from '../lib/usgsFeeds';

export function useUsgsEarthquakes(timeWindow: TimeWindow) {
  return useQuery<UsgsResponse>({
    queryKey: ['earthquakes', timeWindow],
    queryFn: async () => {
      const url = getUsgsFeedUrl(timeWindow);
      return fetchJson<UsgsResponse>(url);
    },
    staleTime: 60000, // 1 minute
    refetchInterval: 60000, // Auto-refetch every 60 seconds
    refetchOnWindowFocus: true,
  });
}
