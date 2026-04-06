import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Clock, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLanguage } from "../../contexts/LanguageContext";
import { formatMagnitude, formatTimestamp } from "../../lib/formatters";
import type { UsgsFeature } from "../../lib/usgsTypes";

interface TsunamiAlertBannerProps {
  tsunamiEvents: UsgsFeature[];
  dismissed: boolean;
  onDismiss: () => void;
}

export function TsunamiAlertBanner({
  tsunamiEvents,
  dismissed,
  onDismiss,
}: TsunamiAlertBannerProps) {
  const topEvents = tsunamiEvents.slice(0, 3);

  return (
    <AnimatePresence>
      {tsunamiEvents.length > 0 && !dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative overflow-hidden rounded-xl border-2 border-red-500/60 bg-gradient-to-r from-red-950/80 via-orange-950/70 to-red-950/80 shadow-[0_0_32px_oklch(0.55_0.22_25/0.4)] backdrop-blur-sm"
          data-ocid="tsunami.panel"
        >
          {/* Animated shimmer overlay */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
            <div className="animate-tsunami-shimmer absolute -inset-full h-full w-[200%] bg-gradient-to-r from-transparent via-red-500/10 to-transparent" />
          </div>

          <div className="relative p-4 sm:p-5">
            <div className="flex items-start gap-4">
              {/* Pulsing warning icon */}
              <div className="relative flex-shrink-0 mt-0.5">
                <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                <div className="relative p-2 rounded-full bg-red-500/20 border border-red-500/50">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {/* Title row */}
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-base sm:text-lg font-bold text-red-300 tracking-wide uppercase">
                    Tsunami Warning Active
                  </h3>
                  <Badge
                    variant="destructive"
                    className="text-xs font-bold animate-pulse bg-red-600 border-red-500"
                  >
                    {tsunamiEvents.length}{" "}
                    {tsunamiEvents.length === 1 ? "event" : "events"}
                  </Badge>
                </div>

                <p className="text-sm text-red-200/80 mb-3">
                  Tsunami warnings have been issued for the following
                  earthquakes. Check official sources for evacuation orders.
                </p>

                {/* Top events list */}
                <div className="space-y-2">
                  {topEvents.map((eq, idx) => (
                    <div
                      key={eq.id}
                      className="flex flex-wrap items-center gap-2 text-sm"
                      data-ocid={`tsunami.item.${idx + 1}`}
                    >
                      <Badge
                        variant="outline"
                        className="font-mono text-xs font-bold text-orange-300 border-orange-500/50 bg-orange-950/50"
                      >
                        M{formatMagnitude(eq.properties.mag)}
                      </Badge>
                      <span className="text-red-100/90 truncate max-w-[280px] font-medium">
                        {eq.properties.place}
                      </span>
                      <span className="flex items-center gap-1 text-red-300/70 text-xs whitespace-nowrap">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(eq.properties.time)}
                      </span>
                    </div>
                  ))}
                  {tsunamiEvents.length > 3 && (
                    <p className="text-xs text-red-300/60 mt-1">
                      +{tsunamiEvents.length - 3} more tsunami-flagged events
                    </p>
                  )}
                </div>
              </div>

              {/* Dismiss button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onDismiss}
                className="flex-shrink-0 text-red-300/70 hover:text-red-200 hover:bg-red-500/20 h-8 w-8"
                data-ocid="tsunami.close_button"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Dismiss tsunami warning</span>
              </Button>
            </div>
          </div>
        </motion.div>
      )}
      {tsunamiEvents.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="hidden"
        />
      )}
    </AnimatePresence>
  );
}

export function TsunamiSafeState() {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 gap-4"
      data-ocid="tsunami.empty_state"
    >
      <div className="p-5 rounded-full bg-green-500/10 border border-green-500/30">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-green-400">
          {t.tsunamiSafeTitle}
        </h3>
        <p className="text-muted-foreground max-w-sm">{t.tsunamiSafeDesc}</p>
      </div>
    </motion.div>
  );
}
