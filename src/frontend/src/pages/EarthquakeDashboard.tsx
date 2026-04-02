import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Columns,
  Map as MapIcon,
  Moon,
  Sun,
  Table as TableIcon,
  Waves,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRef, useState } from "react";
import { LoadingScreen } from "../components/LoadingScreen";
import { DashboardSummary } from "../components/earthquake/DashboardSummary";
import { EarthquakeDetailsDialog } from "../components/earthquake/EarthquakeDetailsDialog";
import { EarthquakeMapView } from "../components/earthquake/EarthquakeMapView";
import { EarthquakeResultsTable } from "../components/earthquake/EarthquakeResultsTable";
import { EewView } from "../components/earthquake/EewView";
import { FeedAndFilterControls } from "../components/earthquake/FeedAndFilterControls";
import { ShakeMapView } from "../components/earthquake/ShakeMapView";
import { TsunamiAlertBanner } from "../components/earthquake/TsunamiAlertBanner";
import { TsunamiView } from "../components/earthquake/TsunamiView";
import { useUsgsEarthquakes } from "../hooks/useUsgsEarthquakes";
import { applyFilters } from "../lib/earthquakeFilters";
import { computeStats } from "../lib/earthquakeStats";
import type { TimeWindow, UsgsFeature } from "../lib/usgsTypes";

type ViewMode = "table" | "map" | "split" | "tsunami" | "eew" | "shakemap";

export default function EarthquakeDashboard() {
  const { theme, setTheme } = useTheme();

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

  const { data, isLoading, isError, error, forceRefresh } =
    useUsgsEarthquakes(timeWindow);

  const filteredEarthquakes = data
    ? applyFilters(data.features, timeWindow, minMagnitude, searchQuery)
    : [];

  const tsunamiEvents = filteredEarthquakes.filter(
    (eq) => eq.properties.tsunami === 1,
  );

  if (tsunamiEvents.length > prevTsunamiCountRef.current) {
    setTsunamiBannerDismissed(false);
  }
  prevTsunamiCountRef.current = tsunamiEvents.length;

  const eewAlertCount = filteredEarthquakes.filter(
    (eq) =>
      (eq.properties.mag ?? 0) >= 5 &&
      Date.now() - eq.properties.time < 3600000,
  ).length;

  const stats = computeStats(filteredEarthquakes, 5.0);

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
    table: "Table View",
    map: "Map View",
    split: "Split View",
    tsunami: "Tsunami Warnings",
    eew: "EEW Monitor",
    shakemap: "ShakeMap Viewer",
  };

  return (
    <>
      {isLoading && <LoadingScreen />}

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
                    Real-time Earthquake Detection
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0 pt-1">
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
              Recent Earthquake Around The World
            </h2>
            <div className="h-1 w-24 mx-auto bg-gradient-to-r from-primary/50 via-primary to-primary/50 rounded-full" />
            <p className="text-base sm:text-lg text-muted-foreground font-medium max-w-2xl mx-auto">
              Latest real-time earthquake information around the world
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

          {/* Tsunami Alert Banner */}
          {!isLoading && !isError && (
            <div className="animate-fade-in relative z-20">
              <TsunamiAlertBanner
                tsunamiEvents={tsunamiEvents}
                dismissed={tsunamiBannerDismissed}
                onDismiss={() => setTsunamiBannerDismissed(true)}
              />
            </div>
          )}

          {/* Summary Cards */}
          {!isLoading && !isError && (
            <div className="animate-fade-in">
              <DashboardSummary
                stats={stats}
                threshold={5.0}
                tsunamiCount={tsunamiEvents.length}
              />
            </div>
          )}

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
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="gap-2 transition-all duration-200"
                data-ocid="view.tab"
              >
                <TableIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Table</span>
              </Button>
              <Button
                variant={viewMode === "map" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("map")}
                className="gap-2 transition-all duration-200"
                data-ocid="view.tab"
              >
                <MapIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Map</span>
              </Button>
              <Button
                variant={viewMode === "split" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("split")}
                className="gap-2 transition-all duration-200"
                data-ocid="view.tab"
              >
                <Columns className="h-4 w-4" />
                <span className="hidden sm:inline">Split</span>
              </Button>
              <Button
                variant={viewMode === "tsunami" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("tsunami")}
                className={`gap-2 transition-all duration-200 relative ${
                  viewMode !== "tsunami" && tsunamiEvents.length > 0
                    ? "text-red-400 hover:text-red-300 border border-red-500/40 hover:border-red-500/70"
                    : ""
                }`}
                data-ocid="tsunami.tab"
              >
                <Waves className="h-4 w-4" />
                <span className="hidden sm:inline">Tsunami</span>
                {tsunamiEvents.length > 0 && viewMode !== "tsunami" && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse">
                    {tsunamiEvents.length}
                  </span>
                )}
              </Button>
              <Button
                variant={viewMode === "eew" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("eew")}
                className={`gap-2 transition-all duration-200 relative ${
                  viewMode !== "eew"
                    ? "text-orange-400 hover:text-orange-300 border border-orange-500/40 hover:border-orange-500/70"
                    : ""
                }`}
                data-ocid="eew.tab"
              >
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">EEW</span>
                {eewAlertCount > 0 && viewMode !== "eew" && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white animate-pulse">
                    {eewAlertCount}
                  </span>
                )}
              </Button>
              <Button
                variant={viewMode === "shakemap" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("shakemap")}
                className="gap-2 transition-all duration-200"
                data-ocid="shakemap.tab"
              >
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">ShakeMap</span>
              </Button>
            </div>
          </div>

          {/* Error State */}
          {isError && (
            <Alert
              variant="destructive"
              className="animate-fade-in"
              data-ocid="data.error_state"
            >
              <AlertTitle>Error Loading Data</AlertTitle>
              <AlertDescription>
                {error instanceof Error
                  ? error.message
                  : "Failed to fetch earthquake data. Please try again."}
              </AlertDescription>
            </Alert>
          )}

          {/* Data Views */}
          {!isLoading && !isError && (
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

              {viewMode === "shakemap" && (
                <ShakeMapView earthquakes={filteredEarthquakes} />
              )}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-border/40 glass-effect mt-16">
          <div className="container mx-auto px-4 sm:px-6 py-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground text-center sm:text-left">
                &copy; {new Date().getFullYear()} WhoFeelAnEarthquake. Powered
                by USGS.
              </p>
              <p className="text-sm text-muted-foreground text-center sm:text-right">
                Built with ❤️ using{" "}
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
