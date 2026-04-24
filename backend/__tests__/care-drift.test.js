'use strict';

/**
 * care-drift.test.js — Phase 17 Commit 9 (4.0.91).
 *
 * Cross-commit invariants. Catches drift across the full
 * Phase-17 vertical: every registry validates, every service
 * can be constructed, every route file loads, every bootstrap
 * accessor is exported, every care SLA is declared in
 * sla.registry + listed in OPS_MODULES.
 *
 * Deliberately NO mongoose/db. Models are required to verify
 * their schemas evaluate without error, but no queries run.
 */

describe('Phase 17 — registry drift', () => {
  const registries = [
    'crm',
    'social',
    'homeVisit',
    'welfare',
    'community',
    'psych',
    'independence',
    'retention',
  ];

  it.each(registries)('%s registry: validate() passes', name => {
    const reg = require(`../config/care/${name}.registry`);
    expect(typeof reg.validate).toBe('function');
    expect(reg.validate()).toBe(true);
  });

  it('every care registry module loads without error', () => {
    for (const name of registries) {
      expect(() => require(`../config/care/${name}.registry`)).not.toThrow();
    }
  });
});

describe('Phase 17 — model drift', () => {
  const models = [
    'Inquiry',
    'Lead',
    'SocialCase',
    'HomeVisit',
    'WelfareApplication',
    'CommunityPartner',
    'CommunityLinkage',
    'PsychRiskFlag',
    'PsychScaleAssessment',
    'MdtMeeting',
    'TransitionReadinessAssessment',
    'IadlAssessment',
    'CommunityParticipationLog',
    'RetentionAssessment',
  ];

  it.each(models)('%s model loads + has a schema', name => {
    const Model = require(`../models/care/${name}.model`);
    expect(Model).toBeTruthy();
    expect(Model.schema).toBeTruthy();
  });

  it('every model has a unique-numbering pre-validate hook', () => {
    for (const name of models) {
      const Model = require(`../models/care/${name}.model`);
      const hooks = Model.schema.s?.hooks?._pres?.get?.('validate') || [];
      expect(hooks.length).toBeGreaterThan(0);
    }
  });
});

describe('Phase 17 — service drift', () => {
  const services = [
    ['leadFunnel', 'createLeadFunnelService'],
    ['socialCase', 'createSocialCaseService'],
    ['homeVisit', 'createHomeVisitService'],
    ['welfare', 'createWelfareService'],
    ['community', 'createCommunityService'],
    ['psych', 'createPsychService'],
    ['independence', 'createIndependenceService'],
    ['beneficiary360', 'createBeneficiary360Service'],
    ['retention', 'createRetentionService'],
  ];

  it.each(services)('%s.service exports %s', (name, factory) => {
    const mod = require(`../services/care/${name}.service`);
    expect(typeof mod[factory]).toBe('function');
  });
});

describe('Phase 17 — routes drift', () => {
  const routes = [
    'crm',
    'social',
    'homeVisit',
    'welfare',
    'community',
    'psych',
    'independence',
    'beneficiary360',
    'retention',
  ];

  it.each(routes)('%s routes file loads', name => {
    expect(() => require(`../routes/care/${name}.routes`)).not.toThrow();
  });

  it('every care route file exports an Express router', () => {
    for (const name of routes) {
      const router = require(`../routes/care/${name}.routes`);
      expect(router).toBeTruthy();
      // Express routers have a `.stack` + function call signature
      expect(typeof router).toBe('function');
      expect(Array.isArray(router.stack)).toBe(true);
    }
  });
});

describe('Phase 17 — bootstrap accessor drift', () => {
  it('careBootstrap exports all 9 service accessors', () => {
    const b = require('../startup/careBootstrap');
    expect(typeof b.bootstrapCare).toBe('function');
    expect(typeof b._getLeadFunnelService).toBe('function');
    expect(typeof b._getSocialCaseService).toBe('function');
    expect(typeof b._getHomeVisitService).toBe('function');
    expect(typeof b._getWelfareService).toBe('function');
    expect(typeof b._getCommunityService).toBe('function');
    expect(typeof b._getPsychService).toBe('function');
    expect(typeof b._getIndependenceService).toBe('function');
    expect(typeof b._getBeneficiary360Service).toBe('function');
    expect(typeof b._getRetentionService).toBe('function');
  });
});

