/**
 * Unit Tests — kpiCalculation.service.js
 * getPeriodDates — pure date math, NO mocks needed
 */
'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const { getPeriodDates } = require('../../services/kpiCalculation.service');

// ═══════════════════════════════════════
//  monthly
// ═══════════════════════════════════════
describe('getPeriodDates — monthly', () => {
  it('January', () => {
    const [start, end] = getPeriodDates('monthly', 2025, 1);
    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBe(0); // Jan
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(0);
    expect(end.getDate()).toBe(31);
  });

  it('February non-leap', () => {
    const [start, end] = getPeriodDates('monthly', 2025, 2);
    expect(start.getMonth()).toBe(1);
    expect(end.getDate()).toBe(28);
  });

  it('February leap year', () => {
    const [start, end] = getPeriodDates('monthly', 2024, 2);
    expect(end.getDate()).toBe(29);
  });

  it('December', () => {
    const [start, end] = getPeriodDates('monthly', 2025, 12);
    expect(start.getMonth()).toBe(11);
    expect(end.getMonth()).toBe(11);
    expect(end.getDate()).toBe(31);
  });

  it('end has time 23:59:59', () => {
    const [, end] = getPeriodDates('monthly', 2025, 6);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
  });
});

// ═══════════════════════════════════════
//  quarterly
// ═══════════════════════════════════════
describe('getPeriodDates — quarterly', () => {
  it('Q1', () => {
    const [start, end] = getPeriodDates('quarterly', 2025, 1);
    expect(start.getMonth()).toBe(0); // Jan
    expect(end.getMonth()).toBe(2); // Mar
    expect(end.getDate()).toBe(31);
  });

  it('Q2', () => {
    const [start, end] = getPeriodDates('quarterly', 2025, 2);
    expect(start.getMonth()).toBe(3); // Apr
    expect(end.getMonth()).toBe(5); // Jun
    expect(end.getDate()).toBe(30);
  });

  it('Q3', () => {
    const [start, end] = getPeriodDates('quarterly', 2025, 3);
    expect(start.getMonth()).toBe(6); // Jul
    expect(end.getMonth()).toBe(8); // Sep
    expect(end.getDate()).toBe(30);
  });

  it('Q4', () => {
    const [start, end] = getPeriodDates('quarterly', 2025, 4);
    expect(start.getMonth()).toBe(9); // Oct
    expect(end.getMonth()).toBe(11); // Dec
    expect(end.getDate()).toBe(31);
  });
});

// ═══════════════════════════════════════
//  yearly
// ═══════════════════════════════════════
describe('getPeriodDates — yearly', () => {
  it('full year range', () => {
    const [start, end] = getPeriodDates('yearly', 2025, 1);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(11);
    expect(end.getDate()).toBe(31);
  });

  it('period param ignored for yearly', () => {
    const [s1, e1] = getPeriodDates('yearly', 2025, 1);
    const [s2, e2] = getPeriodDates('yearly', 2025, 5);
    expect(s1.getTime()).toBe(s2.getTime());
    expect(e1.getTime()).toBe(e2.getTime());
  });
});

// ═══════════════════════════════════════
//  daily
// ═══════════════════════════════════════
describe('getPeriodDates — daily', () => {
  it('day 1 = Jan 1', () => {
    const [start, end] = getPeriodDates('daily', 2025, 1);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(end.getDate()).toBe(1);
    expect(end.getHours()).toBe(23);
  });

  it('day 32 = Feb 1', () => {
    const [start] = getPeriodDates('daily', 2025, 32);
    expect(start.getMonth()).toBe(1); // Feb
    expect(start.getDate()).toBe(1);
  });

  it('day 365 = Dec 31 (non-leap)', () => {
    const [start] = getPeriodDates('daily', 2025, 365);
    expect(start.getMonth()).toBe(11);
    expect(start.getDate()).toBe(31);
  });
});

// ═══════════════════════════════════════
//  default (same as monthly)
// ═══════════════════════════════════════
describe('getPeriodDates — default', () => {
  it('unknown type falls back to monthly', () => {
    const [s1, e1] = getPeriodDates('custom', 2025, 3);
    const [s2, e2] = getPeriodDates('monthly', 2025, 3);
    expect(s1.getTime()).toBe(s2.getTime());
    expect(e1.getTime()).toBe(e2.getTime());
  });
});
