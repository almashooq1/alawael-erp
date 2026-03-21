/**
 * storageService.test.js — Centralized localStorage service
 * خدمة التخزين المحلي — 27 تصدير، تغطية كاملة
 */
import {
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
} from '../utils/storageService';
import storageService from '../utils/storageService';

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

/* ===============================================================
   KEYS registry
   =============================================================== */
describe('KEYS', () => {
  test('exports KEYS object', () => {
    expect(storageService.KEYS).toBeDefined();
    expect(storageService.KEYS.LANGUAGE).toBe('language');
    expect(storageService.KEYS.THEME_MODE).toBe('themeMode');
  });
});

/* ===============================================================
   Language
   =============================================================== */
describe('Language', () => {
  test('getLanguage defaults to "ar"', () => {
    expect(getLanguage()).toBe('ar');
  });

  test('setLanguage + getLanguage round-trip', () => {
    setLanguage('en');
    expect(getLanguage()).toBe('en');
  });
});

/* ===============================================================
   Portal
   =============================================================== */
describe('Portal', () => {
  test('getPortal returns null by default', () => {
    expect(getPortal()).toBeNull();
  });

  test('getPortal reads from localStorage', () => {
    localStorage.setItem('portal', 'admin');
    expect(getPortal()).toBe('admin');
  });

  test('removePortal clears portal', () => {
    localStorage.setItem('portal', 'teacher');
    removePortal();
    expect(getPortal()).toBeNull();
  });

  test('getUserPortal returns null by default', () => {
    expect(getUserPortal()).toBeNull();
  });

  test('getUserPortal reads from localStorage', () => {
    localStorage.setItem('userPortal', 'student');
    expect(getUserPortal()).toBe('student');
  });
});

/* ===============================================================
   Theme
   =============================================================== */
describe('Theme', () => {
  test('getThemeMode defaults to "light"', () => {
    expect(getThemeMode()).toBe('light');
  });

  test('setThemeMode + getThemeMode round-trip', () => {
    setThemeMode('dark');
    expect(getThemeMode()).toBe('dark');
  });
});

/* ===============================================================
   Notification Preferences
   =============================================================== */
describe('NotificationPrefs', () => {
  test('getNotificationPrefs returns null by default', () => {
    expect(getNotificationPrefs()).toBeNull();
  });

  test('set + get round-trip', () => {
    const prefs = { email: true, sms: false };
    setNotificationPrefs(prefs);
    expect(getNotificationPrefs()).toEqual(prefs);
  });
});

/* ===============================================================
   Document List Preferences
   =============================================================== */
describe('DocumentListPrefs', () => {
  test('getDocumentListPrefs returns null by default', () => {
    expect(getDocumentListPrefs()).toBeNull();
  });

  test('set + get round-trip', () => {
    const prefs = { sortBy: 'date', pageSize: 25 };
    setDocumentListPrefs(prefs);
    expect(getDocumentListPrefs()).toEqual(prefs);
  });

  test('mergeDocumentListPrefs merges partial', () => {
    setDocumentListPrefs({ sortBy: 'date', pageSize: 25 });
    mergeDocumentListPrefs({ pageSize: 50 });
    const result = getDocumentListPrefs();
    expect(result.sortBy).toBe('date');
    expect(result.pageSize).toBe(50);
  });

  test('mergeDocumentListPrefs works on empty', () => {
    mergeDocumentListPrefs({ view: 'grid' });
    expect(getDocumentListPrefs()).toEqual({ view: 'grid' });
  });
});

/* ===============================================================
   Org Branding
   =============================================================== */
