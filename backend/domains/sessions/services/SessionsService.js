/**
 * SessionsService — خدمة الجلسات العلاجية
 *
 * تدير دورة حياة الجلسة العلاجية الكاملة:
 *  - جدولة الجلسات وتأكيدها
 *  - توثيق النتائج السريرية (SOAP، أهداف، أنشطة، علامات حيوية)
 *  - إلغاء الجلسات وإعادة جدولتها
 *  - إحصاءات لوحة التحكم والتقارير
 *
 * @module domains/sessions/services/SessionsService
 */

'use strict';

const mongoose = require('mongoose');
const { BaseService } = require('../../_base/BaseService');

class SessionsService extends BaseService {
  constructor() {
    super({ serviceName: 'SessionsService', cachePrefix: 'sessions' });
  }

  /* ═══════════════════════ SCHEDULING ═══════════════════════ */

  /**
   * جدولة جلسة جديدة
   * @param {Object} data - بيانات الجلسة
   * @returns {Promise<Object>} الجلسة المنشأة
   */
  async scheduleSession(data) {
    const ClinicalSession = mongoose.model('ClinicalSession');

    if (!data.beneficiaryId) {
      const err = new Error('beneficiaryId مطلوب');
      err.statusCode = 400;
      throw err;
    }
    if (!data.scheduledDate) {
      const err = new Error('scheduledDate مطلوب');
      err.statusCode = 400;
      throw err;
    }

    const session = await ClinicalSession.create({
      ...data,
      type: data.type || 'individual',
      modality: data.modality || 'in_person',
      status: 'scheduled',
    });

    this.emit('session:scheduled', {
      sessionId: session._id,
      beneficiaryId: session.beneficiaryId,
      therapistId: session.therapistId,
      scheduledDate: session.scheduledDate,
    });

    return session;
  }

  /* ═══════════════════════ QUERIES ═══════════════════════ */

