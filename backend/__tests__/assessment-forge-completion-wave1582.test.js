'use strict';

/**
 * W1582 — assessments: forge a completed clinical assessment via the generic PUT.
 *
 * createAssessment is safe (explicit payload, status forced 'draft'). But
 * updateAssessment did findByIdAndUpdate($set: req.body) with no whitelist, and the
 * completion/scoring outputs (status:'completed' + score + scoreBreakdown + interpretation +
 * results + summary + recommendations + duration) are meant to be set ONLY by the dedicated
 * PUT /:assessmentId/complete endpoint. So PUT /:assessmentId { status:'completed', score, ... }
 * forged a completed clinical assessment with fabricated scores. The route now strips those.
 */

const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'domains', 'assessments', 'routes', 'assessments.routes.js'),
  'utf8'
);
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('W1582 assessment forge via generic update', () => {
  test('generic PUT strips completion/scoring fields (no raw body reaches update)', () => {
    expect(CODE).toMatch(/stripAssessmentFields\(req\.body\)/);
    expect(CODE).not.toMatch(/updateAssessment\(req\.params\.assessmentId, req\.body\)/);
  });

  test('protected set covers the scoring + status completion outputs', () => {
    for (const f of ['status', 'score', 'scoreBreakdown', 'interpretation', 'results', 'summary']) {
      expect(CODE).toMatch(new RegExp("'" + f + "'"));
    }
  });

  test('protected set covers identity + server fields', () => {
    for (const f of ['beneficiary', 'branchId', 'isDeleted']) {
      expect(CODE).toMatch(new RegExp("'" + f + "'"));
    }
  });
});
