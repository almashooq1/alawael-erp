/**
 * قوالب تفويض العلاج وقوائم الانتظار
 * Treatment Authorization & Waitlist Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const TREATMENT_WAITLIST_TEMPLATES = [
  { id: 'treatment-auth-form', name: 'نموذج تفويض علاجي', nameEn: 'Treatment Authorization Form', desc: 'نموذج إذن/تفويض لإجراء علاجي', color: '#c62828' },
  { id: 'treatment-plan-doc', name: 'خطة العلاج الشاملة', nameEn: 'Comprehensive Treatment Plan', desc: 'وثيقة خطة العلاج الشاملة', color: '#b71c1c' },
  { id: 'treatment-progress-note', name: 'ملاحظة تقدم العلاج', nameEn: 'Treatment Progress Note', desc: 'ملاحظة تقدم الخطة العلاجية', color: '#d32f2f' },
  { id: 'treatment-review-form', name: 'نموذج مراجعة العلاج', nameEn: 'Treatment Review Form', desc: 'نموذج مراجعة خطة العلاج', color: '#e53935' },
  { id: 'treatment-discharge-summary', name: 'ملخص خروج من العلاج', nameEn: 'Treatment Discharge Summary', desc: 'ملخص إنهاء البرنامج العلاجي', color: '#ef5350' },
  { id: 'pre-auth-request', name: 'طلب موافقة مسبقة', nameEn: 'Pre-Authorization Request', desc: 'طلب موافقة مسبقة لإجراء علاجي', color: '#1565c0' },
  { id: 'treatment-referral', name: 'تحويل علاجي', nameEn: 'Treatment Referral Form', desc: 'نموذج تحويل لجهة علاجية', color: '#1976d2' },
  { id: 'treatment-consent-form', name: 'نموذج موافقة على العلاج', nameEn: 'Treatment Consent Form', desc: 'نموذج موافقة المستفيد على العلاج', color: '#1e88e5' },
  { id: 'waitlist-registration', name: 'تسجيل قائمة الانتظار', nameEn: 'Waitlist Registration Form', desc: 'نموذج التسجيل في قائمة الانتظار', color: '#6a1b9a' },
  { id: 'waitlist-status-report', name: 'تقرير حالة الانتظار', nameEn: 'Waitlist Status Report', desc: 'تقرير حالة قوائم الانتظار', color: '#7b1fa2' },
  { id: 'waitlist-priority-doc', name: 'وثيقة الأولوية', nameEn: 'Waitlist Priority Document', desc: 'وثيقة معايير الأولوية', color: '#4527a0' },
  { id: 'waitlist-notification', name: 'إشعار قائمة الانتظار', nameEn: 'Waitlist Notification', desc: 'إشعار بتحديث حالة الانتظار', color: '#283593' },
  { id: 'admission-assessment', name: 'تقييم القبول', nameEn: 'Admission Assessment Form', desc: 'نموذج تقييم القبول الأولي', color: '#2e7d32' },
  { id: 'treatment-cost-estimate', name: 'تقدير تكلفة العلاج', nameEn: 'Treatment Cost Estimate', desc: 'تقدير التكلفة المتوقعة للعلاج', color: '#e65100' },
  { id: 'waitlist-analytics', name: 'تحليلات قوائم الانتظار', nameEn: 'Waitlist Analytics Report', desc: 'تقرير تحليلات قوائم الانتظار', color: '#00695c' },
  { id: 'treatment-outcome-eval', name: 'تقييم نتائج العلاج', nameEn: 'Treatment Outcome Evaluation', desc: 'تقييم نتائج البرنامج العلاجي', color: '#37474f' },
];

export const TreatmentWaitlistTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'treatment-auth-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تفويض علاجي" subtitle="Treatment Authorization Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم المستفيد" value={d.patientName} w="35%" /><Field label="رقم الملف" value={d.fileNo} w="20%" /><Field label="التاريخ" value={formatDate(d.authDate) || today()} w="20%" /><Field label="نوع الإجراء" value={d.procedureType} w="25%" /></div>
            <div style={fieldRow}><Field label="الطبيب المعالج" value={d.doctor} w="35%" /><Field label="القسم" value={d.department} w="25%" /><Field label="المدة المتوقعة" value={d.expectedDuration} w="20%" /></div>
            <Section title="تفاصيل الإجراء">
              <EmptyTable cols={4} rows={5} headers={['الإجراء', 'التبرير الطبي', 'التكلفة المتوقعة', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات إكلينيكية" value={d.clinicalNotes} lines={3} />
            <SignatureBlock rightLabel="الطبيب المعالج" leftLabel="المدير الطبي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'treatment-plan-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة العلاج الشاملة" subtitle="Comprehensive Treatment Plan" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم المستفيد" value={d.patientName} w="35%" /><Field label="رقم الملف" value={d.fileNo} w="20%" /><Field label="تاريخ البدء" value={formatDate(d.startDate)} w="20%" /><Field label="المدة" value={d.duration} w="15%" /></div>
            <Section title="أهداف العلاج">
              <EmptyTable cols={5} rows={6} headers={['الهدف', 'المؤشر', 'المدة', 'المسؤول', 'الحالة']} />
            </Section>
            <Section title="الجلسات المخططة">
              <EmptyTable cols={5} rows={6} headers={['نوع الجلسة', 'التكرار', 'المعالج', 'المدة', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="المعالج الرئيسي" leftLabel="المدير الطبي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'treatment-progress-note':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملاحظة تقدم العلاج" subtitle="Treatment Progress Note" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم المستفيد" value={d.patientName} w="30%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /><Field label="رقم الجلسة" value={d.sessionNo} w="15%" /><Field label="التاريخ" value={formatDate(d.sessionDate) || today()} w="20%" /></div>
            <Section title="تقدم الأهداف">
              <EmptyTable cols={5} rows={6} headers={['الهدف', 'الحالة السابقة', 'الحالة الحالية', 'التقدم', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات الجلسة" value={d.sessionNotes} lines={4} />
            <SignatureBlock rightLabel="المعالج" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'treatment-review-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مراجعة خطة العلاج" subtitle="Treatment Review Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="المستفيد" value={d.patientName} w="30%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /><Field label="تاريخ المراجعة" value={formatDate(d.reviewDate) || today()} w="20%" /><Field label="المراجع" value={d.reviewer} w="25%" /></div>
            <Section title="نتائج المراجعة">
              <EmptyTable cols={5} rows={6} headers={['الهدف', 'التقدم', 'التوصية', 'تعديل', 'ملاحظات']} />
            </Section>
            <NotesBox label="التوصيات النهائية" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="المراجع" leftLabel="المدير الطبي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'treatment-discharge-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص إنهاء البرنامج العلاجي" subtitle="Treatment Discharge Summary" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="المستفيد" value={d.patientName} w="30%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /><Field label="تاريخ القبول" value={formatDate(d.admitDate)} w="20%" /><Field label="تاريخ الخروج" value={formatDate(d.dischargeDate)} w="20%" /></div>
            <Section title="ملخص النتائج">
              <EmptyTable cols={4} rows={6} headers={['الهدف', 'الحالة عند القبول', 'الحالة عند الخروج', 'التقييم']} />
            </Section>
            <NotesBox label="توصيات ما بعد الخروج" value={d.postDischargeNotes} lines={3} />
            <SignatureBlock rightLabel="المعالج الرئيسي" leftLabel="المدير الطبي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'pre-auth-request':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="طلب موافقة مسبقة" subtitle="Pre-Authorization Request" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="المستفيد" value={d.patientName} w="30%" /><Field label="رقم التأمين" value={d.insuranceNo} w="20%" /><Field label="الإجراء المطلوب" value={d.procedure} w="30%" /></div>
            <div style={fieldRow}><Field label="التبرير الطبي" value={d.justification} w="50%" /><Field label="التكلفة المقدرة" value={d.estimatedCost} w="25%" /></div>
            <Section title="المستندات المرفقة">
              <EmptyTable cols={3} rows={4} headers={['المستند', 'النوع', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="الطبيب المعالج" leftLabel="مسؤول التأمين" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'treatment-referral':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تحويل علاجي" subtitle="Treatment Referral Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="المستفيد" value={d.patientName} w="30%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /><Field label="جهة التحويل" value={d.referTo} w="35%" /></div>
            <div style={fieldRow}><Field label="سبب التحويل" value={d.reason} w="50%" /><Field label="الأولوية" value={d.priority} w="20%" /></div>
            <NotesBox label="ملخص الحالة" value={d.caseSummary} lines={4} />
            <SignatureBlock rightLabel="الطبيب المحوّل" leftLabel="المدير الطبي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'treatment-consent-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج موافقة على العلاج" subtitle="Treatment Consent Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم المستفيد" value={d.patientName} w="30%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /><Field label="الإجراء" value={d.procedure} w="35%" /></div>
            <NotesBox label="وصف الإجراء والمخاطر" value={d.procedureDescription} lines={4} />
            <NotesBox label="البدائل المتاحة" value={d.alternatives} lines={2} />
            <NotesBox label="إقرار الموافقة" value="أقر أنا الموقع أدناه بأنني فهمت طبيعة الإجراء والمخاطر المرتبطة به وأوافق على المضي قدماً" lines={1} />
            <SignatureBlock rightLabel="المستفيد / الولي" leftLabel="الطبيب المعالج" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'waitlist-registration':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تسجيل في قائمة الانتظار" subtitle="Waitlist Registration Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم المتقدم" value={d.applicantName} w="35%" /><Field label="رقم الهوية" value={d.nationalId} w="20%" /><Field label="الخدمة المطلوبة" value={d.service} w="25%" /><Field label="الأولوية" value={d.priority} w="15%" /></div>
            <div style={fieldRow}><Field label="تاريخ التسجيل" value={formatDate(d.regDate) || today()} w="25%" /><Field label="المقدر للاستدعاء" value={d.estimatedDate} w="25%" /><Field label="جهة الاتصال" value={d.contactInfo} w="30%" /></div>
            <NotesBox label="ملاحظات خاصة" value={d.specialNotes} lines={3} />
            <SignatureBlock rightLabel="مسؤول القبول" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'waitlist-status-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حالة قوائم الانتظار" subtitle="Waitlist Status Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.reportDate) || today()} w="20%" /><Field label="إجمالي المنتظرين" value={d.totalWaiting} w="20%" /><Field label="متوسط الانتظار" value={d.avgWaitDays} w="20%" /><Field label="المعد" value={d.preparedBy} w="25%" /></div>
            <Section title="حالة الانتظار حسب الخدمة">
              <EmptyTable cols={6} rows={8} headers={['الخدمة', 'المنتظرون', 'أقدم طلب', 'متوسط الأيام', 'السعة', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول القبول" leftLabel="المدير الطبي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'waitlist-priority-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="وثيقة معايير الأولوية" subtitle="Waitlist Priority Document" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الإصدار" value={d.version} w="15%" /><Field label="تاريخ الاعتماد" value={formatDate(d.approvedDate)} w="25%" /><Field label="المعتمد" value={d.approvedBy} w="30%" /></div>
            <Section title="معايير الأولوية">
              <EmptyTable cols={5} rows={8} headers={['المعيار', 'الوزن', 'الوصف', 'الدرجات', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مسؤول القبول" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'waitlist-notification':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إشعار قائمة الانتظار" subtitle="Waitlist Notification" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم المتقدم" value={d.applicantName} w="35%" /><Field label="رقم الطلب" value={d.applicationNo} w="20%" /><Field label="الخدمة" value={d.service} w="25%" /></div>
            <div style={fieldRow}><Field label="نوع الإشعار" value={d.notificationType} w="25%" /><Field label="الحالة الجديدة" value={d.newStatus} w="25%" /><Field label="التاريخ المتوقع" value={d.expectedDate} w="25%" /></div>
            <NotesBox label="رسالة الإشعار" value={d.message} lines={4} />
            <SignatureBlock rightLabel="مسؤول القبول" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'admission-assessment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقييم القبول الأولي" subtitle="Admission Assessment Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم المتقدم" value={d.applicantName} w="30%" /><Field label="العمر" value={d.age} w="10%" /><Field label="التشخيص" value={d.diagnosis} w="30%" /><Field label="المقيّم" value={d.assessor} w="25%" /></div>
            <Section title="معايير التقييم">
              <EmptyTable cols={5} rows={8} headers={['المعيار', 'الدرجة', 'الملاحظة', 'يستوفي', 'ملاحظات']} />
            </Section>
            <NotesBox label="التوصية" value={d.recommendation} lines={3} />
            <SignatureBlock rightLabel="المقيّم" leftLabel="لجنة القبول" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'treatment-cost-estimate':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقدير تكلفة العلاج" subtitle="Treatment Cost Estimate" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="المستفيد" value={d.patientName} w="30%" /><Field label="البرنامج" value={d.program} w="30%" /><Field label="المدة" value={d.duration} w="20%" /></div>
            <Section title="تفصيل التكاليف">
              <EmptyTable cols={5} rows={8} headers={['البند', 'الوحدة', 'الكمية', 'سعر الوحدة', 'المجموع']} />
            </Section>
            <div style={fieldRow}><Field label="الإجمالي" value={d.total} w="25%" /><Field label="التغطية التأمينية" value={d.insuranceCoverage} w="25%" /><Field label="المبلغ على المستفيد" value={d.patientShare} w="25%" /></div>
            <SignatureBlock rightLabel="المحاسب" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'waitlist-analytics':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تحليلات قوائم الانتظار" subtitle="Waitlist Analytics Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="إجمالي الطلبات" value={d.totalRequests} w="20%" /><Field label="معالجة" value={d.processed} w="15%" /><Field label="معلقة" value={d.pending} w="15%" /></div>
            <Section title="تحليل حسب الخدمة">
              <EmptyTable cols={6} rows={8} headers={['الخدمة', 'الطلبات', 'تم القبول', 'متوسط الانتظار', 'أطول انتظار', 'الاتجاه']} />
            </Section>
            <NotesBox label="توصيات" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="محلل البيانات" leftLabel="المدير الطبي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'treatment-outcome-eval':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقييم نتائج البرنامج العلاجي" subtitle="Treatment Outcome Evaluation" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="المستفيد" value={d.patientName} w="30%" /><Field label="البرنامج" value={d.program} w="30%" /><Field label="المقيّم" value={d.evaluator} w="25%" /></div>
            <Section title="تقييم النتائج">
              <EmptyTable cols={5} rows={8} headers={['المجال', 'قبل العلاج', 'بعد العلاج', 'التحسن', 'التقييم']} />
            </Section>
            <NotesBox label="الخلاصة" value={d.conclusion} lines={3} />
            <SignatureBlock rightLabel="المقيّم" leftLabel="المدير الطبي" />
          </div>
          <OrgFooter />
        </div>
      );
    default:
      return <div style={pageWrapper}><OrgHeader title="قالب تفويض العلاج وقوائم الانتظار" /><div style={bodyPad}><p>لا يوجد قالب مطابق</p></div><OrgFooter /></div>;
  }
};
