/**
 * قوالب التدخل المبكر والدعم النفسي والحياة المستقلة
 * Early Intervention, MHPSS & Independent Living Print Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const EARLY_MHPSS_TEMPLATES = [
  /* ── التدخل المبكر ── */
  { id: 'ei-referral', name: 'إحالة تدخل مبكر', nameEn: 'Early Intervention Referral', desc: 'نموذج إحالة للتدخل المبكر', color: '#e65100' },
  { id: 'ei-assessment', name: 'تقييم تدخل مبكر', nameEn: 'EI Assessment Report', desc: 'تقرير تقييم التدخل المبكر (0-3)', color: '#ef6c00' },
  { id: 'ifsp-plan', name: 'خطة خدمات أسرية', nameEn: 'IFSP Plan', desc: 'خطة الخدمات الأسرية الفردية', color: '#f57c00' },
  { id: 'developmental-checklist', name: 'قائمة مراحل النمو', nameEn: 'Developmental Milestone Checklist', desc: 'قائمة مراحل النمو والتطور', color: '#fb8c00' },
  { id: 'post-rehab-followup', name: 'متابعة ما بعد التأهيل', nameEn: 'Post-Rehab Follow-Up', desc: 'تقرير متابعة ما بعد التأهيل', color: '#ff9800' },
  { id: 'post-rehab-transition', name: 'خطة انتقال', nameEn: 'Post-Rehab Transition Plan', desc: 'خطة الانتقال من التأهيل', color: '#ffa726' },
  { id: 'community-integration', name: 'تقرير دمج مجتمعي', nameEn: 'Community Integration Report', desc: 'تقرير الدمج المجتمعي بعد التأهيل', color: '#ffb74d' },
  { id: 'post-rehab-outcome', name: 'ملخص نتائج', nameEn: 'Post-Rehab Outcome Summary', desc: 'ملخص نتائج ما بعد التأهيل', color: '#e65100' },
  /* ── الدعم النفسي MHPSS ── */
  { id: 'mh-assessment', name: 'تقييم صحة نفسية', nameEn: 'Mental Health Assessment', desc: 'تقرير تقييم الصحة النفسية', color: '#1565c0' },
  { id: 'psychosocial-plan', name: 'خطة دعم نفسي', nameEn: 'Psychosocial Support Plan', desc: 'خطة الدعم النفسي والاجتماعي', color: '#1976d2' },
  { id: 'mhpss-progress', name: 'تقدم جلسة MHPSS', nameEn: 'MHPSS Session Note', desc: 'ملاحظة تقدم جلسة MHPSS', color: '#1e88e5' },
  /* ── الحياة المستقلة ── */
  { id: 'il-skills-assessment', name: 'تقييم مهارات حياتية', nameEn: 'IL Skills Assessment', desc: 'تقييم مهارات الحياة المستقلة', color: '#2e7d32' },
  { id: 'il-plan', name: 'خطة حياة مستقلة', nameEn: 'Independent Living Plan', desc: 'خطة الحياة المستقلة', color: '#388e3c' },
  { id: 'supported-housing', name: 'تقرير سكن مدعوم', nameEn: 'Supported Housing Report', desc: 'تقرير السكن المدعوم', color: '#43a047' },
  { id: 'adl-assessment', name: 'تقييم أنشطة يومية', nameEn: 'ADL Assessment Form', desc: 'تقييم أنشطة الحياة اليومية', color: '#4caf50' },
  { id: 'il-progress', name: 'تقدم الحياة المستقلة', nameEn: 'IL Progress Report', desc: 'تقرير تقدم الحياة المستقلة', color: '#66bb6a' },
];

