/**
 * 📊 ChartTooltip — Shared Dark-mode Aware Recharts Tooltip
 * تولتيب مشترك للرسوم البيانية يدعم الوضع الداكن
 *
 * Usage:
 *   import { ChartTooltip, FinanceChartTooltip } from './shared/ChartTooltip';
 *   <Tooltip content={<ChartTooltip />} />
 *   <Tooltip content={<FinanceChartTooltip />} />
 */

import { useTheme } from '@mui/material';
import { formatCurrency } from 'services/dashboardService';

/**
 * Generic chart tooltip with dark mode support.
 * Displays label + color-coded payload entries.
 */
export const ChartTooltip = ({ active, payload, label, formatValue }) => {
  const theme = useTheme();
  if (!active || !payload?.length) return null;
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        background: isDark ? 'rgba(30,30,50,0.95)' : 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(12px)',
        borderRadius: 2.5,
        p: 1.5,
        boxShadow: isDark
          ? '0 8px 32px rgba(0,0,0,0.4)'
          : '0 4px 20px rgba(0,0,0,0.1)',
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, color: isDark ? '#e0e0e0' : '#333', display: 'block', mb: 0.5 }}
      >
        {label}
      </Typography>
      {payload.map((entry, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: entry.color,
              flexShrink: 0,
            }}
          />
          <Typography variant="caption" sx={{ color: entry.color, fontWeight: 600 }}>
            {entry.name || 'القيمة'}:{' '}
            {formatValue
              ? formatValue(entry.value)
              : typeof entry.value === 'number'
                ? entry.value.toLocaleString('ar-SA')
                : entry.value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

/**
 * Finance-specific tooltip: formats values as SAR currency.
 */
export const FinanceChartTooltip = (props) => (
  <ChartTooltip {...props} formatValue={formatCurrency} />
);

export default ChartTooltip;
