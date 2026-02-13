import { Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { TimeWindow } from '../../lib/usgsTypes';
import { TIME_WINDOW_OPTIONS } from '../../lib/usgsFeeds';

interface FeedAndFilterControlsProps {
  timeWindow: TimeWindow;
  onTimeWindowChange: (value: TimeWindow) => void;
  minMagnitude: number;
  onMinMagnitudeChange: (value: number) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  lastManualRefreshAt: Date | null;
}

export function FeedAndFilterControls({
  timeWindow,
  onTimeWindowChange,
  minMagnitude,
  onMinMagnitudeChange,
  searchQuery,
  onSearchQueryChange,
  onRefresh,
  isRefreshing,
  lastManualRefreshAt,
}: FeedAndFilterControlsProps) {
  const formatRefreshTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);

    if (diffSecs < 60) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });
    }
  };

  return (
    <Card className="border-border/40 shadow-soft overflow-hidden">
      <CardContent className="pt-6 pb-6">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* Time Window */}
          <div className="space-y-3">
            <Label htmlFor="time-window" className="text-sm font-semibold text-foreground">
              Time Window
            </Label>
            <Select value={timeWindow} onValueChange={onTimeWindowChange}>
              <SelectTrigger 
                id="time-window" 
                className="h-11 border-border/60 hover:border-primary/50 transition-colors"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_WINDOW_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Minimum Magnitude */}
          <div className="space-y-3">
            <Label htmlFor="min-magnitude" className="text-sm font-semibold text-foreground">
              Min Magnitude: <span className="text-primary font-mono">{minMagnitude.toFixed(1)}</span>
            </Label>
            <div className="pt-3">
              <Slider
                id="min-magnitude"
                min={0}
                max={9}
                step={0.1}
                value={[minMagnitude]}
                onValueChange={(values) => onMinMagnitudeChange(values[0])}
                className="w-full"
              />
            </div>
          </div>

          {/* Search */}
          <div className="space-y-3">
            <Label htmlFor="search" className="text-sm font-semibold text-foreground">
              Search Location
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                id="search"
                placeholder="e.g., California, Japan..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="pl-10 h-11 border-border/60 hover:border-primary/50 focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Refresh */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-foreground">
              {lastManualRefreshAt ? (
                <span className="text-muted-foreground font-normal">
                  Last refreshed: {formatRefreshTime(lastManualRefreshAt)}
                </span>
              ) : (
                <span className="opacity-0 pointer-events-none">Actions</span>
              )}
            </Label>
            <Button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="w-full h-11 gap-2 font-semibold shadow-soft hover:shadow-medium transition-all duration-200"
              variant="default"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
