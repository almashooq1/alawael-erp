/**
 * قوالب التربية الخاصة والتوظيف المدعوم
 * Special Education & Supported Employment Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine, ConfidentialBanner,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const SPECIAL_EDUCATION_TEMPLATES = [
  /* ── التربية الخاصة ── */
  { id: 'iep-document', name: 'الخطة التربوية الفردية', nameEn: 'Individual Education Plan (IEP)', desc: 'الخطة التربوية الفردية للطالب', color: '#1565c0' },
  { id: 'behavior-intervention-plan', name: 'خطة التدخل السلوكي', nameEn: 'Behavior Intervention Plan', desc: 'خطة تعديل وتدخل سلوكي', color: '#1976d2' },
  { id: 'se-transition-plan', name: 'خطة الانتقال التعليمي', nameEn: 'Education Transition Plan', desc: 'خطة انتقال بين المراحل التعليمية', color: '#1e88e5' },
  { id: 'parent-communication-log', name: 'سجل تواصل ولي الأمر', nameEn: 'Parent Communication Log', desc: 'سجل التواصل مع ولي الأمر', color: '#2196f3' },
  { id: 'se-progress-report', name: 'تقرير تقدم تربوي', nameEn: 'Education Progress Report', desc: 'تقرير تقدم تربوي دوري', color: '#42a5f5' },
  { id: 'curriculum-adaptation', name: 'تكييف المنهج', nameEn: 'Curriculum Adaptation', desc: 'نموذج تكييف المنهج الدراسي', color: '#64b5f6' },
  { id: 'classroom-observation', name: 'ملاحظة صفية', nameEn: 'Classroom Observation', desc: 'نموذج ملاحظة صفية للمعلم', color: '#0d47a1' },
  { id: 'se-report-card', name: 'بطاقة تقرير الطالب', nameEn: 'Student Report Card', desc: 'بطاقة التقرير الدراسي', color: '#0277bd' },
  { id: 'iep-meeting-minutes', name: 'محضر اجتماع IEP', nameEn: 'IEP Meeting Minutes', desc: 'محضر اجتماع فريق الخطة التربوية', color: '#01579b' },
  /* ── التوظيف المدعوم ── */
  { id: 'employment-assessment', name: 'تقييم التوظيف', nameEn: 'Employment Assessment', desc: 'تقييم قدرات واستعداد التوظيف', color: '#e65100' },
  { id: 'job-placement-report', name: 'تقرير التوظيف', nameEn: 'Job Placement Report', desc: 'تقرير إلحاق بعمل', color: '#ef6c00' },
  { id: 'workplace-accommodation', name: 'تسهيلات بيئة العمل', nameEn: 'Workplace Accommodation', desc: 'نموذج طلب تسهيلات في بيئة العمل', color: '#f57c00' },
  { id: 'employment-progress-report', name: 'تقرير تقدم وظيفي', nameEn: 'Employment Progress', desc: 'تقرير تقدم في بيئة العمل', color: '#fb8c00' },
  { id: 'vocational-skills-assessment', name: 'تقييم المهارات المهنية', nameEn: 'Vocational Skills Assessment', desc: 'تقييم المهارات المهنية والحرفية', color: '#ff9800' },
  { id: 'job-coaching-log', name: 'سجل مدرب العمل', nameEn: 'Job Coaching Log', desc: 'سجل متابعة مدرب العمل', color: '#ffa726' },
  { id: 'employer-feedback-form', name: 'نموذج ملاحظات صاحب العمل', nameEn: 'Employer Feedback', desc: 'نموذج تغذية راجعة من صاحب العمل', color: '#ffb74d' },
  { id: 'workplace-safety-assessment', name: 'تقييم سلامة بيئة العمل', nameEn: 'Workplace Safety Assessment', desc: 'تقييم سلامة بيئة العمل للموظف', color: '#ff6f00' },
  { id: 'supported-employment-agreement', name: 'اتفاقية التوظيف المدعوم', nameEn: 'Supported Employment Agreement', desc: 'اتفاقية بين المركز وجهة التوظيف', color: '#e65100' },
];