  /**
   * قائمة الجلسات مع الفلترة والترقيم
   * @param {Object} filter - معايير الفلترة
   * @param {Object} pagination - { limit, skip }
   * @returns {Promise<{data: Object[], total: number}>}
   */
  async listSessions(filter = {}, { limit = 20, skip = 0 } = {}) {
    const ClinicalSession = mongoose.model('ClinicalSession');

    const q = { isDeleted: { $ne: true } };
    if (filter.beneficiaryId) q.beneficiaryId = filter.beneficiaryId;
    if (filter.episodeId) q.episodeId = filter.episodeId;
    if (filter.therapistId) q.therapistId = filter.therapistId;
    if (filter.status) q.status = filter.status;
    if (filter.from || filter.to) {
      q.scheduledDate = {};
      if (filter.from) q.scheduledDate.$gte = new Date(filter.from);
      if (filter.to) q.scheduledDate.$lte = new Date(filter.to);
    }

    const [data, total] = await Promise.all([
      ClinicalSession.find(q)
        .sort({ scheduledDate: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
        .lean(),
      ClinicalSession.countDocuments(q),
    ]);

    return { data, total };
  }

  /**
   * جلب جلسة بمعرفها
   * @param {string} id - معرف الجلسة
   * @returns {Promise<Object>} الجلسة
   * @throws {Error} 404 إذا لم توجد الجلسة
   */
  async getSessionById(id) {
    const ClinicalSession = mongoose.model('ClinicalSession');
    const session = await ClinicalSession.findById(id).lean();
    if (!session) {
      const err = new Error('الجلسة غير موجودة');
      err.statusCode = 404;
      throw err;
    }
    return session;
  }

  /**
   * جلسات مستفيد بعينه
   * @param {string} beneficiaryId
   * @param {Object} pagination - { limit, skip }
   * @returns {Promise<{data: Object[], total: number}>}
   */
  async getBeneficiarySessions(beneficiaryId, { limit = 50, skip = 0 } = {}) {
    const ClinicalSession = mongoose.model('ClinicalSession');
    const data = await ClinicalSession.find({
      beneficiaryId,
      isDeleted: { $ne: true },
    })
      .sort({ scheduledDate: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();
    return { data, total: data.length };
  }

  /**
   * جلسات معالج بعينه
   * @param {string} therapistId
   * @param {Object} dateRange - { from, to }
   * @param {Object} pagination - { limit, skip }
   * @returns {Promise<{data: Object[], total: number}>}
   */
  async getTherapistSessions(therapistId, { from, to } = {}, { limit = 50, skip = 0 } = {}) {
    const ClinicalSession = mongoose.model('ClinicalSession');
    const q = { therapistId, isDeleted: { $ne: true } };
    if (from || to) {
      q.scheduledDate = {};
      if (from) q.scheduledDate.$gte = new Date(from);
      if (to) q.scheduledDate.$lte = new Date(to);
    }
    const data = await ClinicalSession.find(q)
      .sort({ scheduledDate: 1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();
    return { data, total: data.length };
  }

  /* ═══════════════════════ UPDATES ═══════════════════════ */

  /**
   * تحديث بيانات الجلسة
   * @param {string} id
   * @param {Object} data - الحقول المراد تحديثها
   * @returns {Promise<Object>} الجلسة المحدّثة
   */
  async updateSession(id, data) {
    const ClinicalSession = mongoose.model('ClinicalSession');
    const session = await ClinicalSession.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
    if (!session) {
      const err = new Error('الجلسة غير موجودة');
      err.statusCode = 404;
      throw err;
    }
    this.emit('session:updated', { sessionId: session._id, fields: Object.keys(data) });
    return session;
  }

  /**
   * توثيق إتمام الجلسة مع النتائج السريرية
   * @param {string} id
   * @param {Object} completionData - { duration, attendanceStatus, goalProgress, notes, vitalSigns, activities }
   * @returns {Promise<Object>} الجلسة المكتملة
   */
  async completeSession(id, completionData) {
    const ClinicalSession = mongoose.model('ClinicalSession');
    const { duration, attendanceStatus, goalProgress, notes, vitalSigns, activities } =
      completionData;

    const session = await ClinicalSession.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'completed',
          actualDate: new Date(),
          duration,
          attendanceStatus: attendanceStatus || 'attended',
          goalProgress: goalProgress || [],
          notes,
          vitalSigns,
          activities: activities || [],
        },
      },
      { new: true, runValidators: true }
    ).lean();

    if (!session) {
      const err = new Error('الجلسة غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    this.emit('session:completed', {
      sessionId: session._id,
      beneficiaryId: session.beneficiaryId,
      therapistId: session.therapistId,
      goalProgressCount: (goalProgress || []).length,
    });

    return session;
  }

  /**
   * إلغاء جلسة مع ذكر السبب
   * @param {string} id
   * @param {string} reason - سبب الإلغاء
   * @returns {Promise<Object>} الجلسة الملغاة
   */
  async cancelSession(id, reason) {
    const ClinicalSession = mongoose.model('ClinicalSession');
    const session = await ClinicalSession.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'cancelled',
          'cancellation.cancelledAt': new Date(),
          'cancellation.reason': reason,
        },
      },
      { new: true }
    ).lean();

    if (!session) {
      const err = new Error('الجلسة غير موجودة');
      err.statusCode = 404;
      throw err;
    }

    this.emit('session:cancelled', {
      sessionId: session._id,
      beneficiaryId: session.beneficiaryId,
      reason,
    });

    return session;
  }

  /* ═══════════════════════ DASHBOARD ═══════════════════════ */

  /**
   * إحصاءات لوحة التحكم للجلسات
   * @param {Object} dateRange - { from, to }
   * @returns {Promise<Object>} مجموعة الإحصاءات
   */
  async getDashboard({ from, to } = {}) {
    const ClinicalSession = mongoose.model('ClinicalSession');
    const dateFilter = { isDeleted: { $ne: true } };
    if (from || to) {
      dateFilter.scheduledDate = {};
      if (from) dateFilter.scheduledDate.$gte = new Date(from);
      if (to) dateFilter.scheduledDate.$lte = new Date(to);
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [total, byStatus, byModality, todaySessions] = await Promise.all([
      ClinicalSession.countDocuments(dateFilter),
      ClinicalSession.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      ClinicalSession.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$modality', count: { $sum: 1 } } },
      ]),
      ClinicalSession.countDocuments({
        scheduledDate: { $gte: todayStart, $lte: todayEnd },
        isDeleted: { $ne: true },
      }),
    ]);

    return {
      total,
      todaySessions,
      byStatus: Object.fromEntries(byStatus.map(r => [r._id, r.count])),
      byModality: Object.fromEntries(byModality.map(r => [r._id, r.count])),
    };
  }
}

const sessionsService = new SessionsService();

module.exports = { SessionsService, sessionsService };
