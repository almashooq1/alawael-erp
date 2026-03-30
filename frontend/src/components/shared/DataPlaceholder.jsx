/**
 * DataPlaceholder — حالة البيانات الفارغة الاحترافية
 *
 * Beautiful empty states for every context:
 * - Built-in SVG illustrations per type
 * - Title + message + optional CTA
 * - Compact/full modes
 * - Animated entrance
 */

import { memo } from 'react';
import { Box, Typography, Button, useTheme, alpha } from '@mui/material';
import {
  SearchOff,
  CloudOff,
  FolderOff,
  PeopleOutlined,
  BarChartOutlined,
  AssignmentOutlined,
  AddCircleOutline,
  RefreshOutlined,
  InboxOutlined,
  WarningAmberOutlined,
  LockOutlined,
  WifiOff,
} from '@mui/icons-material';

// ─── Illustration SVGs ────────────────────────────────────────────────────────
const illustrations = {
  empty: ({ color, size }) => (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="50" fill={alpha(color, 0.08)} />
      <circle cx="60" cy="60" r="36" fill={alpha(color, 0.10)} />
      <path d="M44 52h32M44 60h24M44 68h16" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.4"/>
      <circle cx="60" cy="60" r="20" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.35"/>
      <path d="M72 72l10 10" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.5"/>
      <circle cx="82" cy="82" r="5" fill={alpha(color, 0.2)} stroke={color} strokeWidth="2" opacity="0.6"/>
    </svg>
  ),

  search: ({ color, size }) => (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <circle cx="52" cy="52" r="30" fill={alpha(color, 0.08)} stroke={color} strokeWidth="1.5" strokeDasharray="5 3" opacity="0.4"/>
      <circle cx="52" cy="52" r="18" fill={alpha(color, 0.08)} />
      <path d="M46 46h12M46 52h8M46 58h10" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
      <path d="M76 76l-14-14" stroke={color} strokeWidth="3.5" strokeLinecap="round" opacity="0.6"/>
      <path d="M73 70l8 8a3 3 0 010 4l-1 1a3 3 0 01-4 0l-8-8" fill={alpha(color, 0.25)} stroke={color} strokeWidth="1.5" opacity="0.5"/>
      <path d="M42 40l-4-4M62 40l4-4M42 64l-4 4M62 64l4 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.2"/>
    </svg>
  ),

  noData: ({ color, size }) => (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <rect x="20" y="30" width="80" height="60" rx="8" fill={alpha(color, 0.06)} stroke={color} strokeWidth="1.5" opacity="0.5"/>
      <path d="M20 46h80" stroke={color} strokeWidth="1.5" opacity="0.3"/>
      <circle cx="30" cy="38" r="3" fill={alpha(color, 0.3)}/>
      <circle cx="41" cy="38" r="3" fill={alpha(color, 0.2)}/>
      <circle cx="52" cy="38" r="3" fill={alpha(color, 0.15)}/>
      <path d="M35 62h50M35 72h36" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.25"/>
      <path d="M58 55l6 6-6 6M50 55l-6 6 6 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.35"/>
    </svg>
  ),

  error: ({ color, size }) => (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <circle cx="60" cy="60" r="42" fill={alpha(color, 0.07)} />
      <circle cx="60" cy="60" r="30" fill={alpha(color, 0.09)} stroke={color} strokeWidth="1.5" opacity="0.4"/>
      <path d="M60 44v20" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.6"/>
      <circle cx="60" cy="72" r="2.5" fill={color} opacity="0.6"/>
      <path d="M44 44l32 32M76 44L44 76" stroke={alpha(color, 0.15)} strokeWidth="16" strokeLinecap="round"/>
    </svg>
  ),

  offline: ({ color, size }) => (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <path d="M30 70c0-16.6 13.4-30 30-30s30 13.4 30 30" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.3" strokeDasharray="5 3"/>
      <path d="M40 80c0-11 9-20 20-20s20 9 20 20" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
      <circle cx="60" cy="88" r="5" fill={alpha(color, 0.4)} stroke={color} strokeWidth="1.5"/>
      <path d="M24 48l72 24" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
      <circle cx="24" cy="48" r="3" fill={color} opacity="0.5"/>
      <circle cx="96" cy="72" r="3" fill={color} opacity="0.5"/>
    </svg>
  ),

  permission: ({ color, size }) => (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <rect x="32" y="54" width="56" height="42" rx="8" fill={alpha(color, 0.08)} stroke={color} strokeWidth="1.5" opacity="0.5"/>
      <path d="M42 54V42a18 18 0 0136 0v12" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.4"/>
      <circle cx="60" cy="72" r="7" fill={alpha(color, 0.2)} stroke={color} strokeWidth="1.5" opacity="0.6"/>
      <path d="M60 72v8" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
};

// ─── Config per type ──────────────────────────────────────────────────────────
const CONFIGS = {
  empty: {
    defaultTitle:   'لا توجد بيانات',
    defaultMessage: 'لم يتم إضافة أي عناصر بعد. ابدأ بإضافة عنصر جديد.',
    color:          '#94A3B8',
    IllustrationKey: 'empty',
  },
  search: {
    defaultTitle:   'لا نتائج للبحث',
    defaultMessage: 'لم يتم العثور على نتائج تطابق معايير البحث. جرّب تعديل الفلاتر.',
    color:          '#6366F1',
    IllustrationKey: 'search',
  },
  noData: {
    defaultTitle:   'لا توجد إحصاءات',
    defaultMessage: 'لا تتوفر بيانات كافية لعرض هذا التقرير حالياً.',
    color:          '#0EA5E9',
    IllustrationKey: 'noData',
  },
  error: {
    defaultTitle:   'حدث خطأ',
    defaultMessage: 'تعذّر تحميل البيانات. يرجى المحاولة مرة أخرى.',
    color:          '#F43F5E',
    IllustrationKey: 'error',
  },
  offline: {
    defaultTitle:   'لا يوجد اتصال',
    defaultMessage: 'تحقق من اتصالك بالإنترنت ثم أعد المحاولة.',
    color:          '#F59E0B',
    IllustrationKey: 'offline',
  },
  permission: {
    defaultTitle:   'غير مصرّح',
    defaultMessage: 'ليس لديك صلاحية للوصول إلى هذا المحتوى.',
    color:          '#8B5CF6',
    IllustrationKey: 'permission',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
const DataPlaceholder = memo(function DataPlaceholder({
  type = 'empty',
  title,
  message,
  action,
  actionLabel,
  secondaryAction,
  secondaryLabel,
  compact = false,
  illustrationSize,
  color,
  sx = {},
}) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const config    = CONFIGS[type] || CONFIGS.empty;
  const finalColor = color || config.color;
  const IllKey    = config.IllustrationKey;
  const Illustration = illustrations[IllKey];
  const size      = illustrationSize || (compact ? 80 : 110);

  const finalTitle   = title   || config.defaultTitle;
  const finalMessage = message || config.defaultMessage;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: compact ? 3 : 6,
        px: 3,
        textAlign: 'center',
        gap: compact ? 1 : 1.5,
        ...sx,
      }}
    >
      {/* Illustration */}
      <Box
        sx={{
          mb: compact ? 0.5 : 1,
          animation: 'floatIllustration 3s ease-in-out infinite alternate',
          '@keyframes floatIllustration': {
            from: { transform: 'translateY(0px)' },
            to:   { transform: 'translateY(-6px)' },
          },
        }}
      >
        {Illustration ? (
          <Illustration color={finalColor} size={size} />
        ) : (
          <Box
            sx={{
              width: size,
              height: size,
              borderRadius: '50%',
              backgroundColor: alpha(finalColor, 0.1),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <InboxOutlined sx={{ fontSize: size * 0.45, color: finalColor, opacity: 0.5 }} />
          </Box>
        )}
      </Box>

      {/* Title */}
      <Typography
        variant={compact ? 'subtitle2' : 'h6'}
        sx={{
          fontWeight: 700,
          color: 'text.primary',
          letterSpacing: '-0.01em',
        }}
      >
        {finalTitle}
      </Typography>

      {/* Message */}
      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          maxWidth: 340,
          lineHeight: 1.7,
          fontSize: compact ? '0.8rem' : '0.875rem',
        }}
      >
        {finalMessage}
      </Typography>

      {/* Actions */}
      {(action || secondaryAction) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            mt: compact ? 0.5 : 1,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {action && (
            <Button
              variant="contained"
              size={compact ? 'small' : 'medium'}
              onClick={action}
              startIcon={<AddCircleOutline sx={{ fontSize: 18 }} />}
              sx={{
                background: `linear-gradient(135deg, ${finalColor}, ${theme.palette.secondary?.main || '#7C3AED'})`,
                boxShadow: `0 4px 12px ${alpha(finalColor, 0.3)}`,
                '&:hover': {
                  boxShadow: `0 6px 16px ${alpha(finalColor, 0.4)}`,
                  transform: 'translateY(-1px)',
                },
              }}
            >
              {actionLabel || 'إضافة جديد'}
            </Button>
          )}

          {secondaryAction && (
            <Button
              variant="outlined"
              size={compact ? 'small' : 'medium'}
              onClick={secondaryAction}
              startIcon={<RefreshOutlined sx={{ fontSize: 18 }} />}
              sx={{
                borderColor: alpha(finalColor, 0.4),
                color: finalColor,
                '&:hover': {
                  borderColor: finalColor,
                  backgroundColor: alpha(finalColor, 0.06),
                },
              }}
            >
              {secondaryLabel || 'إعادة المحاولة'}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
});

export default DataPlaceholder;
