/**
 * Fleet Communication Controller - تحكم اتصالات الأسطول
 */

const fleetCommunicationService = require('../services/fleetCommunicationService');
const logger = require('../utils/logger');

class FleetCommunicationController {
  static async create(req, res) {
    try {
      const data = { ...req.body, organization: req.user?.organization, createdBy: req.user?._id };
      const record = await fleetCommunicationService.create(data);
      res.status(201).json({ success: true, message: 'تم إنشاء الرسالة بنجاح', data: record });
    } catch (error) {
      logger.error('FleetComm create error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في إنشاء الرسالة', error: error.message });
    }
  }

  static async getAll(req, res) {
    try {
      const result = await fleetCommunicationService.getAll({
        ...req.query,
        organization: req.user?.organization,
      });
      res.json({ success: true, message: 'تم جلب الرسائل', ...result });
    } catch (error) {
      logger.error('FleetComm getAll error:', error);
      res.status(500).json({ success: false, message: 'خطأ في جلب الرسائل', error: error.message });
    }
  }

  static async getById(req, res) {
    try {
      const record = await fleetCommunicationService.getById(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'الرسالة غير موجودة' });
      res.json({ success: true, data: record });
    } catch (error) {
      logger.error('FleetComm getById error:', error);
      res.status(500).json({ success: false, message: 'خطأ في جلب الرسالة', error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const record = await fleetCommunicationService.update(req.params.id, {
        ...req.body,
        updatedBy: req.user?._id,
      });
      if (!record) return res.status(404).json({ success: false, message: 'الرسالة غير موجودة' });
      res.json({ success: true, message: 'تم تحديث الرسالة', data: record });
    } catch (error) {
      logger.error('FleetComm update error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تحديث الرسالة', error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const record = await fleetCommunicationService.delete(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'الرسالة غير موجودة' });
      res.json({ success: true, message: 'تم حذف الرسالة' });
    } catch (error) {
      logger.error('FleetComm delete error:', error);
      res.status(500).json({ success: false, message: 'خطأ في حذف الرسالة', error: error.message });
    }
  }

  static async send(req, res) {
    try {
      const record = await fleetCommunicationService.send(req.params.id);
      res.json({ success: true, message: 'تم إرسال الرسالة', data: record });
    } catch (error) {
      logger.error('FleetComm send error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في إرسال الرسالة', error: error.message });
    }
  }

  static async markRead(req, res) {
    try {
      const record = await fleetCommunicationService.markRead(req.params.id, req.user?._id);
      res.json({ success: true, message: 'تم تحديد كمقروء', data: record });
    } catch (error) {
      logger.error('FleetComm markRead error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تحديد كمقروء', error: error.message });
    }
  }

  static async acknowledge(req, res) {
    try {
      const record = await fleetCommunicationService.acknowledge(req.params.id, req.user?._id);
      res.json({ success: true, message: 'تم تأكيد الاستلام', data: record });
    } catch (error) {
      logger.error('FleetComm acknowledge error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تأكيد الاستلام', error: error.message });
    }
  }

  static async sendSOS(req, res) {
    try {
      const data = { ...req.body, organization: req.user?.organization, createdBy: req.user?._id };
      const record = await fleetCommunicationService.sendSOS(data);
      res
        .status(201)
        .json({ success: true, message: '🚨 تم إرسال تنبيه الطوارئ SOS', data: record });
    } catch (error) {
      logger.error('FleetComm sendSOS error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في إرسال تنبيه الطوارئ', error: error.message });
    }
  }

  static async resolveSOS(req, res) {
    try {
      const record = await fleetCommunicationService.resolveSOS(req.params.id, req.user?._id);
      if (!record) return res.status(404).json({ success: false, message: 'تنبيه SOS غير موجود' });
      res.json({ success: true, message: 'تم حل تنبيه الطوارئ', data: record });
    } catch (error) {
      logger.error('FleetComm resolveSOS error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في حل تنبيه الطوارئ', error: error.message });
    }
  }

  static async escalateSOS(req, res) {
    try {
      const record = await fleetCommunicationService.escalateSOS(req.params.id, req.body);
      res.json({ success: true, message: 'تم تصعيد تنبيه الطوارئ', data: record });
    } catch (error) {
      logger.error('FleetComm escalateSOS error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في تصعيد التنبيه', error: error.message });
    }
  }

  static async getActiveSOS(req, res) {
    try {
      const result = await fleetCommunicationService.getActiveSOS({
        ...req.query,
        organization: req.user?.organization,
      });
      res.json({ success: true, message: 'تنبيهات الطوارئ النشطة', ...result });
    } catch (error) {
      logger.error('FleetComm getActiveSOS error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب تنبيهات الطوارئ', error: error.message });
    }
  }

  static async getThread(req, res) {
    try {
      const data = await fleetCommunicationService.getThread(req.params.id);
      res.json({ success: true, data });
    } catch (error) {
      logger.error('FleetComm getThread error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب سلسلة الرسائل', error: error.message });
    }
  }

  static async getDriverInbox(req, res) {
    try {
      const result = await fleetCommunicationService.getDriverInbox(req.params.driverId, req.query);
      res.json({ success: true, message: 'صندوق وارد السائق', ...result });
    } catch (error) {
      logger.error('FleetComm getDriverInbox error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب صندوق الوارد', error: error.message });
    }
  }

  static async getBroadcasts(req, res) {
    try {
      const result = await fleetCommunicationService.getBroadcasts({
        ...req.query,
        organization: req.user?.organization,
      });
      res.json({ success: true, message: 'الإعلانات العامة', ...result });
    } catch (error) {
      logger.error('FleetComm getBroadcasts error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب الإعلانات', error: error.message });
    }
  }

  static async getStatistics(req, res) {
    try {
      const stats = await fleetCommunicationService.getStatistics(req.user?.organization);
      res.json({ success: true, message: 'إحصائيات الاتصالات', data: stats });
    } catch (error) {
      logger.error('FleetComm statistics error:', error);
      res
        .status(500)
        .json({ success: false, message: 'خطأ في جلب الإحصائيات', error: error.message });
    }
  }
}

module.exports = FleetCommunicationController;
