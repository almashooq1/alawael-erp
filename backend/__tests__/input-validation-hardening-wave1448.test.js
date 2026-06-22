'use strict';

/**
 * W1448 — Input-validation hardening drift guard.
 *
 * BUG (pre-fix): several routes accepted raw `req.body` or disabled Mongoose
 * validators, letting callers persist invalid / mass-assigned data:
 *   - complaints-enhanced POST / and PUT /:id spread `...req.body`, allowing a
 *     caller to self-set status, slaBreached, escalationLevel, etc.
 *   - finance-module trial-balance read `line.debit_amount` / `line.credit_amount`
 *     but JournalEntry lines store `debit` / `credit`.
 *   - hr-extensions EmployeeGoal update and hr-modules generic CRUD used
 *     `findByIdAndUpdate` without `runValidators: true`.
 *
 * FIX: whitelist editable fields on complaint create/update; align finance field
 * names with the schema; add `runValidators: true` to HR updates.
 */

const fs = require('fs');
const path = require('path');

const COMPLAINTS = path.join(__dirname, '..', 'routes', 'complaints-enhanced.routes.js');
const FINANCE = path.join(__dirname, '..', 'routes', 'finance-module.routes.js');
const HR_EXTENSIONS = path.join(__dirname, '..', 'routes', 'hr', 'hr-extensions.routes.js');
const HR_MODULES = path.join(__dirname, '..', 'routes', 'hr', 'hr-modules.routes.js');

describe('W1448 input-validation hardening', () => {
  test('complaints create/update whitelist fields instead of spreading req.body', () => {
    const src = fs.readFileSync(COMPLAINTS, 'utf8');

    expect(src).toMatch(/COMPLAINT_CREATABLE\s*=\s*\[/);
    expect(src).toMatch(/COMPLAINT_UPDATABLE\s*=\s*\[/);
    expect(src).toMatch(/pickFields\s*\(/);
    expect(src).toMatch(/pickFields\(req\.body,\s*COMPLAINT_CREATABLE\)/);
    expect(src).toMatch(/pickFields\(req\.body,\s*COMPLAINT_UPDATABLE\)/);

    // The dangerous patterns must be gone from the complaint create/update paths.
    expect(src).not.toMatch(/new ComplaintV2\(\{\s*\.\.\.req\.body/);
    expect(src).not.toMatch(
      /ComplaintV2\.findByIdAndUpdate\s*\(\s*req\.params\.id,\s*\{\s*\.\.\.req\.body/
    );
  });

  test('finance-module reads JournalEntry line debit/credit fields', () => {
    const src = fs.readFileSync(FINANCE, 'utf8');

    expect(src).toMatch(/line\.debit\s*\|\|/);
    expect(src).toMatch(/line\.credit\s*\|\|/);
    expect(src).not.toMatch(/debit_amount/);
    expect(src).not.toMatch(/credit_amount/);
  });

  test('hr-extensions EmployeeGoal update runs validators', () => {
    const src = fs.readFileSync(HR_EXTENSIONS, 'utf8');

    expect(src).toMatch(/runValidators:\s*true/);
  });

  test('hr-modules generic CRUD update runs validators', () => {
    const src = fs.readFileSync(HR_MODULES, 'utf8');

    expect(src).toMatch(/runValidators:\s*true/);
  });
});
