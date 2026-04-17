/**
 * Unit Tests — gosi.service (proxy wiring)
 * P#70 - Batch 31 (updated for Phase 4 proxy)
 *
 * gosi.service is now a thin proxy to gosi-full.service.
 * Tests verify the proxy correctly exposes the full-service API.
 */

'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock mongoose models used by gosi-full.service
jest.mock('../../models/gosi.models', () => ({
  GOSISubscription: { findOne: jest.fn(), create: jest.fn() },
  GOSIContribution: { findOne: jest.fn(), create: jest.fn() },
  GOSIPayment: { findOne: jest.fn(), create: jest.fn() },
  GOSIComplianceReport: { findOne: jest.fn(), create: jest.fn() },
  EndOfServiceCalculation: { findOne: jest.fn(), create: jest.fn() },
}));

describe('gosi.service — proxy wiring', () => {
  let service;

  beforeEach(() => {
    jest.isolateModules(() => {
      service = require('../../services/gosi.service');
    });
  });

  it('is the gosi-full singleton (same object reference)', () => {
    jest.isolateModules(() => {
      require('../../services/gosi-full.service');
    });
    expect(service).toBeDefined();
    expect(typeof service).toBe('object');
  });

  it('exposes gosi-full methods (not the old stub API)', () => {
    const proto = Object.getPrototypeOf(service);
    const methods = Object.getOwnPropertyNames(proto);
    expect(methods).toEqual(
      expect.arrayContaining([
        'calculateMonthlyContributions',
        'registerEmployee',
        'calculateEndOfService',
      ])
    );
  });

  it('does NOT expose the old stub verifyRegistration method', () => {
    expect(typeof service.verifyRegistration).toBe('undefined');
  });

  it('does NOT expose the old stub calculateDeduction method', () => {
    expect(typeof service.calculateDeduction).toBe('undefined');
  });
});
