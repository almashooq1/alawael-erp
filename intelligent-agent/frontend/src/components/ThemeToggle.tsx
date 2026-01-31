import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Theme Toggle Component
 * Switches between light and dark themes
 */
const ThemeToggle: React.FC = () => {
  const { mode, toggleTheme, theme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-button"
      style={{
        position: 'relative',
        width: '56px',
        height: '28px',
        borderRadius: theme.borderRadius.full,
        backgroundColor: mode === 'dark'
          ? theme.colors.primary[600]
          : theme.colors.primary[500],
        border: 'none',
        cursor: 'pointer',
        transition: `background-color ${theme.transitions.duration.normal} ${theme.transitions.easing.easeInOut}`,
        boxShadow: theme.shadows.sm,
        padding: '2px',
      }}
      aria-label={mode === 'dark' ? 'تبديل إلى الوضع الفاتح' : 'تبديل إلى الوضع الداكن'}
      title={mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {/* Toggle Circle */}
      <div
        style={{
          position: 'absolute',
          top: '2px',
          left: mode === 'dark' ? '30px' : '2px',
          width: '24px',
          height: '24px',
          borderRadius: theme.borderRadius.full,
          backgroundColor: '#FFFFFF',
          transition: `left ${theme.transitions.duration.normal} ${theme.transitions.easing.easeInOut}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: theme.shadows.md,
        }}
      >
        {/* Icon */}
        {mode === 'dark' ? (
          // Moon Icon
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
              fill={theme.colors.primary[600]}
              stroke={theme.colors.primary[600]}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          // Sun Icon
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="12"
              r="5"
              fill={theme.colors.warning.main}
            />
            <path
              d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
              stroke={theme.colors.warning.main}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      {/* Background Icons */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: mode === 'dark' ? '8px' : 'calc(100% - 22px)',
          transform: 'translateY(-50%)',
          transition: `left ${theme.transitions.duration.normal} ${theme.transitions.easing.easeInOut}`,
          opacity: 0.7,
        }}
      >
        {mode === 'dark' ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeWidth="2"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;
