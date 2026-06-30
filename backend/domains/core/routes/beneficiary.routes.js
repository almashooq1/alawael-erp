/**
 * Beneficiary Routes — مسارات API للمستفيد
 * @module domains/core/routes/beneficiary.routes
 */

const { effectiveBranchScope } = require('../../../middleware/assertBranchMatch');
const { escapeFormulaInjection } = require('../../../services/importExport/format-helpers');

// W1558 — mass-assignment guard: caller-supplied privileged fields that POST/PUT
// /beneficiaries must NOT be able to self-set (each verified against the canonical
// models/Beneficiary.js). status → the dedicated /:id/status endpoint; branchId →
// server-derived; account/audit/archived/computed-progress are server-owned.
const PROTECTED_CREATE_UPDATE_FIELDS = new Set([
  '_id',
  'status',
  'branchId',
  'createdBy',
  'lastModifiedBy',
  'isArchived',
  'archivedDate',
  'archivedReason',
  'accountStatus',
  'accountVerified',
  'accountVerificationCode',
  'password',
  'passwordResetToken',
  'passwordResetExpires',
  'twoFactorSecret',
  'twoFactorEnabled',
  'registrationDate',
  'progress',
]);

function stripProtectedFields(body) {
  if (!body || typeof body !== 'object') return {};
  const clean = {};
  for (const k of Object.keys(body)) {
    if (!PROTECTED_CREATE_UPDATE_FIELDS.has(k)) clean[k] = body[k];
  }
  return clean;
}

// ── Sort parser ──────────────────────────────────────────────────────────────
// Supports both MongoDB JSON sort (`{"createdAt":-1}`) and string shorthand
// (`-createdAt` or `createdAt`) sent by the admin UI.
function parseSort(sort) {
  if (!sort) return { createdAt: -1 };
  if (typeof sort === 'string' && sort.trim().startsWith('{')) {
    try {
      return JSON.parse(sort);
    } catch {
      return { createdAt: -1 };
    }
  }
  if (typeof sort === 'string') {
    const sortObj = {};
    sort.split(',').forEach(s => {
      if (s.startsWith('-')) {
        sortObj[s.slice(1)] = -1;
      } else {
        sortObj[s] = 1;
      }
    });
    return sortObj;
  }
  return sort;
}

// ── CSV helpers (mirrored from legacy /api/beneficiaries/export) ─────────────
const CATEGORY_LABELS = {
  physical: 'حركية',
  mental: 'ذهنية',
  sensory: 'حسية',
  multiple: 'متعددة',
  learning: 'تعلم',
  speech: 'نطق',
  other: 'أخرى',
};

const STATUS_LABELS = {
  draft: 'مسودة',
  waitlisted: 'قائمة الانتظار',
  active: 'نشط',
  suspended: 'معلق',
  'transferred-pending': 'نقل قيد التنفيذ',
  transferred: 'محوّل',
  discharged: 'متخرج',
  deceased: 'متوفى',
  archived: 'مؤرشف',
  'deletion-pending': 'حذف قيد المراجعة',
  deleted: 'محذوف',
  inactive: 'غير نشط',
  pending: 'قيد الانتظار',
  graduated: 'متخرج',
};

function toCsvCell(v) {
  const s = escapeFormulaInjection(v == null ? '' : String(v));
  return `"${s.replace(/"/g, '""')}"`;
}

function beneficiariesToCsv(data) {
  let csv = 'الاسم,الحالة,نوع الإعاقة,الجنس,الهاتف,البريد,المدينة,تاريخ التسجيل,التقدم\n';
  data.forEach(b => {
    const name = b.fullName || b.name || `${b.firstName || ''} ${b.lastName || ''}`;
    const phone = b.contactInfo?.primaryPhone || b.phone || '';
    const date = (b.registrationDate || b.createdAt || '').toString().slice(0, 10);
    csv +=
      [
        toCsvCell(name),
        toCsvCell(STATUS_LABELS[b.status] || b.status),
        toCsvCell(CATEGORY_LABELS[b.category] || b.category || ''),
        toCsvCell(b.gender || ''),
        toCsvCell(phone),
        toCsvCell(b.email || ''),
        toCsvCell(b.address?.city || ''),
        toCsvCell(date),
        toCsvCell(`${b.progress || 0}%`),
      ].join(',') + '\n';
  });
  return '\uFEFF' + csv;
}

/**
 * @param {import('express').Router} router
 * @param {import('../services/beneficiary.service').BeneficiaryService} service
 */
