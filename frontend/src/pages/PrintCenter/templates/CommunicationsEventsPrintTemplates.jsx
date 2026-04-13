/**
 * قوالب طباعة الاتصالات والفعاليات — Communications & Events Print Templates
 * يشمل: المراسلات، الاجتماعات، العلاقات العامة، الفعاليات
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const COMMUNICATIONS_TEMPLATES = [
  // المراسلات
  { id: 'incoming-letter', name: 'خطاب وارد', nameEn: 'Incoming Letter', desc: 'تسجيل خطاب وارد', color: '#1a237e' },
  { id: 'correspondence-log', name: 'سجل المراسلات', nameEn: 'Correspondence Log', desc: 'سجل المراسلات الصادرة والواردة', color: '#283593' },
  // الاجتماعات
  { id: 'meeting-agenda', name: 'جدول أعمال اجتماع', nameEn: 'Meeting Agenda', desc: 'جدول أعمال مسبق للاجتماع', color: '#0d47a1' },
  { id: 'meeting-attendance', name: 'كشف حضور اجتماع', nameEn: 'Meeting Attendance', desc: 'كشف توقيعات حضور الاجتماع', color: '#1565c0' },
  { id: 'action-items', name: 'بنود المتابعة', nameEn: 'Meeting Action Items', desc: 'بنود المتابعة من الاجتماع', color: '#1976d2' },
  // العلاقات العامة
  { id: 'press-release', name: 'بيان صحفي', nameEn: 'Press Release', desc: 'نموذج بيان صحفي', color: '#880e4f' },
  { id: 'media-kit', name: 'ملف إعلامي', nameEn: 'Media Kit', desc: 'ملف إعلامي للمركز', color: '#ad1457' },
  { id: 'sponsorship-proposal', name: 'عرض رعاية', nameEn: 'Sponsorship Proposal', desc: 'مقترح رعاية فعالية', color: '#c2185b' },
  // الفعاليات
  { id: 'event-invitation', name: 'دعوة فعالية', nameEn: 'Event Invitation', desc: 'بطاقة دعوة لفعالية', color: '#4a148c' },
  { id: 'event-program', name: 'برنامج فعالية', nameEn: 'Event Program', desc: 'البرنامج الزمني للفعالية', color: '#6a1b9a' },
  { id: 'participation-cert', name: 'شهادة مشاركة', nameEn: 'Participation Certificate', desc: 'شهادة مشاركة في فعالية', color: '#7b1fa2' },
  { id: 'event-report', name: 'تقرير فعالية', nameEn: 'Event Report', desc: 'تقرير ختامي للفعالية', color: '#8e24aa' },
];

export const CommunicationsTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'incoming-letter':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطاب وارد" subtitle="Incoming Letter Registration" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الخطاب">
              <div style={fieldRow}><Field label="رقم الوارد" value={d.incomingNo} w="25%" /><Field label="تاريخ الورود" value={formatDate(d.receivedDate) || today()} w="25%" /><Field label="رقم الخطاب" value={d.letterNo} w="25%" /><Field label="تاريخ الخطاب" value={formatDate(d.letterDate)} w="25%" /></div>
              <div style={fieldRow}><Field label="الجهة المرسلة" value={d.sender} w="50%" /><Field label="الموضوع" value={d.subject} w="50%" /></div>
              <div style={fieldRow}><Field label="موجه إلى" value={d.directedTo} w="50%" /><Field label="الأولوية" value={d.priority} w="25%" /><Field label="سرية" value={d.confidential} w="25%" /></div>
            </Section>
            <NotesBox label="ملخص المحتوى" value={d.summary} lines={3} />
            <Section title="الإحالة">
              <EmptyTable cols={4} rows={4} headers={['محال إلى', 'التعليمات', 'التاريخ', 'التوقيع']} />
            </Section>
            <SignatureBlock rightLabel="مدير المراسلات" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'correspondence-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل المراسلات" subtitle="Correspondence Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="النوع" value={d.type || 'صادر ووارد'} w="30%" /><Field label="الفترة" value={d.period} w="35%" /><Field label="القسم" value={d.department} w="35%" /></div>
            <Section title="سجل المراسلات">
              <EmptyTable cols={7} rows={20} headers={['م', 'الرقم', 'التاريخ', 'صادر/وارد', 'الجهة', 'الموضوع', 'الحالة']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الصادر" value={d.totalOutgoing} w="25%" /><Field label="إجمالي الوارد" value={d.totalIncoming} w="25%" /><Field label="قيد الإنجاز" value={d.pending} w="25%" /><Field label="مكتمل" value={d.completed} w="25%" /></div>
            <SignatureBlock rightLabel="مسؤول المراسلات" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'meeting-agenda':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="جدول أعمال اجتماع" subtitle="Meeting Agenda" />
          <div style={bodyPad}>
            <Section title="بيانات الاجتماع">
              <div style={fieldRow}><Field label="عنوان الاجتماع" value={d.title} w="50%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="25%" /><Field label="الوقت" value={d.time} w="25%" /></div>
              <div style={fieldRow}><Field label="المكان" value={d.venue} w="40%" /><Field label="رئيس الاجتماع" value={d.chair} w="30%" /><Field label="مقرر الاجتماع" value={d.secretary} w="30%" /></div>
            </Section>
            <Section title="المدعوون">
              <EmptyTable cols={4} rows={8} headers={['م', 'الاسم', 'المنصب / القسم', 'تأكيد الحضور']} />
            </Section>
            <Section title="بنود جدول الأعمال">
              <EmptyTable cols={4} rows={8} headers={['م', 'البند', 'المقدم', 'الوقت المخصص']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} />
          </div>
          <OrgFooter />
        </div>
      );

    case 'meeting-attendance':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="كشف حضور اجتماع" subtitle="Meeting Attendance Sheet" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="عنوان الاجتماع" value={d.title} w="50%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="25%" /><Field label="الوقت" value={d.time} w="25%" /></div>
            <div style={fieldRow}><Field label="المكان" value={d.venue} w="50%" /><Field label="رئيس الاجتماع" value={d.chair} w="50%" /></div>
            <Section title="الحضور">
              <EmptyTable cols={5} rows={15} headers={['م', 'الاسم', 'المنصب / القسم', 'الجوال', 'التوقيع']} />
            </Section>
            <SignatureBlock rightLabel="رئيس الاجتماع" leftLabel="مقرر الاجتماع" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'action-items':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بنود المتابعة" subtitle="Meeting Action Items" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الاجتماع" value={d.meetingTitle} w="50%" /><Field label="التاريخ" value={formatDate(d.date)} w="25%" /><Field label="رقم المحضر" value={d.minutesRef} w="25%" /></div>
            <Section title="بنود المتابعة">
              <EmptyTable cols={6} rows={10} headers={['م', 'البند / القرار', 'المسؤول', 'الموعد النهائي', 'الحالة', 'ملاحظات']} />
            </Section>
            <NotesBox label="تاريخ المتابعة القادم" value={d.nextFollowUp} />
            <SignatureBlock rightLabel="مقرر الاجتماع" leftLabel="رئيس الاجتماع" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'press-release':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بيان صحفي" subtitle="Press Release" />
          <div style={bodyPad}>
            <div style={{ textAlign: 'center', fontSize: 10, color: '#888', marginBottom: 16 }}>للنشر الفوري — For Immediate Release</div>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="30%" /><Field label="المرجع" value={d.refNo} w="30%" /><Field label="جهة الاتصال" value={d.contact} w="40%" /></div>
            <div style={{ margin: '20px 0', textAlign: 'center' }}>
              <h2 style={{ fontSize: 18, color: '#333' }}>{d.headline || 'عنوان البيان الصحفي'}</h2>
              <h3 style={{ fontSize: 14, color: '#666', fontWeight: 'normal' }}>{d.subHeadline || ''}</h3>
            </div>
            <NotesBox label="نص البيان" value={d.body} lines={12} />
            <NotesBox label="اقتباس" value={d.quote} lines={3} />
            <div style={{ margin: '16px 0', padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
              <strong>عن المركز:</strong> {d.boilerplate || 'مركز الأوائل لتأهيل ذوي الإعاقة هو مركز رائد في تقديم خدمات التأهيل الشامل في المملكة العربية السعودية.'}
            </div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'media-kit':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملف إعلامي" subtitle="Media Kit" />
          <div style={bodyPad}>
            <Section title="نبذة عن المركز">
              <NotesBox value={d.about || 'مركز الأوائل لتأهيل ذوي الإعاقة...'} lines={4} />
            </Section>
            <Section title="الحقائق الرئيسية">
              <div style={fieldRow}><Field label="تأسس" value={d.founded} w="25%" /><Field label="عدد المستفيدين" value={d.beneficiaries} w="25%" /><Field label="عدد الموظفين" value={d.employees} w="25%" /><Field label="الخدمات" value={d.services} w="25%" /></div>
            </Section>
            <Section title="الإنجازات">
              <EmptyTable cols={3} rows={6} headers={['الإنجاز', 'السنة', 'التفاصيل']} />
            </Section>
            <Section title="جهات الاتصال الإعلامية">
              <EmptyTable cols={4} rows={3} headers={['الاسم', 'المنصب', 'الهاتف', 'البريد']} />
            </Section>
          </div>
          <OrgFooter />
        </div>
      );

    case 'sponsorship-proposal':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مقترح رعاية فعالية" subtitle="Sponsorship Proposal" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الفعالية">
              <div style={fieldRow}><Field label="اسم الفعالية" value={d.eventName} w="50%" /><Field label="التاريخ" value={formatDate(d.eventDate)} w="25%" /><Field label="المكان" value={d.venue} w="25%" /></div>
              <div style={fieldRow}><Field label="العدد المتوقع" value={d.expectedAttendees} w="25%" /><Field label="الفئة المستهدفة" value={d.targetAudience} w="75%" /></div>
            </Section>
            <NotesBox label="وصف الفعالية" value={d.description} lines={3} />
            <Section title="باقات الرعاية">
              <EmptyTable cols={4} rows={5} headers={['الباقة', 'المبلغ', 'المزايا', 'ملاحظات']} />
            </Section>
            <NotesBox label="العائد على الراعي" value={d.roi} lines={3} />
            <SignatureBlock rightLabel="مسؤول العلاقات العامة" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'event-invitation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="دعوة فعالية" subtitle="Event Invitation" />
          <div style={bodyPad}>
            <div style={{ textAlign: 'center', margin: '30px 0' }}>
              <div style={{ fontSize: 14, color: '#666' }}>يتشرف مركز الأوائل لتأهيل ذوي الإعاقة بدعوتكم لحضور</div>
              <h2 style={{ fontSize: 22, color: '#4a148c', margin: '16px 0' }}>{d.eventName || 'اسم الفعالية'}</h2>
              <div style={{ fontSize: 14, margin: '12px 0' }}>وذلك يوم <strong>{formatDate(d.eventDate) || '_______________'}</strong></div>
              <div style={{ fontSize: 14, margin: '12px 0' }}>الموافق <strong>{d.hijriDate || '_______________'}</strong></div>
              <div style={{ fontSize: 14, margin: '12px 0' }}>في تمام الساعة <strong>{d.time || '______'}</strong></div>
              <div style={{ fontSize: 14, margin: '12px 0' }}>المكان: <strong>{d.venue || '_______________'}</strong></div>
            </div>
            <NotesBox label="برنامج الفعالية" value={d.program} lines={6} />
            <div style={{ textAlign: 'center', margin: '20px 0', fontSize: 12, color: '#999' }}>
              للتأكيد: {d.rsvpContact || 'الرجاء تأكيد الحضور قبل ____/__/__'}
            </div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'event-program':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="البرنامج الزمني للفعالية" subtitle="Event Program Schedule" />
          <div style={bodyPad}>
            <div style={{ textAlign: 'center', margin: '16px 0' }}>
              <h2 style={{ fontSize: 18, color: '#333' }}>{d.eventName || 'اسم الفعالية'}</h2>
              <div style={{ fontSize: 13, color: '#666' }}>{formatDate(d.eventDate)} — {d.venue}</div>
            </div>
            <Section title="البرنامج">
              <EmptyTable cols={4} rows={12} headers={['الوقت', 'الفقرة', 'المقدم / المتحدث', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات عامة" value={d.notes} />
          </div>
          <OrgFooter />
        </div>
      );

    case 'participation-cert':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة مشاركة" subtitle="Certificate of Participation" />
          <div style={bodyPad}>
            <div style={{ textAlign: 'center', margin: '40px 0' }}>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>يشهد مركز الأوائل لتأهيل ذوي الإعاقة بأن</div>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#4a148c', margin: '20px 0', borderBottom: '3px solid #4a148c', display: 'inline-block', padding: '0 40px 8px' }}>
                {d.participantName || '___________________________'}
              </div>
              <div style={{ fontSize: 14, color: '#666', margin: '20px 0' }}>قد شارك/ت في</div>
              <div style={{ fontSize: 20, fontWeight: 'bold', color: '#333', margin: '16px 0' }}>{d.eventName || 'اسم الفعالية / البرنامج'}</div>
              <div style={{ fontSize: 14, margin: '16px 0' }}>خلال الفترة من <strong>{formatDate(d.fromDate) || '____'}</strong> إلى <strong>{formatDate(d.toDate) || '____'}</strong></div>
              <div style={{ fontSize: 14, margin: '16px 0' }}>بإجمالي <strong>{d.hours || '____'}</strong> ساعة</div>
            </div>
            <SignatureBlock rightLabel="المدير العام" leftLabel="" />
            <div style={{ textAlign: 'center', fontSize: 10, color: '#999', marginTop: 20 }}>رقم الشهادة: {d.certNo || '________'} — التاريخ: {formatDate(d.date) || today()}</div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'event-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير ختامي للفعالية" subtitle="Event Closing Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الفعالية">
              <div style={fieldRow}><Field label="اسم الفعالية" value={d.eventName} w="50%" /><Field label="التاريخ" value={formatDate(d.eventDate)} w="25%" /><Field label="المكان" value={d.venue} w="25%" /></div>
              <div style={fieldRow}><Field label="عدد الحضور" value={d.attendees} w="25%" /><Field label="المنظم" value={d.organizer} w="25%" /><Field label="الميزانية" value={d.budget} w="25%" /><Field label="التكلفة الفعلية" value={d.actualCost} w="25%" /></div>
            </Section>
            <NotesBox label="الملخص" value={d.summary} lines={3} />
            <NotesBox label="الإنجازات" value={d.achievements} lines={3} />
            <NotesBox label="التحديات" value={d.challenges} lines={2} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="مسؤول الفعاليات" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
