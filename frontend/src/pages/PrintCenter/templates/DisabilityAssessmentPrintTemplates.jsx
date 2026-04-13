/**
 * قوالب الإعاقة والتقييم ومقاييس التصنيف
 * Disability, Assessment & Classification Scale Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine, ConfidentialBanner,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const DISABILITY_ASSESSMENT_TEMPLATES = [
  /* ── هيئة الإعاقة ── */
  { id: 'disability-card-request', name: 'طلب بطاقة إعاقة', nameEn: 'Disability Card Request', desc: 'نموذج طلب إصدار بطاقة إعاقة', color: '#4a148c' },
  { id: 'disability-authority-report', name: 'تقرير هيئة رعاية الإعاقة', nameEn: 'Disability Authority Report', desc: 'تقرير للهيئة العامة لرعاية ذوي الإعاقة', color: '#6a1b9a' },
  { id: 'disability-classification', name: 'تصنيف الإعاقة', nameEn: 'Disability Classification', desc: 'نموذج تصنيف نوع ودرجة الإعاقة', color: '#7b1fa2' },
  { id: 'disability-status-change', name: 'تغيير حالة الإعاقة', nameEn: 'Disability Status Change', desc: 'إشعار تغيير حالة/درجة الإعاقة', color: '#8e24aa' },
  { id: 'disability-renewal-form', name: 'نموذج تجديد بطاقة الإعاقة', nameEn: 'Disability Card Renewal', desc: 'نموذج تجديد بطاقة ذوي الإعاقة', color: '#9c27b0' },
  /* ── تفويض العلاج ── */
  { id: 'treatment-auth-request', name: 'طلب تفويض علاج', nameEn: 'Treatment Authorization Request', desc: 'طلب تفويض مسبق للعلاج', color: '#283593' },
  { id: 'treatment-auth-approval', name: 'موافقة تفويض العلاج', nameEn: 'Treatment Auth Approval', desc: 'خطاب موافقة على تفويض العلاج', color: '#303f9f' },
  { id: 'treatment-referral-letter', name: 'خطاب إحالة علاجية', nameEn: 'Treatment Referral Letter', desc: 'خطاب إحالة لجهة علاجية خارجية', color: '#3949ab' },
  /* ── مقاييس التقييم ── */
  { id: 'assessment-scale-form', name: 'نموذج مقياس تقييم', nameEn: 'Assessment Scale Form', desc: 'نموذج تطبيق مقياس تقييم معياري', color: '#00695c' },
  { id: 'scale-comparison-report', name: 'تقرير مقارنة المقاييس', nameEn: 'Scale Comparison Report', desc: 'مقارنة نتائج المقاييس عبر الزمن', color: '#00796b' },
  { id: 'batch-assessment-report', name: 'تقرير تقييمات جماعي', nameEn: 'Batch Assessment Report', desc: 'تقرير تقييمات جماعي لمجموعة مستفيدين', color: '#00897b' },
  { id: 'functional-assessment', name: 'التقييم الوظيفي', nameEn: 'Functional Assessment', desc: 'نموذج التقييم الوظيفي الشامل', color: '#009688' },
  { id: 'adaptive-behavior-scale', name: 'مقياس السلوك التكيفي', nameEn: 'Adaptive Behavior Scale', desc: 'نموذج مقياس السلوك التكيفي', color: '#26a69a' },
  /* ── الرعاية المتكاملة ── */
  { id: 'integrated-care-plan', name: 'خطة الرعاية المتكاملة', nameEn: 'Integrated Care Plan', desc: 'خطة رعاية شاملة متعددة التخصصات', color: '#bf360c' },
  { id: 'care-coordination-form', name: 'نموذج تنسيق الرعاية', nameEn: 'Care Coordination Form', desc: 'نموذج تنسيق بين مقدمي الرعاية', color: '#d84315' },
  { id: 'care-review-meeting', name: 'محضر مراجعة الرعاية', nameEn: 'Care Review Meeting Minutes', desc: 'محضر اجتماع مراجعة خطة الرعاية', color: '#e64a19' },
  { id: 'care-transition-summary', name: 'ملخص انتقال الرعاية', nameEn: 'Care Transition Summary', desc: 'ملخص انتقال رعاية بين مقدمي الخدمة', color: '#f4511e' },
  { id: 'care-team-roster', name: 'قائمة فريق الرعاية', nameEn: 'Care Team Roster', desc: 'قائمة أعضاء فريق الرعاية المتكاملة', color: '#ff5722' },
];

