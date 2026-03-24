'use client';

import { useEffect, useRef, useCallback } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import type { TourStep, TourKey } from '@/lib/tours';
import { markTourSeen } from '@/lib/tours';

interface AppTourProps {
  steps: TourStep[];
  tourKey: TourKey;
  /** If true, show immediately without checking localStorage (manual re-trigger) */
  forceShow?: boolean;
  onDone?: () => void;
}

export function AppTour({ steps, tourKey, forceShow = false, onDone }: AppTourProps) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  const startTour = useCallback(() => {
    if (driverRef.current) driverRef.current.destroy();

    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Got it!',
      progressText: '{{current}} of {{total}}',
      overlayOpacity: 0.55,
      smoothScroll: true,
      allowClose: true,
      popoverClass: 'pm-hub-tour-popover',
      onDestroyStarted: () => {
        markTourSeen(tourKey);
        onDone?.();
        driverObj.destroy();
      },
      steps: steps.map((s) => ({
        element: s.element,
        popover: {
          title: s.title,
          description: s.description,
          side: s.side ?? 'bottom',
          align: 'center',
        },
      })),
    });

    driverRef.current = driverObj;
    driverObj.drive();
  }, [steps, tourKey, onDone]);

  useEffect(() => {
    if (!forceShow) return;
    // Small delay so DOM elements are mounted
    const t = setTimeout(startTour, 400);
    return () => clearTimeout(t);
  }, [forceShow, startTour]);

  return null;
}
