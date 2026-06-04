'use strict';

/**
 * W438 — anti-regression guard for the second OCC batch on care state
 * machines (MdtMeeting / WelfareApplication / TransitionReadinessAssessment).
 *
 * Continuation of W437. Three more care state-machine schemas wired with
 * optimisticConcurrency. WelfareApplication carries the sharpest blast
 * radius — concurrent approve clicks double-fire the disbursement trigger
 * (financial impact), similar to W435 LeaveService.approveLeave.
 */

const fs = require('fs');
const path = require('path');

const MODELS = [
  { name: 'CarePsychMdtMeeting', file: 'MdtMeeting.model.js', schema: 'mdtMeetingSchema' },
  { name: 'WelfareApplication', file: 'WelfareApplication.model.js', schema: 'welfareAppSchema' },
  {
    name: 'TransitionReadinessAssessment',
    file: 'TransitionReadinessAssessment.model.js',
    schema: 'transitionReadinessSchema',
  },
];

describe('W438 care state-machine OCC batch (continued)', () => {
  for (const { name, file, schema } of MODELS) {
    describe(`${name} (${file})`, () => {
      let src;
      beforeAll(() => {
        src = fs.readFileSync(path.join(__dirname, '..', 'models', 'care', file), 'utf8');
      });

      it('schema sets optimisticConcurrency: true', () => {
        const re = new RegExp(
          `${schema}\\.set\\(\\s*['"]optimisticConcurrency['"]\\s*,\\s*true\\s*\\)`
        );
        expect(src).toMatch(re);
      });

      it('W438 marker comment present', () => {
        expect(src).toMatch(/W438/);
      });

      it('OCC line precedes the model registration', () => {
        const occIdx = src.indexOf(`${schema}.set('optimisticConcurrency'`);
        const regIdx = src.indexOf(`mongoose.models.${name}`);
        expect(occIdx).toBeGreaterThan(-1);
        expect(regIdx).toBeGreaterThan(occIdx);
      });
    });
  }
});
