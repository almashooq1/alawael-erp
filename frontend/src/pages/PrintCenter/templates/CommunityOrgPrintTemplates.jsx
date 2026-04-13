/**
 * قوالب المجتمع والمتطوعين والهيكل التنظيمي
 * Community Integration, Volunteers & Organizational Structure Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const COMMUNITY_ORG_TEMPLATES = [
  /* ── الدمج المجتمعي ── */
  { id: 'community-activity-report', name: 'تقرير نشاط مجتمعي', nameEn: 'Community Activity Report', desc: 'تقرير نشاط أو فعالية مجتمعية', color: '#0d47a1' },
  { id: 'partnership-agreement-print', name: 'اتفاقية شراكة مجتمعية', nameEn: 'Community Partnership Agreement', desc: 'اتفاقية شراكة مع جهة مجتمعية', color: '#1565c0' },
  { id: 'community-outreach-report', name: 'تقرير التواصل المجتمعي', nameEn: 'Community Outreach Report', desc: 'تقرير أنشطة التواصل المجتمعي', color: '#1976d2' },
  { id: 'awareness-campaign-plan', name: 'خطة حملة توعوية', nameEn: 'Awareness Campaign Plan', desc: 'خطة حملة توعية مجتمعية', color: '#1e88e5' },
  { id: 'community-impact-report', name: 'تقرير الأثر المجتمعي', nameEn: 'Community Impact Report', desc: 'تقرير قياس الأثر المجتمعي', color: '#2196f3' },
  { id: 'social-responsibility-report', name: 'تقرير المسؤولية الاجتماعية', nameEn: 'Social Responsibility Report', desc: 'تقرير المسؤولية الاجتماعية للمركز', color: '#42a5f5' },
  /* ── المتطوعون ── */
  { id: 'volunteer-detailed-register', name: 'سجل المتطوعين التفصيلي', nameEn: 'Detailed Volunteer Register', desc: 'سجل تفصيلي لبيانات المتطوعين', color: '#4a148c' },
  { id: 'volunteer-hours-log', name: 'سجل ساعات التطوع', nameEn: 'Volunteer Hours Log', desc: 'سجل ساعات عمل المتطوعين', color: '#6a1b9a' },
  { id: 'volunteer-appreciation', name: 'شهادة تقدير متطوع', nameEn: 'Volunteer Appreciation Certificate', desc: 'شهادة تقدير وشكر للمتطوع', color: '#7b1fa2' },
  { id: 'volunteer-evaluation-form', name: 'نموذج تقييم متطوع', nameEn: 'Volunteer Evaluation', desc: 'نموذج تقييم أداء متطوع', color: '#8e24aa' },
  { id: 'volunteer-handbook-ack', name: 'إقرار دليل المتطوعين', nameEn: 'Volunteer Handbook Acknowledgment', desc: 'إقرار استلام وقراءة دليل المتطوعين', color: '#9c27b0' },
  { id: 'volunteer-schedule', name: 'جدول المتطوعين', nameEn: 'Volunteer Schedule', desc: 'جدول مواعيد المتطوعين', color: '#ab47bc' },
  /* ── الهيكل التنظيمي والقوى العاملة ── */
  { id: 'org-chart-print', name: 'الهيكل التنظيمي', nameEn: 'Organization Chart', desc: 'طباعة الهيكل التنظيمي للمركز', color: '#263238' },
  { id: 'position-description', name: 'بطاقة وصف وظيفي', nameEn: 'Position Description Card', desc: 'بطاقة وصف وظيفي معتمدة', color: '#37474f' },
  { id: 'department-summary', name: 'ملخص القسم', nameEn: 'Department Summary', desc: 'ملخص معلومات وإحصاءات القسم', color: '#455a64' },
  { id: 'workforce-analytics-report', name: 'تقرير تحليلات القوى العاملة', nameEn: 'Workforce Analytics Report', desc: 'تقرير تحليلي للقوى العاملة', color: '#546e7a' },
  { id: 'succession-planning-form', name: 'نموذج تخطيط التعاقب', nameEn: 'Succession Planning Form', desc: 'نموذج تخطيط تعاقب وظيفي', color: '#607d8b' },
  { id: 'org-restructure-proposal', name: 'مقترح إعادة هيكلة', nameEn: 'Restructure Proposal', desc: 'مقترح إعادة هيكلة تنظيمية', color: '#78909c' },
];

