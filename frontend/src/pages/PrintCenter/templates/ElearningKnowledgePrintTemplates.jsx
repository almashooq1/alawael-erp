/**
 * قوالب التعلم الإلكتروني وإدارة المعرفة
 * E-Learning & Knowledge Management Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const ELEARNING_KNOWLEDGE_TEMPLATES = [
  { id: 'course-catalog', name: 'فهرس الدورات', nameEn: 'Course Catalog', desc: 'فهرس الدورات التدريبية المتاحة', color: '#1565c0' },
  { id: 'learner-progress', name: 'تقدم المتعلم', nameEn: 'Learner Progress Report', desc: 'تقرير تقدم المتدربين', color: '#1976d2' },
  { id: 'course-completion-cert', name: 'شهادة إتمام دورة', nameEn: 'Course Completion Certificate', desc: 'شهادة إكمال دورة تدريبية', color: '#1e88e5' },
  { id: 'lms-usage-report', name: 'تقرير استخدام LMS', nameEn: 'LMS Usage Report', desc: 'تقرير استخدام نظام التعلم', color: '#0277bd' },
  { id: 'quiz-results', name: 'نتائج الاختبارات', nameEn: 'Quiz Results Report', desc: 'تقرير نتائج الاختبارات الإلكترونية', color: '#6a1b9a' },
  { id: 'training-needs-analysis', name: 'تحليل الاحتياجات التدريبية', nameEn: 'Training Needs Analysis', desc: 'تحليل احتياجات التدريب', color: '#7b1fa2' },
  { id: 'knowledge-base-index', name: 'فهرس قاعدة المعرفة', nameEn: 'Knowledge Base Index', desc: 'فهرس مقالات قاعدة المعرفة', color: '#00695c' },
  { id: 'faq-document', name: 'وثيقة الأسئلة الشائعة', nameEn: 'FAQ Document', desc: 'وثيقة الأسئلة المتكررة', color: '#2e7d32' },
  { id: 'webinar-attendance', name: 'حضور الندوة الإلكترونية', nameEn: 'Webinar Attendance Report', desc: 'تقرير حضور الندوات', color: '#e65100' },
  { id: 'instructor-evaluation', name: 'تقييم المدرب', nameEn: 'Instructor Evaluation Form', desc: 'نموذج تقييم المدرب', color: '#c62828' },
  { id: 'learning-path', name: 'مسار التعلم', nameEn: 'Learning Path Plan', desc: 'خطة مسار التعلم المهني', color: '#283593' },
  { id: 'content-review-checklist', name: 'مراجعة محتوى تعليمي', nameEn: 'Content Review Checklist', desc: 'قائمة فحص مراجعة المحتوى', color: '#303f9f' },
  { id: 'scorm-compliance', name: 'توافق SCORM', nameEn: 'SCORM Compliance Report', desc: 'تقرير توافق المحتوى مع SCORM', color: '#455a64' },
  { id: 'micro-learning-log', name: 'سجل التعلم المصغر', nameEn: 'Micro-Learning Log', desc: 'سجل وحدات التعلم المصغر', color: '#558b2f' },
  { id: 'mentorship-plan', name: 'خطة الإرشاد المهني', nameEn: 'Mentorship Plan', desc: 'خطة التوجيه والإرشاد', color: '#4527a0' },
  { id: 'skill-gap-report', name: 'تقرير فجوة المهارات', nameEn: 'Skill Gap Report', desc: 'تقرير تحليل فجوة المهارات', color: '#f57c00' },
];

export const ElearningKnowledgeTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'course-catalog':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="فهرس الدورات التدريبية" subtitle="Course Catalog" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="العام التدريبي" value={d.year} w="12%" /><Field label="إجمالي الدورات" value={d.totalCourses} w="12%" /></div>
            <Section title="الدورات المتاحة">
              <EmptyTable cols={6} rows={12} headers={['الدورة', 'الفئة', 'المدة', 'المستوى', 'المدرب', 'الحالة']} />
            </Section>
            <SignatureBlock rightLabel="مدير التدريب" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'learner-progress':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تقدم المتدربين" subtitle="Learner Progress Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الدورة" value={d.courseName} w="25%" /><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="تقدم المتدربين">
              <EmptyTable cols={6} rows={10} headers={['المتدرب', 'التسجيل', 'الإكمال %', 'الدرجة', 'آخر نشاط', 'الحالة']} />
            </Section>
            <div style={fieldRow}><Field label="متوسط الإكمال" value={d.avgCompletion} w="12%" /></div>
            <SignatureBlock rightLabel="مدير التدريب" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'course-completion-cert':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة إتمام دورة تدريبية" subtitle="Course Completion Certificate" />
          <div style={{ ...bodyPad, textAlign: 'center' }}>
            <div style={{ fontSize: 16, margin: '20px 0' }}>يُشهد بأن</div>
            <div style={{ fontSize: 22, fontWeight: 'bold', margin: '10px 0', color: '#1565c0' }}>{d.participantName || '___________________________'}</div>
            <div style={{ fontSize: 16, margin: '10px 0' }}>قد أتم بنجاح دورة</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', margin: '10px 0' }}>{d.courseName || '___________________________'}</div>
            <div style={fieldRow}><Field label="المدة" value={d.duration} w="15%" /><Field label="من" value={formatDate(d.fromDate)} w="15%" /><Field label="إلى" value={formatDate(d.toDate)} w="15%" /></div>
            <div style={fieldRow}><Field label="الدرجة" value={d.grade} w="12%" /><Field label="التقدير" value={d.rating} w="12%" /></div>
            <div style={{ marginTop: 30 }}>
              <SignatureBlock rightLabel="مدير التدريب" leftLabel="المدير العام" />
            </div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'lms-usage-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير استخدام نظام التعلم" subtitle="LMS Usage Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="إحصائيات الاستخدام">
              <EmptyTable cols={5} rows={8} headers={['المؤشر', 'الشهر الحالي', 'الشهر السابق', 'التغير %', 'ملاحظات']} />
            </Section>
            <Section title="الدورات الأكثر طلباً">
              <EmptyTable cols={4} rows={5} headers={['الدورة', 'المسجلين', 'الإكمال', 'التقييم']} />
            </Section>
            <SignatureBlock rightLabel="مدير التقنية" leftLabel="مدير التدريب" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'quiz-results':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير نتائج الاختبارات" subtitle="Quiz Results Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الدورة" value={d.courseName} w="25%" /><Field label="الاختبار" value={d.quizName} w="20%" /></div>
            <Section title="النتائج">
              <EmptyTable cols={6} rows={10} headers={['المتدرب', 'الدرجة', 'من', 'النسبة', 'المحاولات', 'النتيجة']} />
            </Section>
            <div style={fieldRow}><Field label="أعلى درجة" value={d.highest} w="10%" /><Field label="أدنى درجة" value={d.lowest} w="10%" /><Field label="المتوسط" value={d.average} w="10%" /></div>
            <SignatureBlock rightLabel="المدرب" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'training-needs-analysis':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تحليل الاحتياجات التدريبية" subtitle="Training Needs Analysis" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم" value={d.department} w="20%" /><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="الاحتياجات المحددة">
              <EmptyTable cols={6} rows={8} headers={['المهارة', 'المستوى الحالي', 'المطلوب', 'الفجوة', 'الأولوية', 'الدورة المقترحة']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مدير القسم" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'knowledge-base-index':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="فهرس مقالات قاعدة المعرفة" subtitle="Knowledge Base Index" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="إجمالي المقالات" value={d.totalArticles} w="12%" /></div>
            <Section title="المقالات">
              <EmptyTable cols={6} rows={12} headers={['العنوان', 'الفئة', 'الكاتب', 'التاريخ', 'المشاهدات', 'التقييم']} />
            </Section>
            <SignatureBlock rightLabel="مدير المعرفة" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'faq-document':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="وثيقة الأسئلة المتكررة" subtitle="FAQ Document" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم" value={d.section} w="20%" /><Field label="آخر تحديث" value={formatDate(d.lastUpdate) || today()} w="15%" /></div>
            <Section title="الأسئلة والأجوبة">
              <EmptyTable cols={4} rows={10} headers={['#', 'السؤال', 'الإجابة', 'الفئة']} />
            </Section>
            <SignatureBlock rightLabel="المسؤول" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'webinar-attendance':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حضور الندوات الإلكترونية" subtitle="Webinar Attendance Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الندوة" value={d.webinarName} w="25%" /><Field label="التاريخ" value={formatDate(d.date)} w="15%" /><Field label="المقدم" value={d.presenter} w="20%" /></div>
            <Section title="الحضور">
              <EmptyTable cols={5} rows={10} headers={['الاسم', 'القسم', 'وقت الدخول', 'المدة', 'المشاركة']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الحضور" value={d.totalAttendees} w="12%" /><Field label="متوسط المدة" value={d.avgDuration} w="12%" /></div>
            <SignatureBlock rightLabel="منسق التدريب" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'instructor-evaluation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تقييم المدرب" subtitle="Instructor Evaluation Form" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المدرب" value={d.instructorName} w="25%" /><Field label="الدورة" value={d.courseName} w="25%" /></div>
            <Section title="معايير التقييم">
              <EmptyTable cols={4} rows={8} headers={['المعيار', 'الدرجة (1-5)', 'التعليق', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="المتوسط العام" value={d.avgScore} w="12%" /></div>
            <NotesBox label="ملاحظات عامة" value={d.generalNotes} lines={2} />
            <SignatureBlock rightLabel="مدير التدريب" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'learning-path':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة مسار التعلم المهني" subtitle="Learning Path Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الموظف" value={d.employeeName} w="25%" /><Field label="المسمى" value={d.jobTitle} w="20%" /><Field label="القسم" value={d.department} w="15%" /></div>
            <Section title="مسار التعلم">
              <EmptyTable cols={6} rows={8} headers={['المرحلة', 'الدورة/النشاط', 'المهارات', 'المدة', 'الموعد', 'الحالة']} />
            </Section>
            <NotesBox label="الأهداف المهنية" value={d.careerGoals} lines={2} />
            <SignatureBlock rightLabel="الموظف" leftLabel="مدير التدريب" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'content-review-checklist':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="قائمة فحص مراجعة المحتوى التعليمي" subtitle="Content Review Checklist" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الدورة" value={d.courseName} w="25%" /><Field label="المراجع" value={d.reviewer} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="بنود المراجعة">
              <EmptyTable cols={4} rows={10} headers={['البند', 'متوفر', 'ملاحظات', 'إجراء']} />
            </Section>
            <NotesBox label="ملخص المراجعة" value={d.summary} lines={2} />
            <SignatureBlock rightLabel="المراجع" leftLabel="مدير المحتوى" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'scorm-compliance':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير توافق المحتوى مع SCORM" subtitle="SCORM Compliance Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المحتوى" value={d.contentName} w="25%" /><Field label="الإصدار" value={d.scormVersion} w="12%" /></div>
            <Section title="نتائج الفحص">
              <EmptyTable cols={5} rows={8} headers={['المعيار', 'النتيجة', 'الوصف', 'المطلوب', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="الحالة" value={d.status} w="12%" /></div>
            <SignatureBlock rightLabel="مطور المحتوى" leftLabel="مدير التقنية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'micro-learning-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل وحدات التعلم المصغر" subtitle="Micro-Learning Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="وحدات التعلم">
              <EmptyTable cols={6} rows={10} headers={['الوحدة', 'الموضوع', 'المدة', 'المشاهدات', 'الإكمال', 'التقييم']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مدير التعلم" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'mentorship-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة التوجيه والإرشاد المهني" subtitle="Mentorship Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المرشد" value={d.mentorName} w="20%" /><Field label="المتدرب" value={d.menteeName} w="20%" /><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="الأهداف والجلسات">
              <EmptyTable cols={5} rows={8} headers={['الجلسة', 'التاريخ', 'الموضوع', 'الأهداف', 'الحالة']} />
            </Section>
            <NotesBox label="أهداف البرنامج" value={d.goals} lines={2} />
            <SignatureBlock rightLabel="المرشد" leftLabel="المتدرب" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'skill-gap-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تحليل فجوة المهارات" subtitle="Skill Gap Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم" value={d.department} w="20%" /><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="تحليل الفجوات">
              <EmptyTable cols={6} rows={10} headers={['المهارة', 'المطلوب', 'الحالي', 'الفجوة', 'الأولوية', 'الحل المقترح']} />
            </Section>
            <NotesBox label="الميزانية المطلوبة" value={d.budgetNeeded} lines={1} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مدير التدريب" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
