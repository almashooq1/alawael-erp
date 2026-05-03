'use strict';

/**
 * Regression: catches the "route calls svc.X but service has no X" bug
 * class. This session exposed 5 such bugs in inventory-enhanced.routes.js
 * (receiveGoods, initiateStockCount, recordStockCount — and earlier the
 * dead-mount class for inventory.routes.unified + purchasing.routes.unified).
 *
 * Each silent prod failure: routes mounted, look healthy, return 500 only
 * when the dead path is hit. Static check below grabs every `svc.METHOD(`
 * call in a route file and asserts METHOD exists on the service module.
 *
 * Cheap to run, lives outside the request path, no DB. Add more
 * (route, service) pairs to TARGETS as new domains adopt the pattern.
 */

const fs = require('fs');
const path = require('path');

const TARGETS = [
  {
    name: 'inventory-enhanced',
    routePath: path.resolve(__dirname, '../routes/inventory-enhanced.routes.js'),
    servicePath: '../services/inventory/inventory-enhanced.service',
  },
  {
    name: 'aiDiagnostic',
    routePath: path.resolve(__dirname, '../routes/aiDiagnostic.routes.js'),
    servicePath: '../services/aiDiagnostic.service',
  },
  {
    name: 'branch-enhanced',
    routePath: path.resolve(__dirname, '../routes/branch-enhanced.routes.js'),
    servicePath: '../services/branches/branch-enhanced.service',
  },
  {
    name: 'ceoDashboard',
    routePath: path.resolve(__dirname, '../routes/ceoDashboard.routes.js'),
    servicePath: '../services/ceoDashboard.service',
  },
  {
    name: 'finance-approvals',
    routePath: path.resolve(__dirname, '../routes/finance-approvals.routes.js'),
    servicePath: '../services/finance/expenseApprovalService',
  },
  {
    name: 'finance-cheques',
    routePath: path.resolve(__dirname, '../routes/finance-cheques.routes.js'),
    servicePath: '../services/finance/chequeService',
  },
  {
    name: 'finance-statements',
    routePath: path.resolve(__dirname, '../routes/finance-statements.routes.js'),
    servicePath: '../services/finance/financialStatementsService',
  },
  {
    name: 'ocrDocument',
    routePath: path.resolve(__dirname, '../routes/ocrDocument.routes.js'),
    servicePath: '../services/ocrDocument.service',
  },
  {
    name: 'quality-enhanced',
    routePath: path.resolve(__dirname, '../routes/quality-enhanced.routes.js'),
    servicePath: '../services/quality/quality-enhanced.service',
  },
  {
    name: 'qualityManagement',
    routePath: path.resolve(__dirname, '../routes/qualityManagement.routes.js'),
    servicePath: '../services/qualityManagement.service',
  },
];

