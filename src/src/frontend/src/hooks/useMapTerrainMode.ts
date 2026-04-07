import { useEffect, useState } from "react";

export type TerrainMode = "light" | "dark";

const STORAGE_KEY = "earthquake-map-terrain-mode";
const DEFAULT_MODE: TerrainMode = "light";

function getStoredMode(): TerrainMode {
  if (typeof window === "undefined" || !window.localStorage) {
    return DEFAULT_MODE;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch (error) {
    console.warn("Failed to read terrain mode from localStorage:", error);
  }

  return DEFAULT_MODE;
}

function setStoredMode(mode: TerrainMode): void {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch (error) {
    console.warn("Failed to save terrain mode to localStorage:", error);
  }
}

export function useMapTerrainMode() {
  const [terrainMode, setTerrainModeState] =
    useState<TerrainMode>(getStoredMode);

  const setTerrainMode = (mode: TerrainMode) => {
    setTerrainModeState(mode);
    setStoredMode(mode);
  };

  const toggleTerrainMode = () => {
    const newMode: TerrainMode = terrainMode === "light" ? "dark" : "light";
    setTerrainMode(newMode);
  };

  return {
    terrainMode,
    setTerrainMode,
    toggleTerrainMode,
  };
}
