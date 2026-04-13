/**
 * قوالب التبرعات والدعم الفني — Donations & HelpDesk Print Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today, formatMoney,
} from '../shared/PrintTemplateShared';

export const DONATIONS_HELPDESK_TEMPLATES = [
  /* ── التبرعات ── */
  { id: 'donation-receipt', name: 'إيصال تبرع', nameEn: 'Donation Receipt', desc: 'إيصال استلام تبرع', color: '#1b5e20' },
  { id: 'donor-acknowledgment', name: 'خطاب شكر متبرع', nameEn: 'Donor Acknowledgment', desc: 'خطاب شكر وتقدير للمتبرع', color: '#2e7d32' },
  { id: 'donation-campaign', name: 'تقرير حملة تبرعات', nameEn: 'Donation Campaign Report', desc: 'تقرير حملة التبرعات', color: '#388e3c' },
  { id: 'donor-statement', name: 'كشف حساب متبرع', nameEn: 'Donor Statement', desc: 'كشف حساب المتبرع', color: '#43a047' },
  { id: 'volunteer-registration', name: 'نموذج تسجيل متطوع', nameEn: 'Volunteer Registration', desc: 'نموذج تسجيل متطوع جديد', color: '#4caf50' },
  { id: 'volunteer-assignment', name: 'تكليف متطوع', nameEn: 'Volunteer Assignment', desc: 'نموذج تكليف المتطوع', color: '#66bb6a' },
  /* ── الدعم الفني ── */
  { id: 'helpdesk-ticket', name: 'تذكرة دعم فني', nameEn: 'HelpDesk Ticket', desc: 'ملخص تذكرة الدعم الفني', color: '#e65100' },
  { id: 'ticket-escalation', name: 'تصعيد تذكرة', nameEn: 'Ticket Escalation', desc: 'نموذج تصعيد التذكرة', color: '#ef6c00' },
  { id: 'support-sla', name: 'تقرير مستوى الخدمة', nameEn: 'Support SLA Report', desc: 'تقرير مستوى خدمة الدعم', color: '#f57c00' },
  { id: 'complaint-stats', name: 'إحصائيات الشكاوى', nameEn: 'Complaint Statistics', desc: 'تقرير إحصائيات الشكاوى', color: '#fb8c00' },
  { id: 'suggestion-ack', name: 'استلام مقترح', nameEn: 'Suggestion Acknowledgment', desc: 'خطاب استلام المقترح', color: '#ff9800' },
  { id: 'helpdesk-summary', name: 'ملخص الدعم الشهري', nameEn: 'Monthly Support Summary', desc: 'ملخص شهري لتذاكر الدعم', color: '#ffa726' },
  { id: 'it-asset-handover', name: 'تسليم أصول تقنية', nameEn: 'IT Asset Handover', desc: 'محضر تسليم أصول تقنية', color: '#ffb74d' },
  { id: 'it-incident-report', name: 'تقرير حادث تقني', nameEn: 'IT Incident Report', desc: 'تقرير حادث تقني / أمني', color: '#e65100' },
];

