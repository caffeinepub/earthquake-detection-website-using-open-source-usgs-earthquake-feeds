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
}: FeedAndFilterControlsProps) {
  return (
    <Card className="border-border/50">
      <CardContent className="pt-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Time Window */}
          <div className="space-y-2">
            <Label htmlFor="time-window">Time Window</Label>
            <Select value={timeWindow} onValueChange={onTimeWindowChange}>
              <SelectTrigger id="time-window">
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
          <div className="space-y-2">
            <Label htmlFor="min-magnitude">
              Min Magnitude: {minMagnitude.toFixed(1)}
            </Label>
            <div className="pt-2">
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
          <div className="space-y-2">
            <Label htmlFor="search">Search Location</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="search"
                placeholder="e.g., California, Japan..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Refresh */}
          <div className="space-y-2">
            <Label>&nbsp;</Label>
            <Button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="w-full"
              variant="outline"
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              Refresh Data
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
