/**
 * قوالب التأهيل المتخصص و ICF/MDT — Rehabilitation & ICF/MDT Print Templates
 * يشمل: البرامج التأهيلية المتخصصة، مقاييس التقييم، التصنيف الدولي، الفريق متعدد التخصصات
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine, ConfidentialBanner,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const REHAB_SPECIALIZED_TEMPLATES = [
  /* ── التأهيل المتخصص ── */
  { id: 'rehab-scale-assessment', name: 'تقرير تطبيق المقياس', nameEn: 'Scale Assessment Report', desc: 'تقرير تطبيق مقياس تأهيلي متخصص', color: '#6a1b9a' },
  { id: 'rehab-enrollment', name: 'تسجيل برنامج تأهيلي', nameEn: 'Rehab Program Enrollment', desc: 'نموذج تسجيل في برنامج تأهيلي', color: '#7b1fa2' },
  { id: 'rehab-progress-track', name: 'متابعة التقدم التأهيلي', nameEn: 'Rehab Progress Tracking', desc: 'ورقة متابعة التقدم التأهيلي', color: '#8e24aa' },
  { id: 'behavior-management-plan', name: 'خطة إدارة السلوك', nameEn: 'Behavior Management Plan', desc: 'خطة متكاملة لإدارة السلوك', color: '#9c27b0' },
  { id: 'program-effectiveness', name: 'تقرير فعالية البرنامج', nameEn: 'Program Effectiveness Report', desc: 'تقرير قياس فعالية البرنامج التأهيلي', color: '#ab47bc' },
  { id: 'specialized-assessment-summary', name: 'ملخص التقييم المتخصص', nameEn: 'Specialized Assessment Summary', desc: 'ملخص شامل للتقييم المتخصص', color: '#ba68c8' },
  { id: 'irp-plan', name: 'الخطة التأهيلية الفردية', nameEn: 'Individualized Rehab Plan (IRP)', desc: 'خطة تأهيلية فردية شاملة', color: '#6a1b9a' },
  { id: 'ar-rehab-session', name: 'تقرير جلسة واقع معزز', nameEn: 'AR Rehab Session Report', desc: 'تقرير جلسة تأهيل بالواقع المعزز', color: '#4a148c' },
  { id: 'disability-scale-report', name: 'تقرير مقياس الإعاقة', nameEn: 'Disability Assessment Scale', desc: 'تقرير تقييم مقياس الإعاقة', color: '#7b1fa2' },
  /* ── ICF & MDT ── */
  { id: 'icf-assessment-report', name: 'تقرير تقييم ICF', nameEn: 'ICF Assessment Report', desc: 'تقرير تقييم التصنيف الدولي للأداء', color: '#00695c' },
  { id: 'icf-domain-profile', name: 'ملف مجالات ICF', nameEn: 'ICF Domain Profile Sheet', desc: 'ملف تقييم مجالات ICF', color: '#00796b' },
  { id: 'mdt-meeting-report', name: 'محضر اجتماع MDT', nameEn: 'MDT Meeting Minutes', desc: 'محضر اجتماع الفريق متعدد التخصصات', color: '#00897b' },
  { id: 'mdt-care-plan', name: 'خطة رعاية MDT', nameEn: 'MDT Care Plan', desc: 'خطة رعاية الفريق متعدد التخصصات', color: '#009688' },
  { id: 'mdt-referral-form', name: 'نموذج إحالة MDT', nameEn: 'MDT Referral Form', desc: 'نموذج إحالة متعدد التخصصات', color: '#26a69a' },
  { id: 'mdt-progress-report', name: 'تقرير تقدم MDT', nameEn: 'MDT Progress Report', desc: 'تقرير تقدم الفريق المتعدد', color: '#4db6ac' },
  { id: 'icf-functional-profile', name: 'الملف الوظيفي ICF', nameEn: 'ICF Functional Profile', desc: 'الملف الوظيفي حسب التصنيف الدولي', color: '#00695c' },
  { id: 'interdisciplinary-summary', name: 'ملخص التقييم الشامل', nameEn: 'Interdisciplinary Summary', desc: 'ملخص التقييم الشامل متعدد التخصصات', color: '#004d40' },
  { id: 'rehab-program-cert', name: 'شهادة إتمام البرنامج', nameEn: 'Rehab Program Certificate', desc: 'شهادة إتمام البرنامج التأهيلي', color: '#4a148c' },
];

