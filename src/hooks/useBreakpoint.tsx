import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

interface BreakpointQueries {
  mobile: string;
  tablet: string;
  desktop: string;
}

const BREAKPOINT_QUERIES: BreakpointQueries = {
  mobile: '(max-width: 639px)',
  tablet: '(min-width: 640px) and (max-width: 1023px)',
  desktop: '(min-width: 1024px)'
};

const BREAKPOINT_VALUES = {
  mobile: 639,
  tablet: 1023
};

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width <= BREAKPOINT_VALUES.mobile) return 'mobile';
    if (width <= BREAKPOINT_VALUES.tablet) return 'tablet';
    return 'desktop';
  });

  useEffect(() => {
    const mediaQueries = {
      mobile: window.matchMedia(BREAKPOINT_QUERIES.mobile),
      tablet: window.matchMedia(BREAKPOINT_QUERIES.tablet),
      desktop: window.matchMedia(BREAKPOINT_QUERIES.desktop)
    };

    const updateBreakpoint = () => {
      if (mediaQueries.mobile.matches) {
        setBreakpoint('mobile');
      } else if (mediaQueries.tablet.matches) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    // Initial check
    updateBreakpoint();

    // Add listeners
    Object.values(mediaQueries).forEach(mq => {
      mq.addEventListener('change', updateBreakpoint);
    });

    // Cleanup
    return () => {
      Object.values(mediaQueries).forEach(mq => {
        mq.removeEventListener('change', updateBreakpoint);
      });
    };
  }, []);

  return breakpoint;
}

export function useIsMobile(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === 'mobile';
}

export function useIsTablet(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === 'tablet';
}

export function useIsMobileOrTablet(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === 'mobile' || breakpoint === 'tablet';
}