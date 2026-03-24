'use client';

/**
 * Mounts the AppTour for a given page, auto-starting on first visit.
 * Wrap this in dynamic({ ssr: false }) at the call site.
 */

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { TourStep, TourKey } from '@/lib/tours';
import { hasTourSeen } from '@/lib/tours';

const AppTour = dynamic(() => import('./AppTour').then((m) => ({ default: m.AppTour })), {
  ssr: false,
});

interface TourStarterProps {
  steps: TourStep[];
  tourKey: TourKey;
}

export function TourStarter({ steps, tourKey }: TourStarterProps) {
  const [show, setShow] = useState(false);
  const [manualTrigger, setManualTrigger] = useState(false);

  useEffect(() => {
    if (!hasTourSeen(tourKey)) {
      setShow(true);
    }
  }, [tourKey]);

  // Expose a global so the Help button in the sidebar can re-trigger any page tour
  useEffect(() => {
    (window as Window & { __startPageTour?: () => void }).__startPageTour = () => {
      setManualTrigger((v) => !v);
      setShow(true);
    };
    return () => {
      delete (window as Window & { __startPageTour?: () => void }).__startPageTour;
    };
  }, []);

  if (!show) return null;

  return (
    <AppTour
      steps={steps}
      tourKey={tourKey}
      forceShow={show || manualTrigger}
      onDone={() => setShow(false)}
    />
  );
}