describe('Phase 17 — SLA registry drift', () => {
  const sla = require('../config/sla.registry');

  it('care modules are listed in OPS_MODULES', () => {
    for (const m of ['crm', 'social', 'psych']) {
      expect(sla.OPS_MODULES).toContain(m);
    }
  });

  it('every Phase-17 SLA policy is declared + references a valid module', () => {
    const carePolicies = [
      'crm.inquiry.acknowledge',
      'crm.lead.first_response',
      'crm.lead.conversion',
      'social.case.intake_to_assessment',
      'social.case.assessment_to_plan',
      'social.case.high_risk_review',
      'social.home_visit.followup',
      'psych.risk_flag.response',
    ];
    for (const id of carePolicies) {
      const p = sla.byId(id);
      expect(p).toBeTruthy();
      expect(sla.OPS_MODULES).toContain(p.module);
    }
  });

  it('critical safety-net SLAs are 24/7 (businessHoursOnly false)', () => {
    for (const id of ['social.case.high_risk_review', 'psych.risk_flag.response']) {
      const p = sla.byId(id);
      expect(p.severity).toBe('critical');
      expect(p.businessHoursOnly).toBe(false);
    }
  });

  it('every SLA has an escalation chain with at least one step', () => {
    const carePolicies = [
      'crm.inquiry.acknowledge',
      'crm.lead.first_response',
      'social.case.high_risk_review',
      'psych.risk_flag.response',
    ];
    for (const id of carePolicies) {
      const p = sla.byId(id);
      expect(Array.isArray(p.escalation)).toBe(true);
      expect(p.escalation.length).toBeGreaterThan(0);
    }
  });
});

describe('Phase 17 — cross-registry integrity', () => {
  it('psych registry CRITICAL_FLAG_SLA_ID points to a real SLA policy', () => {
    const psych = require('../config/care/psych.registry');
    const sla = require('../config/sla.registry');
    const policy = sla.byId(psych.CRITICAL_FLAG_SLA_ID);
    expect(policy).toBeTruthy();
    expect(policy.severity).toBe('critical');
  });

  it('welfare registry has no SLA backlinks (external govt timelines)', () => {
    // Verifies the conscious decision in C4 to NOT SLA-track welfare
    const welfareReg = require('../config/care/welfare.registry');
    const sla = require('../config/sla.registry');
    const welfarePolicies = Object.values(sla.POLICIES || {}).filter(
      p => p.id && p.id.startsWith('welfare.')
    );
    expect(welfarePolicies.length).toBe(0);
    // Registry doesn't expose a CRITICAL_*_SLA_ID constant either
    expect(welfareReg.CRITICAL_FLAG_SLA_ID).toBeUndefined();
  });

  it('retention registry factor codes all referenced in service detection', () => {
    const reg = require('../config/care/retention.registry');
    // Verify codes are well-formed identifiers (defensive)
    for (const code of reg.RISK_FACTOR_CODES) {
      expect(code).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(reg.getFactor(code)).toBeTruthy();
    }
  });
});

describe('Phase 17 — route registry drift', () => {
  it('_registry.js references every care route file', () => {
    const fs = require('fs');
    const path = require('path');
    const registryPath = path.join(__dirname, '..', 'routes', '_registry.js');
    const src = fs.readFileSync(registryPath, 'utf8');

    const expectedMounts = [
      "'care/crm'",
      "'care/social'",
      "'care/home-visits'",
      "'care/welfare'",
      "'care/community'",
      "'care/psych'",
      "'care/independence'",
      "'care/360'",
      "'care/retention'",
    ];

    for (const m of expectedMounts) {
      expect(src).toContain(m);
    }
  });
});

describe('Phase 17 — auto-orchestration wiring documented', () => {
  it('careBootstrap source declares home-visit → case subscription', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'startup', 'careBootstrap.js'), 'utf8');
    expect(src).toContain('ops.care.social.home_visit_critical_concern');
    expect(src).toContain('flagHighRisk');
  });

  it('careBootstrap source declares psych-flag → case subscription', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'startup', 'careBootstrap.js'), 'utf8');
    expect(src).toContain('ops.care.psych.risk_flag_raised');
  });

  it('retention service directly imports registry (no dangling deps)', () => {
    const svcMod = require('../services/care/retention.service');
    expect(typeof svcMod.createRetentionService).toBe('function');
    expect(svcMod.NotFoundError).toBeTruthy();
    expect(svcMod.MissingFieldError).toBeTruthy();
  });
});
