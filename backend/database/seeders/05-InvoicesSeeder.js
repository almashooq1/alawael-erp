/**
 * 05-InvoicesSeeder.js
 * إنشاء فواتير ومدفوعات تجريبية
 * فاتورة فبراير (مدفوعة) + فاتورة مارس (معلقة) لكل مستفيد + فاتورتان ملغاتان
 */

const mongoose = require('mongoose');

// ===== نماذج مؤقتة =====

const InvoiceItemSchema = new mongoose.Schema({
  descriptionAr: String,
  descriptionEn: String,
  quantity: Number,
  unitPrice: Number,
  total: Number,
  serviceType: String,
});

const PaymentSchema = new mongoose.Schema({
  amount: Number,
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'credit_card', 'cash', 'insurance', 'cheque'],
  },
  paymentDate: Date,
  referenceNumber: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },
  notes: String,
  paidBy: String,
});

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true, required: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    issueDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'pending', 'paid', 'partially_paid', 'overdue', 'cancelled'],
      default: 'pending',
    },
    items: [InvoiceItemSchema],
    payments: [PaymentSchema],
    subtotal: { type: Number, default: 0 },
    vatRate: { type: Number, default: 15 },
    vatAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },
    insuranceProvider: String,
    insuranceCoveragePercent: { type: Number, default: 0 },
    insuranceAmount: { type: Number, default: 0 },
    patientAmount: { type: Number, default: 0 },
    paymentMethod: String,
    notesAr: String,
    notesEn: String,
    paidAt: Date,
    cancelledAt: Date,
    cancellationReason: String,
    month: String, // 'YYYY-MM'
  },
  { timestamps: true }
);

const Invoice = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);

// ===== بيانات الخدمات =====
const serviceRates = {
  speech_therapy: { nameAr: 'جلسة نطق ولغة', nameEn: 'Speech Therapy Session', rate: 350 },
  occupational_therapy: {
    nameAr: 'جلسة علاج وظيفي',
    nameEn: 'Occupational Therapy Session',
    rate: 350,
  },
  physical_therapy: { nameAr: 'جلسة علاج طبيعي', nameEn: 'Physical Therapy Session', rate: 400 },
  behavior_therapy: { nameAr: 'جلسة تحليل سلوك تطبيقي', nameEn: 'ABA Therapy Session', rate: 380 },
  assessment: { nameAr: 'تقييم شامل', nameEn: 'Comprehensive Assessment', rate: 1500 },
  transport: { nameAr: 'خدمة نقل شهرية', nameEn: 'Monthly Transport Service', rate: 800 },
};

