/**
 * قوالب طباعة المالية — Finance Print Templates
 * 12 نموذج: فاتورة، سند صرف، سند قبض، قيد يومية، ميزان مراجعة، كشف حساب،
 *           شيك، إيصال تبرع، إشعار دائن، نثرية، أرباح وخسائر، ميزانية عمومية
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, formatMoney,
} from '../shared/PrintTemplateShared';

export const FINANCE_TEMPLATES = [
  { id: 'invoice', name: 'فاتورة', nameEn: 'Invoice', desc: 'فاتورة مبيعات / خدمات ضريبية', color: '#2e7d32' },
  { id: 'payment-voucher', name: 'سند صرف', nameEn: 'Payment Voucher', desc: 'سند صرف نقدي أو تحويل بنكي', color: '#c62828' },
  { id: 'receipt-voucher', name: 'سند قبض', nameEn: 'Receipt Voucher', desc: 'سند قبض نقدي أو شيك', color: '#1565c0' },
  { id: 'journal-entry', name: 'قيد يومية', nameEn: 'Journal Entry', desc: 'قيد محاسبي لتسجيل العمليات المالية', color: '#6a1b9a' },
  { id: 'trial-balance', name: 'ميزان المراجعة', nameEn: 'Trial Balance', desc: 'ميزان مراجعة لجميع الحسابات', color: '#00695c' },
  { id: 'account-statement', name: 'كشف حساب', nameEn: 'Account Statement', desc: 'كشف حركات حساب مفصّل', color: '#37474f' },
  { id: 'cheque', name: 'طباعة شيك', nameEn: 'Cheque Print', desc: 'نموذج طباعة شيك بنكي', color: '#0d47a1' },
  { id: 'donation-receipt', name: 'إيصال تبرع', nameEn: 'Donation Receipt', desc: 'إيصال استلام تبرع نقدي أو عيني', color: '#e65100' },
  { id: 'credit-note', name: 'إشعار دائن', nameEn: 'Credit Note', desc: 'إشعار دائن لتعديل فاتورة', color: '#ad1457' },
  { id: 'petty-cash', name: 'سند نثرية', nameEn: 'Petty Cash Voucher', desc: 'سند صرف من صندوق المصروفات النثرية', color: '#ff6f00' },
  { id: 'income-statement', name: 'قائمة الدخل', nameEn: 'Income Statement', desc: 'قائمة الإيرادات والمصروفات', color: '#2e7d32' },
  { id: 'balance-sheet', name: 'الميزانية العمومية', nameEn: 'Balance Sheet', desc: 'قائمة المركز المالي (الأصول والخصوم)', color: '#1a237e' },
];

export const FinanceTemplateRenderer = ({ templateId, data }) => {
  const d = data || {};
  switch (templateId) {
    case 'invoice': return <Invoice d={d} />;
    case 'payment-voucher': return <PaymentVoucher d={d} />;
    case 'receipt-voucher': return <ReceiptVoucher d={d} />;
    case 'journal-entry': return <JournalEntry d={d} />;
    case 'trial-balance': return <TrialBalance d={d} />;
    case 'account-statement': return <AccountStatement d={d} />;
    case 'cheque': return <ChequePrint d={d} />;
    case 'donation-receipt': return <DonationReceipt d={d} />;
    case 'credit-note': return <CreditNote d={d} />;
    case 'petty-cash': return <PettyCash d={d} />;
    case 'income-statement': return <IncomeStatement d={d} />;
    case 'balance-sheet': return <BalanceSheet d={d} />;
    default: return <Typography textAlign="center" py={8} color="text.secondary">اختر قالباً</Typography>;
  }
};

/* ═══════ 1. INVOICE ═══════ */
const Invoice = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="فاتورة ضريبية" subtitle="Tax Invoice" color="#2e7d32" />
    <Box sx={bodyPad}>
      <Box sx={fieldRow}>
        <Field label="رقم الفاتورة" value={d.invoiceNo || 'INV-________'} />
        <Field label="التاريخ" value={formatDate(d.date)} />
        <Field label="تاريخ الاستحقاق" value={formatDate(d.dueDate)} />
      </Box>
      <Grid container spacing={2} mb={2}>
        <Grid item xs={6}>
          <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" mb={1}>البائع</Typography>
            <Typography variant="body2">مركز الأوائل للتأهيل</Typography>
            <Typography variant="caption" color="text.secondary">الرقم الضريبي: ________________</Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 1 }}>
            <Typography variant="subtitle2" fontWeight="bold" mb={1}>المشتري</Typography>
            <Typography variant="body2">{d.customerName || '________________'}</Typography>
            <Typography variant="caption" color="text.secondary">الرقم الضريبي: {d.customerTax || '________________'}</Typography>
          </Box>
        </Grid>
      </Grid>

      <PrintTable headers={[
        { label: 'م', width: 30 }, 'البيان', { label: 'الكمية', center: true },
        { label: 'السعر', center: true }, { label: 'الإجمالي', center: true }
      ]} headerBg="#e8f5e9" rows={
        (d.items || [{}, {}, {}, {}, {}]).map((item, i) => [
          i + 1, item.desc || '', item.qty || '', formatMoney(item.price), formatMoney(item.total)
        ])
      } />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Box sx={{ width: 250, border: '1px solid #ddd', borderRadius: 1 }}>
          {[
            ['المجموع قبل الضريبة', formatMoney(d.subtotal)],
            ['ضريبة القيمة المضافة (15%)', formatMoney(d.vat)],
          ].map(([l, v], i) => (
            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 0.5, borderBottom: '1px solid #eee' }}>
              <Typography variant="body2">{l}</Typography><Typography variant="body2">{v}</Typography>
            </Box>
          ))}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1, bgcolor: '#e8f5e9' }}>
            <Typography variant="body1" fontWeight="bold">الإجمالي</Typography>
            <Typography variant="body1" fontWeight="bold" color="#2e7d32">{formatMoney(d.total)} ر.س</Typography>
          </Box>
        </Box>
      </Box>
      <Box sx={fieldRow} mt={2}>
        <Field label="المبلغ كتابة" value={d.amountInWords} flex={3} />
      </Box>
      <SignatureBlock signatures={['المحاسب', 'المدير المالي']} />
      <StampCircle />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 2. PAYMENT VOUCHER ═══════ */
