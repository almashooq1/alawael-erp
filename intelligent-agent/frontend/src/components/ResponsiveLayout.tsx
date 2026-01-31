import React from 'react';
import { useResponsive, Breakpoint } from '../hooks/useMediaQuery';

// ============================================================================
// RESPONSIVE LAYOUT COMPONENTS
// Mobile-first responsive container and grid system
// ============================================================================

// ----------------------------------------------------------------------------
// ResponsiveContainer - Adaptive container with max-width breakpoints
// ----------------------------------------------------------------------------
interface ResponsiveContainerProps {
  children: React.ReactNode;
  maxWidth?: Breakpoint | 'full';
  padding?: boolean;
  center?: boolean;
  className?: string;
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  maxWidth = 'xl',
  padding = true,
  center = true,
  className = '',
}) => {
  const maxWidthMap = {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    '3xl': '1920px',
    '4xl': '2560px',
    full: '100%',
  };

  return (
    <div
      className={className}
      style={{
        maxWidth: maxWidthMap[maxWidth],
        marginLeft: center ? 'auto' : undefined,
        marginRight: center ? 'auto' : undefined,
        paddingLeft: padding ? '1rem' : undefined,
        paddingRight: padding ? '1rem' : undefined,
        width: '100%',
      }}
    >
      {children}
    </div>
  );
};

