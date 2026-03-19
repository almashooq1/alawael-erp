/**
 * Theme Context - Dark/Light Mode Support
 * سياق الثيم - دعم الوضع الليلي/النهاري
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme } from '@mui/material/styles';
import educationTheme from '../theme/educationTheme';

const ThemeContext = createContext();

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeProvider');
  }
  return context;
};

export const ThemeModeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('themeMode');
    return saved || 'light';
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode(prevMode => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const theme = useMemo(() => {
    if (mode === 'dark') {
      return createTheme({
        ...educationTheme,
        palette: {
          ...educationTheme.palette,
          mode: 'dark',
          background: {
            default: '#0a1929',
            paper: '#132f4c',
          },
          text: {
            primary: '#ffffff',
            secondary: '#b2bac2',
          },
        },
      });
    }
    return educationTheme;
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, theme }}>{children}</ThemeContext.Provider>
  );
};
