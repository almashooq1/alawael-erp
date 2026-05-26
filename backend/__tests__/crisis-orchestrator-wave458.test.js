'use strict';

/**
 * W458 drift guard — Crisis pathway orchestration.
 *
 * Locks:
 *   • EmergencyPlan model registered as 'EmergencyPlan' with unique
 *     beneficiaryId index + escalationChain + emergencyContacts + Wave-18
 *     invariant (at most one primary contact) + auto-fill nextReviewDue.
 *   • CrisisIncident model registered as 'CrisisIncident' with 7-type
 *     enum + 4-severity tier + status flow + Wave-18 invariant (resolved
 *     status implies resolvedAt set).
 *   • crisisOrchestrator.service exports the 5 documented entry points
 *     (reportCrisis / escalate / closeWithReview / linkSpecializedRecord
 *     / getActive) + 3 constant arrays.
 *
 * Static analysis + service-surface verification. No DB.
 */

const fs = require('fs');
const path = require('path');

const EMERGENCY_PLAN_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'EmergencyPlan.js'),
  'utf8'
);
const CRISIS_INCIDENT_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'models', 'CrisisIncident.js'),
  'utf8'
);
const SERVICE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'crisisOrchestrator.service.js'),
  'utf8'
);

describe('W458 — EmergencyPlan model', () => {
  it('registers as model "EmergencyPlan"', () => {
    expect(EMERGENCY_PLAN_SRC).toMatch(
      /mongoose\.models\.EmergencyPlan\s*\|\|\s*mongoose\.model\(\s*['"]EmergencyPlan['"]/
    );
  });

  it('beneficiaryId carries unique index', () => {
    expect(EMERGENCY_PLAN_SRC).toMatch(/beneficiaryId\s*:\s*\{[\s\S]+?unique:\s*true/);
  });

  it('declares knownConditions + escalationChain + emergencyContacts arrays', () => {
    expect(EMERGENCY_PLAN_SRC).toMatch(/knownConditions\s*:/);
    expect(EMERGENCY_PLAN_SRC).toMatch(/escalationChain\s*:/);
    expect(EMERGENCY_PLAN_SRC).toMatch(/emergencyContacts\s*:/);
  });

  it('declares reviewCadenceMonths + nextReviewDue + lastReviewedAt', () => {
    expect(EMERGENCY_PLAN_SRC).toMatch(/reviewCadenceMonths\s*:/);
    expect(EMERGENCY_PLAN_SRC).toMatch(/nextReviewDue\s*:/);
    expect(EMERGENCY_PLAN_SRC).toMatch(/lastReviewedAt\s*:/);
  });

  it('uses canonical collection name emergency_plans', () => {
    expect(EMERGENCY_PLAN_SRC).toMatch(/collection:\s*['"]emergency_plans['"]/);
  });

  it('pre-save invariant: at most one primary contact', () => {
    expect(EMERGENCY_PLAN_SRC).toMatch(/at most one contact may have isPrimary/);
  });

  it('escalation step role enum includes the 7 canonical roles', () => {
    expect(EMERGENCY_PLAN_SRC).toMatch(/'caregiver'/);
    expect(EMERGENCY_PLAN_SRC).toMatch(/'physician'/);
    expect(EMERGENCY_PLAN_SRC).toMatch(/'safeguarding_lead'/);
    expect(EMERGENCY_PLAN_SRC).toMatch(/'emergency_services'/);
    expect(EMERGENCY_PLAN_SRC).toMatch(/'case_manager'/);
    expect(EMERGENCY_PLAN_SRC).toMatch(/'branch_manager'/);
    expect(EMERGENCY_PLAN_SRC).toMatch(/'social_worker'/);
  });

  it('contactMethod enum includes the 6 channels', () => {
    expect(EMERGENCY_PLAN_SRC).toMatch(/'phone'/);
    expect(EMERGENCY_PLAN_SRC).toMatch(/'app_notification'/);
    expect(EMERGENCY_PLAN_SRC).toMatch(/'whatsapp'/);
    expect(EMERGENCY_PLAN_SRC).toMatch(/'email'/);
    expect(EMERGENCY_PLAN_SRC).toMatch(/'sms'/);
    expect(EMERGENCY_PLAN_SRC).toMatch(/'on_site'/);
  });
});

describe('W458 — CrisisIncident model', () => {
  it('registers as model "CrisisIncident"', () => {
    expect(CRISIS_INCIDENT_SRC).toMatch(
      /mongoose\.models\.CrisisIncident\s*\|\|\s*mongoose\.model\(\s*['"]CrisisIncident['"]/
    );
  });

  it('crisisType enum includes the 7 canonical types', () => {
    expect(CRISIS_INCIDENT_SRC).toMatch(/'medical_seizure'/);
    expect(CRISIS_INCIDENT_SRC).toMatch(/'medical_other'/);
    expect(CRISIS_INCIDENT_SRC).toMatch(/'behavioral'/);
    expect(CRISIS_INCIDENT_SRC).toMatch(/'safeguarding'/);
    expect(CRISIS_INCIDENT_SRC).toMatch(/'family'/);
    expect(CRISIS_INCIDENT_SRC).toMatch(/'environmental'/);
    expect(CRISIS_INCIDENT_SRC).toMatch(/'system'/);
  });

  it('severity enum: critical / urgent / concerning / minor', () => {
    expect(CRISIS_INCIDENT_SRC).toMatch(/'critical'/);
    expect(CRISIS_INCIDENT_SRC).toMatch(/'urgent'/);
    expect(CRISIS_INCIDENT_SRC).toMatch(/'concerning'/);
    expect(CRISIS_INCIDENT_SRC).toMatch(/'minor'/);
  });

  it('status enum includes active / resolved / escalated / under_review / closed', () => {
    expect(CRISIS_INCIDENT_SRC).toMatch(/'active'/);
    expect(CRISIS_INCIDENT_SRC).toMatch(/'resolved'/);
    expect(CRISIS_INCIDENT_SRC).toMatch(/'escalated'/);
    expect(CRISIS_INCIDENT_SRC).toMatch(/'under_review'/);
    expect(CRISIS_INCIDENT_SRC).toMatch(/'closed'/);
  });

  it('links to W356 SeizureEvent + W357 SafeguardingConcern via ObjectId refs', () => {
    expect(CRISIS_INCIDENT_SRC).toMatch(/seizureEventId\s*:[\s\S]+?ref:\s*['"]SeizureEvent['"]/);
    expect(CRISIS_INCIDENT_SRC).toMatch(
      /safeguardingConcernId\s*:[\s\S]+?ref:\s*['"]SafeguardingConcern['"]/
    );
  });

  it('postIncidentReviewId refs CapaItem (W337 chain)', () => {
    expect(CRISIS_INCIDENT_SRC).toMatch(/postIncidentReviewId\s*:[\s\S]+?ref:\s*['"]CapaItem['"]/);
  });

  it('uses canonical collection name crisis_incidents', () => {
    expect(CRISIS_INCIDENT_SRC).toMatch(/collection:\s*['"]crisis_incidents['"]/);
  });

  it('pre-save fills resolvedAt + closedAt on terminal status', () => {
    expect(CRISIS_INCIDENT_SRC).toMatch(/resolved.*closed[\s\S]+?resolvedAt\s*=\s*new Date/);
    expect(CRISIS_INCIDENT_SRC).toMatch(/closed[\s\S]+?closedAt\s*=\s*new Date/);
  });
});

describe('W458 — crisisOrchestrator service surface', () => {
  let mod;
  beforeAll(() => {
    mod = require('../services/crisisOrchestrator.service');
  });

  it('exports the 5 documented functions', () => {
    expect(typeof mod.reportCrisis).toBe('function');
    expect(typeof mod.escalate).toBe('function');
    expect(typeof mod.closeWithReview).toBe('function');
    expect(typeof mod.linkSpecializedRecord).toBe('function');
    expect(typeof mod.getActive).toBe('function');
  });

  it('exposes ALLOWED_TYPES with the 7 canonical crisis types', () => {
    expect(Array.isArray(mod.ALLOWED_TYPES)).toBe(true);
    expect(mod.ALLOWED_TYPES).toEqual([
      'medical_seizure',
      'medical_other',
      'behavioral',
      'safeguarding',
      'family',
      'environmental',
      'system',
    ]);
  });

  it('exposes ALLOWED_SEVERITIES with the 4-tier ladder', () => {
    expect(mod.ALLOWED_SEVERITIES).toEqual(['critical', 'urgent', 'concerning', 'minor']);
  });

  it('exposes ALLOWED_ACTION_TYPES with the 11 escalation actions', () => {
    expect(mod.ALLOWED_ACTION_TYPES.length).toBeGreaterThanOrEqual(11);
    expect(mod.ALLOWED_ACTION_TYPES).toContain('caregiver_notified');
    expect(mod.ALLOWED_ACTION_TYPES).toContain('emergency_services_called');
    expect(mod.ALLOWED_ACTION_TYPES).toContain('safeguarding_lead_notified');
    expect(mod.ALLOWED_ACTION_TYPES).toContain('rescue_protocol_initiated');
  });
});

describe('W458 — input validation (service)', () => {
  let mod;
  beforeAll(() => {
    mod = require('../services/crisisOrchestrator.service');
  });

  it('reportCrisis rejects missing required fields', async () => {
    await expect(mod.reportCrisis({})).rejects.toThrow(/beneficiaryId required/);
    await expect(mod.reportCrisis({ beneficiaryId: 'x' })).rejects.toThrow(/branchId required/);
    await expect(mod.reportCrisis({ beneficiaryId: 'x', branchId: 'y' })).rejects.toThrow(
      /reportedBy required/
    );
  });

  it('reportCrisis rejects invalid crisisType', async () => {
    await expect(
      mod.reportCrisis({
        beneficiaryId: 'x',
        branchId: 'y',
        reportedBy: 'z',
        crisisType: 'random',
        severity: 'urgent',
      })
    ).rejects.toThrow(/invalid crisisType/);
  });

  it('reportCrisis rejects invalid severity', async () => {
    await expect(
      mod.reportCrisis({
        beneficiaryId: 'x',
        branchId: 'y',
        reportedBy: 'z',
        crisisType: 'medical_seizure',
        severity: 'wonky',
      })
    ).rejects.toThrow(/invalid severity/);
  });

  it('escalate rejects invalid actionType', async () => {
    await expect(mod.escalate({ crisisId: 'x', actionType: 'random_thing' })).rejects.toThrow(
      /invalid actionType/
    );
  });

  it('linkSpecializedRecord rejects invalid type', async () => {
    await expect(
      mod.linkSpecializedRecord({ crisisId: 'x', type: 'random', recordId: 'y' })
    ).rejects.toThrow(/invalid type/);
  });

  it('getActive rejects missing branchId', async () => {
    await expect(mod.getActive({})).rejects.toThrow(/branchId required/);
  });
});

describe('W458 — service uses lazy mongoose.model() pattern', () => {
  it('service file does NOT bind models at require time', () => {
    // Lazy bindings via try/catch pattern (matches W354 doctrine)
    expect(SERVICE_SRC).toMatch(/function _CrisisIncident\(\)/);
    expect(SERVICE_SRC).toMatch(/function _EmergencyPlan\(\)/);
    expect(SERVICE_SRC).toMatch(/mongoose\.model\(['"]CrisisIncident['"]\)/);
    expect(SERVICE_SRC).toMatch(/mongoose\.model\(['"]EmergencyPlan['"]\)/);
  });
});