// خدمات حسب نوع الإعاقة
const disabilityServiceMap = {
  autism_spectrum: ['speech_therapy', 'behavior_therapy', 'occupational_therapy'],
  speech_delay: ['speech_therapy'],
  cerebral_palsy: ['physical_therapy', 'occupational_therapy', 'speech_therapy'],
  down_syndrome: ['speech_therapy', 'occupational_therapy', 'physical_therapy'],
  intellectual_disability: ['behavior_therapy', 'occupational_therapy'],
  hearing_impairment: ['speech_therapy'],
  developmental_delay: ['speech_therapy', 'occupational_therapy'],
  adhd: ['behavior_therapy'],
  visual_impairment: ['occupational_therapy'],
  physical_disability: ['physical_therapy', 'occupational_therapy'],
  default: ['behavior_therapy'],
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedInvoices() {
  const Beneficiary = mongoose.model('Beneficiary');
  const Branch = mongoose.model('Branch');

  const branches = await Branch.find({});
  const branchMap = {};
  branches.forEach(b => (branchMap[b.code] = b._id));

  // جلب المستفيدين النشطين
  const activeBeneficiaries = await Beneficiary.find({ status: 'active' }).limit(20);

  if (activeBeneficiaries.length === 0) {
    console.log('  ⚠️  لا يوجد مستفيدون نشطون، يُرجى تشغيل 03-BeneficiariesSeeder أولاً');
    return;
  }

  let invoiceCounter = 1;
  let createdCount = 0;
  let skippedCount = 0;

  // ========== فواتير كل مستفيد ==========
  for (const beneficiary of activeBeneficiaries) {
    // نوع الإعاقة
    const disabilityType = beneficiary.disability?.type || beneficiary.category || 'default';
    const services = disabilityServiceMap[disabilityType] || disabilityServiceMap['default'];
    const mainService = pickRandom(services);
    const serviceInfo = serviceRates[mainService];

    // الفرع
    const branchId = beneficiary.branchId || beneficiary.branch;
    const insuranceProvider =
      beneficiary.insuranceInfo?.provider ||
      pickRandom(['bupa', 'tawuniya', 'medgulf', 'walaa', null]);
    const insuranceCoverage = insuranceProvider ? randInt(50, 100) : 0;

    // ---- فاتورة فبراير 2026 (مدفوعة) ----
    const febNumber = `INV-2026-${String(invoiceCounter++).padStart(5, '0')}`;
    const febExists = await Invoice.findOne({ invoiceNumber: febNumber });

    if (!febExists) {
      const sessions = randInt(8, 16);
      const items = [
        {
          descriptionAr: serviceInfo.nameAr,
          descriptionEn: serviceInfo.nameEn,
          quantity: sessions,
          unitPrice: serviceInfo.rate,
          total: serviceInfo.rate * sessions,
          serviceType: mainService,
        },
      ];

      // نقل لبعض المستفيدين
      const hasTransport = Math.random() > 0.5;
      if (hasTransport) {
        items.push({
          descriptionAr: 'خدمة نقل شهرية',
          descriptionEn: 'Monthly Transport Service',
          quantity: 1,
          unitPrice: 800,
          total: 800,
          serviceType: 'transport',
        });
      }

      const subtotal = items.reduce((s, i) => s + i.total, 0);
      const vatAmount = Math.round(subtotal * 0.15 * 100) / 100;
      const total = subtotal + vatAmount;
      const insuranceAmount = Math.round(((total * insuranceCoverage) / 100) * 100) / 100;
      const patientAmount = Math.round((total - insuranceAmount) * 100) / 100;

      const payments = [];
      if (insuranceAmount > 0) {
        payments.push({
          amount: insuranceAmount,
          paymentMethod: 'insurance',
          paymentDate: new Date('2026-03-05'),
          referenceNumber: `INS-${randInt(100000, 999999)}`,
          status: 'completed',
          notes: 'تغطية تأمينية',
          paidBy: insuranceProvider,
        });
      }
      if (patientAmount > 0) {
        payments.push({
          amount: patientAmount,
          paymentMethod: pickRandom(['bank_transfer', 'credit_card', 'cash']),
          paymentDate: new Date('2026-03-10'),
          referenceNumber: `PAY-${randInt(100000, 999999)}`,
          status: 'completed',
          paidBy: 'ولي الأمر',
        });
      }

      await Invoice.create({
        invoiceNumber: febNumber,
        beneficiaryId: beneficiary._id,
        branchId,
        issueDate: new Date('2026-02-28'),
        dueDate: new Date('2026-03-15'),
        status: 'paid',
        items,
        payments,
        subtotal,
        vatRate: 15,
        vatAmount,
        total,
        paidAmount: total,
        remainingAmount: 0,
        insuranceProvider,
        insuranceCoveragePercent: insuranceCoverage,
        insuranceAmount,
        patientAmount,
        paymentMethod: insuranceCoverage > 0 ? 'insurance' : 'bank_transfer',
        notesAr: 'فاتورة شهر فبراير 2026',
        notesEn: 'Invoice for February 2026',
        paidAt: new Date('2026-03-10'),
        month: '2026-02',
      });
      createdCount++;
    } else {
      skippedCount++;
    }

    // ---- فاتورة مارس 2026 (معلقة) لنصف المستفيدين ----
    if (Math.random() > 0.5) {
      const marNumber = `INV-2026-${String(invoiceCounter++).padStart(5, '0')}`;
      const marExists = await Invoice.findOne({ invoiceNumber: marNumber });

      if (!marExists) {
        const sessions = randInt(8, 16);
        const items = [
          {
            descriptionAr: serviceInfo.nameAr,
            descriptionEn: serviceInfo.nameEn,
            quantity: sessions,
            unitPrice: serviceInfo.rate,
            total: serviceInfo.rate * sessions,
            serviceType: mainService,
          },
        ];

        const subtotal = items.reduce((s, i) => s + i.total, 0);
        const vatAmount = Math.round(subtotal * 0.15 * 100) / 100;
        const total = subtotal + vatAmount;
        const insuranceAmount = Math.round(((total * insuranceCoverage) / 100) * 100) / 100;
        const patientAmount = Math.round((total - insuranceAmount) * 100) / 100;

        await Invoice.create({
          invoiceNumber: marNumber,
          beneficiaryId: beneficiary._id,
          branchId,
          issueDate: new Date('2026-03-31'),
          dueDate: new Date('2026-04-15'),
          status: 'pending',
          items,
          payments: [],
          subtotal,
          vatRate: 15,
          vatAmount,
          total,
          paidAmount: 0,
          remainingAmount: total,
          insuranceProvider,
          insuranceCoveragePercent: insuranceCoverage,
          insuranceAmount,
          patientAmount,
          notesAr: 'فاتورة شهر مارس 2026',
          notesEn: 'Invoice for March 2026',
          month: '2026-03',
        });
        createdCount++;
      } else {
        skippedCount++;
      }
    }
  }

  // ========== فاتورتان ملغاتان ==========
  for (let i = 0; i < 2; i++) {
    const cancelNumber = `INV-2026-${String(invoiceCounter++).padStart(5, '0')}`;
    const cancelExists = await Invoice.findOne({ invoiceNumber: cancelNumber });
    if (!cancelExists) {
      const ben = activeBeneficiaries[randInt(0, activeBeneficiaries.length - 1)];
      await Invoice.create({
        invoiceNumber: cancelNumber,
        beneficiaryId: ben._id,
        branchId: ben.branchId || ben.branch,
        issueDate: new Date('2026-02-15'),
        dueDate: new Date('2026-03-01'),
        status: 'cancelled',
        items: [
          {
            descriptionAr: 'جلسات علاج متعددة',
            descriptionEn: 'Multiple Therapy Sessions',
            quantity: 8,
            unitPrice: 350,
            total: 2800,
            serviceType: 'speech_therapy',
          },
        ],
        payments: [],
        subtotal: 2800,
        vatRate: 15,
        vatAmount: 420,
        total: 3220,
        paidAmount: 0,
        remainingAmount: 3220,
        notesAr: 'فاتورة ملغاة',
        cancelledAt: new Date('2026-02-16'),
        cancellationReason: 'خطأ في البيانات - تم إصدار فاتورة بديلة',
        month: '2026-02',
      });
      createdCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`  ✅ تم إنشاء ${createdCount} فاتورة | تخطي: ${skippedCount}`);
}

module.exports = { seedInvoices, Invoice };
