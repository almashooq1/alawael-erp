/**
 * قوالب الشكاوى والزوار والاجتماعات
 * Complaints, Visitors & Meetings Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const COMPLAINTS_MEETINGS_TEMPLATES = [
  /* ── الشكاوى والمقترحات ── */
  { id: 'complaint-registration-form', name: 'نموذج تسجيل شكوى', nameEn: 'Complaint Registration Form', desc: 'نموذج تسجيل شكوى رسمية', color: '#c62828' },
  { id: 'complaint-investigation', name: 'تقرير تحقيق في شكوى', nameEn: 'Complaint Investigation Report', desc: 'تقرير التحقيق في الشكوى', color: '#d32f2f' },
  { id: 'complaint-resolution-letter', name: 'خطاب حل شكوى', nameEn: 'Complaint Resolution Letter', desc: 'خطاب رد وحل الشكوى', color: '#e53935' },
  { id: 'complaint-stats-report', name: 'تقرير إحصائيات الشكاوى', nameEn: 'Complaints Statistics Report', desc: 'تقرير إحصائي شامل للشكاوى', color: '#ef5350' },
  { id: 'complaint-escalation-form', name: 'نموذج تصعيد شكوى', nameEn: 'Complaint Escalation Form', desc: 'تصعيد شكوى لمستوى أعلى', color: '#b71c1c' },
  { id: 'suggestion-form', name: 'نموذج اقتراح', nameEn: 'Suggestion Form', desc: 'نموذج تقديم مقترح', color: '#ff5252' },
  /* ── إدارة الزوار ── */
  { id: 'visitor-badge-print', name: 'بطاقة زائر', nameEn: 'Visitor Badge', desc: 'بطاقة تعريف الزائر', color: '#00838f' },
  { id: 'visitor-log-report', name: 'سجل الزوار', nameEn: 'Visitor Log Report', desc: 'تقرير سجل الزوار', color: '#0097a7' },
  { id: 'visit-confirmation', name: 'تأكيد موعد زيارة', nameEn: 'Visit Confirmation', desc: 'تأكيد موعد زيارة رسمية', color: '#00acc1' },
  { id: 'vip-visitor-pass', name: 'تصريح زائر VIP', nameEn: 'VIP Visitor Pass', desc: 'تصريح زيارة لكبار الشخصيات', color: '#00bcd4' },
  { id: 'visitor-register', name: 'دفتر تسجيل الزوار', nameEn: 'Visitor Register', desc: 'دفتر تسجيل الزوار اليومي', color: '#006064' },
  { id: 'visit-request-form', name: 'طلب زيارة', nameEn: 'Visit Request Form', desc: 'نموذج طلب زيارة المركز', color: '#00695c' },
  /* ── الاجتماعات ── */
  { id: 'meeting-agenda-print', name: 'جدول أعمال اجتماع', nameEn: 'Meeting Agenda', desc: 'جدول أعمال الاجتماع', color: '#4527a0' },
  { id: 'meeting-minutes-print', name: 'محضر اجتماع', nameEn: 'Meeting Minutes', desc: 'محضر اجتماع رسمي', color: '#512da8' },
  { id: 'meeting-action-items', name: 'مهام الاجتماع', nameEn: 'Meeting Action Items', desc: 'قائمة مهام ومتابعة الاجتماع', color: '#5e35b1' },
  { id: 'meeting-invitation-print', name: 'دعوة اجتماع', nameEn: 'Meeting Invitation', desc: 'دعوة رسمية لحضور اجتماع', color: '#673ab7' },
  { id: 'meeting-attendance-sheet', name: 'كشف حضور اجتماع', nameEn: 'Meeting Attendance Sheet', desc: 'كشف تسجيل حضور الاجتماع', color: '#7c4dff' },
  { id: 'meeting-follow-up', name: 'متابعة قرارات الاجتماع', nameEn: 'Meeting Follow-Up', desc: 'تقرير متابعة قرارات الاجتماع', color: '#651fff' },
];