export const CommunityOrgTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    /* ══════════════ الدمج المجتمعي ══════════════ */
    case 'community-activity-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير نشاط مجتمعي" subtitle="Community Activity Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="اسم النشاط" value={d.activityName} w="30%" /><Field label="النوع" value={d.type} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="الموقع" value={d.location} w="20%" /></div>
            <div style={fieldRow}><Field label="الجهات الشريكة" value={d.partners} w="30%" /><Field label="عدد المشاركين" value={d.participants} w="15%" /><Field label="المنسق" value={d.coordinator} w="25%" /></div>
            <NotesBox label="وصف النشاط" value={d.description} lines={2} />
            <Section title="النتائج والمخرجات">
              <EmptyTable cols={4} rows={5} headers={['المخرج', 'المستهدف', 'المتحقق', 'ملاحظات']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="منسق النشاط" leftLabel="مدير المجتمع" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'partnership-agreement-print':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="اتفاقية شراكة مجتمعية" subtitle="Community Partnership Agreement" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الطرف الأول" value={d.party1 || 'مركز الأوائل للتأهيل'} w="35%" /><Field label="الطرف الثاني" value={d.party2} w="35%" /></div>
            <div style={fieldRow}><Field label="موضوع الشراكة" value={d.subject} w="40%" /><Field label="المدة" value={d.duration} w="15%" /><Field label="من" value={formatDate(d.startDate)} w="12%" /><Field label="إلى" value={formatDate(d.endDate)} w="12%" /></div>
            <Section title="التزامات الطرف الأول">
              <EmptyTable cols={2} rows={4} headers={['الالتزام', 'الموعد']} />
            </Section>
            <Section title="التزامات الطرف الثاني">
              <EmptyTable cols={2} rows={4} headers={['الالتزام', 'الموعد']} />
            </Section>
            <NotesBox label="أحكام عامة" value={d.generalTerms} lines={3} />
            <SignatureBlock rightLabel="الطرف الأول" leftLabel="الطرف الثاني" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'community-outreach-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير أنشطة التواصل المجتمعي" subtitle="Community Outreach Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="المعد" value={d.preparedBy} w="25%" /><Field label="عدد الأنشطة" value={d.activityCount} w="15%" /></div>
            <Section title="ملخص الأنشطة">
              <EmptyTable cols={5} rows={8} headers={['النشاط', 'التاريخ', 'الجمهور', 'المشاركون', 'الأثر']} />
            </Section>
            <Section title="الإحصاءات">
              <EmptyTable cols={3} rows={4} headers={['المقياس', 'القيمة', 'مقارنة بالفترة السابقة']} />
            </Section>
            <NotesBox label="التحديات" value={d.challenges} lines={2} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مسؤول التواصل" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'awareness-campaign-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة حملة توعية مجتمعية" subtitle="Awareness Campaign Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="عنوان الحملة" value={d.campaignTitle} w="30%" /><Field label="الموضوع" value={d.topic} w="25%" /><Field label="المدة" value={d.duration} w="15%" /></div>
            <div style={fieldRow}><Field label="الجمهور المستهدف" value={d.targetAudience} w="25%" /><Field label="الميزانية" value={d.budget} w="15%" /><Field label="المنسق" value={d.coordinator} w="25%" /></div>
            <NotesBox label="أهداف الحملة" value={d.objectives} lines={2} />
            <Section title="الأنشطة والجدول الزمني">
              <EmptyTable cols={5} rows={6} headers={['النشاط', 'القناة', 'التاريخ', 'المسؤول', 'الميزانية']} />
            </Section>
            <Section title="مؤشرات النجاح">
              <EmptyTable cols={3} rows={4} headers={['المؤشر', 'المستهدف', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="منسق الحملة" leftLabel="مدير الاتصال" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'community-impact-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير قياس الأثر المجتمعي" subtitle="Community Impact Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="المعد" value={d.preparedBy} w="25%" /></div>
            <Section title="مؤشرات الأثر">
              <EmptyTable cols={5} rows={8} headers={['المؤشر', 'خط الأساس', 'المتحقق', 'التغير %', 'التحليل']} />
            </Section>
            <Section title="المستفيدون المباشرون">
              <EmptyTable cols={4} rows={4} headers={['الفئة', 'العدد', 'نسبة الرضا', 'ملاحظات']} />
            </Section>
            <NotesBox label="قصص نجاح" value={d.successStories} lines={2} />
            <NotesBox label="التحديات" value={d.challenges} lines={2} />
            <SignatureBlock rightLabel="مسؤول الأثر" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'social-responsibility-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير المسؤولية الاجتماعية" subtitle="Social Responsibility Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="السنة" value={d.year} w="12%" /><Field label="المعد" value={d.preparedBy} w="25%" /></div>
            <Section title="المبادرات والأنشطة">
              <EmptyTable cols={5} rows={6} headers={['المبادرة', 'الفئة', 'المستفيدون', 'التكلفة', 'الأثر']} />
            </Section>
            <Section title="الإحصاءات الإجمالية">
              <EmptyTable cols={3} rows={5} headers={['المقياس', 'القيمة', 'التغير عن العام السابق']} />
            </Section>
            <NotesBox label="الرؤية المستقبلية" value={d.futureVision} lines={2} />
            <SignatureBlock rightLabel="مسؤول المسؤولية الاجتماعية" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ المتطوعون ══════════════ */
    case 'volunteer-detailed-register':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل المتطوعين التفصيلي" subtitle="Detailed Volunteer Register" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="إجمالي المتطوعين" value={d.totalVolunteers} w="15%" /><Field label="المنسق" value={d.coordinator} w="25%" /></div>
            <Section title="بيانات المتطوعين">
              <EmptyTable cols={7} rows={12} headers={['#', 'الاسم', 'رقم الهوية', 'التخصص', 'تاريخ التسجيل', 'الساعات', 'الحالة']} />
            </Section>
            <SignatureBlock rightLabel="منسق المتطوعين" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'volunteer-hours-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل ساعات التطوع" subtitle="Volunteer Hours Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المتطوع" value={d.volunteer} w="25%" /><Field label="الشهر" value={d.month} w="15%" /><Field label="القسم" value={d.department} w="20%" /></div>
            <Section title="سجل الساعات">
              <EmptyTable cols={5} rows={15} headers={['التاريخ', 'من', 'إلى', 'الساعات', 'النشاط']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الساعات" value={d.totalHours} w="15%" /></div>
            <SignatureBlock rightLabel="المتطوع" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'volunteer-appreciation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة تقدير متطوع" subtitle="Volunteer Appreciation Certificate" />
          <div style={bodyPad}>
            <div style={{ border: '3px double #4a148c', borderRadius: 12, padding: 30, margin: '30px 0', textAlign: 'center' }}>
              <h2 style={{ color: '#4a148c', marginBottom: 20 }}>شهادة شكر وتقدير</h2>
              <p style={{ fontSize: 16, margin: '15px 0' }}>يسعد مركز الأوائل للتأهيل أن يقدم هذه الشهادة إلى</p>
              <div style={fieldRow}><Field label="المتطوع" value={d.volunteer} w="40%" /></div>
              <p style={{ fontSize: 14, margin: '15px 0' }}>تقديراً لجهوده المتميزة في خدمة المجتمع</p>
              <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="ساعات التطوع" value={d.totalHours} w="15%" /></div>
              <div style={fieldRow}><Field label="المجال" value={d.area} w="25%" /></div>
            </div>
            <SignatureBlock rightLabel="مدير المتطوعين" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'volunteer-evaluation-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تقييم أداء متطوع" subtitle="Volunteer Performance Evaluation" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المتطوع" value={d.volunteer} w="25%" /><Field label="القسم" value={d.department} w="20%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="المقيِّم" value={d.evaluator} w="20%" /></div>
            <Section title="معايير التقييم">
              <EmptyTable cols={5} rows={8} headers={['المعيار', 'ممتاز (5)', 'جيد (4)', 'مقبول (3)', 'ضعيف (1-2)']} />
            </Section>
            <div style={fieldRow}><Field label="التقييم العام" value={d.overallRating} w="20%" /></div>
            <NotesBox label="نقاط القوة" value={d.strengths} lines={2} />
            <NotesBox label="نقاط التطوير" value={d.development} lines={2} />
            <SignatureBlock rightLabel="المقيِّم" leftLabel="المتطوع" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'volunteer-handbook-ack':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إقرار استلام دليل المتطوعين" subtitle="Volunteer Handbook Acknowledgment" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المتطوع" value={d.volunteer} w="25%" /><Field label="رقم الهوية" value={d.nationalId} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <NotesBox label="أقر أنا الموقع أدناه بأنني استلمت نسخة من دليل المتطوعين وقرأت محتواه وأوافق على الالتزام بكافة السياسات والإجراءات الواردة فيه." value="" lines={3} />
            <Section title="البنود الرئيسية">
              <EmptyTable cols={3} rows={6} headers={['البند', 'قرأت وفهمت', 'التوقيع']} />
            </Section>
            <SignatureBlock rightLabel="المتطوع" leftLabel="منسق المتطوعين" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'volunteer-schedule':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="جدول مواعيد المتطوعين" subtitle="Volunteer Schedule" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الأسبوع/الشهر" value={d.period} w="20%" /><Field label="القسم" value={d.department} w="20%" /><Field label="المنسق" value={d.coordinator} w="25%" /></div>
            <Section title="الجدول">
              <EmptyTable cols={7} rows={10} headers={['المتطوع', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات عامة" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="منسق المتطوعين" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ الهيكل التنظيمي ══════════════ */
    case 'org-chart-print':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="الهيكل التنظيمي للمركز" subtitle="Organization Chart" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="تاريخ الاعتماد" value={formatDate(d.approvalDate)} w="15%" /><Field label="الإصدار" value={d.version} w="10%" /><Field label="عدد الأقسام" value={d.departmentCount} w="12%" /><Field label="إجمالي الموظفين" value={d.totalStaff} w="12%" /></div>
            <div style={{ border: '1px dashed #666', borderRadius: 8, minHeight: 300, margin: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#999' }}>[مساحة مخصصة للهيكل التنظيمي]</span>
            </div>
            <Section title="ملخص الأقسام">
              <EmptyTable cols={4} rows={8} headers={['القسم', 'المدير', 'عدد الموظفين', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'position-description':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بطاقة وصف وظيفي" subtitle="Position Description Card" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المسمى الوظيفي" value={d.jobTitle} w="25%" /><Field label="الرمز الوظيفي" value={d.jobCode} w="15%" /><Field label="القسم" value={d.department} w="20%" /><Field label="الإدارة" value={d.directorate} w="20%" /></div>
            <div style={fieldRow}><Field label="المستوى" value={d.level} w="15%" /><Field label="يرفع تقاريره إلى" value={d.reportsTo} w="20%" /><Field label="يشرف على" value={d.supervises} w="20%" /></div>
            <NotesBox label="ملخص الوظيفة" value={d.summary} lines={2} />
            <Section title="المهام والمسؤوليات">
              <EmptyTable cols={2} rows={8} headers={['#', 'المهمة']} />
            </Section>
            <Section title="المؤهلات والمتطلبات">
              <EmptyTable cols={3} rows={5} headers={['المتطلب', 'الحد الأدنى', 'المفضل']} />
            </Section>
            <div style={fieldRow}><Field label="تاريخ الاعتماد" value={formatDate(d.approvalDate)} w="15%" /><Field label="الإصدار" value={d.version} w="10%" /></div>
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'department-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص معلومات القسم" subtitle="Department Summary" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم" value={d.department} w="25%" /><Field label="المدير" value={d.manager} w="25%" /><Field label="الإدارة" value={d.directorate} w="20%" /></div>
            <div style={fieldRow}><Field label="عدد الموظفين" value={d.staffCount} w="12%" /><Field label="الميزانية" value={d.budget} w="15%" /><Field label="المهمة" value={d.mission} w="30%" /></div>
            <Section title="الأقسام الفرعية/الوحدات">
              <EmptyTable cols={4} rows={5} headers={['الوحدة', 'المسؤول', 'الموظفون', 'المهام الرئيسية']} />
            </Section>
            <Section title="مؤشرات الأداء الرئيسية">
              <EmptyTable cols={4} rows={4} headers={['المؤشر', 'المستهدف', 'الفعلي', 'الحالة']} />
            </Section>
            <SignatureBlock rightLabel="مدير القسم" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'workforce-analytics-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تحليلات القوى العاملة" subtitle="Workforce Analytics Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="إجمالي الموظفين" value={d.totalEmployees} w="12%" /><Field label="معدل الدوران" value={d.turnoverRate} w="12%" /></div>
            <Section title="التوزيع حسب القسم">
              <EmptyTable cols={5} rows={8} headers={['القسم', 'العدد', 'النسبة', 'الشواغر', 'التغيير']} />
            </Section>
            <Section title="التوزيعات الديموغرافية">
              <EmptyTable cols={4} rows={5} headers={['الفئة', 'العدد', 'النسبة', 'ملاحظات']} />
            </Section>
            <Section title="مؤشرات رئيسية">
              <EmptyTable cols={3} rows={4} headers={['المؤشر', 'القيمة', 'المقارنة']} />
            </Section>
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'succession-planning-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تخطيط التعاقب الوظيفي" subtitle="Succession Planning Form" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المنصب" value={d.position} w="25%" /><Field label="شاغل المنصب الحالي" value={d.currentHolder} w="25%" /><Field label="القسم" value={d.department} w="20%" /></div>
            <div style={fieldRow}><Field label="تاريخ الإعداد" value={formatDate(d.date) || today()} w="15%" /><Field label="تاريخ الخروج المتوقع" value={formatDate(d.expectedExit)} w="15%" /></div>
            <Section title="المرشحون المحتملون">
              <EmptyTable cols={5} rows={4} headers={['المرشح', 'المنصب الحالي', 'الجاهزية', 'الفجوات', 'خطة التطوير']} />
            </Section>
            <Section title="خطة التطوير">
              <EmptyTable cols={4} rows={4} headers={['النشاط التطويري', 'المرشح', 'الموعد', 'الحالة']} />
            </Section>
            <SignatureBlock rightLabel="المدير المباشر" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'org-restructure-proposal':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مقترح إعادة هيكلة تنظيمية" subtitle="Organizational Restructure Proposal" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المقترح من" value={d.proposedBy} w="25%" /><Field label="القسم" value={d.department} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <NotesBox label="المبرر" value={d.justification} lines={3} />
            <Section title="التغييرات المقترحة">
              <EmptyTable cols={4} rows={6} headers={['البند', 'الوضع الحالي', 'المقترح', 'التأثير']} />
            </Section>
            <Section title="التأثير على القوى العاملة">
              <EmptyTable cols={4} rows={4} headers={['الفئة', 'الحالي', 'المقترح', 'الفرق']} />
            </Section>
            <NotesBox label="التكلفة المتوقعة" value={d.estimatedCost} lines={1} />
            <NotesBox label="الجدول الزمني" value={d.timeline} lines={1} />
            <SignatureBlock rightLabel="مقدم المقترح" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
