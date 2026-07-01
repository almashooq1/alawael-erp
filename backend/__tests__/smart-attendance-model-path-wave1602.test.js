'use strict';

/**
 * W1602 — SmartAttendance model-path drift guard.
 *
 * WHY (prod incident): the HR workflow rule `high-absence-rate-team` failed
 * **24×/day** on prod with `SmartAttendance.aggregate is not a function`.
 * `services/hr/hrWorkflowEngine.js` + `routes/hr/hr-workflow.routes.js` +
 * `startup/schedulers.js` resolved SmartAttendance via
 * `require('…/models/smart-attendance')` — but `models/smart-attendance` is a
 * **directory** (a bundle of sub-models) whose index export is a plain object
 * with no `.aggregate`. The real model is `models/advanced_attendance.model.js`
 * = `mongoose.model('SmartAttendance')`. So the absence-detection feature was
 * silently broken (the rule threw and got swallowed as a warn every tick).
 *
 * Fixed by pointing those requires at `models/advanced_attendance.model`.
 * This guard stops the directory-as-model regression.
 *
 * Static: reads source as text (jest.setup mocks mongoose).
 */

const fs = require('fs');
const path = require('path');

const BACKEND = path.resolve(__dirname, '..');

// Files that resolve SmartAttendance where a Mongoose model (.aggregate/.find)
// is expected.
const CONSUMER_FILES = [
  'services/hr/hrWorkflowEngine.js',
  'routes/hr/hr-workflow.routes.js',
  'startup/schedulers.js',
].map((f) => path.join(BACKEND, f));

// Matches a require/set/tryModel of the smart-attendance DIRECTORY (the bug),
// i.e. `…/models/smart-attendance` NOT followed by `.model` or a `/sub-file`.
const DIR_AS_MODEL = /['"`]\.{1,2}(?:\/\.\.)?\/models\/smart-attendance['"`]/;

describe('SmartAttendance model path (W1602)', () => {
  test('HR workflow/scheduler sources do NOT resolve the models/smart-attendance directory as a model', () => {
    const offenders = [];
    for (const f of CONSUMER_FILES) {
      if (!fs.existsSync(f)) continue;
      if (DIR_AS_MODEL.test(fs.readFileSync(f, 'utf8'))) offenders.push(path.basename(f));
    }
    // If this fails: that file requires the models/smart-attendance DIRECTORY,
    // whose index has no .aggregate. Use models/advanced_attendance.model
    // (the registered `SmartAttendance` model) instead.
    expect(offenders).toEqual([]);
  });

  test('advanced_attendance.model registers the canonical `SmartAttendance` Mongoose model', () => {
    const modelFile = path.join(BACKEND, 'models', 'advanced_attendance.model.js');
    expect(fs.existsSync(modelFile)).toBe(true);
    const src = fs.readFileSync(modelFile, 'utf8');
    expect(src).toMatch(/mongoose\.model\(\s*['"]SmartAttendance['"]/);
  });

  test('the consumers now point at advanced_attendance.model', () => {
    const engine = fs.readFileSync(CONSUMER_FILES[0], 'utf8');
    expect(engine).toMatch(/models\/advanced_attendance\.model/);
  });
});
