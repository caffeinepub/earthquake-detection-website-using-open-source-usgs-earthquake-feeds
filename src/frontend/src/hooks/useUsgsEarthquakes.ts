import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getUsgsFeedUrl } from "../lib/usgsFeeds";
import type { TimeWindow, UsgsResponse } from "../lib/usgsTypes";

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
      // wait a bit before retry
      if (i < retries - 1)
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastError;
}

async function fetchUsgsData(url: string): Promise<UsgsResponse> {
  const res = await fetchWithRetry(url);
  const data = await res.json();
  return data as UsgsResponse;
}

export function useUsgsEarthquakes(timeWindow: TimeWindow) {
  const queryClient = useQueryClient();

  const query = useQuery<UsgsResponse>({
    queryKey: ["earthquakes", timeWindow],
    queryFn: () => fetchUsgsData(getUsgsFeedUrl(timeWindow)),
    staleTime: 60000,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  const forceRefresh = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["earthquakes", timeWindow],
      refetchType: "active",
    });
  };

  return {
    ...query,
    forceRefresh,
  };
}
