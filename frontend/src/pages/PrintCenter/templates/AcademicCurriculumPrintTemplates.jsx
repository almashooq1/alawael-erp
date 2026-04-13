/**
 * قوالب العام الدراسي والمناهج
 * Academic Year & Curriculum Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const ACADEMIC_CURRICULUM_TEMPLATES = [
  { id: 'academic-year-plan', name: 'خطة العام الدراسي', nameEn: 'Academic Year Plan', desc: 'الخطة العامة للعام الدراسي', color: '#1565c0' },
  { id: 'academic-calendar-print', name: 'التقويم الدراسي', nameEn: 'Academic Calendar', desc: 'التقويم الدراسي السنوي', color: '#1976d2' },
  { id: 'curriculum-plan', name: 'خطة المنهج الدراسي', nameEn: 'Curriculum Plan', desc: 'خطة تطوير المنهج الدراسي', color: '#1e88e5' },
  { id: 'lesson-plan-template', name: 'تحضير الدرس', nameEn: 'Lesson Plan', desc: 'نموذج تحضير الدرس اليومي', color: '#2196f3' },
  { id: 'weekly-schedule-print', name: 'الجدول الأسبوعي', nameEn: 'Weekly Schedule', desc: 'جدول الحصص الأسبوعي', color: '#42a5f5' },
  { id: 'exam-schedule-print', name: 'جدول الاختبارات', nameEn: 'Exam Schedule', desc: 'جدول الاختبارات الفصلية', color: '#0277bd' },
  { id: 'exam-paper-cover', name: 'غلاف ورقة الاختبار', nameEn: 'Exam Paper Cover', desc: 'صفحة غلاف ورقة الاختبار', color: '#01579b' },
  { id: 'grade-distribution-report', name: 'توزيع الدرجات', nameEn: 'Grade Distribution', desc: 'تقرير توزيع درجات المادة', color: '#0d47a1' },
  { id: 'course-outline', name: 'وصف المقرر', nameEn: 'Course Outline', desc: 'وصف وأهداف المقرر الدراسي', color: '#283593' },
  { id: 'teacher-load-report', name: 'نصاب المعلم', nameEn: 'Teacher Load Report', desc: 'تقرير نصاب الحصص للمعلم', color: '#3949ab' },
  { id: 'class-roster-print', name: 'كشف الفصل', nameEn: 'Class Roster', desc: 'كشف أسماء طلاب الفصل', color: '#3f51b5' },
  { id: 'student-transfer-cert', name: 'شهادة انتقال طالب', nameEn: 'Student Transfer Certificate', desc: 'شهادة انتقال من المنشأة', color: '#5c6bc0' },
  { id: 'academic-achievement-cert', name: 'شهادة تفوق دراسي', nameEn: 'Academic Achievement Certificate', desc: 'شهادة تفوق وتميز أكاديمي', color: '#7986cb' },
  { id: 'student-behavior-report', name: 'تقرير السلوك الطلابي', nameEn: 'Student Behavior Report', desc: 'تقرير سلوك الطالب الشهري', color: '#4527a0' },
  { id: 'parent-teacher-conference', name: 'نموذج مجلس الآباء', nameEn: 'Parent-Teacher Conference', desc: 'نموذج مجلس الآباء والمعلمين', color: '#6a1b9a' },
  { id: 'academic-excursion-form', name: 'نموذج رحلة تعليمية', nameEn: 'Academic Excursion Form', desc: 'نموذج طلب رحلة تعليمية ميدانية', color: '#8e24aa' },
];

export const AcademicCurriculumTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'academic-year-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة العام الدراسي" subtitle="Academic Year Plan" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="العام الدراسي" value={d.year} w="15%" /><Field label="مدير المدرسة" value={d.principal} w="25%" /><Field label="عدد الفصول" value={d.classCount} w="12%" /><Field label="عدد الطلاب" value={d.studentCount} w="12%" /></div>
            <Section title="الفصل الدراسي الأول">
              <EmptyTable cols={4} rows={5} headers={['الحدث', 'تاريخ البدء', 'تاريخ الانتهاء', 'ملاحظات']} />
            </Section>
            <Section title="الفصل الدراسي الثاني">
              <EmptyTable cols={4} rows={5} headers={['الحدث', 'تاريخ البدء', 'تاريخ الانتهاء', 'ملاحظات']} />
            </Section>
            <Section title="الأهداف الاستراتيجية">
              <EmptyTable cols={3} rows={5} headers={['الهدف', 'المؤشر', 'المستهدف']} />
            </Section>
            <SignatureBlock rightLabel="مدير المدرسة" leftLabel="المشرف التربوي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'academic-calendar-print':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="التقويم الدراسي" subtitle="Academic Calendar" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="العام الدراسي" value={d.year} w="15%" /><Field label="تاريخ الطباعة" value={today()} w="15%" /></div>
            <Section title="أحداث التقويم الدراسي">
              <EmptyTable cols={5} rows={15} headers={['الحدث', 'التاريخ الهجري', 'التاريخ الميلادي', 'المدة', 'النوع']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مدير الشؤون الأكاديمية" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'curriculum-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة تطوير المنهج الدراسي" subtitle="Curriculum Development Plan" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المادة" value={d.subject} w="20%" /><Field label="المرحلة" value={d.stage} w="15%" /><Field label="المعد" value={d.preparer} w="25%" /><Field label="العام" value={d.year} w="12%" /></div>
            <Section title="أهداف المنهج">
              <EmptyTable cols={3} rows={5} headers={['الهدف', 'المستوى', 'طريقة التقييم']} />
            </Section>
            <Section title="الوحدات الدراسية">
              <EmptyTable cols={5} rows={8} headers={['الوحدة', 'المواضيع', 'عدد الحصص', 'الأهداف', 'التقييم']} />
            </Section>
            <NotesBox label="الوسائل والمصادر" value={d.resources} lines={2} />
            <SignatureBlock rightLabel="المعلم" leftLabel="المشرف التربوي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'lesson-plan-template':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تحضير الدرس اليومي" subtitle="Daily Lesson Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المعلم" value={d.teacher} w="25%" /><Field label="المادة" value={d.subject} w="15%" /><Field label="الصف" value={d.grade} w="10%" /><Field label="الحصة" value={d.period} w="8%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <div style={fieldRow}><Field label="عنوان الدرس" value={d.lessonTitle} w="30%" /><Field label="الوحدة" value={d.unit} w="15%" /><Field label="الصفحات" value={d.pages} w="10%" /></div>
            <NotesBox label="أهداف الدرس" value={d.objectives} lines={2} />
            <NotesBox label="التهيئة والمقدمة" value={d.introduction} lines={2} />
            <NotesBox label="العرض والمحتوى" value={d.content} lines={3} />
            <NotesBox label="الأنشطة والتطبيقات" value={d.activities} lines={2} />
            <NotesBox label="التقويم" value={d.assessment} lines={2} />
            <NotesBox label="الواجب المنزلي" value={d.homework} lines={1} />
            <SignatureBlock rightLabel="المعلم" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'weekly-schedule-print':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="الجدول الأسبوعي للحصص" subtitle="Weekly Class Schedule" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفصل/المعلم" value={d.classOrTeacher} w="25%" /><Field label="الفصل الدراسي" value={d.semester} w="15%" /><Field label="العام" value={d.year} w="12%" /></div>
            <Section title="الجدول الأسبوعي">
              <EmptyTable cols={7} rows={8} headers={['الحصة', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="المعلم / وكيل المدرسة" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'exam-schedule-print':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="جدول الاختبارات الفصلية" subtitle="Term Exam Schedule" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفصل الدراسي" value={d.semester} w="15%" /><Field label="العام" value={d.year} w="12%" /><Field label="نوع الاختبار" value={d.examType} w="15%" /></div>
            <Section title="جدول الاختبارات">
              <EmptyTable cols={6} rows={10} headers={['التاريخ', 'اليوم', 'المادة', 'الصف', 'الوقت', 'القاعة']} />
            </Section>
            <NotesBox label="تعليمات للطلاب" value={d.instructions} lines={2} />
            <SignatureBlock rightLabel="وكيل الشؤون الأكاديمية" leftLabel="مدير المدرسة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'exam-paper-cover':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="غلاف ورقة الاختبار" subtitle="Exam Paper Cover Sheet" />
          <div style={bodyPad}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={fieldRow}><Field label="المادة" value={d.subject} w="25%" /><Field label="الصف" value={d.grade} w="15%" /><Field label="الفصل" value={d.semester} w="15%" /></div>
              <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="الزمن" value={d.duration} w="12%" /><Field label="الدرجة الكلية" value={d.totalMarks} w="12%" /></div>
              <div style={fieldRow}><Field label="اسم الطالب" value={d.studentName} w="30%" /><Field label="رقم الجلوس" value={d.seatNumber} w="15%" /></div>
            </div>
            <Section title="توزيع الدرجات">
              <EmptyTable cols={4} rows={5} headers={['السؤال', 'الدرجة', 'الدرجة المستحقة', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="المجموع" value={d.total} w="15%" /><Field label="المصحح" value={d.corrector} w="20%" /><Field label="المراجع" value={d.reviewer} w="20%" /></div>
            <SignatureBlock rightLabel="المصحح" leftLabel="المراجع" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'grade-distribution-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير توزيع الدرجات" subtitle="Grade Distribution Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المادة" value={d.subject} w="20%" /><Field label="الصف" value={d.grade} w="10%" /><Field label="المعلم" value={d.teacher} w="25%" /><Field label="الفصل" value={d.semester} w="12%" /></div>
            <Section title="توزيع الدرجات">
              <EmptyTable cols={5} rows={6} headers={['الفئة', 'النطاق', 'عدد الطلاب', 'النسبة %', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="المتوسط" value={d.average} w="12%" /><Field label="أعلى درجة" value={d.highest} w="12%" /><Field label="أدنى درجة" value={d.lowest} w="12%" /><Field label="نسبة النجاح" value={d.passRate} w="12%" /></div>
            <SignatureBlock rightLabel="المعلم" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'course-outline':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="وصف المقرر الدراسي" subtitle="Course Outline" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المقرر" value={d.course} w="25%" /><Field label="الرمز" value={d.code} w="10%" /><Field label="المرحلة" value={d.stage} w="15%" /><Field label="الساعات" value={d.hours} w="10%" /></div>
            <NotesBox label="وصف المقرر" value={d.description} lines={3} />
            <Section title="مخرجات التعلم">
              <EmptyTable cols={2} rows={5} headers={['المخرج', 'مستوى التحقق']} />
            </Section>
            <Section title="المحتوى الأسبوعي">
              <EmptyTable cols={4} rows={12} headers={['الأسبوع', 'الموضوع', 'النشاط', 'التقييم']} />
            </Section>
            <SignatureBlock rightLabel="المعلم" leftLabel="مدير المناهج" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'teacher-load-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير نصاب حصص المعلم" subtitle="Teacher Load Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المعلم" value={d.teacher} w="25%" /><Field label="التخصص" value={d.specialization} w="15%" /><Field label="الفصل" value={d.semester} w="12%" /><Field label="العام" value={d.year} w="10%" /></div>
            <Section title="توزيع النصاب">
              <EmptyTable cols={5} rows={6} headers={['المادة', 'الصف', 'عدد الحصص', 'الأيام', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الحصص" value={d.totalPeriods} w="12%" /><Field label="النصاب المقرر" value={d.requiredLoad} w="12%" /><Field label="الفرق" value={d.difference} w="10%" /></div>
            <SignatureBlock rightLabel="وكيل الشؤون" leftLabel="مدير المدرسة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'class-roster-print':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="كشف أسماء طلاب الفصل" subtitle="Class Roster" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفصل" value={d.className} w="15%" /><Field label="المرحلة" value={d.stage} w="12%" /><Field label="المعلم المسؤول" value={d.teacher} w="25%" /><Field label="العام" value={d.year} w="10%" /></div>
            <Section title="قائمة الطلاب">
              <EmptyTable cols={6} rows={20} headers={['م', 'اسم الطالب', 'رقم الهوية', 'تاريخ الميلاد', 'ولي الأمر', 'الهاتف']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الطلاب" value={d.totalStudents} w="12%" /></div>
            <SignatureBlock rightLabel="المعلم المسؤول" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'student-transfer-cert':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة انتقال طالب" subtitle="Student Transfer Certificate" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="اسم الطالب" value={d.studentName} w="25%" /><Field label="رقم الهوية" value={d.idNumber} w="15%" /><Field label="الصف" value={d.grade} w="10%" /></div>
            <div style={fieldRow}><Field label="من" value={d.fromSchool} w="30%" /><Field label="إلى" value={d.toSchool} w="30%" /></div>
            <div style={fieldRow}><Field label="تاريخ الانتقال" value={formatDate(d.transferDate)} w="15%" /><Field label="السبب" value={d.reason} w="25%" /></div>
            <NotesBox label="ملاحظات أكاديمية" value={d.academicNotes} lines={2} />
            <NotesBox label="ملاحظات سلوكية" value={d.behaviorNotes} lines={2} />
            <SignatureBlock rightLabel="مدير المدرسة" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'academic-achievement-cert':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة تفوق دراسي" subtitle="Academic Achievement Certificate" />
          <div style={bodyPad}>
            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
              <NotesBox label="" value="يسر مركز الأوائل للتأهيل أن يمنح هذه الشهادة تقديراً للتفوق الدراسي إلى:" lines={0} />
              <div style={{ ...fieldRow, justifyContent: 'center', margin: '20px 0' }}><Field label="الطالب" value={d.student} w="40%" /></div>
              <div style={{ ...fieldRow, justifyContent: 'center' }}><Field label="الصف" value={d.grade} w="15%" /><Field label="الفصل" value={d.semester} w="15%" /><Field label="المعدل" value={d.gpa} w="12%" /></div>
              <NotesBox label="لتميزه في" value={d.achievement} lines={2} />
            </div>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <SignatureBlock rightLabel="المعلم" leftLabel="مدير المنشأة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'student-behavior-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير السلوك الطلابي الشهري" subtitle="Monthly Student Behavior Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="الصف" value={d.grade} w="10%" /><Field label="الشهر" value={d.month} w="12%" /><Field label="المعلم" value={d.teacher} w="25%" /></div>
            <Section title="تقييم السلوك">
              <EmptyTable cols={5} rows={8} headers={['المعيار', 'ممتاز', 'جيد', 'مقبول', 'ملاحظات']} />
            </Section>
            <NotesBox label="حوادث سلوكية" value={d.incidents} lines={2} />
            <NotesBox label="إجراءات متخذة" value={d.actions} lines={2} />
            <SignatureBlock rightLabel="المرشد الطلابي" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'parent-teacher-conference':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج مجلس الآباء والمعلمين" subtitle="Parent-Teacher Conference Form" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطالب" value={d.student} w="25%" /><Field label="ولي الأمر" value={d.parent} w="25%" /><Field label="المعلم" value={d.teacher} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <NotesBox label="المستوى الأكاديمي" value={d.academicLevel} lines={2} />
            <NotesBox label="المستوى السلوكي" value={d.behaviorLevel} lines={2} />
            <NotesBox label="نقاط القوة" value={d.strengths} lines={2} />
            <NotesBox label="مجالات التحسين" value={d.improvements} lines={2} />
            <Section title="التوصيات المشتركة">
              <EmptyTable cols={3} rows={4} headers={['التوصية', 'المسؤول', 'الموعد']} />
            </Section>
            <SignatureBlock rightLabel="المعلم" leftLabel="ولي الأمر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'academic-excursion-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج رحلة تعليمية ميدانية" subtitle="Academic Excursion Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="وجهة الرحلة" value={d.destination} w="25%" /><Field label="التاريخ" value={formatDate(d.date)} w="15%" /><Field label="المسؤول" value={d.leader} w="25%" /></div>
            <div style={fieldRow}><Field label="عدد الطلاب" value={d.studentCount} w="12%" /><Field label="عدد المرافقين" value={d.supervisorCount} w="12%" /><Field label="وسيلة النقل" value={d.transport} w="15%" /></div>
            <NotesBox label="أهداف الرحلة" value={d.objectives} lines={2} />
            <NotesBox label="الأنشطة المخططة" value={d.activities} lines={2} />
            <NotesBox label="احتياطات السلامة" value={d.safety} lines={2} />
            <Section title="كشف الطلاب المشاركين">
              <EmptyTable cols={4} rows={10} headers={['م', 'اسم الطالب', 'الصف', 'التوقيع']} />
            </Section>
            <SignatureBlock rightLabel="المسؤول عن الرحلة" leftLabel="مدير المنشأة" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
