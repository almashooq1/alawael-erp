'use strict';

jest.mock('../../models/DddCaseConference', () => ({
  DDDCaseConference: {},
  DDDConferenceTemplate: {},
}));

const svc = require('../../services/dddCaseConference');

describe('dddCaseConference', () => {
  it('exports expected constants as arrays', () => {
    expect(Array.isArray(svc.CONFERENCE_TYPES)).toBe(true);
    expect(Array.isArray(svc.BUILTIN_TEMPLATES)).toBe(true);
  });

  it('exports all expected functions', () => {
    const fns = [
      'scheduleConference',
      'addDecision',
      'addActionItem',
      'completeConference',
      'getConferencesByBeneficiary',
      'getUpcomingConferences',
      'getOverdueActions',
      'seedTemplates',
      'getCaseConferenceDashboard',
    ];
    fns.forEach(fn => expect(typeof svc[fn]).toBe('function'));
  });

  /* TODO stubs */
  it('scheduleConference resolves', async () => {
    await expect(svc.scheduleConference()).resolves.toBeUndefined();
  });
  it('addDecision resolves', async () => {
    await expect(svc.addDecision()).resolves.toBeUndefined();
  });
  it('addActionItem resolves', async () => {
    await expect(svc.addActionItem()).resolves.toBeUndefined();
  });
  it('completeConference resolves', async () => {
    await expect(svc.completeConference()).resolves.toBeUndefined();
  });
  it('getConferencesByBeneficiary resolves', async () => {
    await expect(svc.getConferencesByBeneficiary()).resolves.toBeUndefined();
  });
  it('getUpcomingConferences resolves', async () => {
    await expect(svc.getUpcomingConferences()).resolves.toBeUndefined();
  });
  it('getOverdueActions resolves', async () => {
    await expect(svc.getOverdueActions()).resolves.toBeUndefined();
  });
  it('seedTemplates resolves', async () => {
    await expect(svc.seedTemplates()).resolves.toBeUndefined();
  });

  it('getCaseConferenceDashboard returns health info', async () => {
    const r = await svc.getCaseConferenceDashboard();
    expect(r.service).toBe('CaseConference');
    expect(r.status).toBe('healthy');
    expect(r.timestamp).toBeInstanceOf(Date);
  });
});
