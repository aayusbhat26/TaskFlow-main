"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export const PerformanceMonitor = () => {
  const pathname = usePathname();
  const navigationStartTime = useRef<number>(0);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (isFirstLoad.current) {
      // First page load
      isFirstLoad.current = false;
      return;
    }

    // Navigation performance tracking
    const navigationEndTime = performance.now();
    const navigationDuration = navigationEndTime - navigationStartTime.current;

    // Log performance metrics
    if (navigationDuration > 1000) {
      console.warn(`Slow navigation detected: ${navigationDuration.toFixed(2)}ms to ${pathname}`);
    } else {
      console.log(`Navigation completed: ${navigationDuration.toFixed(2)}ms to ${pathname}`);
    }

    // Send to analytics if needed
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'navigation_performance', {
        navigation_time: Math.round(navigationDuration),
        destination: pathname,
        is_slow: navigationDuration > 1000
      });
    }
  }, [pathname]);

  useEffect(() => {
    // Set navigation start time when component mounts
    navigationStartTime.current = performance.now();
  }, []);

  return null; // This component doesn't render anything
};
