/**
 * قوالب طباعة العلاج والتأهيل — Therapy & Rehabilitation Print Templates
 * 8 نماذج: تقرير جلسة، خطة تأهيلية، تقييم، إذن علاج، تقدم علاجي،
 *          ملخص فريق متعدد، إحالة، تقرير خروج
 */
import { Box, Typography, Grid } from '@mui/material';
import {
  OrgHeader, OrgFooter, SignatureBlock, StampCircle, Section, Field,
  fieldRow, bodyPad, pageWrapper, formatDate,
  RefDateLine, NotesBox, PrintTable, EmptyTable, ConfidentialBanner, DeclarationBox,
} from '../shared/PrintTemplateShared';

export const THERAPY_TEMPLATES = [
  { id: 'session-report', name: 'تقرير جلسة علاجية', nameEn: 'Therapy Session Report', desc: 'تقرير تفصيلي عن جلسة علاج فردية أو جماعية', color: '#7b1fa2' },
  { id: 'rehab-plan', name: 'الخطة التأهيلية الفردية', nameEn: 'Individual Rehab Plan (IEP)', desc: 'خطة تأهيلية شاملة للمستفيد مع الأهداف والتدخلات', color: '#0277bd' },
  { id: 'assessment', name: 'تقرير التقييم', nameEn: 'Assessment Report', desc: 'تقرير تقييم أولي أو دوري شامل', color: '#00695c' },
  { id: 'treatment-auth', name: 'إذن علاج', nameEn: 'Treatment Authorization', desc: 'نموذج موافقة ولي الأمر على الخطة العلاجية', color: '#d84315' },
  { id: 'progress-report', name: 'تقرير التقدم العلاجي', nameEn: 'Therapy Progress Report', desc: 'تقرير متابعة دوري لتقدم المستفيد', color: '#2e7d32' },
  { id: 'mdt-summary', name: 'ملخص الفريق متعدد التخصصات', nameEn: 'MDT Meeting Summary', desc: 'ملخص اجتماع الفريق متعدد التخصصات وتوصياته', color: '#e65100' },
  { id: 'referral', name: 'خطاب إحالة', nameEn: 'Referral Letter', desc: 'خطاب إحالة إلى جهة أو تخصص آخر', color: '#1565c0' },
  { id: 'discharge-report', name: 'تقرير الخروج', nameEn: 'Discharge Report', desc: 'تقرير ملخص عند خروج المستفيد من البرنامج', color: '#37474f' },
];

export const TherapyTemplateRenderer = ({ templateId, data }) => {
  const d = data || {};
  switch (templateId) {
    case 'session-report': return <SessionReport d={d} />;
    case 'rehab-plan': return <RehabPlan d={d} />;
    case 'assessment': return <AssessmentReport d={d} />;
    case 'treatment-auth': return <TreatmentAuth d={d} />;
    case 'progress-report': return <ProgressReport d={d} />;
    case 'mdt-summary': return <MDTSummary d={d} />;
    case 'referral': return <ReferralLetter d={d} />;
    case 'discharge-report': return <DischargeReport d={d} />;
    default: return <Typography textAlign="center" py={8} color="text.secondary">اختر قالباً</Typography>;
  }
};