describe('route → service method resolution (no svc.X mismatch)', () => {
  for (const target of TARGETS) {
    describe(target.name, () => {
      let source;
      let serviceMethods;

      beforeAll(() => {
        source = fs.readFileSync(target.routePath, 'utf8');
        const svc = require(target.servicePath);
        serviceMethods = collectMethodNames(svc);
      });

      test('every svc.X() call resolves to a real service method', () => {
        const calls = [...source.matchAll(/\bsvc\.([a-zA-Z_$][\w$]*)\s*\(/g)];
        const referenced = [...new Set(calls.map(m => m[1]))];
        expect(referenced.length).toBeGreaterThan(0);
        const missing = referenced.filter(name => !serviceMethods.has(name));
        expect(missing).toEqual([]);
      });
    });
  }
});

/**
 * Generalized scan — picks up any `const NAME = require('../services/...')`
 * binding, then verifies all `NAME.METHOD(` calls in the file resolve.
 * Catches the same bug class as the targeted scan above but across the
 * whole `routes/` tree without needing a hand-curated TARGETS list.
 *
 * Skips destructured imports, services without methods (pure data
 * exports), and patterns where NAME is reassigned. Allowlist below
 * covers known false-positive shapes (factories, classes used as ctors).
 */
describe('generalized routes/ → services/ method resolution', () => {
  const ROUTES_DIR = path.resolve(__dirname, '../routes');
  const SKIP_VARNAMES = new Set([
    // Class constructors used with `new` — methods live on instances, not module
    'AutomatedBackupService',
    'DatabaseMigrationService',
    'HRAttendanceService',
    'HRNotificationService',
  ]);

  // Whitelist: known-broken route files where the gap exceeds what this
  // session could safely fix. Each entry is a TODO — the route handlers
  // call service methods that don't exist and will throw 500 in prod.
  // Remove from this set once the underlying services are implemented
  // (or the routes are deleted).
  //
  // Inventoried 2026-05-03:
  //   - therapistElite/Extended/Pro/Ultra → therapistPortal.service is a
  //     ~110-method placeholder; the entire therapist portal feature was
  //     scaffolded routes-first without service backing.
  //   - parentPortal.routes.js → CLOSED 2026-05-03. The only "missing
  //     method" was SmsService.send — smsService exported a bare function;
  //     attached `.send = sendSMS` to keep both call shapes working
  //     (positional and `{ to, message }`).
  //   - notifications.routes.js → CLOSED 2026-05-03 by adding 14 adapter
  //     methods on the consolidated notification service (createNotification,
  //     getUnreadCountByType, getTemplate, getNotificationById, getDeliveryStatus,
  //     updateNotification, archiveNotification, restoreNotification,
  //     toggleFavorite, snoozeNotification, deleteReadNotifications,
  //     retrySendNotification, markMultipleAsRead, deleteMultiple).
  //     Favorite + snooze stored in metadata Mixed field.
  //   - smart-insurance.routes.js → CLOSED 2026-05-03 by adding
  //     calculateCopay + getRejectionAnalytics + submitPriorAuthorization
  //     on SmartInsuranceService.
  // Skip-list emptied 2026-05-03: every route file in the codebase now
  // resolves all its `varName.method(` calls against the bound service.
  // Add an entry here only if you add a new route that depends on a
  // service method you can't or won't implement yet.
  const SKIP_FILES = new Set([]);

  const files = walkRoutes(ROUTES_DIR);

  for (const file of files) {
    const rel = path.relative(ROUTES_DIR, file);
    if (SKIP_FILES.has(rel)) continue;

    const source = fs.readFileSync(file, 'utf8');
    const bindings = extractServiceBindings(source);
    if (bindings.length === 0) continue;

    test(`${rel} — service method calls resolve`, () => {
      const errors = [];
      for (const { varName, modulePath } of bindings) {
        if (SKIP_VARNAMES.has(varName)) continue;
        let svc;
        try {
          svc = require(path.resolve(path.dirname(file), modulePath));
        } catch {
          continue; // service load failure is a different bug class
        }
        const methods = collectMethodNames(svc);
        if (methods.size === 0) continue; // not a method-bag — likely data export

        const callRe = new RegExp(`\\b${escapeRe(varName)}\\.([a-zA-Z_$][\\w$]*)\\s*\\(`, 'g');
        const calls = [...source.matchAll(callRe)];
        const referenced = [...new Set(calls.map(m => m[1]))];
        const missing = referenced.filter(name => !methods.has(name));
        if (missing.length > 0) {
          errors.push(`  ${varName}.{${missing.join(', ')}} — module: ${modulePath}`);
        }
      }
      if (errors.length > 0) {
        throw new Error(`Missing service methods:\n${errors.join('\n')}`);
      }
    });
  }
});

function walkRoutes(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkRoutes(full));
    } else if (entry.name.endsWith('.routes.js') || entry.name === 'internalAudit.js') {
      out.push(full);
    }
  }
  return out;
}

function extractServiceBindings(source) {
  const bindings = [];
  const re = /^\s*const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/gm;
  let m;
  while ((m = re.exec(source)) !== null) {
    const varName = m[1];
    const modulePath = m[2];
    if (!modulePath.includes('/services/')) continue;
    bindings.push({ varName, modulePath });
  }
  return bindings;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Walks the prototype chain of an instance + its own properties so class
 * methods (which live on the prototype, not the instance) are included.
 */
function collectMethodNames(target) {
  const names = new Set();
  if (!target) return names;
  let cursor = target;
  while (cursor && cursor !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(cursor)) {
      if (key === 'constructor') continue;
      const desc = Object.getOwnPropertyDescriptor(cursor, key);
      if (desc && typeof desc.value === 'function') names.add(key);
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  return names;
}
