/**
 * Sessions constants — types, statuses, initial form, demo data
 * Aligned with backend TherapySession model (UPPERCASE statuses)
 */
import { statusColors, neutralColors } from 'theme/palette';

export const SESSION_TYPES = [
  { value: 'علاج طبيعي', label: 'علاج طبيعي', color: statusColors.indigo },
  { value: 'علاج وظيفي', label: 'علاج وظيفي', color: statusColors.info },
  { value: 'نطق وتخاطب', label: 'نطق وتخاطب', color: statusColors.cyan },
  { value: 'علاج سلوكي', label: 'علاج سلوكي', color: statusColors.teal },
  { value: 'علاج نفسي', label: 'علاج نفسي', color: statusColors.purple },
  { value: 'أخرى', label: 'أخرى', color: neutralColors.fallback },
];

/** Backend-aligned UPPERCASE statuses + legacy lowercase aliases */
export const STATUS_MAP = {
  // ── Primary (backend canonical) ──
  SCHEDULED: { label: 'مجدولة', color: 'info' },
  CONFIRMED: { label: 'مؤكدة', color: 'primary' },
  COMPLETED: { label: 'مكتملة', color: 'success' },
  CANCELLED_BY_PATIENT: { label: 'ألغاها المستفيد', color: 'error' },
  CANCELLED_BY_CENTER: { label: 'ألغاها المركز', color: 'error' },
  NO_SHOW: { label: 'لم يحضر', color: 'default' },
  // ── Legacy lowercase (backward compat) ──
  scheduled: { label: 'مجدولة', color: 'info' },
  active: { label: 'نشطة', color: 'primary' },
  completed: { label: 'مكتملة', color: 'success' },
  cancelled: { label: 'ملغاة', color: 'error' },
  pending: { label: 'قيد الانتظار', color: 'warning' },
  confirmed: { label: 'مؤكدة', color: 'success' },
};

/** Filter dropdown options (primary statuses only) */
export const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'الكل' },
  { value: 'SCHEDULED', label: 'مجدولة' },
  { value: 'CONFIRMED', label: 'مؤكدة' },
  { value: 'COMPLETED', label: 'مكتملة' },
  { value: 'CANCELLED_BY_PATIENT', label: 'ألغاها المستفيد' },
  { value: 'CANCELLED_BY_CENTER', label: 'ألغاها المركز' },
  { value: 'NO_SHOW', label: 'لم يحضر' },
];

export const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'بدون تكرار' },
  { value: 'daily', label: 'يومياً' },
  { value: 'weekly', label: 'أسبوعياً' },
  { value: 'biweekly', label: 'كل أسبوعين' },
  { value: 'monthly', label: 'شهرياً' },
];

export const INITIAL_FORM = {
  title: '',
  type: 'علاج طبيعي',
  date: '',
  startTime: '',
  endTime: '',
  participants: '',
  recurrence: 'none',
  notes: '',
};

/** Demo fallback data aligned with backend schema */
export const generateDemoSessions = () => [
  {
    _id: '1',
    title: 'جلسة علاج طبيعي - أحمد',
    sessionType: 'علاج طبيعي',
    status: 'SCHEDULED',
    date: '2026-03-15T10:00:00',
    startTime: '10:00',
    endTime: '11:00',
    participants: [{ name: 'أحمد محمد' }],
    createdBy: { name: 'د. سارة' },
    recurrence: 'weekly',
  },
  {
    _id: '2',
    title: 'جلسة نطق وتخاطب - فاطمة',
    sessionType: 'نطق وتخاطب',
    status: 'COMPLETED',
    date: '2026-03-14T09:00:00',
    startTime: '09:00',
    endTime: '10:00',
    participants: [{ name: 'فاطمة حسن' }],
    createdBy: { name: 'أ. محمد' },
    recurrence: 'none',
  },
  {
    _id: '3',
    title: 'جلسة علاج سلوكي - خالد',
    sessionType: 'علاج سلوكي',
    status: 'CONFIRMED',
    date: '2026-03-15T14:00:00',
    startTime: '14:00',
    endTime: '15:00',
    participants: [{ name: 'خالد سعيد' }],
    createdBy: { name: 'د. نورة' },
    recurrence: 'biweekly',
  },
  {
    _id: '4',
    title: 'جلسة علاج وظيفي - مريم',
    sessionType: 'علاج وظيفي',
    status: 'CANCELLED_BY_PATIENT',
    date: '2026-03-13T11:00:00',
    startTime: '11:00',
    endTime: '12:00',
    participants: [{ name: 'مريم علي' }],
    createdBy: { name: 'د. فهد' },
    recurrence: 'none',
  },
  {
    _id: '5',
    title: 'جلسة علاج نفسي - عبدالله',
    sessionType: 'علاج نفسي',
    status: 'SCHEDULED',
    date: '2026-03-16T08:00:00',
    startTime: '08:00',
    endTime: '09:00',
    participants: [{ name: 'عبدالله أحمد' }],
    createdBy: { name: 'د. عائشة' },
    recurrence: 'weekly',
  },
  {
    _id: '6',
    title: 'جلسة علاج طبيعي - سارة',
    sessionType: 'علاج طبيعي',
    status: 'NO_SHOW',
    date: '2026-03-12T10:00:00',
    startTime: '10:00',
    endTime: '11:00',
    participants: [{ name: 'سارة ناصر' }],
    createdBy: { name: 'د. سارة' },
    recurrence: 'none',
  },
];

/** Get the session type (supports both `type` and `sessionType` fields) */
export const getSessionType = session => session?.sessionType || session?.type || 'أخرى';

export const getTypeColor = type => {
  const found = SESSION_TYPES.find(t => t.value === type);
  return found?.color || neutralColors.fallback;
};

export const formatDate = iso => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
};

export const formatTime = timeStr => {
  if (!timeStr) return '—';
  // Simple time string "HH:mm"
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) return timeStr;
  try {
    return new Date(timeStr).toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timeStr;
  }
};

/** Normalize any status string to a key in STATUS_MAP */
export const normalizeStatus = status => {
  if (!status) return 'SCHEDULED';
  if (STATUS_MAP[status]) return status;
  const upper = status.toUpperCase();
  if (STATUS_MAP[upper]) return upper;
  const legacy = { ACTIVE: 'CONFIRMED', PENDING: 'SCHEDULED', CANCELLED: 'CANCELLED_BY_CENTER' };
  return legacy[upper] || status;
};
