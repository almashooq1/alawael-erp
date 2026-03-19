/**
 * Professional Theme System — AlAwael ERP
 * نظام ثيم احترافي متكامل مع دعم الوضع الليلي والألوان المتقدمة
 *
 * Features:
 * - Dark/Light mode with smooth transitions
 * - CSS custom properties for runtime theming
 * - Professional shadows, spacing, and typography scale
 * - RTL-first design
 * - Component-level theme overrides
 */

import { createTheme, alpha } from '@mui/material/styles';
import { gradients, brandColors } from './palette';

// ─── Design Tokens ───────────────────────────────────────────────────────────
const SPACING_UNIT = 8;
const BORDER_RADIUS = { xs: 6, sm: 8, md: 12, lg: 16, xl: 24, pill: 100 };

const FONT_FAMILY = [
  'Cairo',
  'Tajawal',
  'Inter',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  'sans-serif',
].join(',');

// ─── Shadow System ───────────────────────────────────────────────────────────
const createShadows = mode => {
  const o = mode === 'dark' ? 0.4 : 0.08;
  return [
    'none',
    `0 1px 2px 0 rgba(0,0,0,${o})`,
    `0 1px 3px 0 rgba(0,0,0,${o}), 0 1px 2px -1px rgba(0,0,0,${o})`,
    `0 4px 6px -1px rgba(0,0,0,${o}), 0 2px 4px -2px rgba(0,0,0,${o})`,
    `0 10px 15px -3px rgba(0,0,0,${o}), 0 4px 6px -4px rgba(0,0,0,${o})`,
    `0 20px 25px -5px rgba(0,0,0,${o}), 0 8px 10px -6px rgba(0,0,0,${o})`,
    `0 25px 50px -12px rgba(0,0,0,${o * 2.5})`,
    ...Array(18).fill(`0 25px 50px -12px rgba(0,0,0,${o * 2.5})`),
  ];
};

// ─── Color Palettes ──────────────────────────────────────────────────────────
const lightPalette = {
  mode: 'light',
  primary: { main: '#4F46E5', light: '#818CF8', dark: '#3730A3', contrastText: '#fff' },
  secondary: { main: '#7C3AED', light: '#A78BFA', dark: '#5B21B6', contrastText: '#fff' },
  success: { main: '#059669', light: '#34D399', dark: '#047857' },
  warning: { main: '#D97706', light: '#FBBF24', dark: '#B45309' },
  error: { main: '#DC2626', light: '#F87171', dark: '#B91C1C' },
  info: { main: '#0284C7', light: '#38BDF8', dark: '#0369A1' },
  background: { default: '#F8FAFC', paper: '#FFFFFF', subtle: '#F1F5F9' },
  text: { primary: '#0F172A', secondary: '#475569', disabled: '#94A3B8' },
  divider: '#E2E8F0',
  action: { hover: 'rgba(79,70,229,0.04)', selected: 'rgba(79,70,229,0.08)' },
};

const darkPalette = {
  mode: 'dark',
  primary: { main: '#818CF8', light: '#A5B4FC', dark: '#6366F1', contrastText: '#fff' },
  secondary: { main: '#A78BFA', light: '#C4B5FD', dark: '#7C3AED', contrastText: '#fff' },
  success: { main: '#34D399', light: '#6EE7B7', dark: '#059669' },
  warning: { main: '#FBBF24', light: '#FCD34D', dark: '#D97706' },
  error: { main: '#F87171', light: '#FCA5A5', dark: '#DC2626' },
  info: { main: '#38BDF8', light: '#7DD3FC', dark: '#0284C7' },
  background: { default: '#0B1120', paper: '#141B2D', subtle: '#1A2332' },
  text: { primary: '#F1F5F9', secondary: '#94A3B8', disabled: '#475569' },
  divider: '#1E293B',
  action: { hover: 'rgba(129,140,248,0.08)', selected: 'rgba(129,140,248,0.12)' },
};

// ─── Typography Scale ────────────────────────────────────────────────────────
const typography = {
  fontFamily: FONT_FAMILY,
  h1: { fontSize: '2.25rem', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em' },
  h2: { fontSize: '1.875rem', fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.01em' },
  h3: { fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.01em' },
  h4: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.35 },
  h5: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.4 },
  h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.45 },
  subtitle1: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 },
  subtitle2: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5 },
  body1: { fontSize: '0.9375rem', lineHeight: 1.65 },
  body2: { fontSize: '0.8125rem', lineHeight: 1.6 },
  caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.5, letterSpacing: '0.02em' },
  overline: {
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.01em' },
};

