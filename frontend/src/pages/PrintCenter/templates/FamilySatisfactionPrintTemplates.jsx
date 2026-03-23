/**
 * قوالب رضا الأسر والنتائج التأهيلية والمتابعة
 * Family Satisfaction, Rehab Outcomes & Follow-Up Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine, ConfidentialBanner,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const FAMILY_SATISFACTION_TEMPLATES = [
  /* ── رضا الأسر ── */
  { id: 'family-satisfaction-survey', name: 'استبيان رضا الأسرة', nameEn: 'Family Satisfaction Survey', desc: 'استبيان قياس رضا الأسرة عن الخدمات', color: '#e91e63' },
  { id: 'family-survey-results', name: 'نتائج استبيان رضا الأسر', nameEn: 'Survey Results Report', desc: 'تقرير نتائج استبيان رضا الأسر', color: '#f06292' },
  { id: 'family-feedback-summary', name: 'ملخص ملاحظات الأسر', nameEn: 'Family Feedback Summary', desc: 'ملخص ملاحظات وآراء الأسر', color: '#ec407a' },
  { id: 'family-improvement-plan', name: 'خطة تحسين من ملاحظات الأسر', nameEn: 'Family Feedback Improvement Plan', desc: 'خطة التحسين بناءً على ملاحظات الأسر', color: '#c2185b' },
  { id: 'family-meeting-summary', name: 'ملخص اجتماع الأسرة', nameEn: 'Family Meeting Summary', desc: 'ملخص اجتماع مع أسرة المستفيد', color: '#ad1457' },
  /* ── نتائج التأهيل ── */
  { id: 'rehab-outcome-report', name: 'تقرير نتائج التأهيل', nameEn: 'Rehabilitation Outcome Report', desc: 'تقرير مخرجات البرنامج التأهيلي', color: '#00695c' },
  { id: 'program-effectiveness', name: 'تقرير فعالية البرنامج', nameEn: 'Program Effectiveness Report', desc: 'تقرير قياس فعالية برنامج تأهيلي', color: '#00796b' },
  { id: 'outcome-comparison', name: 'مقارنة النتائج', nameEn: 'Outcome Comparison Report', desc: 'مقارنة نتائج قبل وبعد التأهيل', color: '#00897b' },
  { id: 'rehab-kpi-report', name: 'مؤشرات أداء التأهيل', nameEn: 'Rehab KPI Report', desc: 'مؤشرات أداء برامج التأهيل', color: '#009688' },
  { id: 'annual-outcome-summary', name: 'ملخص النتائج السنوي', nameEn: 'Annual Outcome Summary', desc: 'ملخص مخرجات التأهيل السنوية', color: '#26a69a' },
  /* ── المتابعة والانتقال ── */
  { id: 'followup-visit-form', name: 'نموذج زيارة متابعة', nameEn: 'Follow-Up Visit Form', desc: 'نموذج زيارة متابعة بعد التخرج', color: '#1565c0' },
  { id: 'reintegration-report', name: 'تقرير إعادة الدمج', nameEn: 'Reintegration Report', desc: 'تقرير إعادة دمج المستفيد في المجتمع', color: '#1976d2' },
  { id: 'transition-plan-form', name: 'خطة الانتقال', nameEn: 'Transition Plan', desc: 'خطة الانتقال بين المراحل/البرامج', color: '#1e88e5' },
  { id: 'aftercare-checklist', name: 'قائمة مراجعة ما بعد الخروج', nameEn: 'Aftercare Checklist', desc: 'قائمة مراجعة خدمات ما بعد الخروج', color: '#2196f3' },
  { id: 'community-reintegration-plan', name: 'خطة الدمج المجتمعي', nameEn: 'Community Reintegration Plan', desc: 'خطة الدمج في المجتمع المحلي', color: '#42a5f5' },
  { id: 'followup-outcome-report', name: 'تقرير نتائج المتابعة', nameEn: 'Follow-Up Outcome Report', desc: 'تقرير نتائج المتابعة بعد الخروج', color: '#0d47a1' },
];

