import { createTheme } from '@mui/material/styles';

const primaryMain = '#0f766e';
const primaryLight = '#14b8a6';
const primaryDark = '#0c5f59';
const accent = '#f59e0b';

const theme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'light',
    primary: {
      main: primaryMain,
      light: primaryLight,
      dark: primaryDark,
      contrastText: '#fff',
    },
    secondary: {
      main: accent,
      contrastText: '#1f2937',
    },
    background: {
      default: '#f7f7f9',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
    },
    divider: '#e2e8f0',
  },
  typography: {
    fontFamily: '"Manrope", "Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.4rem', fontWeight: 700, letterSpacing: '-0.01em' },
    h2: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.6rem', fontWeight: 600 },
    h4: { fontSize: '1.3rem', fontWeight: 600 },
    h5: { fontSize: '1.15rem', fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          paddingInline: 16,
          paddingBlock: 10,
        },
        containedPrimary: {
          boxShadow: '0 12px 30px rgba(15, 118, 110, 0.18)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 12px 40px rgba(15, 23, 42, 0.08)',
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: `linear-gradient(90deg, ${primaryDark}, ${primaryMain})`,
          boxShadow: '0 10px 30px rgba(12, 95, 89, 0.25)',
        },
      },
    },
  },
});

export default theme;
