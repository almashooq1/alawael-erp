/**
 * Theme Toggle Button - Dark/Light Mode
 * زر تبديل الثيم - الوضع الليلي/النهاري
 */

import { useThemeMode } from 'contexts/ThemeContext';

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
        aria-label="تبديل الوضع"
      >
        {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;
