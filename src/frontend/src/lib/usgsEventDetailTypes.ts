/**
 * TypeScript types for USGS event detail JSON response.
 * Defines the minimal subset needed to locate and display moment tensor product information.
 */

export interface UsgsEventDetailProduct {
  id: string;
  type: string;
  code: string;
  source: string;
  updateTime: number;
  status: string;
  properties: Record<string, string>;
  preferredWeight?: number;
  contents?: Record<string, {
    contentType: string;
    lastModified: number;
    length: number;
    url: string;
  }>;
}

export interface UsgsEventDetail {
  type: 'Feature';
  properties: {
    mag: number | null;
    place: string;
    time: number;
    updated: number;
    url: string;
    detail: string;
    status: string;
    tsunami: number;
    title: string;
    products?: {
      'moment-tensor'?: UsgsEventDetailProduct[];
      [key: string]: UsgsEventDetailProduct[] | undefined;
    };
  };
  geometry: {
    type: 'Point';
    coordinates: [number, number, number];
  };
  id: string;
}
