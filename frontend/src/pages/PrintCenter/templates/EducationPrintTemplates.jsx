/**
 * قوالب طباعة التعليم والطلاب — Education & Students Print Templates
 * يشمل: إدارة الطلاب، التعليم، مونتيسوري
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, PrintTable, EmptyTable, RefDateLine, DeclarationBox,
  headerStyle, sectionTitle, fieldRow, bodyPad, pageWrapper,
  formatDate, today,
} from '../shared/PrintTemplateShared';

/* ─── Template Definitions ─── */
export const EDUCATION_TEMPLATES = [
  { id: 'student-enrollment', name: 'نموذج تسجيل طالب', nameEn: 'Student Enrollment Form', desc: 'نموذج تسجيل طالب جديد بالمركز', color: '#1565c0' },
  { id: 'student-transcript', name: 'السجل الأكاديمي', nameEn: 'Student Transcript', desc: 'كشف الدرجات والتقييمات الأكاديمية', color: '#0d47a1' },
  { id: 'student-id', name: 'بطاقة هوية الطالب', nameEn: 'Student ID Card', desc: 'بطاقة تعريف الطالب', color: '#1976d2' },
  { id: 'student-transfer', name: 'خطاب نقل طالب', nameEn: 'Student Transfer Letter', desc: 'خطاب نقل طالب لجهة أخرى', color: '#1e88e5' },
  { id: 'withdrawal-form', name: 'نموذج انسحاب', nameEn: 'Withdrawal Form', desc: 'نموذج انسحاب طالب من البرنامج', color: '#42a5f5' },
  { id: 'report-card', name: 'بطاقة التقرير', nameEn: 'Report Card', desc: 'تقرير أداء الطالب الدوري', color: '#2196f3' },
  { id: 'course-completion', name: 'شهادة إتمام دورة', nameEn: 'Course Completion Certificate', desc: 'شهادة إتمام برنامج تعليمي', color: '#1565c0' },
  { id: 'class-schedule', name: 'جدول الحصص', nameEn: 'Classroom Schedule', desc: 'جدول الحصص الأسبوعي', color: '#0d47a1' },
  { id: 'montessori-observation', name: 'نموذج ملاحظة مونتيسوري', nameEn: 'Montessori Observation Form', desc: 'نموذج ملاحظة سلوك وتعلم الطفل', color: '#4a148c' },
  { id: 'montessori-progress', name: 'تقرير تقدم مونتيسوري', nameEn: 'Montessori Progress Report', desc: 'تقرير تقدم الطفل في برنامج مونتيسوري', color: '#6a1b9a' },
  { id: 'parent-conference', name: 'ملخص اجتماع ولي الأمر', nameEn: 'Parent Conference Summary', desc: 'محضر اجتماع مع ولي الأمر', color: '#7b1fa2' },
  { id: 'individual-learning-plan', name: 'خطة تعلم فردية', nameEn: 'Individual Learning Plan', desc: 'خطة تعليمية مخصصة للطالب', color: '#8e24aa' },
  { id: 'early-intervention', name: 'تقييم تدخل مبكر', nameEn: 'Early Intervention Assessment', desc: 'نموذج تقييم التدخل المبكر', color: '#ab47bc' },
  { id: 'developmental-milestone', name: 'تقرير معالم النمو', nameEn: 'Developmental Milestone Report', desc: 'متابعة معالم النمو التطورية', color: '#9c27b0' },
  { id: 'ifsp', name: 'خطة خدمة الأسرة الفردية', nameEn: 'Individualized Family Service Plan', desc: 'خطة خدمة الأسرة - IFSP', color: '#7b1fa2' },
  { id: 'student-attendance', name: 'سجل حضور الطلاب', nameEn: 'Student Attendance Record', desc: 'كشف حضور الطلاب الشهري', color: '#1565c0' },
  { id: 'behavior-report', name: 'تقرير سلوكي', nameEn: 'Behavior Report', desc: 'تقرير عن سلوك الطالب', color: '#c62828' },
  { id: 'academic-calendar', name: 'التقويم الأكاديمي', nameEn: 'Academic Calendar', desc: 'التقويم الدراسي السنوي', color: '#0d47a1' },
];

