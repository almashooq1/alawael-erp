/**
 * Tests for apiEndpoints constants
 * @module apiEndpoints.test
 *
 * Covers:
 * - All top-level groups exist
 * - All static values are non-empty strings starting with '/'
 * - All dynamic functions return correct interpolated paths
 * - No duplicate static paths across groups
 */

import API from '../constants/apiEndpoints';

describe('API Endpoints', () => {
  // ─── Structure ──────────────────────────────────────
  describe('structure', () => {
    const expectedGroups = [
      'AUTH', 'DASHBOARD', 'MODULES', 'USERS', 'CRM',
      'FINANCE', 'HR', 'PAYROLL', 'STUDENTS', 'BENEFICIARIES',
      'SESSIONS', 'CARE_PLANS', 'DISABILITY', 'INVENTORY',
      'PURCHASING', 'DOCUMENTS', 'NOTIFICATIONS', 'QUALITY',
      'FLEET', 'MESSAGES', 'REPORTS', 'SETTINGS',
    ];

    it.each(expectedGroups)('has %s group', group => {
      expect(API[group]).toBeDefined();
      expect(typeof API[group]).toBe('object');
    });
  });

  // ─── Static values: non-empty strings starting with / ─
  describe('static path values', () => {
    const allStatic = [];

    Object.keys(API).forEach(group => {
      Object.entries(API[group]).forEach(([key, val]) => {
        if (typeof val === 'string') {
          allStatic.push({ group, key, val });
        }
      });
    });

    it('all static values are strings starting with /', () => {
      allStatic.forEach(({ group, key, val }) => {
        expect(val).toBeTruthy();
        expect(val.startsWith('/')).toBe(true);
      });
    });

    it('no static value is empty', () => {
      allStatic.forEach(({ val }) => {
        expect(val.length).toBeGreaterThan(1);
      });
    });
  });

  // ─── AUTH ───────────────────────────────────────────
  describe('AUTH', () => {
    it('LOGIN is /auth/login', () => {
      expect(API.AUTH.LOGIN).toBe('/auth/login');
    });
    it('REGISTER is /auth/register', () => {
      expect(API.AUTH.REGISTER).toBe('/auth/register');
    });
    it('REFRESH is /auth/refresh-token', () => {
      expect(API.AUTH.REFRESH).toBe('/auth/refresh-token');
    });
    it('ME is /auth/me', () => {
      expect(API.AUTH.ME).toBe('/auth/me');
    });
  });

  // ─── Dynamic functions ─────────────────────────────
  describe('dynamic path functions', () => {
    // MODULES
    it('MODULES.BY_KEY("hr") returns /modules/hr', () => {
      expect(API.MODULES.BY_KEY('hr')).toBe('/modules/hr');
    });

    // USERS
    it('USERS.BY_ID("u1") returns /users/u1', () => {
      expect(API.USERS.BY_ID('u1')).toBe('/users/u1');
    });
    it('USERS.CHANGE_ROLE("u2") returns /users/u2/role', () => {
      expect(API.USERS.CHANGE_ROLE('u2')).toBe('/users/u2/role');
    });

    // CRM
    it('CRM.CONTACT("c1") returns /crm/contacts/c1', () => {
      expect(API.CRM.CONTACT('c1')).toBe('/crm/contacts/c1');
    });
    it('CRM.LEAD("l1") returns /crm/leads/l1', () => {
      expect(API.CRM.LEAD('l1')).toBe('/crm/leads/l1');
    });

    // FINANCE
    it('FINANCE.ACCOUNT("a1") returns /finance/accounts/a1', () => {
      expect(API.FINANCE.ACCOUNT('a1')).toBe('/finance/accounts/a1');
    });
    it('FINANCE.POST_ENTRY("j1") returns /finance/journal-entries/j1/post', () => {
      expect(API.FINANCE.POST_ENTRY('j1')).toBe('/finance/journal-entries/j1/post');
    });
    it('FINANCE.APPROVE_EXPENSE("e1") returns /finance/expenses/e1/approve', () => {
      expect(API.FINANCE.APPROVE_EXPENSE('e1')).toBe('/finance/expenses/e1/approve');
    });

    // HR
    it('HR.EMPLOYEE("emp1") returns /hr/employees/emp1', () => {
      expect(API.HR.EMPLOYEE('emp1')).toBe('/hr/employees/emp1');
    });
    it('HR.APPROVE_LEAVE("lv1") returns /hr/leaves/lv1/approve', () => {
      expect(API.HR.APPROVE_LEAVE('lv1')).toBe('/hr/leaves/lv1/approve');
    });
    it('HR.REJECT_LEAVE("lv2") returns /hr/leaves/lv2/reject', () => {
      expect(API.HR.REJECT_LEAVE('lv2')).toBe('/hr/leaves/lv2/reject');
    });

    // PAYROLL — multi-param
    it('PAYROLL.MONTHLY(3, 2026) returns /payroll/monthly/3/2026', () => {
      expect(API.PAYROLL.MONTHLY(3, 2026)).toBe('/payroll/monthly/3/2026');
    });
    it('PAYROLL.EMPLOYEE_YEAR("e1", 2025) returns /payroll/employee/e1/year/2025', () => {
      expect(API.PAYROLL.EMPLOYEE_YEAR('e1', 2025)).toBe('/payroll/employee/e1/year/2025');
    });
    it('PAYROLL.STATS(1, 2026) returns /payroll/stats/1/2026', () => {
      expect(API.PAYROLL.STATS(1, 2026)).toBe('/payroll/stats/1/2026');
    });
    it('PAYROLL.REPORT_WPS(3, 2026) returns /payroll/reports/wps/3/2026', () => {
      expect(API.PAYROLL.REPORT_WPS(3, 2026)).toBe('/payroll/reports/wps/3/2026');
    });
    it('PAYROLL.REPORT_GOSI(3, 2026) returns /payroll/reports/gosi/3/2026', () => {
      expect(API.PAYROLL.REPORT_GOSI(3, 2026)).toBe('/payroll/reports/gosi/3/2026');
    });
    it('PAYROLL.REPORT_BANK(3, 2026) returns /payroll/reports/bank-transfer/3/2026', () => {
      expect(API.PAYROLL.REPORT_BANK(3, 2026)).toBe('/payroll/reports/bank-transfer/3/2026');
    });
    it('PAYROLL.APPROVE("p1") returns /payroll/p1/approve', () => {
      expect(API.PAYROLL.APPROVE('p1')).toBe('/payroll/p1/approve');
    });

    // STUDENTS
    it('STUDENTS.BY_ID("s1") returns /students/s1', () => {
      expect(API.STUDENTS.BY_ID('s1')).toBe('/students/s1');
    });

    // BENEFICIARIES
    it('BENEFICIARIES.BY_ID("b1") returns /beneficiaries/b1', () => {
      expect(API.BENEFICIARIES.BY_ID('b1')).toBe('/beneficiaries/b1');
    });

    // SESSIONS
    it('SESSIONS.BY_ID("sess1") returns /sessions/sess1', () => {
      expect(API.SESSIONS.BY_ID('sess1')).toBe('/sessions/sess1');
    });

    // CARE_PLANS
    it('CARE_PLANS.BY_ID("cp1") returns /care-plans/cp1', () => {
      expect(API.CARE_PLANS.BY_ID('cp1')).toBe('/care-plans/cp1');
    });

    // INVENTORY
    it('INVENTORY.BY_ID("inv1") returns /inventory/inv1', () => {
      expect(API.INVENTORY.BY_ID('inv1')).toBe('/inventory/inv1');
    });

    // PURCHASING
    it('PURCHASING.APPROVE("po1") returns /purchasing/po1/approve', () => {
      expect(API.PURCHASING.APPROVE('po1')).toBe('/purchasing/po1/approve');
    });

    // DOCUMENTS
    it('DOCUMENTS.DOWNLOAD("d1") returns /documents/d1/download', () => {
      expect(API.DOCUMENTS.DOWNLOAD('d1')).toBe('/documents/d1/download');
    });

    // NOTIFICATIONS
    it('NOTIFICATIONS.MARK_READ("n1") returns /notifications/n1/read', () => {
      expect(API.NOTIFICATIONS.MARK_READ('n1')).toBe('/notifications/n1/read');
    });

    // FLEET
    it('FLEET.BY_ID("f1") returns /fleet/f1', () => {
      expect(API.FLEET.BY_ID('f1')).toBe('/fleet/f1');
    });

    // MESSAGES
    it('MESSAGES.BY_ID("m1") returns /messages/m1', () => {
      expect(API.MESSAGES.BY_ID('m1')).toBe('/messages/m1');
    });

    // REPORTS
    it('REPORTS.BY_TYPE("financial") returns /reports/financial', () => {
      expect(API.REPORTS.BY_TYPE('financial')).toBe('/reports/financial');
    });
  });

  // ─── No unexpected duplicate static paths ───────────
  describe('no unexpected duplicate static paths', () => {
    // Some paths share GET/POST on the same URL (e.g. CARE_PLANS.LIST & CREATE)
    const ALLOWED_DUPLICATES = new Set(['/care-plans']);

    it('static paths are unique (except allowed REST duplicates)', () => {
      const paths = [];
      Object.values(API).forEach(group => {
        Object.values(group).forEach(val => {
          if (typeof val === 'string') paths.push(val);
        });
      });
      const seen = {};
      const unexpectedDupes = [];
      paths.forEach(p => {
        if (seen[p] && !ALLOWED_DUPLICATES.has(p)) {
          unexpectedDupes.push(p);
        }
        seen[p] = true;
      });
      expect(unexpectedDupes).toEqual([]);
    });
  });
});
