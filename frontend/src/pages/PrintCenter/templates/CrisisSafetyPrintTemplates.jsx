/**
 * قوالب إدارة الأزمات والمخاطر والدفاع المدني
 * Crisis Management, Risk & Civil Defense Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const CRISIS_SAFETY_TEMPLATES = [
  /* ── إدارة المخاطر المتقدمة ── */
  { id: 'risk-register-detailed', name: 'سجل المخاطر التفصيلي', nameEn: 'Detailed Risk Register', desc: 'سجل مخاطر تفصيلي شامل', color: '#b71c1c' },
  { id: 'risk-heatmap-report', name: 'تقرير خريطة المخاطر', nameEn: 'Risk Heatmap Report', desc: 'خريطة حرارية لتصنيف المخاطر', color: '#c62828' },
  { id: 'risk-mitigation-plan', name: 'خطة التخفيف من المخاطر', nameEn: 'Risk Mitigation Plan', desc: 'خطة تخفيف وإدارة المخاطر', color: '#d32f2f' },
  { id: 'risk-appetite-statement', name: 'بيان تقبل المخاطر', nameEn: 'Risk Appetite Statement', desc: 'بيان مستوى تقبل المخاطر المؤسسي', color: '#e53935' },
  { id: 'enterprise-risk-summary', name: 'ملخص مخاطر المؤسسة', nameEn: 'Enterprise Risk Summary', desc: 'ملخص مخاطر المؤسسة الشامل', color: '#f44336' },
  { id: 'risk-incident-log', name: 'سجل حوادث المخاطر', nameEn: 'Risk Incident Log', desc: 'سجل حوادث ووقائع المخاطر', color: '#ef5350' },
  /* ── إدارة الأزمات ── */
  { id: 'crisis-incident-report', name: 'تقرير حادثة أزمة', nameEn: 'Crisis Incident Report', desc: 'تقرير تفصيلي عن حادثة أزمة', color: '#e65100' },
  { id: 'emergency-response-plan', name: 'خطة الاستجابة للطوارئ', nameEn: 'Emergency Response Plan', desc: 'خطة شاملة للاستجابة للطوارئ', color: '#ef6c00' },
  { id: 'crisis-communication-plan', name: 'خطة التواصل في الأزمات', nameEn: 'Crisis Communication Plan', desc: 'خطة التواصل أثناء الأزمات', color: '#f57c00' },
  { id: 'after-action-report', name: 'تقرير ما بعد الأزمة', nameEn: 'After Action Report', desc: 'تقرير الدروس المستفادة بعد أزمة', color: '#fb8c00' },
  { id: 'crisis-contact-directory', name: 'دليل اتصالات الطوارئ', nameEn: 'Emergency Contact Directory', desc: 'دليل جهات الاتصال في الطوارئ', color: '#ff9800' },
  { id: 'crisis-drill-report', name: 'تقرير تمرين طوارئ', nameEn: 'Emergency Drill Report', desc: 'تقرير نتائج تمرين إخلاء/طوارئ', color: '#ffa726' },
  /* ── الدفاع المدني والسلامة ── */
  { id: 'evacuation-plan-print', name: 'خطة الإخلاء', nameEn: 'Evacuation Plan', desc: 'خطة الإخلاء في حالات الطوارئ', color: '#1b5e20' },
  { id: 'fire-drill-report', name: 'تقرير تمرين إطفاء', nameEn: 'Fire Drill Report', desc: 'تقرير تمرين الإطفاء والإخلاء', color: '#2e7d32' },
  { id: 'civil-defense-inspection', name: 'تقرير فحص الدفاع المدني', nameEn: 'Civil Defense Inspection', desc: 'تقرير فحص متطلبات الدفاع المدني', color: '#388e3c' },
  { id: 'safety-compliance-cert', name: 'شهادة الالتزام بالسلامة', nameEn: 'Safety Compliance Certificate', desc: 'شهادة التزام بمعايير السلامة', color: '#43a047' },
  { id: 'emergency-equipment-check', name: 'فحص معدات الطوارئ', nameEn: 'Emergency Equipment Check', desc: 'قائمة فحص معدات الطوارئ', color: '#4caf50' },
  { id: 'assembly-point-map', name: 'خريطة نقاط التجمع', nameEn: 'Assembly Point Map', desc: 'خريطة نقاط التجمع في الطوارئ', color: '#66bb6a' },
];