export const ComplaintsMeetingsTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    /* ══════════════ الشكاوى ══════════════ */
    case 'complaint-registration-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تسجيل شكوى" subtitle="Complaint Registration Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <Section title="بيانات مقدم الشكوى">
              <div style={fieldRow}><Field label="الاسم" value={d.complainantName} w="30%" /><Field label="الصفة" value={d.relation} w="15%" /><Field label="الهاتف" value={d.phone} w="15%" /><Field label="البريد" value={d.email} w="25%" /></div>
            </Section>
            <Section title="تفاصيل الشكوى">
              <div style={fieldRow}><Field label="الموضوع" value={d.subject} w="40%" /><Field label="القسم المعني" value={d.department} w="25%" /><Field label="تاريخ الواقعة" value={formatDate(d.incidentDate)} w="15%" /></div>
              <div style={fieldRow}><Field label="نوع الشكوى" value={d.type} w="20%" /><Field label="الأولوية" value={d.priority} w="15%" /></div>
              <NotesBox label="وصف الشكوى" value={d.description} lines={4} />
            </Section>
            <NotesBox label="المرفقات" value={d.attachments} lines={1} />
            <NotesBox label="الحل المطلوب" value={d.desiredResolution} lines={2} />
            <SignatureBlock rightLabel="مقدم الشكوى" leftLabel="موظف الاستقبال" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'complaint-investigation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير التحقيق في شكوى" subtitle="Complaint Investigation Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الشكوى" value={d.complaintNo} w="15%" /><Field label="الموضوع" value={d.subject} w="35%" /><Field label="المحقق" value={d.investigator} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="الأطراف المعنية">
              <EmptyTable cols={4} rows={4} headers={['الاسم', 'الصفة', 'القسم', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملخص الشكوى" value={d.summary} lines={2} />
            <NotesBox label="إجراءات التحقيق" value={d.procedures} lines={3} />
            <NotesBox label="النتائج" value={d.findings} lines={3} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <div style={fieldRow}><Field label="الإجراء المتخذ" value={d.actionTaken} w="40%" /><Field label="النتيجة" value={d.outcome} w="25%" /></div>
            <SignatureBlock rightLabel="المحقق" leftLabel="المدير المسؤول" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'complaint-resolution-letter':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطاب رد وحل شكوى" subtitle="Complaint Resolution Letter" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="السيد/ة" value={d.complainantName} w="30%" /><Field label="رقم الشكوى" value={d.complaintNo} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <NotesBox label="" value="السلام عليكم ورحمة الله وبركاته،\n\nإشارة إلى شكواكم المقدمة بتاريخ .............. والمتعلقة بـ ..............\n\nنود إفادتكم بأنه تم دراسة شكواكم واتخاذ الإجراءات اللازمة كما يلي:" lines={4} />
            <NotesBox label="الإجراءات المتخذة" value={d.actions} lines={3} />
            <NotesBox label="النتيجة" value={d.result} lines={2} />
            <NotesBox label="" value="نشكركم على تعاونكم وحرصكم على تطوير خدمات المركز، ونأمل أن يكون الحل المتخذ مرضياً لكم." lines={1} />
            <SignatureBlock rightLabel="مدير خدمة العملاء" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'complaint-stats-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير إحصائيات الشكاوى" subtitle="Complaints Statistics Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="إجمالي الشكاوى" value={d.total} w="15%" /><Field label="المحلولة" value={d.resolved} w="15%" /><Field label="قيد المعالجة" value={d.pending} w="15%" /></div>
            <Section title="التوزيع حسب النوع">
              <EmptyTable cols={4} rows={6} headers={['نوع الشكوى', 'العدد', 'النسبة %', 'متوسط وقت الحل']} />
            </Section>
            <Section title="التوزيع حسب القسم">
              <EmptyTable cols={4} rows={6} headers={['القسم', 'العدد', 'المحلولة', 'معلقة']} />
            </Section>
            <Section title="مستوى الرضا">
              <EmptyTable cols={3} rows={4} headers={['المعيار', 'التقييم', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول الجودة" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'complaint-escalation-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تصعيد شكوى" subtitle="Complaint Escalation Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الشكوى" value={d.complaintNo} w="15%" /><Field label="تاريخ التقديم الأصلي" value={formatDate(d.originalDate)} w="15%" /><Field label="الموضوع" value={d.subject} w="35%" /></div>
            <div style={fieldRow}><Field label="مصعّد من" value={d.escalatedFrom} w="25%" /><Field label="مصعّد إلى" value={d.escalatedTo} w="25%" /><Field label="مستوى التصعيد" value={d.level} w="15%" /></div>
            <NotesBox label="سبب التصعيد" value={d.reason} lines={2} />
            <NotesBox label="ملخص الإجراءات السابقة" value={d.prevActions} lines={2} />
            <NotesBox label="الإجراء المطلوب" value={d.requiredAction} lines={2} />
            <SignatureBlock rightLabel="المصعِّد" leftLabel="المستقبل" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'suggestion-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تقديم مقترح" subtitle="Suggestion Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="مقدم المقترح" value={d.name} w="30%" /><Field label="الصفة" value={d.role} w="15%" /><Field label="القسم" value={d.department} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <div style={fieldRow}><Field label="عنوان المقترح" value={d.title} w="50%" /><Field label="المجال" value={d.category} w="25%" /></div>
            <NotesBox label="وصف المقترح" value={d.description} lines={4} />
            <NotesBox label="الفوائد المتوقعة" value={d.expectedBenefits} lines={2} />
            <NotesBox label="متطلبات التنفيذ" value={d.requirements} lines={2} />
            <div style={{ margin: '12px 0', padding: 12, background: '#e3f2fd', borderRadius: 8, fontSize: 11 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>للاستخدام الإداري فقط:</div>
              <div style={fieldRow}><Field label="القرار" value={d.decision} w="25%" /><Field label="مبررات القرار" value={d.justification} w="50%" /></div>
            </div>
            <SignatureBlock rightLabel="مقدم المقترح" leftLabel="المدير المسؤول" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ الزوار ══════════════ */
    case 'visitor-badge-print':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بطاقة زائر" subtitle="Visitor Badge" />
          <div style={bodyPad}>
            <div style={{ maxWidth: 350, margin: '0 auto', border: '2px solid #00838f', borderRadius: 16, padding: 16, background: '#e0f7fa' }}>
              <div style={{ textAlign: 'center', fontWeight: 700, color: '#00838f', fontSize: 16, marginBottom: 8 }}>بطاقة زائر</div>
              <div style={{ textAlign: 'center', fontSize: 11, color: '#00695c', marginBottom: 12 }}>مركز الأوائل لتأهيل ذوي الإعاقة</div>
              <div style={fieldRow}><Field label="الاسم" value={d.name} w="100%" /></div>
              <div style={fieldRow}><Field label="الهوية" value={d.idNo} w="40%" /><Field label="الجهة" value={d.organization} w="50%" /></div>
              <div style={fieldRow}><Field label="الغرض" value={d.purpose} w="50%" /><Field label="القسم" value={d.visitDept} w="40%" /></div>
              <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="40%" /><Field label="الوقت" value={d.time} w="30%" /></div>
              <div style={{ textAlign: 'center', fontSize: 10, color: '#999', marginTop: 8, borderTop: '1px dashed #ccc', paddingTop: 6 }}>يرجى إعادة البطاقة عند المغادرة</div>
            </div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'visitor-log-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير سجل الزوار" subtitle="Visitor Log Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="إجمالي الزوار" value={d.totalVisitors} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="سجل الزيارات">
              <EmptyTable cols={7} rows={15} headers={['التاريخ', 'الاسم', 'الجهة', 'الغرض', 'القسم', 'الدخول', 'الخروج']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول الاستقبال" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'visit-confirmation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تأكيد موعد زيارة" subtitle="Visit Confirmation" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="السيد/ة" value={d.visitorName} w="30%" /><Field label="الجهة" value={d.organization} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <NotesBox label="" value="السلام عليكم ورحمة الله وبركاته،\n\nنود تأكيد موعد زيارتكم لمركز الأوائل لتأهيل ذوي الإعاقة وفقاً للتفاصيل التالية:" lines={2} />
            <div style={fieldRow}><Field label="تاريخ الزيارة" value={formatDate(d.visitDate)} w="20%" /><Field label="الوقت" value={d.visitTime} w="15%" /><Field label="المقابل" value={d.meetWith} w="25%" /><Field label="المكان" value={d.location} w="20%" /></div>
            <NotesBox label="الغرض" value={d.purpose} lines={2} />
            <NotesBox label="تعليمات خاصة" value={d.instructions} lines={1} />
            <SignatureBlock rightLabel="إدارة العلاقات" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'vip-visitor-pass':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تصريح زائر VIP" subtitle="VIP Visitor Pass" />
          <div style={bodyPad}>
            <div style={{ maxWidth: 400, margin: '0 auto', border: '3px solid #ffd700', borderRadius: 16, padding: 20, background: 'linear-gradient(135deg, #fff8e1, #fffde7)' }}>
              <div style={{ textAlign: 'center', fontWeight: 700, color: '#f57f17', fontSize: 18, marginBottom: 12 }}>⭐ تصريح زائر كبار الشخصيات</div>
              <div style={fieldRow}><Field label="الاسم" value={d.name} w="100%" /></div>
              <div style={fieldRow}><Field label="المنصب" value={d.title} w="50%" /><Field label="الجهة" value={d.organization} w="40%" /></div>
              <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="40%" /><Field label="المرافقون" value={d.escort} w="40%" /></div>
              <div style={fieldRow}><Field label="الأقسام المصرح بزيارتها" value={d.authorizedAreas || 'جميع الأقسام'} w="100%" /></div>
              <div style={{ textAlign: 'center', fontSize: 10, color: '#999', marginTop: 8 }}>صالح ليوم واحد فقط</div>
            </div>
            <SignatureBlock rightLabel="المدير العام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'visitor-register':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="دفتر تسجيل الزوار اليومي" subtitle="Daily Visitor Register" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="اليوم" value={d.day} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="موظف الاستقبال" value={d.receptionist} w="25%" /></div>
            <Section title="سجل الزوار">
              <EmptyTable cols={8} rows={20} headers={['#', 'الاسم', 'الهوية', 'الجهة', 'الغرض', 'القسم', 'الدخول', 'الخروج']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الزوار" value={d.total} w="15%" /></div>
            <SignatureBlock rightLabel="موظف الاستقبال" leftLabel="مدير الأمن" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'visit-request-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج طلب زيارة المركز" subtitle="Center Visit Request Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات طالب الزيارة">
              <div style={fieldRow}><Field label="الاسم" value={d.name} w="30%" /><Field label="الجهة" value={d.organization} w="30%" /><Field label="المنصب" value={d.title} w="20%" /></div>
              <div style={fieldRow}><Field label="الهاتف" value={d.phone} w="20%" /><Field label="البريد" value={d.email} w="25%" /></div>
            </Section>
            <Section title="تفاصيل الزيارة">
              <div style={fieldRow}><Field label="التاريخ المطلوب" value={formatDate(d.requestedDate)} w="20%" /><Field label="الوقت" value={d.requestedTime} w="15%" /><Field label="عدد الزوار" value={d.visitorsCount} w="15%" /></div>
              <NotesBox label="الغرض من الزيارة" value={d.purpose} lines={2} />
              <NotesBox label="الأقسام المطلوب زيارتها" value={d.departments} lines={1} />
            </Section>
            <div style={{ margin: '12px 0', padding: 12, background: '#f3e5f5', borderRadius: 8, fontSize: 11 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>قرار الإدارة:</div>
              <div style={fieldRow}><Field label="القرار" value={d.decision} w="20%" /><Field label="الموعد المحدد" value={d.confirmedDate} w="20%" /><Field label="المنسق" value={d.coordinator} w="25%" /></div>
            </div>
            <SignatureBlock rightLabel="طالب الزيارة" leftLabel="إدارة العلاقات" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ الاجتماعات ══════════════ */
    case 'meeting-agenda-print':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="جدول أعمال اجتماع" subtitle="Meeting Agenda" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="عنوان الاجتماع" value={d.title} w="40%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="الوقت" value={d.time} w="15%" /><Field label="المكان" value={d.location} w="20%" /></div>
            <div style={fieldRow}><Field label="رئيس الاجتماع" value={d.chairman} w="30%" /><Field label="المقرر" value={d.secretary} w="25%" /></div>
            <Section title="جدول الأعمال">
              <EmptyTable cols={4} rows={8} headers={['#', 'البند', 'المقدم', 'الوقت المخصص']} />
            </Section>
            <Section title="المدعوون">
              <EmptyTable cols={3} rows={8} headers={['الاسم', 'المسمى الوظيفي', 'القسم']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
          </div>
          <OrgFooter />
        </div>
      );

    case 'meeting-minutes-print':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="محضر اجتماع" subtitle="Meeting Minutes" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="عنوان الاجتماع" value={d.title} w="40%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="من" value={d.startTime} w="10%" /><Field label="إلى" value={d.endTime} w="10%" /><Field label="المكان" value={d.location} w="15%" /></div>
            <Section title="الحضور">
              <EmptyTable cols={4} rows={8} headers={['الاسم', 'المسمى', 'القسم', 'التوقيع']} />
            </Section>
            <Section title="البنود المناقشة">
              <EmptyTable cols={3} rows={8} headers={['البند', 'المناقشة', 'القرار']} />
            </Section>
            <Section title="القرارات">
              <EmptyTable cols={4} rows={6} headers={['القرار', 'المسؤول', 'الموعد النهائي', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="الاجتماع القادم" value={d.nextMeeting} w="30%" /></div>
            <SignatureBlock rightLabel="رئيس الاجتماع" leftLabel="المقرر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'meeting-action-items':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مهام ومتابعة الاجتماع" subtitle="Meeting Action Items Tracker" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الاجتماع" value={d.meetingTitle} w="40%" /><Field label="التاريخ" value={formatDate(d.meetingDate)} w="15%" /><Field label="تاريخ المتابعة" value={formatDate(d.followupDate) || today()} w="15%" /></div>
            <Section title="المهام">
              <EmptyTable cols={6} rows={10} headers={['المهمة', 'المسؤول', 'الموعد', 'الحالة', 'نسبة الإنجاز', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي المهام" value={d.total} w="15%" /><Field label="المنجزة" value={d.completed} w="15%" /><Field label="المتأخرة" value={d.overdue} w="15%" /></div>
            <SignatureBlock rightLabel="المتابع" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'meeting-invitation-print':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="دعوة لحضور اجتماع" subtitle="Meeting Invitation" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="السيد/ة" value={d.inviteeName} w="30%" /><Field label="المسمى" value={d.title} w="25%" /></div>
            <NotesBox label="" value="السلام عليكم ورحمة الله وبركاته،\n\nيسرنا دعوتكم لحضور الاجتماع التالي:" lines={2} />
            <div style={{ margin: '12px 0', padding: 16, background: '#ede7f6', borderRadius: 12 }}>
              <div style={fieldRow}><Field label="الموضوع" value={d.meetingTitle} w="50%" /></div>
              <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.meetingDate)} w="20%" /><Field label="الوقت" value={d.meetingTime} w="15%" /><Field label="المكان" value={d.location} w="25%" /></div>
              <div style={fieldRow}><Field label="رئيس الاجتماع" value={d.chairman} w="30%" /><Field label="المدة المتوقعة" value={d.duration} w="20%" /></div>
            </div>
            <NotesBox label="جدول الأعمال" value={d.agenda} lines={3} />
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="الداعي للاجتماع" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'meeting-attendance-sheet':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="كشف حضور اجتماع" subtitle="Meeting Attendance Sheet" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الاجتماع" value={d.meetingTitle} w="40%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="الوقت" value={d.time} w="15%" /><Field label="المكان" value={d.location} w="20%" /></div>
            <Section title="الحضور">
              <EmptyTable cols={5} rows={15} headers={['#', 'الاسم', 'المسمى الوظيفي', 'القسم', 'التوقيع']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي المدعوين" value={d.totalInvited} w="15%" /><Field label="الحضور" value={d.attended} w="15%" /><Field label="الغياب" value={d.absent} w="15%" /></div>
            <SignatureBlock rightLabel="المقرر" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'meeting-follow-up':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير متابعة قرارات الاجتماع" subtitle="Meeting Decisions Follow-Up Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الاجتماع" value={d.meetingTitle} w="40%" /><Field label="تاريخ الاجتماع" value={formatDate(d.meetingDate)} w="15%" /><Field label="تاريخ المتابعة" value={formatDate(d.followupDate) || today()} w="15%" /></div>
            <Section title="حالة القرارات">
              <EmptyTable cols={6} rows={8} headers={['القرار', 'المسؤول', 'الموعد', 'الحالة', 'نسبة التنفيذ', 'العوائق']} />
            </Section>
            <NotesBox label="ملخص التنفيذ" value={d.executionSummary} lines={2} />
            <NotesBox label="القرارات المتأخرة وأسبابها" value={d.delayedItems} lines={2} />
            <SignatureBlock rightLabel="المتابع" leftLabel="رئيس الاجتماع" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
