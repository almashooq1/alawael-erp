'use strict';

jest.mock('../../models/DddCaseConference', () => ({
  DDDCaseConference: {},
  DDDConferenceTemplate: {},
  CONFERENCE_TYPES: ['item1'],
  BUILTIN_TEMPLATES: ['item1'],

}));

const svc = require('../../services/dddCaseConference');

describe('dddCaseConference service', () => {
  test('CONFERENCE_TYPES is an array', () => { expect(Array.isArray(svc.CONFERENCE_TYPES)).toBe(true); });
  test('BUILTIN_TEMPLATES is an array', () => { expect(Array.isArray(svc.BUILTIN_TEMPLATES)).toBe(true); });
  test('scheduleConference resolves', async () => { await expect(svc.scheduleConference()).resolves.not.toThrow(); });
  test('addDecision resolves', async () => { await expect(svc.addDecision()).resolves.not.toThrow(); });
  test('addActionItem resolves', async () => { await expect(svc.addActionItem()).resolves.not.toThrow(); });
  test('completeConference resolves', async () => { await expect(svc.completeConference()).resolves.not.toThrow(); });
  test('getConferencesByBeneficiary resolves', async () => { await expect(svc.getConferencesByBeneficiary()).resolves.not.toThrow(); });
  test('getUpcomingConferences resolves', async () => { await expect(svc.getUpcomingConferences()).resolves.not.toThrow(); });
  test('getOverdueActions resolves', async () => { await expect(svc.getOverdueActions()).resolves.not.toThrow(); });
  test('seedTemplates resolves', async () => { await expect(svc.seedTemplates()).resolves.not.toThrow(); });
  test('getCaseConferenceDashboard returns health object', async () => {
    const d = await svc.getCaseConferenceDashboard();
    expect(d).toHaveProperty('status', 'healthy');
    expect(d).toHaveProperty('timestamp');
  });
});
