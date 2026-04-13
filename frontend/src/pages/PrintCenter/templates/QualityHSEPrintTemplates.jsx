/**
 * قوالب طباعة الجودة والسلامة — Quality, HSE & Internal Audit Print Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine, ConfidentialBanner,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const QUALITY_HSE_TEMPLATES = [
  { id: 'ncr', name: 'تقرير عدم مطابقة', nameEn: 'Non-Conformance Report (NCR)', desc: 'تقرير رصد عدم مطابقة', color: '#c62828' },
  { id: 'car', name: 'تقرير إجراء تصحيحي', nameEn: 'Corrective Action Report (CAR)', desc: 'إجراء تصحيحي لمعالجة عدم المطابقة', color: '#d32f2f' },
  { id: 'inspection-checklist', name: 'قائمة فحص جودة', nameEn: 'Inspection Checklist', desc: 'قائمة فحص وتفتيش الجودة', color: '#e53935' },
  { id: 'quality-audit', name: 'تقرير تدقيق جودة', nameEn: 'Quality Audit Report', desc: 'تقرير تدقيق داخلي للجودة', color: '#f44336' },
  { id: 'cbahi-compliance', name: 'تقرير امتثال CBAHI', nameEn: 'CBAHI Compliance Report', desc: 'تقرير امتثال معايير سباهي', color: '#b71c1c' },
  { id: 'audit-findings', name: 'نتائج التدقيق الداخلي', nameEn: 'Audit Findings Report', desc: 'تقرير نتائج التدقيق الداخلي', color: '#4a148c' },
  { id: 'audit-plan', name: 'خطة تدقيق', nameEn: 'Audit Plan', desc: 'خطة التدقيق الداخلي', color: '#6a1b9a' },
  { id: 'incident-report', name: 'تقرير حادث', nameEn: 'Incident Report', desc: 'تقرير حادث صحة وسلامة', color: '#e65100' },
  { id: 'safety-inspection', name: 'نموذج تفتيش السلامة', nameEn: 'Safety Inspection Form', desc: 'نموذج تفتيش السلامة الدوري', color: '#ef6c00' },
  { id: 'risk-assessment-hse', name: 'تقييم مخاطر عمل', nameEn: 'Risk Assessment Form', desc: 'نموذج تقييم مخاطر الصحة والسلامة', color: '#f57c00' },
  { id: 'permit-to-work', name: 'تصريح عمل', nameEn: 'Permit to Work', desc: 'تصريح أعمال خطرة', color: '#ff8f00' },
  { id: 'toolbox-talk', name: 'سجل حديث السلامة', nameEn: 'Toolbox Talk Record', desc: 'سجل أحاديث السلامة اليومية', color: '#ff6f00' },
];

export const QualityHSETemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'ncr':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير عدم مطابقة" subtitle="Non-Conformance Report (NCR)" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="تفاصيل عدم المطابقة">
              <div style={fieldRow}><Field label="القسم" value={d.department} w="33%" /><Field label="المعيار" value={d.standard} w="33%" /><Field label="الشدة" value={d.severity} w="34%" /></div>
              <div style={fieldRow}><Field label="المكتشف بواسطة" value={d.discoveredBy} w="50%" /><Field label="تاريخ الاكتشاف" value={formatDate(d.discoveryDate) || today()} w="50%" /></div>
            </Section>
            <NotesBox label="وصف عدم المطابقة" value={d.description} lines={4} />
            <NotesBox label="السبب الجذري" value={d.rootCause} lines={3} />
            <Section title="الإجراء الفوري">
              <NotesBox value={d.immediateAction} lines={3} />
            </Section>
            <Section title="الإجراء التصحيحي">
              <div style={fieldRow}><Field label="الإجراء" value={d.correctiveAction} w="67%" /><Field label="تاريخ الإنجاز" value={formatDate(d.targetDate)} w="33%" /></div>
            </Section>
            <Section title="التحقق">
              <div style={fieldRow}><Field label="تم التحقق بواسطة" value={d.verifiedBy} w="50%" /><Field label="تاريخ التحقق" value={formatDate(d.verifyDate)} w="25%" /><Field label="النتيجة" value={d.result} w="25%" /></div>
            </Section>
            <SignatureBlock rightLabel="مدير الجودة" leftLabel="مدير القسم" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'car':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير إجراء تصحيحي" subtitle="Corrective Action Report (CAR)" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="مرجع عدم المطابقة">
              <div style={fieldRow}><Field label="رقم NCR" value={d.ncrNo} w="33%" /><Field label="القسم" value={d.department} w="33%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="34%" /></div>
            </Section>
            <NotesBox label="وصف المشكلة" value={d.problem} lines={3} />
            <NotesBox label="تحليل السبب الجذري (5 لماذا)" value={d.rootCause} lines={4} />
            <Section title="خطة الإجراء التصحيحي">
              <EmptyTable cols={5} rows={5} headers={['الإجراء', 'المسؤول', 'تاريخ البدء', 'تاريخ الانتهاء', 'الحالة']} />
            </Section>
            <Section title="التحقق من الفعالية">
              <div style={fieldRow}><Field label="طريقة التحقق" value={d.verifyMethod} w="50%" /><Field label="تاريخ المراجعة" value={formatDate(d.reviewDate)} w="25%" /><Field label="فعّال?" value={d.effective} w="25%" /></div>
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} />
            <SignatureBlock rightLabel="مدير الجودة" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'inspection-checklist':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="قائمة فحص الجودة" subtitle="Quality Inspection Checklist" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المنطقة / القسم" value={d.area} w="33%" /><Field label="المفتش" value={d.inspector} w="33%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="34%" /></div>
            <Section title="بنود الفحص">
              <EmptyTable cols={5} rows={15} headers={['م', 'بند الفحص', 'مطابق ✓', 'غير مطابق ✗', 'ملاحظات']} />
            </Section>
            <Section title="ملخص">
              <div style={fieldRow}><Field label="إجمالي البنود" value={d.totalItems} w="25%" /><Field label="مطابق" value={d.passed} w="25%" /><Field label="غير مطابق" value={d.failed} w="25%" /><Field label="نسبة المطابقة" value={d.complianceRate} w="25%" /></div>
            </Section>
            <NotesBox label="ملاحظات وتوصيات" value={d.notes} />
            <SignatureBlock rightLabel="المفتش" leftLabel="مدير الجودة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'quality-audit':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تدقيق جودة" subtitle="Quality Audit Report" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات التدقيق">
              <div style={fieldRow}><Field label="نوع التدقيق" value={d.auditType} w="33%" /><Field label="المعيار" value={d.standard} w="33%" /><Field label="النطاق" value={d.scope} w="34%" /></div>
              <div style={fieldRow}><Field label="فريق التدقيق" value={d.team} w="50%" /><Field label="تاريخ التدقيق" value={formatDate(d.auditDate)} w="25%" /><Field label="القسم" value={d.department} w="25%" /></div>
            </Section>
            <Section title="النتائج">
              <EmptyTable cols={5} rows={8} headers={['البند / المعيار', 'الدرجة', 'الحالة', 'الملاحظة', 'التوصية']} />
            </Section>
            <Section title="ملخص">
              <div style={fieldRow}><Field label="نقاط القوة" value={d.strengths} w="50%" /><Field label="فرص التحسين" value={d.improvements} w="50%" /></div>
            </Section>
            <NotesBox label="الخلاصة" value={d.conclusion} />
            <SignatureBlock rightLabel="رئيس فريق التدقيق" leftLabel="مدير الجودة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'cbahi-compliance':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير امتثال معايير سباهي" subtitle="CBAHI Compliance Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="50%" /><Field label="معد التقرير" value={d.preparedBy} w="50%" /></div>
            <Section title="امتثال المعايير">
              <EmptyTable cols={6} rows={12} headers={['رقم المعيار', 'وصف المعيار', 'الفئة', 'مطابق', 'جزئي', 'غير مطابق']} />
            </Section>
            <Section title="ملخص الامتثال">
              <div style={fieldRow}><Field label="إجمالي المعايير" value={d.total} w="20%" /><Field label="مطابق" value={d.compliant} w="20%" /><Field label="جزئي" value={d.partial} w="20%" /><Field label="غير مطابق" value={d.nonCompliant} w="20%" /><Field label="النسبة" value={d.rate} w="20%" /></div>
            </Section>
            <NotesBox label="خطة التحسين" value={d.improvementPlan} />
            <SignatureBlock rightLabel="مسؤول الجودة" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'audit-findings':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير نتائج التدقيق الداخلي" subtitle="Internal Audit Findings Report" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم المدقق" value={d.department} w="33%" /><Field label="المدقق" value={d.auditor} w="33%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="34%" /></div>
            <Section title="النتائج">
              <EmptyTable cols={6} rows={8} headers={['م', 'الملاحظة', 'الشدة', 'البند المرجعي', 'الإجراء المطلوب', 'الموعد']} />
            </Section>
            <NotesBox label="ملخص" value={d.summary} />
            <SignatureBlock rightLabel="المدقق الداخلي" leftLabel="مدير القسم" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'audit-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة التدقيق الداخلي" subtitle="Internal Audit Plan" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="العام" value={d.year} w="25%" /><Field label="الفترة" value={d.period} w="25%" /><Field label="المعيار" value={d.standard} w="25%" /><Field label="المعتمد" value={d.approvedBy} w="25%" /></div>
            <Section title="جدول التدقيق">
              <EmptyTable cols={6} rows={10} headers={['القسم / العملية', 'النطاق', 'المدقق', 'التاريخ', 'المدة', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} />
            <SignatureBlock rightLabel="رئيس التدقيق الداخلي" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'incident-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حادث HSE" subtitle="HSE Incident Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="تفاصيل الحادث">
              <div style={fieldRow}><Field label="نوع الحادث" value={d.incidentType} w="33%" /><Field label="الشدة" value={d.severity} w="33%" /><Field label="التاريخ والوقت" value={d.dateTime} w="34%" /></div>
              <div style={fieldRow}><Field label="الموقع" value={d.location} w="50%" /><Field label="المتضرر" value={d.affected} w="50%" /></div>
            </Section>
            <NotesBox label="وصف الحادث" value={d.description} lines={4} />
            <NotesBox label="الإجراء الفوري المتخذ" value={d.immediateAction} lines={3} />
            <Section title="التحقيق">
              <NotesBox label="السبب الجذري" value={d.rootCause} />
              <NotesBox label="الإجراء التصحيحي" value={d.correctiveAction} />
            </Section>
            <Section title="الشهود">
              <EmptyTable cols={4} rows={3} headers={['الاسم', 'القسم', 'التوقيع', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول السلامة" leftLabel="مدير العمليات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'safety-inspection':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تفتيش السلامة" subtitle="Safety Inspection Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المنطقة" value={d.area} w="33%" /><Field label="المفتش" value={d.inspector} w="33%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="34%" /></div>
            <Section title="بنود التفتيش">
              <EmptyTable cols={5} rows={15} headers={['بند التفتيش', 'آمن ✓', 'غير آمن ✗', 'الخطورة', 'إجراء مطلوب']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} />
            <SignatureBlock rightLabel="مفتش السلامة" leftLabel="مسؤول المنطقة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'risk-assessment-hse':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقييم مخاطر الصحة والسلامة" subtitle="HSE Risk Assessment" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="النشاط / العملية" value={d.activity} w="50%" /><Field label="الموقع" value={d.location} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="25%" /></div>
            <Section title="تقييم المخاطر">
              <EmptyTable cols={7} rows={8} headers={['الخطر', 'المتضرر', 'الاحتمالية (1-5)', 'الأثر (1-5)', 'المخاطرة', 'التحكم الحالي', 'التحكم المطلوب']} />
            </Section>
            <NotesBox label="ملخص وتوصيات" value={d.summary} />
            <SignatureBlock rightLabel="مقيّم المخاطر" leftLabel="مسؤول السلامة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'permit-to-work':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تصريح أعمال خطرة" subtitle="Permit to Work" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="تفاصيل العمل">
              <div style={fieldRow}><Field label="نوع العمل" value={d.workType} w="33%" /><Field label="الموقع" value={d.location} w="33%" /><Field label="المقاول" value={d.contractor} w="34%" /></div>
              <div style={fieldRow}><Field label="تاريخ البدء" value={formatDate(d.startDate)} w="25%" /><Field label="تاريخ الانتهاء" value={formatDate(d.endDate)} w="25%" /><Field label="من الساعة" value={d.startTime} w="25%" /><Field label="إلى الساعة" value={d.endTime} w="25%" /></div>
            </Section>
            <Section title="إجراءات السلامة المطلوبة">
              <EmptyTable cols={3} rows={8} headers={['الإجراء', 'تم ✓', 'ملاحظات']} />
            </Section>
            <Section title="معدات الوقاية الشخصية">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, padding: 8 }}>
                {['خوذة', 'نظارة', 'قفازات', 'حذاء سلامة', 'سترة', 'حزام أمان', 'كمامة', 'واقي أذن'].map((item, i) => (
                  <span key={i} style={{ border: '1px solid #ddd', padding: '4px 12px', borderRadius: 4, fontSize: 12 }}>☐ {item}</span>
                ))}
              </div>
            </Section>
            <SignatureBlock rightLabel="مسؤول السلامة" leftLabel="مدير العمليات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'toolbox-talk':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل حديث السلامة اليومي" subtitle="Toolbox Talk Record" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الموضوع" value={d.topic} w="50%" /><Field label="المتحدث" value={d.presenter} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="25%" /></div>
            <NotesBox label="المحتوى" value={d.content} lines={5} />
            <Section title="الحاضرون">
              <EmptyTable cols={4} rows={10} headers={['م', 'الاسم', 'القسم', 'التوقيع']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول السلامة" leftLabel="مشرف الموقع" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
