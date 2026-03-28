/**
 * Finance Operations Service — خدمة العمليات المالية
 *
 * CRUD and business logic for orphaned finance models:
 * - Invoice (الفواتير)
 * - JournalEntry (القيود اليومية)
 * - PettyCash (الصندوق الصغير)
 * - CashFlow (التدفق النقدي)
 * - Cheque (الشيكات)
 * - BankReconciliation (المطابقة البنكية)
 * - CreditNote (إشعارات الائتمان)
 */

const Invoice = require('../models/Invoice');
const JournalEntry = require('../models/JournalEntry');
const PettyCash = require('../models/PettyCash');
const _CashFlow = require('../models/CashFlow'); // reserved for future cash flow endpoints
const Cheque = require('../models/Cheque');
const BankReconciliation = require('../models/BankReconciliation');
const CreditNote = require('../models/CreditNote');
const logger = require('../utils/logger');

// ─── Helper: Standard list with pagination ───────────────────────────────────
const paginate = async (Model, filter, query, populateFields = '') => {
  const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = query;
  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [data, total] = await Promise.all([
    Model.find(filter).populate(populateFields).sort(sort).skip(skip).limit(Number(limit)).lean(),
    Model.countDocuments(filter),
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
};

class FinanceOperationsService {
  // ═══════════════════════════════════════════════════════════════════
  // INVOICES — الفواتير
  // ═══════════════════════════════════════════════════════════════════

  async listInvoices(query = {}) {
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.beneficiary) filter.beneficiary = query.beneficiary;
    if (query.search) {
      filter.$or = [
        { invoiceNumber: new RegExp(query.search, 'i') },
        { notes: new RegExp(query.search, 'i') },
      ];
    }
    return paginate(Invoice, filter, query, 'beneficiary issuer');
  }

  async getInvoice(id) {
    const doc = await Invoice.findById(id).populate('beneficiary issuer insurance.provider').lean();
    if (!doc) throw Object.assign(new Error('الفاتورة غير موجودة'), { status: 404 });
    return doc;
  }

  async createInvoice(data, userId) {
    // Auto-generate invoice number: INV-YYYY-NNNN
    const year = new Date().getFullYear();
    const count = await Invoice.countDocuments({ invoiceNumber: new RegExp(`^INV-${year}-`) });
    data.invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;
    data.issuer = userId;

    // Calculate subTotal from items
    if (data.items && data.items.length > 0) {
      data.items = data.items.map(item => ({
        ...item,
        total: (item.quantity || 1) * (item.unitPrice || 0),
      }));
      data.subTotal = data.items.reduce((sum, item) => sum + item.total, 0);
      data.totalAmount = data.subTotal + (data.taxAmount || 0) - (data.discount || 0);
    }

    const doc = await Invoice.create(data);
    logger.info(`Invoice created: ${doc.invoiceNumber}`);
    return doc;
  }

  async updateInvoice(id, data, userId) {
    const invoice = await Invoice.findById(id);
    if (!invoice) throw Object.assign(new Error('الفاتورة غير موجودة'), { status: 404 });
    if (['PAID', 'CANCELLED'].includes(invoice.status)) {
      throw Object.assign(new Error('لا يمكن تعديل فاتورة مدفوعة أو ملغاة'), { status: 400 });
    }
    delete data.invoiceNumber;
    delete data._id;

    // Recalculate totals if items changed
    if (data.items) {
      data.items = data.items.map(item => ({
        ...item,
        total: (item.quantity || 1) * (item.unitPrice || 0),
      }));
      data.subTotal = data.items.reduce((sum, item) => sum + item.total, 0);
      data.totalAmount =
        data.subTotal +
        (data.taxAmount || invoice.taxAmount || 0) -
        (data.discount || invoice.discount || 0);
    }

    Object.assign(invoice, data);
    invoice.updatedBy = userId;
    await invoice.save();
    return invoice;
  }

  async cancelInvoice(id, userId) {
    const invoice = await Invoice.findById(id);
    if (!invoice) throw Object.assign(new Error('الفاتورة غير موجودة'), { status: 404 });
    invoice.status = 'CANCELLED';
    invoice.cancelledBy = userId;
    await invoice.save();
    logger.info(`Invoice cancelled: ${invoice.invoiceNumber}`);
    return invoice;
  }

  async markInvoicePaid(id, paymentData, userId) {
    const invoice = await Invoice.findById(id);
    if (!invoice) throw Object.assign(new Error('الفاتورة غير موجودة'), { status: 404 });
    invoice.status = 'PAID';
    invoice.paymentMethod = paymentData.paymentMethod || invoice.paymentMethod;
    invoice.paidBy = userId;
    invoice.paidAt = new Date();
    await invoice.save();
    logger.info(`Invoice paid: ${invoice.invoiceNumber}`);
    return invoice;
  }

  // ═══════════════════════════════════════════════════════════════════
  // JOURNAL ENTRIES — القيود اليومية
  // ═══════════════════════════════════════════════════════════════════

  async listJournalEntries(query = {}) {
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.$or = [
        { entryNumber: new RegExp(query.search, 'i') },
        { description: new RegExp(query.search, 'i') },
      ];
    }
    return paginate(JournalEntry, filter, query);
  }

  async getJournalEntry(id) {
    const doc = await JournalEntry.findById(id).lean();
    if (!doc) throw Object.assign(new Error('القيد غير موجود'), { status: 404 });
    return doc;
  }

  async createJournalEntry(data, userId) {
    data.createdBy = userId;
    // Validate debit/credit balance
    if (data.lines && data.lines.length > 0) {
      const totalDebit = data.lines.reduce((s, l) => s + (l.debit || 0), 0);
      const totalCredit = data.lines.reduce((s, l) => s + (l.credit || 0), 0);
      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw Object.assign(new Error('إجمالي الدين يجب أن يساوي إجمالي الائتمان'), {
          status: 400,
        });
      }
    }
    const doc = await JournalEntry.create(data);
    logger.info(`Journal Entry created: ${doc._id}`);
    return doc;
  }

  async updateJournalEntry(id, data, userId) {
    delete data._id;
    data.updatedBy = userId;
    const doc = await JournalEntry.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) throw Object.assign(new Error('القيد غير موجود'), { status: 404 });
    return doc;
  }

  async deleteJournalEntry(id) {
    const doc = await JournalEntry.findById(id);
    if (!doc) throw Object.assign(new Error('القيد غير موجود'), { status: 404 });
    if (doc.status === 'posted')
      throw Object.assign(new Error('لا يمكن حذف قيد مرحل'), { status: 400 });
    await JournalEntry.findByIdAndDelete(id);
    return { message: 'تم حذف القيد بنجاح' };
  }

  // ═══════════════════════════════════════════════════════════════════
  // PETTY CASH — الصندوق الصغير
  // ═══════════════════════════════════════════════════════════════════

  async listPettyCash(query = {}) {
    const filter = {};
    if (query.status) filter.status = query.status;
    return paginate(PettyCash, filter, query);
  }

  async getPettyCash(id) {
    const doc = await PettyCash.findById(id).lean();
    if (!doc) throw Object.assign(new Error('سجل الصندوق الصغير غير موجود'), { status: 404 });
    return doc;
  }

  async createPettyCash(data, userId) {
    data.createdBy = userId;
    const doc = await PettyCash.create(data);
    logger.info(`Petty Cash entry created: ${doc._id}`);
    return doc;
  }

  async updatePettyCash(id, data, userId) {
    delete data._id;
    data.updatedBy = userId;
    const doc = await PettyCash.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) throw Object.assign(new Error('سجل الصندوق الصغير غير موجود'), { status: 404 });
    return doc;
  }

  async deletePettyCash(id) {
    const doc = await PettyCash.findByIdAndDelete(id);
    if (!doc) throw Object.assign(new Error('سجل الصندوق الصغير غير موجود'), { status: 404 });
    return { message: 'تم حذف السجل بنجاح' };
  }

  // ═══════════════════════════════════════════════════════════════════
  // CHEQUES — الشيكات
  // ═══════════════════════════════════════════════════════════════════

  async listCheques(query = {}) {
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.$or = [
        { chequeNumber: new RegExp(query.search, 'i') },
        { payeeName: new RegExp(query.search, 'i') },
      ];
    }
    return paginate(Cheque, filter, query);
  }

  async getCheque(id) {
    const doc = await Cheque.findById(id).lean();
    if (!doc) throw Object.assign(new Error('الشيك غير موجود'), { status: 404 });
    return doc;
  }

  async createCheque(data, userId) {
    data.createdBy = userId;
    const doc = await Cheque.create(data);
    logger.info(`Cheque created: ${doc.chequeNumber || doc._id}`);
    return doc;
  }

  async updateCheque(id, data, userId) {
    delete data._id;
    data.updatedBy = userId;
    const doc = await Cheque.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean();
    if (!doc) throw Object.assign(new Error('الشيك غير موجود'), { status: 404 });
    return doc;
  }

  async deleteCheque(id) {
    const doc = await Cheque.findByIdAndDelete(id);
    if (!doc) throw Object.assign(new Error('الشيك غير موجود'), { status: 404 });
    return { message: 'تم حذف الشيك بنجاح' };
  }

  // ═══════════════════════════════════════════════════════════════════
  // BANK RECONCILIATION — المطابقة البنكية
  // ═══════════════════════════════════════════════════════════════════

  async listBankReconciliations(query = {}) {
    const filter = {};
    if (query.status) filter.status = query.status;
    return paginate(BankReconciliation, filter, query);
  }

  async getBankReconciliation(id) {
    const doc = await BankReconciliation.findById(id).lean();
    if (!doc) throw Object.assign(new Error('المطابقة البنكية غير موجودة'), { status: 404 });
    return doc;
  }

  async createBankReconciliation(data, userId) {
    data.createdBy = userId;
    const doc = await BankReconciliation.create(data);
    logger.info(`Bank Reconciliation created: ${doc._id}`);
    return doc;
  }

  async updateBankReconciliation(id, data, userId) {
    delete data._id;
    data.updatedBy = userId;
    const doc = await BankReconciliation.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) throw Object.assign(new Error('المطابقة البنكية غير موجودة'), { status: 404 });
    return doc;
  }

  // ═══════════════════════════════════════════════════════════════════
  // CREDIT NOTES — إشعارات الائتمان
  // ═══════════════════════════════════════════════════════════════════

  async listCreditNotes(query = {}) {
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.$or = [{ creditNoteNumber: new RegExp(query.search, 'i') }];
    }
    return paginate(CreditNote, filter, query);
  }

  async getCreditNote(id) {
    const doc = await CreditNote.findById(id).lean();
    if (!doc) throw Object.assign(new Error('إشعار الائتمان غير موجود'), { status: 404 });
    return doc;
  }

  async createCreditNote(data, userId) {
    data.createdBy = userId;
    const doc = await CreditNote.create(data);
    logger.info(`Credit Note created: ${doc._id}`);
    return doc;
  }

  async updateCreditNote(id, data, userId) {
    delete data._id;
    data.updatedBy = userId;
    const doc = await CreditNote.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    }).lean();
    if (!doc) throw Object.assign(new Error('إشعار الائتمان غير موجود'), { status: 404 });
    return doc;
  }

  // ═══════════════════════════════════════════════════════════════════
  // FINANCIAL DASHBOARD — لوحة التحكم المالية
  // ═══════════════════════════════════════════════════════════════════

  async getFinancialSummary() {
    const [invoiceStats, pendingCheques, pettyCashBalance] = await Promise.all([
      Invoice.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$totalAmount' } } },
      ]),
      Cheque.countDocuments({ status: 'pending' }),
      PettyCash.aggregate([
        { $group: { _id: null, totalIn: { $sum: '$amountIn' }, totalOut: { $sum: '$amountOut' } } },
      ]),
    ]);

    return {
      invoices: invoiceStats,
      pendingCheques,
      pettyCash: pettyCashBalance[0] || { totalIn: 0, totalOut: 0 },
    };
  }
}

module.exports = new FinanceOperationsService();
