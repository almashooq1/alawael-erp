/**
 * قوالب خدمات الطلاب الموسّعة
 * Student Extended Services Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const STUDENT_EXTENDED_TEMPLATES = [
  { id: 'student-enrollment-form', name: 'نموذج تسجيل طالب', nameEn: 'Student Enrollment Form', desc: 'نموذج تسجيل طالب جديد شامل', color: '#1565c0' },
  { id: 'student-withdrawal-form', name: 'نموذج انسحاب طالب', nameEn: 'Student Withdrawal Form', desc: 'نموذج انسحاب وإخلاء طرف', color: '#1976d2' },
  { id: 'student-medical-record', name: 'السجل الطبي للطالب', nameEn: 'Student Medical Record', desc: 'ملف طبي شامل للطالب', color: '#c62828' },
  { id: 'medication-admin-form', name: 'نموذج إعطاء الأدوية', nameEn: 'Medication Administration', desc: 'نموذج إعطاء الأدوية داخل المنشأة', color: '#d32f2f' },
  { id: 'student-incident-report', name: 'تقرير حادث طالب', nameEn: 'Student Incident Report', desc: 'تقرير حادث أو إصابة طالب', color: '#e53935' },
  { id: 'student-absence-letter', name: 'خطاب غياب طالب', nameEn: 'Student Absence Letter', desc: 'خطاب إشعار غياب لولي الأمر', color: '#f57c00' },
  { id: 'student-award-cert', name: 'شهادة تكريم طالب', nameEn: 'Student Award Certificate', desc: 'شهادة تكريم وتميز', color: '#ff8f00' },
  { id: 'student-disciplinary', name: 'نموذج إجراء تأديبي', nameEn: 'Disciplinary Action Form', desc: 'نموذج إجراء تأديبي رسمي', color: '#bf360c' },
  { id: 'bus-permission-form', name: 'إذن ركوب الحافلة', nameEn: 'Bus Permission Form', desc: 'نموذج إذن ولي الأمر لركوب الحافلة', color: '#4527a0' },
  { id: 'pickup-authorization', name: 'تفويض استلام طالب', nameEn: 'Pickup Authorization', desc: 'تفويض شخص لاستلام الطالب', color: '#6a1b9a' },
  { id: 'student-allergy-card', name: 'بطاقة حساسية الطالب', nameEn: 'Student Allergy Card', desc: 'بطاقة الحساسية والتحذيرات الطبية', color: '#ad1457' },
  { id: 'student-daily-report', name: 'التقرير اليومي للطالب', nameEn: 'Student Daily Report', desc: 'تقرير يومي لولي الأمر', color: '#00695c' },
  { id: 'student-photo-consent', name: 'إذن تصوير الطالب', nameEn: 'Photo Consent Form', desc: 'نموذج موافقة ولي الأمر على التصوير', color: '#2e7d32' },
  { id: 'student-activity-reg', name: 'تسجيل نشاط طلابي', nameEn: 'Student Activity Registration', desc: 'نموذج تسجيل في نشاط لامنهجي', color: '#0277bd' },
  { id: 'student-counseling-form', name: 'نموذج إرشاد طلابي', nameEn: 'Student Counseling Form', desc: 'نموذج جلسة إرشاد نفسي/اجتماعي', color: '#7b1fa2' },
  { id: 'student-progress-letter', name: 'خطاب تقدم الطالب', nameEn: 'Student Progress Letter', desc: 'خطاب لولي الأمر عن تقدم الطالب', color: '#1e88e5' },
];

export const StudentExtendedTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'student-enrollment-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تسجيل طالب جديد" subtitle="Student Enrollment Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الطالب">
              <div style={fieldRow}><Field label="الاسم الكامل" value={d.fullName} w="30%" /><Field label="رقم الهوية" value={d.idNumber} w="15%" /><Field label="تاريخ الميلاد" value={formatDate(d.dob)} w="15%" /><Field label="الجنس" value={d.gender} w="10%" /></div>
              <div style={fieldRow}><Field label="الجنسية" value={d.nationality} w="15%" /><Field label="فصيلة الدم" value={d.bloodType} w="10%" /><Field label="نوع الإعاقة" value={d.disabilityType} w="15%" /><Field label="درجتها" value={d.disabilityDegree} w="10%" /></div>
            </Section>
            <Section title="بيانات ولي الأمر">
              <div style={fieldRow}><Field label="الاسم" value={d.parentName} w="25%" /><Field label="صلة القرابة" value={d.relation} w="12%" /><Field label="الهاتف" value={d.phone} w="15%" /><Field label="العنوان" value={d.address} w="25%" /></div>
            </Section>
            <Section title="البيانات الصحية">
              <NotesBox label="الأمراض المزمنة" value={d.chronicDiseases} lines={1} />
              <NotesBox label="الحساسية" value={d.allergies} lines={1} />
              <NotesBox label="الأدوية الحالية" value={d.medications} lines={1} />
            </Section>
            <Section title="المستندات المرفقة">
              <EmptyTable cols={3} rows={6} headers={['المستند', 'مرفق', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="ولي الأمر" leftLabel="مسؤول القبول" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'student-withdrawal-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج انسحاب وإخلاء طرف" subtitle="Student Withdrawal & Clearance Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="رقم الهوية" value={d.idNumber} w="15%" /><Field label="الصف" value={d.grade} w="10%" /><Field label="تاريخ الانسحاب" value={formatDate(d.withdrawalDate)} w="15%" /></div>
            <NotesBox label="سبب الانسحاب" value={d.reason} lines={2} />
            <Section title="إخلاء الطرف">
              <EmptyTable cols={4} rows={6} headers={['القسم', 'الحالة', 'التوقيع', 'التاريخ']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="ولي الأمر" leftLabel="مدير المنشأة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'student-medical-record':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="السجل الطبي الشامل للطالب" subtitle="Student Medical Record" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="تاريخ الميلاد" value={formatDate(d.dob)} w="15%" /><Field label="فصيلة الدم" value={d.bloodType} w="10%" /></div>
            <Section title="التاريخ الطبي">
              <EmptyTable cols={4} rows={6} headers={['الحالة', 'التاريخ', 'العلاج', 'ملاحظات']} />
            </Section>
            <Section title="التطعيمات">
              <EmptyTable cols={4} rows={6} headers={['التطعيم', 'التاريخ', 'الجرعة', 'القادم']} />
            </Section>
            <NotesBox label="حساسية" value={d.allergies} lines={1} />
            <NotesBox label="أدوية مستمرة" value={d.medications} lines={1} />
            <SignatureBlock rightLabel="الطبيب" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'medication-admin-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج إعطاء الأدوية" subtitle="Medication Administration Form" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="الصف" value={d.grade} w="10%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="الأدوية المصرح بها">
              <EmptyTable cols={6} rows={5} headers={['الدواء', 'الجرعة', 'الوقت', 'الطريقة', 'المعطي', 'التوقيع']} />
            </Section>
            <NotesBox label="تعليمات خاصة من الطبيب" value={d.instructions} lines={2} />
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="ولي الأمر (تفويض)" leftLabel="الممرض/المسؤول" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'student-incident-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حادث أو إصابة طالب" subtitle="Student Incident Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="الصف" value={d.grade} w="10%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="الوقت" value={d.time} w="10%" /></div>
            <div style={fieldRow}><Field label="المكان" value={d.location} w="20%" /><Field label="نوع الحادث" value={d.incidentType} w="15%" /><Field label="الشاهد" value={d.witness} w="20%" /></div>
            <NotesBox label="وصف الحادث" value={d.description} lines={3} />
            <NotesBox label="الإسعافات الأولية" value={d.firstAid} lines={2} />
            <NotesBox label="الإجراءات المتخذة" value={d.actions} lines={2} />
            <div style={fieldRow}><Field label="تم إبلاغ ولي الأمر" value={d.parentNotified} w="15%" /><Field label="الوقت" value={d.notificationTime} w="10%" /></div>
            <SignatureBlock rightLabel="المشرف" leftLabel="مدير المنشأة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'student-absence-letter':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطاب إشعار غياب طالب" subtitle="Student Absence Notification Letter" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <NotesBox label="" value={`ولي أمر الطالب / ${d.student || '........................'}`} lines={0} />
            <NotesBox label="" value="السلام عليكم ورحمة الله وبركاته" lines={0} />
            <NotesBox label="" value={`نفيدكم بأن ابنكم/ابنتكم قد تغيب عن المنشأة بدون عذر خلال الفترة التالية:`} lines={0} />
            <Section title="سجل الغياب">
              <EmptyTable cols={3} rows={6} headers={['التاريخ', 'عدد الحصص', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي أيام الغياب" value={d.totalDays} w="15%" /></div>
            <NotesBox label="نأمل التكرم بمراجعة المنشأة أو التواصل مع الإدارة." value="" lines={0} />
            <SignatureBlock rightLabel="مدير المنشأة" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'student-award-cert':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة تكريم وتميز" subtitle="Student Award Certificate" />
          <div style={bodyPad}>
            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
              <NotesBox label="" value="يسر مركز الأوائل للتأهيل أن يمنح شهادة تكريم إلى:" lines={0} />
              <div style={{ ...fieldRow, justifyContent: 'center', margin: '20px 0' }}><Field label="الطالب" value={d.student} w="40%" /></div>
              <div style={{ ...fieldRow, justifyContent: 'center' }}><Field label="الصف" value={d.grade} w="15%" /><Field label="العام" value={d.year} w="12%" /></div>
              <NotesBox label="وذلك لتميزه/تميزها في" value={d.reason} lines={2} />
              <div style={{ ...fieldRow, justifyContent: 'center' }}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            </div>
            <SignatureBlock rightLabel="المعلم المسؤول" leftLabel="مدير المنشأة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'student-disciplinary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج إجراء تأديبي" subtitle="Disciplinary Action Form" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="الصف" value={d.grade} w="10%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <NotesBox label="وصف المخالفة" value={d.violation} lines={3} />
            <div style={fieldRow}><Field label="مستوى المخالفة" value={d.level} w="15%" /><Field label="التكرار" value={d.occurrence} w="12%" /></div>
            <NotesBox label="الإجراء التأديبي" value={d.action} lines={2} />
            <NotesBox label="تعهد الطالب/ولي الأمر" value={d.pledge} lines={2} />
            <SignatureBlock rightLabel="الطالب / ولي الأمر" leftLabel="مدير المنشأة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'bus-permission-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إذن ركوب الحافلة المدرسية" subtitle="School Bus Permission Form" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="الصف" value={d.grade} w="10%" /><Field label="خط السير" value={d.route} w="20%" /></div>
            <div style={fieldRow}><Field label="ولي الأمر" value={d.parent} w="25%" /><Field label="الهاتف" value={d.phone} w="15%" /><Field label="العنوان" value={d.address} w="25%" /></div>
            <NotesBox label="أقرّ أنا الموقع أدناه بالموافقة على ركوب ابني/ابنتي الحافلة المدرسية والالتزام بتعليمات السلامة." value="" lines={0} />
            <NotesBox label="ملاحظات خاصة (حالات صحية، حساسية، إلخ)" value={d.specialNotes} lines={2} />
            <SignatureBlock rightLabel="ولي الأمر" leftLabel="مسؤول النقل" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'pickup-authorization':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تفويض استلام طالب" subtitle="Student Pickup Authorization" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="الصف" value={d.grade} w="10%" /></div>
            <Section title="الأشخاص المفوضون بالاستلام">
              <EmptyTable cols={5} rows={5} headers={['الاسم', 'صلة القرابة', 'رقم الهوية', 'الهاتف', 'التوقيع']} />
            </Section>
            <NotesBox label="أقرّ أنا ولي الأمر بتفويض الأشخاص المذكورين أعلاه فقط باستلام ابني/ابنتي." value="" lines={0} />
            <SignatureBlock rightLabel="ولي الأمر" leftLabel="مدير المنشأة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'student-allergy-card':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بطاقة حساسية الطالب" subtitle="Student Allergy Alert Card" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={{ border: '3px solid #c62828', borderRadius: 12, padding: 20, marginBottom: 15 }}>
              <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="الصف" value={d.grade} w="10%" /><Field label="فصيلة الدم" value={d.bloodType} w="10%" /></div>
              <Section title="أنواع الحساسية">
                <EmptyTable cols={4} rows={4} headers={['نوع الحساسية', 'المادة المسببة', 'شدة التفاعل', 'الإجراء الطارئ']} />
              </Section>
              <NotesBox label="الأدوية الطارئة" value={d.emergencyMeds} lines={1} />
              <div style={fieldRow}><Field label="طبيب الطالب" value={d.doctor} w="25%" /><Field label="هاتف الطوارئ" value={d.emergencyPhone} w="15%" /></div>
            </div>
            <SignatureBlock rightLabel="ولي الأمر" leftLabel="الممرض" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'student-daily-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="التقرير اليومي للطالب" subtitle="Student Daily Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="الصف" value={d.grade} w="10%" /><Field label="اليوم" value={d.day} w="12%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="التقييم اليومي">
              <EmptyTable cols={5} rows={6} headers={['النشاط', 'ممتاز', 'جيد', 'يحتاج تحسين', 'ملاحظات']} />
            </Section>
            <NotesBox label="الوجبات" value={d.meals} lines={1} />
            <NotesBox label="النوم/الراحة" value={d.rest} lines={1} />
            <NotesBox label="ملاحظات المعلم" value={d.teacherNotes} lines={2} />
            <SignatureBlock rightLabel="المعلم" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'student-photo-consent':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج موافقة على التصوير" subtitle="Photo & Media Consent Form" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="ولي الأمر" value={d.parent} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <NotesBox label="" value="أقرّ أنا الموقع أدناه بالموافقة / عدم الموافقة على تصوير ابني/ابنتي واستخدام الصور في:" lines={0} />
            <Section title="نطاق الموافقة">
              <EmptyTable cols={3} rows={5} headers={['الاستخدام', 'موافق', 'غير موافق']} />
            </Section>
            <NotesBox label="شروط إضافية" value={d.conditions} lines={2} />
            <SignatureBlock rightLabel="ولي الأمر" leftLabel="مدير المنشأة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'student-activity-reg':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تسجيل في نشاط لامنهجي" subtitle="Extracurricular Activity Registration" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="الصف" value={d.grade} w="10%" /><Field label="النشاط" value={d.activity} w="20%" /></div>
            <div style={fieldRow}><Field label="المشرف" value={d.supervisor} w="25%" /><Field label="الأيام" value={d.days} w="15%" /><Field label="الوقت" value={d.time} w="12%" /></div>
            <NotesBox label="أهداف النشاط" value={d.objectives} lines={2} />
            <NotesBox label="موافقة ولي الأمر: أوافق على مشاركة ابني/ابنتي في النشاط المذكور أعلاه." value="" lines={0} />
            <SignatureBlock rightLabel="ولي الأمر" leftLabel="مشرف النشاط" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'student-counseling-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج جلسة إرشاد طلابي" subtitle="Student Counseling Session Form" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="المرشد" value={d.counselor} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="الجلسة رقم" value={d.sessionNo} w="10%" /></div>
            <div style={fieldRow}><Field label="نوع الإرشاد" value={d.type} w="15%" /><Field label="السبب" value={d.reason} w="25%" /></div>
            <NotesBox label="ملخص الجلسة" value={d.summary} lines={3} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <div style={fieldRow}><Field label="الجلسة القادمة" value={formatDate(d.nextSession)} w="15%" /></div>
            <SignatureBlock rightLabel="المرشد" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'student-progress-letter':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطاب تقدم الطالب لولي الأمر" subtitle="Student Progress Letter" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <NotesBox label="" value={`ولي أمر الطالب / ${d.student || '........................'} — حفظه الله`} lines={0} />
            <NotesBox label="" value="السلام عليكم ورحمة الله وبركاته" lines={0} />
            <NotesBox label="" value="يسعدنا إفادتكم بتقدم ابنكم/ابنتكم خلال الفترة الماضية:" lines={0} />
            <Section title="الأداء الأكاديمي">
              <EmptyTable cols={4} rows={5} headers={['المادة', 'التقدير', 'التقدم', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات المعلم" value={d.teacherNotes} lines={2} />
            <NotesBox label="توصيات لولي الأمر" value={d.parentRecommendations} lines={2} />
            <SignatureBlock rightLabel="المعلم" leftLabel="مدير المنشأة" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
