import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Columns,
  Map as MapIcon,
  MapPin,
  MapPinOff,
  Moon,
  RefreshCw,
  Sun,
  Table as TableIcon,
  Waves,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { LanguageToggle } from "../components/LanguageToggle";
import { LoadingScreen } from "../components/LoadingScreen";
import { DashboardSummary } from "../components/earthquake/DashboardSummary";
import { EarthquakeDetailsDialog } from "../components/earthquake/EarthquakeDetailsDialog";
import { EarthquakeMapView } from "../components/earthquake/EarthquakeMapView";
import { EarthquakeResultsTable } from "../components/earthquake/EarthquakeResultsTable";
import { EewView } from "../components/earthquake/EewView";
import { FeedAndFilterControls } from "../components/earthquake/FeedAndFilterControls";
import { TsunamiAlertBanner } from "../components/earthquake/TsunamiAlertBanner";
import { TsunamiView } from "../components/earthquake/TsunamiView";
import { useLanguage } from "../contexts/LanguageContext";
import { useUserLocation } from "../hooks/useUserLocation";
import { useUsgsEarthquakes } from "../hooks/useUsgsEarthquakes";
import { applyFilters } from "../lib/earthquakeFilters";
import { computeStats } from "../lib/earthquakeStats";
import {
  distanceKm,
  notifyNearbyEarthquakes,
  requestNotificationPermission,
  resetNotificationCache,
} from "../lib/notificationService";
import type { TimeWindow, UsgsFeature } from "../lib/usgsTypes";

type ViewMode = "table" | "map" | "split" | "tsunami" | "eew";