const PaymentVoucher = ({ d }) => (
  <Box sx={{ ...pageWrapper, borderTop: '4px solid #c62828' }}>
    <OrgHeader title="سند صرف" subtitle="Payment Voucher" color="#c62828" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="PV" />
      <Box sx={fieldRow}>
        <Field label="صُرف إلى" value={d.paidTo} flex={2} />
        <Field label="المبلغ" value={`${formatMoney(d.amount)} ر.س`} />
        <Field label="طريقة الدفع" value={d.method || '□ نقدي □ شيك □ تحويل'} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="البيان" value={d.description} flex={3} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="رقم الحساب" value={d.accountNo} />
        <Field label="مركز التكلفة" value={d.costCenter} />
        <Field label="رقم الشيك" value={d.chequeNo} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="المبلغ كتابةً" value={d.amountInWords} flex={3} />
      </Box>
      <NotesBox content={d.notes} lines={2} />
      <SignatureBlock signatures={['المستلم', 'المحاسب', 'المدير المالي', 'المدير العام']} />
      <StampCircle />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 3. RECEIPT VOUCHER ═══════ */
const ReceiptVoucher = ({ d }) => (
  <Box sx={{ ...pageWrapper, borderTop: '4px solid #1565c0' }}>
    <OrgHeader title="سند قبض" subtitle="Receipt Voucher" color="#1565c0" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="RV" />
      <Box sx={fieldRow}>
        <Field label="استلمنا من" value={d.receivedFrom} flex={2} />
        <Field label="المبلغ" value={`${formatMoney(d.amount)} ر.س`} />
        <Field label="طريقة الدفع" value={d.method || '□ نقدي □ شيك □ تحويل'} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="وذلك عن" value={d.description} flex={3} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="المبلغ كتابةً" value={d.amountInWords} flex={3} />
      </Box>
      <SignatureBlock signatures={['الدافع', 'أمين الصندوق', 'المدير المالي']} />
      <StampCircle />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 4. JOURNAL ENTRY ═══════ */
const JournalEntry = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="قيد يومية" subtitle="Journal Entry" color="#6a1b9a" />
    <Box sx={bodyPad}>
      <Box sx={fieldRow}>
        <Field label="رقم القيد" value={d.entryNo || 'JE-________'} />
        <Field label="التاريخ" value={formatDate(d.date)} />
        <Field label="المصدر" value={d.source} />
      </Box>
      <PrintTable headers={[
        { label: 'رقم الحساب' }, 'اسم الحساب', { label: 'البيان' },
        { label: 'مدين', center: true }, { label: 'دائن', center: true }
      ]} headerBg="#f3e5f5" rows={
        (d.entries || [{}, {}, {}, {}, {}]).map(e => [
          e.accountNo || '', e.accountName || '', e.desc || '',
          e.debit ? formatMoney(e.debit) : '', e.credit ? formatMoney(e.credit) : ''
        ])
      } />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <Box sx={{ display: 'flex', gap: 4, bgcolor: '#f3e5f5', px: 3, py: 1, borderRadius: 1 }}>
          <Typography variant="body2"><strong>إجمالي المدين:</strong> {formatMoney(d.totalDebit)} ر.س</Typography>
          <Typography variant="body2"><strong>إجمالي الدائن:</strong> {formatMoney(d.totalCredit)} ر.س</Typography>
        </Box>
      </Box>
      <NotesBox content={d.notes} lines={2} />
      <SignatureBlock signatures={['معد القيد', 'مراجع', 'المدير المالي']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 5. TRIAL BALANCE ═══════ */
const TrialBalance = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="ميزان المراجعة" subtitle="Trial Balance" color="#00695c" />
    <Box sx={bodyPad}>
      <Box sx={fieldRow}>
        <Field label="الفترة" value={d.period || '________'} />
        <Field label="من تاريخ" value={formatDate(d.fromDate)} />
        <Field label=" إلى تاريخ" value={formatDate(d.toDate)} />
      </Box>
      <EmptyTable headers={[
        { label: 'رقم الحساب', width: 80 }, 'اسم الحساب',
        { label: 'مدين', center: true, width: 100 }, { label: 'دائن', center: true, width: 100 },
      ]} rowCount={20} headerBg="#e0f2f1" />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <Box sx={{ display: 'flex', gap: 4, bgcolor: '#e0f2f1', px: 3, py: 1, borderRadius: 1 }}>
          <Typography variant="body2"><strong>إجمالي المدين:</strong> ____________ ر.س</Typography>
          <Typography variant="body2"><strong>إجمالي الدائن:</strong> ____________ ر.س</Typography>
        </Box>
      </Box>
      <SignatureBlock signatures={['المحاسب', 'المدير المالي']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 6. ACCOUNT STATEMENT ═══════ */
const AccountStatement = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="كشف حساب" subtitle="Account Statement" color="#37474f" />
    <Box sx={bodyPad}>
      <Box sx={fieldRow}>
        <Field label="اسم الحساب" value={d.accountName} flex={2} />
        <Field label="رقم الحساب" value={d.accountNo} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="من تاريخ" value={formatDate(d.fromDate)} />
        <Field label="إلى تاريخ" value={formatDate(d.toDate)} />
        <Field label="الرصيد الافتتاحي" value={`${formatMoney(d.openingBalance)} ر.س`} />
      </Box>
      <EmptyTable headers={[
        { label: 'التاريخ', width: 80 }, { label: 'رقم القيد' }, 'البيان',
        { label: 'مدين', center: true }, { label: 'دائن', center: true }, { label: 'الرصيد', center: true }
      ]} rowCount={15} headerBg="#eceff1" />
      <Box sx={{ bgcolor: '#eceff1', p: 2, borderRadius: 1, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="body2"><strong>إجمالي الحركة المدينة:</strong> ____________</Typography>
        <Typography variant="body2"><strong>إجمالي الحركة الدائنة:</strong> ____________</Typography>
        <Typography variant="body1" fontWeight="bold"><strong>الرصيد الختامي:</strong> ____________ ر.س</Typography>
      </Box>
      <SignatureBlock signatures={['المحاسب', 'المدير المالي']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 7. CHEQUE PRINT ═══════ */
const ChequePrint = ({ d }) => (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
    <Box sx={{ width: 700, border: '2px solid #0d47a1', borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ background: 'linear-gradient(135deg, #0d47a1, #1565c0)', color: 'white', p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" fontWeight="bold">مركز الأوائل للتأهيل</Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>AlAwael Rehabilitation Center</Typography>
        </Box>
        <Box textAlign="left">
          <Typography variant="body2">رقم الشيك: <strong>{d.chequeNo || '________'}</strong></Typography>
          <Typography variant="body2">التاريخ: <strong>{formatDate(d.date)}</strong></Typography>
        </Box>
      </Box>
      <Box sx={{ p: 3, bgcolor: '#fafafa' }}>
        <Box sx={fieldRow}>
          <Field label="ادفعوا لأمر" value={d.payTo} flex={3} />
        </Box>
        <Box sx={fieldRow}>
          <Field label="مبلغ وقدره" value={d.amountInWords} flex={3} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Typography variant="body2">البنك: <strong>{d.bankName || '________________'}</strong></Typography>
          <Box sx={{ border: '2px solid #0d47a1', borderRadius: 1, px: 3, py: 1 }}>
            <Typography variant="h5" fontWeight="bold" color="#0d47a1">** {formatMoney(d.amount)} ر.س **</Typography>
          </Box>
        </Box>
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Box textAlign="center">
            <Box sx={{ borderBottom: '1px dashed #666', width: 180, height: 40 }} />
            <Typography variant="caption">التوقيع المعتمد</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  </Box>
);

/* ═══════ 8. DONATION RECEIPT ═══════ */
const DonationReceipt = ({ d }) => (
  <Box sx={{ ...pageWrapper, borderTop: '4px solid #e65100' }}>
    <OrgHeader title="إيصال تبرع" subtitle="Donation Receipt" color="#e65100" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="DON" />
      <Box sx={fieldRow}>
        <Field label="اسم المتبرع" value={d.donorName} flex={2} />
        <Field label="رقم الهوية" value={d.donorId} />
        <Field label="الجوال" value={d.donorPhone} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="نوع التبرع" value={d.donationType || '□ نقدي □ عيني'} />
        <Field label="المبلغ / القيمة" value={`${formatMoney(d.amount)} ر.س`} />
        <Field label="طريقة الدفع" value={d.method} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="الغرض من التبرع" value={d.purpose} flex={3} />
      </Box>
      <NotesBox content={d.description} lines={2} />

      <Box sx={{ bgcolor: '#fff3e0', p: 2, borderRadius: 2, mt: 2, textAlign: 'center' }}>
        <Typography variant="body1" fontWeight="bold">جزاكم الله خيراً على تبرعكم السخي</Typography>
        <Typography variant="body2" color="text.secondary">بارك الله فيكم وجعلها في ميزان حسناتكم</Typography>
      </Box>

      <SignatureBlock signatures={['المتبرع', 'أمين الصندوق', 'المسؤول المالي']} />
      <StampCircle />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 9. CREDIT NOTE ═══════ */
const CreditNote = ({ d }) => (
  <Box sx={{ ...pageWrapper, borderTop: '4px solid #ad1457' }}>
    <OrgHeader title="إشعار دائن" subtitle="Credit Note" color="#ad1457" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="CN" />
      <Box sx={fieldRow}>
        <Field label="رقم الفاتورة الأصلية" value={d.originalInvoice} />
        <Field label="تاريخ الفاتورة" value={formatDate(d.originalDate)} />
        <Field label="اسم العميل" value={d.customerName} flex={2} />
      </Box>
      <Section title="بنود الإشعار" color="#ad1457" />
      <EmptyTable headers={[
        { label: 'م', width: 30 }, 'البيان',
        { label: 'المبلغ', center: true }
      ]} rowCount={5} headerBg="#fce4ec" />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
        <Box sx={{ bgcolor: '#fce4ec', px: 3, py: 1, borderRadius: 1 }}>
          <Typography variant="body1" fontWeight="bold">إجمالي الإشعار: {formatMoney(d.total)} ر.س</Typography>
        </Box>
      </Box>
      <Box sx={fieldRow}><Field label="السبب" value={d.reason} flex={3} /></Box>
      <SignatureBlock signatures={['المحاسب', 'المدير المالي']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 10. PETTY CASH ═══════ */
const PettyCash = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="سند نثرية" subtitle="Petty Cash Voucher" color="#ff6f00" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="PC" />
      <Box sx={fieldRow}>
        <Field label="صُرف إلى" value={d.paidTo} flex={2} />
        <Field label="القسم" value={d.department} />
        <Field label="المبلغ" value={`${formatMoney(d.amount)} ر.س`} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="البيان" value={d.description} flex={3} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="المبلغ كتابة" value={d.amountInWords} flex={3} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="رصيد الصندوق السابق" value={formatMoney(d.prevBalance)} />
        <Field label="المنصرف" value={formatMoney(d.amount)} />
        <Field label="الرصيد الحالي" value={formatMoney(d.currentBalance)} />
      </Box>
      <SignatureBlock signatures={['المستلم', 'أمين الصندوق', 'المدير المالي']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 11. INCOME STATEMENT ═══════ */
const IncomeStatement = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="قائمة الدخل" subtitle="Income Statement" color="#2e7d32" />
    <Box sx={bodyPad}>
      <ConfidentialBanner />
      <Box sx={fieldRow}>
        <Field label="الفترة" value={d.period || '________'} />
        <Field label="من" value={formatDate(d.fromDate)} />
        <Field label="إلى" value={formatDate(d.toDate)} />
      </Box>

      <Section title="الإيرادات" color="#2e7d32" />
      <EmptyTable headers={['البند', { label: 'المبلغ (ر.س)', center: true, width: 150 }]} rowCount={6} headerBg="#e8f5e9" />
      <Box sx={{ bgcolor: '#e8f5e9', px: 2, py: 1, borderRadius: 1, textAlign: 'left', mb: 2 }}>
        <Typography variant="body2" fontWeight="bold">إجمالي الإيرادات: ______________ ر.س</Typography>
      </Box>

      <Section title="المصروفات" color="#c62828" />
      <EmptyTable headers={['البند', { label: 'المبلغ (ر.س)', center: true, width: 150 }]} rowCount={10} headerBg="#ffebee" />
      <Box sx={{ bgcolor: '#ffebee', px: 2, py: 1, borderRadius: 1, textAlign: 'left', mb: 2 }}>
        <Typography variant="body2" fontWeight="bold">إجمالي المصروفات: ______________ ر.س</Typography>
      </Box>

      <Box sx={{ bgcolor: '#1b5e20', color: 'white', p: 2, borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="h6" fontWeight="bold">صافي الربح / (الخسارة): ______________ ر.س</Typography>
      </Box>
      <SignatureBlock signatures={['المحاسب', 'المدير المالي', 'المدير العام']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 12. BALANCE SHEET ═══════ */
const BalanceSheet = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="الميزانية العمومية" subtitle="Balance Sheet" color="#1a237e" />
    <Box sx={bodyPad}>
      <ConfidentialBanner />
      <Box sx={fieldRow}>
        <Field label="كما في تاريخ" value={formatDate(d.asOfDate)} />
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Section title="الأصول (Assets)" color="#1565c0" />
          <Typography variant="subtitle2" fontWeight="bold" mt={1}>أصول متداولة</Typography>
          <EmptyTable headers={['البند', { label: 'المبلغ', center: true }]} rowCount={5} headerBg="#e3f2fd" />
          <Typography variant="subtitle2" fontWeight="bold" mt={2}>أصول ثابتة</Typography>
          <EmptyTable headers={['البند', { label: 'المبلغ', center: true }]} rowCount={4} headerBg="#e3f2fd" />
          <Box sx={{ bgcolor: '#e3f2fd', px: 2, py: 1, borderRadius: 1, mt: 1 }}>
            <Typography variant="body2" fontWeight="bold">إجمالي الأصول: __________ ر.س</Typography>
          </Box>
        </Grid>
        <Grid item xs={6}>
          <Section title="الخصوم وحقوق الملكية" color="#c62828" />
          <Typography variant="subtitle2" fontWeight="bold" mt={1}>خصوم متداولة</Typography>
          <EmptyTable headers={['البند', { label: 'المبلغ', center: true }]} rowCount={5} headerBg="#ffebee" />
          <Typography variant="subtitle2" fontWeight="bold" mt={2}>حقوق الملكية</Typography>
          <EmptyTable headers={['البند', { label: 'المبلغ', center: true }]} rowCount={4} headerBg="#ffebee" />
          <Box sx={{ bgcolor: '#ffebee', px: 2, py: 1, borderRadius: 1, mt: 1 }}>
            <Typography variant="body2" fontWeight="bold">إجمالي الخصوم: __________ ر.س</Typography>
          </Box>
        </Grid>
      </Grid>
      <SignatureBlock signatures={['المحاسب', 'المراجع', 'المدير المالي', 'المدير العام']} />
      <OrgFooter />
    </Box>
  </Box>
);

export default FinanceTemplateRenderer;
