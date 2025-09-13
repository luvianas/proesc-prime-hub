import { useEffect, useRef, useState, useCallback } from 'react';
import { logEvent } from '@/lib/analytics';

interface UsePageTimerOptions {
  pageName: string;
  trackingEnabled?: boolean;
}

interface UseSessionTrackerOptions {
  trackingEnabled?: boolean;
}

export function usePageTimer({ pageName, trackingEnabled = true }: UsePageTimerOptions) {
  const startTimeRef = useRef<number>(Date.now());
  const [timeSpent, setTimeSpent] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!trackingEnabled) return;

    // Track page enter
    logEvent({
      event_type: 'page_enter',
      event_name: 'page_enter',
      properties: { page: pageName }
    });

    startTimeRef.current = Date.now();

    // Update time spent every 5 seconds
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setTimeSpent(elapsed);
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Track page exit with duration
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      logEvent({
        event_type: 'page_exit',
        event_name: 'page_exit',
        properties: { 
          page: pageName,
          time_spent_seconds: duration
        },
        duration
      });
    };
  }, [pageName, trackingEnabled]);

  return { timeSpent };
}

export function useSessionTracker({ trackingEnabled = true }: UseSessionTrackerOptions = {}) {
  const sessionStartRef = useRef<number>(Date.now());
  const [sessionId] = useState(() => {
    const existing = sessionStorage.getItem('session_id');
    if (existing) return existing;
    const newId = crypto.randomUUID();
    sessionStorage.setItem('session_id', newId);
    return newId;
  });

  useEffect(() => {
    if (!trackingEnabled) return;

    // Track session start
    logEvent({
      event_type: 'session_start',
      event_name: 'session_start',
      properties: { session_id: sessionId }
    });

    sessionStartRef.current = Date.now();

    // Handle session end on page unload
    const handleUnload = () => {
      const sessionDuration = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      logEvent({
        event_type: 'session_end',
        event_name: 'session_end',
        properties: { 
          session_id: sessionId,
          session_duration_seconds: sessionDuration
        },
        session_duration: sessionDuration
      });
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [sessionId, trackingEnabled]);

  return { sessionId };
}

export function useFeatureTracking() {
  const trackFeatureInteraction = useCallback((featureName: string, interactionType: string, additionalData?: Record<string, any>) => {
    logEvent({
      event_type: 'feature_interaction',
      event_name: `${featureName}_${interactionType}`,
      properties: {
        feature: featureName,
        interaction_type: interactionType,
        timestamp: Date.now(),
        ...additionalData
      }
    });
  }, []);

  const trackMenuClick = useCallback((menuItem: string, section: string, depth: number = 1) => {
    logEvent({
      event_type: 'menu_click',
      event_name: 'menu_navigation',
      properties: {
        menu_item: menuItem,
        section,
        depth,
        timestamp: Date.now()
      },
      depth_level: depth
    });
  }, []);

  const trackTimeOnFeature = useCallback((featureName: string, startTime: number) => {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    logEvent({
      event_type: 'time_tracking',
      event_name: 'feature_time_spent',
      properties: {
        feature: featureName,
        duration_seconds: duration
      },
      duration
    });
  }, []);

  return {
    trackFeatureInteraction,
    trackMenuClick,
    trackTimeOnFeature
  };
}

export function useBusinessMetrics() {
  const calculateEngagementScore = useCallback((timeSpent: number, interactions: number, returnVisits: number) => {
    // Weighted engagement score: time (40%) + interactions (40%) + return visits (20%)
    const timeScore = Math.min(timeSpent / 300, 1) * 40; // Max 5 minutes
    const interactionScore = Math.min(interactions / 10, 1) * 40; // Max 10 interactions
    const returnScore = Math.min(returnVisits / 5, 1) * 20; // Max 5 return visits
    return Math.round(timeScore + interactionScore + returnScore);
  }, []);

  const calculateFeatureROI = useCallback((timeSpent: number, businessValue: number = 50) => {
    // Simple ROI calculation: business value per minute of engagement
    const minutes = timeSpent / 60;
    return minutes > 0 ? Math.round(businessValue * minutes) : 0;
  }, []);

  return {
    calculateEngagementScore,
    calculateFeatureROI
  };
}