export const SpecialEducationTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    /* ══════════════ التربية الخاصة ══════════════ */
    case 'iep-document':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="الخطة التربوية الفردية (IEP)" subtitle="Individual Education Plan" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="العمر" value={d.age} w="10%" /><Field label="الصف" value={d.grade} w="10%" /><Field label="التشخيص" value={d.diagnosis} w="25%" /></div>
            <div style={fieldRow}><Field label="المعلم المسؤول" value={d.teacher} w="25%" /><Field label="تاريخ البداية" value={formatDate(d.startDate)} w="15%" /><Field label="تاريخ المراجعة" value={formatDate(d.reviewDate)} w="15%" /></div>
            <Section title="نقاط القوة الحالية">
              <NotesBox label="" value={d.strengths} lines={2} />
            </Section>
            <Section title="الاحتياجات التعليمية">
              <NotesBox label="" value={d.needs} lines={2} />
            </Section>
            <Section title="الأهداف السنوية">
              <EmptyTable cols={5} rows={6} headers={['المجال', 'الهدف', 'المعيار', 'التقييم', 'الحالة']} />
            </Section>
            <Section title="الأهداف قصيرة المدى">
              <EmptyTable cols={4} rows={6} headers={['الهدف', 'الخطوات', 'الموعد', 'الحالة']} />
            </Section>
            <Section title="الخدمات المساندة">
              <EmptyTable cols={4} rows={4} headers={['الخدمة', 'المقدم', 'التكرار', 'المدة']} />
            </Section>
            <SignatureBlock rightLabel="المعلم" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'behavior-intervention-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة التدخل السلوكي" subtitle="Behavior Intervention Plan (BIP)" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="العمر" value={d.age} w="10%" /><Field label="المعلم" value={d.teacher} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <NotesBox label="وصف السلوك المستهدف" value={d.targetBehavior} lines={2} />
            <NotesBox label="التحليل الوظيفي (وظيفة السلوك)" value={d.functionalAnalysis} lines={2} />
            <Section title="استراتيجيات الوقاية">
              <EmptyTable cols={3} rows={4} headers={['الاستراتيجية', 'التفاصيل', 'المسؤول']} />
            </Section>
            <Section title="استراتيجيات الاستبدال">
              <EmptyTable cols={3} rows={3} headers={['السلوك البديل', 'كيفية التعليم', 'التعزيز']} />
            </Section>
            <Section title="استراتيجيات الاستجابة">
              <EmptyTable cols={3} rows={3} headers={['إذا حدث السلوك', 'الاستجابة', 'ملاحظات']} />
            </Section>
            <NotesBox label="نظام التعزيز" value={d.reinforcementSystem} lines={2} />
            <SignatureBlock rightLabel="أخصائي السلوك" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'se-transition-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة الانتقال التعليمي" subtitle="Educational Transition Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="العمر" value={d.age} w="10%" /><Field label="من" value={d.fromProgram} w="20%" /><Field label="إلى" value={d.toProgram} w="20%" /></div>
            <div style={fieldRow}><Field label="تاريخ الانتقال المتوقع" value={formatDate(d.transitionDate)} w="15%" /><Field label="المنسق" value={d.coordinator} w="25%" /></div>
            <Section title="المهارات الحالية">
              <EmptyTable cols={3} rows={5} headers={['المجال', 'المستوى', 'ملاحظات']} />
            </Section>
            <Section title="أهداف المرحلة الجديدة">
              <EmptyTable cols={4} rows={5} headers={['الهدف', 'الخطوات', 'الدعم المطلوب', 'الموعد']} />
            </Section>
            <NotesBox label="الدعم الانتقالي" value={d.transitionalSupport} lines={2} />
            <SignatureBlock rightLabel="المعلم الحالي" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'parent-communication-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل التواصل مع ولي الأمر" subtitle="Parent Communication Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="ولي الأمر" value={d.parent} w="25%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <Section title="سجل التواصل">
              <EmptyTable cols={6} rows={12} headers={['التاريخ', 'الطريقة', 'المبادر', 'الموضوع', 'النتيجة', 'المتابعة']} />
            </Section>
            <NotesBox label="ملاحظات عامة" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="المعلم" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'se-progress-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير التقدم التربوي الدوري" subtitle="Educational Progress Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="الصف" value={d.grade} w="10%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="المعلم" value={d.teacher} w="25%" /></div>
            <Section title="التقدم في أهداف IEP">
              <EmptyTable cols={5} rows={6} headers={['الهدف', 'المعيار', 'التقدم', 'النسبة %', 'الحالة']} />
            </Section>
            <Section title="الملاحظات حسب المجال">
              <EmptyTable cols={3} rows={5} headers={['المجال', 'الملاحظة', 'التوصية']} />
            </Section>
            <NotesBox label="ملاحظات عامة" value={d.generalNotes} lines={2} />
            <SignatureBlock rightLabel="المعلم" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'curriculum-adaptation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تكييف المنهج الدراسي" subtitle="Curriculum Adaptation Form" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="المادة" value={d.subject} w="20%" /><Field label="الصف" value={d.grade} w="10%" /><Field label="المعلم" value={d.teacher} w="25%" /></div>
            <Section title="التكييفات">
              <EmptyTable cols={4} rows={8} headers={['المحتوى الأصلي', 'التكييف', 'نوع التكييف', 'ملاحظات']} />
            </Section>
            <Section title="أساليب التقييم البديلة">
              <EmptyTable cols={3} rows={4} headers={['التقييم الأصلي', 'البديل', 'المبرر']} />
            </Section>
            <NotesBox label="ملاحظات وتوصيات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="المعلم" leftLabel="المشرف التربوي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'classroom-observation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج الملاحظة الصفية" subtitle="Classroom Observation Form" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المعلم" value={d.teacher} w="25%" /><Field label="المادة" value={d.subject} w="15%" /><Field label="الصف" value={d.grade} w="10%" /><Field label="الملاحظ" value={d.observer} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="معايير الملاحظة">
              <EmptyTable cols={5} rows={10} headers={['المعيار', 'ممتاز', 'جيد', 'مقبول', 'ملاحظات']} />
            </Section>
            <NotesBox label="نقاط القوة" value={d.strengths} lines={2} />
            <NotesBox label="نقاط التطوير" value={d.development} lines={2} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="الملاحظ" leftLabel="المعلم" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'se-report-card':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بطاقة التقرير الدراسي" subtitle="Student Report Card" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="الصف" value={d.grade} w="10%" /><Field label="الفصل" value={d.semester} w="15%" /><Field label="العام" value={d.year} w="12%" /></div>
            <Section title="التقييم الأكاديمي">
              <EmptyTable cols={5} rows={8} headers={['المادة', 'الدرجة', 'التقدير', 'الجهد', 'ملاحظات']} />
            </Section>
            <Section title="المهارات السلوكية والاجتماعية">
              <EmptyTable cols={4} rows={5} headers={['المهارة', 'ممتاز', 'جيد', 'يحتاج تطوير']} />
            </Section>
            <NotesBox label="ملاحظات المعلم" value={d.teacherNotes} lines={2} />
            <NotesBox label="ملاحظات ولي الأمر" value={d.parentNotes} lines={2} />
            <SignatureBlock rightLabel="المعلم" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'iep-meeting-minutes':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="محضر اجتماع فريق الخطة التربوية" subtitle="IEP Team Meeting Minutes" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="نوع الاجتماع" value={d.meetingType} w="15%" /></div>
            <Section title="الحاضرون">
              <EmptyTable cols={3} rows={6} headers={['الاسم', 'الدور', 'التوقيع']} />
            </Section>
            <NotesBox label="المواضيع المناقشة" value={d.topics} lines={3} />
            <Section title="القرارات">
              <EmptyTable cols={3} rows={4} headers={['القرار', 'المسؤول', 'الموعد']} />
            </Section>
            <div style={fieldRow}><Field label="الاجتماع القادم" value={formatDate(d.nextMeeting)} w="15%" /></div>
            <SignatureBlock rightLabel="رئيس الاجتماع" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ التوظيف المدعوم ══════════════ */
    case 'employment-assessment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقييم قدرات واستعداد التوظيف" subtitle="Employment Readiness Assessment" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="العمر" value={d.age} w="10%" /><Field label="المقيِّم" value={d.evaluator} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="المهارات الوظيفية">
              <EmptyTable cols={4} rows={8} headers={['المهارة', 'المستوى (1-5)', 'الأهمية', 'ملاحظات']} />
            </Section>
            <Section title="المهارات الاجتماعية">
              <EmptyTable cols={4} rows={5} headers={['المهارة', 'المستوى', 'الملاحظة', 'التوصية']} />
            </Section>
            <NotesBox label="الاهتمامات والتفضيلات المهنية" value={d.interests} lines={2} />
            <NotesBox label="القيود والتسهيلات المطلوبة" value={d.accommodations} lines={2} />
            <div style={fieldRow}><Field label="الجاهزية" value={d.readiness} w="20%" /><Field label="التوصية" value={d.recommendation} w="30%" /></div>
            <SignatureBlock rightLabel="المقيِّم" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'job-placement-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير الإلحاق بالعمل" subtitle="Job Placement Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="جهة العمل" value={d.employer} w="25%" /><Field label="المسمى" value={d.jobTitle} w="20%" /></div>
            <div style={fieldRow}><Field label="تاريخ البدء" value={formatDate(d.startDate)} w="15%" /><Field label="نوع العقد" value={d.contractType} w="15%" /><Field label="الراتب" value={d.salary} w="12%" /></div>
            <NotesBox label="وصف الوظيفة" value={d.jobDescription} lines={2} />
            <Section title="التسهيلات المقدمة">
              <EmptyTable cols={3} rows={4} headers={['التسهيل', 'التفاصيل', 'المسؤول']} />
            </Section>
            <NotesBox label="خطة الدعم" value={d.supportPlan} lines={2} />
            <SignatureBlock rightLabel="أخصائي التوظيف" leftLabel="مدير البرنامج" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'workplace-accommodation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="طلب تسهيلات بيئة العمل" subtitle="Workplace Accommodation Request" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الموظف" value={d.employee} w="25%" /><Field label="جهة العمل" value={d.employer} w="25%" /><Field label="المسمى" value={d.jobTitle} w="20%" /></div>
            <NotesBox label="وصف الإعاقة/القيد" value={d.disabilityDescription} lines={2} />
            <Section title="التسهيلات المطلوبة">
              <EmptyTable cols={4} rows={5} headers={['التسهيل', 'المبرر', 'التكلفة المقدرة', 'الأولوية']} />
            </Section>
            <NotesBox label="تأثير التسهيلات على الأداء" value={d.expectedImpact} lines={2} />
            <SignatureBlock rightLabel="الموظف / ولي الأمر" leftLabel="مسؤول الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'employment-progress-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير التقدم في بيئة العمل" subtitle="Employment Progress Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="جهة العمل" value={d.employer} w="25%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <Section title="تقييم الأداء">
              <EmptyTable cols={4} rows={6} headers={['المجال', 'التقييم (1-5)', 'التغير عن السابق', 'ملاحظات']} />
            </Section>
            <NotesBox label="الإنجازات" value={d.achievements} lines={2} />
            <NotesBox label="التحديات" value={d.challenges} lines={2} />
            <NotesBox label="الدعم المطلوب" value={d.supportNeeded} lines={2} />
            <SignatureBlock rightLabel="مدرب العمل" leftLabel="المشرف المباشر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'vocational-skills-assessment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقييم المهارات المهنية والحرفية" subtitle="Vocational Skills Assessment" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="المجال المهني" value={d.vocationalField} w="20%" /><Field label="المقيِّم" value={d.evaluator} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="المهارات المهنية">
              <EmptyTable cols={4} rows={8} headers={['المهارة', 'المستوى (1-5)', 'الملاحظة', 'التوصية']} />
            </Section>
            <Section title="المهارات العامة في العمل">
              <EmptyTable cols={4} rows={5} headers={['المهارة', 'المستوى', 'ملاحظات', 'أولوية التطوير']} />
            </Section>
            <NotesBox label="التوصيات المهنية" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="المقيِّم" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'job-coaching-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل متابعة مدرب العمل" subtitle="Job Coaching Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="جهة العمل" value={d.employer} w="25%" /><Field label="المدرب" value={d.coach} w="25%" /></div>
            <Section title="جلسات التدريب">
              <EmptyTable cols={6} rows={10} headers={['التاريخ', 'المدة', 'الهدف', 'الأنشطة', 'التقدم', 'الخطوة التالية']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الساعات" value={d.totalHours} w="15%" /><Field label="التقييم العام" value={d.overallProgress} w="20%" /></div>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مدرب العمل" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'employer-feedback-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج ملاحظات صاحب العمل" subtitle="Employer Feedback Form" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="جهة العمل" value={d.employer} w="25%" /><Field label="المسؤول" value={d.contactPerson} w="25%" /><Field label="الموظف (المستفيد)" value={d.employee} w="25%" /></div>
            <div style={fieldRow}><Field label="فترة العمل" value={d.workPeriod} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="التقييم">
              <EmptyTable cols={5} rows={8} headers={['المعيار', 'ممتاز', 'جيد', 'مقبول', 'ضعيف']} />
            </Section>
            <NotesBox label="نقاط القوة" value={d.strengths} lines={2} />
            <NotesBox label="مجالات التحسين" value={d.improvements} lines={2} />
            <NotesBox label="هل ترغب في استمرار الموظف؟" value={d.continuationDecision} lines={1} />
            <SignatureBlock rightLabel="صاحب العمل / المشرف" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'workplace-safety-assessment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقييم سلامة بيئة العمل" subtitle="Workplace Safety Assessment" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="جهة العمل" value={d.employer} w="25%" /><Field label="الموقع" value={d.location} w="20%" /><Field label="المقيِّم" value={d.assessor} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="قائمة الفحص">
              <EmptyTable cols={4} rows={10} headers={['البند', 'مطابق', 'غير مطابق', 'ملاحظات']} />
            </Section>
            <NotesBox label="المخاطر المحددة" value={d.identifiedRisks} lines={2} />
            <NotesBox label="التسهيلات الإضافية المطلوبة" value={d.accommodationsNeeded} lines={2} />
            <div style={fieldRow}><Field label="مناسب للتوظيف" value={d.suitableForPlacement} w="20%" /></div>
            <SignatureBlock rightLabel="المقيِّم" leftLabel="مسؤول السلامة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'supported-employment-agreement':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="اتفاقية التوظيف المدعوم" subtitle="Supported Employment Agreement" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطرف الأول (المركز)" value={d.center || 'مركز الأوائل للتأهيل'} w="35%" /><Field label="الطرف الثاني (جهة العمل)" value={d.employer} w="35%" /></div>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="المسمى الوظيفي" value={d.jobTitle} w="20%" /><Field label="المدة" value={d.duration} w="15%" /></div>
            <Section title="التزامات المركز">
              <EmptyTable cols={2} rows={4} headers={['الالتزام', 'التفاصيل']} />
            </Section>
            <Section title="التزامات جهة العمل">
              <EmptyTable cols={2} rows={4} headers={['الالتزام', 'التفاصيل']} />
            </Section>
            <NotesBox label="أحكام عامة" value={d.generalTerms} lines={3} />
            <SignatureBlock rightLabel="المركز" leftLabel="جهة العمل" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
