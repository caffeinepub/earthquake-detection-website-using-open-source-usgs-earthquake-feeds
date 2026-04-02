import type { UsgsFeature } from "./usgsTypes";

// BMKG API response type
interface BmkgGempa {
  Tanggal: string;
  Jam: string;
  DateTime: string;
  Coordinates: string;
  Lintang: string;
  Bujur: string;
  Magnitude: string;
  Kedalaman: string;
  Wilayah: string;
  Potensi: string;
}

interface BmkgResponse {
  Infogempa: {
    gempa: BmkgGempa[];
  };
}

interface EmscEvent {
  type: string;
  geometry: { type: string; coordinates: [number, number, number] };
  id: string;
  properties: {
    time: string;
    updated: string;
    mag: number;
    magtype: string;
    flynn_region: string;
    lat: number;
    lon: number;
    depth: number;
    evtype: string;
    unid: string;
    auth: string;
    source_id: string;
    source_catalog: string;
    lastupdate: string;
    tsunami: number;
  };
}

export function normalizeBmkg(response: BmkgResponse): UsgsFeature[] {
  const gempaList = response?.Infogempa?.gempa;
  if (!Array.isArray(gempaList)) return [];

  return gempaList.map((g, i) => {
    const coords = g.Coordinates?.split(",") ?? ["0", "0"];
    const lat = Number.parseFloat(coords[0]);
    const lon = Number.parseFloat(coords[1]);
    const depth = Number.parseFloat(g.Kedalaman?.replace(" km", "") ?? "10");
    const mag = Number.parseFloat(g.Magnitude ?? "0");
    const time = new Date(g.DateTime).getTime() || Date.now() - i * 60000;
    const hasTsunami = g.Potensi?.toLowerCase().includes("tsunami") ? 1 : 0;

    return {
      type: "Feature" as const,
      id: `bmkg-${time}-${lat}-${lon}`,
      geometry: { type: "Point" as const, coordinates: [lon, lat, depth] },
      properties: {
        mag,
        place: g.Wilayah ?? "Indonesia",
        time,
        updated: time,
        tz: 420,
        url: "https://bmkg.go.id",
        detail: "",
        felt: null,
        cdi: null,
        mmi: null,
        alert: null,
        status: "reviewed",
        tsunami: hasTsunami,
        sig: Math.round(mag * 100),
        net: "bmkg",
        code: `bmkg-${i}`,
        ids: `bmkg-${i}`,
        sources: "bmkg",
        types: "origin",
        nst: null,
        dmin: null,
        rms: null,
        gap: null,
        magType: "Mw",
        type: "earthquake",
        title: `M ${mag} - ${g.Wilayah}`,
        source: "BMKG",
      } as any,
    } as UsgsFeature;
  });
}

export function normalizeEmsc(data: { features: EmscEvent[] }): UsgsFeature[] {
  if (!Array.isArray(data?.features)) return [];

  return data.features.map((f) => {
    const time = new Date(f.properties.time).getTime();
    return {
      type: "Feature" as const,
      id: f.id ?? `emsc-${time}`,
      geometry: {
        type: "Point" as const,
        coordinates: [f.properties.lon, f.properties.lat, f.properties.depth],
      },
      properties: {
        mag: f.properties.mag,
        place: f.properties.flynn_region ?? "Unknown",
        time,
        updated: new Date(f.properties.lastupdate).getTime(),
        tz: null,
        url: `https://www.emsc-csem.org/Earthquake/earthquake.php?id=${f.properties.source_id}`,
        detail: "",
        felt: null,
        cdi: null,
        mmi: null,
        alert: null,
        status: "reviewed",
        tsunami: f.properties.tsunami ?? 0,
        sig: Math.round(f.properties.mag * 100),
        net: "emsc",
        code: f.properties.source_id,
        ids: f.id,
        sources: "emsc",
        types: "origin",
        nst: null,
        dmin: null,
        rms: null,
        gap: null,
        magType: f.properties.magtype ?? "Mw",
        type: "earthquake",
        title: `M ${f.properties.mag} - ${f.properties.flynn_region}`,
        source: "EMSC",
      } as any,
    } as UsgsFeature;
  });
}

export function deduplicateEarthquakes(events: UsgsFeature[]): UsgsFeature[] {
  const result: UsgsFeature[] = [];

  for (const event of events) {
    const isDuplicate = result.some((existing) => {
      const timeDiff = Math.abs(
        existing.properties.time - event.properties.time,
      );
      if (timeDiff > 90000) return false;

      const [eLon, eLat] = existing.geometry.coordinates;
      const [nLon, nLat] = event.geometry.coordinates;
      const latDiff = Math.abs(eLat - nLat);
      const lonDiff = Math.abs(eLon - nLon);
      const distApprox = Math.sqrt(latDiff ** 2 + lonDiff ** 2) * 111;

      return distApprox < 80;
    });

    if (!isDuplicate) result.push(event);
  }

  return result;
}