describe('OrgBranding', () => {
  test('getOrgBranding defaults', () => {
    const b = getOrgBranding();
    expect(b.name).toBe('');
    expect(b.color).toBe('#667eea');
    expect(b.logo).toBe('');
  });

  test('setOrgBranding + getOrgBranding round-trip', () => {
    setOrgBranding({ name: 'العلاويل', color: '#ff0000', logo: 'logo.png' });
    const b = getOrgBranding();
    expect(b.name).toBe('العلاويل');
    expect(b.color).toBe('#ff0000');
    expect(b.logo).toBe('logo.png');
  });

  test('setOrgBranding defaults empty name/color', () => {
    setOrgBranding({ name: '', color: '', logo: '' });
    const b = getOrgBranding();
    expect(b.name).toBe('');
    expect(b.color).toBe('#667eea');
  });

  test('setOrgBranding skips logo if falsy', () => {
    setOrgBranding({ name: 'Test', color: '#000' });
    // logo key should not be set
    expect(localStorage.getItem('orgLogo')).toBeNull();
  });
});

/* ===============================================================
   Attendance Columns
   =============================================================== */
describe('AttendanceCols', () => {
  test('getAttendanceCols returns defaultCols when empty', () => {
    const defaults = ['name', 'status'];
    expect(getAttendanceCols(defaults)).toEqual(defaults);
  });

  test('set + get round-trip', () => {
    const cols = ['name', 'status', 'time'];
    setAttendanceCols(cols);
    expect(getAttendanceCols([])).toEqual(cols);
  });
});

/* ===============================================================
   Organization Employees
   =============================================================== */
describe('OrgEmployees', () => {
  test('getOrgEmployees returns null by default', () => {
    expect(getOrgEmployees()).toBeNull();
  });

  test('set + get round-trip', () => {
    const emps = [{ id: 1, name: 'أحمد' }];
    setOrgEmployees(emps);
    expect(getOrgEmployees()).toEqual(emps);
  });
});

/* ===============================================================
   User ID
   =============================================================== */
describe('UserId', () => {
  test('getUserId returns null by default', () => {
    expect(getUserId()).toBeNull();
  });

  test('reads from localStorage', () => {
    localStorage.setItem('userId', 'usr_123');
    expect(getUserId()).toBe('usr_123');
  });
});

/* ===============================================================
   Student Reports
   =============================================================== */
describe('StudentReports', () => {
  test('getStudentReportsFilters returns null by default', () => {
    expect(getStudentReportsFilters()).toBeNull();
  });

  test('set + get filters round-trip', () => {
    const filters = { grade: '5', section: 'A' };
    setStudentReportsFilters(filters);
    expect(getStudentReportsFilters()).toEqual(filters);
  });

  test('getStudentReportsReport returns null by default', () => {
    expect(getStudentReportsReport()).toBeNull();
  });

  test('set + get report round-trip', () => {
    const report = { title: 'Monthly', data: [1, 2, 3] };
    setStudentReportsReport(report);
    expect(getStudentReportsReport()).toEqual(report);
  });

  test('clearStudentReports removes both keys', () => {
    setStudentReportsFilters({ a: 1 });
    setStudentReportsReport({ b: 2 });
    clearStudentReports();
    expect(getStudentReportsFilters()).toBeNull();
    expect(getStudentReportsReport()).toBeNull();
  });
});

/* ===============================================================
   Error resilience
   =============================================================== */
describe('error resilience', () => {
  test('getLanguage handles localStorage.getItem throwing', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(getLanguage()).toBe('ar');
  });

  test('setLanguage handles localStorage.setItem throwing', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => setLanguage('en')).not.toThrow();
  });

  test('getNotificationPrefs handles malformed JSON', () => {
    localStorage.setItem('notificationPreferences', '{invalid json}');
    expect(getNotificationPrefs()).toBeNull();
  });
});

/* ===============================================================
   Default export
   =============================================================== */
describe('default export', () => {
  test('exports all public functions', () => {
    expect(typeof storageService.getLanguage).toBe('function');
    expect(typeof storageService.setLanguage).toBe('function');
    expect(typeof storageService.getThemeMode).toBe('function');
    expect(typeof storageService.setThemeMode).toBe('function');
    expect(typeof storageService.getOrgBranding).toBe('function');
    expect(typeof storageService.setOrgBranding).toBe('function');
    expect(typeof storageService.clearStudentReports).toBe('function');
  });
});
