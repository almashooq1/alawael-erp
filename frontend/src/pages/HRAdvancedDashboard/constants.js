/**
 * HRAdvancedDashboard – shared constants & helpers.
 */
import { statusColors, chartColors, neutralColors } from '../../theme/palette';

// ── Chart colors for pie ────────────────────
export const HR_CHART_COLORS = [
  statusColors.success,
  statusColors.info,
  statusColors.warning,
  chartColors.category[6],
  statusColors.purple,
  chartColors.category[8],
  chartColors.category[5],
  neutralColors.fallback,
];

// ── Status label / color map ────────────────
export const STATUS_MAP = {
  approved: { label: 'موافق عليها', color: 'success' },
  pending: { label: 'قيد المراجعة', color: 'warning' },
  rejected: { label: 'مرفوضة', color: 'error' },
  completed: { label: 'مكتمل', color: 'success' },
  in_progress: { label: 'قيد التنفيذ', color: 'info' },
  draft: { label: 'مسودة', color: 'default' },
  'موافق عليها': { label: 'موافق عليها', color: 'success' },
  'قيد المراجعة': { label: 'قيد المراجعة', color: 'warning' },
  مرفوضة: { label: 'مرفوضة', color: 'error' },
};

// ── Attendance status helpers ────────────────
export const isPresent = s => s === 'present' || s === 'حاضر';
export const isLate = s => s === 'late' || s === 'متأخر';
export const isAbsent = s => s === 'absent' || s === 'غائب' || s === 'on_leave' || s === 'إجازة';