export const RehabSpecializedTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    /* ══════════════ التأهيل المتخصص ══════════════ */
    case 'rehab-scale-assessment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تطبيق المقياس المتخصص" subtitle="Specialized Scale Assessment Report" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المستفيد">
              <div style={fieldRow}><Field label="الاسم" value={d.beneficiaryName} w="35%" /><Field label="رقم الملف" value={d.fileNo} w="20%" /><Field label="العمر" value={d.age} w="15%" /><Field label="نوع الإعاقة" value={d.disabilityType} w="30%" /></div>
            </Section>
            <Section title="بيانات المقياس">
              <div style={fieldRow}><Field label="اسم المقياس" value={d.scaleName} w="40%" /><Field label="الإصدار" value={d.version} w="20%" /><Field label="تاريخ التطبيق" value={formatDate(d.date) || today()} w="20%" /><Field label="الأخصائي" value={d.specialist} w="20%" /></div>
            </Section>
            <Section title="نتائج المحاور">
              <EmptyTable cols={5} rows={8} headers={['المحور', 'الدرجة', 'من', 'النسبة %', 'المستوى']} />
            </Section>
            <div style={fieldRow}><Field label="الدرجة الكلية" value={d.totalScore} w="25%" /><Field label="المستوى العام" value={d.overallLevel} w="25%" /><Field label="التقييم السابق" value={d.prevScore} w="25%" /><Field label="الفرق" value={d.difference} w="25%" /></div>
            <NotesBox label="التحليل والتفسير" value={d.analysis} lines={4} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="الأخصائي" leftLabel="مدير البرامج" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'rehab-enrollment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تسجيل برنامج تأهيلي" subtitle="Rehabilitation Program Enrollment" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المستفيد">
              <div style={fieldRow}><Field label="الاسم" value={d.name} w="35%" /><Field label="رقم الملف" value={d.fileNo} w="20%" /><Field label="تاريخ الميلاد" value={formatDate(d.dob)} w="20%" /><Field label="ولي الأمر" value={d.guardian} w="25%" /></div>
              <div style={fieldRow}><Field label="نوع الإعاقة" value={d.disabilityType} w="30%" /><Field label="درجة الإعاقة" value={d.disabilityDegree} w="20%" /><Field label="التشخيص الأولي" value={d.diagnosis} w="50%" /></div>
            </Section>
            <Section title="بيانات البرنامج">
              <div style={fieldRow}><Field label="البرنامج" value={d.program} w="35%" /><Field label="المستوى" value={d.level} w="20%" /><Field label="تاريخ البدء" value={formatDate(d.startDate)} w="20%" /><Field label="المدة المتوقعة" value={d.expectedDuration} w="25%" /></div>
              <div style={fieldRow}><Field label="الأهداف الرئيسية" value={d.goals} w="60%" /><Field label="عدد الجلسات/أسبوع" value={d.sessionsPerWeek} w="20%" /><Field label="المسؤول" value={d.responsible} w="20%" /></div>
            </Section>
            <NotesBox label="الاحتياجات الخاصة" value={d.specialNeeds} lines={2} />
            <NotesBox label="ملاحظات إضافية" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="ولي الأمر" leftLabel="مدير القبول" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'rehab-progress-track':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ورقة متابعة التقدم التأهيلي" subtitle="Rehab Progress Tracking Sheet" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiaryName} w="30%" /><Field label="البرنامج" value={d.program} w="25%" /><Field label="الفترة" value={d.period} w="25%" /><Field label="الأخصائي" value={d.specialist} w="20%" /></div>
            <Section title="أهداف البرنامج ونسب الإنجاز">
              <EmptyTable cols={6} rows={8} headers={['الهدف', 'المؤشر', 'خط الأساس', 'الحالي', 'المستهدف', 'نسبة الإنجاز %']} />
            </Section>
            <Section title="سجل الجلسات">
              <EmptyTable cols={5} rows={10} headers={['التاريخ', 'نوع الجلسة', 'النشاط', 'الحضور', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملخص التقدم" value={d.progressSummary} lines={3} />
            <SignatureBlock rightLabel="الأخصائي" leftLabel="مدير البرامج" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'behavior-management-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة إدارة السلوك" subtitle="Behavior Management Plan" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المستفيد">
              <div style={fieldRow}><Field label="الاسم" value={d.name} w="35%" /><Field label="العمر" value={d.age} w="15%" /><Field label="التشخيص" value={d.diagnosis} w="30%" /><Field label="الأخصائي" value={d.specialist} w="20%" /></div>
            </Section>
            <Section title="السلوكيات المستهدفة">
              <EmptyTable cols={4} rows={5} headers={['السلوك', 'الوصف', 'الشدة', 'التكرار']} />
            </Section>
            <Section title="المحفزات والعوامل">
              <EmptyTable cols={3} rows={4} headers={['المحفز', 'الاستجابة المتوقعة', 'البديل المطلوب']} />
            </Section>
            <NotesBox label="استراتيجيات التدخل" value={d.strategies} lines={4} />
            <NotesBox label="نظام التعزيز" value={d.reinforcement} lines={3} />
            <NotesBox label="خطة الطوارئ" value={d.emergencyPlan} lines={2} />
            <SignatureBlock rightLabel="أخصائي السلوك" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'program-effectiveness':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير فعالية البرنامج التأهيلي" subtitle="Program Effectiveness Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="البرنامج" value={d.program} w="35%" /><Field label="الفترة" value={d.period} w="25%" /><Field label="عدد المستفيدين" value={d.totalBeneficiaries} w="20%" /><Field label="المسؤول" value={d.responsible} w="20%" /></div>
            <Section title="مؤشرات الأداء">
              <EmptyTable cols={5} rows={6} headers={['المؤشر', 'المستهدف', 'المتحقق', 'النسبة %', 'التقييم']} />
            </Section>
            <Section title="نتائج المستفيدين">
              <EmptyTable cols={5} rows={6} headers={['المستفيد', 'قبل', 'بعد', 'التحسن %', 'ملاحظات']} />
            </Section>
            <NotesBox label="نقاط القوة" value={d.strengths} lines={2} />
            <NotesBox label="فرص التحسين" value={d.improvements} lines={2} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="مدير البرامج" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'specialized-assessment-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص التقييم المتخصص" subtitle="Specialized Assessment Summary" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="30%" /><Field label="رقم الملف" value={d.fileNo} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="الفريق" value={d.team} w="30%" /></div>
            <Section title="نتائج التقييمات">
              <EmptyTable cols={5} rows={8} headers={['التقييم', 'الأخصائي', 'الدرجة', 'المستوى', 'التوصية']} />
            </Section>
            <NotesBox label="ملخص النتائج العامة" value={d.overallSummary} lines={4} />
            <NotesBox label="الأهداف المقترحة" value={d.proposedGoals} lines={3} />
            <SignatureBlock rightLabel="منسق التقييم" leftLabel="مدير البرامج" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'irp-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="الخطة التأهيلية الفردية (IRP)" subtitle="Individualized Rehabilitation Plan" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المستفيد">
              <div style={fieldRow}><Field label="الاسم" value={d.name} w="30%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /><Field label="العمر" value={d.age} w="10%" /><Field label="التشخيص" value={d.diagnosis} w="25%" /><Field label="تاريخ الخطة" value={formatDate(d.date) || today()} w="20%" /></div>
            </Section>
            <Section title="نقاط القوة والاحتياجات">
              <div style={fieldRow}><Field label="نقاط القوة" value={d.strengths} w="50%" /><Field label="الاحتياجات" value={d.needs} w="50%" /></div>
            </Section>
            <Section title="الأهداف والتدخلات">
              <EmptyTable cols={6} rows={8} headers={['المجال', 'الهدف طويل المدى', 'الهدف قصير المدى', 'التدخل', 'المسؤول', 'الموعد']} />
            </Section>
            <div style={fieldRow}><Field label="فترة المراجعة" value={d.reviewPeriod} w="30%" /><Field label="تاريخ المراجعة القادمة" value={formatDate(d.nextReview)} w="30%" /><Field label="مستوى الأولوية" value={d.priority} w="20%" /></div>
            <SignatureBlock rightLabel="فريق التأهيل" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'ar-rehab-session':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير جلسة تأهيل الواقع المعزز" subtitle="AR Rehabilitation Session Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="الأخصائي" value={d.specialist} w="25%" /><Field label="مدة الجلسة" value={d.duration} w="25%" /></div>
            <Section title="تفاصيل الجلسة">
              <div style={fieldRow}><Field label="التطبيق/البرنامج" value={d.application} w="35%" /><Field label="السيناريو" value={d.scenario} w="35%" /><Field label="مستوى الصعوبة" value={d.difficulty} w="30%" /></div>
            </Section>
            <Section title="الأداء">
              <EmptyTable cols={5} rows={5} headers={['المهارة', 'الهدف', 'النتيجة', 'الوقت', 'التقييم']} />
            </Section>
            <NotesBox label="ملاحظات الأخصائي" value={d.notes} lines={3} />
            <NotesBox label="التطوير للجلسة القادمة" value={d.nextSessionPlan} lines={2} />
            <SignatureBlock rightLabel="الأخصائي" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'disability-scale-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير مقياس تقييم الإعاقة" subtitle="Disability Assessment Scale Report" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="30%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /><Field label="نوع الإعاقة" value={d.disabilityType} w="25%" /><Field label="تاريخ التقييم" value={formatDate(d.date) || today()} w="15%" /><Field label="المقيّم" value={d.assessor} w="15%" /></div>
            <Section title="مجالات التقييم">
              <EmptyTable cols={5} rows={10} headers={['المجال', 'البنود', 'الدرجة', 'من', 'المستوى']} />
            </Section>
            <div style={fieldRow}><Field label="الدرجة الكلية" value={d.totalScore} w="25%" /><Field label="التصنيف" value={d.classification} w="25%" /><Field label="مقارنة بالتقييم السابق" value={d.comparison} w="50%" /></div>
            <NotesBox label="الملاحظات السريرية" value={d.clinicalNotes} lines={3} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="المقيّم" leftLabel="المشرف السريري" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ ICF & MDT ══════════════ */
    case 'icf-assessment-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تقييم ICF" subtitle="ICF Assessment Report" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="30%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="المقيّم" value={d.assessor} w="35%" /></div>
            <Section title="وظائف الجسم (b)">
              <EmptyTable cols={4} rows={5} headers={['الكود', 'الوصف', 'المؤهِّل', 'ملاحظات']} />
            </Section>
            <Section title="بنى الجسم (s)">
              <EmptyTable cols={4} rows={4} headers={['الكود', 'الوصف', 'المؤهِّل', 'ملاحظات']} />
            </Section>
            <Section title="الأنشطة والمشاركة (d)">
              <EmptyTable cols={5} rows={6} headers={['الكود', 'الوصف', 'الأداء', 'القدرة', 'ملاحظات']} />
            </Section>
            <Section title="العوامل البيئية (e)">
              <EmptyTable cols={4} rows={4} headers={['الكود', 'الوصف', 'ميسّر/عائق', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملخص الملف الوظيفي" value={d.functionalSummary} lines={4} />
            <SignatureBlock rightLabel="أخصائي ICF" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'icf-domain-profile':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملف تقييم مجالات ICF" subtitle="ICF Domain Profile Sheet" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="35%" /><Field label="رقم الملف" value={d.fileNo} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="الأخصائي" value={d.specialist} w="25%" /></div>
            <Section title="ملف المجالات — مقياس 0-4">
              <EmptyTable cols={7} rows={12} headers={['المجال', 'البند', 'لا مشكلة (0)', 'خفيف (1)', 'متوسط (2)', 'شديد (3)', 'كامل (4)']} />
            </Section>
            <NotesBox label="التعليق" value={d.comment} lines={3} />
            <SignatureBlock rightLabel="الأخصائي" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'mdt-meeting-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="محضر اجتماع الفريق متعدد التخصصات" subtitle="MDT Meeting Minutes" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="25%" /><Field label="الوقت" value={d.time} w="15%" /><Field label="المكان" value={d.venue} w="25%" /><Field label="رئيس الاجتماع" value={d.chairperson} w="35%" /></div>
            <Section title="الحضور">
              <EmptyTable cols={4} rows={8} headers={['الاسم', 'التخصص', 'الدور', 'التوقيع']} />
            </Section>
            <Section title="الحالات المناقشة">
              <EmptyTable cols={5} rows={6} headers={['المستفيد', 'الحالة', 'التوصيات', 'المسؤول', 'الموعد']} />
            </Section>
            <NotesBox label="قرارات الاجتماع" value={d.decisions} lines={3} />
            <NotesBox label="المتابعة" value={d.followUp} lines={2} />
            <SignatureBlock rightLabel="رئيس الاجتماع" leftLabel="أمين السر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'mdt-care-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة رعاية الفريق متعدد التخصصات" subtitle="MDT Care Plan" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="30%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /><Field label="التشخيص" value={d.diagnosis} w="35%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="أهداف الرعاية متعددة التخصصات">
              <EmptyTable cols={5} rows={8} headers={['المجال', 'الهدف', 'التدخل', 'التخصص المسؤول', 'المراجعة']} />
            </Section>
            <NotesBox label="أولويات الرعاية" value={d.priorities} lines={2} />
            <NotesBox label="الموارد المطلوبة" value={d.resources} lines={2} />
            <SignatureBlock rightLabel="منسق الفريق" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'mdt-referral-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج إحالة متعدد التخصصات" subtitle="MDT Referral Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المُحيل">
              <div style={fieldRow}><Field label="الاسم" value={d.referrerName} w="35%" /><Field label="التخصص" value={d.referrerSpecialty} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            </Section>
            <Section title="بيانات المستفيد">
              <div style={fieldRow}><Field label="الاسم" value={d.beneficiaryName} w="35%" /><Field label="رقم الملف" value={d.fileNo} w="20%" /><Field label="التشخيص" value={d.diagnosis} w="45%" /></div>
            </Section>
            <div style={fieldRow}><Field label="الجهة المُحال إليها" value={d.referredTo} w="40%" /><Field label="الأولوية" value={d.priority} w="20%" /><Field label="نوع الإحالة" value={d.referralType} w="40%" /></div>
            <NotesBox label="سبب الإحالة" value={d.reason} lines={3} />
            <NotesBox label="المعلومات السريرية المرفقة" value={d.clinicalInfo} lines={3} />
            <SignatureBlock rightLabel="المُحيل" leftLabel="منسق الفريق" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'mdt-progress-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تقدم الفريق متعدد التخصصات" subtitle="MDT Progress Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="30%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /><Field label="الفترة" value={d.period} w="25%" /><Field label="المنسق" value={d.coordinator} w="30%" /></div>
            <Section title="تقدم كل تخصص">
              <EmptyTable cols={5} rows={8} headers={['التخصص', 'الهدف', 'نسبة التحقق %', 'الحالة', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملخص التقدم العام" value={d.overallProgress} lines={3} />
            <NotesBox label="التعديلات المقترحة على الخطة" value={d.planAdjustments} lines={2} />
            <SignatureBlock rightLabel="منسق الفريق" leftLabel="مدير البرامج" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'icf-functional-profile':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="الملف الوظيفي حسب ICF" subtitle="ICF Functional Profile" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="30%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="الأخصائي" value={d.specialist} w="35%" /></div>
            <Section title="القدرات الوظيفية">
              <EmptyTable cols={5} rows={10} headers={['النشاط', 'مستقل', 'بمساعدة جزئية', 'بمساعدة كاملة', 'غير قادر']} />
            </Section>
            <Section title="المشاركة الاجتماعية">
              <EmptyTable cols={4} rows={5} headers={['المجال', 'مستوى المشاركة', 'العوائق', 'الميسرات']} />
            </Section>
            <NotesBox label="الملخص الوظيفي" value={d.functionalSummary} lines={3} />
            <SignatureBlock rightLabel="الأخصائي" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'interdisciplinary-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص التقييم الشامل متعدد التخصصات" subtitle="Interdisciplinary Assessment Summary" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="30%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="منسق التقييم" value={d.coordinator} w="35%" /></div>
            <Section title="ملخص تقييمات التخصصات">
              <EmptyTable cols={4} rows={8} headers={['التخصص', 'الأخصائي', 'النتائج الرئيسية', 'التوصيات']} />
            </Section>
            <NotesBox label="الصورة الشاملة" value={d.comprehensivePicture} lines={4} />
            <NotesBox label="الأولويات التأهيلية" value={d.priorities} lines={3} />
            <NotesBox label="خطة العمل المقترحة" value={d.actionPlan} lines={3} />
            <SignatureBlock rightLabel="منسق التقييم" leftLabel="المدير الطبي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'rehab-program-cert':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة إتمام البرنامج التأهيلي" subtitle="Rehabilitation Program Completion Certificate" />
          <div style={bodyPad}>
            <div style={{ textAlign: 'center', margin: '40px 0' }}>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>يشهد مركز الأوائل لتأهيل ذوي الإعاقة بأن</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#4a148c', margin: '20px 0', borderBottom: '3px solid #4a148c', display: 'inline-block', padding: '0 40px 8px' }}>
                {d.beneficiaryName || '___________________________'}
              </div>
              <div style={{ fontSize: 14, color: '#666', margin: '20px 0' }}>قد أتم/أتمت بنجاح البرنامج التأهيلي</div>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: '#6a1b9a', margin: '12px 0' }}>{d.program || '___________________________'}</div>
              <div style={{ fontSize: 14 }}>خلال الفترة من <strong>{formatDate(d.fromDate) || '____'}</strong> إلى <strong>{formatDate(d.toDate) || '____'}</strong></div>
              <div style={{ fontSize: 14, margin: '12px 0' }}>بإجمالي <strong>{d.totalSessions || '____'}</strong> جلسة تأهيلية</div>
              <div style={{ fontSize: 14, margin: '8px 0' }}>التقييم النهائي: <strong>{d.finalAssessment || '____'}</strong></div>
            </div>
            <SignatureBlock rightLabel="مدير البرامج" leftLabel="المدير العام" />
            <div style={{ textAlign: 'center', fontSize: 10, color: '#999', marginTop: 20 }}>رقم الشهادة: {d.certNo || '________'} — التاريخ: {formatDate(d.date) || today()}</div>
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
