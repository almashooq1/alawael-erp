/**
 * Fleet Disposal Controller - تحكم التخلص من المركبات
 */

const fleetDisposalService = require('../services/fleetDisposalService');
const logger = require('../utils/logger');

const { safeError } = require('../utils/safeError');
class FleetDisposalController {
  static async create(req, res) {
    try {
      const data = { ...req.body, organization: req.user?.organization, createdBy: req.user?._id };
      const record = await fleetDisposalService.create(data);
      res.status(201).json({ success: true, message: 'تم بدء عملية التخلص بنجاح', data: record });
    } catch (error) {
      logger.error('FleetDisposal create error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في بدء عملية التخلص', error: safeError(error) });
    }
  }

  static async getAll(req, res) {
    try {
      const result = await fleetDisposalService.getAll({
        ...req.query,
        organization: req.user?.organization,
      });
      res.json({ success: true, message: 'تم جلب سجلات التخلص', ...result });
    } catch (error) {
      logger.error('FleetDisposal getAll error:', error);
      res.status(500).json({ success: false, message: 'خطأ في جلب السجلات', error: safeError(error) });
    }
  }

  static async getById(req, res) {
    try {
      const record = await fleetDisposalService.getById(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'سجل التخلص غير موجود' });
      res.json({ success: true, data: record });
    } catch (error) {
      logger.error('FleetDisposal getById error:', error);
      res.status(500).json({ success: false, message: 'خطأ في جلب السجل', error: safeError(error) });
    }
  }

  static async update(req, res) {
    try {
      const record = await fleetDisposalService.update(req.params.id, {
        ...req.body,
        updatedBy: req.user?._id,
      });
      if (!record) return res.status(404).json({ success: false, message: 'سجل التخلص غير موجود' });
      res.json({ success: true, message: 'تم تحديث السجل', data: record });
    } catch (error) {
      logger.error('FleetDisposal update error:', error);
      res.status(500).json({ success: false, message: 'خطأ في تحديث السجل', error: safeError(error) });
    }
  }

  static async delete(req, res) {
    try {
      const record = await fleetDisposalService.delete(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'سجل التخلص غير موجود' });
      res.json({ success: true, message: 'تم حذف السجل' });
    } catch (error) {
      logger.error('FleetDisposal delete error:', error);
      res.status(500).json({ success: false, message: 'خطأ في حذف السجل', error: safeError(error) });
    }
  }

  static async approve(req, res) {
    try {
      const record = await fleetDisposalService.approve(
        req.params.id,
        req.user?._id,
        req.body.comments
      );
      res.json({ success: true, message: 'تمت الموافقة على التخلص', data: record });
    } catch (error) {
      logger.error('FleetDisposal approve error:', error);
      res.status(500).json({ success: false, message: 'خطأ في الموافقة', error: safeError(error) });
    }
  }

  static async reject(req, res) {
    try {
      const record = await fleetDisposalService.reject(
        req.params.id,
        req.user?._id,
        req.body.comments
      );
      res.json({ success: true, message: 'تم رفض التخلص', data: record });
    } catch (error) {
      logger.error('FleetDisposal reject error:', error);
      res.status(500).json({ success: false, message: 'خطأ في الرفض', error: safeError(error) });
    }
  }

  static async listForAuction(req, res) {
    try {
      const record = await fleetDisposalService.listForAuction(req.params.id, req.body);
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, message: 'تم إدراج المركبة للمزاد', data: record });
    } catch (error) {
      logger.error('FleetDisposal listForAuction error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في الإدراج للمزاد', error: safeError(error) });
    }
  }

  static async addBid(req, res) {
    try {
      const record = await fleetDisposalService.addBid(req.params.id, req.body);
      res.json({ success: true, message: 'تم إضافة العرض', data: record });
    } catch (error) {
      logger.error('FleetDisposal addBid error:', error);
      res.status(500).json({ success: false, message: 'خطأ في إضافة العرض', error: safeError(error) });
    }
  }

  static async awardBid(req, res) {
    try {
      const record = await fleetDisposalService.awardBid(req.params.id, req.body.bidIndex);
      res.json({ success: true, message: 'تم ترسية المزاد', data: record });
    } catch (error) {
      logger.error('FleetDisposal awardBid error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في ترسية المزاد', error: safeError(error) });
    }
  }

  static async recordSale(req, res) {
    try {
      const record = await fleetDisposalService.recordSale(req.params.id, req.body);
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, message: 'تم تسجيل البيع', data: record });
    } catch (error) {
      logger.error('FleetDisposal recordSale error:', error);
      res.status(500).json({ success: false, message: 'خطأ في تسجيل البيع', error: safeError(error) });
    }
  }

  static async complete(req, res) {
    try {
      const record = await fleetDisposalService.complete(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
      res.json({ success: true, message: 'تم إكمال عملية التخلص', data: record });
    } catch (error) {
      logger.error('FleetDisposal complete error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في إكمال العملية', error: safeError(error) });
    }
  }

  static async getByVehicle(req, res) {
    try {
      const data = await fleetDisposalService.getByVehicle(req.params.vehicleId);
      res.json({ success: true, data });
    } catch (error) {
      logger.error('FleetDisposal getByVehicle error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب سجلات المركبة', error: safeError(error) });
    }
  }

  static async getStatistics(req, res) {
    try {
      const stats = await fleetDisposalService.getStatistics(req.user?.organization);
      res.json({ success: true, message: 'إحصائيات التخلص', data: stats });
    } catch (error) {
      logger.error('FleetDisposal statistics error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب الإحصائيات', error: safeError(error) });
    }
  }
}

module.exports = FleetDisposalController;
