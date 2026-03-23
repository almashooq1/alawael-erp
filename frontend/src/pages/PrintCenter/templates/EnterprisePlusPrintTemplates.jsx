/**
 * قوالب المؤسسة المتقدمة والمتكاملة
 * Enterprise Plus / Advanced Enterprise Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine, ConfidentialBanner,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const ENTERPRISE_PLUS_TEMPLATES = [
  /* ── استمرارية الأعمال والحوكمة ── */
  { id: 'bcp-plan-document', name: 'خطة استمرارية الأعمال', nameEn: 'Business Continuity Plan', desc: 'وثيقة خطة استمرارية الأعمال الشاملة', color: '#283593' },
  { id: 'bcp-test-report', name: 'تقرير اختبار BCP', nameEn: 'BCP Test Report', desc: 'تقرير اختبار خطة استمرارية الأعمال', color: '#303f9f' },
  { id: 'governance-framework', name: 'إطار الحوكمة', nameEn: 'Governance Framework', desc: 'إطار عمل الحوكمة المؤسسية', color: '#3949ab' },
  { id: 'compliance-dashboard-print', name: 'لوحة الامتثال', nameEn: 'Compliance Dashboard', desc: 'طباعة لوحة حالة الامتثال', color: '#3f51b5' },
  { id: 'governance-meeting-report', name: 'تقرير اجتماع الحوكمة', nameEn: 'Governance Meeting Report', desc: 'محضر اجتماع لجنة الحوكمة', color: '#5c6bc0' },
  /* ── الاستدامة والمسؤولية الاجتماعية ── */
  { id: 'sustainability-report', name: 'تقرير الاستدامة', nameEn: 'Sustainability Report', desc: 'تقرير الاستدامة السنوي', color: '#2e7d32' },
  { id: 'carbon-footprint-report', name: 'تقرير البصمة الكربونية', nameEn: 'Carbon Footprint Report', desc: 'تقرير البصمة الكربونية للمنشأة', color: '#388e3c' },
  { id: 'csr-impact-report', name: 'تقرير أثر المسؤولية الاجتماعية', nameEn: 'CSR Impact Report', desc: 'تقرير أثر برامج المسؤولية الاجتماعية', color: '#43a047' },
  /* ── إدارة خدمات تقنية المعلومات ── */
  { id: 'it-service-request-form', name: 'طلب خدمة تقنية', nameEn: 'IT Service Request', desc: 'نموذج طلب خدمة تقنية معلومات', color: '#6a1b9a' },
  { id: 'it-change-management', name: 'إدارة التغيير التقني', nameEn: 'IT Change Management', desc: 'نموذج طلب تغيير تقني', color: '#7b1fa2' },
  { id: 'it-asset-register-print', name: 'سجل الأصول التقنية', nameEn: 'IT Asset Register', desc: 'سجل أصول تقنية المعلومات', color: '#8e24aa' },
  { id: 'it-incident-report', name: 'تقرير حادث تقني', nameEn: 'IT Incident Report', desc: 'تقرير حادث أمني أو تقني', color: '#9c27b0' },
  /* ── إدارة الموردين ── */
  { id: 'vendor-performance-scorecard', name: 'بطاقة أداء المورد', nameEn: 'Vendor Scorecard', desc: 'بطاقة تقييم أداء المورد', color: '#00695c' },
  { id: 'vendor-audit-report', name: 'تقرير تدقيق المورد', nameEn: 'Vendor Audit Report', desc: 'تقرير تدقيق مورد', color: '#00796b' },
  { id: 'vendor-onboarding-form', name: 'نموذج تأهيل مورد', nameEn: 'Vendor Onboarding', desc: 'نموذج تأهيل مورد جديد', color: '#00897b' },
  /* ── رعاية متكاملة متقدمة ── */
  { id: 'integrated-care-pathway', name: 'مسار الرعاية المتكاملة', nameEn: 'Integrated Care Pathway', desc: 'مسار رعاية متكامل للمستفيد', color: '#c62828' },
  { id: 'care-coordination-summary', name: 'ملخص تنسيق الرعاية', nameEn: 'Care Coordination Summary', desc: 'ملخص تنسيق الرعاية بين الفرق', color: '#d32f2f' },
  { id: 'quality-improvement-project', name: 'مشروع تحسين الجودة', nameEn: 'Quality Improvement Project', desc: 'نموذج مشروع تحسين الجودة المستمرة', color: '#e53935' },
];

