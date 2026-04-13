/**
 * ChartCard — بطاقة الرسم البياني الاحترافية
 *
 * Premium chart container with:
 * - Gradient header with icon
 * - Title + subtitle + trend indicator
 * - Loading skeleton
 * - Empty state
 * - Action menu slot
 * - Full/compact modes
 */

import { memo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Skeleton,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  BarChart as ChartIcon,
  FullscreenOutlined,
  DownloadOutlined,
  RefreshOutlined,
} from '@mui/icons-material';

// ─── Trend badge ──────────────────────────────────────────────────────────────
function TrendBadge({ value, suffix = '%' }) {
  if (value === undefined || value === null) return null;

  const isPositive = value > 0;
  const isNeutral  = value === 0;

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.25,
        px: 0.75,
        py: 0.25,
        borderRadius: '100px',
        backgroundColor: isNeutral
          ? 'rgba(148,163,184,0.12)'
          : isPositive
          ? 'rgba(16,185,129,0.12)'
          : 'rgba(244,63,94,0.12)',
        color: isNeutral ? '#94A3B8' : isPositive ? '#10B981' : '#F43F5E',
        border: `1px solid ${
          isNeutral
            ? 'rgba(148,163,184,0.2)'
            : isPositive
            ? 'rgba(16,185,129,0.2)'
            : 'rgba(244,63,94,0.2)'
        }`,
      }}
    >
      {isNeutral ? (
        <TrendingFlat sx={{ fontSize: 13 }} />
      ) : isPositive ? (
        <TrendingUp sx={{ fontSize: 13 }} />
      ) : (
        <TrendingDown sx={{ fontSize: 13 }} />
      )}
      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, lineHeight: 1 }}>
        {isPositive ? '+' : ''}{value}{suffix}
      </Typography>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const ChartCard = memo(function ChartCard({
  title,
  subtitle,
  icon,
  gradient,
  trend,
  trendLabel,
  loading = false,
  empty = false,
  emptyMessage = 'لا توجد بيانات متاحة',
  height = 280,
  compact = false,
  actions,
  onRefresh,
  onDownload,
  children,
  sx = {},
  contentSx = {},
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [menuAnchor, setMenuAnchor] = useState(null);

  const defaultGradient = gradient || theme.custom?.gradients?.brand || 'linear-gradient(135deg, #4F46E5, #7C3AED)';

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
        position: 'relative',
        transition: 'box-shadow 0.25s ease',
        '&:hover': {
          boxShadow: isDark
            ? '0 8px 24px rgba(0,0,0,0.5)'
            : '0 8px 24px rgba(0,0,0,0.09)',
        },
        ...sx,
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          px: compact ? 2 : 2.5,
          pt: compact ? 1.75 : 2.25,
          pb: compact ? 1.25 : 1.75,
          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : alpha('#6366F1', 0.07)}`,
        }}
      >
        {/* Left: icon + title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
          {icon && (
            <Box
              sx={{
                width: compact ? 34 : 40,
                height: compact ? 34 : 40,
                borderRadius: compact ? '8px' : '10px',
                background: defaultGradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 3px 10px ${alpha('#6366F1', isDark ? 0.35 : 0.2)}`,
                color: '#FFFFFF',
                '& svg': { fontSize: compact ? 18 : 20 },
              }}
            >
              {icon}
            </Box>
          )}

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography
                sx={{
                  fontSize: compact ? '0.875rem' : '0.9375rem',
                  fontWeight: 600,
                  color: 'text.primary',
                  lineHeight: 1.3,
                }}
              >
                {title}
              </Typography>

              {trend !== undefined && (
                <TrendBadge value={trend} />
              )}
            </Box>

            {(subtitle || trendLabel) && (
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  mt: 0.2,
                  lineHeight: 1.4,
                }}
              >
                {subtitle || trendLabel}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Right: actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
          {actions}

          {onRefresh && (
            <Tooltip title="تحديث">
              <IconButton
                size="small"
                onClick={onRefresh}
                sx={{
                  color: 'text.secondary',
                  width: 28,
                  height: 28,
                  '&:hover': { color: 'primary.main' },
                }}
              >
                <RefreshOutlined sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}

          {(onDownload || onRefresh) && (
            <Tooltip title="المزيد">
              <IconButton
                size="small"
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                sx={{
                  color: 'text.secondary',
                  width: 28,
                  height: 28,
                  '&:hover': { color: 'primary.main' },
                }}
              >
                <MoreIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <CardContent
        sx={{
          flex: 1,
          p: compact ? '12px !important' : '16px !important',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          minHeight: height,
          ...contentSx,
        }}
      >
        {loading ? (
          // Loading skeleton
          <Box sx={{ width: '100%', height: height - 40 }}>
            <Skeleton variant="rectangular" width="100%" height="60%" sx={{ borderRadius: 2, mb: 1.5 }} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Skeleton variant="rectangular" width="30%" height={20} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" width="20%" height={20} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" width="25%" height={20} sx={{ borderRadius: 1 }} />
            </Box>
          </Box>
        ) : empty ? (
          // Empty state
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              gap: 1.5,
              py: 4,
              color: 'text.disabled',
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '14px',
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChartIcon sx={{ fontSize: 28, opacity: 0.4 }} />
            </Box>
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: 'text.secondary',
                textAlign: 'center',
                fontWeight: 500,
              }}
            >
              {emptyMessage}
            </Typography>
          </Box>
        ) : (
          children
        )}
      </CardContent>

      {/* ── Dropdown menu ───────────────────────────────────────────────────── */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        slotProps={{ paper: { sx: { width: 180, mt: 0.5 } } }}
      >
        {onRefresh && (
          <MenuItem onClick={() => { setMenuAnchor(null); onRefresh(); }}>
            <RefreshOutlined sx={{ fontSize: 16, mr: 1.5, color: 'text.secondary' }} />
            <Typography variant="body2">تحديث البيانات</Typography>
          </MenuItem>
        )}
        {onDownload && (
          <MenuItem onClick={() => { setMenuAnchor(null); onDownload(); }}>
            <DownloadOutlined sx={{ fontSize: 16, mr: 1.5, color: 'text.secondary' }} />
            <Typography variant="body2">تحميل الرسم</Typography>
          </MenuItem>
        )}
        <MenuItem onClick={() => setMenuAnchor(null)}>
          <FullscreenOutlined sx={{ fontSize: 16, mr: 1.5, color: 'text.secondary' }} />
          <Typography variant="body2">عرض موسّع</Typography>
        </MenuItem>
      </Menu>
    </Card>
  );
});

export default ChartCard;
