/**
 * Professional Theme System — AlAwael ERP
 * نظام الثيم الاحترافي المتكامل
 *
 * Premium Arabic ERP Design Language
 * - Light / Dark modes
 * - Saudi Vision 2030 color alignment
 * - Glassmorphism & subtle animations
 * - Full RTL support
 */

import { createTheme, alpha } from '@mui/material/styles';
import { brand, violet, gold, emerald, rose, slate, sky, gradients, brandColors } from './palette';

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

const BORDER_RADIUS = { xs: 6, sm: 8, md: 12, lg: 16, xl: 20, pill: 100 };
const SIDEBAR_WIDTH = 280;
const SIDEBAR_COLLAPSED = 72;
const HEADER_HEIGHT = 64;

// ─── Shadows ─────────────────────────────────────────────────────────────────
const buildShadows = mode => {
  const o = mode === 'dark' ? 0.35 : 0.07;
  return [
    'none',
    `0 1px 2px rgba(0,0,0,${o})`,
    `0 1px 3px rgba(0,0,0,${o}), 0 1px 2px rgba(0,0,0,${o * 0.6})`,
    `0 4px 6px rgba(0,0,0,${o}), 0 2px 4px rgba(0,0,0,${o * 0.6})`,
    `0 10px 15px rgba(0,0,0,${o}), 0 4px 6px rgba(0,0,0,${o * 0.5})`,
    `0 20px 25px rgba(0,0,0,${o}), 0 8px 10px rgba(0,0,0,${o * 0.4})`,
    `0 25px 50px rgba(0,0,0,${o * 1.8})`,
    ...Array(18).fill(`0 25px 50px rgba(0,0,0,${o * 1.8})`),
  ];
};

// ─── Light Palette ────────────────────────────────────────────────────────────
const lightPalette = {
  mode: 'light',
  primary: {
    main: brand[500],
    light: brand[400],
    dark: brand[600],
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: violet[500],
    light: violet[400],
    dark: violet[600],
    contrastText: '#FFFFFF',
  },
  success: {
    main: emerald[500],
    light: emerald[400],
    dark: emerald[600],
    contrastText: '#FFFFFF',
  },
  warning: {
    main: gold[500],
    light: gold[400],
    dark: gold[600],
    contrastText: '#FFFFFF',
  },
  error: {
    main: rose[500],
    light: rose[400],
    dark: rose[600],
    contrastText: '#FFFFFF',
  },
  info: {
    main: sky[500],
    light: sky[400],
    dark: sky[600],
    contrastText: '#FFFFFF',
  },
  background: {
    default: slate[100],
    paper: '#FFFFFF',
  },
  text: {
    primary: slate[900],
    secondary: slate[500],
    disabled: slate[400],
  },
  divider: slate[200],
  grey: slate,
};

// ─── Dark Palette ─────────────────────────────────────────────────────────────
const darkPalette = {
  mode: 'dark',
  primary: {
    main: brand[400],
    light: brand[300],
    dark: brand[500],
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: violet[400],
    light: violet[300],
    dark: violet[500],
    contrastText: '#FFFFFF',
  },
  success: {
    main: emerald[400],
    light: emerald[300],
    dark: emerald[500],
    contrastText: '#FFFFFF',
  },
  warning: {
    main: gold[400],
    light: gold[300],
    dark: gold[500],
    contrastText: slate[900],
  },
  error: {
    main: rose[400],
    light: rose[300],
    dark: rose[500],
    contrastText: '#FFFFFF',
  },
  info: {
    main: sky[400],
    light: sky[300],
    dark: sky[500],
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#080E1A',
    paper: '#0F172A',
  },
  text: {
    primary: 'rgba(255,255,255,0.92)',
    secondary: 'rgba(255,255,255,0.55)',
    disabled: 'rgba(255,255,255,0.3)',
  },
  divider: 'rgba(255,255,255,0.08)',
  grey: slate,
};

