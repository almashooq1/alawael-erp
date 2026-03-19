/**
 * Centralized status → color mappings.
 * Eliminates 11 duplicate getStatusColor copies across the codebase.
 */
import { statusColors, neutralColors } from 'theme/palette';

// ── MUI palette-name map ──────────────────────────────────────────
const STATUS_COLOR_MAP = {
  // Arabic statuses
  مرسلة: 'success',
  مدفوعة: 'success',
  مؤكدة: 'success',
  نشط: 'success',
  حاضر: 'success',

  'قيد الإرسال': 'warning',
  'قيد الانتظار': 'warning',
  'قيد المعالجة': 'warning',
  مستقر: 'warning',
  'متوقف مؤقتاً': 'warning',
  'قيد المراجعة': 'warning',
  متأخر: 'warning',

  فشلت: 'error',
  متأخرة: 'error',
  مرفوضة: 'error',
  غائب: 'error',

  مكتملة: 'info',
  مكتمل: 'info',
  عذر: 'info',
  'قيد التنفيذ': 'info',

  متقدم: 'primary',

  // English statuses
  active: 'success',
  approved: 'success',
  paid: 'success',
  online: 'success',
  pending: 'warning',
  inactive: 'error',
  rejected: 'error',
};

/**
 * Returns an MUI Chip/Badge `color` prop value for the given status string.
 * @param {string} status
 * @returns {'success'|'warning'|'error'|'info'|'primary'|'default'}
 */
export const getStatusColor = status => STATUS_COLOR_MAP[status] ?? 'default';

// ── Hex color map (for direct CSS styling) ────────────────────────
const STATUS_HEX_MAP = {
  مكتمل: statusColors.success,
  حاضر: statusColors.success,
  'قيد التنفيذ': statusColors.info,
  عذر: statusColors.info,
  متأخر: statusColors.error,
  غائب: statusColors.error,
  'قيد المراجعة': statusColors.warning,
};

/**
 * Returns a hex color string for pages that style directly with CSS colors.
 * @param {string} status
 * @returns {string} Hex color like '#4CAF50'
 */
export const getStatusHexColor = status => STATUS_HEX_MAP[status] ?? neutralColors.inactive;