export default function EarthquakeDashboard() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();

  const [timeWindow, setTimeWindow] = useState<TimeWindow>("day");
  const [minMagnitude, setMinMagnitude] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [selectedEarthquake, setSelectedEarthquake] =
    useState<UsgsFeature | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [lastManualRefreshAt, setLastManualRefreshAt] = useState<Date | null>(
    null,
  );
  const [tsunamiBannerDismissed, setTsunamiBannerDismissed] = useState(false);
  const prevTsunamiCountRef = useRef(0);
  const prevEqIdsRef = useRef<Set<string>>(new Set());

  const {
    location: userLocation,
    status: locationStatus,
    requestLocation,
    clearLocation,
  } = useUserLocation();

  const { data, isLoading, isError, error, forceRefresh, refetch } =
    useUsgsEarthquakes(timeWindow);

  const features = data?.features ?? [];
  const filteredEarthquakes = applyFilters(
    features,
    timeWindow,
    minMagnitude,
    searchQuery,
  );

  const tsunamiEvents = filteredEarthquakes.filter(
    (eq) => eq.properties.tsunami === 1,
  );

  // Fix: move tsunami banner reset into a useEffect to avoid side effects in render
  useEffect(() => {
    if (tsunamiEvents.length > prevTsunamiCountRef.current) {
      setTsunamiBannerDismissed(false);
    }
    prevTsunamiCountRef.current = tsunamiEvents.length;
  }, [tsunamiEvents.length]);

  const eewAlertCount = filteredEarthquakes.filter(
    (eq) =>
      (eq.properties.mag ?? 0) >= 5 &&
      Date.now() - eq.properties.time < 3600000,
  ).length;

  const stats = computeStats(filteredEarthquakes, 5.0);

  useEffect(() => {
    if (userLocation) {
      resetNotificationCache();
    }
  }, [userLocation]);

  useEffect(() => {
    if (!userLocation || !data) return;

    const currentIds = new Set(data.features.map((f) => f.id));

    if (prevEqIdsRef.current.size === 0) {
      prevEqIdsRef.current = currentIds;
      return;
    }

    const newEqs = data.features.filter((f) => !prevEqIdsRef.current.has(f.id));
    prevEqIdsRef.current = currentIds;

    if (newEqs.length === 0) return;

    const eqsForNotify = newEqs.map((f) => ({
      id: f.id,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      mag: f.properties.mag,
      place: f.properties.place || "Unknown location",
      time: f.properties.time,
    }));

    notifyNearbyEarthquakes(
      eqsForNotify,
      userLocation.lat,
      userLocation.lng,
      1000,
      { nearbyQuake: t.nearbyQuake, nearbyQuakeBody: t.nearbyQuakeBody },
    );
  }, [data, userLocation, t]);

  useEffect(() => {
    if (locationStatus === "granted") {
      requestNotificationPermission();
    }
  }, [locationStatus]);

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await forceRefresh();
      setLastManualRefreshAt(new Date());
    } catch (err) {
      console.error("Manual refresh failed:", err);
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const handleEarthquakeSelect = (earthquake: UsgsFeature) => {
    setSelectedEarthquake(earthquake);
  };

  const shouldAutoFitBounds = timeWindow === "hour";

  const viewTitle: Record<ViewMode, string> = {
    table: t.tableView,
    map: t.mapView,
    split: t.splitView,
    tsunami: t.tsunamiWarnings,
    eew: t.eewMonitor,
  };

  // Show skeleton loading overlay only while initially loading with no data yet
  const showLoading = isLoading && features.length === 0;

  return (
    <>
      {showLoading && <LoadingScreen />}

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border/40 glass-effect shadow-soft">
          <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-5">
            <div className="grid grid-cols-[1fr_auto] items-start gap-4 sm:gap-6">
              <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                <div className="relative flex-shrink-0 mt-1">
                  <img
                    src="/assets/generated/eq-logo.dim_512x512.png"
                    alt="WhoFeelAnEarthquake"
                    className="h-10 w-10 sm:h-12 sm:w-12 drop-shadow-md"
                  />
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full -z-10" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight leading-tight break-words">
                    WhoFeelAnEarthquake
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed mt-1 break-words">
                    {t.appSubtitle}
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0 pt-1 flex items-center gap-1">
                {/* Location button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={
                    locationStatus === "granted"
                      ? clearLocation
                      : requestLocation
                  }
                  className="hover:bg-accent/50 transition-all duration-200 w-10 h-10"
                  title={
                    locationStatus === "granted"
                      ? t.clearLocation
                      : t.enableMyLocation
                  }
                  data-ocid="location.toggle"
                >
                  {locationStatus === "granted" ? (
                    <MapPinOff className="h-5 w-5 text-blue-400" />
                  ) : locationStatus === "requesting" ? (
                    <MapPin className="h-5 w-5 text-muted-foreground animate-pulse" />
                  ) : (
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="sr-only">
                    {locationStatus === "granted"
                      ? t.clearLocation
                      : t.enableMyLocation}
                  </span>
                </Button>

                {/* Language toggle */}
                <LanguageToggle />

                {/* Theme toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="hover:bg-accent/50 transition-all duration-200 w-10 h-10"
                  data-ocid="theme.toggle"
                >
                  {theme === "dark" ? (
                    <Sun className="h-5 w-5 text-warning" />
                  ) : (
                    <Moon className="h-5 w-5 text-primary" />
                  )}
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 sm:space-y-10">
          {/* Title Section */}
          <section className="text-center space-y-4 py-4 sm:py-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight px-4">
              {t.heroTitle}
            </h2>
            <div className="h-1 w-24 mx-auto bg-gradient-to-r from-primary/50 via-primary to-primary/50 rounded-full" />
            <p className="text-base sm:text-lg text-muted-foreground font-medium max-w-2xl mx-auto">
              {t.heroSubtitle}
            </p>
          </section>

          {/* Filters */}
          <div className="animate-fade-in relative z-30">
            <FeedAndFilterControls
              timeWindow={timeWindow}
              minMagnitude={minMagnitude}
              searchQuery={searchQuery}
              onTimeWindowChange={setTimeWindow}
              onMinMagnitudeChange={setMinMagnitude}
              onSearchQueryChange={setSearchQuery}
              onRefresh={handleRefresh}
              isRefreshing={isManualRefreshing}
              lastManualRefreshAt={lastManualRefreshAt}
            />
          </div>

          {/* Error State — shown as a banner, NOT blank screen */}
          {isError && (
            <Alert
              variant="destructive"
              className="animate-fade-in"
              data-ocid="data.error_state"
            >
              <AlertTitle>{t.errorLoadingData}</AlertTitle>
              <AlertDescription className="flex items-center gap-3 flex-wrap">
                <span>
                  {error instanceof Error ? error.message : t.errorFetchFailed}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => refetch()}
                  className="gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Tsunami Alert Banner — always render when data available */}
          {features.length > 0 && (
            <div className="animate-fade-in relative z-20">
              <TsunamiAlertBanner
                tsunamiEvents={tsunamiEvents}
                dismissed={tsunamiBannerDismissed}
                onDismiss={() => setTsunamiBannerDismissed(true)}
              />
            </div>
          )}

          {/* Summary Cards — show when data available */}
          {features.length > 0 && (
            <div className="animate-fade-in">
              <DashboardSummary
                stats={stats}
                threshold={5.0}
                tsunamiCount={tsunamiEvents.length}
              />
            </div>
          )}

          {/* Nearest earthquakes strip when location is known */}
          {features.length > 0 &&
            userLocation &&
            (() => {
              const sorted = [...filteredEarthquakes]
                .map((eq) => ({
                  eq,
                  dist: distanceKm(
                    userLocation.lat,
                    userLocation.lng,
                    eq.geometry.coordinates[1],
                    eq.geometry.coordinates[0],
                  ),
                }))
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 3);

              return (
                <div className="animate-fade-in" data-ocid="nearby.panel">
                  <div className="border border-blue-500/30 rounded-lg p-4 bg-blue-500/5">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-semibold text-blue-400">
                        {t.nearbyEarthquakes}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {sorted.map(({ eq, dist }, idx) => (
                        <button
                          key={eq.id}
                          type="button"
                          onClick={() => handleEarthquakeSelect(eq)}
                          className="text-left p-3 rounded-md bg-background/50 hover:bg-background/80 transition-colors border border-border/30"
                          data-ocid={`nearby.item.${idx + 1}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-sm">
                              M{eq.properties.mag?.toFixed(1) ?? "?"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(dist).toLocaleString()} km
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {eq.properties.place}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

          {/* View Mode Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-in">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
              {viewTitle[viewMode]}
              {viewMode === "tsunami" && tsunamiEvents.length > 0 && (
                <span className="ml-3 inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                  {tsunamiEvents.length}
                </span>
              )}
            </h3>
            <div className="flex flex-wrap gap-2 p-1 bg-muted/50 rounded-lg backdrop-blur-sm">
              {/* Table button */}
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className={`gap-2 transition-all duration-200${
                  viewMode !== "table"
                    ? " text-foreground/80 hover:text-foreground"
                    : ""
                }`}
                data-ocid="view.tab"
              >
                <TableIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.tableView}</span>
              </Button>

              {/* Map button */}
              <Button
                variant={viewMode === "map" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("map")}
                className={`gap-2 transition-all duration-200${
                  viewMode !== "map"
                    ? " text-foreground/80 hover:text-foreground"
                    : ""
                }`}
                data-ocid="view.tab"
              >
                <MapIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.mapView}</span>
              </Button>

              {/* Split button */}
              <Button
                variant={viewMode === "split" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("split")}
                className={`gap-2 transition-all duration-200${
                  viewMode !== "split"
                    ? " text-foreground/80 hover:text-foreground"
                    : ""
                }`}
                data-ocid="view.tab"
              >
                <Columns className="h-4 w-4" />
                <span className="hidden sm:inline">{t.splitView}</span>
              </Button>

              {/* Tsunami button */}
              <Button
                variant={viewMode === "tsunami" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("tsunami")}
                className={`gap-2 transition-all duration-200 relative${
                  viewMode !== "tsunami"
                    ? tsunamiEvents.length > 0
                      ? " text-red-400 hover:text-red-300 border border-red-500/40 hover:border-red-500/70"
                      : " text-foreground/80 hover:text-foreground"
                    : ""
                }`}
                data-ocid="tsunami.tab"
              >
                <Waves className="h-4 w-4" />
                <span className="hidden sm:inline">{t.tsunamiWarnings}</span>
                {tsunamiEvents.length > 0 && viewMode !== "tsunami" && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse">
                    {tsunamiEvents.length}
                  </span>
                )}
              </Button>

              {/* EEW button */}
              <Button
                variant={viewMode === "eew" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("eew")}
                className={`gap-2 transition-all duration-200 relative${
                  viewMode !== "eew"
                    ? " text-orange-400 hover:text-orange-300 border border-orange-500/40 hover:border-orange-500/70"
                    : ""
                }`}
                data-ocid="eew.tab"
              >
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">{t.eewMonitor}</span>
                {eewAlertCount > 0 && viewMode !== "eew" && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white animate-pulse">
                    {eewAlertCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Data Views — always rendered regardless of loading state */}
          <div className="animate-fade-in relative z-10">
            {viewMode === "table" && (
              <EarthquakeResultsTable
                earthquakes={filteredEarthquakes}
                selectedEarthquake={selectedEarthquake}
                onEarthquakeSelect={handleEarthquakeSelect}
              />
            )}

            {viewMode === "map" && (
              <EarthquakeMapView
                earthquakes={filteredEarthquakes}
                onMarkerClick={handleEarthquakeSelect}
                autoFitBounds={shouldAutoFitBounds}
                userLocation={userLocation}
              />
            )}

            {viewMode === "split" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <EarthquakeResultsTable
                  earthquakes={filteredEarthquakes}
                  selectedEarthquake={selectedEarthquake}
                  onEarthquakeSelect={handleEarthquakeSelect}
                  constrainedHeight={600}
                />
                <EarthquakeMapView
                  earthquakes={filteredEarthquakes}
                  onMarkerClick={handleEarthquakeSelect}
                  constrainedHeight={600}
                  autoFitBounds={shouldAutoFitBounds}
                  userLocation={userLocation}
                />
              </div>
            )}

            {viewMode === "tsunami" && (
              <TsunamiView
                tsunamiEvents={tsunamiEvents}
                onEventSelect={handleEarthquakeSelect}
              />
            )}

            {viewMode === "eew" && (
              <EewView earthquakes={filteredEarthquakes} />
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/40 glass-effect mt-16">
          <div className="container mx-auto px-4 sm:px-6 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground text-center sm:text-left">
                &copy; {new Date().getFullYear()} WhoFeelAnEarthquake.{" "}
                {t.poweredBy}
              </p>
              <p className="text-sm text-muted-foreground text-center sm:text-right">
                {t.builtWith}{" "}
                <a
                  href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                    typeof window !== "undefined"
                      ? window.location.hostname
                      : "whofeelanearthquake",
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  caffeine.ai
                </a>
              </p>
            </div>
          </div>
        </footer>

        {/* Earthquake Details Dialog */}
        <EarthquakeDetailsDialog
          earthquake={selectedEarthquake}
          open={!!selectedEarthquake}
          onOpenChange={(open) => {
            if (!open) setSelectedEarthquake(null);
          }}
        />
      </div>
    </>
  );
}
