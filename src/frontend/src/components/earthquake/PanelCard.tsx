import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PanelCardProps {
  title: string;
  subtitle?: string;
  headerAction?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
}

/**
 * Shared panel card wrapper for consistent styling across Map and Table views.
 * Provides unified header spacing, optional header actions, and clean borders/radii.
 */
export function PanelCard({
  title,
  subtitle,
  headerAction,
  children,
  className = '',
  contentClassName = '',
  noPadding = false,
}: PanelCardProps) {
  return (
    <Card className={`border-border/40 shadow-soft overflow-hidden ${className}`}>
      <CardHeader className="pb-4 space-y-0 bg-gradient-to-r from-card to-muted/20">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <CardTitle className="text-xl font-bold tracking-tight">
              {title}
            </CardTitle>
            {subtitle && (
              <p className="text-sm text-muted-foreground font-medium">{subtitle}</p>
            )}
          </div>
          {headerAction && (
            <div className="flex-shrink-0">{headerAction}</div>
          )}
        </div>
      </CardHeader>
      <CardContent className={noPadding ? 'p-0' : contentClassName}>
        {children}
      </CardContent>
    </Card>
  );
}