export const DisabilityAssessmentTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    /* ══════════════ هيئة الإعاقة ══════════════ */
    case 'disability-card-request':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="طلب إصدار بطاقة إعاقة" subtitle="Disability Card Request" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الاسم" value={d.name} w="30%" /><Field label="رقم الهوية" value={d.nationalId} w="20%" /><Field label="تاريخ الميلاد" value={formatDate(d.dob)} w="15%" /><Field label="الجنس" value={d.gender} w="10%" /></div>
            <div style={fieldRow}><Field label="نوع الإعاقة" value={d.disabilityType} w="25%" /><Field label="درجة الإعاقة" value={d.disabilityDegree} w="20%" /><Field label="تاريخ التشخيص" value={formatDate(d.diagnosisDate)} w="15%" /></div>
            <NotesBox label="الوصف الطبي" value={d.medicalDescription} lines={3} />
            <Section title="المرفقات المطلوبة">
              <EmptyTable cols={3} rows={5} headers={['المستند', 'متوفر', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات إضافية" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مقدم الطلب / ولي الأمر" leftLabel="الطبيب المعالج" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'disability-authority-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير للهيئة العامة لرعاية ذوي الإعاقة" subtitle="Disability Authority Report" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="رقم البطاقة" value={d.cardNo} w="20%" /><Field label="نوع الإعاقة" value={d.disabilityType} w="20%" /><Field label="درجة الإعاقة" value={d.degree} w="15%" /></div>
            <Section title="التقييمات المنجزة">
              <EmptyTable cols={4} rows={5} headers={['التقييم', 'التاريخ', 'النتيجة', 'المقيِّم']} />
            </Section>
            <Section title="الخدمات المقدمة">
              <EmptyTable cols={4} rows={5} headers={['الخدمة', 'المدة', 'التكرار', 'النتيجة']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="الطبيب المعالج" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'disability-classification':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تصنيف الإعاقة" subtitle="Disability Classification Form" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="رقم الهوية" value={d.nationalId} w="20%" /><Field label="العمر" value={d.age} w="10%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="التصنيف">
              <EmptyTable cols={4} rows={6} headers={['المجال', 'النوع', 'الدرجة', 'الكود (ICD/ICF)']} />
            </Section>
            <Section title="القدرات الوظيفية">
              <EmptyTable cols={4} rows={6} headers={['الوظيفة', 'المستوى', 'يحتاج دعم', 'ملاحظات']} />
            </Section>
            <NotesBox label="التشخيص النهائي" value={d.finalDiagnosis} lines={2} />
            <div style={fieldRow}><Field label="التصنيف العام" value={d.overallClassification} w="25%" /><Field label="درجة الإعاقة" value={d.overallDegree} w="25%" /></div>
            <SignatureBlock rightLabel="لجنة التصنيف" leftLabel="الطبيب المعتمد" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'disability-status-change':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إشعار تغيير حالة الإعاقة" subtitle="Disability Status Change Notification" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="رقم البطاقة" value={d.cardNo} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <div style={fieldRow}><Field label="الحالة السابقة" value={d.previousStatus} w="25%" /><Field label="الدرجة السابقة" value={d.previousDegree} w="20%" /></div>
            <div style={fieldRow}><Field label="الحالة الجديدة" value={d.newStatus} w="25%" /><Field label="الدرجة الجديدة" value={d.newDegree} w="20%" /></div>
            <NotesBox label="مبرر التغيير" value={d.justification} lines={3} />
            <NotesBox label="التقارير الداعمة" value={d.supportingReports} lines={2} />
            <SignatureBlock rightLabel="الطبيب المعالج" leftLabel="مدير التأهيل" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'disability-renewal-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تجديد بطاقة ذوي الإعاقة" subtitle="Disability Card Renewal Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="رقم البطاقة الحالية" value={d.currentCardNo} w="20%" /><Field label="تاريخ الانتهاء" value={formatDate(d.expiryDate)} w="15%" /></div>
            <div style={fieldRow}><Field label="نوع الإعاقة" value={d.disabilityType} w="25%" /><Field label="الدرجة" value={d.degree} w="15%" /><Field label="يوجد تغيير" value={d.hasChange} w="15%" /></div>
            <Section title="المرفقات">
              <EmptyTable cols={3} rows={4} headers={['المستند', 'متوفر', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مقدم الطلب" leftLabel="الموظف المختص" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ تفويض العلاج ══════════════ */
    case 'treatment-auth-request':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="طلب تفويض مسبق للعلاج" subtitle="Treatment Pre-Authorization Request" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /><Field label="التشخيص" value={d.diagnosis} w="30%" /></div>
            <Section title="العلاج المطلوب">
              <EmptyTable cols={5} rows={4} headers={['العلاج/الإجراء', 'الجهة', 'التكلفة المتوقعة', 'المدة', 'المبرر']} />
            </Section>
            <NotesBox label="المبرر الطبي" value={d.medicalJustification} lines={3} />
            <Section title="المرفقات">
              <EmptyTable cols={2} rows={4} headers={['المستند', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="الطبيب المعالج" leftLabel="مسؤول التفويضات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'treatment-auth-approval':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="موافقة تفويض العلاج" subtitle="Treatment Authorization Approval" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الطلب" value={d.requestNo} w="20%" /><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="تاريخ الطلب" value={formatDate(d.requestDate)} w="15%" /></div>
            <div style={fieldRow}><Field label="العلاج" value={d.treatment} w="30%" /><Field label="الجهة" value={d.provider} w="25%" /><Field label="التكلفة المعتمدة" value={d.approvedCost} w="20%" /></div>
            <div style={fieldRow}><Field label="حالة الموافقة" value={d.status} w="20%" /><Field label="صلاحية التفويض" value={d.validUntil} w="15%" /></div>
            <NotesBox label="شروط الموافقة" value={d.conditions} lines={2} />
            <SignatureBlock rightLabel="لجنة التفويضات" leftLabel="المدير الطبي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'treatment-referral-letter':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطاب إحالة علاجية" subtitle="Treatment Referral Letter" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="إلى" value={d.toFacility} w="30%" /><Field label="القسم" value={d.toDepartment} w="20%" /></div>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="العمر" value={d.age} w="10%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /></div>
            <NotesBox label="التشخيص الحالي" value={d.currentDiagnosis} lines={2} />
            <NotesBox label="سبب الإحالة" value={d.referralReason} lines={2} />
            <NotesBox label="التاريخ العلاجي الموجز" value={d.treatmentHistory} lines={3} />
            <NotesBox label="الأدوية الحالية" value={d.currentMedications} lines={2} />
            <NotesBox label="المطلوب من الجهة المحالة" value={d.requestedServices} lines={2} />
            <SignatureBlock rightLabel="الطبيب المحيل" leftLabel="مدير المركز" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ مقاييس التقييم ══════════════ */
    case 'assessment-scale-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تطبيق مقياس تقييم معياري" subtitle="Standardized Assessment Scale Application" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="المقياس" value={d.scaleName} w="25%" /><Field label="المقيِّم" value={d.evaluator} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="بنود المقياس">
              <EmptyTable cols={5} rows={15} headers={['#', 'البند', 'الدرجة (0-4)', 'الوزن', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="الدرجة الخام" value={d.rawScore} w="15%" /><Field label="الدرجة المعيارية" value={d.standardScore} w="15%" /><Field label="المئين" value={d.percentile} w="12%" /><Field label="التصنيف" value={d.classification} w="15%" /></div>
            <NotesBox label="التفسير" value={d.interpretation} lines={2} />
            <SignatureBlock rightLabel="المقيِّم" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'scale-comparison-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مقارنة نتائج المقاييس عبر الزمن" subtitle="Scale Comparison Over Time" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="المقياس" value={d.scaleName} w="25%" /><Field label="عدد التطبيقات" value={d.applicationCount} w="15%" /></div>
            <Section title="مقارنة النتائج">
              <EmptyTable cols={6} rows={8} headers={['التاريخ', 'الدرجة الخام', 'المعيارية', 'المئين', 'التصنيف', 'التغيير']} />
            </Section>
            <NotesBox label="التحليل" value={d.analysis} lines={2} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="الأخصائي" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'batch-assessment-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تقييمات جماعي" subtitle="Batch Assessment Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المقياس" value={d.scaleName} w="25%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="عدد المستفيدين" value={d.count} w="15%" /></div>
            <Section title="النتائج">
              <EmptyTable cols={6} rows={12} headers={['المستفيد', 'الدرجة', 'المئين', 'التصنيف', 'المقيِّم', 'التاريخ']} />
            </Section>
            <Section title="الإحصاءات">
              <EmptyTable cols={4} rows={4} headers={['المعيار', 'القيمة', 'التفسير', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول التقييم" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'functional-assessment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج التقييم الوظيفي الشامل" subtitle="Comprehensive Functional Assessment" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="العمر" value={d.age} w="10%" /><Field label="المقيِّم" value={d.evaluator} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="الوظائف الحركية">
              <EmptyTable cols={4} rows={6} headers={['الوظيفة', 'المستوى (1-5)', 'يحتاج مساعدة', 'ملاحظات']} />
            </Section>
            <Section title="الوظائف المعرفية">
              <EmptyTable cols={4} rows={6} headers={['الوظيفة', 'المستوى (1-5)', 'يحتاج مساعدة', 'ملاحظات']} />
            </Section>
            <Section title="الأنشطة اليومية">
              <EmptyTable cols={4} rows={6} headers={['النشاط', 'مستقل', 'جزئي', 'يعتمد كلياً']} />
            </Section>
            <NotesBox label="التقييم العام" value={d.overallAssessment} lines={2} />
            <SignatureBlock rightLabel="المقيِّم" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'adaptive-behavior-scale':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مقياس السلوك التكيفي" subtitle="Adaptive Behavior Scale" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="العمر الزمني" value={d.chronologicalAge} w="15%" /><Field label="المجيب" value={d.respondent} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="المجالات الرئيسية">
              <EmptyTable cols={5} rows={10} headers={['المجال', 'الدرجة', 'العمر المكافئ', 'المئين', 'التصنيف']} />
            </Section>
            <div style={fieldRow}><Field label="الدرجة المركبة" value={d.compositeScore} w="15%" /><Field label="التصنيف العام" value={d.overallClassification} w="20%" /></div>
            <NotesBox label="التفسير والتوصيات" value={d.interpretation} lines={3} />
            <SignatureBlock rightLabel="الأخصائي النفسي" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ الرعاية المتكاملة ══════════════ */
    case 'integrated-care-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة الرعاية المتكاملة" subtitle="Integrated Care Plan" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="التحديث" value={d.revision} w="10%" /></div>
            <Section title="أهداف الرعاية">
              <EmptyTable cols={5} rows={6} headers={['الهدف', 'التخصص', 'الإجراءات', 'المؤشر', 'الموعد']} />
            </Section>
            <Section title="فريق الرعاية والأدوار">
              <EmptyTable cols={4} rows={6} headers={['العضو', 'التخصص', 'الدور', 'التواصل']} />
            </Section>
            <Section title="جدول المراجعات">
              <EmptyTable cols={4} rows={4} headers={['التاريخ', 'النوع', 'المشاركون', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="منسق الرعاية" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'care-coordination-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تنسيق الرعاية" subtitle="Care Coordination Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="المنسق" value={d.coordinator} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="مقدمو الخدمة المعنيون">
              <EmptyTable cols={4} rows={5} headers={['الجهة/التخصص', 'مسؤول التواصل', 'الخدمة', 'الحالة']} />
            </Section>
            <Section title="بنود التنسيق">
              <EmptyTable cols={4} rows={5} headers={['البند', 'من', 'إلى', 'الموعد']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="المنسق" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'care-review-meeting':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="محضر اجتماع مراجعة خطة الرعاية" subtitle="Care Plan Review Meeting" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="المكان" value={d.location} w="20%" /></div>
            <Section title="الحاضرون">
              <EmptyTable cols={3} rows={5} headers={['الاسم', 'التخصص', 'القسم']} />
            </Section>
            <Section title="مراجعة الأهداف">
              <EmptyTable cols={5} rows={6} headers={['الهدف', 'الحالة', 'التقدم %', 'يستمر/يعدل/ينتهي', 'ملاحظات']} />
            </Section>
            <NotesBox label="القرارات" value={d.decisions} lines={2} />
            <NotesBox label="تاريخ الاجتماع القادم" value={d.nextReview} lines={1} />
            <SignatureBlock rightLabel="منسق الرعاية" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'care-transition-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص انتقال الرعاية" subtitle="Care Transition Summary" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="من جهة" value={d.fromProvider} w="25%" /><Field label="إلى جهة" value={d.toProvider} w="25%" /></div>
            <div style={fieldRow}><Field label="سبب الانتقال" value={d.reason} w="30%" /><Field label="تاريخ الانتقال" value={formatDate(d.transitionDate)} w="15%" /></div>
            <NotesBox label="ملخص الحالة" value={d.caseSummary} lines={3} />
            <Section title="الخدمات الحالية">
              <EmptyTable cols={3} rows={4} headers={['الخدمة', 'التكرار', 'ملاحظات']} />
            </Section>
            <NotesBox label="الأدوية والعلاجات" value={d.medications} lines={2} />
            <NotesBox label="توصيات للجهة المستقبلة" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="الجهة المحيلة" leftLabel="الجهة المستقبلة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'care-team-roster':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="قائمة أعضاء فريق الرعاية المتكاملة" subtitle="Integrated Care Team Roster" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="منسق الفريق" value={d.coordinator} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="أعضاء الفريق">
              <EmptyTable cols={6} rows={10} headers={['الاسم', 'التخصص', 'الدور في الفريق', 'القسم/الجهة', 'التواصل', 'فعال منذ']} />
            </Section>
            <Section title="جدول الاجتماعات">
              <EmptyTable cols={3} rows={4} headers={['التاريخ', 'النوع', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="المنسق" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
