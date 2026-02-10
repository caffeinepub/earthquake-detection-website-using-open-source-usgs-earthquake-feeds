import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, Moon, Sun, Table as TableIcon, Map, Columns } from 'lucide-react';
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
  const queryClient = useQueryClient();

  // Filter state
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('day');
  const [minMagnitude, setMinMagnitude] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Selected earthquake for details dialog
  const [selectedEarthquake, setSelectedEarthquake] = useState<UsgsFeature | null>(null);

  // Fetch earthquake data
  const { data, isLoading, isError, error, isFetching } = useUsgsEarthquakes(timeWindow);

  // Apply filters with time window restriction and sorting
  const filteredEarthquakes = data
    ? applyFilters(data.features, timeWindow, minMagnitude, searchQuery)
    : [];

  // Compute stats
  const stats = computeStats(filteredEarthquakes, 5.0);

  // Manual refresh
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['earthquakes', timeWindow] });
  };

  // Handle earthquake selection from table or map
  const handleEarthquakeSelect = (earthquake: UsgsFeature) => {
    setSelectedEarthquake(earthquake);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src="/assets/generated/eq-logo.dim_512x512.png"
                alt="WhoFeelAnEarthquake"
                className="h-10 w-10"
              />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  WhoFeelAnEarthquake
                </h1>
                <p className="text-sm text-muted-foreground">
                  Real-time earthquake detection powered by USGS
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-border/50 bg-gradient-to-b from-card/50 to-background">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="flex flex-col items-center justify-center gap-3">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-center tracking-tight">
              Real - Time Earthquake Detection Around The World
            </h2>
            <h2 className="text-lg md:text-xl lg:text-2xl text-center text-muted-foreground">
              Latest real-time earthquake information around the world
            </h2>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Controls */}
        <FeedAndFilterControls
          timeWindow={timeWindow}
          onTimeWindowChange={setTimeWindow}
          minMagnitude={minMagnitude}
          onMinMagnitudeChange={setMinMagnitude}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onRefresh={handleRefresh}
          isRefreshing={isFetching}
        />

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-96" />
          </div>
        )}

        {/* Error State */}
        {isError && (
          <Alert variant="destructive">
            <Activity className="h-4 w-4" />
            <AlertTitle>Error Loading Data</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to fetch earthquake data'}
            </AlertDescription>
          </Alert>
        )}

        {/* Data Display */}
        {data && (
          <>
            {/* Summary Cards */}
            <DashboardSummary stats={stats} threshold={5.0} />

            {/* View Mode Toggle */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <TableIcon className="h-4 w-4 mr-2" />
                Table
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('map')}
              >
                <Map className="h-4 w-4 mr-2" />
                Map
              </Button>
              <Button
                variant={viewMode === 'split' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('split')}
              >
                <Columns className="h-4 w-4 mr-2" />
                Split
              </Button>
            </div>

            {/* Results Display */}
            {viewMode === 'table' && (
              <EarthquakeResultsTable
                earthquakes={filteredEarthquakes}
                selectedEarthquake={selectedEarthquake}
                onEarthquakeSelect={handleEarthquakeSelect}
              />
            )}

            {viewMode === 'map' && (
              <EarthquakeMapView
                earthquakes={filteredEarthquakes}
                onMarkerClick={handleEarthquakeSelect}
              />
            )}

            {viewMode === 'split' && (
              <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 min-h-0">
                {/* Map Panel */}
                <div className="flex flex-col min-h-0 h-[400px] sm:h-[500px] lg:h-[600px] xl:h-[700px]">
                  <EarthquakeMapView
                    earthquakes={filteredEarthquakes}
                    onMarkerClick={handleEarthquakeSelect}
                    fillHeight={true}
                  />
                </div>
                {/* Table Panel */}
                <div className="flex flex-col min-h-0 min-w-0 h-[400px] sm:h-[500px] lg:h-[600px] xl:h-[700px]">
                  <EarthquakeResultsTable
                    earthquakes={filteredEarthquakes}
                    selectedEarthquake={selectedEarthquake}
                    onEarthquakeSelect={handleEarthquakeSelect}
                    fillHeight={true}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>
              Data provided by{' '}
              <a
                href="https://earthquake.usgs.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                USGS Earthquake Hazards Program
              </a>
            </p>
            <p>
              © {new Date().getFullYear()}. Built with love using{' '}
              <a
                href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
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
        onOpenChange={(open) => !open && setSelectedEarthquake(null)}
      />
    </div>
  );
}
