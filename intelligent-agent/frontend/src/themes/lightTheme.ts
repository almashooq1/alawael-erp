// Light Theme Configuration
export const lightTheme = {
  name: 'light',
  colors: {
    // Primary Colors
    primary: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
      800: '#1E40AF',
      900: '#1E3A8A',
    },

    // Secondary Colors
    secondary: {
      50: '#ECFDF5',
      100: '#D1FAE5',
      200: '#A7F3D0',
      300: '#6EE7B7',
      400: '#34D399',
      500: '#10B981',
      600: '#059669',
      700: '#047857',
      800: '#065F46',
      900: '#064E3B',
    },

    // Background
    background: {
      default: '#F9FAFB',
      paper: '#FFFFFF',
      elevated: '#FFFFFF',
    },

    // Surface
    surface: {
      primary: '#FFFFFF',
      secondary: '#F3F4F6',
      tertiary: '#E5E7EB',
    },

    // Text
    text: {
      primary: '#111827',
      secondary: '#4B5563',
      tertiary: '#6B7280',
      disabled: '#9CA3AF',
      inverse: '#FFFFFF',
    },

    // Semantic Colors
    success: {
      main: '#10B981',
      light: '#D1FAE5',
      dark: '#065F46',
      contrast: '#FFFFFF',
    },

    error: {
      main: '#EF4444',
      light: '#FEE2E2',
      dark: '#991B1B',
      contrast: '#FFFFFF',
    },

    warning: {
      main: '#F59E0B',
      light: '#FEF3C7',
      dark: '#92400E',
      contrast: '#FFFFFF',
    },

    info: {
      main: '#3B82F6',
      light: '#DBEAFE',
      dark: '#1E40AF',
      contrast: '#FFFFFF',
    },

    // Borders
    border: {
      light: '#E5E7EB',
      main: '#D1D5DB',
      dark: '#9CA3AF',
    },

    // Divider
    divider: '#E5E7EB',

    // Action
    action: {
      active: '#3B82F6',
      hover: '#F3F4F6',
      selected: '#EFF6FF',
      disabled: '#E5E7EB',
      disabledBackground: '#F3F4F6',
    },
  },

  // Spacing
  spacing: {
    xs: '0.25rem',    // 4px
    sm: '0.5rem',     // 8px
    md: '1rem',       // 16px
    lg: '1.5rem',     // 24px
    xl: '2rem',       // 32px
    xxl: '3rem',      // 48px
  },

  // Border Radius
  borderRadius: {
    xs: '0.125rem',   // 2px
    sm: '0.25rem',    // 4px
    md: '0.375rem',   // 6px
    lg: '0.5rem',     // 8px
    xl: '0.75rem',    // 12px
    xxl: '1rem',      // 16px
    full: '9999px',
  },

  // Shadows
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    xxl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
    none: 'none',
  },

  // Typography
  typography: {
    fontFamily: {
      primary: "'Cairo', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      monospace: "'Fira Code', 'Consolas', monospace",
    },

    fontSize: {
      xs: '0.75rem',      // 12px
      sm: '0.875rem',     // 14px
      base: '1rem',       // 16px
      lg: '1.125rem',     // 18px
      xl: '1.25rem',      // 20px
      '2xl': '1.5rem',    // 24px
      '3xl': '1.875rem',  // 30px
      '4xl': '2.25rem',   // 36px
      '5xl': '3rem',      // 48px
    },

    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },

    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
  },

  // Z-Index
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },

  // Transitions
  transitions: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },

    easing: {
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  // Breakpoints
  breakpoints: {
    mobile: '320px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1440px',
  },
};

export type Theme = typeof lightTheme;
