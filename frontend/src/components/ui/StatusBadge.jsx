/**
 * StatusBadge — AlAwael ERP
 * شارة الحالة — مؤشر موحد للحالات عبر جميع وحدات النظام
 *
 * Supports all system domains:
 *  - Beneficiary: active, inactive, pending, suspended, graduated, transferred
 *  - HR: present, absent, late, leave, remote, holiday
 *  - Finance: paid, unpaid, partial, overdue, cancelled, refunded
 *  - Task/Case: open, inProgress, review, done, closed, blocked
 *  - Medical/Rehab: stable, critical, improving, discharged, waitlist
 *  - General: success, warning, error, info, neutral, draft
 */

import { useTheme } from '@mui/material';
import {
  CheckCircle,
  Cancel,
  HourglassEmpty,
  Block,
  School,
  SwapHoriz,
  EventAvailable,
  EventBusy,
  AccessTime,
  BeachAccess,
  Home,
  Celebration,
  AttachMoney,
  MoneyOff,
  CallSplit,
  Warning,
  Loop,
  RateReview,
  Done,
  Lock,
  RemoveCircle,
  Favorite,
  LocalHospital,
  TrendingUp,
  ExitToApp,
  Queue,
  CheckCircleOutline,
  WarningAmber,
  ErrorOutline,
  InfoOutlined,
  Circle,
  Edit,
} from '@mui/icons-material';

// ─── Status Registry ──────────────────────────────────────────────────────────

