/**
 * قوالب المشاريع والتخطيط الاستراتيجي وإدارة المخاطر — Projects, Strategy & Risk Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine,
  fieldRow, bodyPad, pageWrapper, formatDate, today, formatMoney,
} from '../shared/PrintTemplateShared';

export const PROJECTS_STRATEGY_TEMPLATES = [
  /* ── المشاريع والتخطيط ── */
  { id: 'project-charter', name: 'ميثاق المشروع', nameEn: 'Project Charter', desc: 'وثيقة ميثاق المشروع', color: '#1565c0' },
  { id: 'project-status', name: 'تقرير حالة المشروع', nameEn: 'Project Status Report', desc: 'تقرير حالة المشروع الدوري', color: '#1976d2' },
  { id: 'project-closure', name: 'محضر إغلاق مشروع', nameEn: 'Project Closure Report', desc: 'محضر إغلاق المشروع', color: '#1e88e5' },
  { id: 'project-change-request', name: 'طلب تغيير مشروع', nameEn: 'Change Request', desc: 'نموذج طلب تغيير على المشروع', color: '#2196f3' },
  { id: 'strategic-goal', name: 'هدف استراتيجي', nameEn: 'Strategic Goal Card', desc: 'بطاقة الهدف الاستراتيجي', color: '#42a5f5' },
  { id: 'strategic-initiative', name: 'مبادرة استراتيجية', nameEn: 'Strategic Initiative', desc: 'وثيقة المبادرة الاستراتيجية', color: '#0d47a1' },
  { id: 'kpi-scorecard', name: 'بطاقة مؤشرات الأداء', nameEn: 'KPI Scorecard', desc: 'بطاقة قياس مؤشرات الأداء', color: '#0277bd' },
  { id: 'swot-analysis', name: 'تحليل SWOT', nameEn: 'SWOT Analysis', desc: 'نموذج تحليل البيئة الاستراتيجية', color: '#01579b' },
  { id: 'balanced-scorecard', name: 'بطاقة الأداء المتوازن', nameEn: 'Balanced Scorecard', desc: 'بطاقة الأداء المتوازن BSC', color: '#0288d1' },
  /* ── إدارة المخاطر ── */
  { id: 'risk-register', name: 'سجل المخاطر', nameEn: 'Risk Register', desc: 'سجل المخاطر المؤسسية', color: '#c62828' },
  { id: 'risk-assessment', name: 'تقييم مخاطر', nameEn: 'Risk Assessment', desc: 'نموذج تقييم المخاطر', color: '#d32f2f' },
  { id: 'risk-treatment', name: 'خطة معالجة المخاطر', nameEn: 'Risk Treatment Plan', desc: 'خطة معالجة ومتابعة المخاطر', color: '#e53935' },
  { id: 'business-continuity', name: 'خطة استمرارية الأعمال', nameEn: 'Business Continuity Plan', desc: 'خطة استمرارية الأعمال BCP', color: '#b71c1c' },
  { id: 'succession-plan', name: 'خطة تعاقب وظيفي', nameEn: 'Succession Plan', desc: 'خطة التعاقب الوظيفي', color: '#880e4f' },
  { id: 'lessons-learned', name: 'الدروس المستفادة', nameEn: 'Lessons Learned', desc: 'تقرير الدروس المستفادة', color: '#4a148c' },
  { id: 'stakeholder-analysis', name: 'تحليل أصحاب المصلحة', nameEn: 'Stakeholder Analysis', desc: 'مصفوفة تحليل أصحاب المصلحة', color: '#311b92' },
  { id: 'milestone-tracker', name: 'متتبع المراحل', nameEn: 'Milestone Tracker', desc: 'جدول مراحل المشروع', color: '#1a237e' },
  { id: 'project-budget', name: 'موازنة المشروع', nameEn: 'Project Budget', desc: 'موازنة المشروع التفصيلية', color: '#283593' },
];

