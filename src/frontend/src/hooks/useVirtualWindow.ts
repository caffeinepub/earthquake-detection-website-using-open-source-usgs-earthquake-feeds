import { useState, useEffect, useCallback, useRef } from 'react';

interface UseVirtualWindowOptions {
  itemCount: number;
  estimatedItemHeight: number;
  overscan?: number;
}

interface VirtualWindow {
  startIndex: number;
  endIndex: number;
  offsetTop: number;
  offsetBottom: number;
  totalHeight: number;
}

/**
 * Lightweight virtualization hook that computes the visible window of items
 * based on scroll position and container height.
 */
export function useVirtualWindow({
  itemCount,
  estimatedItemHeight,
  overscan = 5,
}: UseVirtualWindowOptions): {
  virtualWindow: VirtualWindow;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
} {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  // Update container height on mount and resize
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Calculate visible window
  const totalHeight = itemCount * estimatedItemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / estimatedItemHeight) - overscan);
  const endIndex = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + containerHeight) / estimatedItemHeight) + overscan
  );
  const offsetTop = startIndex * estimatedItemHeight;
  const offsetBottom = totalHeight - (endIndex + 1) * estimatedItemHeight;

  return {
    virtualWindow: {
      startIndex,
      endIndex,
      offsetTop,
      offsetBottom,
      totalHeight,
    },
    onScroll,
    containerRef,
  };
}
