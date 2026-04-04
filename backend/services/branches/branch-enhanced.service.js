'use strict';

const mongoose = require('mongoose');
const Room = require('../../models/Room');
const BranchService = require('../../models/BranchService');
const BranchSetting = require('../../models/BranchSetting');
const BeneficiaryTransfer = require('../../models/BeneficiaryTransfer');
const logger = require('../../utils/logger');

/**
 * خدمة إدارة الفروع المحسّنة
 * Enhanced Branch Management Service — Prompt 10
 */
class BranchEnhancedService {
  // ============================================================
  // إعدادات الفرع
  // ============================================================

  /**
   * تهيئة إعدادات افتراضية لفرع جديد
   */
  async initializeSettings(branchId, branchCode) {
    const defaults = [
      // جدولة
      { key: 'appointment_slot_duration', value: '45', type: 'integer', group: 'scheduling' },
      { key: 'appointment_buffer_minutes', value: '15', type: 'integer', group: 'scheduling' },
      {
        key: 'max_daily_appointments_per_therapist',
        value: '10',
        type: 'integer',
        group: 'scheduling',
      },
      { key: 'allow_weekend_appointments', value: 'false', type: 'boolean', group: 'scheduling' },
      { key: 'auto_confirm_appointments', value: 'false', type: 'boolean', group: 'scheduling' },
      { key: 'cancellation_window_hours', value: '24', type: 'integer', group: 'scheduling' },
      // فوترة
      { key: 'default_payment_terms_days', value: '30', type: 'integer', group: 'billing' },
      { key: 'auto_generate_invoice', value: 'true', type: 'boolean', group: 'billing' },
      { key: 'invoice_prefix', value: `INV-${branchCode}-`, type: 'string', group: 'billing' },
      { key: 'accept_cash', value: 'true', type: 'boolean', group: 'billing' },
      { key: 'accept_card', value: 'true', type: 'boolean', group: 'billing' },
      { key: 'accept_bank_transfer', value: 'true', type: 'boolean', group: 'billing' },
      // إشعارات
      { key: 'send_appointment_reminders', value: 'true', type: 'boolean', group: 'notifications' },
      {
        key: 'reminder_channels',
        value: '["sms","whatsapp"]',
        type: 'json',
        group: 'notifications',
      },
      { key: 'send_absence_alerts', value: 'true', type: 'boolean', group: 'notifications' },
      // موارد بشرية
      { key: 'check_in_method', value: 'biometric', type: 'string', group: 'hr' },
      { key: 'late_threshold_minutes', value: '15', type: 'integer', group: 'hr' },
      { key: 'overtime_requires_approval', value: 'true', type: 'boolean', group: 'hr' },
    ];

    const operations = defaults.map(s =>
      BranchSetting.findOneAndUpdate(
        { branchId, key: s.key },
        { ...s, branchId },
        { upsert: true, new: true }
      )
    );

    await Promise.all(operations);
    logger.info(`[Branch] تم تهيئة ${defaults.length} إعداد للفرع ${branchCode}`);
  }

  /**
   * الحصول على إعداد فرع محدد
   */
  async getSetting(branchId, key, defaultValue = null) {
    const setting = await BranchSetting.findOne({ branchId, key });
    if (!setting) return defaultValue;
    return setting.getParsedValue();
  }

  /**
   * تحديث إعدادات الفرع دفعةً واحدة
   */
  async updateSettings(branchId, settings, updatedBy) {
    const ops = Object.entries(settings).map(([key, value]) =>
      BranchSetting.findOneAndUpdate({ branchId, key }, { value: String(value) }, { new: true })
    );
    return Promise.all(ops);
  }

  /**
   * الحصول على جميع إعدادات الفرع مجمّعة حسب المجموعة
   */
  async getSettings(branchId, group = null) {
    const query = { branchId };
    if (group) query.group = group;
    const settings = await BranchSetting.find(query).sort({ group: 1, key: 1 });

    return settings.reduce((acc, s) => {
      if (!acc[s.group]) acc[s.group] = {};
      acc[s.group][s.key] = s.getParsedValue();
      return acc;
    }, {});
  }