export const CrisisSafetyTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    /* ══════════════ المخاطر المتقدمة ══════════════ */
    case 'risk-register-detailed':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل المخاطر التفصيلي" subtitle="Detailed Risk Register" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم/البرنامج" value={d.department} w="25%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="المسؤول" value={d.owner} w="25%" /><Field label="آخر تحديث" value={formatDate(d.lastUpdate) || today()} w="15%" /></div>
            <Section title="سجل المخاطر">
              <EmptyTable cols={8} rows={10} headers={['#', 'وصف المخاطرة', 'الفئة', 'الاحتمال', 'الأثر', 'الدرجة', 'الاستراتيجية', 'المسؤول']} />
            </Section>
            <Section title="ملخص التصنيفات">
              <EmptyTable cols={4} rows={4} headers={['التصنيف', 'العدد', 'النسبة', 'التغيير عن الفترة السابقة']} />
            </Section>
            <NotesBox label="التوصيات العامة" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مسؤول المخاطر" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'risk-heatmap-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير خريطة المخاطر الحرارية" subtitle="Risk Heatmap Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الجهة" value={d.entity} w="25%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="إجمالي المخاطر" value={d.totalRisks} w="15%" /></div>
            <Section title="التوزيع حسب الاحتمال والأثر">
              <EmptyTable cols={6} rows={6} headers={['', 'أثر (1)', 'أثر (2)', 'أثر (3)', 'أثر (4)', 'أثر (5)']} />
            </Section>
            <Section title="أعلى 10 مخاطر">
              <EmptyTable cols={5} rows={10} headers={['#', 'المخاطرة', 'الدرجة', 'الاتجاه', 'الإجراء']} />
            </Section>
            <NotesBox label="التحليل" value={d.analysis} lines={2} />
            <SignatureBlock rightLabel="مسؤول المخاطر" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'risk-mitigation-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة التخفيف من المخاطر" subtitle="Risk Mitigation Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المخاطرة" value={d.riskTitle} w="30%" /><Field label="رقم المخاطرة" value={d.riskId} w="15%" /><Field label="الدرجة" value={d.riskScore} w="12%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <NotesBox label="وصف المخاطرة" value={d.riskDescription} lines={2} />
            <div style={fieldRow}><Field label="الاستراتيجية" value={d.strategy} w="20%" /><Field label="المسؤول" value={d.owner} w="25%" /></div>
            <Section title="إجراءات التخفيف">
              <EmptyTable cols={5} rows={6} headers={['الإجراء', 'المسؤول', 'الموعد', 'التكلفة', 'الحالة']} />
            </Section>
            <Section title="مؤشرات المراقبة">
              <EmptyTable cols={4} rows={4} headers={['المؤشر', 'الحد المقبول', 'القيمة الحالية', 'الحالة']} />
            </Section>
            <SignatureBlock rightLabel="مالك المخاطرة" leftLabel="مسؤول إدارة المخاطر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'risk-appetite-statement':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بيان مستوى تقبل المخاطر المؤسسي" subtitle="Risk Appetite Statement" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="تاريخ الاعتماد" value={formatDate(d.approvalDate)} w="15%" /><Field label="الإصدار" value={d.version} w="10%" /><Field label="المراجعة القادمة" value={formatDate(d.nextReview)} w="15%" /></div>
            <NotesBox label="الرسالة العامة" value={d.generalStatement} lines={3} />
            <Section title="مستويات التقبل حسب الفئة">
              <EmptyTable cols={5} rows={6} headers={['فئة المخاطرة', 'منخفض', 'متوسط', 'مرتفع', 'ملاحظات']} />
            </Section>
            <NotesBox label="الحدود غير المقبولة" value={d.unacceptableLimits} lines={2} />
            <SignatureBlock rightLabel="مجلس الإدارة" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'enterprise-risk-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص مخاطر المؤسسة الشامل" subtitle="Enterprise Risk Summary" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="إجمالي المخاطر" value={d.totalRisks} w="12%" /><Field label="جديدة" value={d.newRisks} w="10%" /><Field label="مغلقة" value={d.closedRisks} w="10%" /></div>
            <Section title="توزيع المخاطر حسب الفئة">
              <EmptyTable cols={5} rows={6} headers={['الفئة', 'حرجة', 'عالية', 'متوسطة', 'منخفضة']} />
            </Section>
            <Section title="المخاطر الحرجة">
              <EmptyTable cols={4} rows={5} headers={['المخاطرة', 'المالك', 'الإجراء', 'الحالة']} />
            </Section>
            <NotesBox label="الاتجاه العام" value={d.trend} lines={2} />
            <SignatureBlock rightLabel="مسؤول المخاطر" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'risk-incident-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل حوادث ووقائع المخاطر" subtitle="Risk Incident Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="إجمالي الحوادث" value={d.totalIncidents} w="15%" /></div>
            <Section title="الحوادث">
              <EmptyTable cols={7} rows={12} headers={['التاريخ', 'الحادثة', 'الموقع', 'الخطورة', 'المخاطرة المرتبطة', 'الإجراء', 'الحالة']} />
            </Section>
            <NotesBox label="الدروس المستفادة" value={d.lessonsLearned} lines={2} />
            <SignatureBlock rightLabel="مسؤول الحوادث" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ إدارة الأزمات ══════════════ */
    case 'crisis-incident-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حادثة أزمة" subtitle="Crisis Incident Report" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="نوع الأزمة" value={d.crisisType} w="25%" /><Field label="تاريخ البدء" value={formatDate(d.startDate)} w="15%" /><Field label="تاريخ الانتهاء" value={formatDate(d.endDate)} w="15%" /><Field label="الخطورة" value={d.severity} w="12%" /></div>
            <div style={fieldRow}><Field label="الموقع" value={d.location} w="25%" /><Field label="عدد المتأثرين" value={d.affectedCount} w="15%" /><Field label="المبلّغ" value={d.reporter} w="25%" /></div>
            <NotesBox label="وصف الحادثة" value={d.description} lines={3} />
            <Section title="الإجراءات المتخذة">
              <EmptyTable cols={4} rows={6} headers={['الإجراء', 'الوقت', 'المنفذ', 'النتيجة']} />
            </Section>
            <NotesBox label="الأضرار" value={d.damages} lines={2} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مدير الأزمة" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'emergency-response-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة الاستجابة الشاملة للطوارئ" subtitle="Comprehensive Emergency Response Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الإصدار" value={d.version} w="10%" /><Field label="تاريخ الاعتماد" value={formatDate(d.approvalDate)} w="15%" /><Field label="المراجعة القادمة" value={formatDate(d.nextReview)} w="15%" /></div>
            <Section title="أنواع الطوارئ والاستجابة">
              <EmptyTable cols={5} rows={8} headers={['نوع الطوارئ', 'مستوى الخطورة', 'الاستجابة الأولية', 'فريق الاستجابة', 'التصعيد']} />
            </Section>
            <Section title="هيكل فريق الطوارئ">
              <EmptyTable cols={4} rows={6} headers={['الدور', 'الأساسي', 'البديل', 'التواصل']} />
            </Section>
            <Section title="الموارد المطلوبة">
              <EmptyTable cols={4} rows={5} headers={['المورد', 'الموقع', 'الكمية', 'الحالة']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول الطوارئ" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'crisis-communication-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة التواصل أثناء الأزمات" subtitle="Crisis Communication Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="نوع الأزمة" value={d.crisisType} w="25%" /><Field label="المتحدث الرسمي" value={d.spokesperson} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="الرسائل الرئيسية">
              <EmptyTable cols={3} rows={5} headers={['الجمهور المستهدف', 'الرسالة الرئيسية', 'القناة']} />
            </Section>
            <Section title="جدول التواصل">
              <EmptyTable cols={5} rows={6} headers={['الوقت', 'الإجراء', 'الجهة', 'القناة', 'المسؤول']} />
            </Section>
            <NotesBox label="الخطوط الحمراء (ما لا يجب ذكره)" value={d.restrictions} lines={2} />
            <SignatureBlock rightLabel="مسؤول الاتصال المؤسسي" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'after-action-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير ما بعد الأزمة — الدروس المستفادة" subtitle="After Action Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الحادثة" value={d.incident} w="30%" /><Field label="التاريخ" value={formatDate(d.date)} w="15%" /><Field label="المعد" value={d.preparedBy} w="25%" /></div>
            <NotesBox label="ملخص الحادثة" value={d.summary} lines={2} />
            <Section title="الاستجابة — ما نجح">
              <EmptyTable cols={3} rows={4} headers={['الجانب', 'ما نجح', 'السبب']} />
            </Section>
            <Section title="فرص التحسين">
              <EmptyTable cols={4} rows={4} headers={['الجانب', 'الفجوة', 'الإجراء المقترح', 'المسؤول']} />
            </Section>
            <Section title="التوصيات">
              <EmptyTable cols={3} rows={4} headers={['التوصية', 'الأولوية', 'الموعد']} />
            </Section>
            <SignatureBlock rightLabel="رئيس فريق المراجعة" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'crisis-contact-directory':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="دليل اتصالات الطوارئ" subtitle="Emergency Contact Directory" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="آخر تحديث" value={formatDate(d.lastUpdate) || today()} w="15%" /><Field label="الإصدار" value={d.version} w="10%" /></div>
            <Section title="جهات الاتصال الداخلية">
              <EmptyTable cols={5} rows={8} headers={['الدور', 'الاسم', 'الهاتف', 'البريد', 'البديل']} />
            </Section>
            <Section title="الجهات الخارجية">
              <EmptyTable cols={4} rows={8} headers={['الجهة', 'رقم الطوارئ', 'الهاتف العام', 'ملاحظات']} />
            </Section>
          </div>
          <OrgFooter />
        </div>
      );

    case 'crisis-drill-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تمرين الطوارئ" subtitle="Emergency Drill Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="نوع التمرين" value={d.drillType} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="المدة" value={d.duration} w="12%" /><Field label="المشاركون" value={d.participants} w="15%" /></div>
            <div style={fieldRow}><Field label="الموقع" value={d.location} w="25%" /><Field label="المشرف" value={d.supervisor} w="25%" /></div>
            <Section title="السيناريو والاستجابة">
              <EmptyTable cols={4} rows={6} headers={['المرحلة', 'المتوقع', 'الفعلي', 'التقييم']} />
            </Section>
            <div style={fieldRow}><Field label="وقت الإخلاء" value={d.evacuationTime} w="15%" /><Field label="التقييم العام" value={d.overallRating} w="15%" /></div>
            <NotesBox label="الملاحظات" value={d.observations} lines={2} />
            <NotesBox label="التحسينات المطلوبة" value={d.improvements} lines={2} />
            <SignatureBlock rightLabel="مشرف التمرين" leftLabel="مسؤول السلامة" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ الدفاع المدني ══════════════ */
    case 'evacuation-plan-print':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة الإخلاء في حالات الطوارئ" subtitle="Emergency Evacuation Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المبنى" value={d.building} w="25%" /><Field label="الطابق" value={d.floor} w="12%" /><Field label="السعة" value={d.capacity} w="12%" /><Field label="آخر تحديث" value={formatDate(d.lastUpdate) || today()} w="15%" /></div>
            <Section title="مسارات الإخلاء">
              <EmptyTable cols={4} rows={6} headers={['المنطقة', 'المسار الرئيسي', 'المسار البديل', 'المسؤول']} />
            </Section>
            <Section title="نقاط التجمع">
              <EmptyTable cols={4} rows={4} headers={['النقطة', 'الموقع', 'السعة', 'المسؤول']} />
            </Section>
            <NotesBox label="تعليمات عامة" value={d.instructions} lines={3} />
            <SignatureBlock rightLabel="مسؤول السلامة" leftLabel="مدير المنشأة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'fire-drill-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تمرين الإطفاء والإخلاء" subtitle="Fire Drill Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="الوقت" value={d.time} w="10%" /><Field label="المبنى" value={d.building} w="20%" /><Field label="المشرف" value={d.supervisor} w="25%" /></div>
            <div style={fieldRow}><Field label="عدد المشاركين" value={d.participantCount} w="15%" /><Field label="زمن الإخلاء" value={d.evacuationTime} w="15%" /><Field label="الهدف" value={d.target} w="15%" /></div>
            <Section title="التقييم">
              <EmptyTable cols={4} rows={6} headers={['البند', 'ممتاز', 'جيد', 'يحتاج تحسين']} />
            </Section>
            <NotesBox label="الملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مشرف التمرين" leftLabel="مسؤول الدفاع المدني" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'civil-defense-inspection':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير فحص متطلبات الدفاع المدني" subtitle="Civil Defense Inspection Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المنشأة" value={d.facility} w="25%" /><Field label="المفتش" value={d.inspector} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="قائمة الفحص">
              <EmptyTable cols={5} rows={15} headers={['البند', 'المعيار', 'مطابق', 'غير مطابق', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="النتيجة العامة" value={d.overallResult} w="20%" /><Field label="عدد المخالفات" value={d.violations} w="15%" /></div>
            <NotesBox label="المخالفات والملاحظات" value={d.violationDetails} lines={3} />
            <NotesBox label="الإجراءات التصحيحية المطلوبة" value={d.correctiveActions} lines={2} />
            <SignatureBlock rightLabel="المفتش" leftLabel="مسؤول المنشأة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'safety-compliance-cert':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة الالتزام بمعايير السلامة" subtitle="Safety Compliance Certificate" />
          <div style={bodyPad}>
            <div style={{ border: '3px double #1b5e20', borderRadius: 10, padding: 25, margin: '20px 0', textAlign: 'center' }}>
              <h2 style={{ color: '#1b5e20', marginBottom: 20 }}>شهادة التزام بالسلامة</h2>
              <div style={fieldRow}><Field label="رقم الشهادة" value={d.certNo} w="25%" /><Field label="تاريخ الإصدار" value={formatDate(d.issueDate) || today()} w="15%" /></div>
              <div style={fieldRow}><Field label="المنشأة" value={d.facility} w="30%" /><Field label="الموقع" value={d.location} w="25%" /></div>
              <div style={fieldRow}><Field label="المعيار المرجعي" value={d.standard} w="30%" /><Field label="مستوى الامتثال" value={d.complianceLevel} w="20%" /></div>
              <div style={fieldRow}><Field label="صالحة حتى" value={formatDate(d.validUntil)} w="15%" /></div>
            </div>
            <SignatureBlock rightLabel="هيئة الفحص" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'emergency-equipment-check':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="فحص معدات الطوارئ" subtitle="Emergency Equipment Checklist" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المبنى" value={d.building} w="20%" /><Field label="الطابق" value={d.floor} w="10%" /><Field label="المفتش" value={d.inspector} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="طفايات الحريق">
              <EmptyTable cols={5} rows={6} headers={['الرقم', 'الموقع', 'النوع', 'تاريخ الصلاحية', 'الحالة']} />
            </Section>
            <Section title="معدات أخرى">
              <EmptyTable cols={5} rows={6} headers={['المعدة', 'الموقع', 'الكمية', 'الحالة', 'ملاحظات']} />
            </Section>
            <NotesBox label="معدات تحتاج استبدال/صيانة" value={d.requiresMaintenance} lines={2} />
            <SignatureBlock rightLabel="المفتش" leftLabel="مسؤول السلامة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'assembly-point-map':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خريطة نقاط التجمع في الطوارئ" subtitle="Emergency Assembly Point Map" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المنشأة" value={d.facility} w="25%" /><Field label="آخر تحديث" value={formatDate(d.lastUpdate) || today()} w="15%" /><Field label="الإصدار" value={d.version} w="10%" /></div>
            <Section title="نقاط التجمع">
              <EmptyTable cols={6} rows={6} headers={['رمز النقطة', 'الاسم', 'الموقع', 'السعة', 'المسؤول', 'المناطق المخصصة']} />
            </Section>
            <div style={{ border: '1px dashed #666', borderRadius: 8, height: 200, margin: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#999' }}>[مساحة مخصصة للخريطة]</span>
            </div>
            <NotesBox label="تعليمات الوصول لنقاط التجمع" value={d.instructions} lines={3} />
            <SignatureBlock rightLabel="مسؤول السلامة" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
