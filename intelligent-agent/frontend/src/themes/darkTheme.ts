// Dark Theme Configuration
export const darkTheme = {
  name: 'dark',
  colors: {
    // Primary Colors
    primary: {
      50: '#1E3A8A',
      100: '#1E40AF',
      200: '#1D4ED8',
      300: '#2563EB',
      400: '#3B82F6',
      500: '#60A5FA',
      600: '#93C5FD',
      700: '#BFDBFE',
      800: '#DBEAFE',
      900: '#EFF6FF',
    },

    // Secondary Colors
    secondary: {
      50: '#064E3B',
      100: '#065F46',
      200: '#047857',
      300: '#059669',
      400: '#10B981',
      500: '#34D399',
      600: '#6EE7B7',
      700: '#A7F3D0',
      800: '#D1FAE5',
      900: '#ECFDF5',
    },

    // Background
    background: {
      default: '#0F172A',
      paper: '#1E293B',
      elevated: '#334155',
    },

    // Surface
    surface: {
      primary: '#1E293B',
      secondary: '#334155',
      tertiary: '#475569',
    },

    // Text
    text: {
      primary: '#F1F5F9',
      secondary: '#CBD5E1',
      tertiary: '#94A3B8',
      disabled: '#64748B',
      inverse: '#0F172A',
    },

    // Semantic Colors
    success: {
      main: '#34D399',
      light: '#064E3B',
      dark: '#ECFDF5',
      contrast: '#0F172A',
    },

    error: {
      main: '#F87171',
      light: '#7F1D1D',
      dark: '#FEE2E2',
      contrast: '#0F172A',
    },

    warning: {
      main: '#FBBF24',
      light: '#78350F',
      dark: '#FEF3C7',
      contrast: '#0F172A',
    },

    info: {
      main: '#60A5FA',
      light: '#1E3A8A',
      dark: '#DBEAFE',
      contrast: '#0F172A',
    },

    // Borders
    border: {
      light: '#334155',
      main: '#475569',
      dark: '#64748B',
    },

    // Divider
    divider: '#334155',

    // Action
    action: {
      active: '#60A5FA',
      hover: '#334155',
      selected: '#1E3A8A',
      disabled: '#475569',
      disabledBackground: '#334155',
    },
  },

  // Spacing (same as light theme)
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },

  // Border Radius (same as light theme)
  borderRadius: {
    xs: '0.125rem',
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    xxl: '1rem',
    full: '9999px',
  },

  // Shadows (adjusted for dark theme)
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    xxl: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
    none: 'none',
  },

  // Typography (same as light theme)
  typography: {
    fontFamily: {
      primary: "'Cairo', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      monospace: "'Fira Code', 'Consolas', monospace",
    },

    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
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

  // Z-Index (same as light theme)
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },

  // Transitions (same as light theme)
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

  // Breakpoints (same as light theme)
  breakpoints: {
    mobile: '320px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1440px',
  },
};

export type Theme = typeof darkTheme;
