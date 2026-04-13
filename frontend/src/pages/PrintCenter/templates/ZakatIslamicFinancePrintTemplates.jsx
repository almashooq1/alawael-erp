/**
 * قوالب الزكاة والمالية الإسلامية
 * Zakat & Islamic Finance Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const ZAKAT_ISLAMIC_FINANCE_TEMPLATES = [
  { id: 'zakat-calculation', name: 'حساب الزكاة', nameEn: 'Zakat Calculation Sheet', desc: 'ورقة حساب الزكاة السنوية', color: '#1b5e20' },
  { id: 'zakat-payment-cert', name: 'شهادة دفع الزكاة', nameEn: 'Zakat Payment Certificate', desc: 'شهادة سداد الزكاة', color: '#2e7d32' },
  { id: 'zakat-distribution', name: 'توزيع الزكاة', nameEn: 'Zakat Distribution Report', desc: 'تقرير توزيع أموال الزكاة', color: '#388e3c' },
  { id: 'vat-return-form', name: 'نموذج إقرار ضريبة القيمة المضافة', nameEn: 'VAT Return Form', desc: 'نموذج إقرار ضريبة القيمة المضافة', color: '#1565c0' },
  { id: 'vat-invoice', name: 'فاتورة ضريبية', nameEn: 'VAT Invoice', desc: 'فاتورة ضريبية وفق متطلبات الزكاة', color: '#0d47a1' },
  { id: 'withholding-tax-cert', name: 'شهادة ضريبة الاستقطاع', nameEn: 'Withholding Tax Certificate', desc: 'شهادة ضريبة الاستقطاع', color: '#1976d2' },
  { id: 'tax-filing-report', name: 'تقرير الإيداع الضريبي', nameEn: 'Tax Filing Report', desc: 'تقرير إيداع الإقرارات الضريبية', color: '#1e88e5' },
  { id: 'gratuity-calculation', name: 'حساب مكافأة نهاية الخدمة', nameEn: 'Gratuity Calculation Sheet', desc: 'ورقة حساب مكافأة نهاية الخدمة', color: '#e65100' },
  { id: 'gratuity-settlement', name: 'تسوية مكافأة نهاية الخدمة', nameEn: 'Gratuity Settlement Form', desc: 'نموذج تسوية مكافأة نهاية الخدمة', color: '#bf360c' },
  { id: 'sadaqah-receipt', name: 'إيصال صدقة', nameEn: 'Sadaqah Receipt', desc: 'إيصال استلام صدقة/تبرع', color: '#6a1b9a' },
  { id: 'waqf-report', name: 'تقرير الأوقاف', nameEn: 'Waqf (Endowment) Report', desc: 'تقرير الأوقاف والاستثمارات الوقفية', color: '#4527a0' },
  { id: 'islamic-finance-compliance', name: 'امتثال التمويل الإسلامي', nameEn: 'Islamic Finance Compliance', desc: 'تقرير امتثال المعاملات الشرعية', color: '#283593' },
  { id: 'zakat-authority-letter', name: 'مراسلة هيئة الزكاة', nameEn: 'ZATCA Correspondence', desc: 'مراسلة رسمية لهيئة الزكاة والضريبة', color: '#37474f' },
  { id: 'tax-exemption-cert', name: 'شهادة إعفاء ضريبي', nameEn: 'Tax Exemption Certificate', desc: 'شهادة الإعفاء الضريبي', color: '#00695c' },
  { id: 'e-invoice-compliance', name: 'امتثال الفوترة الإلكترونية', nameEn: 'E-Invoice Compliance Report', desc: 'تقرير امتثال الفوترة الإلكترونية', color: '#0277bd' },
  { id: 'annual-zakat-report', name: 'التقرير السنوي للزكاة', nameEn: 'Annual Zakat Report', desc: 'التقرير السنوي الشامل للزكاة والضريبة', color: '#455a64' },
];

export const ZakatIslamicFinanceTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'zakat-calculation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ورقة حساب الزكاة" subtitle="Zakat Calculation Sheet" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="السنة المالية" value={d.fiscalYear} w="20%" /><Field label="تاريخ الحساب" value={formatDate(d.calcDate) || today()} w="25%" /><Field label="المحاسب" value={d.accountant} w="30%" /></div>
            <Section title="وعاء الزكاة">
              <EmptyTable cols={4} rows={8} headers={['البند', 'المبلغ', 'الإضافة/الحسم', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="صافي الوعاء" value={d.netBase} w="30%" /><Field label="نسبة الزكاة" value="2.5%" w="15%" /><Field label="مبلغ الزكاة المستحق" value={d.zakatAmount} w="30%" /></div>
            <SignatureBlock rightLabel="المحاسب" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'zakat-payment-cert':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة سداد الزكاة" subtitle="Zakat Payment Certificate" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="رقم الشهادة" value={d.certNo} w="25%" /><Field label="السنة المالية" value={d.fiscalYear} w="20%" /><Field label="تاريخ السداد" value={formatDate(d.paymentDate)} w="25%" /></div>
            <div style={fieldRow}><Field label="المبلغ المسدد" value={d.paidAmount} w="25%" /><Field label="طريقة السداد" value={d.paymentMethod} w="25%" /><Field label="رقم المرجع" value={d.referenceNo} w="25%" /></div>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="المحاسب" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'zakat-distribution':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير توزيع الزكاة" subtitle="Zakat Distribution Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="إجمالي المبلغ" value={d.totalAmount} w="25%" /><Field label="عدد المستفيدين" value={d.beneficiaryCount} w="20%" /></div>
            <Section title="توزيع المصارف">
              <EmptyTable cols={5} rows={8} headers={['المصرف', 'عدد المستفيدين', 'المبلغ', 'النسبة', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول الزكاة" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'vat-return-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إقرار ضريبة القيمة المضافة" subtitle="VAT Return Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة الضريبية" value={d.taxPeriod} w="25%" /><Field label="الرقم الضريبي" value={d.taxNo} w="25%" /><Field label="تاريخ التقديم" value={formatDate(d.submissionDate) || today()} w="25%" /></div>
            <Section title="تفاصيل الإقرار">
              <EmptyTable cols={4} rows={8} headers={['البند', 'المبيعات/المشتريات', 'الضريبة', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="صافي الضريبة المستحقة" value={d.netVat} w="30%" /></div>
            <SignatureBlock rightLabel="المحاسب" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'vat-invoice':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="فاتورة ضريبية" subtitle="VAT Invoice" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="رقم الفاتورة" value={d.invoiceNo} w="20%" /><Field label="التاريخ" value={formatDate(d.invoiceDate) || today()} w="20%" /><Field label="العميل" value={d.customerName} w="30%" /><Field label="الرقم الضريبي" value={d.customerTaxNo} w="25%" /></div>
            <Section title="البنود">
              <EmptyTable cols={6} rows={8} headers={['الوصف', 'الكمية', 'سعر الوحدة', 'المجموع', 'نسبة الضريبة', 'مبلغ الضريبة']} />
            </Section>
            <div style={fieldRow}><Field label="المجموع الفرعي" value={d.subtotal} w="25%" /><Field label="الضريبة" value={d.vatAmount} w="20%" /><Field label="الإجمالي" value={d.total} w="25%" /></div>
            <SignatureBlock rightLabel="المحاسب" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'withholding-tax-cert':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة ضريبة الاستقطاع" subtitle="Withholding Tax Certificate" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="رقم الشهادة" value={d.certNo} w="20%" /><Field label="المستفيد" value={d.beneficiary} w="30%" /><Field label="نوع الدفع" value={d.paymentType} w="25%" /><Field label="النسبة" value={d.rate} w="15%" /></div>
            <Section title="تفاصيل الاستقطاع">
              <EmptyTable cols={5} rows={6} headers={['الدفعة', 'المبلغ الإجمالي', 'نسبة الاستقطاع', 'المبلغ المستقطع', 'تاريخ الدفع']} />
            </Section>
            <SignatureBlock rightLabel="المحاسب" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'tax-filing-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير الإيداع الضريبي" subtitle="Tax Filing Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="السنة" value={d.year} w="15%" /><Field label="عدد الإقرارات" value={d.filingCount} w="20%" /><Field label="المعد" value={d.preparedBy} w="30%" /></div>
            <Section title="حالة الإقرارات">
              <EmptyTable cols={6} rows={8} headers={['نوع الإقرار', 'الفترة', 'تاريخ التقديم', 'المبلغ', 'الحالة', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="المحاسب الضريبي" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'gratuity-calculation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="حساب مكافأة نهاية الخدمة" subtitle="Gratuity Calculation Sheet" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم الموظف" value={d.employeeName} w="30%" /><Field label="تاريخ الالتحاق" value={formatDate(d.joinDate)} w="20%" /><Field label="تاريخ الانتهاء" value={formatDate(d.endDate)} w="20%" /><Field label="سنوات الخدمة" value={d.serviceYears} w="15%" /></div>
            <div style={fieldRow}><Field label="آخر راتب" value={d.lastSalary} w="20%" /><Field label="سبب الإنهاء" value={d.terminationReason} w="25%" /></div>
            <Section title="تفصيل الحساب">
              <EmptyTable cols={4} rows={4} headers={['الفترة', 'الأساس', 'النسبة', 'المبلغ']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي المكافأة" value={d.totalGratuity} w="30%" /></div>
            <SignatureBlock rightLabel="المحاسب" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'gratuity-settlement':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تسوية مكافأة نهاية الخدمة" subtitle="Gratuity Settlement Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم الموظف" value={d.employeeName} w="30%" /><Field label="المبلغ المستحق" value={d.dueAmount} w="20%" /><Field label="الخصومات" value={d.deductions} w="20%" /><Field label="الصافي" value={d.netAmount} w="20%" /></div>
            <Section title="تفاصيل التسوية">
              <EmptyTable cols={4} rows={5} headers={['البند', 'المستحق', 'الخصم', 'الصافي']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="الموظف" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'sadaqah-receipt':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إيصال صدقة / تبرع" subtitle="Sadaqah Receipt" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم المتبرع" value={d.donorName} w="35%" /><Field label="المبلغ" value={d.amount} w="20%" /><Field label="النوع" value={d.type} w="20%" /><Field label="التاريخ" value={formatDate(d.donationDate) || today()} w="20%" /></div>
            <div style={fieldRow}><Field label="طريقة الدفع" value={d.paymentMethod} w="25%" /><Field label="رقم المرجع" value={d.referenceNo} w="25%" /><Field label="الغرض" value={d.purpose} w="30%" /></div>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="المستلم" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'waqf-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير الأوقاف" subtitle="Waqf (Endowment) Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="عدد الأوقاف" value={d.waqfCount} w="20%" /><Field label="إجمالي القيمة" value={d.totalValue} w="25%" /></div>
            <Section title="تفاصيل الأوقاف">
              <EmptyTable cols={6} rows={8} headers={['اسم الوقف', 'النوع', 'القيمة', 'العوائد', 'المصارف', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مدير الأوقاف" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'islamic-finance-compliance':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير امتثال التمويل الإسلامي" subtitle="Islamic Finance Compliance Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="المراجع الشرعي" value={d.shariahReviewer} w="30%" /><Field label="التاريخ" value={formatDate(d.reviewDate) || today()} w="25%" /></div>
            <Section title="المعاملات المراجعة">
              <EmptyTable cols={5} rows={8} headers={['المعاملة', 'النوع', 'المبلغ', 'الحكم الشرعي', 'ملاحظات']} />
            </Section>
            <NotesBox label="التوصيات الشرعية" value={d.shariahRecommendations} lines={3} />
            <SignatureBlock rightLabel="المراجع الشرعي" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'zakat-authority-letter':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مراسلة هيئة الزكاة والضريبة والجمارك" subtitle="ZATCA Correspondence" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الموضوع" value={d.subject} w="50%" /><Field label="رقم المعاملة" value={d.transactionNo} w="25%" /></div>
            <NotesBox label="نص المراسلة" value={d.letterBody} lines={8} />
            <Section title="المرفقات">
              <EmptyTable cols={3} rows={4} headers={['المرفق', 'النوع', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="المدير المالي" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'tax-exemption-cert':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة الإعفاء الضريبي" subtitle="Tax Exemption Certificate" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="رقم الشهادة" value={d.certNo} w="20%" /><Field label="الجهة المعفاة" value={d.entityName} w="35%" /><Field label="نوع الإعفاء" value={d.exemptionType} w="25%" /></div>
            <div style={fieldRow}><Field label="من تاريخ" value={formatDate(d.fromDate)} w="25%" /><Field label="إلى تاريخ" value={formatDate(d.toDate)} w="25%" /><Field label="الأساس القانوني" value={d.legalBasis} w="30%" /></div>
            <NotesBox label="شروط الإعفاء" value={d.conditions} lines={3} />
            <SignatureBlock rightLabel="المسؤول المختص" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'e-invoice-compliance':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير امتثال الفوترة الإلكترونية" subtitle="E-Invoice Compliance Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="عدد الفواتير" value={d.invoiceCount} w="20%" /><Field label="نسبة الامتثال" value={d.complianceRate} w="20%" /><Field label="المعد" value={d.preparedBy} w="25%" /></div>
            <Section title="نتائج الفحص">
              <EmptyTable cols={5} rows={8} headers={['العنصر', 'المتطلب', 'الحالة', 'الفجوة', 'الإجراء']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول الفوترة" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'annual-zakat-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="التقرير السنوي للزكاة والضريبة" subtitle="Annual Zakat & Tax Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="السنة المالية" value={d.fiscalYear} w="20%" /><Field label="المعد" value={d.preparedBy} w="30%" /><Field label="التاريخ" value={formatDate(d.reportDate) || today()} w="25%" /></div>
            <Section title="ملخص الزكاة">
              <EmptyTable cols={4} rows={4} headers={['البند', 'المبلغ', 'المسدد', 'المتبقي']} />
            </Section>
            <Section title="ملخص ضريبة القيمة المضافة">
              <EmptyTable cols={4} rows={4} headers={['الفترة', 'المبيعات', 'المشتريات', 'الصافي']} />
            </Section>
            <NotesBox label="ملخص تنفيذي" value={d.executiveSummary} lines={3} />
            <SignatureBlock rightLabel="المحاسب الضريبي" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );
    default:
      return <div style={pageWrapper}><OrgHeader title="قالب الزكاة والمالية الإسلامية" /><div style={bodyPad}><p>لا يوجد قالب مطابق</p></div><OrgFooter /></div>;
  }
};