// ─── Typography ───────────────────────────────────────────────────────────────
const typography = {
  fontFamily: FONT_FAMILY,
  fontSize: 14,
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightBold: 700,

  h1: { fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
  h2: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.01em' },
  h3: { fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.3, letterSpacing: '-0.01em' },
  h4: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.35 },
  h5: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.4 },
  h6: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.45 },

  subtitle1: { fontSize: '1rem', fontWeight: 500, lineHeight: 1.5 },
  subtitle2: { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.5, letterSpacing: '0.01em' },

  body1: { fontSize: '0.9375rem', fontWeight: 400, lineHeight: 1.6 },
  body2: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.6 },

  button: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.5, letterSpacing: '0.02em' },
  caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.5, letterSpacing: '0.03em' },
  overline: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    lineHeight: 1.5,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
};

// ─── Component Overrides ─────────────────────────────────────────────────────
const buildComponents = mode => {
  const isDark = mode === 'dark';
  const _surfaceBg = isDark ? '#0F172A' : '#FFFFFF';
  const _hoverBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';

  return {
    MuiCssBaseline: {
      styleOverrides: {
        '*, *::before, *::after': { boxSizing: 'border-box' },
        html: { direction: 'rtl', scrollBehavior: 'smooth' },
        body: {
          fontFamily: FONT_FAMILY,
          backgroundColor: isDark ? '#080E1A' : slate[100],
          direction: 'rtl',
        },
        '::-webkit-scrollbar': { width: '6px', height: '6px' },
        '::-webkit-scrollbar-track': {
          background: isDark ? 'rgba(255,255,255,0.04)' : slate[100],
          borderRadius: '3px',
        },
        '::-webkit-scrollbar-thumb': {
          background: isDark ? 'rgba(255,255,255,0.15)' : slate[300],
          borderRadius: '3px',
          '&:hover': {
            background: isDark ? 'rgba(255,255,255,0.25)' : slate[400],
          },
        },
      },
    },

    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS.sm,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          transition: 'all 0.2s ease',
          '&:hover': { transform: 'translateY(-1px)' },
          '&:active': { transform: 'translateY(0)' },
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
          },
        },
        containedPrimary: {
          background: gradients.brand,
          '&:hover': {
            background: `linear-gradient(135deg, ${brand[600]} 0%, ${violet[600]} 100%)`,
            boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': { borderWidth: '1.5px' },
        },
        sizeLarge: { padding: '10px 24px', fontSize: '0.9375rem' },
        sizeMedium: { padding: '8px 18px' },
        sizeSmall: { padding: '5px 12px', fontSize: '0.8125rem' },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS.lg,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : slate[200]}`,
          boxShadow: isDark
            ? '0 1px 3px rgba(0,0,0,0.4)'
            : '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
          backgroundImage: 'none',
          transition: 'box-shadow 0.25s ease, transform 0.25s ease',
          '&:hover': {
            boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.08)',
          },
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: BORDER_RADIUS.md,
        },
        elevation1: {
          boxShadow: isDark
            ? '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)'
            : '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        },
        elevation2: {
          boxShadow: isDark ? '0 4px 8px rgba(0,0,0,0.5)' : '0 4px 8px rgba(0,0,0,0.07)',
        },
        elevation3: {
          boxShadow: isDark ? '0 8px 16px rgba(0,0,0,0.6)' : '0 8px 16px rgba(0,0,0,0.08)',
        },
      },
    },

    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backdropFilter: 'blur(20px) saturate(180%)',
          background: isDark ? 'rgba(10,22,40,0.92)' : 'rgba(255,255,255,0.95)',
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : slate[200]}`,
          boxShadow: isDark ? '0 1px 8px rgba(0,0,0,0.4)' : '0 1px 8px rgba(0,0,0,0.06)',
          color: isDark ? 'rgba(255,255,255,0.92)' : slate[900],
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: 'none',
          backgroundImage: 'none',
        },
      },
    },

    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: BORDER_RADIUS.sm,
            transition: 'box-shadow 0.2s ease',
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px ${alpha(brand[500], 0.15)}`,
            },
            '& fieldset': {
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : slate[300],
              transition: 'border-color 0.2s',
            },
            '&:hover fieldset': {
              borderColor: isDark ? 'rgba(255,255,255,0.25)' : slate[400],
            },
            '&.Mui-focused fieldset': {
              borderColor: brand[500],
              borderWidth: '1.5px',
            },
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: brand[500],
          },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS.sm,
          fontWeight: 500,
          fontSize: '0.75rem',
        },
        colorPrimary: {
          backgroundColor: alpha(brand[500], isDark ? 0.2 : 0.1),
          color: isDark ? brand[300] : brand[700],
          border: `1px solid ${alpha(brand[500], 0.2)}`,
        },
        colorSuccess: {
          backgroundColor: alpha(emerald[500], isDark ? 0.2 : 0.1),
          color: isDark ? emerald[300] : emerald[700],
          border: `1px solid ${alpha(emerald[500], 0.2)}`,
        },
        colorWarning: {
          backgroundColor: alpha(gold[500], isDark ? 0.2 : 0.12),
          color: isDark ? gold[300] : gold[800],
          border: `1px solid ${alpha(gold[500], 0.25)}`,
        },
        colorError: {
          backgroundColor: alpha(rose[500], isDark ? 0.2 : 0.1),
          color: isDark ? rose[300] : rose[700],
          border: `1px solid ${alpha(rose[500], 0.2)}`,
        },
      },
    },

    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS.sm,
          border: '1px solid',
          fontSize: '0.875rem',
          fontWeight: 500,
        },
        standardSuccess: {
          backgroundColor: alpha(emerald[500], 0.08),
          borderColor: alpha(emerald[500], 0.2),
          color: isDark ? emerald[300] : emerald[800],
        },
        standardError: {
          backgroundColor: alpha(rose[500], 0.08),
          borderColor: alpha(rose[500], 0.2),
          color: isDark ? rose[300] : rose[800],
        },
        standardWarning: {
          backgroundColor: alpha(gold[500], 0.08),
          borderColor: alpha(gold[500], 0.2),
          color: isDark ? gold[300] : gold[900],
        },
        standardInfo: {
          backgroundColor: alpha(sky[500], 0.08),
          borderColor: alpha(sky[500], 0.2),
          color: isDark ? sky[300] : sky[800],
        },
      },
    },

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: isDark ? slate[700] : slate[900],
          color: '#FFFFFF',
          fontSize: '0.75rem',
          fontWeight: 500,
          borderRadius: BORDER_RADIUS.xs,
          padding: '6px 10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        },
        arrow: {
          color: isDark ? slate[700] : slate[900],
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: BORDER_RADIUS.xl,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : slate[200]}`,
          boxShadow: isDark ? '0 25px 50px rgba(0,0,0,0.7)' : '0 25px 50px rgba(0,0,0,0.15)',
          backgroundImage: 'none',
        },
        backdrop: {
          backdropFilter: 'blur(4px)',
          backgroundColor: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(15,23,42,0.5)',
        },
      },
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: '20px 24px 12px',
          fontSize: '1.125rem',
          fontWeight: 600,
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : slate[100]}`,
        },
      },
    },

    MuiDialogContent: {
      styleOverrides: {
        root: { padding: '20px 24px' },
      },
    },

    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '12px 24px 20px',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : slate[100]}`,
          gap: '8px',
        },
      },
    },

    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS.md,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : slate[200]}`,
          overflow: 'hidden',
        },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : slate[50],
            color: isDark ? 'rgba(255,255,255,0.6)' : slate[600],
            fontWeight: 600,
            fontSize: '0.8125rem',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            borderBottom: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : slate[200]}`,
            padding: '12px 16px',
            whiteSpace: 'nowrap',
          },
        },
      },
    },

    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableRow-root': {
            transition: 'background-color 0.15s',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : alpha(brand[500], 0.03),
            },
            '&:last-child .MuiTableCell-body': { borderBottom: 'none' },
          },
          '& .MuiTableCell-body': {
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : slate[100]}`,
            fontSize: '0.875rem',
            padding: '12px 16px',
          },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : slate[200]}`,
          minHeight: '44px',
        },
        indicator: {
          height: '2.5px',
          borderRadius: '2px',
          background: gradients.brand,
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          minHeight: '44px',
          padding: '8px 16px',
          color: isDark ? 'rgba(255,255,255,0.5)' : slate[500],
          transition: 'color 0.2s',
          '&.Mui-selected': {
            color: isDark ? brand[300] : brand[600],
            fontWeight: 600,
          },
          '&:hover': {
            color: isDark ? 'rgba(255,255,255,0.85)' : slate[800],
          },
        },
      },
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: '6px',
          borderRadius: '3px',
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : slate[200],
        },
        bar: {
          borderRadius: '3px',
          background: gradients.brand,
        },
      },
    },

    MuiCircularProgress: {
      defaultProps: { size: 24 },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS.sm,
          transition: 'background-color 0.15s, transform 0.15s',
          '&:hover': {
            transform: 'scale(1.05)',
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : alpha(brand[500], 0.06),
          },
        },
      },
    },

    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.875rem',
          background: gradients.brand,
        },
      },
    },

    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 700,
          fontSize: '0.65rem',
          minWidth: '18px',
          height: '18px',
          padding: '0 4px',
        },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: isDark ? 'rgba(255,255,255,0.07)' : slate[200],
        },
      },
    },

    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS.sm,
          transition: 'background-color 0.15s, padding 0.25s',
          '&.Mui-selected': {
            backgroundColor: alpha(brand[500], isDark ? 0.15 : 0.08),
            color: isDark ? brand[300] : brand[700],
            '&:hover': {
              backgroundColor: alpha(brand[500], isDark ? 0.2 : 0.12),
            },
          },
        },
      },
    },

    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .MuiSwitch-thumb': {
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          },
        },
        colorPrimary: {
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: brand[500],
          },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
            backgroundColor: brand[400],
          },
        },
      },
    },

    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          fontWeight: 500,
          '&.Mui-focused': { color: brand[500] },
        },
      },
    },

    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS.sm,
        },
      },
    },

    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          borderRadius: BORDER_RADIUS.md,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : slate[200]}`,
          boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.1)',
        },
        option: {
          borderRadius: BORDER_RADIUS.xs,
          margin: '2px 6px',
          padding: '8px 10px',
          '&[aria-selected="true"]': {
            backgroundColor: alpha(brand[500], 0.1),
          },
        },
      },
    },

    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: BORDER_RADIUS.md,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : slate[200]}`,
          boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.6)' : '0 8px 24px rgba(0,0,0,0.1)',
          backgroundImage: 'none',
          minWidth: '160px',
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS.xs,
          margin: '2px 6px',
          padding: '8px 12px',
          fontSize: '0.875rem',
          fontWeight: 400,
          transition: 'background-color 0.15s',
          '&:hover': {
            backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : alpha(brand[500], 0.06),
          },
          '&.Mui-selected': {
            backgroundColor: alpha(brand[500], isDark ? 0.15 : 0.08),
            fontWeight: 500,
          },
        },
      },
    },

    MuiPopover: {
      styleOverrides: {
        paper: {
          borderRadius: BORDER_RADIUS.md,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : slate[200]}`,
          boxShadow: isDark ? '0 16px 40px rgba(0,0,0,0.6)' : '0 16px 40px rgba(0,0,0,0.1)',
        },
      },
    },

    MuiSnackbar: {
      defaultProps: {
        anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
      },
    },

    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS.sm,
          fontWeight: 500,
        },
      },
    },

    MuiBreadcrumbs: {
      styleOverrides: {
        root: {
          fontSize: '0.8125rem',
          '& .MuiBreadcrumbs-separator': {
            color: isDark ? 'rgba(255,255,255,0.3)' : slate[400],
          },
        },
        ol: {
          flexWrap: 'nowrap',
          alignItems: 'center',
        },
      },
    },

    MuiSkeleton: {
      defaultProps: { animation: 'wave' },
      styleOverrides: {
        root: {
          borderRadius: BORDER_RADIUS.sm,
          backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : slate[200],
          '&::after': {
            background: isDark
              ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)'
              : `linear-gradient(90deg, transparent, ${alpha('#FFFFFF', 0.6)}, transparent)`,
          },
        },
      },
    },

    MuiStepIcon: {
      styleOverrides: {
        root: {
          '&.Mui-active': { color: brand[500] },
          '&.Mui-completed': { color: emerald[500] },
        },
      },
    },

    MuiAccordion: {
      styleOverrides: {
        root: {
          borderRadius: `${BORDER_RADIUS.md}px !important`,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : slate[200]}`,
          boxShadow: 'none',
          backgroundImage: 'none',
          '&:before': { display: 'none' },
          '&.Mui-expanded': {
            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.06)',
          },
        },
      },
    },
  };
};