// ----------------------------------------------------------------------------
// ResponsiveGrid - Responsive CSS Grid layout
// ----------------------------------------------------------------------------
interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: number;
  rowGap?: number;
  columnGap?: number;
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = 16,
  rowGap,
  columnGap,
  className = '',
}) => {
  const { currentBreakpoint } = useResponsive();

  // Determine columns based on current breakpoint
  const getColumns = (): number => {
    const orderedBreakpoints: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
    const currentIndex = orderedBreakpoints.indexOf(currentBreakpoint);

    for (let i = currentIndex; i >= 0; i--) {
      const bp = orderedBreakpoints[i];
      if (columns[bp]) {
        return columns[bp]!;
      }
    }

    return 1;
  };

  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${getColumns()}, 1fr)`,
        gap: gap ? `${gap}px` : undefined,
        rowGap: rowGap ? `${rowGap}px` : undefined,
        columnGap: columnGap ? `${columnGap}px` : undefined,
      }}
    >
      {children}
    </div>
  );
};

// ----------------------------------------------------------------------------
// ResponsiveStack - Vertical/horizontal stack based on breakpoint
// ----------------------------------------------------------------------------
interface ResponsiveStackProps {
  children: React.ReactNode;
  direction?: {
    xs?: 'row' | 'column';
    sm?: 'row' | 'column';
    md?: 'row' | 'column';
    lg?: 'row' | 'column';
  };
  gap?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
  wrap?: boolean;
  className?: string;
}

export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  children,
  direction = { xs: 'column', md: 'row' },
  gap = 16,
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className = '',
}) => {
  const { currentBreakpoint } = useResponsive();

  const getDirection = (): 'row' | 'column' => {
    const orderedBreakpoints: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
    const currentIndex = orderedBreakpoints.indexOf(currentBreakpoint);

    for (let i = currentIndex; i >= 0; i--) {
      const bp = orderedBreakpoints[i];
      if (direction[bp]) {
        return direction[bp]!;
      }
    }

    return 'column';
  };

  const alignMap = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    stretch: 'stretch',
  };

  const justifyMap = {
    start: 'flex-start',
    center: 'center',
    end: 'flex-end',
    'space-between': 'space-between',
    'space-around': 'space-around',
  };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: getDirection(),
        gap: `${gap}px`,
        alignItems: alignMap[align],
        justifyContent: justifyMap[justify],
        flexWrap: wrap ? 'wrap' : 'nowrap',
      }}
    >
      {children}
    </div>
  );
};

// ----------------------------------------------------------------------------
// ResponsiveShow - Conditionally show/hide content based on breakpoint
// ----------------------------------------------------------------------------
interface ResponsiveShowProps {
  children: React.ReactNode;
  above?: Breakpoint;
  below?: Breakpoint;
  only?: Breakpoint[];
}

export const ResponsiveShow: React.FC<ResponsiveShowProps> = ({
  children,
  above,
  below,
  only,
}) => {
  const { currentBreakpoint } = useResponsive();

  const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);

  let shouldShow = true;

  if (above) {
    const aboveIndex = breakpointOrder.indexOf(above);
    shouldShow = currentIndex >= aboveIndex;
  }

  if (below) {
    const belowIndex = breakpointOrder.indexOf(below);
    shouldShow = shouldShow && currentIndex <= belowIndex;
  }

  if (only) {
    shouldShow = only.includes(currentBreakpoint);
  }

  return shouldShow ? <>{children}</> : null;
};

// ----------------------------------------------------------------------------
// ResponsiveHide - Inverse of ResponsiveShow
// ----------------------------------------------------------------------------
interface ResponsiveHideProps {
  children: React.ReactNode;
  above?: Breakpoint;
  below?: Breakpoint;
  only?: Breakpoint[];
}

export const ResponsiveHide: React.FC<ResponsiveHideProps> = ({
  children,
  above,
  below,
  only,
}) => {
  const { currentBreakpoint } = useResponsive();

  const breakpointOrder: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);

  let shouldHide = false;

  if (above) {
    const aboveIndex = breakpointOrder.indexOf(above);
    shouldHide = currentIndex >= aboveIndex;
  }

  if (below) {
    const belowIndex = breakpointOrder.indexOf(below);
    shouldHide = shouldHide || currentIndex <= belowIndex;
  }

  if (only) {
    shouldHide = only.includes(currentBreakpoint);
  }

  return shouldHide ? null : <>{children}</>;
};

// ----------------------------------------------------------------------------
// AspectRatio - Maintain aspect ratio container
// ----------------------------------------------------------------------------
interface AspectRatioProps {
  children: React.ReactNode;
  ratio?: number; // width / height (e.g., 16/9, 4/3)
  maxWidth?: string;
  className?: string;
}

export const AspectRatio: React.FC<AspectRatioProps> = ({
  children,
  ratio = 16 / 9,
  maxWidth = '100%',
  className = '',
}) => {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth,
        paddingBottom: `${(1 / ratio) * 100}%`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      >
        {children}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// MobileMenu - Mobile-optimized navigation menu
// ----------------------------------------------------------------------------
interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: 'left' | 'right' | 'top' | 'bottom';
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  children,
  position = 'left',
}) => {
  const { isMobile } = useResponsive();

  if (!isMobile) return null;

  const positionStyles = {
    left: { left: 0, top: 0, bottom: 0, width: '80%', maxWidth: '300px' },
    right: { right: 0, top: 0, bottom: 0, width: '80%', maxWidth: '300px' },
    top: { top: 0, left: 0, right: 0, height: 'auto', maxHeight: '80vh' },
    bottom: { bottom: 0, left: 0, right: 0, height: 'auto', maxHeight: '80vh' },
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
          }}
        />
      )}

      {/* Menu */}
      <div
        style={{
          position: 'fixed',
          ...positionStyles[position],
          backgroundColor: 'white',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease-in-out',
          zIndex: 1000,
          overflowY: 'auto',
        }}
      >
        {children}
      </div>
    </>
  );
};

// ----------------------------------------------------------------------------
// TouchArea - Optimized touch target for mobile
// ----------------------------------------------------------------------------
interface TouchAreaProps {
  children: React.ReactNode;
  onTap?: () => void;
  minSize?: number;
  className?: string;
}

export const TouchArea: React.FC<TouchAreaProps> = ({
  children,
  onTap,
  minSize = 44, // Apple's recommended minimum touch target size
  className = '',
}) => {
  return (
    <div
      onClick={onTap}
      className={className}
      style={{
        minWidth: `${minSize}px`,
        minHeight: `${minSize}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </div>
  );
};