// ─── Component Overrides Factory ─────────────────────────────────────────────
const createComponentOverrides = palette => ({
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        scrollbarWidth: 'thin',
        scrollbarColor: `${palette.divider} transparent`,
        '&::-webkit-scrollbar': { width: 6, height: 6 },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': {
          background: palette.divider,
          borderRadius: 3,
        },
        transition: 'background-color 0.3s ease, color 0.3s ease',
      },
      '*': {
        transition: 'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
      },
    },
  },

  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: {
        borderRadius: BORDER_RADIUS.sm,
        padding: '8px 20px',
        fontSize: '0.875rem',
        fontWeight: 600,
        minHeight: 40,
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        '&:active': { transform: 'scale(0.97)' },
      },
      contained: {
        boxShadow: `0 1px 3px ${alpha(palette.primary.main, 0.3)}`,
        '&:hover': {
          boxShadow: `0 4px 12px ${alpha(palette.primary.main, 0.4)}`,
          transform: 'translateY(-1px)',
        },
      },
      outlined: {
        borderWidth: 1.5,
        '&:hover': { borderWidth: 1.5, backgroundColor: alpha(palette.primary.main, 0.04) },
      },
      sizeSmall: { padding: '4px 12px', fontSize: '0.8125rem', minHeight: 32 },
      sizeLarge: { padding: '12px 28px', fontSize: '0.9375rem', minHeight: 48 },
    },
  },

  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: BORDER_RADIUS.lg,
        border: `1px solid ${palette.divider}`,
        boxShadow: 'none',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
        '&:hover': {
          boxShadow: `0 8px 24px ${alpha(palette.primary.main, 0.08)}`,
          borderColor: alpha(palette.primary.main, 0.2),
        },
      },
    },
  },

  MuiCardContent: {
    styleOverrides: {
      root: { padding: 20, '&:last-child': { paddingBottom: 20 } },
    },
  },

  MuiPaper: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: { borderRadius: BORDER_RADIUS.md, backgroundImage: 'none' },
      outlined: { border: `1px solid ${palette.divider}` },
    },
  },

  MuiAppBar: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: {
        backdropFilter: 'blur(12px) saturate(180%)',
        backgroundColor: alpha(palette.background.paper, 0.8),
        borderBottom: `1px solid ${palette.divider}`,
        color: palette.text.primary,
      },
    },
  },

  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRight: 'none',
        borderLeft: 'none',
        boxShadow: `4px 0 24px ${alpha('#000', palette.mode === 'dark' ? 0.3 : 0.08)}`,
      },
    },
  },

  MuiTextField: {
    defaultProps: { variant: 'outlined', size: 'small' },
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: BORDER_RADIUS.sm,
          transition: 'all 0.2s ease',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: palette.primary.main,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderWidth: 2,
          },
        },
      },
    },
  },

  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: BORDER_RADIUS.xs,
        fontWeight: 500,
        height: 28,
        fontSize: '0.8125rem',
      },
      filled: {
        '&.MuiChip-colorPrimary': {
          backgroundColor: alpha(palette.primary.main, 0.12),
          color: palette.primary.main,
        },
        '&.MuiChip-colorSuccess': {
          backgroundColor: alpha(palette.success.main, 0.12),
          color: palette.success.main,
        },
        '&.MuiChip-colorWarning': {
          backgroundColor: alpha(palette.warning.main, 0.12),
          color: palette.warning.main,
        },
        '&.MuiChip-colorError': {
          backgroundColor: alpha(palette.error.main, 0.12),
          color: palette.error.main,
        },
      },
    },
  },

  MuiAlert: {
    styleOverrides: {
      root: {
        borderRadius: BORDER_RADIUS.sm,
        fontWeight: 500,
        fontSize: '0.875rem',
        alignItems: 'center',
      },
      standardSuccess: {
        backgroundColor: alpha(palette.success.main, 0.08),
        color: palette.success.dark || palette.success.main,
      },
      standardError: {
        backgroundColor: alpha(palette.error.main, 0.08),
        color: palette.error.dark || palette.error.main,
      },
      standardWarning: {
        backgroundColor: alpha(palette.warning.main, 0.08),
        color: palette.warning.dark || palette.warning.main,
      },
      standardInfo: {
        backgroundColor: alpha(palette.info.main, 0.08),
        color: palette.info.dark || palette.info.main,
      },
    },
  },

  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        borderRadius: BORDER_RADIUS.xs,
        fontSize: '0.8125rem',
        fontWeight: 500,
        padding: '6px 12px',
        backgroundColor: palette.mode === 'dark' ? '#1E293B' : '#1E293B',
        color: '#F1F5F9',
      },
      arrow: {
        color: palette.mode === 'dark' ? '#1E293B' : '#1E293B',
      },
    },
  },

  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: BORDER_RADIUS.lg,
        boxShadow: `0 25px 50px ${alpha('#000', 0.25)}`,
      },
    },
  },

  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: `1px solid ${palette.divider}`,
        padding: '12px 16px',
        fontSize: '0.875rem',
      },
      head: {
        fontWeight: 600,
        backgroundColor: palette.background.subtle || palette.background.default,
        color: palette.text.secondary,
        fontSize: '0.8125rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      },
    },
  },

  MuiTableRow: {
    styleOverrides: {
      root: {
        transition: 'background-color 0.15s ease',
        '&:hover': { backgroundColor: palette.action.hover },
        '&:last-child td': { borderBottom: 0 },
      },
    },
  },

  MuiTabs: {
    styleOverrides: {
      root: { minHeight: 40 },
      indicator: { height: 3, borderRadius: '3px 3px 0 0' },
    },
  },

  MuiTab: {
    styleOverrides: {
      root: {
        minHeight: 40,
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.875rem',
        padding: '8px 16px',
      },
    },
  },

  MuiLinearProgress: {
    styleOverrides: {
      root: {
        borderRadius: BORDER_RADIUS.pill,
        height: 6,
        backgroundColor: alpha(palette.primary.main, 0.1),
      },
      bar: { borderRadius: BORDER_RADIUS.pill },
    },
  },

  MuiAvatar: {
    styleOverrides: {
      root: { fontSize: '0.9375rem', fontWeight: 600 },
    },
  },

  MuiBadge: {
    styleOverrides: {
      badge: { fontSize: '0.6875rem', fontWeight: 700, minWidth: 18, height: 18, padding: '0 5px' },
    },
  },

  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: BORDER_RADIUS.sm,
        marginBottom: 2,
        padding: '8px 12px',
        '&.Mui-selected': {
          backgroundColor: alpha(palette.primary.main, 0.1),
          color: palette.primary.main,
          '&:hover': { backgroundColor: alpha(palette.primary.main, 0.15) },
          '& .MuiListItemIcon-root': { color: palette.primary.main },
        },
      },
    },
  },

  MuiSwitch: {
    styleOverrides: {
      root: { width: 44, height: 24, padding: 0 },
      switchBase: {
        padding: 2,
        '&.Mui-checked': {
          transform: 'translateX(20px)',
          '& + .MuiSwitch-track': { opacity: 1 },
        },
      },
      thumb: { width: 20, height: 20 },
      track: { borderRadius: 12, opacity: 0.3 },
    },
  },

  MuiSkeleton: {
    styleOverrides: {
      root: { borderRadius: BORDER_RADIUS.sm },
    },
  },
});

// ─── Theme Factory ───────────────────────────────────────────────────────────
export const createAppTheme = (mode = 'light') => {
  const palette = mode === 'dark' ? darkPalette : lightPalette;

  return createTheme({
    direction: 'rtl',
    palette,
    typography,
    shape: { borderRadius: BORDER_RADIUS.md },
    spacing: SPACING_UNIT,
    shadows: createShadows(mode),
    components: createComponentOverrides(palette),

    // Custom tokens accessible via theme.custom.*
    custom: {
      gradients,
      brandColors,
      borderRadius: BORDER_RADIUS,
      sidebar: {
        width: 280,
        collapsedWidth: 72,
        background: mode === 'dark' ? '#0F1724' : '#FFFFFF',
      },
      header: {
        height: 64,
      },
      transition: {
        fast: 'all 0.15s cubic-bezier(0.4,0,0.2,1)',
        medium: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        slow: 'all 0.5s cubic-bezier(0.4,0,0.2,1)',
      },
    },
  });
};

// Pre-built themes
export const lightTheme = createAppTheme('light');
export const darkTheme = createAppTheme('dark');

export default createAppTheme;