const STATUS_MAP = {
  // ── Beneficiary ───────────────────────────────
  active: {
    label: 'نشط',
    color: 'success',
    bg: '#D1FAE5',
    fg: '#065F46',
    darkBg: '#064E3B',
    darkFg: '#6EE7B7',
    icon: CheckCircle,
    dot: '#10B981',
  },
  inactive: {
    label: 'غير نشط',
    color: 'default',
    bg: '#F1F5F9',
    fg: '#475569',
    darkBg: '#1E293B',
    darkFg: '#94A3B8',
    icon: Cancel,
    dot: '#94A3B8',
  },
  pending: {
    label: 'قيد الانتظار',
    color: 'warning',
    bg: '#FEF3C7',
    fg: '#92400E',
    darkBg: '#451A03',
    darkFg: '#FCD34D',
    icon: HourglassEmpty,
    dot: '#F59E0B',
  },
  suspended: {
    label: 'موقوف',
    color: 'error',
    bg: '#FEE2E2',
    fg: '#991B1B',
    darkBg: '#450A0A',
    darkFg: '#FCA5A5',
    icon: Block,
    dot: '#EF4444',
  },
  graduated: {
    label: 'متخرج',
    color: 'info',
    bg: '#DBEAFE',
    fg: '#1E40AF',
    darkBg: '#1E3A5F',
    darkFg: '#93C5FD',
    icon: School,
    dot: '#3B82F6',
  },
  transferred: {
    label: 'محوّل',
    color: 'secondary',
    bg: '#EDE9FE',
    fg: '#5B21B6',
    darkBg: '#2E1065',
    darkFg: '#C4B5FD',
    icon: SwapHoriz,
    dot: '#7C3AED',
  },

  // ── HR / Attendance ───────────────────────────
  present: {
    label: 'حاضر',
    color: 'success',
    bg: '#D1FAE5',
    fg: '#065F46',
    darkBg: '#064E3B',
    darkFg: '#6EE7B7',
    icon: EventAvailable,
    dot: '#10B981',
  },
  absent: {
    label: 'غائب',
    color: 'error',
    bg: '#FEE2E2',
    fg: '#991B1B',
    darkBg: '#450A0A',
    darkFg: '#FCA5A5',
    icon: EventBusy,
    dot: '#EF4444',
  },
  late: {
    label: 'متأخر',
    color: 'warning',
    bg: '#FEF3C7',
    fg: '#92400E',
    darkBg: '#451A03',
    darkFg: '#FCD34D',
    icon: AccessTime,
    dot: '#F59E0B',
  },
  leave: {
    label: 'إجازة',
    color: 'info',
    bg: '#E0F2FE',
    fg: '#075985',
    darkBg: '#0C4A6E',
    darkFg: '#7DD3FC',
    icon: BeachAccess,
    dot: '#0EA5E9',
  },
  remote: {
    label: 'عن بُعد',
    color: 'secondary',
    bg: '#EDE9FE',
    fg: '#5B21B6',
    darkBg: '#2E1065',
    darkFg: '#C4B5FD',
    icon: Home,
    dot: '#7C3AED',
  },
  holiday: {
    label: 'عطلة',
    color: 'default',
    bg: '#FCE7F3',
    fg: '#9D174D',
    darkBg: '#500724',
    darkFg: '#F9A8D4',
    icon: Celebration,
    dot: '#EC4899',
  },

  // ── Finance ───────────────────────────────────
  paid: {
    label: 'مدفوع',
    color: 'success',
    bg: '#D1FAE5',
    fg: '#065F46',
    darkBg: '#064E3B',
    darkFg: '#6EE7B7',
    icon: AttachMoney,
    dot: '#10B981',
  },
  unpaid: {
    label: 'غير مدفوع',
    color: 'error',
    bg: '#FEE2E2',
    fg: '#991B1B',
    darkBg: '#450A0A',
    darkFg: '#FCA5A5',
    icon: MoneyOff,
    dot: '#EF4444',
  },
  partial: {
    label: 'جزئي',
    color: 'warning',
    bg: '#FEF3C7',
    fg: '#92400E',
    darkBg: '#451A03',
    darkFg: '#FCD34D',
    icon: CallSplit,
    dot: '#F59E0B',
  },
  overdue: {
    label: 'متأخر السداد',
    color: 'error',
    bg: '#FEE2E2',
    fg: '#7F1D1D',
    darkBg: '#450A0A',
    darkFg: '#FCA5A5',
    icon: Warning,
    dot: '#DC2626',
  },
  cancelled: {
    label: 'ملغى',
    color: 'default',
    bg: '#F1F5F9',
    fg: '#475569',
    darkBg: '#1E293B',
    darkFg: '#94A3B8',
    icon: Cancel,
    dot: '#94A3B8',
  },
  refunded: {
    label: 'مسترد',
    color: 'info',
    bg: '#E0F2FE',
    fg: '#075985',
    darkBg: '#0C4A6E',
    darkFg: '#7DD3FC',
    icon: Loop,
    dot: '#0EA5E9',
  },

  // ── Task / Case / Workflow ────────────────────
  open: {
    label: 'مفتوح',
    color: 'info',
    bg: '#DBEAFE',
    fg: '#1E40AF',
    darkBg: '#1E3A5F',
    darkFg: '#93C5FD',
    icon: Circle,
    dot: '#3B82F6',
  },
  inProgress: {
    label: 'جاري التنفيذ',
    color: 'warning',
    bg: '#FEF3C7',
    fg: '#92400E',
    darkBg: '#451A03',
    darkFg: '#FCD34D',
    icon: Loop,
    dot: '#F59E0B',
  },
  review: {
    label: 'قيد المراجعة',
    color: 'secondary',
    bg: '#EDE9FE',
    fg: '#5B21B6',
    darkBg: '#2E1065',
    darkFg: '#C4B5FD',
    icon: RateReview,
    dot: '#7C3AED',
  },
  done: {
    label: 'منجز',
    color: 'success',
    bg: '#D1FAE5',
    fg: '#065F46',
    darkBg: '#064E3B',
    darkFg: '#6EE7B7',
    icon: Done,
    dot: '#10B981',
  },
  closed: {
    label: 'مغلق',
    color: 'default',
    bg: '#F1F5F9',
    fg: '#475569',
    darkBg: '#1E293B',
    darkFg: '#94A3B8',
    icon: Lock,
    dot: '#94A3B8',
  },
  blocked: {
    label: 'محظور',
    color: 'error',
    bg: '#FEE2E2',
    fg: '#991B1B',
    darkBg: '#450A0A',
    darkFg: '#FCA5A5',
    icon: RemoveCircle,
    dot: '#EF4444',
  },

  // ── Medical / Rehabilitation ──────────────────
  stable: {
    label: 'مستقر',
    color: 'success',
    bg: '#D1FAE5',
    fg: '#065F46',
    darkBg: '#064E3B',
    darkFg: '#6EE7B7',
    icon: Favorite,
    dot: '#10B981',
  },
  critical: {
    label: 'حرج',
    color: 'error',
    bg: '#FEE2E2',
    fg: '#991B1B',
    darkBg: '#450A0A',
    darkFg: '#FCA5A5',
    icon: LocalHospital,
    dot: '#EF4444',
  },
  improving: {
    label: 'في تحسن',
    color: 'info',
    bg: '#DBEAFE',
    fg: '#1E40AF',
    darkBg: '#1E3A5F',
    darkFg: '#93C5FD',
    icon: TrendingUp,
    dot: '#3B82F6',
  },
  discharged: {
    label: 'مخرَّج',
    color: 'default',
    bg: '#F1F5F9',
    fg: '#475569',
    darkBg: '#1E293B',
    darkFg: '#94A3B8',
    icon: ExitToApp,
    dot: '#94A3B8',
  },
  waitlist: {
    label: 'قائمة انتظار',
    color: 'warning',
    bg: '#FEF3C7',
    fg: '#92400E',
    darkBg: '#451A03',
    darkFg: '#FCD34D',
    icon: Queue,
    dot: '#F59E0B',
  },

  // ── General ───────────────────────────────────
  success: {
    label: 'ناجح',
    color: 'success',
    bg: '#D1FAE5',
    fg: '#065F46',
    darkBg: '#064E3B',
    darkFg: '#6EE7B7',
    icon: CheckCircleOutline,
    dot: '#10B981',
  },
  warning: {
    label: 'تحذير',
    color: 'warning',
    bg: '#FEF3C7',
    fg: '#92400E',
    darkBg: '#451A03',
    darkFg: '#FCD34D',
    icon: WarningAmber,
    dot: '#F59E0B',
  },
  error: {
    label: 'خطأ',
    color: 'error',
    bg: '#FEE2E2',
    fg: '#991B1B',
    darkBg: '#450A0A',
    darkFg: '#FCA5A5',
    icon: ErrorOutline,
    dot: '#EF4444',
  },
  info: {
    label: 'معلومة',
    color: 'info',
    bg: '#E0F2FE',
    fg: '#075985',
    darkBg: '#0C4A6E',
    darkFg: '#7DD3FC',
    icon: InfoOutlined,
    dot: '#0EA5E9',
  },
  neutral: {
    label: 'محايد',
    color: 'default',
    bg: '#F1F5F9',
    fg: '#475569',
    darkBg: '#1E293B',
    darkFg: '#94A3B8',
    icon: Circle,
    dot: '#94A3B8',
  },
  draft: {
    label: 'مسودة',
    color: 'default',
    bg: '#F8FAFC',
    fg: '#64748B',
    darkBg: '#1E293B',
    darkFg: '#94A3B8',
    icon: Edit,
    dot: '#94A3B8',
  },
};

