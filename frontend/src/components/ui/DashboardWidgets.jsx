/**
 * Professional Dashboard Widgets — AlAwael ERP
 * ودجات لوحة التحكم الاحترافية
 *
 * Components:
 * - StatCard: KPI card with gradient, icon, trend arrow, sparkline
 * - ChartCard: Wrapper card for embedding charts
 * - ProgressRing: Circular progress with percentage
 * - ActivityFeed: Timeline-style activity list
 * - QuickAction: Action button grid
 * - WelcomeCard: Personalized greeting banner
 */

import { Box, Card, CardContent, Typography, IconButton, Chip, Avatar,
  List, ListItem, ListItemAvatar, ListItemText, LinearProgress, Tooltip,
  useTheme, alpha, Grid, Button, Stack } from '@mui/material';
import {
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  TrendingFlat as TrendFlatIcon,
  MoreVert as MoreIcon,
  ArrowForward as ArrowIcon,
  Circle as DotIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

// ─── STAT CARD ───────────────────────────────────────────────────────────────
export const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,         // { value: +12, label: 'مقارنة بالشهر السابق' }
  color = 'primary', // primary | success | warning | error | info
  variant = 'gradient', // gradient | outlined | filled
  onClick,
  loading = false,
}) => {
  const theme = useTheme();
  const palette = theme.palette[color] || theme.palette.primary;

  const trendIcon = trend?.value > 0
    ? <TrendUpIcon sx={{ fontSize: 16 }} />
    : trend?.value < 0
    ? <TrendDownIcon sx={{ fontSize: 16 }} />
    : <TrendFlatIcon sx={{ fontSize: 16 }} />;

  const trendColor = trend?.value > 0 ? 'success.main' : trend?.value < 0 ? 'error.main' : 'text.secondary';

  const cardSx = {
    gradient: {
      background: `linear-gradient(135deg, ${palette.main}, ${palette.dark || palette.main})`,
      color: '#fff',
      '& .stat-subtitle': { color: 'rgba(255,255,255,0.75)' },
      '& .stat-icon-bg': { backgroundColor: 'rgba(255,255,255,0.15)' },
      '& .stat-trend': { color: 'rgba(255,255,255,0.85)' },
    },
    outlined: {
      border: `1px solid ${alpha(palette.main, 0.2)}`,
      backgroundColor: alpha(palette.main, 0.02),
      '& .stat-icon-bg': { backgroundColor: alpha(palette.main, 0.1), color: palette.main },
    },
    filled: {
      backgroundColor: alpha(palette.main, 0.06),
      '& .stat-icon-bg': { backgroundColor: alpha(palette.main, 0.12), color: palette.main },
    },
  };

  return (
    <Card
      component={motion.div}
      whileHover={{ y: -4, boxShadow: theme.shadows[8] }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: '16px',
        overflow: 'hidden',
        position: 'relative',
        ...cardSx[variant],
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        {/* Top Row */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          <Box
            className="stat-icon-bg"
            sx={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
            }}
          >
            {icon}
          </Box>
          {trend && (
            <Chip
              className="stat-trend"
              icon={trendIcon}
              label={`${trend.value > 0 ? '+' : ''}${trend.value}%`}
              size="small"
              sx={{
                height: 24,
                fontSize: '0.75rem',
                fontWeight: 700,
                color: variant === 'gradient' ? 'rgba(255,255,255,0.9)' : trendColor,
                backgroundColor: variant === 'gradient' ? 'rgba(255,255,255,0.15)' : alpha(
                  trend.value > 0 ? theme.palette.success.main : theme.palette.error.main, 0.1),
                '& .MuiChip-icon': {
                  color: 'inherit',
                },
              }}
            />
          )}
        </Box>

        {/* Value */}
        {loading ? (
          <Box sx={{ mb: 1 }}>
            <LinearProgress color={variant === 'gradient' ? 'inherit' : color} sx={{ borderRadius: 2 }} />
          </Box>
        ) : (
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{ mb: 0.5, lineHeight: 1.2, direction: 'ltr', textAlign: 'right' }}
          >
            {value}
          </Typography>
        )}

        {/* Title */}
        <Typography variant="body2" fontWeight={500} className="stat-subtitle" color={variant === 'gradient' ? undefined : 'text.secondary'}>
          {title}
        </Typography>

        {/* Subtitle / Trend Label */}
        {(subtitle || trend?.label) && (
          <Typography variant="caption" className="stat-subtitle" sx={{ mt: 0.5, display: 'block', opacity: 0.8 }}>
            {subtitle || trend?.label}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

// ─── CHART CARD ──────────────────────────────────────────────────────────────
export const ChartCard = ({
  title,
  subtitle,
  action,       // ReactNode: e.g., dropdown or button
  children,     // Chart component
  height = 300,
  noPadding = false,
}) => {
  const theme = useTheme();

  return (
    <Card sx={{ borderRadius: '16px', overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, pt: 2.5, pb: 1 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Box>

      {/* Chart Body */}
      <Box sx={{ height, px: noPadding ? 0 : 2.5, pb: noPadding ? 0 : 2 }}>
        {children}
      </Box>
    </Card>
  );
};

// ─── PROGRESS RING ───────────────────────────────────────────────────────────
export const ProgressRing = ({
  value = 0,
  size = 100,
  thickness = 8,
  color = 'primary',
  label,
  sublabel,
}) => {
  const theme = useTheme();
  const palette = theme.palette[color] || theme.palette.primary;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={alpha(palette.main, 0.12)}
            strokeWidth={thickness}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={palette.main}
            strokeWidth={thickness}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        {/* Center Label */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h6" fontWeight={800} color={palette.main}>
            {value}%
          </Typography>
        </Box>
      </Box>
      {label && (
        <Typography variant="body2" fontWeight={600} textAlign="center">
          {label}
        </Typography>
      )}
      {sublabel && (
        <Typography variant="caption" color="text.secondary" textAlign="center">
          {sublabel}
        </Typography>
      )}
    </Box>
  );
};

// ─── ACTIVITY FEED ───────────────────────────────────────────────────────────
export const ActivityFeed = ({
  title = 'آخر الأنشطة',
  items = [],
  maxItems = 6,
  onViewAll,
}) => {
  const theme = useTheme();

  return (
    <Card sx={{ borderRadius: '16px' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, pt: 2.5, pb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
        {onViewAll && (
          <Button size="small" endIcon={<ArrowIcon sx={{ fontSize: 14, transform: 'rotate(180deg)' }} />} onClick={onViewAll}>
            عرض الكل
          </Button>
        )}
      </Box>
      <List disablePadding>
        {items.slice(0, maxItems).map((item, idx) => (
          <ListItem
            key={item.id || idx}
            sx={{
              px: 2.5,
              py: 1.25,
              '&:not(:last-child)': { borderBottom: `1px solid ${theme.palette.divider}` },
            }}
          >
            <ListItemAvatar>
              <Avatar
                sx={{
                  width: 38,
                  height: 38,
                  backgroundColor: alpha(
                    (theme.palette[item.color] || theme.palette.primary).main,
                    0.12
                  ),
                  color: (theme.palette[item.color] || theme.palette.primary).main,
                }}
              >
                {item.icon}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Typography variant="body2" fontWeight={500}>{item.title}</Typography>
              }
              secondary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                  <Typography variant="caption" color="text.secondary">{item.subtitle}</Typography>
                  <DotIcon sx={{ fontSize: 4, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.disabled">{item.time}</Typography>
                </Box>
              }
            />
            {item.badge && (
              <Chip label={item.badge} size="small" color={item.color || 'default'} variant="outlined" />
            )}
          </ListItem>
        ))}
      </List>
    </Card>
  );
};

// ─── QUICK ACTION ────────────────────────────────────────────────────────────
export const QuickAction = ({ actions = [] }) => {
  const theme = useTheme();

  return (
    <Card sx={{ borderRadius: '16px' }}>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
          إجراءات سريعة
        </Typography>
        <Grid container spacing={1.5}>
          {actions.map((action, idx) => (
            <Grid item xs={6} sm={4} md={3} key={idx}>
              <Box
                onClick={action.onClick}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  p: 2,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: `1px solid ${theme.palette.divider}`,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    transform: 'translateY(-2px)',
                    boxShadow: theme.shadows[2],
                  },
                }}
              >
                <Avatar
                  sx={{
                    width: 44,
                    height: 44,
                    backgroundColor: alpha(
                      (theme.palette[action.color] || theme.palette.primary).main,
                      0.1
                    ),
                    color: (theme.palette[action.color] || theme.palette.primary).main,
                  }}
                >
                  {action.icon}
                </Avatar>
                <Typography variant="caption" fontWeight={600} textAlign="center" noWrap>
                  {action.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

// ─── WELCOME CARD ────────────────────────────────────────────────────────────
export const WelcomeCard = ({ userName, role, stats = [] }) => {
  const theme = useTheme();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 17) return 'مساء الخير';
    return 'مساء الخير';
  };

  return (
    <Card
      sx={{
        borderRadius: '16px',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark || theme.palette.secondary.main})`,
        color: '#fff',
        position: 'relative',
      }}
    >
      {/* Decorative circles */}
      <Box
        sx={{
          position: 'absolute',
          top: -40,
          left: -40,
          width: 160,
          height: 160,
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.06)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -30,
          left: '40%',
          width: 120,
          height: 120,
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.04)',
        }}
      />

      <CardContent sx={{ position: 'relative', zIndex: 1, p: 3 }}>
        <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
          {getGreeting()}، {userName || 'مستخدم'} 👋
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.85, mb: 3 }}>
          مرحباً بك في نظام الأوائل — لوحة التحكم الخاصة بك جاهزة
        </Typography>

        {stats.length > 0 && (
          <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
            {stats.map((stat, idx) => (
              <Box key={idx}>
                <Typography variant="h5" fontWeight={800}>{stat.value}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.75 }}>{stat.label}</Typography>
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
};