export const DonationsHelpDeskTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'donation-receipt':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إيصال تبرع" subtitle="Donation Receipt" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المتبرع">
              <div style={fieldRow}><Field label="الاسم" value={d.donorName} w="35%" /><Field label="الهوية" value={d.idNo} w="20%" /><Field label="الجوال" value={d.phone} w="20%" /><Field label="البريد" value={d.email} w="25%" /></div>
            </Section>
            <Section title="بيانات التبرع">
              <div style={fieldRow}><Field label="المبلغ" value={formatMoney(d.amount)} w="25%" /><Field label="بالحروف" value={d.amountWords} w="40%" /><Field label="طريقة الدفع" value={d.paymentMethod} w="20%" /><Field label="رقم الإيصال" value={d.receiptNo} w="15%" /></div>
              <div style={fieldRow}><Field label="نوع التبرع" value={d.donationType} w="25%" /><Field label="الغرض" value={d.purpose} w="40%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            </Section>
            <div style={{ margin: '16px 0', padding: 12, background: '#e8f5e9', borderRadius: 8, fontSize: 12, textAlign: 'center' }}>
              جزاكم الله خيراً على تبرعكم الكريم. يحفظه الله ويبارك فيه.
            </div>
            <SignatureBlock rightLabel="المتبرع" leftLabel="أمين الصندوق" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'donor-acknowledgment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطاب شكر وتقدير للمتبرع" subtitle="Donor Acknowledgment Letter" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={{ lineHeight: 2.2, margin: '20px 0' }}>
              <p>السيد / السيدة: <strong>{d.donorName || '____________________'}</strong> المحترم/ة</p>
              <p>السلام عليكم ورحمة الله وبركاته،</p>
              <p>يتقدم مركز الأوائل لتأهيل ذوي الإعاقة بخالص الشكر والتقدير لتبرعكم الكريم بمبلغ <strong>{formatMoney(d.amount) || '________'}</strong> ريال سعودي بتاريخ <strong>{formatDate(d.date) || '____/__/__'}</strong>.</p>
              <p>إن تبرعكم السخي يسهم في تقديم أفضل الخدمات التأهيلية لذوي الإعاقة وأسرهم.</p>
              <p>نسأل الله أن يجعله في ميزان حسناتكم.</p>
            </div>
            <SignatureBlock rightLabel="المدير العام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'donation-campaign':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حملة التبرعات" subtitle="Donation Campaign Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="اسم الحملة" value={d.campaignName} w="40%" /><Field label="الفترة" value={d.period} w="25%" /><Field label="المسؤول" value={d.responsible} w="35%" /></div>
            <div style={fieldRow}><Field label="المستهدف" value={formatMoney(d.targetAmount)} w="25%" /><Field label="المحصّل" value={formatMoney(d.collectedAmount)} w="25%" /><Field label="النسبة" value={d.percentage} w="15%" /><Field label="عدد المتبرعين" value={d.donorCount} w="20%" /></div>
            <Section title="تفاصيل التبرعات">
              <EmptyTable cols={5} rows={10} headers={['المتبرع', 'المبلغ', 'طريقة الدفع', 'التاريخ', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملخص الحملة" value={d.summary} lines={3} />
            <SignatureBlock rightLabel="مسؤول الحملة" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'donor-statement':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="كشف حساب المتبرع" subtitle="Donor Statement of Account" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المتبرع" value={d.donorName} w="35%" /><Field label="رقم الحساب" value={d.accountNo} w="25%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="كشف التبرعات">
              <EmptyTable cols={5} rows={12} headers={['التاريخ', 'الوصف', 'المبلغ', 'الغرض', 'رقم الإيصال']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي التبرعات" value={formatMoney(d.totalDonations)} w="33%" /><Field label="عدد التبرعات" value={d.donationCount} w="33%" /></div>
            <SignatureBlock rightLabel="المدير المالي" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'volunteer-registration':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تسجيل متطوع" subtitle="Volunteer Registration Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="البيانات الشخصية">
              <div style={fieldRow}><Field label="الاسم" value={d.name} w="35%" /><Field label="الهوية" value={d.idNo} w="20%" /><Field label="تاريخ الميلاد" value={formatDate(d.dob)} w="20%" /><Field label="الجنس" value={d.gender} w="12%" /></div>
              <div style={fieldRow}><Field label="الجوال" value={d.phone} w="25%" /><Field label="البريد" value={d.email} w="30%" /><Field label="المؤهل" value={d.qualification} w="25%" /><Field label="المهنة" value={d.occupation} w="20%" /></div>
            </Section>
            <Section title="بيانات التطوع">
              <div style={fieldRow}><Field label="المجال المفضل" value={d.preferredArea} w="35%" /><Field label="الخبرات السابقة" value={d.experience} w="35%" /><Field label="الساعات المتاحة/أسبوع" value={d.availableHours} w="30%" /></div>
              <div style={fieldRow}><Field label="الأيام المتاحة" value={d.availableDays} w="40%" /><Field label="فترة التطوع المتوقعة" value={d.expectedPeriod} w="30%" /></div>
            </Section>
            <NotesBox label="الدافع للتطوع" value={d.motivation} lines={2} />
            <SignatureBlock rightLabel="المتقدم" leftLabel="مسؤول التطوع" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'volunteer-assignment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تكليف متطوع" subtitle="Volunteer Assignment Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المتطوع" value={d.volunteerName} w="35%" /><Field label="رقم التسجيل" value={d.regNo} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="تفاصيل التكليف">
              <div style={fieldRow}><Field label="النشاط/المهمة" value={d.task} w="40%" /><Field label="القسم" value={d.department} w="25%" /><Field label="المشرف" value={d.supervisor} w="35%" /></div>
              <div style={fieldRow}><Field label="من" value={formatDate(d.fromDate)} w="20%" /><Field label="إلى" value={formatDate(d.toDate)} w="20%" /><Field label="ساعات العمل" value={d.workHours} w="25%" /><Field label="المكان" value={d.location} w="35%" /></div>
            </Section>
            <NotesBox label="المهام المطلوبة" value={d.taskDetails} lines={3} />
            <NotesBox label="تعليمات خاصة" value={d.instructions} lines={2} />
            <SignatureBlock rightLabel="المتطوع" leftLabel="مسؤول التطوع" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ الدعم الفني ══════════════ */
    case 'helpdesk-ticket':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص تذكرة الدعم الفني" subtitle="HelpDesk Ticket Summary" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم التذكرة" value={d.ticketNo} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="الأولوية" value={d.priority} w="15%" /><Field label="الحالة" value={d.status} w="15%" /><Field label="الفئة" value={d.category} w="20%" /></div>
            <Section title="بيانات مقدم الطلب">
              <div style={fieldRow}><Field label="الاسم" value={d.requesterName} w="35%" /><Field label="القسم" value={d.department} w="25%" /><Field label="الجوال" value={d.phone} w="20%" /><Field label="البريد" value={d.email} w="20%" /></div>
            </Section>
            <NotesBox label="وصف المشكلة" value={d.description} lines={3} />
            <NotesBox label="الإجراء المتخذ" value={d.actionTaken} lines={3} />
            <NotesBox label="الحل" value={d.resolution} lines={2} />
            <div style={fieldRow}><Field label="وقت الاستجابة" value={d.responseTime} w="25%" /><Field label="وقت الحل" value={d.resolutionTime} w="25%" /><Field label="الفني المعين" value={d.assignedTo} w="25%" /><Field label="تقييم المستخدم" value={d.userRating} w="25%" /></div>
            <SignatureBlock rightLabel="الفني" leftLabel="مقدم الطلب" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'ticket-escalation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تصعيد تذكرة" subtitle="Ticket Escalation Form" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم التذكرة" value={d.ticketNo} w="20%" /><Field label="تاريخ الإنشاء" value={formatDate(d.createdDate)} w="20%" /><Field label="تاريخ التصعيد" value={formatDate(d.escalationDate) || today()} w="20%" /><Field label="مستوى التصعيد" value={d.escalationLevel} w="20%" /></div>
            <NotesBox label="سبب التصعيد" value={d.reason} lines={3} />
            <div style={fieldRow}><Field label="من" value={d.escalatedFrom} w="30%" /><Field label="إلى" value={d.escalatedTo} w="30%" /><Field label="الأولوية الجديدة" value={d.newPriority} w="20%" /></div>
            <NotesBox label="الإجراءات السابقة" value={d.previousActions} lines={3} />
            <NotesBox label="الإجراء المطلوب" value={d.requiredAction} lines={2} />
            <SignatureBlock rightLabel="المصعّد" leftLabel="المدير" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'support-sla':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير مستوى خدمة الدعم الفني" subtitle="Support SLA Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="30%" /><Field label="إجمالي التذاكر" value={d.totalTickets} w="20%" /><Field label="المغلقة" value={d.closedTickets} w="15%" /><Field label="المفتوحة" value={d.openTickets} w="15%" /><Field label="نسبة الالتزام" value={d.slaCompliance} w="20%" /></div>
            <Section title="التفاصيل حسب الأولوية">
              <EmptyTable cols={6} rows={4} headers={['الأولوية', 'العدد', 'SLA المستهدف', 'متوسط الاستجابة', 'متوسط الحل', 'نسبة الالتزام']} />
            </Section>
            <Section title="التفاصيل حسب الفئة">
              <EmptyTable cols={4} rows={6} headers={['الفئة', 'العدد', 'نسبة الحل', 'متوسط وقت الحل']} />
            </Section>
            <NotesBox label="الملاحظات والتحسينات" value={d.notes} lines={3} />
            <SignatureBlock rightLabel="مدير الدعم الفني" leftLabel="مدير تقنية المعلومات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'complaint-stats':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير إحصائيات الشكاوى" subtitle="Complaint Statistics Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="30%" /><Field label="إجمالي الشكاوى" value={d.totalComplaints} w="20%" /><Field label="تم حلها" value={d.resolved} w="15%" /><Field label="قيد الدراسة" value={d.pending} w="15%" /><Field label="نسبة الرضا" value={d.satisfactionRate} w="20%" /></div>
            <Section title="التوزيع حسب النوع">
              <EmptyTable cols={4} rows={6} headers={['نوع الشكوى', 'العدد', 'النسبة %', 'متوسط وقت الحل']} />
            </Section>
            <Section title="التوزيع حسب القسم">
              <EmptyTable cols={4} rows={6} headers={['القسم', 'العدد', 'تم الحل', 'قيد المتابعة']} />
            </Section>
            <NotesBox label="أبرز الملاحظات" value={d.highlights} lines={2} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="مسؤول الشكاوى" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'suggestion-ack':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطاب استلام مقترح" subtitle="Suggestion Acknowledgment" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={{ lineHeight: 2.2, margin: '20px 0' }}>
              <p>السيد / السيدة: <strong>{d.submitterName || '____________________'}</strong> المحترم/ة</p>
              <p>السلام عليكم ورحمة الله وبركاته،</p>
              <p>نشكركم على مقترحكم الكريم المقدم بتاريخ <strong>{formatDate(d.submissionDate) || '____/__/__'}</strong> بخصوص:</p>
              <p style={{ padding: '8px 16px', background: '#f5f5f5', borderRadius: 8 }}><strong>{d.suggestion || '________________________________________'}</strong></p>
              <p>تم استلام مقترحكم وتسجيله برقم <strong>{d.suggestionNo || '________'}</strong> وسيتم دراسته والرد عليكم خلال <strong>{d.responseTime || '10 أيام عمل'}</strong>.</p>
            </div>
            <SignatureBlock rightLabel="مسؤول المقترحات" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'helpdesk-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص الدعم الفني الشهري" subtitle="Monthly Support Summary" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الشهر" value={d.month} w="20%" /><Field label="إجمالي التذاكر" value={d.totalTickets} w="15%" /><Field label="جديد" value={d.newTickets} w="15%" /><Field label="مغلق" value={d.closedTickets} w="15%" /><Field label="قيد العمل" value={d.inProgress} w="15%" /><Field label="معدل الرضا" value={d.satisfaction} w="20%" /></div>
            <Section title="أعلى 10 مشاكل تكراراً">
              <EmptyTable cols={4} rows={10} headers={['المشكلة', 'التكرار', 'الحل المعتاد', 'وقت الحل']} />
            </Section>
            <Section title="أداء الفريق">
              <EmptyTable cols={5} rows={5} headers={['الفني', 'التذاكر', 'متوسط الحل', 'تقييم المستخدم', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مدير الدعم" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'it-asset-handover':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="محضر تسليم أصول تقنية" subtitle="IT Asset Handover Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستلم" value={d.recipientName} w="30%" /><Field label="القسم" value={d.department} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="نوع التسليم" value={d.handoverType} w="25%" /></div>
            <Section title="الأصول المسلّمة">
              <EmptyTable cols={6} rows={6} headers={['البند', 'الرقم التسلسلي', 'الحالة', 'الملحقات', 'القيمة', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="المسلِّم" leftLabel="المستلِم" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'it-incident-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حادث تقني / أمني" subtitle="IT Incident Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الحادث" value={d.incidentNo} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="الوقت" value={d.time} w="15%" /><Field label="الخطورة" value={d.severity} w="15%" /><Field label="النوع" value={d.type} w="20%" /></div>
            <NotesBox label="وصف الحادث" value={d.description} lines={3} />
            <NotesBox label="الأنظمة المتأثرة" value={d.affectedSystems} lines={2} />
            <NotesBox label="الأثر" value={d.impact} lines={2} />
            <NotesBox label="الإجراءات المتخذة" value={d.actionsTaken} lines={3} />
            <NotesBox label="السبب الجذري" value={d.rootCause} lines={2} />
            <NotesBox label="الإجراءات الوقائية" value={d.preventive} lines={2} />
            <SignatureBlock rightLabel="مسؤول الحادث" leftLabel="مدير تقنية المعلومات" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
