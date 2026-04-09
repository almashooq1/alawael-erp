/**
 * Beneficiary Routes — مسارات API للمستفيد
 * @module domains/core/routes/beneficiary.routes
 */

/**
 * @param {import('express').Router} router
 * @param {import('../services/beneficiary.service').BeneficiaryService} service
 */
function createBeneficiaryRoutes(router, service) {
  // ── قائمة المستفيدين مع ترقيم الصفحات ─────────────────────────

  router.get('/beneficiaries', async (req, res, next) => {
    try {
      const { page = 1, limit = 20, sort, status, branchId } = req.query;
      const filter = {};
      if (status) filter.status = status;
      if (branchId) filter.branchId = branchId;

      const result = await service.list({
        filter,
        page: parseInt(page),
        limit: parseInt(limit),
        sort: sort ? JSON.parse(sort) : { createdAt: -1 },
      });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  });

  // ── بحث متقدم ──────────────────────────────────────────────────

  router.get('/beneficiaries/search', async (req, res, next) => {
    try {
      const result = await service.search(req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  });

  // ── إحصائيات ───────────────────────────────────────────────────

  router.get('/beneficiaries/statistics', async (req, res, next) => {
    try {
      const stats = await service.getStatistics(req.query.branchId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  });

  // ── الحالات عالية المخاطر ──────────────────────────────────────

  router.get('/beneficiaries/high-risk', async (req, res, next) => {
    try {
      const cases = await service.getHighRiskCases(req.query.branchId);
      res.json({ success: true, data: cases, total: cases.length });
    } catch (error) {
      next(error);
    }
  });

  // ── الحالات التي تحتاج متابعة ──────────────────────────────────

  router.get('/beneficiaries/needs-attention', async (req, res, next) => {
    try {
      const cases = await service.getCasesNeedingAttention(req.query.branchId);
      res.json({ success: true, data: cases, total: cases.length });
    } catch (error) {
      next(error);
    }
  });

  // ── مستفيد واحد ────────────────────────────────────────────────

  router.get('/beneficiaries/:id', async (req, res, next) => {
    try {
      const beneficiary = await service.getById(req.params.id);
      res.json({ success: true, data: beneficiary });
    } catch (error) {
      next(error);
    }
  });

  // ── السياق الكامل 360° ─────────────────────────────────────────

  router.get('/beneficiaries/:id/360', async (req, res, next) => {
    try {
      const fullContext = await service.getFullContext(req.params.id);
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
        branchId: req.user?.branchId,
      };
      const beneficiary = await service.create(req.body, context);
      res.status(201).json({ success: true, data: beneficiary });
    } catch (error) {
      next(error);
    }
  });

  // ── تحديث مستفيد ───────────────────────────────────────────────

  router.put('/beneficiaries/:id', async (req, res, next) => {
    try {
      const context = {
        userId: req.user?._id || req.user?.id,
      };
      const updated = await service.update(req.params.id, req.body, context);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  });

  // ── أرشفة مستفيد ───────────────────────────────────────────────

  router.post('/beneficiaries/:id/archive', async (req, res, next) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const result = await service.archiveBeneficiary(req.params.id, req.body.reason, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  });

  // ── إلغاء أرشفة ───────────────────────────────────────────────

  router.post('/beneficiaries/:id/unarchive', async (req, res, next) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const result = await service.unarchiveBeneficiary(req.params.id, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  });

  // ── إضافة علم مخاطر ────────────────────────────────────────────

  router.post('/beneficiaries/:id/risk-flags', async (req, res, next) => {
    try {
      const flag = {
        ...req.body,
        raisedBy: req.user?._id || req.user?.id,
      };
      const result = await service.addRiskFlag(req.params.id, flag);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  });

  // ── حل علم مخاطر ───────────────────────────────────────────────

  router.post('/beneficiaries/:id/risk-flags/:flagId/resolve', async (req, res, next) => {
    try {
      const userId = req.user?._id || req.user?.id;
      const result = await service.resolveRiskFlag(req.params.id, req.params.flagId, userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  });

  // ── حذف مستفيد (soft delete) ───────────────────────────────────

  router.delete('/beneficiaries/:id', async (req, res, next) => {
    try {
      const context = { userId: req.user?._id || req.user?.id };
      await service.delete(req.params.id, context);
      res.json({ success: true, message: 'تم أرشفة المستفيد بنجاح' });
    } catch (error) {
      next(error);
    }
  });
}

module.exports = { createBeneficiaryRoutes };