export const ProjectsStrategyTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'project-charter':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ميثاق المشروع" subtitle="Project Charter" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="اسم المشروع" value={d.projectName} w="40%" /><Field label="الرقم" value={d.projectNo} w="15%" /><Field label="مدير المشروع" value={d.manager} w="25%" /><Field label="الراعي" value={d.sponsor} w="20%" /></div>
            <div style={fieldRow}><Field label="تاريخ البدء" value={formatDate(d.startDate)} w="20%" /><Field label="تاريخ الانتهاء" value={formatDate(d.endDate)} w="20%" /><Field label="الميزانية" value={formatMoney(d.budget)} w="25%" /><Field label="الأولوية" value={d.priority} w="15%" /></div>
            <NotesBox label="الغرض / الهدف" value={d.purpose} lines={3} />
            <NotesBox label="النطاق" value={d.scope} lines={3} />
            <NotesBox label="المخرجات الرئيسية" value={d.deliverables} lines={2} />
            <NotesBox label="المخاطر الأولية" value={d.risks} lines={2} />
            <NotesBox label="الافتراضات والقيود" value={d.assumptions} lines={2} />
            <SignatureBlock rightLabel="مدير المشروع" leftLabel="الراعي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'project-status':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حالة المشروع" subtitle="Project Status Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المشروع" value={d.projectName} w="35%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="الحالة العامة" value={d.overallStatus} w="15%" /><Field label="نسبة الإنجاز" value={d.completion} w="15%" /></div>
            <Section title="مؤشرات الحالة">
              <EmptyTable cols={4} rows={4} headers={['المؤشر', 'المخطط', 'الفعلي', 'الحالة (أخضر/أصفر/أحمر)']} />
            </Section>
            <Section title="الإنجازات خلال الفترة">
              <EmptyTable cols={3} rows={5} headers={['الإنجاز', 'التاريخ', 'ملاحظات']} />
            </Section>
            <NotesBox label="المخاطر والعوائق" value={d.risksIssues} lines={2} />
            <NotesBox label="الخطوات القادمة" value={d.nextSteps} lines={2} />
            <SignatureBlock rightLabel="مدير المشروع" leftLabel="الراعي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'project-closure':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="محضر إغلاق المشروع" subtitle="Project Closure Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المشروع" value={d.projectName} w="40%" /><Field label="المدير" value={d.manager} w="30%" /><Field label="تاريخ الإغلاق" value={formatDate(d.closureDate) || today()} w="20%" /></div>
            <div style={fieldRow}><Field label="البدء الفعلي" value={formatDate(d.actualStart)} w="20%" /><Field label="الانتهاء الفعلي" value={formatDate(d.actualEnd)} w="20%" /><Field label="الميزانية المعتمدة" value={formatMoney(d.approvedBudget)} w="25%" /><Field label="الإنفاق الفعلي" value={formatMoney(d.actualSpend)} w="25%" /></div>
            <Section title="مخرجات المشروع">
              <EmptyTable cols={4} rows={5} headers={['المخرج', 'الحالة', 'التاريخ', 'ملاحظات']} />
            </Section>
            <NotesBox label="المخاطر التي تحققت" value={d.realizedRisks} lines={2} />
            <NotesBox label="الدروس المستفادة" value={d.lessonsLearned} lines={3} />
            <SignatureBlock rightLabel="مدير المشروع" leftLabel="الراعي / الإدارة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'project-change-request':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج طلب تغيير على المشروع" subtitle="Project Change Request" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المشروع" value={d.projectName} w="40%" /><Field label="رقم التغيير" value={d.changeNo} w="15%" /><Field label="مقدم الطلب" value={d.requester} w="25%" /><Field label="الأولوية" value={d.priority} w="15%" /></div>
            <NotesBox label="وصف التغيير" value={d.changeDescription} lines={3} />
            <NotesBox label="مبرر التغيير" value={d.justification} lines={2} />
            <NotesBox label="الأثر على الجدول الزمني" value={d.scheduleImpact} lines={2} />
            <NotesBox label="الأثر على الميزانية" value={d.budgetImpact} lines={2} />
            <NotesBox label="الأثر على النطاق" value={d.scopeImpact} lines={2} />
            <div style={fieldRow}><Field label="القرار" value={d.decision} w="25%" /><Field label="تاريخ القرار" value={formatDate(d.decisionDate)} w="25%" /></div>
            <SignatureBlock rightLabel="مدير المشروع" leftLabel="لجنة التغيير" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'strategic-goal':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بطاقة الهدف الاستراتيجي" subtitle="Strategic Goal Card" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الهدف" value={d.goalTitle} w="45%" /><Field label="المحور" value={d.perspective} w="25%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <NotesBox label="وصف الهدف" value={d.description} lines={2} />
            <Section title="مؤشرات القياس">
              <EmptyTable cols={5} rows={4} headers={['المؤشر', 'المستهدف', 'الفعلي', 'الوزن %', 'النتيجة']} />
            </Section>
            <Section title="المبادرات المرتبطة">
              <EmptyTable cols={4} rows={4} headers={['المبادرة', 'المسؤول', 'نسبة الإنجاز', 'ملاحظات']} />
            </Section>
            <NotesBox label="التحديات" value={d.challenges} lines={2} />
            <SignatureBlock rightLabel="المسؤول" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'strategic-initiative':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="وثيقة المبادرة الاستراتيجية" subtitle="Strategic Initiative Document" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المبادرة" value={d.initiativeName} w="40%" /><Field label="الهدف الاستراتيجي" value={d.strategicGoal} w="35%" /><Field label="المسؤول" value={d.owner} w="25%" /></div>
            <div style={fieldRow}><Field label="من" value={formatDate(d.startDate)} w="20%" /><Field label="إلى" value={formatDate(d.endDate)} w="20%" /><Field label="الميزانية" value={formatMoney(d.budget)} w="25%" /><Field label="الحالة" value={d.status} w="15%" /></div>
            <NotesBox label="الوصف" value={d.description} lines={2} />
            <NotesBox label="الأثر المتوقع" value={d.expectedImpact} lines={2} />
            <Section title="خطة التنفيذ">
              <EmptyTable cols={5} rows={6} headers={['المهمة', 'المسؤول', 'البدء', 'الانتهاء', 'الحالة']} />
            </Section>
            <SignatureBlock rightLabel="قائد المبادرة" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'kpi-scorecard':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بطاقة قياس مؤشرات الأداء" subtitle="KPI Scorecard" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم/الإدارة" value={d.department} w="30%" /><Field label="الفترة" value={d.period} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="المؤشرات">
              <EmptyTable cols={7} rows={10} headers={['المؤشر', 'الوزن %', 'المستهدف', 'الفعلي', 'النسبة %', 'الحالة', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="المعدل العام" value={d.overallScore} w="25%" /><Field label="التقييم" value={d.rating} w="25%" /></div>
            <SignatureBlock rightLabel="المسؤول" leftLabel="مدير الجودة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'swot-analysis':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تحليل البيئة الاستراتيجية SWOT" subtitle="SWOT Analysis" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الموضوع/المشروع" value={d.subject} w="40%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="المحلل" value={d.analyst} w="25%" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
              <div style={{ border: '2px solid #4caf50', borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 700, color: '#4caf50', marginBottom: 8, fontSize: 14 }}>نقاط القوة (Strengths)</div>
                <NotesBox value={d.strengths} lines={6} />
              </div>
              <div style={{ border: '2px solid #f44336', borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 700, color: '#f44336', marginBottom: 8, fontSize: 14 }}>نقاط الضعف (Weaknesses)</div>
                <NotesBox value={d.weaknesses} lines={6} />
              </div>
              <div style={{ border: '2px solid #2196f3', borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 700, color: '#2196f3', marginBottom: 8, fontSize: 14 }}>الفرص (Opportunities)</div>
                <NotesBox value={d.opportunities} lines={6} />
              </div>
              <div style={{ border: '2px solid #ff9800', borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 700, color: '#ff9800', marginBottom: 8, fontSize: 14 }}>التهديدات (Threats)</div>
                <NotesBox value={d.threats} lines={6} />
              </div>
            </div>
            <NotesBox label="التوصيات" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="المحلل" leftLabel="المدير" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'balanced-scorecard':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بطاقة الأداء المتوازن" subtitle="Balanced Scorecard" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الإدارة" value={d.department} w="30%" /><Field label="الفترة" value={d.period} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            {['المنظور المالي', 'منظور العملاء', 'العمليات الداخلية', 'التعلم والنمو'].map((p, i) => (
              <Section key={i} title={p}>
                <EmptyTable cols={5} rows={3} headers={['الهدف', 'المؤشر', 'المستهدف', 'الفعلي', 'الحالة']} />
              </Section>
            ))}
            <SignatureBlock rightLabel="مدير التخطيط" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'risk-register':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل المخاطر المؤسسية" subtitle="Risk Register" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="المسؤول" value={d.owner} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="عدد المخاطر" value={d.riskCount} w="15%" /></div>
            <Section title="سجل المخاطر">
              <EmptyTable cols={7} rows={10} headers={['المخاطرة', 'الفئة', 'الاحتمال', 'الأثر', 'الدرجة', 'المعالجة', 'المسؤول']} />
            </Section>
            <NotesBox label="ملخص المراجعة" value={d.reviewSummary} lines={2} />
            <SignatureBlock rightLabel="مسؤول المخاطر" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'risk-assessment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تقييم المخاطر" subtitle="Risk Assessment Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الخطر" value={d.riskTitle} w="40%" /><Field label="الفئة" value={d.category} w="20%" /><Field label="المصدر" value={d.source} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <NotesBox label="وصف الخطر" value={d.description} lines={2} />
            <div style={fieldRow}><Field label="الاحتمال (1-5)" value={d.likelihood} w="20%" /><Field label="الأثر (1-5)" value={d.impact} w="20%" /><Field label="الدرجة" value={d.riskScore} w="15%" /><Field label="المستوى" value={d.riskLevel} w="15%" /></div>
            <NotesBox label="الأثر المتوقع" value={d.expectedImpact} lines={2} />
            <NotesBox label="الضوابط الحالية" value={d.currentControls} lines={2} />
            <NotesBox label="خطة المعالجة" value={d.treatmentPlan} lines={2} />
            <SignatureBlock rightLabel="المقيّم" leftLabel="مدير المخاطر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'risk-treatment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة معالجة المخاطر" subtitle="Risk Treatment Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الخطر" value={d.riskTitle} w="40%" /><Field label="الدرجة" value={d.riskScore} w="15%" /><Field label="الاستراتيجية" value={d.strategy} w="20%" /><Field label="المسؤول" value={d.owner} w="25%" /></div>
            <Section title="إجراءات المعالجة">
              <EmptyTable cols={5} rows={5} headers={['الإجراء', 'المسؤول', 'الموعد', 'الحالة', 'ملاحظات']} />
            </Section>
            <Section title="متابعة ما بعد المعالجة">
              <EmptyTable cols={4} rows={4} headers={['التاريخ', 'الاحتمال المتبقي', 'الأثر المتبقي', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول المعالجة" leftLabel="مدير المخاطر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'business-continuity':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة استمرارية الأعمال" subtitle="Business Continuity Plan" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="العملية" value={d.processName} w="35%" /><Field label="القسم" value={d.department} w="25%" /><Field label="الأولوية" value={d.priority} w="15%" /><Field label="RTO" value={d.rto} w="12%" /><Field label="RPO" value={d.rpo} w="12%" /></div>
            <NotesBox label="وصف السيناريو" value={d.scenario} lines={2} />
            <Section title="خطوات الاستجابة">
              <EmptyTable cols={4} rows={8} headers={['الخطوة', 'المسؤول', 'الإطار الزمني', 'الموارد المطلوبة']} />
            </Section>
            <NotesBox label="جهات الاتصال الطارئة" value={d.emergencyContacts} lines={2} />
            <NotesBox label="موقع العمل البديل" value={d.alternativeSite} lines={1} />
            <SignatureBlock rightLabel="مسؤول BCP" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'succession-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة التعاقب الوظيفي" subtitle="Succession Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المنصب" value={d.position} w="30%" /><Field label="القسم" value={d.department} w="25%" /><Field label="شاغل المنصب" value={d.incumbent} w="25%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <Section title="المرشحون للتعاقب">
              <EmptyTable cols={6} rows={5} headers={['المرشح', 'المنصب الحالي', 'الجاهزية', 'الخبرة', 'خطة التطوير', 'الجدول الزمني']} />
            </Section>
            <NotesBox label="متطلبات المنصب" value={d.requirements} lines={2} />
            <NotesBox label="خطة التأهيل" value={d.developmentPlan} lines={2} />
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'lessons-learned':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير الدروس المستفادة" subtitle="Lessons Learned Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المشروع/الحدث" value={d.projectName} w="40%" /><Field label="المسؤول" value={d.responsible} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="ما سار بشكل جيد">
              <EmptyTable cols={3} rows={5} headers={['الموضوع', 'التفاصيل', 'التوصية']} />
            </Section>
            <Section title="ما يحتاج تحسين">
              <EmptyTable cols={3} rows={5} headers={['الموضوع', 'التفاصيل', 'الإجراء التصحيحي']} />
            </Section>
            <NotesBox label="توصيات للمستقبل" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="مدير المشروع" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'stakeholder-analysis':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مصفوفة تحليل أصحاب المصلحة" subtitle="Stakeholder Analysis Matrix" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المشروع/المبادرة" value={d.project} w="40%" /><Field label="المحلل" value={d.analyst} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="أصحاب المصلحة">
              <EmptyTable cols={6} rows={8} headers={['صاحب المصلحة', 'الاهتمام', 'القوة/التأثير', 'الموقف', 'استراتيجية التعامل', 'المسؤول']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="المحلل" leftLabel="مدير المشروع" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'milestone-tracker':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="جدول مراحل المشروع" subtitle="Milestone Tracker" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المشروع" value={d.projectName} w="40%" /><Field label="المدير" value={d.manager} w="30%" /><Field label="تاريخ التحديث" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="المراحل الرئيسية">
              <EmptyTable cols={6} rows={12} headers={['المرحلة', 'التاريخ المخطط', 'التاريخ الفعلي', 'الحالة', 'نسبة الإنجاز', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="نسبة الإنجاز الكلية" value={d.overallCompletion} w="25%" /><Field label="الحالة العامة" value={d.overallStatus} w="25%" /></div>
            <SignatureBlock rightLabel="مدير المشروع" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'project-budget':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="موازنة المشروع التفصيلية" subtitle="Project Budget" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المشروع" value={d.projectName} w="40%" /><Field label="مدير المشروع" value={d.manager} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <div style={fieldRow}><Field label="الميزانية الإجمالية" value={formatMoney(d.totalBudget)} w="25%" /><Field label="المصروف حتى الآن" value={formatMoney(d.spentToDate)} w="25%" /><Field label="المتبقي" value={formatMoney(d.remaining)} w="25%" /><Field label="نسبة الصرف" value={d.spendPercentage} w="20%" /></div>
            <Section title="تفاصيل بنود الميزانية">
              <EmptyTable cols={6} rows={10} headers={['البند', 'المعتمد', 'المصروف', 'المتبقي', 'النسبة %', 'ملاحظات']} />
            </Section>
            <NotesBox label="تحليل الانحرافات" value={d.varianceAnalysis} lines={2} />
            <SignatureBlock rightLabel="مدير المشروع" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
