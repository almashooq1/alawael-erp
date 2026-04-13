/**
 * قوالب التخطيط المالي والخزينة
 * Financial Planning & Treasury Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, formatMoney, today,
} from '../shared/PrintTemplateShared';

export const FINANCIAL_PLANNING_TEMPLATES = [
  { id: 'annual-budget-plan', name: 'الخطة السنوية للميزانية', nameEn: 'Annual Budget Plan', desc: 'خطة الميزانية السنوية الشاملة', color: '#1b5e20' },
  { id: 'budget-variance-report', name: 'تقرير انحراف الميزانية', nameEn: 'Budget Variance Report', desc: 'تقرير مقارنة الفعلي بالمخطط', color: '#2e7d32' },
  { id: 'cash-flow-forecast', name: 'توقعات التدفق النقدي', nameEn: 'Cash Flow Forecast', desc: 'توقعات التدفقات النقدية', color: '#388e3c' },
  { id: 'treasury-position', name: 'مركز الخزينة اليومي', nameEn: 'Daily Treasury Position', desc: 'مركز السيولة اليومي', color: '#43a047' },
  { id: 'cost-center-report', name: 'تقرير مركز التكلفة', nameEn: 'Cost Center Report', desc: 'تقرير مصروفات مركز تكلفة', color: '#558b2f' },
  { id: 'investment-proposal', name: 'مقترح استثماري', nameEn: 'Investment Proposal', desc: 'مقترح استثمار أموال الوقف', color: '#33691e' },
  { id: 'financial-kpi-report', name: 'تقرير مؤشرات مالية', nameEn: 'Financial KPI Report', desc: 'مؤشرات الأداء المالي الرئيسية', color: '#4caf50' },
  { id: 'petty-cash-reconcile', name: 'تسوية الصندوق النثري', nameEn: 'Petty Cash Reconciliation', desc: 'تسوية وجرد الصندوق النثري', color: '#66bb6a' },
  { id: 'donation-receipt-official', name: 'إيصال تبرع رسمي', nameEn: 'Official Donation Receipt', desc: 'إيصال تبرع معتمد للزكاة', color: '#009688' },
  { id: 'grant-utilization-report', name: 'تقرير استخدام المنحة', nameEn: 'Grant Utilization Report', desc: 'تقرير صرف واستخدام منحة', color: '#00796b' },
  { id: 'bank-reconciliation', name: 'تسوية بنكية', nameEn: 'Bank Reconciliation Statement', desc: 'مطابقة كشف الحساب البنكي', color: '#00695c' },
  { id: 'expense-claim-form', name: 'نموذج مطالبة مصروفات', nameEn: 'Expense Claim Form', desc: 'مطالبة صرف مبلغ مالي', color: '#26a69a' },
  { id: 'dept-allocation-plan', name: 'خطة توزيع الميزانية', nameEn: 'Dept Budget Allocation', desc: 'توزيع الميزانية على الأقسام', color: '#00897b' },
  { id: 'endowment-report', name: 'تقرير الأوقاف', nameEn: 'Endowment Report', desc: 'تقرير عوائد وإدارة الأوقاف', color: '#1b5e20' },
  { id: 'zakat-calculation', name: 'حساب الزكاة', nameEn: 'Zakat Calculation Sheet', desc: 'حساب الزكاة المستحقة', color: '#004d40' },
  { id: 'financial-audit-checklist', name: 'قائمة تدقيق مالي', nameEn: 'Financial Audit Checklist', desc: 'قائمة فحص التدقيق المالي', color: '#2e7d32' },
];

export const FinancialPlanningTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'annual-budget-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="الخطة السنوية للميزانية" subtitle="Annual Budget Plan" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="السنة المالية" value={d.fiscalYear} w="15%" /><Field label="إعداد" value={d.preparedBy} w="20%" /><Field label="الإجمالي" value={formatMoney(d.total)} w="18%" /></div>
            <Section title="توزيع الميزانية حسب القسم">
              <EmptyTable cols={5} rows={8} headers={['القسم', 'رواتب', 'تشغيل', 'رأسمالي', 'الإجمالي']} />
            </Section>
            <Section title="ملخص">
              <div style={fieldRow}><Field label="إيرادات متوقعة" value={formatMoney(d.revenue)} w="20%" /><Field label="مصروفات متوقعة" value={formatMoney(d.expenses)} w="20%" /><Field label="فائض/عجز" value={formatMoney(d.surplus)} w="18%" /></div>
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="المدير المالي" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'budget-variance-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير انحراف الميزانية" subtitle="Budget Variance Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /><Field label="القسم" value={d.department} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="مقارنة الفعلي بالمخطط">
              <EmptyTable cols={5} rows={8} headers={['البند', 'المخطط', 'الفعلي', 'الانحراف', 'النسبة %']} />
            </Section>
            <NotesBox label="تحليل الانحرافات الجوهرية" value={d.analysis} lines={3} />
            <NotesBox label="إجراءات تصحيحية" value={d.corrective} lines={2} />
            <SignatureBlock rightLabel="المحلل المالي" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'cash-flow-forecast':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توقعات التدفق النقدي" subtitle="Cash Flow Forecast" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="20%" /><Field label="العملة" value={d.currency || 'ريال سعودي'} w="15%" /></div>
            <Section title="التدفقات النقدية المتوقعة">
              <EmptyTable cols={5} rows={6} headers={['البند', 'الشهر 1', 'الشهر 2', 'الشهر 3', 'الإجمالي']} />
            </Section>
            <Section title="ملخص">
              <div style={fieldRow}><Field label="رصيد افتتاحي" value={formatMoney(d.opening)} w="17%" /><Field label="واردات" value={formatMoney(d.inflows)} w="17%" /><Field label="صادرات" value={formatMoney(d.outflows)} w="17%" /><Field label="رصيد ختامي" value={formatMoney(d.closing)} w="17%" /></div>
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="أمين الخزينة" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'treasury-position':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مركز الخزينة اليومي" subtitle="Daily Treasury Position" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="أمين الخزينة" value={d.treasurer} w="20%" /></div>
            <Section title="الأرصدة البنكية">
              <EmptyTable cols={4} rows={5} headers={['البنك / الحساب', 'رصيد أمس', 'الحركة', 'رصيد اليوم']} />
            </Section>
            <Section title="الصندوق النقدي">
              <div style={fieldRow}><Field label="رصيد الصندوق" value={formatMoney(d.cashBalance)} w="17%" /><Field label="شيكات مستلمة" value={formatMoney(d.cheques)} w="17%" /></div>
            </Section>
            <div style={fieldRow}><Field label="إجمالي السيولة" value={formatMoney(d.totalLiquidity)} w="20%" /></div>
            <SignatureBlock rightLabel="أمين الخزينة" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'cost-center-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير مركز التكلفة" subtitle="Cost Center Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="مركز التكلفة" value={d.costCenter} w="20%" /><Field label="الكود" value={d.code} w="10%" /><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="تفاصيل المصروفات">
              <EmptyTable cols={5} rows={8} headers={['البند', 'المخصص', 'المصروف', 'المتبقي', 'النسبة %']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي المخصص" value={formatMoney(d.allocated)} w="17%" /><Field label="إجمالي المصروف" value={formatMoney(d.spent)} w="17%" /><Field label="نسبة الصرف" value={d.utilization} w="12%" /></div>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مسؤول القسم" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'investment-proposal':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مقترح استثماري" subtitle="Investment Proposal" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="عنوان المقترح" value={d.title} w="30%" /><Field label="المبلغ" value={formatMoney(d.amount)} w="18%" /><Field label="المدة" value={d.duration} w="12%" /></div>
            <NotesBox label="وصف الفرصة" value={d.description} lines={3} />
            <Section title="الدراسة المالية">
              <div style={fieldRow}><Field label="العائد المتوقع" value={d.expectedReturn} w="15%" /><Field label="مستوى المخاطر" value={d.riskLevel} w="15%" /><Field label="فترة الاسترداد" value={d.paybackPeriod} w="15%" /></div>
            </Section>
            <NotesBox label="التوصية" value={d.recommendation} lines={2} />
            <SignatureBlock rightLabel="المدير المالي" leftLabel="رئيس مجلس الإدارة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'financial-kpi-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير مؤشرات الأداء المالي" subtitle="Financial KPI Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="المؤشرات المالية الرئيسية">
              <EmptyTable cols={5} rows={8} headers={['المؤشر', 'المستهدف', 'الفعلي', 'الوضع', 'التوجه']} />
            </Section>
            <NotesBox label="تحليل" value={d.analysis} lines={2} />
            <NotesBox label="توصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="المحلل المالي" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'petty-cash-reconcile':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تسوية وجرد الصندوق النثري" subtitle="Petty Cash Reconciliation" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="أمين الصندوق" value={d.custodian} w="20%" /><Field label="سقف الصندوق" value={formatMoney(d.limit)} w="15%" /></div>
            <Section title="المصروفات">
              <EmptyTable cols={5} rows={6} headers={['المسلسل', 'البيان', 'المستند', 'المبلغ', 'ملاحظات']} />
            </Section>
            <Section title="الجرد">
              <div style={fieldRow}><Field label="رصيد دفتري" value={formatMoney(d.bookBalance)} w="15%" /><Field label="نقد فعلي" value={formatMoney(d.actualCash)} w="15%" /><Field label="فرق" value={formatMoney(d.difference)} w="12%" /></div>
            </Section>
            <SignatureBlock rightLabel="أمين الصندوق" leftLabel="المراجع" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'donation-receipt-official':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إيصال تبرع رسمي" subtitle="Official Donation Receipt" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المتبرع" value={d.donorName} w="25%" /><Field label="رقم الهوية" value={d.idNumber} w="15%" /><Field label="الهاتف" value={d.phone} w="15%" /></div>
            <div style={fieldRow}><Field label="المبلغ" value={formatMoney(d.amount)} w="18%" /><Field label="كتابة" value={d.amountWords} w="30%" /></div>
            <div style={fieldRow}><Field label="طريقة الدفع" value={d.paymentMethod} w="15%" /><Field label="الغرض" value={d.purpose} w="25%" /></div>
            <NotesBox label="يعتبر هذا الإيصال وثيقة رسمية لأغراض الزكاة والضريبة." value="" lines={0} />
            <SignatureBlock rightLabel="أمين الصندوق" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'grant-utilization-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير استخدام المنحة" subtitle="Grant Utilization Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المنحة" value={d.grantName} w="25%" /><Field label="الجهة المانحة" value={d.donor} w="20%" /><Field label="المبلغ الإجمالي" value={formatMoney(d.totalAmount)} w="18%" /></div>
            <Section title="أوجه الصرف">
              <EmptyTable cols={5} rows={6} headers={['البند', 'المخصص', 'المصروف', 'المتبقي', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="نسبة الصرف" value={d.utilization} w="12%" /><Field label="المتبقي" value={formatMoney(d.remaining)} w="15%" /></div>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مدير المشروع" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'bank-reconciliation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تسوية بنكية" subtitle="Bank Reconciliation Statement" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="البنك" value={d.bank} w="20%" /><Field label="رقم الحساب" value={d.accountNo} w="18%" /><Field label="الشهر" value={d.month} w="12%" /></div>
            <Section title="المطابقة">
              <div style={fieldRow}><Field label="رصيد كشف البنك" value={formatMoney(d.bankBalance)} w="20%" /><Field label="رصيد الدفاتر" value={formatMoney(d.bookBalance)} w="20%" /></div>
            </Section>
            <Section title="عمليات معلقة">
              <EmptyTable cols={4} rows={6} headers={['التاريخ', 'البيان', 'مدين', 'دائن']} />
            </Section>
            <div style={fieldRow}><Field label="الرصيد بعد التسوية" value={formatMoney(d.adjustedBalance)} w="20%" /></div>
            <SignatureBlock rightLabel="المحاسب" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'expense-claim-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج مطالبة مصروفات" subtitle="Expense Claim Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="اسم الموظف" value={d.employee} w="25%" /><Field label="القسم" value={d.department} w="15%" /><Field label="الرقم الوظيفي" value={d.empNo} w="12%" /></div>
            <Section title="تفاصيل المصروفات">
              <EmptyTable cols={5} rows={6} headers={['التاريخ', 'البيان', 'المبلغ', 'المستند', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="الإجمالي المطلوب" value={formatMoney(d.total)} w="18%" /></div>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="الموظف" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'dept-allocation-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة توزيع الميزانية على الأقسام" subtitle="Department Budget Allocation Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="السنة المالية" value={d.fiscalYear} w="15%" /><Field label="إجمالي الميزانية" value={formatMoney(d.totalBudget)} w="20%" /></div>
            <Section title="التوزيع">
              <EmptyTable cols={5} rows={10} headers={['القسم', 'رواتب', 'تشغيل', 'مشاريع', 'الإجمالي']} />
            </Section>
            <NotesBox label="معايير التوزيع" value={d.criteria} lines={2} />
            <SignatureBlock rightLabel="المدير المالي" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'endowment-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير إدارة الأوقاف" subtitle="Endowment Management Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="محفظة الأوقاف">
              <EmptyTable cols={5} rows={5} headers={['الوقف', 'القيمة', 'العائد السنوي', 'المصروف', 'الصافي']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي القيمة" value={formatMoney(d.totalValue)} w="18%" /><Field label="إجمالي العوائد" value={formatMoney(d.totalReturns)} w="18%" /></div>
            <NotesBox label="تقييم الأداء" value={d.performance} lines={2} />
            <SignatureBlock rightLabel="مدير الأوقاف" leftLabel="رئيس مجلس الإدارة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'zakat-calculation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="حساب الزكاة المستحقة" subtitle="Zakat Calculation Sheet" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="السنة" value={d.year} w="12%" /><Field label="تاريخ الحول" value={formatDate(d.hawlDate)} w="15%" /></div>
            <Section title="الأصول الزكوية">
              <EmptyTable cols={3} rows={6} headers={['البند', 'المبلغ', 'ملاحظات']} />
            </Section>
            <Section title="الخصوم المسموح بها">
              <EmptyTable cols={3} rows={4} headers={['البند', 'المبلغ', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="الوعاء الزكوي" value={formatMoney(d.zakatBase)} w="18%" /><Field label="نسبة الزكاة" value="2.5%" w="10%" /><Field label="الزكاة المستحقة" value={formatMoney(d.zakatDue)} w="18%" /></div>
            <SignatureBlock rightLabel="المحاسب" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'financial-audit-checklist':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="قائمة فحص التدقيق المالي" subtitle="Financial Audit Checklist" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم" value={d.department} w="20%" /><Field label="المدقق" value={d.auditor} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="بنود الفحص">
              <EmptyTable cols={4} rows={12} headers={['البند', 'مطابق', 'غير مطابق', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات عامة" value={d.notes} lines={2} />
            <NotesBox label="توصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="المدقق" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