// ─── Variant: dot ─────────────────────────────────────────────────────────────

function DotBadge({ config, label, size }) {
  const dotSize = size === 'small' ? 7 : size === 'large' ? 11 : 9;
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
      <Box
        sx={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          backgroundColor: config.dot,
          boxShadow: `0 0 0 2.5px ${config.dot}33`,
          flexShrink: 0,
        }}
      />
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          fontSize: size === 'small' ? '0.7rem' : size === 'large' ? '0.85rem' : '0.75rem',
          color: 'inherit',
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {string}  props.status       — key from STATUS_MAP (e.g. "active", "paid", "inProgress")
 * @param {string}  [props.customLabel]— override the display label
 * @param {'chip'|'dot'|'text'|'pill'} [props.variant='chip'] — display variant
 * @param {'small'|'medium'|'large'}   [props.size='small']   — size
 * @param {boolean} [props.showIcon=true]  — show icon in chip variant
 * @param {boolean} [props.pulse=false]    — animate dot with pulse
 * @param {string}  [props.tooltip]        — tooltip text
 * @param {object}  [props.sx]             — MUI sx override
 */
export default function StatusBadge({
  status,
  customLabel,
  variant = 'chip',
  size = 'small',
  showIcon = true,
  pulse = false,
  tooltip,
  sx = {},
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const config = STATUS_MAP[status] || STATUS_MAP.neutral;
  const label = customLabel || config.label;

  const bg = isDark ? config.darkBg : config.bg;
  const fg = isDark ? config.darkFg : config.fg;
  const IconComponent = config.icon;

  // ── dot variant ──
  if (variant === 'dot' || variant === 'text') {
    const inner = (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          color: fg,
          position: 'relative',
          ...sx,
        }}
      >
        {pulse && (
          <Box
            sx={{
              position: 'absolute',
              width: 9,
              height: 9,
              borderRadius: '50%',
              backgroundColor: config.dot,
              animation: 'pulse-ring 1.5s ease-out infinite',
              '@keyframes pulse-ring': {
                '0%': { transform: 'scale(1)', opacity: 0.6 },
                '100%': { transform: 'scale(2.2)', opacity: 0 },
              },
            }}
          />
        )}
        <DotBadge config={config} label={variant === 'text' ? '' : label} size={size} />
        {variant === 'text' && (
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, ml: 0.5, fontSize: size === 'small' ? '0.72rem' : '0.8rem' }}
          >
            {label}
          </Typography>
        )}
      </Box>
    );
    return tooltip ? <Tooltip title={tooltip}>{inner}</Tooltip> : inner;
  }

  // ── pill variant ──
  if (variant === 'pill') {
    const inner = (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: size === 'small' ? 1 : 1.5,
          py: size === 'small' ? 0.3 : 0.5,
          borderRadius: 99,
          backgroundColor: bg,
          color: fg,
          border: `1px solid ${config.dot}44`,
          fontSize: size === 'small' ? '0.7rem' : '0.78rem',
          fontWeight: 700,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          transition: 'all 0.2s',
          ...sx,
        }}
      >
        {showIcon && (
          <IconComponent sx={{ fontSize: size === 'small' ? 11 : 14, color: config.dot }} />
        )}
        {label}
      </Box>
    );
    return tooltip ? <Tooltip title={tooltip}>{inner}</Tooltip> : inner;
  }

  // ── chip variant (default) ──
  const chipSize = size === 'large' ? 'medium' : 'small';
  const iconSize = size === 'small' ? 12 : size === 'large' ? 16 : 14;

  const chipEl = (
    <Chip
      label={label}
      size={chipSize}
      icon={
        showIcon ? (
          <IconComponent
            sx={{
              fontSize: `${iconSize}px !important`,
              color: `${config.dot} !important`,
              ml: theme.direction === 'rtl' ? '6px !important' : undefined,
              mr: theme.direction === 'rtl' ? '-4px !important' : undefined,
            }}
          />
        ) : undefined
      }
      sx={{
        backgroundColor: bg,
        color: fg,
        fontWeight: 700,
        fontSize: size === 'small' ? '0.68rem' : size === 'large' ? '0.8rem' : '0.73rem',
        height: size === 'small' ? 22 : size === 'large' ? 30 : 26,
        borderRadius: '6px',
        border: `1px solid ${config.dot}33`,
        letterSpacing: '0.01em',
        '& .MuiChip-label': {
          px: showIcon ? 0.75 : 1,
          lineHeight: 1,
        },
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: isDark
            ? `${config.darkBg}cc`
            : `${config.bg}dd`,
          boxShadow: `0 0 0 3px ${config.dot}22`,
        },
        ...sx,
      }}
    />
  );

  return tooltip ? <Tooltip title={tooltip} arrow>{chipEl}</Tooltip> : chipEl;
}

// ─── Named exports ─────────────────────────────────────────────────────────────

/** Get the raw config object for a status key */
export const getStatusConfig = (status) => STATUS_MAP[status] || STATUS_MAP.neutral;

/** List of all available status keys */
export const statusKeys = Object.keys(STATUS_MAP);
