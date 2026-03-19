/**
 * Centralized localStorage Service
 * خدمة مركزية لإدارة التخزين المحلي
 *
 * All non-auth localStorage access goes through this module.
 * Auth-related keys (token, refreshToken, user) stay in tokenStorage.js.
 *
 * Benefits:
 * - Single point of change for key names
 * - Safe JSON parse/stringify with fallbacks
 * - Easy to swap with sessionStorage or IndexedDB later
 * - Testable (can mock one module)
 */

// ---------------------------------------------------------------------------
// Key Registry — every localStorage key in one place
// ---------------------------------------------------------------------------
const KEYS = {
  LANGUAGE: 'language',
  USER_PORTAL: 'userPortal',
  PORTAL: 'portal',
  THEME_MODE: 'themeMode',
  NOTIFICATION_PREFS: 'notificationPreferences',
  DOCUMENT_LIST_PREFS: 'documentListPrefs',
  ORG_NAME: 'orgName',
  ORG_COLOR: 'orgColor',
  ORG_LOGO: 'orgLogo',
  ATTENDANCE_COLS: 'attendanceCols',
  ORG_EMPLOYEES: 'organizationEmployees',
  USER_ID: 'userId',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get a raw string value. */
function getRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Set a raw string value. */
function setRaw(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota exceeded — silently ignore */
  }
}

/** Get a JSON-parsed value with a fallback. */
function getJSON(key, fallback = null) {
  const raw = getRaw(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** Set a JSON-stringified value. */
function setJSON(key, value) {
  setRaw(key, JSON.stringify(value));
}

/** Remove a key. */
function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Student Reports keys (static — one cached report at a time)
// ---------------------------------------------------------------------------
const STUDENT_REPORTS_FILTERS = 'studentReports:filters';
const STUDENT_REPORTS_REPORT = 'studentReports:lastReport';

// ---------------------------------------------------------------------------
// Public API — Language
// ---------------------------------------------------------------------------
export function getLanguage() {
  return getRaw(KEYS.LANGUAGE) || 'ar';
}
export function setLanguage(lang) {
  setRaw(KEYS.LANGUAGE, lang);
}

// ---------------------------------------------------------------------------
// Public API — Portal
// ---------------------------------------------------------------------------
export function getPortal() {
  return getRaw(KEYS.PORTAL) || null;
}
export function removePortal() {
  remove(KEYS.PORTAL);
}
export function getUserPortal() {
  return getRaw(KEYS.USER_PORTAL) || null;
}

// ---------------------------------------------------------------------------
// Public API — Theme
// ---------------------------------------------------------------------------
export function getThemeMode() {
  return getRaw(KEYS.THEME_MODE) || 'light';
}
export function setThemeMode(mode) {
  setRaw(KEYS.THEME_MODE, mode);
}

// ---------------------------------------------------------------------------
// Public API — Notification Preferences
// ---------------------------------------------------------------------------
export function getNotificationPrefs() {
  return getJSON(KEYS.NOTIFICATION_PREFS, null);
}
export function setNotificationPrefs(prefs) {
  setJSON(KEYS.NOTIFICATION_PREFS, prefs);
}

// ---------------------------------------------------------------------------
// Public API — Document List Preferences
// ---------------------------------------------------------------------------
export function getDocumentListPrefs() {
  return getJSON(KEYS.DOCUMENT_LIST_PREFS, null);
}
export function setDocumentListPrefs(prefs) {
  setJSON(KEYS.DOCUMENT_LIST_PREFS, prefs);
}
export function mergeDocumentListPrefs(partial) {
  const existing = getDocumentListPrefs() || {};
  setJSON(KEYS.DOCUMENT_LIST_PREFS, { ...existing, ...partial });
}

// ---------------------------------------------------------------------------
// Public API — Org Branding
// ---------------------------------------------------------------------------
export function getOrgBranding() {
  return {
    name: getRaw(KEYS.ORG_NAME) || '',
    color: getRaw(KEYS.ORG_COLOR) || '#667eea',
    logo: getRaw(KEYS.ORG_LOGO) || '',
  };
}
export function setOrgBranding({ name, color, logo }) {
  setRaw(KEYS.ORG_NAME, name || '');
  setRaw(KEYS.ORG_COLOR, color || '#667eea');
  if (logo) setRaw(KEYS.ORG_LOGO, logo);
}

// ---------------------------------------------------------------------------
// Public API — Attendance Columns
// ---------------------------------------------------------------------------
export function getAttendanceCols(defaultCols) {
  return getJSON(KEYS.ATTENDANCE_COLS, defaultCols);
}
export function setAttendanceCols(cols) {
  setJSON(KEYS.ATTENDANCE_COLS, cols);
}

// ---------------------------------------------------------------------------
// Public API — Organization Employees (Org Chart)
// ---------------------------------------------------------------------------
export function getOrgEmployees() {
  return getJSON(KEYS.ORG_EMPLOYEES, null);
}
export function setOrgEmployees(employees) {
  setJSON(KEYS.ORG_EMPLOYEES, employees);
}

// ---------------------------------------------------------------------------
// Public API — User ID
// ---------------------------------------------------------------------------
export function getUserId() {
  return getRaw(KEYS.USER_ID) || null;
}

// ---------------------------------------------------------------------------
// Public API — Student Reports (static keys)
// ---------------------------------------------------------------------------
export function getStudentReportsFilters() {
  return getJSON(STUDENT_REPORTS_FILTERS, null);
}
export function setStudentReportsFilters(filters) {
  setJSON(STUDENT_REPORTS_FILTERS, filters);
}
export function getStudentReportsReport() {
  return getJSON(STUDENT_REPORTS_REPORT, null);
}
export function setStudentReportsReport(data) {
  setJSON(STUDENT_REPORTS_REPORT, data);
}
export function clearStudentReports() {
  remove(STUDENT_REPORTS_FILTERS);
  remove(STUDENT_REPORTS_REPORT);
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------
const storageService = {
  KEYS,
  getLanguage,
  setLanguage,
  getPortal,
  removePortal,
  getUserPortal,
  getThemeMode,
  setThemeMode,
  getNotificationPrefs,
  setNotificationPrefs,
  getDocumentListPrefs,
  setDocumentListPrefs,
  mergeDocumentListPrefs,
  getOrgBranding,
  setOrgBranding,
  getAttendanceCols,
  setAttendanceCols,
  getOrgEmployees,
  setOrgEmployees,
  getUserId,
  getStudentReportsFilters,
  setStudentReportsFilters,
  getStudentReportsReport,
  setStudentReportsReport,
  clearStudentReports,
};

export default storageService;
