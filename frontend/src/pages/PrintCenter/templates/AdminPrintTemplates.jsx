/**
 * قوالب طباعة الإدارة والتنظيم — Admin & Organization Print Templates
 * 8 نماذج: قرار إداري، خطاب صادر، مذكرة داخلية، محضر اجتماع،
 *          تفويض صلاحيات، تعميم، إيصال شكوى، تأكيد موعد
 */
import { Box, Typography, Divider, Grid } from '@mui/material';
import {
  OrgHeader, OrgFooter, SignatureBlock, StampCircle, Section, Field,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
  RefDateLine, NotesBox, PrintTable, EmptyTable, ConfidentialBanner,
} from '../shared/PrintTemplateShared';

export const ADMIN_TEMPLATES = [
  { id: 'admin-decision', name: 'قرار إداري', nameEn: 'Administrative Decision', desc: 'قرار إداري رسمي صادر من الإدارة', color: '#1a237e' },
  { id: 'outgoing-letter', name: 'خطاب صادر', nameEn: 'Outgoing Letter', desc: 'خطاب رسمي صادر من المركز', color: '#0d47a1' },
  { id: 'internal-memo', name: 'مذكرة داخلية', nameEn: 'Internal Memo', desc: 'مذكرة تواصل داخلي بين الأقسام', color: '#00695c' },
  { id: 'meeting-minutes', name: 'محضر اجتماع', nameEn: 'Meeting Minutes', desc: 'محضر اجتماع رسمي مع القرارات والتوصيات', color: '#37474f' },
  { id: 'delegation', name: 'تفويض صلاحيات', nameEn: 'Delegation of Authority', desc: 'نموذج تفويض صلاحيات إدارية', color: '#6a1b9a' },
  { id: 'circular', name: 'تعميم', nameEn: 'Circular / Announcement', desc: 'تعميم رسمي لجميع الموظفين أو أقسام محددة', color: '#e65100' },
  { id: 'complaint-receipt', name: 'إيصال شكوى', nameEn: 'Complaint Receipt', desc: 'نموذج استلام وتسجيل شكوى', color: '#c62828' },
  { id: 'appointment-confirm', name: 'تأكيد موعد', nameEn: 'Appointment Confirmation', desc: 'نموذج تأكيد موعد مع المستفيد أو الزائر', color: '#2e7d32' },
];

export const AdminTemplateRenderer = ({ templateId, data }) => {
  const d = data || {};
  switch (templateId) {
    case 'admin-decision': return <AdminDecision d={d} />;
    case 'outgoing-letter': return <OutgoingLetter d={d} />;
    case 'internal-memo': return <InternalMemo d={d} />;
    case 'meeting-minutes': return <MeetingMinutes d={d} />;
    case 'delegation': return <Delegation d={d} />;
    case 'circular': return <Circular d={d} />;
    case 'complaint-receipt': return <ComplaintReceipt d={d} />;
    case 'appointment-confirm': return <AppointmentConfirm d={d} />;
    default: return <Typography textAlign="center" py={8} color="text.secondary">اختر قالباً</Typography>;
  }
};