function createBeneficiaryRoutes(router, service) {
  // ── قائمة المستفيدين مع ترقيم الصفحات والفلاتر ───────────────────

  router.get('/beneficiaries', async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 20,
        sort,
        search,
        status,
        category,
        gender,
        city,
        minAge,
        maxAge,
        archived,
        branchId,
      } = req.query;

      // W1146: branch-restricted callers always get their own branch —
      // ?branchId= spoofing is ignored (effectiveBranchScope wins).
      const scopedBranch = effectiveBranchScope(req);
      const filters = {
        search,
        status,
        category,
        gender,
        city,
        minAge,
        maxAge,
        branchId: scopedBranch || branchId,
        isArchived: archived === 'true' ? true : { $ne: true },
      };

      const result = await service.listWithFilters({
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        sort: parseSort(sort),
        ...filters,
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  });

  // ── بحث متقدم ──────────────────────────────────────────────────

  router.get('/beneficiaries/search', async (req, res, next) => {
    try {
      const scopedBranch = effectiveBranchScope(req);
      if (scopedBranch) req.query.branchId = scopedBranch;
      const result = await service.search(req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  });

  // ── إحصائيات ───────────────────────────────────────────────────

  router.get('/beneficiaries/statistics', async (req, res, next) => {
    try {
      const stats = await service.getStatistics(effectiveBranchScope(req) || req.query.branchId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  });

  // ── الحالات عالية المخاطر ──────────────────────────────────────

  router.get('/beneficiaries/high-risk', async (req, res, next) => {
    try {
      const cases = await service.getHighRiskCases(effectiveBranchScope(req) || req.query.branchId);
      res.json({ success: true, data: cases, total: cases.length });
    } catch (error) {
      next(error);
    }
  });

  // ── الحالات التي تحتاج متابعة ──────────────────────────────────

  router.get('/beneficiaries/needs-attention', async (req, res, next) => {
    try {
      const cases = await service.getCasesNeedingAttention(
        effectiveBranchScope(req) || req.query.branchId
      );
      res.json({ success: true, data: cases, total: cases.length });
    } catch (error) {
      next(error);
    }
  });

  // ── أحدث المستفيدين ────────────────────────────────────────────

  router.get('/beneficiaries/recent', async (req, res, next) => {
    try {
      const { limit = 5 } = req.query;
      const data = await service.getRecent(limit, effectiveBranchScope(req) || req.query.branchId);
      res.json({ success: true, data, total: data.length });
    } catch (error) {
      next(error);
    }
  });

  // ── الحالات عالية المخاطر (بديل /at-risk للواجهة الأمامية) ───────

  router.get('/beneficiaries/at-risk', async (req, res, next) => {
    try {
      const { limit = 50 } = req.query;
      const data = await service.getAtRisk(limit, effectiveBranchScope(req) || req.query.branchId);
      res.json({ success: true, data, total: data.length });
    } catch (error) {
      next(error);
    }
  });

  // ── قائمة المدن ─────────────────────────────────────────────────

  router.get('/beneficiaries/cities', async (req, res, next) => {
    try {
      const data = await service.getCities(effectiveBranchScope(req) || req.query.branchId);
      res.json({ success: true, data, total: data.length });
    } catch (error) {
      next(error);
    }
  });

  // ── تصدير المستفيدين ────────────────────────────────────────────

  router.get('/beneficiaries/export', async (req, res, next) => {
    try {
      const { status, category } = req.query;
      const filters = {
        status,
        category,
        branchId: effectiveBranchScope(req) || req.query.branchId,
      };
      const data = await service.getExportData(filters);
      const csv = beneficiariesToCsv(data);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=beneficiaries-export.csv');
      res.send(csv);
    } catch (error) {
      next(error);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // توافق واجهة المركز اليومي القديمة (facade /api/v1/beneficiary-core)
  // ═══════════════════════════════════════════════════════════════════════

  // ── لوحة مركز الحالات ────────────────────────────────────────────

  router.get('/beneficiaries/dashboard', async (req, res, next) => {
    try {
      const branchId = effectiveBranchScope(req);
      const data = await service.getDashboard(branchId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  // ── قائمة المستفيدين لمركز الحالات ───────────────────────────────

  router.get('/beneficiaries/episode-center', async (req, res, next) => {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        status,
        disabilityType,
        branchId,
        sort,
      } = req.query;
      const scopedBranch = effectiveBranchScope(req);
      const data = await service.listEpisodeCenter({
        page: parseInt(page, 10),
        limit: Math.min(parseInt(limit, 10), 100),
        search,
        status,
        disabilityType,
        branchId: scopedBranch || branchId,
        sort,
      });
      res.json({ success: true, ...data });
    } catch (error) {
      next(error);
    }
  });

  // ── مستفيد واحد ────────────────────────────────────────────────

  router.get('/beneficiaries/:beneficiaryId', async (req, res, next) => {
    try {
      const beneficiary = await service.getById(req.params.beneficiaryId);
      res.json({ success: true, data: beneficiary });
    } catch (error) {
      next(error);
    }
  });

  // ── السياق الكامل 360° ─────────────────────────────────────────

  router.get('/beneficiaries/:beneficiaryId/360', async (req, res, next) => {
    try {
      const fullContext = await service.getFullContext(req.params.beneficiaryId);
      res.json({ success: true, data: fullContext });
    } catch (error) {
      next(error);
    }
  });

  // ── إنشاء مستفيد ───────────────────────────────────────────────

  router.post('/beneficiaries', async (req, res, next) => {
    try {
      const context = {
        userId: req.user?._id || req.user?.id,
        // W1558 — server-derived branch (req.user.branchId is never populated); the
        // body cannot set branchId (stripped below), so beforeCreate stamps this.
        branchId: effectiveBranchScope(req),
      };
      const beneficiary = await service.create(stripProtectedFields(req.body), context);
      res.status(201).json({ success: true, data: beneficiary });
    } catch (error) {
      next(error);
    }
  });

  // ── تحديث مستفيد ───────────────────────────────────────────────

  router.put('/beneficiaries/:beneficiaryId', async (req, res, next) => {
    try {
      const context = {
        userId: req.user?._id || req.user?.id,
      };
      const updated = await service.update(
        req.params.beneficiaryId,
        stripProtectedFields(req.body),
        context
      );
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  });

  // ── تحديث حالة مستفيد ──────────────────────────────────────────

  router.patch('/beneficiaries/:beneficiaryId/status', async (req, res, next) => {
    try {
      const context = {
        userId: req.user?._id || req.user?.id,
        reason: req.body.reason,
      };
      const updated = await service.updateStatus(
        req.params.beneficiaryId,
        req.body.status,
        context
      );
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  });

  // ── عملية جماعية ───────────────────────────────────────────────

  router.post('/beneficiaries/bulk-action', async (req, res, next) => {
    try {
      const { action, ids, payload } = req.body;
      const context = {
        userId: req.user?._id || req.user?.id,
      };
      const result = await service.bulkAction(action, ids, payload, context);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  });

  // ── أرشفة مستفيد ───────────────────────────────────────────────

  router.post('/beneficiaries/:beneficiaryId/archive', async (req, res, next) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const result = await service.archiveBeneficiary(
        req.params.beneficiaryId,
        req.body.reason,
        userId
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  });

  // ── إلغاء أرشفة ───────────────────────────────────────────────

  router.post('/beneficiaries/:beneficiaryId/unarchive', async (req, res, next) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const result = await service.unarchiveBeneficiary(req.params.beneficiaryId, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  });

  // ── إضافة علم مخاطر ────────────────────────────────────────────

  router.post('/beneficiaries/:beneficiaryId/risk-flags', async (req, res, next) => {
    try {
      const flag = {
        ...req.body,
        raisedBy: req.user?._id || req.user?.id,
      };
      const result = await service.addRiskFlag(req.params.beneficiaryId, flag);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  });

  // ── حل علم مخاطر ───────────────────────────────────────────────

  router.post(
    '/beneficiaries/:beneficiaryId/risk-flags/:flagId/resolve',
    async (req, res, next) => {
      try {
        const userId = req.user?._id || req.user?.id;
        const result = await service.resolveRiskFlag(
          req.params.beneficiaryId,
          req.params.flagId,
          userId
        );
        res.json({ success: true, data: result });
      } catch (error) {
        next(error);
      }
    }
  );

  // ── حذف مستفيد (soft delete) ───────────────────────────────────

  router.delete('/beneficiaries/:beneficiaryId', async (req, res, next) => {
    try {
      const context = { userId: req.user?._id || req.user?.id };
      await service.delete(req.params.beneficiaryId, context);
      res.json({ success: true, message: 'تم أرشفة المستفيد بنجاح' });
    } catch (error) {
      next(error);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // توافق واجهة المركز اليومي القديمة (facade /api/v1/beneficiary-core)
  // ═══════════════════════════════════════════════════════════════════════

  // ── لوحة مركز الحالات ────────────────────────────────────────────

  router.get('/beneficiaries/dashboard', async (req, res, next) => {
    try {
      const branchId = effectiveBranchScope(req);
      const data = await service.getDashboard(branchId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });

  // ── ملف المستفيد الشامل (360) لمركز الحالات ───────────────────────

  router.get('/beneficiaries/:beneficiaryId/episode-center', async (req, res, next) => {
    try {
      const data = await service.getEpisodeCenterProfile(req.params.beneficiaryId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  });
}

module.exports = { createBeneficiaryRoutes };
