import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  deduplicateEarthquakes,
  normalizeBmkg,
  normalizeEmsc,
} from "../lib/dataNormalizer";
import { fetchJson } from "../lib/fetchJson";
import { getUsgsFeedUrl } from "../lib/usgsFeeds";
import type { TimeWindow, UsgsFeature, UsgsResponse } from "../lib/usgsTypes";

export interface MultiSourceSources {
  usgs: number;
  bmkg: number;
  emsc: number;
}

export interface MultiSourceResult {
  data: UsgsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  forceRefresh: () => Promise<void>;
  sources: MultiSourceSources;
}

const BMKG_URL = "https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json";
const EMSC_URL =
  "https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=100&minmagnitude=2.5&orderby=time";

async function fetchBmkg(): Promise<UsgsFeature[]> {
  try {
    const data = await fetchJson<any>(BMKG_URL);
    return normalizeBmkg(data);
  } catch (err) {
    console.warn("BMKG fetch failed (CORS or network):", err);
    return [];
  }
}

async function fetchEmsc(): Promise<UsgsFeature[]> {
  try {
    const data = await fetchJson<any>(EMSC_URL);
    return normalizeEmsc(data);
  } catch (err) {
    console.warn("EMSC fetch failed (CORS or network):", err);
    return [];
  }
}

export function useMultiSourceEarthquakes(
  timeWindow: TimeWindow,
): MultiSourceResult {
  const queryClient = useQueryClient();
  const [bmkgFeatures, setBmkgFeatures] = useState<UsgsFeature[]>([]);
  const [emscFeatures, setEmscFeatures] = useState<UsgsFeature[]>([]);
  const [sources, setSources] = useState<MultiSourceSources>({
    usgs: 0,
    bmkg: 0,
    emsc: 0,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchExternal = useCallback(async () => {
    const [bmkg, emsc] = await Promise.all([fetchBmkg(), fetchEmsc()]);
    setBmkgFeatures(bmkg);
    setEmscFeatures(emsc);
  }, []);

  useEffect(() => {
    fetchExternal();
    intervalRef.current = setInterval(fetchExternal, 5 * 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchExternal]);

  const query = useQuery<UsgsResponse>({
    queryKey: ["earthquakes", timeWindow],
    queryFn: async () => {
      const url = getUsgsFeedUrl(timeWindow);
      return fetchJson<UsgsResponse>(url);
    },
    staleTime: 60000,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  const mergedData: UsgsResponse | undefined = query.data
    ? (() => {
        const usgsFeatures = query.data.features ?? [];
        const combined = deduplicateEarthquakes([
          ...usgsFeatures,
          ...bmkgFeatures,
          ...emscFeatures,
        ]).sort((a, b) => b.properties.time - a.properties.time);

        const newSources = {
          usgs: usgsFeatures.length,
          bmkg: bmkgFeatures.length,
          emsc: emscFeatures.length,
        };
        // Update sources without triggering re-render loop
        setSources((prev) =>
          prev.usgs === newSources.usgs &&
          prev.bmkg === newSources.bmkg &&
          prev.emsc === newSources.emsc
            ? prev
            : newSources,
        );

        return { ...query.data, features: combined };
      })()
    : undefined;

  const forceRefresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["earthquakes", timeWindow],
        refetchType: "active",
      }),
      fetchExternal(),
    ]);
  };

  return {
    data: mergedData,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    forceRefresh,
    sources,
  };
}