export const EnterprisePlusTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    /* ══════════════ استمرارية الأعمال والحوكمة ══════════════ */
    case 'bcp-plan-document':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة استمرارية الأعمال" subtitle="Business Continuity Plan (BCP)" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="اسم الخطة" value={d.planName} w="30%" /><Field label="الإصدار" value={d.version} w="10%" /><Field label="المالك" value={d.owner} w="25%" /><Field label="تاريخ المراجعة" value={formatDate(d.reviewDate)} w="15%" /></div>
            <Section title="نطاق الخطة">
              <NotesBox label="" value={d.scope} lines={2} />
            </Section>
            <Section title="العمليات الحرجة (BIA)">
              <EmptyTable cols={5} rows={6} headers={['العملية', 'الأولوية', 'RTO', 'RPO', 'البديل']} />
            </Section>
            <Section title="فريق الطوارئ">
              <EmptyTable cols={4} rows={5} headers={['الاسم', 'الدور', 'الهاتف', 'البديل']} />
            </Section>
            <Section title="خطوات الاستجابة">
              <EmptyTable cols={4} rows={6} headers={['المرحلة', 'الإجراء', 'المسؤول', 'الجدول الزمني']} />
            </Section>
            <NotesBox label="الموارد المطلوبة" value={d.resources} lines={2} />
            <SignatureBlock rightLabel="مالك الخطة" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'bcp-test-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير اختبار خطة استمرارية الأعمال" subtitle="BCP Test Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="نوع الاختبار" value={d.testType} w="20%" /><Field label="السيناريو" value={d.scenario} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="القائد" value={d.leader} w="20%" /></div>
            <Section title="النتائج">
              <EmptyTable cols={5} rows={6} headers={['الإجراء المختبر', 'النتيجة', 'الوقت الفعلي', 'الوقت المستهدف', 'الحكم']} />
            </Section>
            <NotesBox label="الثغرات المكتشفة" value={d.gaps} lines={2} />
            <Section title="التوصيات">
              <EmptyTable cols={3} rows={4} headers={['التوصية', 'الأولوية', 'المسؤول']} />
            </Section>
            <SignatureBlock rightLabel="قائد الاختبار" leftLabel="مدير المخاطر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'governance-framework':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إطار الحوكمة المؤسسية" subtitle="Corporate Governance Framework" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الإصدار" value={d.version} w="10%" /><Field label="المعتمد" value={d.approvedBy} w="25%" /><Field label="تاريخ الاعتماد" value={formatDate(d.approvalDate)} w="15%" /></div>
            <Section title="المبادئ الأساسية">
              <EmptyTable cols={2} rows={5} headers={['المبدأ', 'الوصف']} />
            </Section>
            <Section title="هيكل الحوكمة">
              <EmptyTable cols={3} rows={5} headers={['اللجنة/الهيئة', 'المهام', 'دورية الاجتماع']} />
            </Section>
            <Section title="الأدوار والمسؤوليات">
              <EmptyTable cols={3} rows={5} headers={['الدور', 'المسؤوليات', 'المساءلة']} />
            </Section>
            <NotesBox label="آليات الرقابة والمتابعة" value={d.oversightMechanisms} lines={2} />
            <SignatureBlock rightLabel="رئيس مجلس الإدارة" leftLabel="المدير التنفيذي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'compliance-dashboard-print':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="لوحة حالة الامتثال" subtitle="Compliance Dashboard" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="مسؤول الامتثال" value={d.complianceOfficer} w="25%" /></div>
            <Section title="حالة الامتثال حسب المجال">
              <EmptyTable cols={5} rows={8} headers={['المجال', 'متطلبات', 'متحقق', 'النسبة %', 'الحالة']} />
            </Section>
            <Section title="المخالفات والملاحظات">
              <EmptyTable cols={4} rows={5} headers={['الملاحظة', 'المستوى', 'الإجراء التصحيحي', 'الموعد']} />
            </Section>
            <div style={fieldRow}><Field label="نسبة الامتثال الإجمالية" value={d.overallComplianceRate} w="20%" /></div>
            <SignatureBlock rightLabel="مسؤول الامتثال" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'governance-meeting-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="محضر اجتماع لجنة الحوكمة" subtitle="Governance Committee Meeting Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الاجتماع رقم" value={d.meetingNo} w="10%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="الرئيس" value={d.chair} w="25%" /></div>
            <Section title="الأعضاء الحاضرون">
              <EmptyTable cols={3} rows={6} headers={['الاسم', 'الصفة', 'التوقيع']} />
            </Section>
            <NotesBox label="جدول الأعمال" value={d.agenda} lines={3} />
            <Section title="القرارات">
              <EmptyTable cols={3} rows={5} headers={['القرار', 'المسؤول', 'الموعد']} />
            </Section>
            <div style={fieldRow}><Field label="الاجتماع القادم" value={formatDate(d.nextMeeting)} w="15%" /></div>
            <SignatureBlock rightLabel="الرئيس" leftLabel="أمين السر" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ الاستدامة والمسؤولية الاجتماعية ══════════════ */
    case 'sustainability-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير الاستدامة السنوي" subtitle="Annual Sustainability Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="العام" value={d.year} w="10%" /><Field label="المعد" value={d.preparer} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="مؤشرات الاستدامة">
              <EmptyTable cols={5} rows={6} headers={['المؤشر', 'الهدف', 'الفعلي', 'الفرق', 'الاتجاه']} />
            </Section>
            <Section title="المبادرات البيئية">
              <EmptyTable cols={4} rows={4} headers={['المبادرة', 'الحالة', 'الأثر', 'التكلفة']} />
            </Section>
            <NotesBox label="الإنجازات الرئيسية" value={d.achievements} lines={2} />
            <NotesBox label="الأهداف للعام القادم" value={d.nextYearGoals} lines={2} />
            <SignatureBlock rightLabel="مسؤول الاستدامة" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'carbon-footprint-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير البصمة الكربونية" subtitle="Carbon Footprint Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="20%" /><Field label="المنشأة" value={d.facility} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="مصادر الانبعاثات">
              <EmptyTable cols={5} rows={6} headers={['المصدر', 'النطاق', 'الكمية (طن CO₂)', 'النسبة %', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الانبعاثات" value={d.totalEmissions} w="20%" /><Field label="التغير عن العام السابق" value={d.yearChange} w="20%" /></div>
            <Section title="إجراءات التخفيض">
              <EmptyTable cols={3} rows={4} headers={['الإجراء', 'التخفيض المتوقع', 'الحالة']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول البيئة" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'csr-impact-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير أثر المسؤولية الاجتماعية" subtitle="CSR Impact Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="البرنامج" value={d.program} w="25%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="المسؤول" value={d.manager} w="25%" /></div>
            <Section title="المستفيدون">
              <EmptyTable cols={4} rows={4} headers={['الفئة', 'العدد', 'نوع الاستفادة', 'التأثير']} />
            </Section>
            <Section title="مؤشرات الأثر">
              <EmptyTable cols={4} rows={5} headers={['المؤشر', 'المستهدف', 'المتحقق', 'ملاحظات']} />
            </Section>
            <NotesBox label="الدروس المستفادة" value={d.lessonsLearned} lines={2} />
            <div style={fieldRow}><Field label="الميزانية المصروفة" value={d.budget} w="15%" /><Field label="التقييم العام" value={d.overallRating} w="15%" /></div>
            <SignatureBlock rightLabel="مدير البرنامج" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ إدارة خدمات تقنية المعلومات ══════════════ */
    case 'it-service-request-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج طلب خدمة تقنية" subtitle="IT Service Request Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="مقدم الطلب" value={d.requester} w="25%" /><Field label="القسم" value={d.department} w="20%" /><Field label="الأولوية" value={d.priority} w="12%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <div style={fieldRow}><Field label="نوع الطلب" value={d.requestType} w="20%" /><Field label="الفئة" value={d.category} w="15%" /></div>
            <NotesBox label="وصف الطلب" value={d.description} lines={3} />
            <NotesBox label="التأثير على العمل" value={d.businessImpact} lines={2} />
            <Section title="المتابعة">
              <EmptyTable cols={4} rows={4} headers={['التاريخ', 'الإجراء', 'المسؤول', 'الحالة']} />
            </Section>
            <SignatureBlock rightLabel="مقدم الطلب" leftLabel="مدير تقنية المعلومات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'it-change-management':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج إدارة التغيير التقني" subtitle="IT Change Management Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="عنوان التغيير" value={d.changeTitle} w="30%" /><Field label="النوع" value={d.changeType} w="15%" /><Field label="الأولوية" value={d.priority} w="12%" /><Field label="مقدم الطلب" value={d.requester} w="25%" /></div>
            <NotesBox label="وصف التغيير" value={d.description} lines={2} />
            <NotesBox label="المبرر" value={d.justification} lines={2} />
            <NotesBox label="تحليل المخاطر" value={d.riskAnalysis} lines={2} />
            <NotesBox label="خطة التراجع (Rollback)" value={d.rollbackPlan} lines={2} />
            <Section title="الموافقات">
              <EmptyTable cols={4} rows={4} headers={['المعتمد', 'الدور', 'القرار', 'التاريخ']} />
            </Section>
            <div style={fieldRow}><Field label="تاريخ التنفيذ" value={formatDate(d.implementationDate)} w="15%" /><Field label="نافذة الصيانة" value={d.maintenanceWindow} w="20%" /></div>
            <SignatureBlock rightLabel="مقدم الطلب" leftLabel="لجنة التغيير (CAB)" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'it-asset-register-print':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل الأصول التقنية" subtitle="IT Asset Register" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم" value={d.department} w="20%" /><Field label="تاريخ الطباعة" value={today()} w="15%" /><Field label="المسؤول" value={d.manager} w="25%" /></div>
            <Section title="الأصول التقنية">
              <EmptyTable cols={7} rows={12} headers={['الرقم', 'النوع', 'الموديل', 'الرقم التسلسلي', 'المستخدم', 'الموقع', 'الحالة']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الأصول" value={d.totalAssets} w="15%" /><Field label="نشطة" value={d.activeAssets} w="10%" /><Field label="متقاعدة" value={d.retiredAssets} w="10%" /></div>
            <SignatureBlock rightLabel="مسؤول الأصول" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'it-incident-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حادث تقني" subtitle="IT Incident Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="نوع الحادث" value={d.incidentType} w="15%" /><Field label="الخطورة" value={d.severity} w="12%" /><Field label="المبلّغ" value={d.reporter} w="20%" /><Field label="وقت الاكتشاف" value={d.discoveryTime} w="15%" /></div>
            <NotesBox label="وصف الحادث" value={d.description} lines={2} />
            <NotesBox label="التأثير" value={d.impact} lines={2} />
            <Section title="الجدول الزمني">
              <EmptyTable cols={3} rows={6} headers={['الوقت', 'الإجراء', 'المسؤول']} />
            </Section>
            <NotesBox label="السبب الجذري" value={d.rootCause} lines={2} />
            <NotesBox label="الحل المطبق" value={d.resolution} lines={2} />
            <Section title="إجراءات وقائية">
              <EmptyTable cols={3} rows={3} headers={['الإجراء', 'المسؤول', 'الموعد']} />
            </Section>
            <SignatureBlock rightLabel="مدير الحادث" leftLabel="مدير الأمن التقني" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ إدارة الموردين ══════════════ */
    case 'vendor-performance-scorecard':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بطاقة تقييم أداء المورد" subtitle="Vendor Performance Scorecard" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المورد" value={d.vendor} w="25%" /><Field label="فئة التوريد" value={d.category} w="15%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="المقيِّم" value={d.evaluator} w="20%" /></div>
            <Section title="معايير التقييم">
              <EmptyTable cols={5} rows={8} headers={['المعيار', 'الوزن %', 'الدرجة (1-10)', 'الدرجة الموزونة', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="الدرجة الإجمالية" value={d.totalScore} w="15%" /><Field label="التصنيف" value={d.rating} w="15%" /><Field label="التوصية" value={d.recommendation} w="25%" /></div>
            <NotesBox label="نقاط القوة" value={d.strengths} lines={2} />
            <NotesBox label="نقاط الضعف" value={d.weaknesses} lines={2} />
            <SignatureBlock rightLabel="المقيِّم" leftLabel="مدير المشتريات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'vendor-audit-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تدقيق المورد" subtitle="Vendor Audit Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المورد" value={d.vendor} w="25%" /><Field label="الموقع" value={d.location} w="20%" /><Field label="المدقق" value={d.auditor} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="نتائج التدقيق">
              <EmptyTable cols={4} rows={8} headers={['المجال', 'الملاحظة', 'المستوى', 'الإجراء التصحيحي']} />
            </Section>
            <div style={fieldRow}><Field label="عدد الملاحظات" value={d.findingsCount} w="15%" /><Field label="حرجة" value={d.critical} w="10%" /><Field label="رئيسية" value={d.major} w="10%" /><Field label="ثانوية" value={d.minor} w="10%" /></div>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <div style={fieldRow}><Field label="القرار" value={d.auditDecision} w="20%" /></div>
            <SignatureBlock rightLabel="المدقق" leftLabel="مدير الجودة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'vendor-onboarding-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تأهيل مورد جديد" subtitle="Vendor Onboarding Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="اسم المورد" value={d.vendorName} w="25%" /><Field label="السجل التجاري" value={d.crNumber} w="15%" /><Field label="الرقم الضريبي" value={d.vatNumber} w="15%" /></div>
            <div style={fieldRow}><Field label="العنوان" value={d.address} w="30%" /><Field label="المسؤول" value={d.contactPerson} w="20%" /><Field label="الهاتف" value={d.phone} w="15%" /></div>
            <div style={fieldRow}><Field label="البريد" value={d.email} w="20%" /><Field label="IBAN" value={d.iban} w="20%" /><Field label="فئة التوريد" value={d.category} w="15%" /></div>
            <Section title="قائمة المتطلبات">
              <EmptyTable cols={3} rows={8} headers={['المتطلب', 'مرفق', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات إضافية" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مسؤول المشتريات" leftLabel="المورد" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ رعاية متكاملة متقدمة ══════════════ */
    case 'integrated-care-pathway':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مسار الرعاية المتكاملة" subtitle="Integrated Care Pathway" />
          <ConfidentialBanner />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="التشخيص" value={d.diagnosis} w="20%" /><Field label="المنسق" value={d.coordinator} w="20%" /><Field label="تاريخ البدء" value={formatDate(d.startDate)} w="15%" /></div>
            <Section title="مراحل المسار">
              <EmptyTable cols={5} rows={6} headers={['المرحلة', 'الهدف', 'الخدمات', 'المدة', 'معيار الانتقال']} />
            </Section>
            <Section title="الفريق متعدد التخصصات">
              <EmptyTable cols={4} rows={5} headers={['التخصص', 'الاسم', 'الدور', 'التكرار']} />
            </Section>
            <NotesBox label="مؤشرات النتائج المتوقعة" value={d.outcomeIndicators} lines={2} />
            <SignatureBlock rightLabel="المنسق" leftLabel="الطبيب المسؤول" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'care-coordination-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص تنسيق الرعاية" subtitle="Care Coordination Summary" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="25%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="المنسق" value={d.coordinator} w="25%" /></div>
            <Section title="الخدمات المقدمة">
              <EmptyTable cols={5} rows={8} headers={['الخدمة', 'المقدم', 'عدد الجلسات', 'التقدم', 'ملاحظات']} />
            </Section>
            <Section title="اجتماعات التنسيق">
              <EmptyTable cols={4} rows={4} headers={['التاريخ', 'الحاضرون', 'القرارات', 'المتابعة']} />
            </Section>
            <NotesBox label="التحديات" value={d.challenges} lines={2} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="منسق الرعاية" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'quality-improvement-project':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مشروع تحسين الجودة المستمرة" subtitle="Quality Improvement Project (QI)" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="عنوان المشروع" value={d.projectTitle} w="30%" /><Field label="القسم" value={d.department} w="15%" /><Field label="قائد المشروع" value={d.projectLead} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <NotesBox label="بيان المشكلة" value={d.problemStatement} lines={2} />
            <NotesBox label="الهدف" value={d.goal} lines={1} />
            <Section title="منهجية PDCA">
              <EmptyTable cols={2} rows={4} headers={['المرحلة', 'التفاصيل']} />
            </Section>
            <Section title="المؤشرات">
              <EmptyTable cols={4} rows={4} headers={['المؤشر', 'القياس الأساسي', 'الهدف', 'القياس النهائي']} />
            </Section>
            <NotesBox label="النتائج" value={d.results} lines={2} />
            <NotesBox label="الدروس المستفادة" value={d.lessonsLearned} lines={2} />
            <SignatureBlock rightLabel="قائد المشروع" leftLabel="مدير الجودة" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
