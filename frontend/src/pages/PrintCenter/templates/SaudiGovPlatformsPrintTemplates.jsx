/**
 * قوالب المنصات الحكومية السعودية الموسّعة
 * Saudi Government Platforms Extended Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine, ConfidentialBanner,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const SAUDI_GOV_TEMPLATES = [
  { id: 'mhrsd-case-report', name: 'تقرير حالة وزارة الموارد البشرية', nameEn: 'MHRSD Case Report', desc: 'تقرير حالة مستفيد لوزارة الموارد البشرية', color: '#0d47a1' },
  { id: 'mhrsd-quarterly-stats', name: 'إحصائيات ربعية MHRSD', nameEn: 'MHRSD Quarterly Statistics', desc: 'تقرير إحصائي ربعي لوزارة الموارد البشرية', color: '#1565c0' },
  { id: 'takatuf-report', name: 'تقرير منصة تكاتف', nameEn: 'Takatuf Platform Report', desc: 'تقرير أنشطة منصة تكاتف للتبرعات', color: '#1976d2' },
  { id: 'ehsan-campaign-report', name: 'تقرير حملة إحسان', nameEn: 'Ehsan Campaign Report', desc: 'تقرير حملة جمع تبرعات عبر منصة إحسان', color: '#1e88e5' },
  { id: 'nazaha-compliance', name: 'تقرير امتثال نزاهة', nameEn: 'Nazaha Compliance Report', desc: 'تقرير الامتثال لمتطلبات نزاهة', color: '#2196f3' },
  { id: 'musaned-worker-report', name: 'تقرير مساند للعمالة', nameEn: 'Musaned Worker Report', desc: 'تقرير عمالة من منصة مساند', color: '#42a5f5' },
  { id: 'absher-integration-log', name: 'سجل تكامل أبشر', nameEn: 'Absher Integration Log', desc: 'سجل عمليات التكامل مع منصة أبشر', color: '#0277bd' },
  { id: 'tawakkalna-health-log', name: 'سجل توكلنا الصحي', nameEn: 'Tawakkalna Health Log', desc: 'سجل البيانات الصحية من منصة توكلنا', color: '#00838f' },
  { id: 'etimad-financial-report', name: 'تقرير اعتماد المالي', nameEn: 'Etimad Financial Report', desc: 'تقرير مالي لمنصة اعتماد', color: '#00695c' },
  { id: 'noor-student-report', name: 'تقرير طالب نظام نور', nameEn: 'Noor Student Report', desc: 'تقرير بيانات الطالب من نظام نور', color: '#2e7d32' },
  { id: 'qiwa-labor-report', name: 'تقرير قوى العمالة', nameEn: 'Qiwa Labor Report', desc: 'تقرير عمالة من منصة قوى', color: '#558b2f' },
  { id: 'gov-api-sync-report', name: 'تقرير مزامنة API الحكومية', nameEn: 'Gov API Sync Report', desc: 'تقرير حالة مزامنة واجهات الحكومة', color: '#f57f17' },
  { id: 'masar-training-report', name: 'تقرير تدريب مسار', nameEn: 'Masar Training Report', desc: 'تقرير تدريب المنسوبين عبر منصة مسار', color: '#e65100' },
  { id: 'nafath-identity-log', name: 'سجل نفاذ للهوية', nameEn: 'Nafath Identity Log', desc: 'سجل التحقق من الهوية عبر نفاذ', color: '#bf360c' },
  { id: 'seha-referral-form', name: 'نموذج إحالة صحة الافتراضية', nameEn: 'Seha Virtual Referral', desc: 'نموذج إحالة لمنصة صحة الافتراضية', color: '#c62828' },
  { id: 'saudization-compliance', name: 'تقرير امتثال السعودة', nameEn: 'Saudization Compliance', desc: 'تقرير امتثال نسب التوطين (نطاقات)', color: '#ad1457' },
];

export const SaudiGovTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'mhrsd-case-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حالة مستفيد — وزارة الموارد البشرية" subtitle="MHRSD Beneficiary Case Report" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="اسم المستفيد" value={d.beneficiary} w="25%" /><Field label="رقم الهوية" value={d.idNumber} w="15%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <div style={fieldRow}><Field label="نوع الإعاقة" value={d.disabilityType} w="20%" /><Field label="درجة الإعاقة" value={d.disabilityDegree} w="15%" /><Field label="تصنيف الحالة" value={d.caseClass} w="15%" /></div>
            <Section title="الخدمات المقدمة">
              <EmptyTable cols={5} rows={6} headers={['الخدمة', 'المقدم', 'التاريخ', 'المدة', 'الحالة']} />
            </Section>
            <Section title="خطة التأهيل">
              <EmptyTable cols={4} rows={4} headers={['الهدف', 'الإجراء', 'الموعد', 'التقدم']} />
            </Section>
            <NotesBox label="ملاحظات للوزارة" value={d.notes} lines={3} />
            <SignatureBlock rightLabel="مدير الحالة" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'mhrsd-quarterly-stats':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="التقرير الإحصائي الربعي — وزارة الموارد البشرية" subtitle="MHRSD Quarterly Statistics Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الربع" value={d.quarter} w="15%" /><Field label="العام" value={d.year} w="10%" /><Field label="المعد" value={d.preparer} w="25%" /></div>
            <Section title="إحصائيات المستفيدين">
              <EmptyTable cols={5} rows={6} headers={['الفئة', 'الإجمالي', 'جديد', 'منتهي', 'نشط']} />
            </Section>
            <Section title="مؤشرات الأداء">
              <EmptyTable cols={4} rows={5} headers={['المؤشر', 'المستهدف', 'المتحقق', 'النسبة %']} />
            </Section>
            <NotesBox label="ملخص تنفيذي" value={d.summary} lines={3} />
            <SignatureBlock rightLabel="مدير البرامج" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'takatuf-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير أنشطة منصة تكاتف" subtitle="Takatuf Platform Activity Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="20%" /><Field label="المسؤول" value={d.manager} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="الحملات النشطة">
              <EmptyTable cols={5} rows={5} headers={['الحملة', 'المبلغ المستهدف', 'المجموع', 'المتبرعون', 'الحالة']} />
            </Section>
            <Section title="توزيع التبرعات">
              <EmptyTable cols={4} rows={4} headers={['المستفيد/المشروع', 'المبلغ', 'التاريخ', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مسؤول التبرعات" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'ehsan-campaign-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حملة إحسان" subtitle="Ehsan Campaign Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="اسم الحملة" value={d.campaignName} w="25%" /><Field label="رقم الحملة" value={d.campaignNo} w="15%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <div style={fieldRow}><Field label="المبلغ المستهدف" value={d.targetAmount} w="15%" /><Field label="المبلغ المحصّل" value={d.collectedAmount} w="15%" /><Field label="عدد المتبرعين" value={d.donorsCount} w="12%" /></div>
            <Section title="تفاصيل الصرف">
              <EmptyTable cols={4} rows={5} headers={['البند', 'المبلغ', 'المستفيد', 'التاريخ']} />
            </Section>
            <NotesBox label="أثر الحملة" value={d.impact} lines={2} />
            <SignatureBlock rightLabel="مدير الحملة" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'nazaha-compliance':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير امتثال نزاهة" subtitle="Nazaha Anti-Corruption Compliance Report" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="20%" /><Field label="مسؤول الامتثال" value={d.officer} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="قائمة الامتثال">
              <EmptyTable cols={4} rows={8} headers={['المتطلب', 'الحالة', 'الملاحظة', 'الإجراء']} />
            </Section>
            <NotesBox label="المخاطر المحددة" value={d.risks} lines={2} />
            <div style={fieldRow}><Field label="نسبة الامتثال" value={d.complianceRate} w="15%" /></div>
            <SignatureBlock rightLabel="مسؤول الامتثال" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'musaned-worker-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير عمالة مساند" subtitle="Musaned Domestic Worker Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="20%" /><Field label="المسؤول" value={d.manager} w="25%" /></div>
            <Section title="بيانات العمالة">
              <EmptyTable cols={6} rows={8} headers={['الاسم', 'الجنسية', 'المهنة', 'رقم التأشيرة', 'تاريخ الوصول', 'الحالة']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي العمالة" value={d.total} w="12%" /><Field label="نشط" value={d.active} w="10%" /><Field label="منتهي" value={d.expired} w="10%" /></div>
            <SignatureBlock rightLabel="مسؤول شؤون العمالة" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'absher-integration-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل تكامل منصة أبشر" subtitle="Absher Integration Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="20%" /><Field label="مسؤول التقنية" value={d.techManager} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="سجل العمليات">
              <EmptyTable cols={5} rows={10} headers={['التاريخ/الوقت', 'نوع العملية', 'المستخدم', 'الحالة', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي العمليات" value={d.totalOps} w="12%" /><Field label="ناجحة" value={d.success} w="10%" /><Field label="فاشلة" value={d.failed} w="10%" /></div>
            <SignatureBlock rightLabel="مسؤول التقنية" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'tawakkalna-health-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل البيانات الصحية — توكلنا" subtitle="Tawakkalna Health Data Log" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="20%" /><Field label="المسؤول" value={d.manager} w="25%" /></div>
            <Section title="سجل البيانات الصحية">
              <EmptyTable cols={5} rows={8} headers={['المستفيد', 'نوع البيان', 'التاريخ', 'المصدر', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات خصوصية البيانات" value={d.privacyNotes} lines={2} />
            <SignatureBlock rightLabel="مسؤول البيانات الصحية" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'etimad-financial-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير مالي — منصة اعتماد" subtitle="Etimad Financial Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="20%" /><Field label="المسؤول المالي" value={d.finManager} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="المنافسات والعقود">
              <EmptyTable cols={5} rows={6} headers={['رقم المنافسة', 'الوصف', 'المبلغ', 'المورد', 'الحالة']} />
            </Section>
            <Section title="أوامر الدفع">
              <EmptyTable cols={4} rows={5} headers={['رقم الأمر', 'المبلغ', 'المستفيد', 'التاريخ']} />
            </Section>
            <SignatureBlock rightLabel="المسؤول المالي" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'noor-student-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير بيانات الطالب — نظام نور" subtitle="Noor System Student Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="رقم الهوية" value={d.idNumber} w="15%" /><Field label="الصف" value={d.grade} w="10%" /><Field label="العام الدراسي" value={d.year} w="12%" /></div>
            <Section title="البيانات الأكاديمية">
              <EmptyTable cols={4} rows={8} headers={['المادة', 'الدرجة', 'التقدير', 'ملاحظات']} />
            </Section>
            <Section title="الحضور والغياب">
              <EmptyTable cols={4} rows={4} headers={['الشهر', 'أيام الحضور', 'أيام الغياب', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="المعلم المسؤول" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'qiwa-labor-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير منصة قوى — العمالة" subtitle="Qiwa Labor Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="20%" /><Field label="المسؤول" value={d.manager} w="25%" /></div>
            <Section title="بيانات العمالة">
              <EmptyTable cols={6} rows={8} headers={['الموظف', 'الجنسية', 'المهنة', 'نوع العقد', 'تاريخ الانتهاء', 'الحالة']} />
            </Section>
            <div style={fieldRow}><Field label="نسبة التوطين" value={d.saudizationRate} w="15%" /><Field label="نطاق المنشأة" value={d.nitaqatRange} w="15%" /></div>
            <SignatureBlock rightLabel="مسؤول الموارد البشرية" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'gov-api-sync-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير مزامنة واجهات الحكومة" subtitle="Government API Sync Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="20%" /><Field label="المسؤول" value={d.techLead} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="حالة الواجهات">
              <EmptyTable cols={6} rows={10} headers={['المنصة', 'نوع API', 'آخر مزامنة', 'الحالة', 'الأخطاء', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="واجهات نشطة" value={d.activeApis} w="12%" /><Field label="واجهات معطلة" value={d.downApis} w="12%" /></div>
            <SignatureBlock rightLabel="مسؤول التكامل" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'masar-training-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تدريب منصة مسار" subtitle="Masar Training Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="20%" /><Field label="مسؤول التدريب" value={d.manager} w="25%" /></div>
            <Section title="الدورات المنفذة">
              <EmptyTable cols={5} rows={6} headers={['الدورة', 'المدرب', 'عدد المنسوبين', 'الحالة', 'التقييم']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي ساعات التدريب" value={d.totalHours} w="15%" /><Field label="عدد المنسوبين المدربين" value={d.trainedCount} w="15%" /></div>
            <SignatureBlock rightLabel="مسؤول التدريب" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'nafath-identity-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل التحقق — نفاذ" subtitle="Nafath Identity Verification Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="20%" /><Field label="المسؤول" value={d.admin} w="25%" /></div>
            <Section title="سجل التحقق">
              <EmptyTable cols={5} rows={10} headers={['التاريخ', 'المستخدم', 'نوع العملية', 'النتيجة', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الطلبات" value={d.total} w="12%" /><Field label="ناجح" value={d.success} w="10%" /><Field label="مرفوض" value={d.rejected} w="10%" /></div>
            <SignatureBlock rightLabel="مسؤول الأمن" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'seha-referral-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج إحالة — صحة الافتراضية" subtitle="Seha Virtual Referral Form" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المريض" value={d.patient} w="25%" /><Field label="رقم الهوية" value={d.idNumber} w="15%" /><Field label="العمر" value={d.age} w="8%" /><Field label="الطبيب المحيل" value={d.referringDoctor} w="25%" /></div>
            <NotesBox label="سبب الإحالة" value={d.reason} lines={2} />
            <NotesBox label="التشخيص المبدئي" value={d.diagnosis} lines={2} />
            <NotesBox label="التاريخ المرضي" value={d.medicalHistory} lines={2} />
            <SignatureBlock rightLabel="الطبيب المحيل" leftLabel="المشرف الطبي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'saudization-compliance':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير امتثال التوطين (نطاقات)" subtitle="Saudization & Nitaqat Compliance Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="20%" /><Field label="المسؤول" value={d.manager} w="25%" /><Field label="نطاق المنشأة" value={d.nitaqatRange} w="15%" /></div>
            <Section title="توزيع القوى العاملة">
              <EmptyTable cols={4} rows={6} headers={['الفئة', 'سعوديون', 'غير سعوديين', 'النسبة %']} />
            </Section>
            <Section title="خطة التوطين">
              <EmptyTable cols={4} rows={4} headers={['الإجراء', 'العدد المستهدف', 'الموعد', 'الحالة']} />
            </Section>
            <div style={fieldRow}><Field label="نسبة التوطين الحالية" value={d.currentRate} w="15%" /><Field label="النسبة المستهدفة" value={d.targetRate} w="15%" /></div>
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
