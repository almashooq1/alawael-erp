/**
 * fleetManagement.constants.js
 * ثوابت إدارة الأسطول — التبويبات وبطاقات الإحصائيات
 */

// ─── Tab definitions ────────────────────────────────────────
export const TABS = [
  { label: 'المركبات', icon: <DirectionsCarIcon />, key: 'vehicles' },
  { label: 'السائقون', icon: <PersonIcon />, key: 'drivers' },
  { label: 'الصيانة', icon: <BuildIcon />, key: 'maintenance' },
  { label: 'الوقود', icon: <LocalGasStationIcon />, key: 'fuel' },
  { label: 'تتبع GPS', icon: <GpsFixedIcon />, key: 'gps' },
];

// ─── Stat cards builder ─────────────────────────────────────
/**
 * @param {object} data - fleet data keyed by tab key
 * @returns {Array<{label: string, value: number, color: string}>}
 */
export const STAT_CARDS = (data = {}) => [
  {
    label: 'إجمالي المركبات',
    value: data.vehicles?.length ?? 0,
    color: '#1976d2',
  },
  {
    label: 'السائقون النشطون',
    value: data.drivers?.filter(d => d.status === 'active').length ?? 0,
    color: '#2e7d32',
  },
  {
    label: 'طلبات الصيانة',
    value: data.maintenance?.length ?? 0,
    color: '#ed6c02',
  },
  {
    label: 'سجلات الوقود',
    value: data.fuel?.length ?? 0,
    color: '#9c27b0',
  },
];