  // ============================================================
  // إدارة الغرف
  // ============================================================

  async createRoom(branchId, data) {
    // توليد كود الغرفة إذا لم يُوفَّر
    if (!data.code) {
      const count = await Room.countDocuments({ branchId });
      data.code = `R-${String(count + 1).padStart(3, '0')}`;
    }
    return Room.create({ ...data, branchId });
  }

  async getRooms(branchId, filters = {}) {
    const query = { branchId };
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    return Room.find(query).sort({ code: 1 });
  }

  async updateRoomStatus(roomId, status) {
    return Room.findByIdAndUpdate(roomId, { status }, { new: true });
  }

  async getRoomSchedule(roomId, date) {
    try {
      const Appointment = require('../../models/Appointment');
      return Appointment.find({
        roomId,
        date: {
          $gte: new Date(date),
          $lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)),
        },
        status: { $ne: 'cancelled' },
      }).sort({ startTime: 1 });
    } catch {
      return [];
    }
  }

  // ============================================================
  // خدمات الفرع والأسعار
  // ============================================================

  async createBranchService(branchId, data) {
    return BranchService.create({ ...data, branchId });
  }

  async getBranchServices(branchId, activeOnly = true) {
    const query = { branchId };
    if (activeOnly) query.isActive = true;
    return BranchService.find(query).sort({ sortOrder: 1, serviceCode: 1 });
  }

  async updateBranchServicePrice(branchId, serviceCode, price) {
    return BranchService.findOneAndUpdate({ branchId, serviceCode }, { price }, { new: true });
  }

  // ============================================================
  // نقل المستفيدين بين الفروع
  // ============================================================

  async requestTransfer(data, requestedBy) {
    return BeneficiaryTransfer.create({ ...data, requestedBy });
  }

  async approveTransfer(transferId, approvedBy) {
    return BeneficiaryTransfer.findByIdAndUpdate(
      transferId,
      { status: 'approved', approvedBy, approvedAt: new Date() },
      { new: true }
    );
  }

  async rejectTransfer(transferId, approvedBy, reason) {
    return BeneficiaryTransfer.findByIdAndUpdate(
      transferId,
      { status: 'rejected', approvedBy, rejectionReason: reason },
      { new: true }
    );
  }

  /**
   * إتمام النقل
   */
  async completeTransfer(transferId) {
    const transfer = await BeneficiaryTransfer.findById(transferId);
    if (!transfer) throw new Error('طلب النقل غير موجود');
    if (transfer.status !== 'approved') throw new Error('طلب النقل غير موافق عليه');

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // تحديث الفرع في سجل المستفيد
      const Beneficiary = require('../../models/Beneficiary');
      await Beneficiary.findByIdAndUpdate(
        transfer.beneficiaryId,
        { branchId: transfer.toBranchId },
        { session }
      );

      // إلغاء المواعيد القادمة في الفرع القديم
      try {
        const Appointment = require('../../models/Appointment');
        await Appointment.updateMany(
          {
            beneficiaryId: transfer.beneficiaryId,
            branchId: transfer.fromBranchId,
            date: { $gte: transfer.transferDate },
            status: 'scheduled',
          },
          { status: 'cancelled', cancellationReason: 'نقل إلى فرع آخر' },
          { session }
        );
      } catch {
        // Appointment model قد يختلف
      }

      await BeneficiaryTransfer.findByIdAndUpdate(
        transferId,
        { status: 'completed', completedAt: new Date() },
        { session }
      );

      await session.commitTransaction();
      logger.info(
        `[Transfer] اكتمل نقل المستفيد ${transfer.beneficiaryId} إلى الفرع ${transfer.toBranchId}`
      );
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    return BeneficiaryTransfer.findById(transferId);
  }

  // ============================================================
  // مقارنة أداء الفروع
  // ============================================================

  async compareBranches(branchIds, period = 'month') {
    const startDate = this._getPeriodStartDate(period);
    const results = [];

    for (const branchId of branchIds) {
      try {
        const metrics = await this._getBranchMetrics(branchId, startDate);
        results.push(metrics);
      } catch (err) {
        logger.error(`[Branch Compare] خطأ للفرع ${branchId}: ${err.message}`);
        results.push({ branchId, error: err.message });
      }
    }

    return results;
  }

  async _getBranchMetrics(branchId, startDate) {
    const [branchInfo, sessions, revenue, staff] = await Promise.allSettled([
      this._getBranchInfo(branchId),
      this._getSessionStats(branchId, startDate),
      this._getRevenueStats(branchId, startDate),
      this._getStaffStats(branchId),
    ]);

    const branch = branchInfo.value || {};
    const sess = sessions.value || {};
    const rev = revenue.value || {};
    const hr = staff.value || {};

    return {
      branchId,
      branchName: branch.nameAr || 'غير معروف',
      totalBeneficiaries: branch.currentBeneficiaries || 0,
      capacity: branch.capacity || 0,
      occupancyRate: branch.capacity
        ? Math.round(((branch.currentBeneficiaries || 0) / branch.capacity) * 100 * 10) / 10
        : 0,
      totalSessions: sess.total || 0,
      completedSessions: sess.completed || 0,
      attendanceRate: sess.attendanceRate || 0,
      cancellationRate: sess.cancellationRate || 0,
      totalRevenue: rev.totalRevenue || 0,
      collectionRate: rev.collectionRate || 0,
      avgRevenuePerBeneficiary: rev.avgPerBeneficiary || 0,
      totalStaff: hr.total || 0,
      saudizationRate: hr.saudizationRate || 0,
    };
  }

  async _getBranchInfo(branchId) {
    try {
      const Branch = require('../../models/Branch');
      return Branch.findById(branchId).select('nameAr capacity currentBeneficiaries');
    } catch {
      return {};
    }
  }

  async _getSessionStats(branchId, startDate) {
    try {
      const Appointment = require('../../models/Appointment');
      const [total, completed, cancelled] = await Promise.all([
        Appointment.countDocuments({ branchId, date: { $gte: startDate } }),
        Appointment.countDocuments({ branchId, date: { $gte: startDate }, status: 'completed' }),
        Appointment.countDocuments({ branchId, date: { $gte: startDate }, status: 'cancelled' }),
      ]);
      return {
        total,
        completed,
        attendanceRate: total > 0 ? Math.round((completed / total) * 100 * 10) / 10 : 0,
        cancellationRate: total > 0 ? Math.round((cancelled / total) * 100 * 10) / 10 : 0,
      };
    } catch {
      return {};
    }
  }

  async _getRevenueStats(branchId, startDate) {
    try {
      const Invoice = require('../../models/Invoice');
      const [totalInvoiced, totalPaid] = await Promise.all([
        Invoice.aggregate([
          {
            $match: { branchId: mongoose.Types.ObjectId(branchId), issueDate: { $gte: startDate } },
          },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Invoice.aggregate([
          {
            $match: {
              branchId: mongoose.Types.ObjectId(branchId),
              issueDate: { $gte: startDate },
              status: 'paid',
            },
          },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
      ]);
      const invoiced = totalInvoiced[0]?.total || 0;
      const paid = totalPaid[0]?.total || 0;
      return {
        totalRevenue: paid,
        collectionRate: invoiced > 0 ? Math.round((paid / invoiced) * 100 * 10) / 10 : 0,
      };
    } catch {
      return {};
    }
  }

  async _getStaffStats(branchId) {
    try {
      const Employee = require('../../models/Employee');
      const [total, saudi] = await Promise.all([
        Employee.countDocuments({ branchId, status: 'active' }),
        Employee.countDocuments({ branchId, status: 'active', isSaudi: true }),
      ]);
      return {
        total,
        saudizationRate: total > 0 ? Math.round((saudi / total) * 100 * 10) / 10 : 0,
      };
    } catch {
      return {};
    }
  }

  _getPeriodStartDate(period) {
    const now = new Date();
    switch (period) {
      case 'week':
        now.setDate(now.getDate() - 7);
        break;
      case 'month':
        now.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        now.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        now.setFullYear(now.getFullYear() - 1);
        break;
    }
    return now;
  }
}

module.exports = new BranchEnhancedService();
