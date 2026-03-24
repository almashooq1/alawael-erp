/**
 * قوالب التعويضات والقوى العاملة
 * Compensation & Workforce Management Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine, ConfidentialBanner,
  fieldRow, bodyPad, pageWrapper, formatDate, formatMoney, today,
} from '../shared/PrintTemplateShared';

export const COMPENSATION_WORKFORCE_TEMPLATES = [
  { id: 'salary-structure', name: 'هيكل الرواتب', nameEn: 'Salary Structure', desc: 'هيكل الرواتب والدرجات الوظيفية', color: '#1565c0' },
  { id: 'payroll-summary', name: 'ملخص كشف الرواتب', nameEn: 'Payroll Summary', desc: 'ملخص الرواتب الشهري', color: '#1976d2' },
  { id: 'overtime-report', name: 'تقرير العمل الإضافي', nameEn: 'Overtime Report', desc: 'تقرير ساعات العمل الإضافي', color: '#1e88e5' },
  { id: 'bonus-calculation', name: 'كشف حساب المكافآت', nameEn: 'Bonus Calculation Sheet', desc: 'كشف حساب المكافآت والحوافز', color: '#2196f3' },
  { id: 'end-of-service-calc', name: 'حساب نهاية الخدمة', nameEn: 'End of Service Calculation', desc: 'حساب مكافأة نهاية الخدمة', color: '#0d47a1' },
  { id: 'workforce-plan', name: 'خطة القوى العاملة', nameEn: 'Workforce Plan', desc: 'خطة القوى العاملة السنوية', color: '#283593' },
  { id: 'manpower-request', name: 'طلب احتياج وظيفي', nameEn: 'Manpower Request', desc: 'نموذج طلب احتياج وظيفي', color: '#303f9f' },
  { id: 'succession-plan', name: 'خطة التعاقب الوظيفي', nameEn: 'Succession Plan', desc: 'خطة تعاقب المناصب الحرجة', color: '#3949ab' },
  { id: 'allowance-summary', name: 'ملخص البدلات', nameEn: 'Allowance Summary', desc: 'ملخص بدلات الموظفين', color: '#5c6bc0' },
  { id: 'deduction-register', name: 'سجل الاستقطاعات', nameEn: 'Deduction Register', desc: 'سجل استقطاعات الموظفين', color: '#7986cb' },
  { id: 'salary-certificate', name: 'شهادة راتب', nameEn: 'Salary Certificate', desc: 'شهادة راتب للجهات الخارجية', color: '#0277bd' },
  { id: 'gosi-report', name: 'تقرير التأمينات الاجتماعية', nameEn: 'GOSI Report', desc: 'تقرير اشتراكات التأمينات', color: '#00695c' },
  { id: 'wps-report', name: 'تقرير حماية الأجور', nameEn: 'WPS Report', desc: 'تقرير نظام حماية الأجور', color: '#2e7d32' },
  { id: 'headcount-report', name: 'تقرير أعداد الموظفين', nameEn: 'Headcount Report', desc: 'تقرير توزيع القوى العاملة', color: '#558b2f' },
  { id: 'turnover-analysis', name: 'تحليل دوران الموظفين', nameEn: 'Turnover Analysis', desc: 'تقرير تحليل معدل الدوران', color: '#e65100' },
  { id: 'comp-benchmark', name: 'مقارنة سوقية للرواتب', nameEn: 'Compensation Benchmark', desc: 'مقارنة الرواتب بالسوق', color: '#bf360c' },
];

export const CompensationWorkforceTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'salary-structure':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="هيكل الرواتب والدرجات الوظيفية" subtitle="Salary Structure & Grade System" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="السنة" value={d.year} w="12%" /><Field label="تاريخ الاعتماد" value={formatDate(d.approvalDate)} w="15%" /></div>
            <Section title="هيكل الدرجات">
              <EmptyTable cols={6} rows={10} headers={['الدرجة', 'المسمى', 'الحد الأدنى', 'متوسط', 'الحد الأعلى', 'البدلات']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'payroll-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص كشف الرواتب الشهري" subtitle="Monthly Payroll Summary" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الشهر" value={d.month} w="12%" /><Field label="عدد الموظفين" value={d.headcount} w="12%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="ملخص الرواتب">
              <EmptyTable cols={6} rows={8} headers={['القسم', 'عدد', 'الرواتب الأساسية', 'البدلات', 'الاستقطاعات', 'الصافي']} />
            </Section>
            <Section title="الإجماليات">
              <div style={fieldRow}><Field label="إجمالي الرواتب" value={formatMoney(d.grossTotal)} w="18%" /><Field label="إجمالي الاستقطاعات" value={formatMoney(d.totalDeductions)} w="18%" /><Field label="صافي المستحق" value={formatMoney(d.netTotal)} w="18%" /></div>
            </Section>
            <SignatureBlock rightLabel="مدير الرواتب" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'overtime-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير ساعات العمل الإضافي" subtitle="Overtime Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الشهر" value={d.month} w="12%" /><Field label="القسم" value={d.department} w="20%" /></div>
            <Section title="العمل الإضافي">
              <EmptyTable cols={6} rows={8} headers={['الموظف', 'الساعات', 'المعدل', 'المبلغ', 'السبب', 'الموافقة']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الساعات" value={d.totalHours} w="12%" /><Field label="إجمالي التكلفة" value={formatMoney(d.totalCost)} w="15%" /></div>
            <SignatureBlock rightLabel="مدير القسم" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'bonus-calculation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="كشف حساب المكافآت والحوافز" subtitle="Bonus & Incentive Calculation Sheet" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /><Field label="نوع المكافأة" value={d.bonusType} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="المكافآت">
              <EmptyTable cols={6} rows={8} headers={['الموظف', 'القسم', 'التقييم', 'الراتب الأساسي', 'النسبة', 'المبلغ']} />
            </Section>
            <div style={fieldRow}><Field label="الإجمالي" value={formatMoney(d.total)} w="15%" /></div>
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'end-of-service-calc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="حساب مكافأة نهاية الخدمة" subtitle="End of Service Benefits Calculation" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الموظف" value={d.employee} w="25%" /><Field label="الرقم الوظيفي" value={d.empNo} w="12%" /><Field label="تاريخ التعيين" value={formatDate(d.joinDate)} w="15%" /><Field label="تاريخ الانتهاء" value={formatDate(d.endDate)} w="15%" /></div>
            <div style={fieldRow}><Field label="مدة الخدمة (سنوات)" value={d.serviceYears} w="15%" /><Field label="آخر راتب أساسي" value={formatMoney(d.lastSalary)} w="15%" /><Field label="سبب الانتهاء" value={d.reason} w="15%" /></div>
            <Section title="تفصيل الحساب">
              <EmptyTable cols={4} rows={4} headers={['الفترة', 'السنوات', 'المعادلة', 'المبلغ']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي المكافأة" value={formatMoney(d.totalBenefit)} w="18%" /></div>
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'workforce-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة القوى العاملة السنوية" subtitle="Annual Workforce Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="السنة" value={d.year} w="12%" /><Field label="إعداد" value={d.preparedBy} w="20%" /></div>
            <Section title="الاحتياج الوظيفي">
              <EmptyTable cols={6} rows={10} headers={['القسم', 'العدد الحالي', 'المطلوب', 'النقص', 'الأولوية', 'التوقيت']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الحالي" value={d.currentTotal} w="12%" /><Field label="إجمالي المطلوب" value={d.requiredTotal} w="12%" /><Field label="التكلفة التقديرية" value={formatMoney(d.estimatedCost)} w="18%" /></div>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'manpower-request':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج طلب احتياج وظيفي" subtitle="Manpower Request Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم الطالب" value={d.department} w="20%" /><Field label="المسمى الوظيفي" value={d.jobTitle} w="20%" /><Field label="العدد" value={d.quantity} w="8%" /></div>
            <div style={fieldRow}><Field label="نوع التوظيف" value={d.empType} w="15%" /><Field label="الأولوية" value={d.priority} w="10%" /><Field label="التاريخ المطلوب" value={formatDate(d.neededBy)} w="15%" /></div>
            <NotesBox label="المبررات" value={d.justification} lines={2} />
            <NotesBox label="المؤهلات المطلوبة" value={d.qualifications} lines={2} />
            <SignatureBlock rightLabel="مدير القسم" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'succession-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة التعاقب الوظيفي" subtitle="Succession Plan" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="السنة" value={d.year} w="12%" /><Field label="إعداد" value={d.preparedBy} w="20%" /></div>
            <Section title="المناصب الحرجة والبدلاء">
              <EmptyTable cols={6} rows={8} headers={['المنصب', 'الشاغل الحالي', 'البديل الأول', 'الجاهزية', 'البديل الثاني', 'خطة التطوير']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'allowance-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص بدلات الموظفين" subtitle="Employee Allowance Summary" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الشهر" value={d.month} w="12%" /><Field label="القسم" value={d.department} w="20%" /></div>
            <Section title="البدلات">
              <EmptyTable cols={7} rows={8} headers={['الموظف', 'سكن', 'نقل', 'بدل أخرى', 'طبيعة عمل', 'إعاشة', 'الإجمالي']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي البدلات" value={formatMoney(d.total)} w="18%" /></div>
            <SignatureBlock rightLabel="مدير الرواتب" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'deduction-register':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل استقطاعات الموظفين" subtitle="Employee Deduction Register" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الشهر" value={d.month} w="12%" /></div>
            <Section title="الاستقطاعات">
              <EmptyTable cols={7} rows={8} headers={['الموظف', 'تأمينات', 'سلف', 'غياب', 'جزاءات', 'أخرى', 'الإجمالي']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الاستقطاعات" value={formatMoney(d.total)} w="18%" /></div>
            <SignatureBlock rightLabel="مدير الرواتب" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'salary-certificate':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة راتب" subtitle="Salary Certificate" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <NotesBox label="" value="إلى من يهمه الأمر" lines={0} />
            <NotesBox label="" value={`نفيد بأن الموظف / ${d.employee || '........................'} يعمل لدينا منذ ${formatDate(d.joinDate) || '..../..../.....'} وراتبه الشهري كالتالي:`} lines={0} />
            <div style={fieldRow}><Field label="الراتب الأساسي" value={formatMoney(d.basicSalary)} w="18%" /><Field label="بدل السكن" value={formatMoney(d.housingAllowance)} w="18%" /><Field label="بدل النقل" value={formatMoney(d.transportAllowance)} w="18%" /></div>
            <div style={fieldRow}><Field label="بدلات أخرى" value={formatMoney(d.otherAllowances)} w="18%" /><Field label="إجمالي الراتب" value={formatMoney(d.totalSalary)} w="18%" /></div>
            <NotesBox label="أعطيت هذه الشهادة بناءً على طلبه دون أدنى مسؤولية على المنشأة." value="" lines={0} />
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'gosi-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير اشتراكات التأمينات الاجتماعية" subtitle="GOSI Contributions Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الشهر" value={d.month} w="12%" /><Field label="رقم المنشأة" value={d.establishmentNo} w="15%" /></div>
            <Section title="الاشتراكات">
              <EmptyTable cols={6} rows={8} headers={['الموظف', 'الجنسية', 'راتب الاشتراك', 'حصة الموظف', 'حصة المنشأة', 'الإجمالي']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي حصة الموظفين" value={formatMoney(d.empShare)} w="18%" /><Field label="إجمالي حصة المنشأة" value={formatMoney(d.orgShare)} w="18%" /><Field label="الإجمالي" value={formatMoney(d.total)} w="15%" /></div>
            <SignatureBlock rightLabel="مدير الرواتب" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'wps-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير نظام حماية الأجور" subtitle="Wage Protection System (WPS) Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الشهر" value={d.month} w="12%" /><Field label="البنك" value={d.bank} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="تفاصيل التحويل">
              <EmptyTable cols={5} rows={8} headers={['الموظف', 'رقم الحساب', 'المبلغ', 'الحالة', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي المحول" value={formatMoney(d.total)} w="18%" /><Field label="عدد الموظفين" value={d.count} w="12%" /></div>
            <SignatureBlock rightLabel="مدير الرواتب" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'headcount-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير توزيع القوى العاملة" subtitle="Headcount Distribution Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="إجمالي الموظفين" value={d.totalHeadcount} w="15%" /></div>
            <Section title="التوزيع حسب القسم">
              <EmptyTable cols={5} rows={10} headers={['القسم', 'سعوديين', 'غير سعوديين', 'الإجمالي', 'نسبة السعودة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'turnover-analysis':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تحليل معدل دوران الموظفين" subtitle="Employee Turnover Analysis" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /><Field label="معدل الدوران" value={d.turnoverRate} w="12%" /></div>
            <Section title="تفاصيل المغادرين">
              <EmptyTable cols={5} rows={8} headers={['القسم', 'استقالة', 'إنهاء', 'أخرى', 'الإجمالي']} />
            </Section>
            <NotesBox label="أسباب رئيسية" value={d.mainReasons} lines={2} />
            <NotesBox label="توصيات لتقليل الدوران" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'comp-benchmark':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مقارنة سوقية للرواتب" subtitle="Compensation Benchmark Report" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="المصدر" value={d.source} w="20%" /></div>
            <Section title="المقارنة">
              <EmptyTable cols={6} rows={8} headers={['المسمى الوظيفي', 'راتبنا', 'السوق (أدنى)', 'السوق (متوسط)', 'السوق (أعلى)', 'الموقع']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
