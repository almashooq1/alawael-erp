'use strict';
/**
 * W1585 — sessions: forge a completed clinical session via /attend, /start, or schedule.
 * A ClinicalSession's completion OUTPUTS (status:'completed', SOAP subjective/objective/
 * assessment/plan/soapNotes, goalProgress, actual durations, vitals, signature) are written
 * only by the dedicated /complete + /documentation endpoints. But /attend + /start placed
 * ...req.body AFTER the forced fields (so body overrode status) and updateSession did
 * $set:data raw → a caller could POST { status:'completed', subjective, goalProgress } to
 * /attend and forge a completed session with fabricated clinical notes/scores. Now stripped;
 * forced fields go last so they win.
 */
const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'domains', 'sessions', 'routes', 'sessions.routes.js'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
describe('W1585 sessions completion forgery', () => {
  test('attend/start/schedule strip clinical outputs (no raw body reaches update/create)', () => {
    expect(CODE).not.toMatch(/attendanceStatus: 'attended',\s*\.\.\.req\.body/);
    expect(CODE).toMatch(/scheduleSession\(stripSessionOutputs\(req\.body\)\)/);
    expect((CODE.match(/\.\.\.stripSessionOutputs\(req\.body\)/g) || []).length).toBeGreaterThanOrEqual(2);
  });
  test('forced status is placed AFTER the stripped body (so it wins)', () => {
    expect(CODE).toMatch(/\.\.\.stripSessionOutputs\(req\.body\),\s*status: 'in_progress'/);
  });
  test('protected set covers the completion/scoring outputs', () => {
    for (const f of ['status', 'subjective', 'soapNotes', 'goalProgress', 'actualDurationMinutes', 'signature']) {
      expect(CODE).toMatch(new RegExp("'" + f + "'"));
    }
  });
});
