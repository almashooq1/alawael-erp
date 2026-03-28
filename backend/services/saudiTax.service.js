/**
 * Saudi Tax Service — خدمة الضرائب السعودية (ZATCA)
 *
 * Unified service for:
 * - VAT Returns (إقرارات ضريبة القيمة المضافة)
 * - Zakat (الزكاة)
 * - Tax Filing (الإقرارات الضريبية)
 * - Withholding Tax (ضريبة الاستقطاع)
 * - Tax Calendar (التقويم الضريبي)
 */

const VATReturn = require('../models/VATReturn');
const TaxFiling = require('../models/TaxFiling');
const WithholdingTax = require('../models/WithholdingTax');
const _TaxCalendar = require('../models/TaxCalendar'); // reserved for future calendar endpoints
const logger = require('../utils/logger');

class SaudiTaxService {
  // ═══════════════════════════════════════════════════════════════════
  // VAT RETURNS — إقرارات ضريبة القيمة المضافة
  // ═══════════════════════════════════════════════════════════════════

  async listVATReturns(query = {}) {
    const { page = 1, limit = 20, status, year } = query;
    const filter = {};
    if (status) filter.status = status;
    if (year) {
      filter['period.startDate'] = {
        $gte: new Date(`${year}-01-01`),
        $lt: new Date(`${Number(year) + 1}-01-01`),
      };
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      VATReturn.find(filter)
        .sort({ 'period.startDate': -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      VATReturn.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getVATReturn(id) {
    const doc = await VATReturn.findById(id).lean();
    if (!doc) throw Object.assign(new Error('إقرار الضريبة غير موجود'), { status: 404 });
    return doc;
  }

  async createVATReturn(data, userId) {
    data.createdBy = userId;
    const doc = await VATReturn.create(data);
    logger.info(
      `VAT Return created for period ${data.period?.startDate} - ${data.period?.endDate}`
    );
    return doc;
  }

  async updateVATReturn(id, data, userId) {
    delete data._id;
    data.updatedBy = userId;
    const doc = await VATReturn.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) throw Object.assign(new Error('إقرار الضريبة غير موجود'), { status: 404 });
    return doc;
  }

  async fileVATReturn(id, userId) {
    const doc = await VATReturn.findById(id);
    if (!doc) throw Object.assign(new Error('إقرار الضريبة غير موجود'), { status: 404 });
    if (doc.status !== 'draft')
      throw Object.assign(new Error('يمكن تقديم المسودات فقط'), { status: 400 });
    doc.status = 'filed';
    doc.filedBy = userId;
    doc.filedAt = new Date();
    await doc.save();
    logger.info(`VAT Return ${id} filed by ${userId}`);
    return doc;
  }

  // ═══════════════════════════════════════════════════════════════════
  // TAX FILING — الإقرارات الضريبية العامة
  // ═══════════════════════════════════════════════════════════════════

  async listTaxFilings(query = {}) {
    const { page = 1, limit = 20, type, status, year } = query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (year) {
      filter.periodStart = { $gte: new Date(`${year}-01-01`) };
      filter.periodEnd = { $lt: new Date(`${Number(year) + 1}-01-01`) };
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      TaxFiling.find(filter)
        .populate('preparedBy', 'name fullName')
        .populate('organization', 'name')
        .sort({ dueDate: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      TaxFiling.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getTaxFiling(id) {
    const doc = await TaxFiling.findById(id)
      .populate('preparedBy reviewedBy approvedBy submittedBy', 'name fullName')
      .populate('organization', 'name')
      .lean();
    if (!doc) throw Object.assign(new Error('الإقرار الضريبي غير موجود'), { status: 404 });
    return doc;
  }

  async createTaxFiling(data, userId) {
    const year = new Date(data.periodStart).getFullYear();
    const count = await TaxFiling.countDocuments({ type: data.type });
    data.filingNumber = `${data.type}-${year}-${String(count + 1).padStart(4, '0')}`;
    data.createdBy = userId;
    const doc = await TaxFiling.create(data);
    logger.info(`Tax Filing created: ${doc.filingNumber}`);
    return doc;
  }

  async updateTaxFiling(id, data, userId) {
    delete data._id;
    delete data.filingNumber;
    data.updatedBy = userId;
    const doc = await TaxFiling.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) throw Object.assign(new Error('الإقرار الضريبي غير موجود'), { status: 404 });
    return doc;
  }

  async submitTaxFiling(id, userId) {
    const doc = await TaxFiling.findById(id);
    if (!doc) throw Object.assign(new Error('الإقرار الضريبي غير موجود'), { status: 404 });
    doc.status = 'submitted';
    doc.submittedBy = userId;
    doc.submittedAt = new Date();
    await doc.save();
    logger.info(`Tax Filing ${doc.filingNumber} submitted`);
    return doc;
  }

  // ═══════════════════════════════════════════════════════════════════
  // WITHHOLDING TAX — ضريبة الاستقطاع
  // ═══════════════════════════════════════════════════════════════════

  async listWithholdingTax(query = {}) {
    const { page = 1, limit = 20, status, beneficiaryType } = query;
    const filter = { isDeleted: { $ne: true } };
    if (status) filter.status = status;
    if (beneficiaryType) filter.beneficiaryType = beneficiaryType;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      WithholdingTax.find(filter).sort({ paymentDate: -1 }).skip(skip).limit(Number(limit)).lean(),
      WithholdingTax.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getWithholdingTax(id) {
    const doc = await WithholdingTax.findById(id).lean();
    if (!doc || doc.isDeleted)
      throw Object.assign(new Error('شهادة الاستقطاع غير موجودة'), { status: 404 });
    return doc;
  }

  async createWithholdingTax(data, userId) {
    data.createdBy = userId;
    // Auto-calc net amount
    data.withholdingAmount = data.grossAmount * (data.withholdingRate / 100);
    data.netAmount = data.grossAmount - data.withholdingAmount;
    const doc = await WithholdingTax.create(data);
    logger.info(`WHT certificate created: ${doc.certificateNumber}`);
    return doc;
  }

  async updateWithholdingTax(id, data, userId) {
    delete data._id;
    delete data.certificateNumber;
    data.updatedBy = userId;
    if (data.grossAmount && data.withholdingRate) {
      data.withholdingAmount = data.grossAmount * (data.withholdingRate / 100);
      data.netAmount = data.grossAmount - data.withholdingAmount;
    }
    const doc = await WithholdingTax.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) throw Object.assign(new Error('شهادة الاستقطاع غير موجودة'), { status: 404 });
    return doc;
  }

  async deleteWithholdingTax(id) {
    const doc = await WithholdingTax.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    if (!doc) throw Object.assign(new Error('شهادة الاستقطاع غير موجودة'), { status: 404 });
    return { message: 'تم حذف شهادة الاستقطاع' };
  }

  // ═══════════════════════════════════════════════════════════════════
  // TAX STATISTICS — إحصائيات ضريبية
  // ═══════════════════════════════════════════════════════════════════

  async getStatistics(year) {
    const y = year || new Date().getFullYear();
    const yearFilter = {
      periodStart: { $gte: new Date(`${y}-01-01`) },
      periodEnd: { $lt: new Date(`${Number(y) + 1}-01-01`) },
    };

    const [filingStats, overdue, whtTotal] = await Promise.all([
      TaxFiling.aggregate([
        { $match: yearFilter },
        { $group: { _id: '$type', count: { $sum: 1 }, total: { $sum: '$netTaxPayable' } } },
      ]),
      TaxFiling.countDocuments({ ...yearFilter, status: 'overdue' }),
      WithholdingTax.aggregate([
        { $match: { fiscalYear: y, isDeleted: { $ne: true } } },
        { $group: { _id: null, total: { $sum: '$withholdingAmount' }, count: { $sum: 1 } } },
      ]),
    ]);

    return {
      year: y,
      filings: filingStats,
      overdue,
      withholdingTax: whtTotal[0] || { total: 0, count: 0 },
    };
  }

  /**
   * Get upcoming deadlines
   */
  async getUpcomingDeadlines(days = 30) {
    const upcoming = await TaxFiling.find({
      dueDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
      status: { $nin: ['submitted', 'accepted', 'assessed'] },
    })
      .sort({ dueDate: 1 })
      .limit(20)
      .lean();

    return upcoming;
  }
}

module.exports = new SaudiTaxService();
