import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { lightTheme } from '../themes/lightTheme';
import { darkTheme } from '../themes/darkTheme';

type ThemeMode = 'light' | 'dark';
type Theme = typeof lightTheme | typeof darkTheme;

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultMode = 'light'
}) => {
  // Get saved theme from localStorage or use default
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme-mode');
    return (saved as ThemeMode) || defaultMode;
  });

  const theme = mode === 'light' ? lightTheme : darkTheme;

  // Save theme preference to localStorage
  useEffect(() => {
    localStorage.setItem('theme-mode', mode);

    // Update document root attributes
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  // Apply theme variables to CSS
  useEffect(() => {
    const root = document.documentElement;

    // Apply colors
    root.style.setProperty('--color-primary', theme.colors.primary[500]);
    root.style.setProperty('--color-secondary', theme.colors.secondary[500]);
    root.style.setProperty('--color-background', theme.colors.background.default);
    root.style.setProperty('--color-surface', theme.colors.surface.primary);
    root.style.setProperty('--color-text-primary', theme.colors.text.primary);
    root.style.setProperty('--color-text-secondary', theme.colors.text.secondary);
    root.style.setProperty('--color-border', theme.colors.border.main);
    root.style.setProperty('--color-success', theme.colors.success.main);
    root.style.setProperty('--color-error', theme.colors.error.main);
    root.style.setProperty('--color-warning', theme.colors.warning.main);
    root.style.setProperty('--color-info', theme.colors.info.main);

    // Apply spacing
    root.style.setProperty('--spacing-xs', theme.spacing.xs);
    root.style.setProperty('--spacing-sm', theme.spacing.sm);
    root.style.setProperty('--spacing-md', theme.spacing.md);
    root.style.setProperty('--spacing-lg', theme.spacing.lg);
    root.style.setProperty('--spacing-xl', theme.spacing.xl);

    // Apply border radius
    root.style.setProperty('--radius-sm', theme.borderRadius.sm);
    root.style.setProperty('--radius-md', theme.borderRadius.md);
    root.style.setProperty('--radius-lg', theme.borderRadius.lg);

    // Apply typography
    root.style.setProperty('--font-family', theme.typography.fontFamily.primary);
    root.style.setProperty('--font-size-base', theme.typography.fontSize.base);
  }, [theme]);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  const value: ThemeContextType = {
    theme,
    mode,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Helper hook for styled components
export const useThemedStyles = () => {
  const { theme, mode } = useTheme();

  return {
    theme,
    mode,
    isDark: mode === 'dark',
    isLight: mode === 'light',
  };
};