/* ─── Template Renderer ─── */
export const EducationTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    /* ─── 1. Student Enrollment Form ─── */
    case 'student-enrollment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تسجيل طالب جديد" subtitle="Student Enrollment Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الطالب">
              <div style={fieldRow}><Field label="اسم الطالب" value={d.studentName} w="50%" /><Field label="تاريخ الميلاد" value={formatDate(d.dob)} w="25%" /><Field label="الجنس" value={d.gender} w="25%" /></div>
              <div style={fieldRow}><Field label="الجنسية" value={d.nationality} w="33%" /><Field label="رقم الهوية" value={d.idNumber} w="33%" /><Field label="فصيلة الدم" value={d.bloodType} w="34%" /></div>
              <div style={fieldRow}><Field label="نوع الإعاقة" value={d.disabilityType} w="50%" /><Field label="درجة الإعاقة" value={d.disabilityDegree} w="50%" /></div>
            </Section>
            <Section title="بيانات ولي الأمر">
              <div style={fieldRow}><Field label="اسم ولي الأمر" value={d.guardianName} w="50%" /><Field label="صلة القرابة" value={d.relation} w="50%" /></div>
              <div style={fieldRow}><Field label="رقم الجوال" value={d.phone} w="33%" /><Field label="البريد الإلكتروني" value={d.email} w="33%" /><Field label="العنوان" value={d.address} w="34%" /></div>
            </Section>
            <Section title="البرنامج المطلوب">
              <div style={fieldRow}><Field label="البرنامج" value={d.program} w="50%" /><Field label="الفترة" value={d.period} w="25%" /><Field label="تاريخ البدء" value={formatDate(d.startDate)} w="25%" /></div>
            </Section>
            <DeclarationBox text="أقر أنا ولي الأمر بصحة البيانات المذكورة أعلاه وأتحمل مسؤوليتها الكاملة." />
            <SignatureBlock rightLabel="توقيع ولي الأمر" leftLabel="مسؤول القبول" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ─── 2. Student Transcript ─── */
    case 'student-transcript':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="السجل الأكاديمي" subtitle="Student Transcript" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الطالب">
              <div style={fieldRow}><Field label="اسم الطالب" value={d.studentName} w="50%" /><Field label="رقم الطالب" value={d.studentId} w="25%" /><Field label="البرنامج" value={d.program} w="25%" /></div>
            </Section>
            <Section title="السجل الأكاديمي">
              <PrintTable headers={['المادة / المهارة', 'الفترة', 'التقييم', 'الدرجة', 'ملاحظات']} rows={d.records || []} />
              {(!d.records || d.records.length === 0) && <EmptyTable cols={5} rows={8} headers={['المادة / المهارة', 'الفترة', 'التقييم', 'الدرجة', 'ملاحظات']} />}
            </Section>
            <Section title="ملخص">
              <div style={fieldRow}><Field label="المعدل العام" value={d.gpa} w="25%" /><Field label="التقدير" value={d.grade} w="25%" /><Field label="الحالة" value={d.status} w="25%" /><Field label="تاريخ الإصدار" value={formatDate(d.issueDate) || today()} w="25%" /></div>
            </Section>
            <SignatureBlock rightLabel="المشرف الأكاديمي" leftLabel="مدير المركز" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ─── 3. Student ID Card ─── */
    case 'student-id':
      return (
        <div style={{ ...pageWrapper, maxWidth: 400, margin: '0 auto' }}>
          <div style={{ border: '3px solid #1565c0', borderRadius: 16, overflow: 'hidden', background: 'linear-gradient(135deg, #e3f2fd, #ffffff)' }}>
            <div style={{ ...headerStyle, padding: '12px 16px', fontSize: 14 }}>
              <strong>بطاقة تعريف الطالب — Student ID</strong>
            </div>
            <div style={{ padding: 16, textAlign: 'center' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid #1565c0', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontSize: 30 }}>👤</div>
              <div style={{ fontSize: 18, fontWeight: 'bold', color: '#1565c0' }}>{d.studentName || '________________'}</div>
              <div style={{ fontSize: 12, color: '#666', margin: '4px 0' }}>{d.program || 'البرنامج: ________'}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '8px 0', borderTop: '1px solid #eee', marginTop: 8 }}>
                <span>رقم: {d.studentId || '____'}</span>
                <span>فصيلة الدم: {d.bloodType || '___'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span>القبول: {formatDate(d.admissionDate) || '________'}</span>
                <span>الصلاحية: {formatDate(d.expiryDate) || '________'}</span>
              </div>
            </div>
          </div>
        </div>
      );

    /* ─── 4. Student Transfer Letter ─── */
    case 'student-transfer':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطاب نقل طالب" subtitle="Student Transfer Letter" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={{ margin: '20px 0', lineHeight: 2 }}>
              <p>السادة / <strong>{d.toOrganization || '________________'}</strong> &nbsp;&nbsp;&nbsp; المحترمين</p>
              <p>السلام عليكم ورحمة الله وبركاته،</p>
              <p>نفيدكم بأن الطالب/ة <strong>{d.studentName || '________________'}</strong> رقم الهوية <strong>{d.idNumber || '________'}</strong>، المسجل/ة لدينا في برنامج <strong>{d.program || '________'}</strong> منذ تاريخ <strong>{formatDate(d.enrollDate) || '________'}</strong>،</p>
              <p>يرغب ولي أمره في نقله/ها إلى مركزكم اعتباراً من تاريخ <strong>{formatDate(d.transferDate) || '________'}</strong>.</p>
              <p>سبب النقل: <strong>{d.reason || '________________________________'}</strong></p>
              <p>مرفق مع هذا الخطاب جميع الوثائق والتقارير الخاصة بالطالب/ة.</p>
              <p>نتمنى له/ها التوفيق والنجاح.</p>
            </div>
            <NotesBox label="ملاحظات" value={d.notes} />
            <SignatureBlock rightLabel="مدير البرنامج" leftLabel="مدير المركز" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ─── 5. Withdrawal Form ─── */
    case 'withdrawal-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج انسحاب من البرنامج" subtitle="Withdrawal Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الطالب">
              <div style={fieldRow}><Field label="اسم الطالب" value={d.studentName} w="50%" /><Field label="رقم الطالب" value={d.studentId} w="25%" /><Field label="البرنامج" value={d.program} w="25%" /></div>
            </Section>
            <Section title="تفاصيل الانسحاب">
              <div style={fieldRow}><Field label="تاريخ الانسحاب" value={formatDate(d.withdrawalDate)} w="33%" /><Field label="سبب الانسحاب" value={d.reason} w="67%" /></div>
              <div style={fieldRow}><Field label="آخر يوم حضور" value={formatDate(d.lastDay)} w="33%" /><Field label="المستحقات المالية" value={d.financialDues} w="33%" /><Field label="الحالة" value={d.status} w="34%" /></div>
            </Section>
            <Section title="إخلاء طرف">
              <EmptyTable cols={4} rows={4} headers={['القسم', 'المسؤول', 'التوقيع', 'التاريخ']} />
            </Section>
            <DeclarationBox text="أقر بموافقتي على سحب ابني/ابنتي من البرنامج وأتحمل كامل المسؤولية." />
            <SignatureBlock rightLabel="توقيع ولي الأمر" leftLabel="مدير القبول" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ─── 6. Report Card ─── */
    case 'report-card':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بطاقة تقرير الطالب الدوري" subtitle="Student Report Card" />
          <div style={bodyPad}>
            <Section title="بيانات الطالب">
              <div style={fieldRow}><Field label="الاسم" value={d.studentName} w="40%" /><Field label="الفصل" value={d.semester} w="20%" /><Field label="العام" value={d.year} w="20%" /><Field label="البرنامج" value={d.program} w="20%" /></div>
            </Section>
            <Section title="التقييمات">
              <PrintTable headers={['المجال', 'المهارة', 'التقييم', 'ملاحظات']} rows={d.evaluations || []} />
              {(!d.evaluations || d.evaluations.length === 0) && <EmptyTable cols={4} rows={10} headers={['المجال', 'المهارة', 'التقييم', 'ملاحظات']} />}
            </Section>
            <NotesBox label="ملاحظات المعلم" value={d.teacherNotes} />
            <NotesBox label="توصيات" value={d.recommendations} />
            <SignatureBlock rightLabel="المعلم / المشرف" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ─── 7. Course Completion Certificate ─── */
    case 'course-completion':
      return (
        <div style={{ ...pageWrapper, border: '4px double #1565c0', padding: 0 }}>
          <div style={{ textAlign: 'center', padding: '50px 40px', background: 'linear-gradient(180deg, #e3f2fd 0%, #fff 40%)' }}>
            <OrgHeader title="شهادة إتمام" subtitle="Certificate of Completion" />
            <div style={{ margin: '40px 0', fontSize: 16, lineHeight: 2.5 }}>
              <p>يشهد مركز الأوائل لرعاية وتأهيل ذوي الاحتياجات الخاصة</p>
              <p>بأن الطالب/ة</p>
              <p style={{ fontSize: 26, fontWeight: 'bold', color: '#1565c0', margin: '10px 0' }}>{d.studentName || '________________'}</p>
              <p>قد أتم/ت بنجاح برنامج</p>
              <p style={{ fontSize: 20, fontWeight: 'bold', color: '#0d47a1' }}>{d.courseName || '________________________'}</p>
              <p>بتاريخ <strong>{formatDate(d.completionDate) || '________'}</strong></p>
              <p>مدة البرنامج: <strong>{d.duration || '________'}</strong></p>
            </div>
            <div style={{ marginTop: 50, display: 'flex', justifyContent: 'space-around' }}>
              <div style={{ textAlign: 'center' }}><div style={{ borderBottom: '2px solid #333', width: 180, marginBottom: 6 }} /><strong>مدير البرنامج</strong></div>
              <div style={{ textAlign: 'center' }}><div style={{ borderBottom: '2px solid #333', width: 180, marginBottom: 6 }} /><strong>المدير العام</strong></div>
            </div>
          </div>
        </div>
      );

    /* ─── 8. Classroom Schedule ─── */
    case 'class-schedule':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="جدول الحصص الأسبوعي" subtitle="Weekly Classroom Schedule" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفصل / المجموعة" value={d.className} w="33%" /><Field label="المعلم" value={d.teacher} w="33%" /><Field label="الفصل الدراسي" value={d.semester} w="34%" /></div>
            <div style={{ marginTop: 16 }}>
              <EmptyTable cols={7} rows={8} headers={['الوقت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'ملاحظات']} />
            </div>
            <NotesBox label="ملاحظات" value={d.notes} />
          </div>
          <OrgFooter />
        </div>
      );

    /* ─── 9. Montessori Observation Form ─── */
    case 'montessori-observation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج ملاحظة مونتيسوري" subtitle="Montessori Observation Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الطفل">
              <div style={fieldRow}><Field label="اسم الطفل" value={d.childName} w="40%" /><Field label="العمر" value={d.age} w="20%" /><Field label="الفصل" value={d.classroom} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            </Section>
            <Section title="مجالات الملاحظة">
              {['الحياة العملية', 'الحسي', 'اللغة', 'الرياضيات', 'الثقافة والعلوم', 'الاجتماعي والعاطفي'].map((area, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ ...sectionTitle, fontSize: 12, padding: '4px 8px', background: '#f3e5f5' }}>{area}</div>
                  <div style={{ minHeight: 40, border: '1px solid #ddd', borderRadius: 4, padding: 8, fontSize: 12 }}>{d[`area_${i}`] || ''}</div>
                </div>
              ))}
            </Section>
            <NotesBox label="توصيات المعلم/ة" value={d.recommendations} />
            <SignatureBlock rightLabel="المعلم/ة" leftLabel="مشرف البرنامج" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ─── 10. Montessori Progress Report ─── */
    case 'montessori-progress':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تقدم مونتيسوري" subtitle="Montessori Progress Report" />
          <div style={bodyPad}>
            <Section title="بيانات الطفل">
              <div style={fieldRow}><Field label="اسم الطفل" value={d.childName} w="40%" /><Field label="الفترة" value={d.period} w="30%" /><Field label="المعلم/ة" value={d.teacher} w="30%" /></div>
            </Section>
            <Section title="تقييم المهارات">
              <PrintTable headers={['المجال', 'المهارة', 'مستوى الإتقان', 'ملاحظات']} rows={d.skills || []} />
              {(!d.skills || d.skills.length === 0) && <EmptyTable cols={4} rows={10} headers={['المجال', 'المهارة', 'مستوى الإتقان', 'ملاحظات']} />}
            </Section>
            <NotesBox label="نقاط القوة" value={d.strengths} />
            <NotesBox label="مجالات التحسين" value={d.improvements} />
            <NotesBox label="الأهداف القادمة" value={d.goals} />
            <SignatureBlock rightLabel="المعلم/ة" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ─── 11. Parent Conference Summary ─── */
    case 'parent-conference':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="محضر اجتماع ولي الأمر" subtitle="Parent Conference Summary" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="المعلومات الأساسية">
              <div style={fieldRow}><Field label="اسم الطالب" value={d.studentName} w="33%" /><Field label="ولي الأمر" value={d.parentName} w="33%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="34%" /></div>
              <div style={fieldRow}><Field label="الحاضرون" value={d.attendees} w="67%" /><Field label="مدة الاجتماع" value={d.duration} w="33%" /></div>
            </Section>
            <NotesBox label="الموضوعات التي تمت مناقشتها" value={d.topics} lines={5} />
            <NotesBox label="مستوى الطالب الحالي" value={d.currentLevel} lines={3} />
            <NotesBox label="التوصيات والاتفاقيات" value={d.agreements} lines={4} />
            <NotesBox label="متابعة مطلوبة" value={d.followUp} lines={3} />
            <SignatureBlock rightLabel="المعلم / المشرف" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ─── 12. Individual Learning Plan ─── */
    case 'individual-learning-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة تعلم فردية" subtitle="Individual Learning Plan (ILP)" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الطالب">
              <div style={fieldRow}><Field label="الاسم" value={d.studentName} w="40%" /><Field label="البرنامج" value={d.program} w="30%" /><Field label="الفترة" value={d.period} w="30%" /></div>
            </Section>
            <Section title="نقاط القوة والاحتياجات">
              <div style={fieldRow}><Field label="نقاط القوة" value={d.strengths} w="50%" /><Field label="الاحتياجات" value={d.needs} w="50%" /></div>
            </Section>
            <Section title="الأهداف والمتابعة">
              <PrintTable headers={['الهدف', 'المجال', 'الإجراء', 'الإطار الزمني', 'مؤشر النجاح', 'الحالة']} rows={d.goals || []} />
              {(!d.goals || d.goals.length === 0) && <EmptyTable cols={6} rows={6} headers={['الهدف', 'المجال', 'الإجراء', 'الإطار الزمني', 'مؤشر النجاح', 'الحالة']} />}
            </Section>
            <NotesBox label="تعديلات وتسهيلات" value={d.accommodations} />
            <SignatureBlock rightLabel="معد الخطة" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ─── 13. Early Intervention Assessment ─── */
    case 'early-intervention':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقييم التدخل المبكر" subtitle="Early Intervention Assessment" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الطفل">
              <div style={fieldRow}><Field label="اسم الطفل" value={d.childName} w="40%" /><Field label="العمر الزمني" value={d.age} w="20%" /><Field label="العمر النمائي" value={d.devAge} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            </Section>
            <Section title="مجالات التقييم">
              <EmptyTable cols={5} rows={6} headers={['المجال النمائي', 'العمر المتوقع', 'المستوى الحالي', 'الانحراف', 'توصية']} />
            </Section>
            <NotesBox label="ملخص التقييم" value={d.summary} />
            <NotesBox label="التوصيات" value={d.recommendations} />
            <SignatureBlock rightLabel="أخصائي التدخل المبكر" leftLabel="مشرف البرنامج" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ─── 14. Developmental Milestone Report ─── */
    case 'developmental-milestone':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير معالم النمو التطورية" subtitle="Developmental Milestone Report" />
          <div style={bodyPad}>
            <Section title="بيانات الطفل">
              <div style={fieldRow}><Field label="الاسم" value={d.childName} w="40%" /><Field label="العمر" value={d.age} w="20%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="التاريخ" value={today()} w="20%" /></div>
            </Section>
            <Section title="معالم النمو">
              <EmptyTable cols={5} rows={8} headers={['المعلم / المجال', 'العمر المتوقع', 'تحقق', 'قيد التطور', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملخص" value={d.summary} />
            <NotesBox label="خطة المتابعة" value={d.plan} />
            <SignatureBlock rightLabel="الأخصائي" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ─── 15. IFSP ─── */
    case 'ifsp':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة خدمة الأسرة الفردية" subtitle="Individualized Family Service Plan (IFSP)" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الطفل والأسرة">
              <div style={fieldRow}><Field label="اسم الطفل" value={d.childName} w="40%" /><Field label="تاريخ الميلاد" value={formatDate(d.dob)} w="30%" /><Field label="تاريخ الخطة" value={formatDate(d.planDate) || today()} w="30%" /></div>
              <div style={fieldRow}><Field label="ولي الأمر" value={d.guardian} w="40%" /><Field label="الجوال" value={d.phone} w="30%" /><Field label="العنوان" value={d.address} w="30%" /></div>
            </Section>
            <Section title="اهتمامات الأسرة وأولوياتها">
              <NotesBox value={d.familyConcerns} lines={3} />
            </Section>
            <Section title="الأهداف والخدمات">
              <EmptyTable cols={6} rows={5} headers={['الهدف', 'المجال', 'الخدمة المقدمة', 'المسؤول', 'التكرار', 'تاريخ البدء']} />
            </Section>
            <Section title="خطة الانتقال">
              <NotesBox value={d.transitionPlan} lines={3} />
            </Section>
            <SignatureBlock rightLabel="منسق الخدمات" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ─── 16. Student Attendance Record ─── */
    case 'student-attendance':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل حضور الطلاب الشهري" subtitle="Monthly Student Attendance Record" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الشهر" value={d.month} w="25%" /><Field label="الفصل / البرنامج" value={d.program} w="50%" /><Field label="المعلم" value={d.teacher} w="25%" /></div>
            <div style={{ marginTop: 16 }}>
              <EmptyTable cols={8} rows={12} headers={['اسم الطالب', '1-5', '6-10', '11-15', '16-20', '21-25', '26-31', 'المجموع']} />
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 20, fontSize: 11 }}>
              <span>✓ = حاضر</span><span>✗ = غائب</span><span>⟳ = متأخر</span><span>◑ = نصف يوم</span>
            </div>
            <SignatureBlock rightLabel="المعلم" leftLabel="مسؤول الشؤون الأكاديمية" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ─── 17. Behavior Report ─── */
    case 'behavior-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير سلوكي" subtitle="Behavior Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الطالب">
              <div style={fieldRow}><Field label="اسم الطالب" value={d.studentName} w="40%" /><Field label="البرنامج" value={d.program} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="30%" /></div>
            </Section>
            <Section title="تفاصيل الحادثة">
              <div style={fieldRow}><Field label="نوع السلوك" value={d.behaviorType} w="33%" /><Field label="الشدة" value={d.severity} w="33%" /><Field label="الوقت" value={d.time} w="34%" /></div>
              <NotesBox label="وصف السلوك" value={d.description} />
              <NotesBox label="الظروف المحيطة (ما قبل / ما بعد)" value={d.context} />
            </Section>
            <Section title="الإجراء المتخذ">
              <NotesBox value={d.action} />
            </Section>
            <NotesBox label="خطة التعديل" value={d.plan} />
            <SignatureBlock rightLabel="المعلم / الأخصائي" leftLabel="مدير البرنامج" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ─── 18. Academic Calendar ─── */
    case 'academic-calendar':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="التقويم الأكاديمي" subtitle="Academic Calendar" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="العام الدراسي" value={d.year} w="50%" /><Field label="تاريخ الإصدار" value={today()} w="50%" /></div>
            <Section title="الفعاليات والمواعيد">
              <PrintTable headers={['التاريخ', 'الفعالية / المناسبة', 'النوع', 'ملاحظات']} rows={d.events || []} />
              {(!d.events || d.events.length === 0) && <EmptyTable cols={4} rows={15} headers={['التاريخ', 'الفعالية / المناسبة', 'النوع', 'ملاحظات']} />}
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
