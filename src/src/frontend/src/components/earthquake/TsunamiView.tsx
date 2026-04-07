import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
} from "lucide-react";
import { motion } from "motion/react";
import { useLanguage } from "../../contexts/LanguageContext";
import { formatMagnitude, formatTimestamp } from "../../lib/formatters";
import { getMagnitudeColor } from "../../lib/usgsFeeds";
import type { UsgsFeature } from "../../lib/usgsTypes";
import { TsunamiSafeState } from "./TsunamiAlertBanner";

interface TsunamiViewProps {
  tsunamiEvents: UsgsFeature[];
  onEventSelect?: (eq: UsgsFeature) => void;
}

export function TsunamiView({
  tsunamiEvents,
  onEventSelect,
}: TsunamiViewProps) {
  const { t } = useLanguage();

  if (tsunamiEvents.length === 0) {
    return (
      <div className="rounded-xl border border-border/40 bg-card shadow-soft">
        <div className="border-b border-border/30 px-5 py-4 flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-red-500/10">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-base">{t.tsunamiWarningEvents}</h3>
            <p className="text-xs text-muted-foreground">{t.tsunamiNoActive}</p>
          </div>
        </div>
        <TsunamiSafeState />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-red-500/30 bg-card shadow-soft overflow-hidden">
      {/* Header */}
      <div className="border-b border-red-500/20 px-5 py-4 bg-gradient-to-r from-red-950/30 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
            <div className="relative p-1.5 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-base text-red-300">
              {t.tsunamiWarningEvents}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t.tsunamiActiveWarnings(tsunamiEvents.length)}
            </p>
          </div>
        </div>
        <Badge
          variant="destructive"
          className="font-bold text-sm px-3 py-1 animate-pulse bg-red-600"
          data-ocid="tsunami.panel"
        >
          {tsunamiEvents.length} WARNING{tsunamiEvents.length !== 1 ? "S" : ""}
        </Badge>
      </div>

      {/* Cards grid */}
      <div className="p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tsunamiEvents.map((eq, idx) => {
            const magColor = getMagnitudeColor(eq.properties.mag);
            const depth = eq.geometry.coordinates[2];

            return (
              <motion.div
                key={eq.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                data-ocid={`tsunami.item.${idx + 1}`}
              >
                <Card
                  className="border-red-500/30 bg-gradient-to-br from-red-950/20 to-card hover:from-red-950/40 transition-all duration-200 cursor-pointer group shadow-soft hover:shadow-medium overflow-hidden"
                  onClick={() => onEventSelect?.(eq)}
                >
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={`${magColor} font-mono text-sm font-bold px-2.5 py-1 shadow-sm`}
                      >
                        M{formatMagnitude(eq.properties.mag)}
                      </Badge>
                      <Badge
                        variant="destructive"
                        className="text-xs font-bold bg-red-600/80 border-red-500/60 group-hover:bg-red-600 transition-colors"
                      >
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        TSUNAMI
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    {/* Location */}
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span className="text-sm font-semibold leading-snug">
                        {eq.properties.place}
                      </span>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Navigation className="h-3 w-3" />
                        {t.tsunamiDepthLabel(depth?.toFixed(1) ?? "N/A")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(eq.properties.time)}
                      </span>
                    </div>

                    {/* USGS link */}
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      onClick={(e) => e.stopPropagation()}
                      className="w-full h-8 text-xs border border-border/40 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-300 transition-colors"
                      data-ocid={`tsunami.secondary_button.${idx + 1}`}
                    >
                      <a
                        href={eq.properties.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3 mr-1.5" />
                        {t.tsunamiViewUsgs}
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
