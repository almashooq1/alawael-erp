// Main App Component - App.jsx (Phase 12 Updated)

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import { useDispatch } from 'react-redux';
import { FiBarChart2, FiSearch, FiCheckCircle, FiSettings, FiMenu, FiX } from 'react-icons/fi';
import store from './store';
import AppRoutes from './routes/Router';
import { verifyToken } from './store/slices/authSlice';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import Validation from './pages/Validation';
import Admin from './pages/Admin';

// Material-UI Theme Configuration
const theme = createTheme({
  direction: 'rtl',
  palette: {
    primary: {
      main: '#667eea',
      dark: '#5568d3',
      light: '#8b9ef6'
    },
    secondary: {
      main: '#764ba2',
      dark: '#5a3382',
      light: '#9a6ac9'
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c'
    },
    error: {
      main: '#f44336',
      light: '#ef5350',
      dark: '#d32f2f'
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00'
    },
    info: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2'
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff'
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
      disabled: '#bdbdbd'
    }
  },
  typography: {
    fontFamily: [
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"'
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.3
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.6
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43
    },
    button: {
      textTransform: 'none',
      fontSize: '1rem',
      fontWeight: 500
    }
  },
  shape: {
    borderRadius: 8
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontSize: '1rem',
          padding: '10px 24px',
          fontWeight: 500,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)'
          }
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #5568d3 0%, #5a3382 100%)'
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
          }
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined'
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&:hover fieldset': {
              borderColor: '#667eea'
            }
          }
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.08)'
        }
      }
    }
  }
});

// App Content Component
const AppContent = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      dispatch(verifyToken());
    }
  }, [dispatch]);

  return (
    <Router>
      <AppRoutes />
    </Router>
  );
};

// Main App Component
const App = () => {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
          <AppContent />
        </Box>
      </ThemeProvider>
    </Provider>
  );
};

export default App;
