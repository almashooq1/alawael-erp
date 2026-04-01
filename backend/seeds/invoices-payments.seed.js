/**
 * @file invoices-payments.seed.js
 * @description بيانات فواتير ومدفوعات واقعية - Al-Awael ERP
 * DEV/STAGING only
 */
'use strict';

const SERVICE_RATES = {
  speech_therapy: { ar: 'جلسة نطق ولغة', en: 'Speech Therapy Session', rate: 350 },
  occupational_therapy: { ar: 'جلسة علاج وظيفي', en: 'OT Session', rate: 350 },
  physical_therapy: { ar: 'جلسة علاج طبيعي', en: 'PT Session', rate: 400 },
  behavior_therapy: { ar: 'جلسة تحليل سلوك', en: 'ABA Session', rate: 380 },
  transport_monthly: { ar: 'خدمة نقل شهرية', en: 'Monthly Transport', rate: 800 },
};

const INSURANCE_PROVIDERS = ['bupa', 'tawuniya', 'medgulf', 'walaa'];

function roundTwo(n) {
  return Math.round(n * 100) / 100;
}

async function seed(connection) {
  const db = connection.db || (connection.connection && connection.connection.db) || connection;
  if (!db) throw new Error('No database connection');

  const benefCol = db.collection('beneficiaries');
  const invoicesCol = db.collection('invoices');
  const paymentsCol = db.collection('payments');
  const now = new Date();

  const activeBeneficiaries = await benefCol
    .find({ caseStatus: 'active', 'metadata.isComprehensiveSeed': true })
    .limit(20)
    .toArray();

  if (activeBeneficiaries.length === 0) {
    console.log(
      '  ⚠️  No comprehensive beneficiaries found - run comprehensive-beneficiaries seed first'
    );
    return;
  }

  let invCreated = 0,
    payCreated = 0;
  let invNumber = 1;

  for (const ben of activeBeneficiaries) {
    const serviceTypes = getServiceTypes(ben.primaryDisability);
    const serviceType = serviceTypes[0];
    const service = SERVICE_RATES[serviceType] || SERVICE_RATES.behavior_therapy;
    const sessions = 10 + Math.floor(Math.random() * 6);
    const subtotal = service.rate * sessions + (ben.transportRequired ? 800 : 0);
    const vatAmount = roundTwo(subtotal * 0.15);
    const total = roundTwo(subtotal + vatAmount);
    const insurancePct = ben.insurance ? 60 + Math.floor(Math.random() * 40) : 0;
    const insurancePays = roundTwo((total * insurancePct) / 100);
    const patientPays = roundTwo(total - insurancePays);

    // ─── فاتورة فبراير 2026 (مدفوعة) ───
    const invNumFeb = `INV-2026-${String(invNumber++).padStart(5, '0')}`;
    const febInv = {
      invoiceNumber: invNumFeb,
      beneficiary: { id: ben._id, beneficiaryNumber: ben.beneficiaryNumber, name: ben.name },
      branchCode: ben.branchCode,
      issueDate: new Date('2026-02-28'),
      dueDate: new Date('2026-03-15'),
      status: 'paid',
      paymentMethod: insurancePct > 0 ? 'insurance' : 'bank_transfer',
      items: [
        {
          descriptionAr: service.ar,
          descriptionEn: service.en,
          quantity: sessions,
          unitPrice: service.rate,
          total: service.rate * sessions,
        },
        ...(ben.transportRequired
          ? [
              {
                descriptionAr: 'خدمة نقل شهرية',
                descriptionEn: 'Monthly Transport',
                quantity: 1,
                unitPrice: 800,
                total: 800,
              },
            ]
          : []),
      ],
      subtotal,
      vatRate: 15,
      vatAmount,
      total,
      insuranceCoverage: insurancePct,
      insuranceAmount: insurancePays,
      patientAmount: patientPays,
      paidAmount: total,
      paidAt: new Date('2026-03-10'),
      notesAr: 'فاتورة شهر فبراير 2026',
      metadata: { isComprehensiveSeed: true, seededAt: now },
      createdAt: new Date('2026-02-28'),
      updatedAt: new Date('2026-03-10'),
    };
    const febResult = await invoicesCol.insertOne(febInv);
    invCreated++;

    // مدفوعة الفاتورة
    if (insurancePays > 0) {
      const insRef = `INS-${100000 + Math.floor(Math.random() * 899999)}-${ben.beneficiaryNumber}`;
      await paymentsCol.insertOne({
        invoiceId: febResult.insertedId,
        invoiceNumber: invNumFeb,
        amount: insurancePays,
        paymentMethod: 'insurance',
        paymentDate: new Date('2026-03-05'),
        referenceNumber: insRef,
        reference: insRef,
        status: 'completed',
        notesAr: 'تغطية تأمينية',
        metadata: { isComprehensiveSeed: true, seededAt: now },
        createdAt: new Date('2026-03-05'),
        updatedAt: new Date('2026-03-05'),
      });
      payCreated++;
    }
    if (patientPays > 0) {
      const payRef = `PAY-${200000 + Math.floor(Math.random() * 799999)}-${ben.beneficiaryNumber}`;
      await paymentsCol.insertOne({
        invoiceId: febResult.insertedId,
        invoiceNumber: invNumFeb,
        amount: patientPays,
        paymentMethod: 'bank_transfer',
        paymentDate: new Date('2026-03-10'),
        referenceNumber: payRef,
        reference: payRef,
        status: 'completed',
        metadata: { isComprehensiveSeed: true, seededAt: now },
        createdAt: new Date('2026-03-10'),
        updatedAt: new Date('2026-03-10'),
      });
      payCreated++;
    }

    // ─── فاتورة مارس 2026 (معلقة) لنصف المستفيدين ───
    if (Math.random() > 0.5) {
      const invNumMar = `INV-2026-${String(invNumber++).padStart(5, '0')}`;
      await invoicesCol.insertOne({
        invoiceNumber: invNumMar,
        beneficiary: { id: ben._id, beneficiaryNumber: ben.beneficiaryNumber, name: ben.name },
        branchCode: ben.branchCode,
        issueDate: new Date('2026-03-31'),
        dueDate: new Date('2026-04-15'),
        status: 'pending',
        items: febInv.items,
        subtotal,
        vatRate: 15,
        vatAmount,
        total,
        insuranceCoverage: insurancePct,
        insuranceAmount: insurancePays,
        patientAmount: patientPays,
        paidAmount: 0,
        notesAr: 'فاتورة شهر مارس 2026',
        metadata: { isComprehensiveSeed: true, seededAt: now },
        createdAt: new Date('2026-03-31'),
        updatedAt: new Date('2026-03-31'),
      });
      invCreated++;
    }
  }

  // ─── فاتورتان ملغاتان ───
  for (let i = 0; i < 2; i++) {
    const ben = activeBeneficiaries[i];
    await invoicesCol.insertOne({
      invoiceNumber: `INV-2026-${String(invNumber++).padStart(5, '0')}`,
      beneficiary: { id: ben._id, beneficiaryNumber: ben.beneficiaryNumber, name: ben.name },
      branchCode: ben.branchCode,
      issueDate: new Date('2026-02-15'),
      dueDate: new Date('2026-03-01'),
      status: 'cancelled',
      items: [],
      subtotal: 2800,
      vatRate: 15,
      vatAmount: 420,
      total: 3220,
      cancelledAt: new Date('2026-02-16'),
      cancellationReason: 'خطأ في البيانات - تم إصدار فاتورة بديلة',
      metadata: { isComprehensiveSeed: true, seededAt: now },
      createdAt: new Date('2026-02-15'),
      updatedAt: new Date('2026-02-16'),
    });
    invCreated++;
  }

  console.log(`  ✅ invoices-payments: ${invCreated} invoices, ${payCreated} payments created`);
}

function getServiceTypes(disability) {
  const map = {
    AUTISM: ['speech_therapy', 'behavior_therapy', 'occupational_therapy'],
    SPEECH_DELAY: ['speech_therapy'],
    PHYSICAL: ['physical_therapy', 'occupational_therapy'],
    INTELLECTUAL: ['behavior_therapy', 'occupational_therapy'],
    HEARING: ['speech_therapy'],
    DEVELOPMENTAL_DELAY: ['speech_therapy', 'occupational_therapy'],
    ADHD: ['behavior_therapy'],
    VISUAL: ['occupational_therapy'],
    LEARNING: ['speech_therapy'],
  };
  return map[disability] || ['behavior_therapy'];
}

async function down(connection) {
  const db = connection.db || (connection.connection && connection.connection.db) || connection;
  await db.collection('invoices').deleteMany({ 'metadata.isComprehensiveSeed': true });
  await db.collection('payments').deleteMany({ 'metadata.isComprehensiveSeed': true });
  console.log('  ✅ invoices-payments: removed all comprehensive seed invoices & payments');
}

module.exports = { seed, down };
