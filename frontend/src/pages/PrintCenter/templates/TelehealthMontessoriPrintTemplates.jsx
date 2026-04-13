/**
 * قوالب الطب عن بُعد ومونتيسوري والتسجيل
 * Telehealth, Montessori & Registration Print Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const TELEHEALTH_MONTESSORI_TEMPLATES = [
  /* ── الطب عن بُعد ── */
  { id: 'tele-session-summary', name: 'ملخص جلسة عن بُعد', nameEn: 'Telehealth Session Summary', desc: 'ملخص جلسة الطب عن بُعد', color: '#0277bd' },
  { id: 'tele-consent', name: 'موافقة جلسة افتراضية', nameEn: 'Virtual Session Consent', desc: 'نموذج موافقة الجلسة الافتراضية', color: '#0288d1' },
  { id: 'tele-prescription', name: 'وصفة إلكترونية عن بُعد', nameEn: 'Telehealth Prescription', desc: 'الوصفة الإلكترونية عن بُعد', color: '#039be5' },
  { id: 'video-recording-consent', name: 'موافقة تسجيل فيديو', nameEn: 'Video Recording Consent', desc: 'موافقة تسجيل جلسة الفيديو', color: '#03a9f4' },
  { id: 'tele-readiness', name: 'جاهزية تقنية', nameEn: 'Technical Readiness Form', desc: 'نموذج الجاهزية التقنية', color: '#29b6f6' },
  { id: 'tele-followup', name: 'متابعة عن بُعد', nameEn: 'Virtual Follow-Up Report', desc: 'تقرير المتابعة عن بُعد', color: '#4fc3f7' },
  /* ── مونتيسوري ── */
  { id: 'montessori-progress', name: 'تقدم طالب مونتيسوري', nameEn: 'Montessori Progress Report', desc: 'تقرير تقدم طالب مونتيسوري', color: '#4e342e' },
  { id: 'montessori-observation', name: 'ملاحظة نشاط مونتيسوري', nameEn: 'Montessori Observation Sheet', desc: 'ورقة ملاحظة نشاط مونتيسوري', color: '#5d4037' },
  { id: 'montessori-enrollment', name: 'تسجيل مونتيسوري', nameEn: 'Montessori Enrollment Form', desc: 'نموذج تسجيل برنامج مونتيسوري', color: '#6d4c41' },
  { id: 'montessori-assessment', name: 'تقييم مونتيسوري', nameEn: 'Montessori Assessment Report', desc: 'تقرير تقييم مونتيسوري', color: '#795548' },
  { id: 'montessori-session-plan', name: 'خطة جلسة مونتيسوري', nameEn: 'Montessori Session Plan', desc: 'خطة جلسة مونتيسوري', color: '#8d6e63' },
  { id: 'montessori-parent-report', name: 'تقرير لأولياء الأمور', nameEn: 'Montessori Parent Report', desc: 'تقرير التواصل مع أولياء أمور مونتيسوري', color: '#a1887f' },
];