/* ═══════ 1. SESSION REPORT ═══════ */
const SessionReport = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="تقرير جلسة علاجية" subtitle="Therapy Session Report" color="#7b1fa2" />
    <Box sx={bodyPad}>
      <ConfidentialBanner />
      <RefDateLine prefix="TSR" />

      <Section title="بيانات المستفيد" color="#7b1fa2" />
      <Box sx={fieldRow}>
        <Field label="اسم المستفيد" value={d.beneficiaryName} flex={2} />
        <Field label="رقم الملف" value={d.fileNo} />
        <Field label="العمر" value={d.age} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="التشخيص" value={d.diagnosis} flex={2} />
        <Field label="القسم" value={d.department} />
      </Box>

      <Section title="بيانات الجلسة" color="#7b1fa2" />
      <Box sx={fieldRow}>
        <Field label="نوع العلاج" value={d.therapyType || '□ طبيعي □ وظيفي □ نطق □ سلوكي □ نفسي □ أخرى'} flex={2} />
        <Field label="رقم الجلسة" value={d.sessionNo} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="التاريخ" value={formatDate(d.sessionDate)} />
        <Field label="الوقت" value={d.sessionTime || '___:___ — ___:___'} />
        <Field label="المدة (دقيقة)" value={d.duration} />
        <Field label="نوع الجلسة" value={d.sessionType || '□ فردية □ جماعية'} />
      </Box>

      <Section title="أهداف الجلسة" color="#7b1fa2" />
      <NotesBox content={d.objectives} lines={3} />

      <Section title="الأنشطة والتدخلات المنفذة" color="#7b1fa2" />
      <NotesBox content={d.activities} lines={4} />

      <Section title="استجابة المستفيد" color="#7b1fa2" />
      <Box sx={fieldRow}>
        <Field label="مستوى التعاون" value={d.cooperation || '□ ممتاز □ جيد □ متوسط □ ضعيف'} flex={2} />
        <Field label="الحالة المزاجية" value={d.mood || '□ مستقر □ منزعج □ متقلب'} />
      </Box>
      <NotesBox content={d.response} lines={3} />

      <Section title="التوصيات والخطة القادمة" color="#7b1fa2" />
      <NotesBox content={d.recommendations} lines={3} />

      <SignatureBlock signatures={['المعالج', 'المشرف']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 2. REHAB PLAN (IEP) ═══════ */
const RehabPlan = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="الخطة التأهيلية الفردية" subtitle="Individual Education/Rehab Plan (IEP)" color="#0277bd" />
    <Box sx={bodyPad}>
      <ConfidentialBanner />
      <RefDateLine prefix="IEP" />

      <Section title="بيانات المستفيد" color="#0277bd" />
      <Box sx={fieldRow}>
        <Field label="اسم المستفيد" value={d.name} flex={2} />
        <Field label="رقم الملف" value={d.fileNo} />
        <Field label="العمر" value={d.age} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="التشخيص" value={d.diagnosis} flex={2} />
        <Field label="تاريخ القبول" value={formatDate(d.admissionDate)} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="مدة الخطة" value={d.planDuration || '□ 3 أشهر □ 6 أشهر □ سنة'} />
        <Field label="تاريخ البدء" value={formatDate(d.startDate)} />
        <Field label="تاريخ المراجعة" value={formatDate(d.reviewDate)} />
      </Box>

      <Section title="نقاط القوة والاحتياجات" color="#0277bd" />
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Typography variant="subtitle2" fontWeight="bold" mb={1}>نقاط القوة</Typography>
          <NotesBox lines={4} />
        </Grid>
        <Grid item xs={6}>
          <Typography variant="subtitle2" fontWeight="bold" mb={1}>الاحتياجات</Typography>
          <NotesBox lines={4} />
        </Grid>
      </Grid>

      <Section title="الأهداف والتدخلات" color="#0277bd" />
      <EmptyTable headers={[
        { label: 'م', width: 30 }, 'المجال', 'الهدف طويل المدى', 'الأهداف قصيرة المدى',
        'التدخلات', { label: 'المسؤول' }, { label: 'المعيار' }
      ]} rowCount={6} headerBg="#e1f5fe" />

      <Section title="الخدمات المقدمة" color="#0277bd" />
      <PrintTable headers={['الخدمة', 'عدد الجلسات/الأسبوع', 'المدة', 'المقدم', 'ملاحظات']} headerBg="#e1f5fe"
        rows={[
          ['علاج طبيعي', '', '', '', ''],
          ['علاج وظيفي', '', '', '', ''],
          ['علاج نطق ولغة', '', '', '', ''],
          ['علاج سلوكي', '', '', '', ''],
          ['تعليم خاص', '', '', '', ''],
          ['خدمة نفسية', '', '', '', ''],
          ['خدمة اجتماعية', '', '', '', ''],
        ]} />

      <DeclarationBox text="تم مناقشة هذه الخطة مع ولي الأمر وتم الحصول على موافقته." />
      <SignatureBlock signatures={['منسق الفريق', 'ولي الأمر', 'مدير البرنامج']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 3. ASSESSMENT REPORT ═══════ */
const AssessmentReport = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="تقرير التقييم" subtitle="Assessment Report" color="#00695c" />
    <Box sx={bodyPad}>
      <ConfidentialBanner />
      <RefDateLine prefix="ASR" />

      <Section title="بيانات المستفيد" color="#00695c" />
      <Box sx={fieldRow}>
        <Field label="الاسم" value={d.name} flex={2} />
        <Field label="رقم الملف" value={d.fileNo} />
        <Field label="تاريخ الميلاد" value={formatDate(d.dob)} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="التشخيص" value={d.diagnosis} flex={2} />
        <Field label="الجنس" value={d.gender} />
        <Field label="تاريخ التقييم" value={formatDate(d.assessmentDate)} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="نوع التقييم" value={d.assessmentType || '□ أولي □ دوري □ نهائي'} />
        <Field label="المقيّم" value={d.assessor} flex={2} />
      </Box>

      <Section title="أدوات التقييم المستخدمة" color="#00695c" />
      <NotesBox content={d.tools} lines={3} />

      <Section title="النتائج" color="#00695c" />
      <EmptyTable headers={[
        'المجال', { label: 'المستوى الحالي', width: 120 },
        { label: 'المستوى المتوقع', width: 120 }, 'ملاحظات'
      ]} rowCount={8} headerBg="#e0f2f1" />

      <Section title="الملاحظات السلوكية" color="#00695c" />
      <NotesBox content={d.behavioralNotes} lines={4} />

      <Section title="التوصيات" color="#00695c" />
      <NotesBox content={d.recommendations} lines={4} />

      <Section title="الخلاصة" color="#00695c" />
      <NotesBox content={d.summary} lines={3} />

      <SignatureBlock signatures={['المقيّم', 'المشرف', 'مدير البرنامج']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 4. TREATMENT AUTHORIZATION ═══════ */
const TreatmentAuth = ({ d }) => (
  <Box sx={{ ...pageWrapper, border: '2px solid #d84315' }}>
    <OrgHeader title="إذن علاج / موافقة ولي الأمر" subtitle="Treatment Authorization / Consent" color="#d84315" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="TA" />

      <Section title="بيانات المستفيد" color="#d84315" />
      <Box sx={fieldRow}>
        <Field label="اسم المستفيد" value={d.beneficiaryName} flex={2} />
        <Field label="رقم الملف" value={d.fileNo} />
        <Field label="العمر" value={d.age} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="التشخيص" value={d.diagnosis} flex={2} />
        <Field label="القسم" value={d.department} />
      </Box>

      <Section title="بيانات ولي الأمر" color="#d84315" />
      <Box sx={fieldRow}>
        <Field label="اسم ولي الأمر" value={d.guardianName} flex={2} />
        <Field label="صلة القرابة" value={d.relation} />
        <Field label="رقم الهوية" value={d.guardianId} />
      </Box>
      <Box sx={fieldRow}><Field label="الجوال" value={d.guardianPhone} /></Box>

      <Section title="وصف الخطة العلاجية" color="#d84315" />
      <NotesBox content={d.treatmentPlan} minHeight={80} />

      <Section title="المخاطر المحتملة" color="#d84315" />
      <NotesBox content={d.risks} lines={3} />

      <DeclarationBox text={`أنا الموقع أدناه ${d.guardianName || '________________'} ولي أمر المستفيد ${d.beneficiaryName || '________________'} أقر بأنني اطلعت على الخطة العلاجية المقترحة وفهمت المخاطر المحتملة وأوافق على تنفيذها. كما أتعهد بالالتزام بتعليمات الفريق العلاجي ومتابعة البرنامج وفقاً للجدول المحدد.`} />

      <SignatureBlock signatures={['ولي الأمر', 'الطبيب المعالج', 'مدير البرنامج']} />
      <StampCircle />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 5. PROGRESS REPORT ═══════ */
const ProgressReport = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="تقرير التقدم العلاجي" subtitle="Therapy Progress Report" color="#2e7d32" />
    <Box sx={bodyPad}>
      <ConfidentialBanner />
      <RefDateLine prefix="TPR" />

      <Section title="بيانات المستفيد" color="#2e7d32" />
      <Box sx={fieldRow}>
        <Field label="الاسم" value={d.name} flex={2} />
        <Field label="رقم الملف" value={d.fileNo} />
        <Field label="فترة التقرير" value={d.period} />
      </Box>

      <Section title="متابعة الأهداف" color="#2e7d32" />
      <EmptyTable headers={[
        { label: 'م', width: 30 }, 'الهدف', 'مستوى الأداء',
        { label: 'نسبة التحقق', center: true, width: 90 }, 'ملاحظات'
      ]} rowCount={6} headerBg="#e8f5e9" />

      <Section title="ملخص التقدم" color="#2e7d32" />
      <NotesBox content={d.progressSummary} minHeight={60} />

      <Section title="التحديات" color="#c62828" />
      <NotesBox content={d.challenges} lines={3} />

      <Section title="التوصيات للفترة القادمة" color="#2e7d32" />
      <NotesBox content={d.nextSteps} lines={3} />

      <Box sx={fieldRow}>
        <Field label="التقييم العام" value={d.overallRating || '□ ممتاز □ جيد □ متوسط □ محدود □ لا تقدم'} flex={2} />
        <Field label="الموعد القادم" value={formatDate(d.nextAppointment)} />
      </Box>

      <SignatureBlock signatures={['المعالج', 'المشرف', 'ولي الأمر (للعلم)']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 6. MDT SUMMARY ═══════ */
const MDTSummary = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="ملخص اجتماع الفريق متعدد التخصصات" subtitle="Multidisciplinary Team (MDT) Meeting Summary" color="#e65100" />
    <Box sx={bodyPad}>
      <ConfidentialBanner />
      <RefDateLine prefix="MDT" />

      <Box sx={fieldRow}>
        <Field label="اسم المستفيد" value={d.beneficiaryName} flex={2} />
        <Field label="رقم الملف" value={d.fileNo} />
        <Field label="تاريخ الاجتماع" value={formatDate(d.meetingDate)} />
      </Box>

      <Section title="أعضاء الفريق الحاضرون" color="#e65100" />
      <PrintTable headers={['م', 'الاسم', 'التخصص', 'التوقيع']} headerBg="#fff3e0"
        rows={[
          ['1', d.member1 || '', d.spec1 || 'طبيب', ''],
          ['2', d.member2 || '', d.spec2 || 'علاج طبيعي', ''],
          ['3', d.member3 || '', d.spec3 || 'علاج وظيفي', ''],
          ['4', d.member4 || '', d.spec4 || 'نطق ولغة', ''],
          ['5', d.member5 || '', d.spec5 || 'أخصائي نفسي', ''],
          ['6', d.member6 || '', d.spec6 || 'أخصائي اجتماعي', ''],
          ['7', d.member7 || '', d.spec7 || 'معلم تربية خاصة', ''],
        ]} />

      <Section title="ملخص الحالة الحالية" color="#e65100" />
      <NotesBox content={d.currentStatus} minHeight={60} />

      <Section title="تقارير التخصصات" color="#e65100" />
      <EmptyTable headers={['التخصص', 'الملاحظات', 'التوصيات']} rowCount={6} headerBg="#fff3e0" />

      <Section title="القرارات والتوصيات" color="#e65100" />
      <NotesBox content={d.decisions} minHeight={60} />

      <Box sx={fieldRow}>
        <Field label="موعد المتابعة القادم" value={formatDate(d.nextMeeting)} />
        <Field label="منسق الفريق" value={d.coordinator} flex={2} />
      </Box>
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 7. REFERRAL LETTER ═══════ */
const ReferralLetter = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="خطاب إحالة" subtitle="Referral Letter" />
    <Box sx={bodyPad}>
      <ConfidentialBanner text="سري طبي — Medical Confidential" />
      <RefDateLine prefix="REF" />

      <Typography variant="body1" fontWeight="bold" mb={1}>إلى: {d.referredTo || '________________________________'}</Typography>
      <Typography variant="body1" mb={2}>تحية طيبة وبعد،</Typography>
      <Typography variant="body1" sx={{ lineHeight: 2.2 }}>
        نحيل إليكم المستفيد / المستفيدة: <strong>{d.beneficiaryName || '________________'}</strong>
        <br />رقم الملف: <strong>{d.fileNo || '________'}</strong>، العمر: <strong>{d.age || '___'}</strong>{d.gender ? `، الجنس: ${d.gender}` : ''}
        <br />التشخيص: <strong>{d.diagnosis || '________________________________'}</strong>
      </Typography>

      <Section title="سبب الإحالة" />
      <NotesBox content={d.reason} minHeight={60} />

      <Section title="ملخص الحالة والخدمات المقدمة" />
      <NotesBox content={d.summary} minHeight={80} />

      <Section title="التوصيات" />
      <NotesBox content={d.recommendations} lines={4} />

      <Typography variant="body1" mt={2}>نرجو التكرم بالاطلاع وإفادتنا بتقريركم.</Typography>
      <Typography variant="body1">وتفضلوا بقبول فائق الاحترام والتقدير.</Typography>

      <SignatureBlock signatures={['الطبيب المعالج', 'مدير البرنامج']} />
      <StampCircle />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 8. DISCHARGE REPORT ═══════ */
const DischargeReport = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="تقرير الخروج" subtitle="Discharge Report" color="#37474f" />
    <Box sx={bodyPad}>
      <ConfidentialBanner />
      <RefDateLine prefix="DSC" />

      <Section title="بيانات المستفيد" color="#37474f" />
      <Box sx={fieldRow}>
        <Field label="الاسم" value={d.name} flex={2} />
        <Field label="رقم الملف" value={d.fileNo} />
        <Field label="التشخيص" value={d.diagnosis} flex={2} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="تاريخ القبول" value={formatDate(d.admissionDate)} />
        <Field label="تاريخ الخروج" value={formatDate(d.dischargeDate)} />
        <Field label="مدة البرنامج" value={d.duration} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="سبب الخروج" value={d.dischargeReason || '□ إتمام البرنامج □ بطلب ولي الأمر □ أخرى'} flex={3} />
      </Box>

      <Section title="ملخص الخدمات المقدمة" color="#37474f" />
      <PrintTable headers={['الخدمة', 'عدد الجلسات', 'الإنجازات الرئيسية']} headerBg="#eceff1"
        rows={[
          ['علاج طبيعي', '', ''],
          ['علاج وظيفي', '', ''],
          ['علاج نطق ولغة', '', ''],
          ['علاج سلوكي/نفسي', '', ''],
          ['تعليم خاص', '', ''],
          ['خدمة اجتماعية', '', ''],
        ]} />

      <Section title="مستوى الأداء عند الخروج" color="#37474f" />
      <EmptyTable headers={['المجال', 'عند القبول', 'عند الخروج', 'التغيير']} rowCount={6} headerBg="#eceff1" />

      <Section title="التوصيات بعد الخروج" color="#37474f" />
      <NotesBox content={d.postDischargeRec} minHeight={60} />

      <Section title="الأدوية / الأجهزة المساعدة" color="#37474f" />
      <NotesBox content={d.medications} lines={3} />

      <Section title="مواعيد المتابعة" color="#37474f" />
      <EmptyTable headers={['التخصص', 'التاريخ', 'المكان', 'ملاحظات']} rowCount={3} headerBg="#eceff1" />

      <DeclarationBox text="أقر بأنني استلمت تقرير الخروج وفهمت التوصيات الواردة فيه وأتعهد بمتابعتها." />
      <SignatureBlock signatures={['الطبيب المعالج', 'منسق الفريق', 'ولي الأمر', 'مدير البرنامج']} />
      <OrgFooter />
    </Box>
  </Box>
);

export default TherapyTemplateRenderer;
