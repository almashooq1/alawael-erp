/**
 * قوالب العلاج المتقدم وفريق متعدد التخصصات
 * Advanced Therapy & MDT Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine, ConfidentialBanner,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const ADVANCED_THERAPY_TEMPLATES = [
  { id: 'mdt-meeting-minutes', name: 'محضر فريق متعدد التخصصات', nameEn: 'MDT Meeting Minutes', desc: 'محضر اجتماع الفريق متعدد التخصصات', color: '#6a1b9a' },
  { id: 'therapy-progress-note', name: 'ملاحظة تقدم علاجي', nameEn: 'Therapy Progress Note', desc: 'ملاحظة تقدم الجلسة العلاجية', color: '#7b1fa2' },
  { id: 'sensory-integration-plan', name: 'خطة التكامل الحسي', nameEn: 'Sensory Integration Plan', desc: 'خطة علاج التكامل الحسي', color: '#8e24aa' },
  { id: 'assistive-tech-assessment', name: 'تقييم تقنيات مساعدة', nameEn: 'Assistive Tech Assessment', desc: 'تقييم الحاجة للأجهزة المساعدة', color: '#9c27b0' },
  { id: 'hydrotherapy-session', name: 'جلسة العلاج المائي', nameEn: 'Hydrotherapy Session Record', desc: 'سجل جلسة العلاج المائي', color: '#0288d1' },
  { id: 'art-therapy-plan', name: 'خطة العلاج بالفن', nameEn: 'Art Therapy Plan', desc: 'خطة العلاج بالفن والتعبير', color: '#e91e63' },
  { id: 'music-therapy-session', name: 'جلسة العلاج بالموسيقى', nameEn: 'Music Therapy Session', desc: 'سجل جلسة العلاج بالموسيقى', color: '#f06292' },
  { id: 'aba-data-sheet', name: 'ورقة بيانات ABA', nameEn: 'ABA Data Collection Sheet', desc: 'جمع بيانات تحليل السلوك التطبيقي', color: '#4a148c' },
  { id: 'feeding-therapy-plan', name: 'خطة علاج التغذية', nameEn: 'Feeding Therapy Plan', desc: 'خطة علاج صعوبات التغذية والبلع', color: '#ff6f00' },
  { id: 'splinting-orthotics-rx', name: 'وصفة جبائر وأجهزة', nameEn: 'Splinting & Orthotics Rx', desc: 'وصفة جبائر وأجهزة تعويضية', color: '#bf360c' },
  { id: 'therapy-discharge-summary', name: 'ملخص خروج علاجي', nameEn: 'Therapy Discharge Summary', desc: 'ملخص الخروج من البرنامج العلاجي', color: '#d32f2f' },
  { id: 'home-exercise-program', name: 'برنامج تمارين منزلي', nameEn: 'Home Exercise Program', desc: 'برنامج تمارين منزلي لولي الأمر', color: '#2e7d32' },
  { id: 'group-therapy-record', name: 'سجل علاج جماعي', nameEn: 'Group Therapy Record', desc: 'سجل جلسة علاج جماعية', color: '#1565c0' },
  { id: 'functional-assessment', name: 'تقييم وظيفي شامل', nameEn: 'Functional Assessment', desc: 'تقييم القدرات الوظيفية الشامل', color: '#00838f' },
  { id: 'therapy-referral-form', name: 'نموذج تحويل علاجي', nameEn: 'Therapy Referral Form', desc: 'تحويل حالة بين التخصصات العلاجية', color: '#5d4037' },
  { id: 'outcome-measure-report', name: 'تقرير مقاييس النتائج', nameEn: 'Outcome Measures Report', desc: 'تقرير مقاييس النتائج العلاجية', color: '#455a64' },
];

export const AdvancedTherapyTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'mdt-meeting-minutes':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="محضر اجتماع الفريق متعدد التخصصات" subtitle="MDT Meeting Minutes" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="رقم الملف" value={d.fileNo} w="12%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="الحضور">
              <EmptyTable cols={4} rows={6} headers={['الاسم', 'التخصص', 'التوصية', 'التوقيع']} />
            </Section>
            <NotesBox label="ملخص الحالة" value={d.caseSummary} lines={3} />
            <NotesBox label="القرارات والتوصيات" value={d.decisions} lines={3} />
            <div style={fieldRow}><Field label="الاجتماع القادم" value={formatDate(d.nextMeeting)} w="15%" /></div>
            <SignatureBlock rightLabel="رئيس الفريق" leftLabel="المنسق" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'therapy-progress-note':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملاحظة تقدم علاجي" subtitle="Therapy Progress Note (SOAP)" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="المعالج" value={d.therapist} w="20%" /><Field label="التخصص" value={d.specialty} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <div style={fieldRow}><Field label="رقم الجلسة" value={d.sessionNo} w="10%" /><Field label="المدة" value={d.duration} w="10%" /></div>
            <NotesBox label="S - الشكوى الذاتية" value={d.subjective} lines={2} />
            <NotesBox label="O - الملاحظة الموضوعية" value={d.objective} lines={2} />
            <NotesBox label="A - التقييم" value={d.assessment} lines={2} />
            <NotesBox label="P - الخطة" value={d.plan} lines={2} />
            <SignatureBlock rightLabel="المعالج" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'sensory-integration-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة علاج التكامل الحسي" subtitle="Sensory Integration Therapy Plan" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="العمر" value={d.age} w="8%" /><Field label="المعالج الوظيفي" value={d.therapist} w="20%" /></div>
            <Section title="الملف الحسي">
              <EmptyTable cols={4} rows={7} headers={['النظام الحسي', 'فرط استجابة', 'ضعف استجابة', 'ملاحظات']} />
            </Section>
            <NotesBox label="الأهداف" value={d.goals} lines={3} />
            <NotesBox label="الأنشطة والتقنيات" value={d.activities} lines={3} />
            <div style={fieldRow}><Field label="التكرار" value={d.frequency} w="12%" /><Field label="مدة الخطة" value={d.planDuration} w="12%" /></div>
            <SignatureBlock rightLabel="المعالج الوظيفي" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'assistive-tech-assessment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقييم الحاجة للتقنيات المساعدة" subtitle="Assistive Technology Assessment" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="العمر" value={d.age} w="8%" /><Field label="التشخيص" value={d.diagnosis} w="25%" /></div>
            <NotesBox label="القدرات الحالية" value={d.currentAbilities} lines={2} />
            <NotesBox label="التحديات والعوائق" value={d.challenges} lines={2} />
            <Section title="التقنيات المقترحة">
              <EmptyTable cols={5} rows={5} headers={['الجهاز/التقنية', 'الغرض', 'الأولوية', 'التكلفة', 'المورد']} />
            </Section>
            <NotesBox label="التوصية النهائية" value={d.recommendation} lines={2} />
            <SignatureBlock rightLabel="أخصائي التقنيات" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'hydrotherapy-session':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل جلسة العلاج المائي" subtitle="Hydrotherapy Session Record" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="المعالج" value={d.therapist} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <div style={fieldRow}><Field label="درجة حرارة الماء" value={d.waterTemp} w="12%" /><Field label="المدة" value={d.duration} w="10%" /><Field label="مستوى المقاومة" value={d.resistance} w="12%" /></div>
            <Section title="التمارين المنفذة">
              <EmptyTable cols={4} rows={6} headers={['التمرين', 'التكرار', 'الاستجابة', 'ملاحظات']} />
            </Section>
            <NotesBox label="العلامات الحيوية (قبل/بعد)" value={d.vitals} lines={1} />
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="المعالج" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'art-therapy-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة العلاج بالفن والتعبير" subtitle="Art Therapy Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="العمر" value={d.age} w="8%" /><Field label="المعالج" value={d.therapist} w="20%" /></div>
            <NotesBox label="الأهداف العلاجية" value={d.goals} lines={2} />
            <Section title="الأنشطة الفنية المخططة">
              <EmptyTable cols={4} rows={6} headers={['النشاط', 'الأدوات', 'الهدف', 'المدة']} />
            </Section>
            <NotesBox label="ملاحظات المعالج" value={d.notes} lines={2} />
            <div style={fieldRow}><Field label="التكرار" value={d.frequency} w="12%" /><Field label="مدة الخطة" value={d.planDuration} w="12%" /></div>
            <SignatureBlock rightLabel="المعالج بالفن" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'music-therapy-session':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل جلسة العلاج بالموسيقى" subtitle="Music Therapy Session Record" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="المعالج" value={d.therapist} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="رقم الجلسة" value={d.sessionNo} w="10%" /></div>
            <Section title="الأنشطة الموسيقية">
              <EmptyTable cols={4} rows={5} headers={['النشاط', 'الأداة', 'استجابة المستفيد', 'ملاحظات']} />
            </Section>
            <NotesBox label="التقييم" value={d.assessment} lines={2} />
            <NotesBox label="الخطة للجلسة القادمة" value={d.nextPlan} lines={1} />
            <SignatureBlock rightLabel="المعالج بالموسيقى" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'aba-data-sheet':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ورقة جمع بيانات تحليل السلوك التطبيقي" subtitle="ABA Data Collection Sheet" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="المعالج" value={d.therapist} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <div style={fieldRow}><Field label="السلوك المستهدف" value={d.targetBehavior} w="30%" /><Field label="التعريف الإجرائي" value={d.definition} w="30%" /></div>
            <Section title="تسجيل البيانات">
              <EmptyTable cols={6} rows={8} headers={['الوقت', 'المثير', 'السلوك', 'النتيجة', 'المدة', 'الشدة']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي التكرار" value={d.totalFrequency} w="12%" /><Field label="النسبة" value={d.percentage} w="10%" /></div>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="محلل السلوك" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'feeding-therapy-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة علاج صعوبات التغذية والبلع" subtitle="Feeding Therapy Plan" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="العمر" value={d.age} w="8%" /><Field label="المعالج" value={d.therapist} w="20%" /></div>
            <NotesBox label="التقييم الحالي" value={d.currentAssessment} lines={2} />
            <Section title="خطة التدخل">
              <EmptyTable cols={4} rows={6} headers={['الهدف', 'التقنية', 'قوام الطعام', 'التكرار']} />
            </Section>
            <NotesBox label="احتياطات السلامة" value={d.safetyPrecautions} lines={2} />
            <NotesBox label="تعليمات لولي الأمر" value={d.parentInstructions} lines={2} />
            <SignatureBlock rightLabel="أخصائي البلع" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'splinting-orthotics-rx':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="وصفة جبائر وأجهزة تعويضية" subtitle="Splinting & Orthotics Prescription" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="العمر" value={d.age} w="8%" /><Field label="التشخيص" value={d.diagnosis} w="25%" /></div>
            <Section title="الجهاز الموصوف">
              <div style={fieldRow}><Field label="النوع" value={d.deviceType} w="20%" /><Field label="الموضع" value={d.bodyPart} w="15%" /><Field label="المواصفات" value={d.specs} w="30%" /></div>
            </Section>
            <NotesBox label="الغرض" value={d.purpose} lines={1} />
            <NotesBox label="جدول الاستخدام" value={d.wearSchedule} lines={1} />
            <NotesBox label="تعليمات العناية" value={d.careInstructions} lines={2} />
            <div style={fieldRow}><Field label="موعد المتابعة" value={formatDate(d.followUp)} w="15%" /></div>
            <SignatureBlock rightLabel="المعالج" leftLabel="الطبيب المعالج" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'therapy-discharge-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص الخروج من البرنامج العلاجي" subtitle="Therapy Discharge Summary" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="التشخيص" value={d.diagnosis} w="20%" /><Field label="تاريخ القبول" value={formatDate(d.admissionDate)} w="15%" /><Field label="تاريخ الخروج" value={formatDate(d.dischargeDate)} w="15%" /></div>
            <NotesBox label="ملخص العلاج" value={d.treatmentSummary} lines={3} />
            <Section title="الأهداف والنتائج">
              <EmptyTable cols={4} rows={5} headers={['الهدف', 'الحالة عند القبول', 'الحالة عند الخروج', 'التحقق']} />
            </Section>
            <NotesBox label="توصيات ما بعد الخروج" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="المعالج" leftLabel="مدير البرنامج" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'home-exercise-program':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="برنامج التمارين المنزلية" subtitle="Home Exercise Program (HEP)" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="المعالج" value={d.therapist} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="التمارين المطلوبة">
              <EmptyTable cols={5} rows={8} headers={['التمرين', 'الشرح', 'التكرار', 'المدة', 'التكرار/أسبوع']} />
            </Section>
            <NotesBox label="تعليمات مهمة" value={d.instructions} lines={2} />
            <NotesBox label="احتياطات" value={d.precautions} lines={1} />
            <div style={fieldRow}><Field label="موعد المتابعة" value={formatDate(d.followUp)} w="15%" /></div>
            <SignatureBlock rightLabel="المعالج" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'group-therapy-record':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل جلسة علاج جماعية" subtitle="Group Therapy Session Record" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="اسم المجموعة" value={d.groupName} w="20%" /><Field label="المعالج" value={d.therapist} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="رقم الجلسة" value={d.sessionNo} w="10%" /></div>
            <Section title="المشاركون">
              <EmptyTable cols={4} rows={6} headers={['المستفيد', 'الحضور', 'المشاركة', 'ملاحظات']} />
            </Section>
            <NotesBox label="النشاط المنفذ" value={d.activity} lines={2} />
            <NotesBox label="التقييم العام" value={d.assessment} lines={2} />
            <SignatureBlock rightLabel="المعالج" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'functional-assessment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقييم القدرات الوظيفية الشامل" subtitle="Comprehensive Functional Assessment" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="العمر" value={d.age} w="8%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="المقيّم" value={d.assessor} w="20%" /></div>
            <Section title="أنشطة الحياة اليومية (ADL)">
              <EmptyTable cols={4} rows={6} headers={['النشاط', 'مستقل', 'بمساعدة', 'معتمد']} />
            </Section>
            <Section title="المهارات الحركية">
              <EmptyTable cols={4} rows={5} headers={['المهارة', 'مستقل', 'بمساعدة', 'معتمد']} />
            </Section>
            <NotesBox label="التقييم والتوصيات" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="المقيّم" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'therapy-referral-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تحويل بين التخصصات العلاجية" subtitle="Therapy Referral Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="من تخصص" value={d.fromSpecialty} w="15%" /><Field label="إلى تخصص" value={d.toSpecialty} w="15%" /></div>
            <div style={fieldRow}><Field label="المحوّل" value={d.referredBy} w="20%" /><Field label="الأولوية" value={d.priority} w="10%" /></div>
            <NotesBox label="سبب التحويل" value={d.reason} lines={2} />
            <NotesBox label="معلومات إضافية" value={d.additionalInfo} lines={2} />
            <SignatureBlock rightLabel="المحوّل" leftLabel="المستقبل" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'outcome-measure-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير مقاييس النتائج العلاجية" subtitle="Therapy Outcome Measures Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="البرنامج" value={d.program} w="20%" /><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="مقاييس النتائج">
              <EmptyTable cols={5} rows={6} headers={['المقياس', 'القياس الأولي', 'القياس الحالي', 'التغيير', 'الهدف']} />
            </Section>
            <NotesBox label="التحليل" value={d.analysis} lines={2} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="المعالج" leftLabel="مدير البرنامج" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
