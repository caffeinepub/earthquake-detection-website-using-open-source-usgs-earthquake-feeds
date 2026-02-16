import { useState } from 'react';
import { Moon, Sun, Table as TableIcon, Map, Columns } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useUsgsEarthquakes } from '../hooks/useUsgsEarthquakes';
import { FeedAndFilterControls } from '../components/earthquake/FeedAndFilterControls';
import { DashboardSummary } from '../components/earthquake/DashboardSummary';
import { EarthquakeResultsTable } from '../components/earthquake/EarthquakeResultsTable';
import { EarthquakeMapView } from '../components/earthquake/EarthquakeMapView';
import { EarthquakeDetailsDialog } from '../components/earthquake/EarthquakeDetailsDialog';
import { TimeWindow, UsgsFeature } from '../lib/usgsTypes';
import { applyFilters } from '../lib/earthquakeFilters';
import { computeStats } from '../lib/earthquakeStats';

type ViewMode = 'table' | 'map' | 'split';

export default function EarthquakeDashboard() {
  const { theme, setTheme } = useTheme();

  // Filter state
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('day');
  const [minMagnitude, setMinMagnitude] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Selected earthquake for details dialog
  const [selectedEarthquake, setSelectedEarthquake] = useState<UsgsFeature | null>(null);

  // Manual refresh state
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [lastManualRefreshAt, setLastManualRefreshAt] = useState<Date | null>(null);

  // Fetch earthquake data
  const { data, isLoading, isError, error, forceRefresh } = useUsgsEarthquakes(timeWindow);

  // Apply filters with time window restriction and sorting
  const filteredEarthquakes = data
    ? applyFilters(data.features, timeWindow, minMagnitude, searchQuery)
    : [];

  // Compute stats
  const stats = computeStats(filteredEarthquakes, 5.0);

  // Manual refresh - force refetch regardless of staleTime
  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await forceRefresh();
      setLastManualRefreshAt(new Date());
    } catch (err) {
      // Error is already handled by React Query
      console.error('Manual refresh failed:', err);
    } finally {
      setIsManualRefreshing(false);
    }
  };

  // Handle earthquake selection from table or map - prevent any state reset
  const handleEarthquakeSelect = (earthquake: UsgsFeature) => {
    // Only update the selected earthquake, do not change any other state
    setSelectedEarthquake(earthquake);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 glass-effect shadow-soft">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-5">
          <div className="grid grid-cols-[1fr_auto] items-start gap-4 sm:gap-6">
            {/* Brand block with logo and text */}
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
                  Real-time earthquake detection powered by USGS
                </p>
              </div>
            </div>
            
            {/* Theme toggle - fixed width to prevent layout shift */}
            <div className="flex-shrink-0 pt-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="hover:bg-accent/50 transition-all duration-200 w-10 h-10"
              >
                {theme === 'dark' ? (
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

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8 sm:space-y-10">
        {/* Title Section */}
        <section className="text-center space-y-3 py-4 sm:py-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight px-4">
            Recent Earthquake Around The World
          </h2>
          <div className="h-1 w-24 mx-auto bg-gradient-to-r from-primary/50 via-primary to-primary/50 rounded-full" />
        </section>

        {/* Filters and Controls */}
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

        {/* Summary Cards */}
        {!isLoading && !isError && (
          <div className="animate-fade-in">
            <DashboardSummary stats={stats} threshold={5.0} />
          </div>
        )}

        {/* View Mode Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-in">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
            {viewMode === 'table' && 'Table View'}
            {viewMode === 'map' && 'Map View'}
            {viewMode === 'split' && 'Split View'}
          </h3>
          <div className="flex gap-2 p-1 bg-muted/50 rounded-lg backdrop-blur-sm">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="gap-2 transition-all duration-200"
            >
              <TableIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('map')}
              className="gap-2 transition-all duration-200"
            >
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Map</span>
            </Button>
            <Button
              variant={viewMode === 'split' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('split')}
              className="gap-2 transition-all duration-200"
            >
              <Columns className="h-4 w-4" />
              <span className="hidden sm:inline">Split</span>
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4 animate-fade-in">
            <Skeleton className="h-[500px] w-full rounded-2xl" />
          </div>
        )}

        {/* Error State */}
        {isError && (
          <Alert variant="destructive" className="animate-fade-in shadow-soft">
            <AlertTitle className="font-semibold">Error Loading Data</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to fetch earthquake data. Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Data Views */}
        {!isLoading && !isError && (
          <div className="animate-fade-in relative z-10">
            {/* Table View */}
            {viewMode === 'table' && (
              <EarthquakeResultsTable
                earthquakes={filteredEarthquakes}
                selectedEarthquake={selectedEarthquake}
                onEarthquakeSelect={handleEarthquakeSelect}
              />
            )}

            {/* Map View */}
            {viewMode === 'map' && (
              <EarthquakeMapView
                earthquakes={filteredEarthquakes}
                onMarkerClick={handleEarthquakeSelect}
              />
            )}

            {/* Split View */}
            {viewMode === 'split' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <EarthquakeMapView
                  earthquakes={filteredEarthquakes}
                  onMarkerClick={handleEarthquakeSelect}
                  constrainedHeight={620}
                />
                <EarthquakeResultsTable
                  earthquakes={filteredEarthquakes}
                  selectedEarthquake={selectedEarthquake}
                  onEarthquakeSelect={handleEarthquakeSelect}
                  constrainedHeight={620}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 glass-effect mt-16">
        <div className="container mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p className="font-medium">
              © {new Date().getFullYear()} WhoFeelAnEarthquake. Powered by USGS.
            </p>
            <p className="font-medium">
              Built with ❤️ using{' '}
              <a
                href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
                  typeof window !== 'undefined' ? window.location.hostname : 'earthquake-app'
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline transition-colors"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* Details Dialog */}
      <EarthquakeDetailsDialog
        earthquake={selectedEarthquake}
        open={!!selectedEarthquake}
        onOpenChange={(open) => {
          if (!open) setSelectedEarthquake(null);
        }}
      />
    </div>
  );
}
