'use strict';
/**
 * W1620 — query field-name drift: routes queried Mongoose models on fields the schema never
 * declares, so the query silently matched nothing → broken features. Found via a static scan
 * (Model.find({ literalKey }) where literalKey ∉ schema paths) + isolated per-model verification.
 *
 * Fixed (each verified against the model's real paths):
 *  - hrUnified   Employee.countDocuments({ joinDate / terminationDate })  → hire_date / termination_date
 *                (new-hires-this-month + hired/terminated-this-year metrics were always 0)
 *  - communications  Communication.countDocuments({ direction: 'outgoing'/'incoming' }) → type
 *                (model's field is `type` with enum incoming|outgoing|internal; sent/received always 0)
 *  - employeePortal  Employee.findOne/Update({ userId }) → user_id  (portal couldn't find own record)
 *  - biometric   Employee.findOne({ userId }) → user_id  (check-in couldn't resolve the employee)
 */
const fs = require('fs');
const path = require('path');
const R = (f) => fs.readFileSync(path.join(__dirname, '..', 'routes', f), 'utf8');

describe('W1620 query field-drift corrected', () => {
  test('hrUnified queries Employee on hire_date/termination_date, not joinDate/terminationDate', () => {
    const s = R('hrUnified.routes.js');
    expect(s).not.toMatch(/joinDate\s*:/);
    expect(s).not.toMatch(/terminationDate\s*:/);
    expect(s).toMatch(/hire_date\s*:\s*\{/);
    expect(s).toMatch(/termination_date\s*:\s*\{/);
  });

  test('communications counts by type, not the non-existent direction field', () => {
    const s = R('communications.routes.js');
    expect(s).not.toMatch(/direction\s*:\s*'(outgoing|incoming)'/);
    expect(s).toMatch(/type\s*:\s*'outgoing'/);
    expect(s).toMatch(/type\s*:\s*'incoming'/);
  });

  test('employeePortal + biometric resolve the employee by user_id, not userId', () => {
    for (const f of ['employeePortal.routes.js', 'biometric-attendance.routes.js']) {
      const s = R(f);
      expect(s).not.toMatch(/Employee\.(findOne|findOneAndUpdate)\(\{ userId:/);
      expect(s).toMatch(/Employee\.(findOne|findOneAndUpdate)\(\{ user_id:/);
    }
  });
});
