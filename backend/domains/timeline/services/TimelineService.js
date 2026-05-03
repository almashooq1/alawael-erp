/**
 * TimelineService — خدمة الخط الزمني الطولي الموحد
 *
 * تُدير تسجيل وقراءة الأحداث السريرية والتشغيلية لمسار المستفيد
 * عبر الزمن، مرتبطةً بالمستفيد والحلقة العلاجية.
 *
 * @module domains/timeline/services/TimelineService
 */

'use strict';

const mongoose = require('mongoose');
const { BaseService } = require('../../_base/BaseService');

class TimelineService extends BaseService {
  constructor() {
    super({ serviceName: 'TimelineService', cachePrefix: 'timeline' });
  }

  /* ═══════════════════════ CREATE ═══════════════════════ */

  /**
   * تسجيل حدث جديد في الخط الزمني
   * @param {Object} data - بيانات الحدث
   * @returns {Promise<Object>} الحدث المنشأ
   */
  async addEvent(data) {
    const CareTimeline = mongoose.model('CareTimeline');

    if (!data.beneficiaryId) {
      const err = new Error('beneficiaryId مطلوب');
      err.statusCode = 400;
      throw err;
    }
    if (!data.eventType) {
      const err = new Error('eventType مطلوب');
      err.statusCode = 400;
      throw err;
    }

    const event = await CareTimeline.create({
      beneficiaryId: data.beneficiaryId,
      episodeId: data.episodeId,
      eventType: data.eventType,
      category: data.category || 'clinical',
      severity: data.severity || 'info',
      title: data.title || data.eventType,
      title_ar: data.title_ar,
      description: data.description,
      description_ar: data.description_ar,
      relatedEntity: data.relatedEntity,
      performedBy: data.performedBy,
      performedByRole: data.performedByRole,
      performedByName: data.performedByName,
      // Accept eventDate as alias for occurredAt
      occurredAt: data.occurredAt || (data.eventDate ? new Date(data.eventDate) : new Date()),
      metadata: data.metadata || {},
      previousValue: data.previousValue,
      newValue: data.newValue,
      isVisible: data.isVisible !== undefined ? data.isVisible : true,
      visibleTo: data.visibleTo || [],
      branchId: data.branchId,
    });

    this.emit('timeline:event-added', {
      eventId: event._id,
      beneficiaryId: event.beneficiaryId,
      episodeId: event.episodeId,
      eventType: event.eventType,
      category: event.category,
    });

    return event;
  }

  /* ═══════════════════════ QUERIES ═══════════════════════ */

  /**
   * جلب الخط الزمني الطولي الكامل لمستفيد
   * @param {string} beneficiaryId
   * @param {Object} filter - { eventType, category, from, to }
   * @param {Object} pagination - { limit, skip }
   * @returns {Promise<{data: Object[], total: number}>}
   */
  async getBeneficiaryTimeline(beneficiaryId, filter = {}, { limit = 100, skip = 0 } = {}) {
    const CareTimeline = mongoose.model('CareTimeline');

    const q = { beneficiaryId };
    if (filter.eventType) q.eventType = filter.eventType;
    if (filter.category) q.category = filter.category;
    if (filter.from || filter.to) {
      q.occurredAt = {};
      if (filter.from) q.occurredAt.$gte = new Date(filter.from);
      if (filter.to) q.occurredAt.$lte = new Date(filter.to);
    }

    const [data, total] = await Promise.all([
      CareTimeline.find(q).sort({ occurredAt: -1 }).skip(Number(skip)).limit(Number(limit)).lean(),
      CareTimeline.countDocuments(q),
    ]);

    return { data, total };
  }

  /**
   * جلب الخط الزمني لحلقة علاجية محددة
   * @param {string} episodeId
   * @param {Object} filter - { eventType }
   * @param {Object} pagination - { limit, skip }
   * @returns {Promise<{data: Object[], total: number}>}
   */
  async getEpisodeTimeline(episodeId, filter = {}, { limit = 100, skip = 0 } = {}) {
    const CareTimeline = mongoose.model('CareTimeline');

    const q = { episodeId };
    if (filter.eventType) q.eventType = filter.eventType;

    const [data, total] = await Promise.all([
      CareTimeline.find(q).sort({ occurredAt: -1 }).skip(Number(skip)).limit(Number(limit)).lean(),
      CareTimeline.countDocuments(q),
    ]);

    return { data, total };
  }

  /**
   * جلب حدث منفرد بمعرفه
   * @param {string} id
   * @returns {Promise<Object>} الحدث
   * @throws {Error} 404 إذا لم يوجد الحدث
   */
  async getEventById(id) {
    const CareTimeline = mongoose.model('CareTimeline');
    const event = await CareTimeline.findById(id).lean();
    if (!event) {
      const err = new Error('حدث الخط الزمني غير موجود');
      err.statusCode = 404;
      throw err;
    }
    return event;
  }
}

const timelineService = new TimelineService();

module.exports = { TimelineService, timelineService };