export const EarlyMHPSSTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'ei-referral':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج إحالة للتدخل المبكر" subtitle="Early Intervention Referral Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الطفل">
              <div style={fieldRow}><Field label="الاسم" value={d.childName} w="35%" /><Field label="تاريخ الميلاد" value={formatDate(d.dob)} w="20%" /><Field label="العمر بالأشهر" value={d.ageMonths} w="15%" /><Field label="الجنس" value={d.gender} w="15%" /></div>
            </Section>
            <Section title="بيانات ولي الأمر">
              <div style={fieldRow}><Field label="الاسم" value={d.guardianName} w="35%" /><Field label="الجوال" value={d.phone} w="25%" /><Field label="القرابة" value={d.relation} w="20%" /></div>
            </Section>
            <Section title="بيانات الإحالة">
              <div style={fieldRow}><Field label="جهة الإحالة" value={d.referralSource} w="35%" /><Field label="المُحيل" value={d.referrer} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            </Section>
            <NotesBox label="سبب الإحالة" value={d.reason} lines={3} />
            <NotesBox label="مخاوف النمو" value={d.developmentalConcerns} lines={3} />
            <NotesBox label="التاريخ الطبي المختصر" value={d.medicalHistory} lines={2} />
            <SignatureBlock rightLabel="المُحيل" leftLabel="منسق التدخل المبكر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'ei-assessment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تقييم التدخل المبكر (0-3)" subtitle="Early Intervention Assessment Report" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطفل" value={d.childName} w="30%" /><Field label="العمر" value={d.age} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="المقيّم" value={d.assessor} w="35%" /></div>
            <Section title="مجالات النمو">
              <EmptyTable cols={5} rows={6} headers={['المجال', 'العمر الفعلي', 'العمر النمائي', 'النسبة %', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات الوالدين" value={d.parentNotes} lines={2} />
            <NotesBox label="النتائج والتوصيات" value={d.recommendations} lines={4} />
            <div style={fieldRow}><Field label="مؤهل للخدمات" value={d.eligible} w="30%" /><Field label="البرنامج المقترح" value={d.proposedProgram} w="40%" /><Field label="الأولوية" value={d.priority} w="30%" /></div>
            <SignatureBlock rightLabel="المقيّم" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'ifsp-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة الخدمات الأسرية الفردية (IFSP)" subtitle="Individualized Family Service Plan" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطفل" value={d.childName} w="30%" /><Field label="تاريخ الميلاد" value={formatDate(d.dob)} w="20%" /><Field label="تاريخ الخطة" value={formatDate(d.planDate) || today()} w="20%" /><Field label="المنسق" value={d.coordinator} w="30%" /></div>
            <Section title="اهتمامات وأولويات الأسرة">
              <NotesBox label="" value={d.familyPriorities} lines={3} />
            </Section>
            <Section title="مستوى الأداء الحالي">
              <EmptyTable cols={3} rows={5} headers={['المجال النمائي', 'المستوى الحالي', 'الملاحظات']} />
            </Section>
            <Section title="النتائج والأهداف">
              <EmptyTable cols={5} rows={6} headers={['النتيجة المتوقعة', 'الخدمة', 'مقدم الخدمة', 'التكرار', 'المكان']} />
            </Section>
            <div style={fieldRow}><Field label="تاريخ المراجعة" value={formatDate(d.reviewDate)} w="30%" /><Field label="خطة الانتقال" value={d.transitionPlan} w="70%" /></div>
            <SignatureBlock rightLabel="الأسرة" leftLabel="منسق الخطة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'developmental-checklist':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="قائمة مراحل النمو والتطور" subtitle="Developmental Milestone Checklist" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطفل" value={d.childName} w="30%" /><Field label="العمر بالأشهر" value={d.ageMonths} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="المقيّم" value={d.assessor} w="30%" /></div>
            <Section title="المهارات الحركية الكبرى">
              <EmptyTable cols={4} rows={5} headers={['المهارة', 'العمر المتوقع', 'متحقق', 'ملاحظات']} />
            </Section>
            <Section title="المهارات الحركية الدقيقة">
              <EmptyTable cols={4} rows={5} headers={['المهارة', 'العمر المتوقع', 'متحقق', 'ملاحظات']} />
            </Section>
            <Section title="اللغة والتواصل">
              <EmptyTable cols={4} rows={5} headers={['المهارة', 'العمر المتوقع', 'متحقق', 'ملاحظات']} />
            </Section>
            <Section title="المهارات الاجتماعية والعاطفية">
              <EmptyTable cols={4} rows={5} headers={['المهارة', 'العمر المتوقع', 'متحقق', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملخص" value={d.summary} lines={3} />
            <SignatureBlock rightLabel="المقيّم" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'post-rehab-followup':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير متابعة ما بعد التأهيل" subtitle="Post-Rehabilitation Follow-Up Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="30%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /><Field label="تاريخ التخرج" value={formatDate(d.graduationDate)} w="20%" /><Field label="تاريخ المتابعة" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="مجالات المتابعة">
              <EmptyTable cols={4} rows={6} headers={['المجال', 'الحالة عند التخرج', 'الحالة الحالية', 'ملاحظات']} />
            </Section>
            <NotesBox label="التحديات الحالية" value={d.challenges} lines={2} />
            <NotesBox label="الدعم المطلوب" value={d.supportNeeded} lines={2} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="أخصائي المتابعة" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'post-rehab-transition':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة الانتقال من التأهيل" subtitle="Post-Rehab Transition Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="30%" /><Field label="البرنامج الحالي" value={d.currentProgram} w="35%" /><Field label="تاريخ التخرج المتوقع" value={formatDate(d.expectedGraduation)} w="35%" /></div>
            <Section title="أهداف الانتقال">
              <EmptyTable cols={4} rows={5} headers={['الهدف', 'الخطوات', 'المسؤول', 'الموعد']} />
            </Section>
            <Section title="الخدمات الانتقالية">
              <EmptyTable cols={4} rows={4} headers={['الخدمة', 'مقدم الخدمة', 'الفترة', 'ملاحظات']} />
            </Section>
            <NotesBox label="دور الأسرة" value={d.familyRole} lines={2} />
            <NotesBox label="الموارد المجتمعية" value={d.communityResources} lines={2} />
            <SignatureBlock rightLabel="فريق التأهيل" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'community-integration':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير الدمج المجتمعي" subtitle="Community Integration Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="30%" /><Field label="تاريخ التخرج" value={formatDate(d.graduationDate)} w="25%" /><Field label="فترة التقرير" value={d.period} w="25%" /><Field label="المتابع" value={d.followUpWorker} w="20%" /></div>
            <Section title="مؤشرات الدمج">
              <EmptyTable cols={4} rows={6} headers={['المؤشر', 'الحالة', 'التقييم', 'ملاحظات']} />
            </Section>
            <NotesBox label="الأنشطة المجتمعية" value={d.activities} lines={2} />
            <NotesBox label="التحديات والحلول" value={d.challengesSolutions} lines={3} />
            <SignatureBlock rightLabel="أخصائي الدمج" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'post-rehab-outcome':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص نتائج ما بعد التأهيل" subtitle="Post-Rehabilitation Outcome Summary" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="30%" /><Field label="البرنامج" value={d.program} w="30%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="مقارنة قبل/بعد">
              <EmptyTable cols={4} rows={6} headers={['المجال', 'عند الدخول', 'عند التخرج', 'نسبة التحسن %']} />
            </Section>
            <div style={fieldRow}><Field label="مستوى الاستقلالية" value={d.independenceLevel} w="33%" /><Field label="رضا الأسرة" value={d.familySatisfaction} w="33%" /><Field label="التقييم العام" value={d.overallRating} w="34%" /></div>
            <NotesBox label="النتائج الإيجابية" value={d.positiveOutcomes} lines={3} />
            <NotesBox label="مجالات التحسين" value={d.improvementAreas} lines={2} />
            <SignatureBlock rightLabel="مدير البرامج" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ MHPSS ══════════════ */
    case 'mh-assessment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تقييم الصحة النفسية" subtitle="Mental Health Assessment Report" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="30%" /><Field label="العمر" value={d.age} w="10%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="الأخصائي النفسي" value={d.psychologist} w="40%" /></div>
            <Section title="التقييم النفسي">
              <EmptyTable cols={4} rows={6} headers={['المحور', 'الأداة المستخدمة', 'النتيجة', 'التفسير']} />
            </Section>
            <NotesBox label="التاريخ النفسي" value={d.psychHistory} lines={3} />
            <NotesBox label="الملاحظات السلوكية" value={d.behavioralNotes} lines={3} />
            <NotesBox label="التشخيص والتوصيات" value={d.diagnosisRecommendations} lines={4} />
            <SignatureBlock rightLabel="الأخصائي النفسي" leftLabel="المشرف السريري" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'psychosocial-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة الدعم النفسي والاجتماعي" subtitle="Psychosocial Support Plan" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="30%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="الأخصائي" value={d.specialist} w="35%" /></div>
            <Section title="التقييم الأولي">
              <div style={fieldRow}><Field label="المشكلة الرئيسية" value={d.mainProblem} w="50%" /><Field label="مستوى الخطورة" value={d.severity} w="25%" /><Field label="مستوى الأداء" value={d.functioning} w="25%" /></div>
            </Section>
            <Section title="أهداف الخطة">
              <EmptyTable cols={4} rows={5} headers={['الهدف', 'نوع التدخل', 'التكرار', 'المسؤول']} />
            </Section>
            <NotesBox label="استراتيجيات التدخل" value={d.strategies} lines={3} />
            <div style={fieldRow}><Field label="مدة الخطة" value={d.duration} w="30%" /><Field label="تاريخ المراجعة" value={formatDate(d.reviewDate)} w="30%" /></div>
            <SignatureBlock rightLabel="الأخصائي" leftLabel="المستفيد/ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'mhpss-progress':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملاحظة تقدم جلسة MHPSS" subtitle="MHPSS Session Progress Note" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="رقم الجلسة" value={d.sessionNo} w="15%" /><Field label="النوع" value={d.sessionType} w="20%" /><Field label="الأخصائي" value={d.specialist} w="25%" /></div>
            <Section title="SOAP Note">
              <NotesBox label="S — الشكوى الذاتية" value={d.subjective} lines={2} />
              <NotesBox label="O — الملاحظات الموضوعية" value={d.objective} lines={2} />
              <NotesBox label="A — التقييم" value={d.assessment} lines={2} />
              <NotesBox label="P — الخطة" value={d.plan} lines={2} />
            </Section>
            <div style={fieldRow}><Field label="الحالة المزاجية" value={d.mood} w="25%" /><Field label="مستوى المخاطر" value={d.riskLevel} w="25%" /><Field label="التعاون" value={d.cooperation} w="25%" /><Field label="الجلسة القادمة" value={formatDate(d.nextSession)} w="25%" /></div>
            <SignatureBlock rightLabel="الأخصائي" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ الحياة المستقلة ══════════════ */
    case 'il-skills-assessment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقييم مهارات الحياة المستقلة" subtitle="Independent Living Skills Assessment" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="30%" /><Field label="العمر" value={d.age} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="المقيّم" value={d.assessor} w="35%" /></div>
            <Section title="مهارات الرعاية الذاتية">
              <EmptyTable cols={5} rows={6} headers={['المهارة', 'مستقل', 'بمساعدة', 'غير قادر', 'ملاحظات']} />
            </Section>
            <Section title="مهارات المنزل">
              <EmptyTable cols={5} rows={5} headers={['المهارة', 'مستقل', 'بمساعدة', 'غير قادر', 'ملاحظات']} />
            </Section>
            <Section title="مهارات التنقل والمجتمع">
              <EmptyTable cols={5} rows={5} headers={['المهارة', 'مستقل', 'بمساعدة', 'غير قادر', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملخص ومستوى الاستقلالية العام" value={d.summary} lines={3} />
            <SignatureBlock rightLabel="المقيّم" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'il-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة الحياة المستقلة" subtitle="Independent Living Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="المنسق" value={d.coordinator} w="25%" /><Field label="المدة" value={d.duration} w="25%" /></div>
            <Section title="الأهداف والتدخلات">
              <EmptyTable cols={5} rows={6} headers={['المجال', 'الهدف', 'التدخل', 'المسؤول', 'المراجعة']} />
            </Section>
            <NotesBox label="الأجهزة المساعدة المطلوبة" value={d.assistiveDevices} lines={2} />
            <NotesBox label="التعديلات البيئية" value={d.environmentalMods} lines={2} />
            <SignatureBlock rightLabel="المنسق" leftLabel="المستفيد/ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'supported-housing':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير السكن المدعوم" subtitle="Supported Housing Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المقيم" value={d.residentName} w="30%" /><Field label="الوحدة" value={d.unit} w="20%" /><Field label="الفترة" value={d.period} w="25%" /><Field label="المشرف" value={d.supervisor} w="25%" /></div>
            <Section title="تقييم مهارات الحياة اليومية">
              <EmptyTable cols={4} rows={6} headers={['المهارة', 'المستوى', 'التقدم', 'ملاحظات']} />
            </Section>
            <NotesBox label="الملاحظات السلوكية" value={d.behavioralNotes} lines={2} />
            <NotesBox label="احتياجات الدعم" value={d.supportNeeds} lines={2} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مشرف السكن" leftLabel="مدير البرامج" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'adl-assessment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقييم أنشطة الحياة اليومية (ADL)" subtitle="Activities of Daily Living Assessment" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="30%" /><Field label="العمر" value={d.age} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="المقيّم" value={d.assessor} w="35%" /></div>
            <Section title="الأنشطة الأساسية (BADL)">
              <EmptyTable cols={5} rows={8} headers={['النشاط', 'مستقل (3)', 'بمساعدة (2)', 'معتمد (1)', 'ملاحظات']} />
            </Section>
            <Section title="الأنشطة الوسيطة (IADL)">
              <EmptyTable cols={5} rows={8} headers={['النشاط', 'مستقل (3)', 'بمساعدة (2)', 'معتمد (1)', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="مجموع BADL" value={d.badlScore} w="25%" /><Field label="مجموع IADL" value={d.iadlScore} w="25%" /><Field label="الدرجة الكلية" value={d.totalScore} w="25%" /><Field label="مستوى الاستقلالية" value={d.independenceLevel} w="25%" /></div>
            <SignatureBlock rightLabel="المقيّم" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'il-progress':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تقدم الحياة المستقلة" subtitle="Independent Living Progress Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="30%" /><Field label="الفترة" value={d.period} w="25%" /><Field label="المنسق" value={d.coordinator} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="تقدم الأهداف">
              <EmptyTable cols={5} rows={6} headers={['الهدف', 'خط الأساس', 'الحالي', 'نسبة التقدم %', 'الحالة']} />
            </Section>
            <NotesBox label="الإنجازات" value={d.achievements} lines={2} />
            <NotesBox label="التحديات" value={d.challenges} lines={2} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="المنسق" leftLabel="مدير البرامج" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
