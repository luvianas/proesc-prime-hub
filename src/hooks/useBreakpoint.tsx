import { useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export interface BreakpointValues {
  mobile: number;
  tablet: number;
  desktop: number;
}

const breakpoints: BreakpointValues = {
  mobile: 640,   // 0-639px
  tablet: 1024,  // 640-1023px  
  desktop: 1024  // 1024px+
};

export function useBreakpoint(): {
  current: Breakpoint;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
} {
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    const updateWidth = () => {
      setWidth(window.innerWidth);
    };

    // Set initial width
    updateWidth();

    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const current: Breakpoint = 
    width < breakpoints.mobile ? 'mobile' :
    width < breakpoints.tablet ? 'tablet' : 
    'desktop';

  return {
    current,
    isMobile: current === 'mobile',
    isTablet: current === 'tablet', 
    isDesktop: current === 'desktop',
    width
  };
}