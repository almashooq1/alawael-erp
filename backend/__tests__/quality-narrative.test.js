'use strict';

const registry = require('../config/quality-narrative.registry');
const { createQualityNarrativeService } = require('../services/quality/qualityNarrative.service');

describe('PII redactor', () => {
  test('redacts Saudi national IDs', () => {
    const out = registry.redact('Patient 1098765432 visited last Tuesday');
    expect(out).toContain('[ID]');
    expect(out).not.toContain('1098765432');
  });

  test('redacts email + phone', () => {
    const out = registry.redact('Contact ali.smith@example.com on 0501234567');
    expect(out).toContain('[EMAIL]');
    expect(out).toContain('[PHONE]');
  });

  test('redacts IBAN', () => {
    const out = registry.redact('Transfer to SA0380000000608010167519 today');
    expect(out).toContain('[IBAN]');
  });

  test('leaves non-PII numbers under threshold alone', () => {
    const out = registry.redact('We saw 5 incidents and 3 complaints');
    expect(out).toBe('We saw 5 incidents and 3 complaints');
  });

  test('safe for non-string input', () => {
    expect(registry.redact(null)).toBe('');
    expect(registry.redact(undefined)).toBe('');
  });
});

describe('rule-based generator', () => {
  test('executive_summary produces bilingual output', () => {
    const r = registry.generateRuleBased({
      kind: 'executive_summary',
      payload: { totals: { openIncidents: 4, overdueCapa: 2 }, riskBand: 'high' },
    });
    expect(r.en).toContain('4 open incidents');
    expect(r.ar).toContain('4');
  });

  test('audit_finding_summary mentions both major + minor NC counts', () => {
    const r = registry.generateRuleBased({
      kind: 'audit_finding_summary',
      payload: { auditNumber: 'AUD-2026-0007', majorNc: 1, minorNc: 3 },
    });
    expect(r.en).toContain('1 major');
    expect(r.en).toContain('3 minor');
  });

  test('unknown kind returns empty strings', () => {
    const r = registry.generateRuleBased({ kind: 'nonsense', payload: {} });
    expect(r).toEqual({ en: '', ar: '' });
  });
});

describe('QualityNarrativeService.generate', () => {
  test('rule_based path is used when no LLM client', async () => {
    const svc = createQualityNarrativeService({});
    const r = await svc.generate({
      kind: 'risk_outlook',
      payload: { score: 65, band: 'high', topDrivers: ['overdue audits'] },
    });
    expect(r.source).toBe('rule_based');
    expect(r.en).toContain('65');
  });

  test('llm path is preferred when client is wired', async () => {
    const llm = {
      async complete() {
        return { en: 'Enhanced EN', ar: 'محسّن', model: 'test-llm' };
      },
    };
    const svc = createQualityNarrativeService({ llmClient: llm });
    const r = await svc.generate({ kind: 'executive_summary', payload: {} });
    expect(r.source).toBe('llm');
    expect(r.en).toBe('Enhanced EN');
    expect(r.llmModel).toBe('test-llm');
  });

  test('falls back to rule_based when llm throws', async () => {
    const llm = {
      async complete() {
        throw new Error('rate limited');
      },
    };
    const svc = createQualityNarrativeService({ llmClient: llm });
    const r = await svc.generate({ kind: 'executive_summary', payload: {} });
    expect(r.source).toBe('rule_based_fallback');
    expect(r.error).toContain('rate limited');
  });

  test('throws on unknown kind', async () => {
    const svc = createQualityNarrativeService({});
    await expect(svc.generate({ kind: 'bogus' })).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  test('redacts PII even when LLM tries to leak it back', async () => {
    const llm = {
      async complete() {
        return { en: 'Patient 1098765432 saw progress', ar: 'تقدّم 1098765432' };
      },
    };
    const svc = createQualityNarrativeService({ llmClient: llm });
    const r = await svc.generate({ kind: 'incident_brief', payload: {} });
    expect(r.en).toContain('[ID]');
    expect(r.en).not.toContain('1098765432');
  });
});

describe('Service helpers', () => {
  test('listKinds returns the registry kinds', () => {
    const svc = createQualityNarrativeService({});
    expect(svc.listKinds()).toEqual(expect.arrayContaining(['executive_summary', 'risk_outlook']));
  });
});
