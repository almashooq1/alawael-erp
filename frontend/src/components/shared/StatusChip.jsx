import { Chip, alpha } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import WarningIcon from '@mui/icons-material/Warning';
import DoneIcon from '@mui/icons-material/Done';
import { ActiveIcon } from 'utils/iconAliases';

/* ─── Status → { label, color, icon } map ─── */
const STATUS_CONFIGS = {
  // English keys
  active:      { label: 'نشط', color: '#43A047', icon: <ActiveIcon fontSize="small" /> },
  inactive:    { label: 'غير نشط', color: '#9E9E9E', icon: <BlockedIcon fontSize="small" /> },
  completed:   { label: 'مكتمل', color: '#43A047', icon: <CheckIcon fontSize="small" /> },
  in_progress: { label: 'جاري', color: '#FF9800', icon: <ActiveIcon fontSize="small" /> },
  pending:     { label: 'قيد الانتظار', color: '#FFA726', icon: <PendingIcon fontSize="small" /> },
  scheduled:   { label: 'محدد', color: '#1E88E5', icon: <PendingIcon fontSize="small" /> },
  cancelled:   { label: 'ملغي', color: '#E53935', icon: <CancelIcon fontSize="small" /> },
  rejected:    { label: 'مرفوض', color: '#D32F2F', icon: <CancelIcon fontSize="small" /> },
  approved:    { label: 'معتمد', color: '#2E7D32', icon: <DoneAllIcon fontSize="small" /> },
  draft:       { label: 'مسودة', color: '#78909C', icon: <DotIcon fontSize="small" /> },
  review:      { label: 'مراجعة', color: '#7B1FA2', icon: <WaitingIcon fontSize="small" /> },
  on_hold:     { label: 'معلق', color: '#F57C00', icon: <WaitingIcon fontSize="small" /> },
  expired:     { label: 'منتهي', color: '#B71C1C', icon: <BlockedIcon fontSize="small" /> },
  overdue:     { label: 'متأخر', color: '#D32F2F', icon: <WarningIcon fontSize="small" /> },
  no_show:     { label: 'لم يحضر', color: '#757575', icon: <BlockedIcon fontSize="small" /> },
  open:        { label: 'مفتوح', color: '#1565C0', icon: <DotIcon fontSize="small" /> },
  closed:      { label: 'مغلق', color: '#546E7A', icon: <DoneIcon fontSize="small" /> },
  resolved:    { label: 'محلول', color: '#388E3C', icon: <DoneAllIcon fontSize="small" /> },
  // Arabic keys
  'نشط':       { label: 'نشط', color: '#43A047', icon: <ActiveIcon fontSize="small" /> },
  'غير نشط':   { label: 'غير نشط', color: '#9E9E9E', icon: <BlockedIcon fontSize="small" /> },
  'مكتمل':     { label: 'مكتمل', color: '#43A047', icon: <CheckIcon fontSize="small" /> },
  'جاري':      { label: 'جاري', color: '#FF9800', icon: <ActiveIcon fontSize="small" /> },
  'معلق':      { label: 'معلق', color: '#FFA726', icon: <PendingIcon fontSize="small" /> },
  'ملغي':      { label: 'ملغي', color: '#E53935', icon: <CancelIcon fontSize="small" /> },
  'معتمد':     { label: 'معتمد', color: '#2E7D32', icon: <DoneAllIcon fontSize="small" /> },
  'مرفوض':     { label: 'مرفوض', color: '#D32F2F', icon: <CancelIcon fontSize="small" /> },
  // Priority keys
  critical:    { label: 'حرج', color: '#B71C1C', icon: <WarningIcon fontSize="small" /> },
  high:        { label: 'عالي', color: '#D32F2F', icon: <WarningIcon fontSize="small" /> },
  medium:      { label: 'متوسط', color: '#FF9800', icon: <DotIcon fontSize="small" /> },
  low:         { label: 'منخفض', color: '#43A047', icon: <DotIcon fontSize="small" /> },
};

/**
 * StatusChip — Consistent status/priority display chip.
 *
 * @param {string}  status       — Status key (English or Arabic)
 * @param {string}  [label]      — Override displayed label
 * @param {string}  [color]      — Override color hex
 * @param {boolean} [showIcon]   — Show status icon (default true)
 * @param {string}  [size]       — 'small' | 'medium' (default 'small')
 * @param {string}  [variant]    — 'filled' | 'outlined' | 'soft' (default 'soft')
 * @param {object}  [sx]         — Extra styles
 */
const StatusChip = ({
  status,
  label: labelOverride,
  color: colorOverride,
  showIcon = true,
  size = 'small',
  variant = 'soft',
  sx = {},
  ...rest
}) => {
  const key = status?.toLowerCase?.()?.replace(/[\s-]/g, '_') || 'unknown';
  const config = STATUS_CONFIGS[key] || STATUS_CONFIGS[status] || { label: status || 'غير محدد', color: '#9E9E9E', icon: <DotIcon fontSize="small" /> };
  const finalColor = colorOverride || config.color;
  const finalLabel = labelOverride || config.label;

  const chipSx = {
    fontWeight: 600,
    fontSize: size === 'small' ? '0.72rem' : '0.82rem',
    ...(variant === 'soft' && {
      background: alpha(finalColor, 0.12),
      color: finalColor,
      border: 'none',
    }),
    ...(variant === 'filled' && {
      background: finalColor,
      color: 'white',
    }),
    ...(variant === 'outlined' && {
      borderColor: finalColor,
      color: finalColor,
      background: 'transparent',
    }),
    ...sx,
  };

  return (
    <Chip
      label={finalLabel}
      size={size}
      icon={showIcon ? config.icon : undefined}
      variant={variant === 'outlined' ? 'outlined' : 'filled'}
      sx={chipSx}
      {...rest}
    />
  );
};

export { STATUS_CONFIGS };
export default StatusChip;