// Helper used only in component definitions (not exported)
function _rgba(r, g, b, a) {
  return `rgba(${r},${g},${b},${a})`;
}

// ─── Theme Factory ────────────────────────────────────────────────────────────
export const createAppTheme = (mode = 'light') => {
  const palette = mode === 'dark' ? darkPalette : lightPalette;
  const shadows = buildShadows(mode);
  const isDark = mode === 'dark';

  return createTheme({
    direction: 'rtl',
    palette,
    typography,
    shadows,
    shape: { borderRadius: BORDER_RADIUS.sm },
    spacing: 8,
    breakpoints: {
      values: { xs: 0, sm: 600, md: 960, lg: 1280, xl: 1600 },
    },
    components: buildComponents(mode),
    custom: {
      gradients,
      brandColors,
      borderRadius: BORDER_RADIUS,
      sidebar: {
        width: SIDEBAR_WIDTH,
        collapsedWidth: SIDEBAR_COLLAPSED,
        background: '#0A1628',
        backgroundGradient: 'linear-gradient(180deg, #0A1628 0%, #0D1E38 50%, #080E1A 100%)',
        headerGradient: 'linear-gradient(135deg, #1E3A8A 0%, #0A1628 60%)',
        activeBg: 'rgba(99,102,241,0.12)',
        activeBorder: brand[500],
        hoverBg: 'rgba(255,255,255,0.05)',
        textColor: 'rgba(255,255,255,0.75)',
        textActive: '#FFFFFF',
        iconColor: 'rgba(255,255,255,0.5)',
        iconActive: brand[400],
        sectionTitle: 'rgba(255,255,255,0.35)',
        divider: 'rgba(255,255,255,0.06)',
      },
      header: {
        height: HEADER_HEIGHT,
        background: isDark ? 'rgba(10,22,40,0.95)' : 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(20px) saturate(180%)',
        borderColor: isDark ? 'rgba(255,255,255,0.07)' : slate[200],
        boxShadow: isDark ? '0 1px 8px rgba(0,0,0,0.4)' : '0 1px 8px rgba(0,0,0,0.06)',
      },
      transition: {
        fast: 'all 0.15s ease',
        medium: 'all 0.25s ease',
        slow: 'all 0.4s ease',
      },
      effects: {
        glassLight: {
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.15)',
        },
        glassDark: {
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)',
        },
      },
    },
  });
};

// Pre-built theme instances
export const lightTheme = createAppTheme('light');
export const darkTheme = createAppTheme('dark');

export default lightTheme;
