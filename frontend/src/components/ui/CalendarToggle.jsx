/**
 * CalendarToggle — Compact toggle button to switch between Hijri and Gregorian.
 * زر التبديل بين التقويم الهجري والميلادي
 *
 * Usage:
 *   <CalendarToggle />           — icon + label
 *   <CalendarToggle compact />  — icon only
 */

import { Tooltip, ToggleButton, ToggleButtonGroup, Typography, Box } from '@mui/material';
import { useCalendar } from '../../contexts/CalendarContext';

const _LABELS = {
  hijri: 'هـ',
  gregorian: 'م',
};

const TOOLTIPS = {
  hijri: 'التقويم الهجري — انقر للتبديل إلى الميلادي',
  gregorian: 'التقويم الميلادي — انقر للتبديل إلى الهجري',
};

/**
 * @param {{ compact?: boolean, sx?: object }} props
 */
export default function CalendarToggle({ compact = false, sx = {} }) {
  const { calendarType, setHijri, setGregorian } = useCalendar();

  const handleChange = (_e, newVal) => {
    if (!newVal) return; // prevent deselecting both
    if (newVal === 'hijri') setHijri();
    else setGregorian();
  };

  return (
    <Tooltip title={TOOLTIPS[calendarType]} arrow placement="bottom">
      <ToggleButtonGroup
        value={calendarType}
        exclusive
        onChange={handleChange}
        size="small"
        sx={{
          height: 32,
          bgcolor: 'action.hover',
          borderRadius: 2,
          '& .MuiToggleButton-root': {
            border: 'none',
            px: 1.5,
            py: 0.25,
            fontSize: '0.78rem',
            fontWeight: 700,
            color: 'text.secondary',
            '&.Mui-selected': {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.dark' },
            },
          },
          ...sx,
        }}
      >
        <ToggleButton value="gregorian" aria-label="التقويم الميلادي">
          {compact ? (
            <Typography variant="caption" fontWeight={700} lineHeight={1}>
              م
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" fontWeight={700} lineHeight={1}>
                م
              </Typography>
              {!compact && (
                <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.85 }}>
                  ميلادي
                </Typography>
              )}
            </Box>
          )}
        </ToggleButton>

        <ToggleButton value="hijri" aria-label="التقويم الهجري">
          {compact ? (
            <Typography variant="caption" fontWeight={700} lineHeight={1}>
              هـ
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" fontWeight={700} lineHeight={1}>
                هـ
              </Typography>
              {!compact && (
                <Typography variant="caption" sx={{ fontSize: '0.65rem', opacity: 0.85 }}>
                  هجري
                </Typography>
              )}
            </Box>
          )}
        </ToggleButton>
      </ToggleButtonGroup>
    </Tooltip>
  );
}