export const FamilySatisfactionTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    /* ══════════════ رضا الأسر ══════════════ */
    case 'family-satisfaction-survey':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="استبيان رضا الأسرة عن الخدمات" subtitle="Family Satisfaction Survey" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="30%" /><Field label="ولي الأمر" value={d.guardian} w="25%" /><Field label="البرنامج" value={d.program} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="تقييم الخدمات">
              <EmptyTable cols={5} rows={10} headers={['الخدمة', 'ممتاز (5)', 'جيد (4)', 'مقبول (3)', 'ضعيف (1-2)']} />
            </Section>
            <Section title="الأسئلة المفتوحة">
              <NotesBox label="ما أكثر شيء أعجبكم في خدمات المركز؟" value={d.likes} lines={2} />
              <NotesBox label="ما الذي تودون تحسينه؟" value={d.improvements} lines={2} />
              <NotesBox label="هل توصون بالمركز للآخرين؟ لماذا؟" value={d.recommend} lines={2} />
            </Section>
            <div style={fieldRow}><Field label="التقييم العام" value={d.overallRating} w="20%" /></div>
            <SignatureBlock rightLabel="ولي الأمر (اختياري)" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'family-survey-results':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير نتائج استبيان رضا الأسر" subtitle="Family Satisfaction Survey Results" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="عدد المشاركين" value={d.participants} w="15%" /><Field label="نسبة الاستجابة" value={d.responseRate} w="15%" /><Field label="المعدل العام" value={d.overallScore} w="15%" /></div>
            <Section title="النتائج حسب المحور">
              <EmptyTable cols={5} rows={8} headers={['المحور', 'المعدل', 'أعلى تقييم', 'أدنى تقييم', 'التغيير عن الفترة السابقة']} />
            </Section>
            <Section title="أبرز نقاط القوة">
              <EmptyTable cols={3} rows={4} headers={['#', 'نقطة القوة', 'التكرار']} />
            </Section>
            <Section title="أبرز نقاط التحسين">
              <EmptyTable cols={3} rows={4} headers={['#', 'نقطة التحسين', 'التكرار']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مسؤول الجودة" leftLabel="مدير البرنامج" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'family-feedback-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص ملاحظات وآراء الأسر" subtitle="Family Feedback Summary" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="إجمالي الملاحظات" value={d.totalFeedback} w="15%" /><Field label="إيجابية" value={d.positive} w="12%" /><Field label="سلبية" value={d.negative} w="12%" /><Field label="مقترحات" value={d.suggestions} w="12%" /></div>
            <Section title="الملاحظات الشائعة">
              <EmptyTable cols={4} rows={8} headers={['الموضوع', 'النوع', 'التكرار', 'الإجراء المتخذ']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مسؤول العلاقات" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'family-improvement-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة التحسين بناءً على ملاحظات الأسر" subtitle="Family Feedback Improvement Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة المرجعية" value={d.referencePeriod} w="25%" /><Field label="المعد" value={d.preparedBy} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="مجالات التحسين">
              <EmptyTable cols={6} rows={8} headers={['المجال', 'الملاحظة', 'الإجراء', 'المسؤول', 'الموعد', 'المؤشر']} />
            </Section>
            <Section title="جدول المتابعة">
              <EmptyTable cols={4} rows={4} headers={['التاريخ', 'البند', 'الحالة', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول الجودة" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'family-meeting-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص اجتماع مع أسرة المستفيد" subtitle="Family Meeting Summary" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="ولي الأمر" value={d.guardian} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="المكان" value={d.location} w="15%" /></div>
            <Section title="الحاضرون من المركز">
              <EmptyTable cols={3} rows={4} headers={['الاسم', 'المسمى', 'القسم']} />
            </Section>
            <NotesBox label="المواضيع المناقشة" value={d.topics} lines={3} />
            <NotesBox label="ملاحظات الأسرة" value={d.familyFeedback} lines={2} />
            <Section title="القرارات والتوصيات">
              <EmptyTable cols={3} rows={4} headers={['القرار', 'المسؤول', 'الموعد']} />
            </Section>
            <SignatureBlock rightLabel="ولي الأمر" leftLabel="أخصائي الحالة" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ نتائج التأهيل ══════════════ */
    case 'rehab-outcome-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير مخرجات البرنامج التأهيلي" subtitle="Rehabilitation Outcome Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="البرنامج" value={d.program} w="30%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="عدد المستفيدين" value={d.beneficiaryCount} w="15%" /></div>
            <Section title="مؤشرات النتائج">
              <EmptyTable cols={5} rows={6} headers={['المؤشر', 'المستهدف', 'المتحقق', 'النسبة %', 'التقييم']} />
            </Section>
            <Section title="توزيع النتائج">
              <EmptyTable cols={4} rows={5} headers={['مستوى التحسن', 'العدد', 'النسبة %', 'ملاحظات']} />
            </Section>
            <NotesBox label="التحليل" value={d.analysis} lines={2} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مدير البرنامج" leftLabel="مدير الجودة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'program-effectiveness':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير قياس فعالية البرنامج" subtitle="Program Effectiveness Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="البرنامج" value={d.program} w="30%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="المقيِّم" value={d.evaluator} w="25%" /></div>
            <Section title="معايير الفعالية">
              <EmptyTable cols={5} rows={8} headers={['المعيار', 'الوزن %', 'الدرجة', 'المعدل الموزون', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="الدرجة الإجمالية" value={d.totalScore} w="20%" /><Field label="التصنيف" value={d.classification} w="20%" /></div>
            <NotesBox label="نقاط القوة" value={d.strengths} lines={2} />
            <NotesBox label="فرص التحسين" value={d.opportunities} lines={2} />
            <SignatureBlock rightLabel="المقيِّم" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'outcome-comparison':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مقارنة نتائج قبل وبعد التأهيل" subtitle="Pre-Post Rehabilitation Comparison" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="البرنامج" value={d.program} w="25%" /><Field label="مدة التأهيل" value={d.duration} w="15%" /></div>
            <Section title="المقارنة">
              <EmptyTable cols={5} rows={8} headers={['المجال', 'قبل التأهيل', 'بعد التأهيل', 'الفرق', 'التحسن %']} />
            </Section>
            <Section title="المقاييس المستخدمة">
              <EmptyTable cols={4} rows={3} headers={['المقياس', 'الدرجة القبلية', 'الدرجة البعدية', 'الفرق']} />
            </Section>
            <NotesBox label="التحليل" value={d.analysis} lines={2} />
            <SignatureBlock rightLabel="الأخصائي" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'rehab-kpi-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مؤشرات أداء برامج التأهيل" subtitle="Rehabilitation KPI Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="المعد" value={d.preparedBy} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="مؤشرات الأداء الرئيسية">
              <EmptyTable cols={6} rows={10} headers={['المؤشر', 'البرنامج', 'المستهدف', 'الفعلي', 'النسبة %', 'الاتجاه']} />
            </Section>
            <NotesBox label="تحليل المؤشرات" value={d.analysis} lines={2} />
            <NotesBox label="الإجراءات التصحيحية" value={d.correctiveActions} lines={2} />
            <SignatureBlock rightLabel="مراقب الجودة" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'annual-outcome-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص مخرجات التأهيل السنوية" subtitle="Annual Rehabilitation Outcome Summary" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="السنة" value={d.year} w="15%" /><Field label="إجمالي المستفيدين" value={d.totalBeneficiaries} w="15%" /><Field label="المتخرجون" value={d.graduated} w="15%" /><Field label="معدل النجاح" value={d.successRate} w="15%" /></div>
            <Section title="ملخص حسب البرنامج">
              <EmptyTable cols={6} rows={8} headers={['البرنامج', 'المسجلون', 'المتخرجون', 'المنقطعون', 'معدل الرضا', 'التقييم']} />
            </Section>
            <Section title="التوازيع">
              <EmptyTable cols={4} rows={4} headers={['الفئة', 'العدد', 'النسبة', 'ملاحظات']} />
            </Section>
            <NotesBox label="أبرز الإنجازات" value={d.achievements} lines={2} />
            <NotesBox label="التحديات والتوصيات" value={d.challenges} lines={2} />
            <SignatureBlock rightLabel="مدير التأهيل" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ المتابعة والانتقال ══════════════ */
    case 'followup-visit-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج زيارة متابعة بعد التخرج" subtitle="Post-Graduation Follow-Up Visit" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="تاريخ التخرج" value={formatDate(d.gradDate)} w="15%" /><Field label="تاريخ الزيارة" value={formatDate(d.visitDate) || today()} w="15%" /><Field label="الزائر" value={d.visitor} w="20%" /></div>
            <Section title="تقييم الوضع الحالي">
              <EmptyTable cols={4} rows={6} headers={['المجال', 'الحالة', 'التقييم', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات الأسرة" value={d.familyNotes} lines={2} />
            <NotesBox label="الاحتياجات الحالية" value={d.currentNeeds} lines={2} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="الأخصائي الزائر" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'reintegration-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير إعادة الدمج المجتمعي" subtitle="Community Reintegration Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="البرنامج" value={d.program} w="20%" /><Field label="تاريخ الخروج" value={formatDate(d.exitDate)} w="15%" /><Field label="فترة المتابعة" value={d.followupPeriod} w="20%" /></div>
            <Section title="مؤشرات الدمج">
              <EmptyTable cols={4} rows={6} headers={['المؤشر', 'الحالة', 'التقييم', 'ملاحظات']} />
            </Section>
            <NotesBox label="المشاركة المجتمعية" value={d.communityParticipation} lines={2} />
            <NotesBox label="التحديات" value={d.challenges} lines={2} />
            <NotesBox label="الدعم المطلوب" value={d.supportNeeded} lines={2} />
            <SignatureBlock rightLabel="أخصائي الدمج" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'transition-plan-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة الانتقال بين المراحل" subtitle="Transition Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="من برنامج" value={d.fromProgram} w="20%" /><Field label="إلى برنامج" value={d.toProgram} w="20%" /><Field label="تاريخ الانتقال" value={formatDate(d.transitionDate)} w="15%" /></div>
            <NotesBox label="مبرر الانتقال" value={d.justification} lines={2} />
            <Section title="المهارات المكتسبة">
              <EmptyTable cols={3} rows={5} headers={['المهارة', 'المستوى', 'ملاحظات']} />
            </Section>
            <Section title="أهداف المرحلة الجديدة">
              <EmptyTable cols={4} rows={5} headers={['الهدف', 'المعيار', 'الموعد', 'المسؤول']} />
            </Section>
            <NotesBox label="الدعم المطلوب خلال الانتقال" value={d.supportNeeded} lines={2} />
            <SignatureBlock rightLabel="أخصائي الحالة" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'aftercare-checklist':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="قائمة مراجعة ما بعد الخروج" subtitle="Aftercare Checklist" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="تاريخ الخروج" value={formatDate(d.exitDate)} w="15%" /><Field label="الأخصائي" value={d.specialist} w="25%" /></div>
            <Section title="الإجراءات">
              <EmptyTable cols={4} rows={12} headers={['البند', 'مكتمل', 'ملاحظات', 'التاريخ']} />
            </Section>
            <NotesBox label="خدمات المتابعة المحالة" value={d.referralServices} lines={2} />
            <NotesBox label="تعليمات للأسرة" value={d.familyInstructions} lines={2} />
            <SignatureBlock rightLabel="أخصائي الحالة" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'community-reintegration-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة الدمج في المجتمع المحلي" subtitle="Community Reintegration Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="العمر" value={d.age} w="10%" /><Field label="المرحلة" value={d.phase} w="15%" /><Field label="تاريخ الخطة" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="أهداف الدمج">
              <EmptyTable cols={5} rows={6} headers={['الهدف', 'النشاط', 'المسؤول', 'المؤشر', 'الموعد']} />
            </Section>
            <Section title="الموارد المجتمعية المحددة">
              <EmptyTable cols={4} rows={4} headers={['المورد/الجهة', 'الخدمة', 'التواصل', 'الحالة']} />
            </Section>
            <NotesBox label="دور الأسرة" value={d.familyRole} lines={2} />
            <SignatureBlock rightLabel="أخصائي الدمج" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'followup-outcome-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير نتائج المتابعة بعد الخروج" subtitle="Post-Exit Follow-Up Outcome Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="تاريخ الخروج" value={formatDate(d.exitDate)} w="15%" /><Field label="فترة المتابعة" value={d.period} w="20%" /><Field label="عدد الزيارات" value={d.visitCount} w="12%" /></div>
            <Section title="نتائج المتابعة">
              <EmptyTable cols={5} rows={6} headers={['المجال', 'عند الخروج', 'الوضع الحالي', 'التغيير', 'التقييم']} />
            </Section>
            <NotesBox label="الوضع العام" value={d.generalStatus} lines={2} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <div style={fieldRow}><Field label="القرار" value={d.decision} w="30%" /></div>
            <SignatureBlock rightLabel="أخصائي المتابعة" leftLabel="مدير البرنامج" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
