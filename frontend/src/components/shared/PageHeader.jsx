/**
 * PageHeader — رأس الصفحة الاحترافي
 *
 * Reusable page header component with:
 * - Page title + subtitle
 * - Gradient accent line
 * - Action buttons slot
 * - Breadcrumbs (optional)
 * - Status chip (optional)
 * - Stats row (optional)
 */

import { memo } from 'react';
import {
  useTheme,
  alpha,
} from '@mui/material';

// ─── Stat mini-card ───────────────────────────────────────────────────────────
function StatItem({ label, value, color, icon }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        px: 2.5,
        py: 1.25,
        borderRadius: 2,
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : alpha(color || '#6366F1', 0.06),
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : alpha(color || '#6366F1', 0.12)}`,
        minWidth: 90,
        gap: 0.25,
      }}
    >
      {icon && (
        <Box sx={{ color: color || 'primary.main', mb: 0.25 }}>
          {icon}
        </Box>
      )}
      <Typography
        sx={{
          fontSize: '1.125rem',
          fontWeight: 700,
          color: color || 'primary.main',
          lineHeight: 1.2,
        }}
      >
        {value}
      </Typography>
      <Typography
        sx={{
          fontSize: '0.7rem',
          color: 'text.secondary',
          whiteSpace: 'nowrap',
          fontWeight: 500,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
const PageHeader = memo(function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  status,
  statusColor = 'primary',
  stats = [],
  gradient,
  noDivider = false,
  compact = false,
  sx = {},
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const defaultGradient = theme.custom?.gradients?.brand || 'linear-gradient(135deg, #4F46E5, #7C3AED)';
  const accentGradient  = gradient || defaultGradient;

  return (
    <Box sx={{ mb: compact ? 2 : 3, ...sx }}>
      {/* Main header row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 1.5 },
          justifyContent: 'space-between',
          mb: stats.length > 0 ? 2.5 : noDivider ? 0 : 1.5,
        }}
      >
        {/* Left: Icon + Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, flex: 1, minWidth: 0 }}>
          {/* Icon container */}
          {icon && (
            <Box
              sx={{
                width: compact ? 40 : 48,
                height: compact ? 40 : 48,
                borderRadius: compact ? '10px' : '12px',
                background: accentGradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 4px 12px ${alpha('#6366F1', isDark ? 0.4 : 0.25)}`,
                color: '#FFFFFF',
                '& svg': { fontSize: compact ? 20 : 24 },
              }}
            >
              {icon}
            </Box>
          )}

          {/* Title + subtitle */}
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography
                variant={compact ? 'h6' : 'h5'}
                sx={{
                  fontWeight: 700,
                  color: 'text.primary',
                  lineHeight: 1.3,
                  letterSpacing: '-0.01em',
                }}
              >
                {title}
              </Typography>

              {status && (
                <Chip
                  label={status}
                  color={statusColor}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    height: 22,
                  }}
                />
              )}
            </Box>

            {subtitle && (
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  mt: 0.25,
                  lineHeight: 1.5,
                  fontSize: '0.875rem',
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Right: Actions */}
        {actions && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flexShrink: 0,
              flexWrap: 'wrap',
            }}
          >
            {actions}
          </Box>
        )}
      </Box>

      {/* Stats row */}
      {stats.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mb: noDivider ? 0 : 1.5,
            flexWrap: 'wrap',
          }}
        >
          {stats.map((stat, i) => (
            <StatItem key={i} {...stat} />
          ))}
        </Box>
      )}

      {/* Accent divider */}
      {!noDivider && (
        <Box sx={{ position: 'relative', height: '1px' }}>
          {/* Full divider */}
          <Divider />
          {/* Gradient accent on top */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100px',
              height: '2px',
              background: accentGradient,
              borderRadius: '1px',
            }}
          />
        </Box>
      )}
    </Box>
  );
});

export default PageHeader;
