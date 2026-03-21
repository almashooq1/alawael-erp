/**
 * statusMaps.test.js — Tests for status/color/icon maps and getStatusConfig.
 * اختبارات خرائط الحالات والتكوينات
 */
import {
  GENERAL_STATUS_MAP,
  APPOINTMENT_STATUS_MAP,
  PAYMENT_STATUS_MAP,
  LEAVE_STATUS_MAP,
  ATTENDANCE_STATUS_MAP,
  INVOICE_STATUS_MAP,
  TICKET_STATUS_MAP,
  PRIORITY_MAP,
  STOCK_STATUS_MAP,
  getStatusConfig,
} from '../constants/statusMaps';

/** Every status config must have these 4 keys */
const STATUS_CONFIG_SHAPE = ['label', 'color', 'icon', 'bg'];

/** Helper: validates that every entry in a map has the correct shape */
const expectValidMap = (map, mapName) => {
  const entries = Object.entries(map);
  expect(entries.length).toBeGreaterThan(0);

  entries.forEach(([key, config]) => {
    STATUS_CONFIG_SHAPE.forEach(prop => {
      expect(config).toHaveProperty(prop);
      expect(typeof config[prop]).toBe('string');
    });
    // bg should be a hex color
    expect(config.bg).toMatch(/^#[0-9a-f]{6}$/i);
    // label should be non-empty
    expect(config.label.length).toBeGreaterThan(0);
  });
};

/* ====================================================================
 * Map shape validation — ensures every map has correct structure
 * ==================================================================== */
describe('GENERAL_STATUS_MAP', () => {
  test('has valid structure for all entries', () => {
    expectValidMap(GENERAL_STATUS_MAP, 'GENERAL_STATUS_MAP');
  });

  test('has at least 14 statuses', () => {
    expect(Object.keys(GENERAL_STATUS_MAP).length).toBeGreaterThanOrEqual(14);
  });

  test('active status is success/green', () => {
    expect(GENERAL_STATUS_MAP.active.color).toBe('success');
  });

  test('rejected status is error/red', () => {
    expect(GENERAL_STATUS_MAP.rejected.color).toBe('error');
  });

  test('pending status is warning', () => {
    expect(GENERAL_STATUS_MAP.pending.color).toBe('warning');
  });
});

describe('APPOINTMENT_STATUS_MAP', () => {
  test('has valid structure', () => {
    expectValidMap(APPOINTMENT_STATUS_MAP, 'APPOINTMENT_STATUS_MAP');
  });

  test('has 7 statuses', () => {
    expect(Object.keys(APPOINTMENT_STATUS_MAP).length).toBe(7);
  });

  test('completed is success', () => {
    expect(APPOINTMENT_STATUS_MAP.completed.color).toBe('success');
  });

  test('no_show is error', () => {
    expect(APPOINTMENT_STATUS_MAP.no_show.color).toBe('error');
  });
});

describe('PAYMENT_STATUS_MAP', () => {
  test('has valid structure', () => {
    expectValidMap(PAYMENT_STATUS_MAP, 'PAYMENT_STATUS_MAP');
  });

  test('paid is success', () => {
    expect(PAYMENT_STATUS_MAP.paid.color).toBe('success');
  });

  test('overdue is error', () => {
    expect(PAYMENT_STATUS_MAP.overdue.color).toBe('error');
  });
});

describe('LEAVE_STATUS_MAP', () => {
  test('has valid structure', () => {
    expectValidMap(LEAVE_STATUS_MAP, 'LEAVE_STATUS_MAP');
  });

  test('approved is success', () => {
    expect(LEAVE_STATUS_MAP.approved.color).toBe('success');
  });

  test('rejected is error', () => {
    expect(LEAVE_STATUS_MAP.rejected.color).toBe('error');
  });
});

describe('ATTENDANCE_STATUS_MAP', () => {
  test('has valid structure', () => {
    expectValidMap(ATTENDANCE_STATUS_MAP, 'ATTENDANCE_STATUS_MAP');
  });

  test('present is success', () => {
    expect(ATTENDANCE_STATUS_MAP.present.color).toBe('success');
  });

  test('absent is error', () => {
    expect(ATTENDANCE_STATUS_MAP.absent.color).toBe('error');
  });

  test('late is warning', () => {
    expect(ATTENDANCE_STATUS_MAP.late.color).toBe('warning');
  });
});

describe('INVOICE_STATUS_MAP', () => {
  test('has valid structure', () => {
    expectValidMap(INVOICE_STATUS_MAP, 'INVOICE_STATUS_MAP');
  });

  test('paid is success', () => {
    expect(INVOICE_STATUS_MAP.paid.color).toBe('success');
  });
});

describe('TICKET_STATUS_MAP', () => {
  test('has valid structure', () => {
    expectValidMap(TICKET_STATUS_MAP, 'TICKET_STATUS_MAP');
  });

  test('resolved is success', () => {
    expect(TICKET_STATUS_MAP.resolved.color).toBe('success');
  });

  test('open is info', () => {
    expect(TICKET_STATUS_MAP.open.color).toBe('info');
  });
});

describe('PRIORITY_MAP', () => {
  test('has valid structure', () => {
    expectValidMap(PRIORITY_MAP, 'PRIORITY_MAP');
  });

  test('has 4 levels', () => {
    expect(Object.keys(PRIORITY_MAP).length).toBe(4);
  });

  test('urgent is error', () => {
    expect(PRIORITY_MAP.urgent.color).toBe('error');
  });

  test('low is success', () => {
    expect(PRIORITY_MAP.low.color).toBe('success');
  });
});

describe('STOCK_STATUS_MAP', () => {
  test('has valid structure', () => {
    expectValidMap(STOCK_STATUS_MAP, 'STOCK_STATUS_MAP');
  });

  test('in_stock is success', () => {
    expect(STOCK_STATUS_MAP.in_stock.color).toBe('success');
  });

  test('out_of_stock is error', () => {
    expect(STOCK_STATUS_MAP.out_of_stock.color).toBe('error');
  });
});

/* ====================================================================
 * getStatusConfig
 * ==================================================================== */
describe('getStatusConfig', () => {
  test('returns from provided statusMap first', () => {
    const config = getStatusConfig('paid', PAYMENT_STATUS_MAP);
    expect(config.color).toBe('success');
    expect(config.label).toBe('مدفوع');
  });

  test('falls back to GENERAL_STATUS_MAP when not in provided map', () => {
    const config = getStatusConfig('active', PAYMENT_STATUS_MAP);
    expect(config.color).toBe('success');
    expect(config.label).toBe('نشط');
  });

  test('returns neutral default for unknown status', () => {
    const config = getStatusConfig('completely_unknown', PAYMENT_STATUS_MAP);
    expect(config.color).toBe('default');
    expect(config.icon).toBe('Help');
    expect(config.bg).toBe('#f5f5f5');
  });

  test('returns neutral default when no map provided and status unknown', () => {
    const config = getStatusConfig('xyz');
    expect(config.label).toBe('xyz');
    expect(config.color).toBe('default');
  });

  test('handles null/undefined status gracefully', () => {
    const config = getStatusConfig(null);
    expect(config.label).toBe('غير محدد');
    expect(config.color).toBe('default');
  });

  test('handles undefined status', () => {
    const config = getStatusConfig(undefined);
    expect(config.label).toBe('غير محدد');
    expect(config.color).toBe('default');
  });

  test('works without second argument', () => {
    const config = getStatusConfig('active');
    expect(config.color).toBe('success');
    expect(config.label).toBe('نشط');
  });
});
