/**
 * قوالب التأمين والإجازات
 * Insurance & Leave Management Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const INSURANCE_LEAVE_TEMPLATES = [
  { id: 'insurance-policy-doc', name: 'وثيقة بوليصة التأمين', nameEn: 'Insurance Policy Document', desc: 'وثيقة تفاصيل بوليصة التأمين', color: '#1565c0' },
  { id: 'insurance-claim-form', name: 'نموذج مطالبة تأمين', nameEn: 'Insurance Claim Form', desc: 'نموذج تقديم مطالبة تأمينية', color: '#0d47a1' },
  { id: 'insurance-coverage', name: 'تقرير التغطية التأمينية', nameEn: 'Insurance Coverage Report', desc: 'تقرير التغطية التأمينية للموظفين', color: '#1976d2' },
  { id: 'insurance-renewal-notice', name: 'إشعار تجديد تأمين', nameEn: 'Insurance Renewal Notice', desc: 'إشعار تجديد بوليصة التأمين', color: '#1e88e5' },
  { id: 'insurance-comparison', name: 'مقارنة عروض التأمين', nameEn: 'Insurance Quote Comparison', desc: 'مقارنة عروض شركات التأمين', color: '#2196f3' },
  { id: 'insurance-cost-report', name: 'تقرير تكاليف التأمين', nameEn: 'Insurance Cost Report', desc: 'تقرير التكاليف التأمينية', color: '#283593' },
  { id: 'leave-policy-doc', name: 'سياسة الإجازات', nameEn: 'Leave Policy Document', desc: 'وثيقة سياسة الإجازات', color: '#2e7d32' },
  { id: 'leave-accrual-report', name: 'تقرير استحقاق الإجازات', nameEn: 'Leave Accrual Report', desc: 'تقرير رصيد الإجازات المستحقة', color: '#388e3c' },
  { id: 'leave-encashment', name: 'صرف رصيد إجازة', nameEn: 'Leave Encashment Form', desc: 'نموذج صرف رصيد الإجازات', color: '#43a047' },
  { id: 'sick-leave-cert', name: 'شهادة إجازة مرضية', nameEn: 'Sick Leave Certificate', desc: 'شهادة الإجازة المرضية', color: '#c62828' },
  { id: 'maternity-leave-form', name: 'نموذج إجازة أمومة', nameEn: 'Maternity Leave Form', desc: 'نموذج طلب إجازة الأمومة', color: '#ad1457' },
  { id: 'leave-calendar', name: 'تقويم الإجازات', nameEn: 'Leave Calendar Report', desc: 'تقويم إجازات القسم/المنظمة', color: '#6a1b9a' },
  { id: 'leave-carry-forward', name: 'ترحيل رصيد إجازات', nameEn: 'Leave Carry Forward Form', desc: 'نموذج ترحيل رصيد الإجازات', color: '#4527a0' },
  { id: 'absence-report', name: 'تقرير الغياب', nameEn: 'Absence Tracking Report', desc: 'تقرير تتبع الغياب والحضور', color: '#e65100' },
  { id: 'insurance-beneficiary-list', name: 'قائمة المستفيدين من التأمين', nameEn: 'Insurance Beneficiary List', desc: 'قائمة المؤمن عليهم', color: '#00695c' },
  { id: 'leave-summary-report', name: 'ملخص الإجازات', nameEn: 'Leave Summary Report', desc: 'ملخص شامل لإجازات الموظفين', color: '#37474f' },
];

export const InsuranceLeaveTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'insurance-policy-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="وثيقة بوليصة التأمين" subtitle="Insurance Policy Document" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="رقم البوليصة" value={d.policyNo} w="25%" /><Field label="شركة التأمين" value={d.insurer} w="35%" /><Field label="نوع التأمين" value={d.type} w="20%" /><Field label="الحالة" value={d.status} w="20%" /></div>
            <div style={fieldRow}><Field label="تاريخ البدء" value={formatDate(d.startDate)} w="25%" /><Field label="تاريخ الانتهاء" value={formatDate(d.endDate)} w="25%" /><Field label="القسط السنوي" value={d.premium} w="25%" /></div>
            <Section title="التغطيات">
              <EmptyTable cols={5} rows={8} headers={['التغطية', 'الحد الأقصى', 'نسبة التحمل', 'الاستثناءات', 'ملاحظات']} />
            </Section>
            <NotesBox label="شروط خاصة" value={d.specialTerms} lines={3} />
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'insurance-claim-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج مطالبة تأمينية" subtitle="Insurance Claim Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم الموظف" value={d.employeeName} w="35%" /><Field label="رقم البوليصة" value={d.policyNo} w="25%" /><Field label="نوع المطالبة" value={d.claimType} w="20%" /><Field label="المبلغ" value={d.amount} w="20%" /></div>
            <Section title="تفاصيل المطالبة">
              <EmptyTable cols={4} rows={5} headers={['البند', 'التاريخ', 'المبلغ', 'المستندات المرفقة']} />
            </Section>
            <NotesBox label="ملاحظات إضافية" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="الموظف" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'insurance-coverage':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير التغطية التأمينية" subtitle="Insurance Coverage Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="30%" /><Field label="عدد المؤمن عليهم" value={d.insuredCount} w="25%" /><Field label="إجمالي الأقساط" value={d.totalPremium} w="25%" /></div>
            <Section title="ملخص التغطيات">
              <EmptyTable cols={6} rows={8} headers={['نوع التأمين', 'عدد المستفيدين', 'القسط', 'المطالبات', 'النسبة', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول التأمين" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'insurance-renewal-notice':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إشعار تجديد بوليصة التأمين" subtitle="Insurance Renewal Notice" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="رقم البوليصة" value={d.policyNo} w="25%" /><Field label="شركة التأمين" value={d.insurer} w="35%" /><Field label="انتهاء الصلاحية" value={formatDate(d.expiryDate)} w="25%" /></div>
            <Section title="تفاصيل التجديد">
              <EmptyTable cols={4} rows={5} headers={['البند', 'الحالي', 'المقترح', 'الفرق']} />
            </Section>
            <NotesBox label="توصيات" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="مسؤول التأمين" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'insurance-comparison':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مقارنة عروض التأمين" subtitle="Insurance Quote Comparison" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="نوع التأمين" value={d.insuranceType} w="30%" /><Field label="عدد العروض" value={d.quoteCount} w="20%" /><Field label="تاريخ المقارنة" value={formatDate(d.compDate) || today()} w="25%" /></div>
            <Section title="مقارنة العروض">
              <EmptyTable cols={6} rows={6} headers={['الشركة', 'القسط', 'التغطية', 'التحمل', 'المميزات', 'التقييم']} />
            </Section>
            <NotesBox label="التوصية" value={d.recommendation} lines={3} />
            <SignatureBlock rightLabel="لجنة المشتريات" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'insurance-cost-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تكاليف التأمين" subtitle="Insurance Cost Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="السنة" value={d.year} w="20%" /><Field label="إجمالي التكلفة" value={d.totalCost} w="25%" /><Field label="عدد الموظفين" value={d.employeeCount} w="25%" /></div>
            <Section title="تفصيل التكاليف">
              <EmptyTable cols={5} rows={8} headers={['نوع التأمين', 'عدد المشتركين', 'القسط', 'المطالبات المدفوعة', 'معامل الخسارة']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول التأمين" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'leave-policy-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سياسة الإجازات" subtitle="Leave Policy Document" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الإصدار" value={d.version} w="20%" /><Field label="تاريخ الاعتماد" value={formatDate(d.approvedDate)} w="25%" /><Field label="القسم" value={d.department} w="30%" /></div>
            <Section title="أنواع الإجازات">
              <EmptyTable cols={5} rows={8} headers={['نوع الإجازة', 'المدة المسموحة', 'شروط الاستحقاق', 'مدفوعة/غير مدفوعة', 'ملاحظات']} />
            </Section>
            <NotesBox label="أحكام عامة" value={d.generalTerms} lines={3} />
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'leave-accrual-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير استحقاق الإجازات" subtitle="Leave Accrual Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="30%" /><Field label="القسم" value={d.department} w="30%" /><Field label="عدد الموظفين" value={d.employeeCount} w="20%" /></div>
            <Section title="رصيد الإجازات">
              <EmptyTable cols={6} rows={10} headers={['الموظف', 'الرصيد المستحق', 'المستخدم', 'المتبقي', 'المرحّل', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول الإجازات" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'leave-encashment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="صرف رصيد إجازة" subtitle="Leave Encashment Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم الموظف" value={d.employeeName} w="35%" /><Field label="الرقم الوظيفي" value={d.employeeId} w="20%" /><Field label="الأيام المطلوب صرفها" value={d.days} w="20%" /><Field label="قيمة اليوم" value={d.dayRate} w="25%" /></div>
            <div style={fieldRow}><Field label="الرصيد الحالي" value={d.currentBalance} w="25%" /><Field label="المبلغ الإجمالي" value={d.totalAmount} w="25%" /></div>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="الموظف" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'sick-leave-cert':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة إجازة مرضية" subtitle="Sick Leave Certificate" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم الموظف" value={d.employeeName} w="35%" /><Field label="من تاريخ" value={formatDate(d.fromDate)} w="20%" /><Field label="إلى تاريخ" value={formatDate(d.toDate)} w="20%" /><Field label="عدد الأيام" value={d.days} w="15%" /></div>
            <div style={fieldRow}><Field label="التشخيص" value={d.diagnosis} w="50%" /><Field label="المستشفى/الطبيب" value={d.doctor} w="50%" /></div>
            <NotesBox label="تعليمات الطبيب" value={d.doctorNotes} lines={3} />
            <SignatureBlock rightLabel="الطبيب المعالج" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'maternity-leave-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج إجازة الأمومة" subtitle="Maternity Leave Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم الموظفة" value={d.employeeName} w="35%" /><Field label="القسم" value={d.department} w="25%" /><Field label="تاريخ الولادة المتوقع" value={formatDate(d.expectedDate)} w="25%" /></div>
            <div style={fieldRow}><Field label="بداية الإجازة" value={formatDate(d.startDate)} w="25%" /><Field label="نهاية الإجازة" value={formatDate(d.endDate)} w="25%" /><Field label="المدة" value={d.duration} w="20%" /></div>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="الموظفة" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'leave-calendar':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقويم إجازات القسم" subtitle="Leave Calendar Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="القسم" value={d.department} w="30%" /><Field label="الشهر" value={d.month} w="20%" /><Field label="السنة" value={d.year} w="15%" /></div>
            <Section title="تقويم الإجازات">
              <EmptyTable cols={6} rows={10} headers={['الموظف', 'نوع الإجازة', 'من', 'إلى', 'الأيام', 'الحالة']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول الإجازات" leftLabel="مدير القسم" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'leave-carry-forward':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ترحيل رصيد الإجازات" subtitle="Leave Carry Forward Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم الموظف" value={d.employeeName} w="35%" /><Field label="السنة من" value={d.fromYear} w="15%" /><Field label="السنة إلى" value={d.toYear} w="15%" /><Field label="الرصيد المرحّل" value={d.carryDays} w="20%" /></div>
            <Section title="تفاصيل الترحيل">
              <EmptyTable cols={5} rows={5} headers={['نوع الإجازة', 'الرصيد الأصلي', 'المستخدم', 'المتبقي', 'المرحّل']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="الموظف" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'absence-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تتبع الغياب" subtitle="Absence Tracking Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="30%" /><Field label="القسم" value={d.department} w="30%" /><Field label="إجمالي حالات الغياب" value={d.totalAbsences} w="25%" /></div>
            <Section title="سجل الغياب">
              <EmptyTable cols={6} rows={10} headers={['الموظف', 'التاريخ', 'السبب', 'مبرر/غير مبرر', 'الإجراء', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول الحضور" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'insurance-beneficiary-list':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="قائمة المستفيدين من التأمين" subtitle="Insurance Beneficiary List" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="رقم البوليصة" value={d.policyNo} w="25%" /><Field label="شركة التأمين" value={d.insurer} w="35%" /><Field label="تاريخ التحديث" value={formatDate(d.updateDate) || today()} w="25%" /></div>
            <Section title="قائمة المؤمن عليهم">
              <EmptyTable cols={7} rows={12} headers={['الاسم', 'الرقم', 'العلاقة', 'فئة التأمين', 'تاريخ الإضافة', 'الحالة', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول التأمين" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'leave-summary-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص شامل للإجازات" subtitle="Leave Summary Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="السنة" value={d.year} w="20%" /><Field label="القسم" value={d.department} w="30%" /><Field label="إجمالي الموظفين" value={d.totalEmployees} w="25%" /></div>
            <Section title="ملخص حسب النوع">
              <EmptyTable cols={5} rows={6} headers={['نوع الإجازة', 'إجمالي الأيام', 'عدد الطلبات', 'متوسط المدة', 'النسبة']} />
            </Section>
            <Section title="ملخص حسب القسم">
              <EmptyTable cols={4} rows={6} headers={['القسم', 'إجمالي الأيام', 'عدد الموظفين', 'المتوسط']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول الإجازات" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );
    default:
      return <div style={pageWrapper}><OrgHeader title="قالب التأمين والإجازات" /><div style={bodyPad}><p>لا يوجد قالب مطابق</p></div><OrgFooter /></div>;
  }
};
