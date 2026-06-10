/**
 * Finance Operations Routes — مسارات العمليات المالية
 *
 * ✅ الفواتير (Invoices) — CRUD + إلغاء + دفع
 * ✅ القيود اليومية (Journal Entries) — CRUD
 * ✅ الصندوق الصغير (Petty Cash) — CRUD
 * ✅ الشيكات (Cheques) — CRUD
 * ✅ المطابقة البنكية (Bank Reconciliation) — CRUD
 * ✅ إشعارات الائتمان (Credit Notes) — CRUD
 * ✅ لوحة التحكم المالية (Financial Summary)
 *
 * 🔐 جميع المسارات محمية بالمصادقة
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const { assertBranchMatch, effectiveBranchScope } = require('../middleware/assertBranchMatch');
const financeOpsService = require('../services/financeOperations.service');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);

// W269 — Invoice carries branchId (denormalized from the beneficiary, W651), so the
// invoice :id routes MUST verify the caller's branch before returning/mutating
// financial PII. requireBranchAccess populates req.branchScope but the handlers pass
// only the id to the service, so the scope was unused. Loads the invoice + asserts;
// returns it when allowed, throws a 403/404 (caught by `wrap`) when denied.
async function loadInvoiceInBranch(req, id) {
  const inv = await financeOpsService.getInvoice(id); // throws 404 when missing
  assertBranchMatch(req, inv.branchId, 'invoice'); // throws 403 on cross-branch
  return inv;
}
const wrap = fn => async (req, res) => {
  try {
    const result = await fn(req, res);
    if (!res.headersSent) {
      res.json({ success: true, data: result });
    }
  } catch (err) {
    logger.error('Finance Operations route error:', err.message);
    const status = err.status || 500;
    res.status(status).json({ success: false, message: safeError(err) });
  }
};

const getUserId = req => req.user?.userId || req.user?._id || req.user?.id;

// ═══════════════════════════════════════════════════════════════════════════════
// FINANCIAL DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

router.get(
  '/summary',
  wrap(async () => financeOpsService.getFinancialSummary())
);

// ═══════════════════════════════════════════════════════════════════════════════
// INVOICES — الفواتير
// ═══════════════════════════════════════════════════════════════════════════════

router.get(
  '/invoices',
  // W269 — pin the branch filter (restricted → own branch; HQ → all / honoured query)
  wrap(async req =>
    financeOpsService.listInvoices({ ...req.query, branchId: effectiveBranchScope(req) })
  )
);
router.get(
  '/invoices/:id',
  wrap(async req => loadInvoiceInBranch(req, req.params.id)) // W269
);
router.post(
  '/invoices',
  wrap(async req => financeOpsService.createInvoice(req.body, getUserId(req)))
);
router.put(
  '/invoices/:id',
  wrap(async req => {
    await loadInvoiceInBranch(req, req.params.id); // W269 — verify branch before mutating
    return financeOpsService.updateInvoice(req.params.id, req.body, getUserId(req));
  })
);
router.post(
  '/invoices/:id/cancel',
  wrap(async req => {
    await loadInvoiceInBranch(req, req.params.id); // W269
    return financeOpsService.cancelInvoice(req.params.id, getUserId(req));
  })
);
router.post(
  '/invoices/:id/pay',
  wrap(async req => {
    await loadInvoiceInBranch(req, req.params.id); // W269
    return financeOpsService.markInvoicePaid(req.params.id, req.body, getUserId(req));
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// JOURNAL ENTRIES — القيود اليومية
// ═══════════════════════════════════════════════════════════════════════════════

router.get(
  '/journal-entries',
  wrap(async req => financeOpsService.listJournalEntries(req.query))
);
router.get(
  '/journal-entries/:id',
  wrap(async req => financeOpsService.getJournalEntry(req.params.id))
);
router.post(
  '/journal-entries',
  wrap(async req => financeOpsService.createJournalEntry(req.body, getUserId(req)))
);
router.put(
  '/journal-entries/:id',
  wrap(async req => financeOpsService.updateJournalEntry(req.params.id, req.body, getUserId(req)))
);
router.delete(
  '/journal-entries/:id',
  wrap(async req => financeOpsService.deleteJournalEntry(req.params.id))
);

// ═══════════════════════════════════════════════════════════════════════════════
// PETTY CASH — الصندوق الصغير
// ═══════════════════════════════════════════════════════════════════════════════

router.get(
  '/petty-cash',
  wrap(async req => financeOpsService.listPettyCash(req.query))
);
router.get(
  '/petty-cash/:id',
  wrap(async req => financeOpsService.getPettyCash(req.params.id))
);
router.post(
  '/petty-cash',
  wrap(async req => financeOpsService.createPettyCash(req.body, getUserId(req)))
);
router.put(
  '/petty-cash/:id',
  wrap(async req => financeOpsService.updatePettyCash(req.params.id, req.body, getUserId(req)))
);
router.delete(
  '/petty-cash/:id',
  wrap(async req => financeOpsService.deletePettyCash(req.params.id))
);

// ═══════════════════════════════════════════════════════════════════════════════
// CHEQUES — الشيكات
// ═══════════════════════════════════════════════════════════════════════════════

router.get(
  '/cheques',
  wrap(async req => financeOpsService.listCheques(req.query))
);
router.get(
  '/cheques/:id',
  wrap(async req => financeOpsService.getCheque(req.params.id))
);
router.post(
  '/cheques',
  wrap(async req => financeOpsService.createCheque(req.body, getUserId(req)))
);
router.put(
  '/cheques/:id',
  wrap(async req => financeOpsService.updateCheque(req.params.id, req.body, getUserId(req)))
);
router.delete(
  '/cheques/:id',
  wrap(async req => financeOpsService.deleteCheque(req.params.id))
);

// ═══════════════════════════════════════════════════════════════════════════════
// BANK RECONCILIATION — المطابقة البنكية
// ═══════════════════════════════════════════════════════════════════════════════

router.get(
  '/bank-reconciliation',
  wrap(async req => financeOpsService.listBankReconciliations(req.query))
);
router.get(
  '/bank-reconciliation/:id',
  wrap(async req => financeOpsService.getBankReconciliation(req.params.id))
);
router.post(
  '/bank-reconciliation',
  wrap(async req => financeOpsService.createBankReconciliation(req.body, getUserId(req)))
);
router.put(
  '/bank-reconciliation/:id',
  wrap(async req =>
    financeOpsService.updateBankReconciliation(req.params.id, req.body, getUserId(req))
  )
);

// ═══════════════════════════════════════════════════════════════════════════════
// CREDIT NOTES — إشعارات الائتمان
// ═══════════════════════════════════════════════════════════════════════════════

router.get(
  '/credit-notes',
  wrap(async req => financeOpsService.listCreditNotes(req.query))
);
router.get(
  '/credit-notes/:id',
  wrap(async req => financeOpsService.getCreditNote(req.params.id))
);
router.post(
  '/credit-notes',
  wrap(async req => financeOpsService.createCreditNote(req.body, getUserId(req)))
);
router.put(
  '/credit-notes/:id',
  wrap(async req => financeOpsService.updateCreditNote(req.params.id, req.body, getUserId(req)))
);

module.exports = router;