export const TelehealthMontessoriTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'tele-session-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص جلسة الطب عن بُعد" subtitle="Telehealth Session Summary" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="الأخصائي" value={d.specialist} w="25%" /><Field label="المدة" value={d.duration} w="15%" /><Field label="المنصة" value={d.platform} w="20%" /></div>
            <Section title="تفاصيل الجلسة">
              <div style={fieldRow}><Field label="نوع الجلسة" value={d.sessionType} w="30%" /><Field label="رقم الجلسة" value={d.sessionNo} w="20%" /><Field label="جودة الاتصال" value={d.connectionQuality} w="25%" /><Field label="الحالة" value={d.status} w="25%" /></div>
            </Section>
            <NotesBox label="الشكوى / الموضوع" value={d.chiefComplaint} lines={2} />
            <NotesBox label="ملاحظات الجلسة" value={d.sessionNotes} lines={4} />
            <NotesBox label="التوصيات / الخطة" value={d.plan} lines={3} />
            <div style={fieldRow}><Field label="الجلسة القادمة" value={formatDate(d.nextSession)} w="30%" /><Field label="متابعة مطلوبة" value={d.followUpRequired} w="30%" /></div>
            <SignatureBlock rightLabel="الأخصائي" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'tele-consent':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج موافقة الجلسة الافتراضية" subtitle="Virtual Session Consent Form" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="35%" /><Field label="رقم الملف" value={d.fileNo} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <div style={{ margin: '16px 0', lineHeight: 2, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
              <p>أقر أنا الموقع أدناه بموافقتي على تلقي الخدمات العلاجية / التأهيلية عبر الاتصال المرئي (الجلسات الافتراضية) وفق الشروط التالية:</p>
              <ol style={{ paddingRight: 20 }}>
                <li>فهمي لطبيعة الجلسات عن بُعد والفرق بينها وبين الجلسات الحضورية.</li>
                <li>الالتزام بتوفير بيئة مناسبة وهادئة واتصال إنترنت مستقر.</li>
                <li>عدم تسجيل الجلسة أو مشاركتها دون إذن مسبق.</li>
                <li>إبلاغ الأخصائي بأي مشاكل تقنية فوراً.</li>
                <li>فهمي أن الجلسات عن بُعد قد لا تناسب جميع الحالات.</li>
              </ol>
            </div>
            <SignatureBlock rightLabel="المستفيد / ولي الأمر" leftLabel="الأخصائي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'tele-prescription':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="وصفة إلكترونية عن بُعد" subtitle="Telehealth E-Prescription" />
          <div style={bodyPad}>
            <Section title="بيانات المريض">
              <div style={fieldRow}><Field label="الاسم" value={d.patientName} w="35%" /><Field label="رقم الملف" value={d.fileNo} w="20%" /><Field label="العمر" value={d.age} w="15%" /><Field label="الوزن" value={d.weight} w="15%" /></div>
            </Section>
            <Section title="بيانات الطبيب">
              <div style={fieldRow}><Field label="الطبيب" value={d.doctorName} w="35%" /><Field label="التخصص" value={d.specialty} w="25%" /><Field label="رقم الترخيص" value={d.licenseNo} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            </Section>
            <Section title="الوصفة">
              <EmptyTable cols={6} rows={6} headers={['الدواء', 'الجرعة', 'التكرار', 'المدة', 'طريقة الاستخدام', 'ملاحظات']} />
            </Section>
            <NotesBox label="تعليمات خاصة" value={d.instructions} lines={2} />
            <div style={{ margin: '12px 0', padding: 10, background: '#fff3e0', borderRadius: 8, fontSize: 11 }}>
              ⚠️ وصفة صادرة عبر الطب عن بُعد — رقم الجلسة: {d.sessionId || '________'}
            </div>
            <SignatureBlock rightLabel="الطبيب المعالج" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'video-recording-consent':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="موافقة تسجيل جلسة الفيديو" subtitle="Video Session Recording Consent" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="35%" /><Field label="ولي الأمر" value={d.guardian} w="35%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="30%" /></div>
            <div style={{ margin: '16px 0', lineHeight: 2, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
              <p>أقر بموافقتي على تسجيل الجلسة المرئية للأغراض التالية:</p>
              <div style={{ padding: '8px 16px' }}>
                <p>☐ أغراض علاجية / متابعة التقدم</p>
                <p>☐ أغراض تدريبية / إشرافية</p>
                <p>☐ أغراض بحثية (مع حفظ الهوية)</p>
              </div>
              <p>مع العلم بأن:</p>
              <ol style={{ paddingRight: 20 }}>
                <li>التسجيل يحفظ بشكل آمن ومشفر.</li>
                <li>لن يُشارك إلا مع الفريق المعالج المعتمد.</li>
                <li>يمكن سحب الموافقة في أي وقت.</li>
                <li>يتم حذف التسجيل بعد انتهاء الغرض منه.</li>
              </ol>
            </div>
            <SignatureBlock rightLabel="المستفيد / ولي الأمر" leftLabel="الأخصائي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'tele-readiness':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج الجاهزية التقنية" subtitle="Technical Readiness Form" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="35%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="25%" /><Field label="الفني" value={d.techSupport} w="40%" /></div>
            <Section title="قائمة الفحص التقني">
              <EmptyTable cols={4} rows={8} headers={['البند', 'متوفر', 'غير متوفر', 'ملاحظات']} />
            </Section>
            <NotesBox label="التوصيات التقنية" value={d.techRecommendations} lines={2} />
            <div style={fieldRow}><Field label="جاهز للجلسات" value={d.ready} w="30%" /><Field label="الإجراءات المطلوبة" value={d.actionsRequired} w="70%" /></div>
            <SignatureBlock rightLabel="الفني" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'tele-followup':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير المتابعة عن بُعد" subtitle="Virtual Follow-Up Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.name} w="30%" /><Field label="الأخصائي" value={d.specialist} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="نوع المتابعة" value={d.followUpType} w="25%" /></div>
            <Section title="ملخص المتابعة">
              <NotesBox label="الحالة العامة" value={d.generalCondition} lines={2} />
              <NotesBox label="الالتزام بالعلاج" value={d.adherence} lines={2} />
              <NotesBox label="التطورات" value={d.developments} lines={2} />
            </Section>
            <NotesBox label="التعديلات المقترحة" value={d.proposedChanges} lines={2} />
            <div style={fieldRow}><Field label="المتابعة القادمة" value={formatDate(d.nextFollowUp)} w="30%" /><Field label="الحاجة لزيارة حضورية" value={d.inPersonNeeded} w="30%" /></div>
            <SignatureBlock rightLabel="الأخصائي" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ مونتيسوري ══════════════ */
    case 'montessori-progress':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تقدم طالب مونتيسوري" subtitle="Montessori Student Progress Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.studentName} w="30%" /><Field label="المرحلة" value={d.level} w="20%" /><Field label="الفترة" value={d.period} w="25%" /><Field label="المعلم/ة" value={d.teacher} w="25%" /></div>
            <Section title="الحياة العملية">
              <EmptyTable cols={4} rows={5} headers={['النشاط', 'مقدم', 'ممارس', 'متقن']} />
            </Section>
            <Section title="الحسي">
              <EmptyTable cols={4} rows={5} headers={['النشاط', 'مقدم', 'ممارس', 'متقن']} />
            </Section>
            <Section title="اللغة والرياضيات">
              <EmptyTable cols={4} rows={5} headers={['النشاط', 'مقدم', 'ممارس', 'متقن']} />
            </Section>
            <NotesBox label="ملاحظات المعلم/ة" value={d.teacherNotes} lines={3} />
            <SignatureBlock rightLabel="المعلم/ة" leftLabel="منسق البرنامج" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'montessori-observation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ورقة ملاحظة نشاط مونتيسوري" subtitle="Montessori Activity Observation Sheet" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.studentName} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="الوقت" value={d.time} w="15%" /><Field label="النشاط" value={d.activity} w="25%" /><Field label="الملاحِظ" value={d.observer} w="20%" /></div>
            <Section title="تفاصيل الملاحظة">
              <NotesBox label="اختيار النشاط" value={d.activityChoice} lines={1} />
              <NotesBox label="التركيز والانتباه" value={d.concentration} lines={2} />
              <NotesBox label="التكرار والاستقلالية" value={d.repetition} lines={2} />
              <NotesBox label="التفاعل الاجتماعي" value={d.socialInteraction} lines={2} />
              <NotesBox label="حل المشكلات" value={d.problemSolving} lines={2} />
            </Section>
            <div style={fieldRow}><Field label="مدة النشاط" value={d.activityDuration} w="25%" /><Field label="أكمل النشاط" value={d.completed} w="25%" /><Field label="أعاد الأدوات" value={d.returnedMaterials} w="25%" /><Field label="مستوى الاستقلالية" value={d.independence} w="25%" /></div>
            <SignatureBlock rightLabel="الملاحِظ" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'montessori-enrollment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تسجيل برنامج مونتيسوري" subtitle="Montessori Program Enrollment Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الطفل">
              <div style={fieldRow}><Field label="الاسم" value={d.childName} w="35%" /><Field label="تاريخ الميلاد" value={formatDate(d.dob)} w="20%" /><Field label="العمر" value={d.age} w="15%" /><Field label="الجنس" value={d.gender} w="15%" /></div>
            </Section>
            <Section title="بيانات ولي الأمر">
              <div style={fieldRow}><Field label="الاسم" value={d.guardianName} w="35%" /><Field label="الجوال" value={d.phone} w="25%" /><Field label="البريد" value={d.email} w="40%" /></div>
            </Section>
            <Section title="التقييم الأولي">
              <div style={fieldRow}><Field label="المرحلة المقترحة" value={d.suggestedLevel} w="30%" /><Field label="خبرة سابقة بمونتيسوري" value={d.prevExperience} w="35%" /><Field label="احتياجات خاصة" value={d.specialNeeds} w="35%" /></div>
            </Section>
            <NotesBox label="أهداف الأسرة" value={d.familyGoals} lines={2} />
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="ولي الأمر" leftLabel="منسق البرنامج" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'montessori-assessment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تقييم مونتيسوري" subtitle="Montessori Assessment Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.studentName} w="30%" /><Field label="المرحلة" value={d.level} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="المقيّم" value={d.assessor} w="30%" /></div>
            <Section title="المجالات">
              <EmptyTable cols={5} rows={6} headers={['المجال', 'المستوى الحالي', 'نقاط القوة', 'فرص النمو', 'الأنشطة المقترحة']} />
            </Section>
            <NotesBox label="ملخص التقييم" value={d.summary} lines={3} />
            <NotesBox label="التوصيات للأسرة" value={d.familyRecommendations} lines={2} />
            <SignatureBlock rightLabel="المقيّم" leftLabel="منسق البرنامج" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'montessori-session-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة جلسة مونتيسوري" subtitle="Montessori Session Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المعلم/ة" value={d.teacher} w="25%" /><Field label="المرحلة" value={d.level} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="عدد الطلاب" value={d.studentCount} w="15%" /><Field label="المدة" value={d.duration} w="20%" /></div>
            <Section title="الأنشطة المخططة">
              <EmptyTable cols={5} rows={8} headers={['الوقت', 'النشاط', 'المجال', 'الأدوات', 'الأهداف']} />
            </Section>
            <NotesBox label="ملاحظات التحضير" value={d.prepNotes} lines={2} />
            <NotesBox label="ملاحظات ما بعد الجلسة" value={d.postNotes} lines={2} />
            <SignatureBlock rightLabel="المعلم/ة" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'montessori-parent-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير التواصل مع أولياء الأمور — مونتيسوري" subtitle="Montessori Parent Communication Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.studentName} w="30%" /><Field label="ولي الأمر" value={d.parentName} w="30%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="المعلم/ة" value={d.teacher} w="20%" /></div>
            <Section title="التقدم في المجالات">
              <EmptyTable cols={4} rows={6} headers={['المجال', 'الأنشطة المفضلة', 'التقدم', 'الملاحظات']} />
            </Section>
            <NotesBox label="نقاط القوة الملحوظة" value={d.strengths} lines={2} />
            <NotesBox label="مجالات النمو" value={d.growthAreas} lines={2} />
            <NotesBox label="اقتراحات للمنزل" value={d.homeSuggestions} lines={3} />
            <div style={{ textAlign: 'center', margin: '16px 0', fontSize: 12, color: '#666' }}>
              "التعليم ليس ما يعطيه المعلم، بل هو عملية طبيعية يقوم بها الطفل." — ماريا مونتيسوري
            </div>
            <SignatureBlock rightLabel="المعلم/ة" leftLabel="منسق البرنامج" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
