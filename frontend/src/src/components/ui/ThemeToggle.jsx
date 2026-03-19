/**
 * Theme Toggle Button - Dark/Light Mode
 * زر تبديل الثيم - الوضع الليلي/النهاري
 */

import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useThemeMode } from '../../contexts/ThemeContext';

const ThemeToggle = ({ sx = {} }) => {
  const { mode, toggleTheme } = useThemeMode();

  return (
    <Tooltip title={mode === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}>
      <IconButton
        onClick={toggleTheme}
        sx={{
          ...sx,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'rotate(180deg)',
          },
        }}
        aria-label="toggle theme"
      >
        {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