/* ═══════ 1. ADMINISTRATIVE DECISION ═══════ */
const AdminDecision = ({ d }) => (
  <Box sx={{ ...pageWrapper, border: '2px solid #1a237e' }}>
    <OrgHeader title="قرار إداري" subtitle="Administrative Decision" color="#1a237e" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="DEC" />
      <Typography variant="body1" fontWeight="bold" textAlign="center" mb={2} sx={{ fontSize: 18, color: '#1a237e' }}>
        قرار إداري رقم ({d.decisionNo || '________'})
      </Typography>
      <Typography variant="body1" fontWeight="bold" mb={1}>مدير مركز الأوائل للتأهيل</Typography>
      <Typography variant="body1" sx={{ lineHeight: 2 }}>
        بناءً على الصلاحيات المخولة لنا وبناءً على ما تقتضيه مصلحة العمل،
      </Typography>

      <Section title="نص القرار" color="#1a237e" />
      <Box sx={{ bgcolor: '#e8eaf6', p: 3, borderRadius: 2, mb: 2, borderRight: '4px solid #1a237e' }}>
        <Typography variant="body1" sx={{ lineHeight: 2.5, minHeight: 100 }}>{d.decisionText || ''}</Typography>
      </Box>

      <Section title="الأسباب والمبررات" color="#1a237e" />
      <NotesBox content={d.justification} minHeight={60} />

      <Box sx={fieldRow}>
        <Field label="تاريخ سريان القرار" value={formatDate(d.effectiveDate)} />
        <Field label="الجهات المعنية" value={d.affectedParties} flex={2} />
      </Box>

      <Typography variant="body1" mt={2}>وعلى الجهات المعنية تنفيذ ما جاء في هذا القرار كل فيما يخصه.</Typography>
      <Typography variant="body1" color="text.secondary" fontStyle="italic" mt={1}>والله الموفق</Typography>

      <SignatureBlock signatures={['مدير المركز']} />
      <StampCircle />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 2. OUTGOING LETTER ═══════ */
const OutgoingLetter = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="خطاب صادر" subtitle="Outgoing Letter" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="OUT" />
      <Box sx={fieldRow}>
        <Field label="إلى" value={d.to} flex={2} />
        <Field label="عناية" value={d.attention} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="الموضوع" value={d.subject} flex={3} />
      </Box>

      <Typography variant="body1" mt={2} mb={1}>السلام عليكم ورحمة الله وبركاته،</Typography>
      <Typography variant="body1" mb={1}>تحية طيبة وبعد،</Typography>

      <Box sx={{ minHeight: 200, borderBottom: '1px dotted #ccc', mb: 2, pt: 1 }}>
        <Typography variant="body1" sx={{ lineHeight: 2.5 }}>{d.body || ''}</Typography>
      </Box>

      <Typography variant="body1">وتفضلوا بقبول فائق الاحترام والتقدير.</Typography>

      <Box sx={fieldRow} mt={2}>
        <Field label="المرفقات" value={d.attachments} flex={3} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="نسخة إلى" value={d.cc} flex={3} />
      </Box>

      <SignatureBlock signatures={['مدير المركز']} />
      <StampCircle />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 3. INTERNAL MEMO ═══════ */
const InternalMemo = ({ d }) => (
  <Box sx={{ ...pageWrapper, borderTop: '4px solid #00695c' }}>
    <OrgHeader title="مذكرة داخلية" subtitle="Internal Memo" color="#00695c" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="MEM" />
      <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2, mb: 2 }}>
        <Box sx={fieldRow}><Field label="من" value={d.from} flex={2} /><Field label="التاريخ" value={formatDate(d.date)} /></Box>
        <Box sx={fieldRow}><Field label="إلى" value={d.to} flex={2} /><Field label="الأولوية" value={d.priority || '□ عادي □ عاجل □ سري'} /></Box>
        <Box sx={fieldRow}><Field label="الموضوع" value={d.subject} flex={3} /></Box>
      </Box>

      <Box sx={{ minHeight: 250, mb: 2 }}>
        <Typography variant="body1" sx={{ lineHeight: 2.5 }}>{d.body || ''}</Typography>
      </Box>

      <Section title="الإجراء المطلوب" color="#00695c" />
      <NotesBox content={d.actionRequired} lines={3} />

      <Box sx={fieldRow}><Field label="الموعد النهائي" value={formatDate(d.deadline)} /><Field label="نسخة إلى" value={d.cc} flex={2} /></Box>

      <SignatureBlock signatures={['المرسل', 'المستلم']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 4. MEETING MINUTES ═══════ */
const MeetingMinutes = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="محضر اجتماع" subtitle="Meeting Minutes" color="#37474f" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="MTG" />

      <Section title="بيانات الاجتماع" color="#37474f" />
      <Box sx={fieldRow}>
        <Field label="موضوع الاجتماع" value={d.subject} flex={3} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="التاريخ" value={formatDate(d.date)} />
        <Field label="الوقت" value={d.time || '___:___ — ___:___'} />
        <Field label="المكان" value={d.location} />
        <Field label="رئيس الاجتماع" value={d.chairperson} />
      </Box>

      <Section title="الحضور" color="#37474f" />
      <EmptyTable headers={[{ label: 'م', width: 30 }, 'الاسم', 'المسمى الوظيفي', 'القسم', 'التوقيع']} rowCount={8} headerBg="#eceff1" />

      <Section title="جدول الأعمال" color="#37474f" />
      <EmptyTable headers={[{ label: 'م', width: 30 }, 'البند', 'المقدم', 'القرار / التوصية']} rowCount={6} headerBg="#eceff1" />

      <Section title="المناقشات" color="#37474f" />
      <NotesBox content={d.discussions} minHeight={80} />

      <Section title="القرارات والتوصيات" color="#37474f" />
      <EmptyTable headers={[{ label: 'م', width: 30 }, 'القرار/التوصية', 'المسؤول', 'الموعد النهائي']} rowCount={5} headerBg="#eceff1" />

      <Box sx={fieldRow}>
        <Field label="موعد الاجتماع القادم" value={formatDate(d.nextMeeting)} />
        <Field label="معد المحضر" value={d.secretary} flex={2} />
      </Box>

      <SignatureBlock signatures={['رئيس الاجتماع', 'أمين السر']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 5. DELEGATION OF AUTHORITY ═══════ */
const Delegation = ({ d }) => (
  <Box sx={{ ...pageWrapper, border: '2px solid #6a1b9a' }}>
    <OrgHeader title="تفويض صلاحيات" subtitle="Delegation of Authority" color="#6a1b9a" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="DEL" />

      <Typography variant="body1" sx={{ lineHeight: 2.5 }}>
        أنا الموقع أدناه / <strong>{d.delegator || '________________'}</strong>
        <br />المسمى الوظيفي: <strong>{d.delegatorTitle || '________________'}</strong>
        <br /><br />أفوض السيد / السيدة: <strong>{d.delegate || '________________'}</strong>
        <br />المسمى الوظيفي: <strong>{d.delegateTitle || '________________'}</strong>
      </Typography>

      <Section title="نطاق التفويض" color="#6a1b9a" />
      <NotesBox content={d.scope} minHeight={80} />

      <Section title="مدة التفويض" color="#6a1b9a" />
      <Box sx={fieldRow}>
        <Field label="من تاريخ" value={formatDate(d.fromDate)} />
        <Field label="إلى تاريخ" value={formatDate(d.toDate)} />
        <Field label="السبب" value={d.reason} flex={2} />
      </Box>

      <Section title="الاستثناءات" color="#6a1b9a" />
      <NotesBox content={d.exceptions} lines={3} />

      <SignatureBlock signatures={['المفوِّض', 'المفوَّض', 'المدير العام (للاعتماد)']} />
      <StampCircle />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 6. CIRCULAR ═══════ */
const Circular = ({ d }) => (
  <Box sx={{ ...pageWrapper, borderTop: '4px solid #e65100' }}>
    <OrgHeader title="تعميم" subtitle="Circular / Announcement" color="#e65100" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="CIR" />
      <Box sx={fieldRow}>
        <Field label="الموجه إليه" value={d.to || 'جميع الموظفين'} flex={2} />
        <Field label="الموضوع" value={d.subject} flex={2} />
      </Box>

      <Typography variant="body1" mt={2} mb={1}>السلام عليكم ورحمة الله وبركاته،</Typography>

      <Box sx={{ bgcolor: '#fff3e0', p: 3, borderRadius: 2, mb: 2, borderRight: '4px solid #e65100', minHeight: 200 }}>
        <Typography variant="body1" sx={{ lineHeight: 2.5 }}>{d.body || ''}</Typography>
      </Box>

      <Typography variant="body1">نأمل الالتزام بما ورد أعلاه اعتباراً من تاريخ <strong>{formatDate(d.effectiveDate)}</strong>.</Typography>
      <Typography variant="body1" color="text.secondary" fontStyle="italic" mt={1}>والله الموفق</Typography>

      <SignatureBlock signatures={['مدير المركز']} />
      <StampCircle />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 7. COMPLAINT RECEIPT ═══════ */
const ComplaintReceipt = ({ d }) => (
  <Box sx={{ ...pageWrapper, borderTop: '4px solid #c62828' }}>
    <OrgHeader title="نموذج شكوى / ملاحظة" subtitle="Complaint / Feedback Form" color="#c62828" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="CMP" />

      <Section title="بيانات مقدم الشكوى" color="#c62828" />
      <Box sx={fieldRow}>
        <Field label="الاسم" value={d.complainantName} flex={2} />
        <Field label="رقم الهوية/الجوال" value={d.complainantId} />
        <Field label="الصفة" value={d.complainantRole || '□ مستفيد □ ولي أمر □ موظف □ زائر'} />
      </Box>

      <Section title="تفاصيل الشكوى" color="#c62828" />
      <Box sx={fieldRow}>
        <Field label="نوع الشكوى" value={d.type || '□ خدمة □ موظف □ مرافق □ أخرى'} flex={2} />
        <Field label="القسم المعني" value={d.department} />
        <Field label="تاريخ الحدث" value={formatDate(d.incidentDate)} />
      </Box>
      <NotesBox content={d.details} minHeight={80} />

      <Section title="الإجراء المتخذ" color="#c62828" />
      <Box sx={fieldRow}>
        <Field label="تم التحويل إلى" value={d.referredTo} />
        <Field label="الأولوية" value={d.priority || '□ عاجل □ عادي □ منخفض'} />
        <Field label="الموعد المتوقع للرد" value={formatDate(d.expectedResponse)} />
      </Box>
      <NotesBox content={d.actionTaken} lines={3} />

      <Section title="نتيجة المعالجة" color="#c62828" />
      <Box sx={fieldRow}>
        <Field label="الحالة" value={d.status || '□ قيد المعالجة □ تمت المعالجة □ مغلقة'} flex={2} />
        <Field label="تاريخ الإغلاق" value={formatDate(d.closedDate)} />
      </Box>
      <NotesBox content={d.resolution} lines={3} />

      <SignatureBlock signatures={['مقدم الشكوى', 'المستلم', 'مسؤول الشكاوى']} />
      <OrgFooter />
    </Box>
  </Box>
);

/* ═══════ 8. APPOINTMENT CONFIRMATION ═══════ */
const AppointmentConfirm = ({ d }) => (
  <Box sx={pageWrapper}>
    <OrgHeader title="تأكيد موعد" subtitle="Appointment Confirmation" color="#2e7d32" />
    <Box sx={bodyPad}>
      <RefDateLine prefix="APT" />

      <Section title="بيانات صاحب الموعد" color="#2e7d32" />
      <Box sx={fieldRow}>
        <Field label="الاسم" value={d.name} flex={2} />
        <Field label="رقم الجوال" value={d.phone} />
        <Field label="رقم الملف" value={d.fileNo} />
      </Box>

      <Section title="تفاصيل الموعد" color="#2e7d32" />
      <Box sx={{ bgcolor: '#e8f5e9', p: 3, borderRadius: 2, mb: 2, textAlign: 'center' }}>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">التاريخ</Typography>
            <Typography variant="h6" fontWeight="bold" color="#2e7d32">{formatDate(d.appointmentDate)}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">الوقت</Typography>
            <Typography variant="h6" fontWeight="bold" color="#2e7d32">{d.appointmentTime || '___:___'}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">المكان</Typography>
            <Typography variant="h6" fontWeight="bold" color="#2e7d32">{d.location || '________'}</Typography>
          </Grid>
        </Grid>
      </Box>

      <Box sx={fieldRow}>
        <Field label="القسم" value={d.department} />
        <Field label="الطبيب / المختص" value={d.doctor} flex={2} />
      </Box>
      <Box sx={fieldRow}>
        <Field label="نوع الزيارة" value={d.visitType || '□ أولى □ متابعة □ تقييم □ أخرى'} flex={2} />
        <Field label="الغرض" value={d.purpose} flex={2} />
      </Box>

      <Box sx={{ bgcolor: '#fff3e0', p: 2, borderRadius: 1, mt: 2 }}>
        <Typography variant="subtitle2" fontWeight="bold" mb={1}>تعليمات مهمة:</Typography>
        <Typography variant="body2">• يرجى الحضور قبل الموعد بـ 15 دقيقة</Typography>
        <Typography variant="body2">• إحضار الهوية الوطنية وبطاقة المستفيد</Typography>
        <Typography variant="body2">• إحضار جميع التقارير الطبية السابقة</Typography>
        <Typography variant="body2">• في حال الرغبة بإلغاء أو تأجيل الموعد يرجى التواصل قبل 24 ساعة</Typography>
      </Box>

      <SignatureBlock signatures={['موظف الاستقبال']} />
      <OrgFooter />
    </Box>
  </Box>
);

export default AdminTemplateRenderer;
