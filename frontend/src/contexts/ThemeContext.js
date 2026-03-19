/**
 * Theme Context - Dark/Light Mode Support
 * سياق الثيم - دعم الوضع الليلي/النهاري
 * Upgraded to Professional Theme System
 */

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createAppTheme } from '../theme/professionalTheme';
import { getThemeMode, setThemeMode } from 'utils/storageService';

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
    return getThemeMode() || 'light';
  });

  useEffect(() => {
    setThemeMode(mode);
    // Update document class for CSS-level dark-mode hooks
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode(prevMode => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // Alias for ProHeader compatibility
  const toggleMode = toggleTheme;

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, toggleMode, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};
