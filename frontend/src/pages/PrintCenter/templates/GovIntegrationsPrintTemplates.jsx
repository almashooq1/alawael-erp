/**
 * قوالب التكامل الحكومي وإنترنت الأشياء — Government Integrations & IoT Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const GOV_IOT_TEMPLATES = [
  /* ── التكامل الحكومي ── */
  { id: 'gosi-report', name: 'تقرير GOSI', nameEn: 'GOSI Report', desc: 'تقرير التأمينات الاجتماعية', color: '#1b5e20' },
  { id: 'mudad-payroll', name: 'تقرير مُدد للرواتب', nameEn: 'Mudad Payroll Report', desc: 'تقرير الرواتب لمنصة مُدد', color: '#2e7d32' },
  { id: 'qiwa-compliance', name: 'امتثال منصة قوى', nameEn: 'Qiwa Compliance', desc: 'تقرير الامتثال لمنصة قوى', color: '#388e3c' },
  { id: 'taqat-employment', name: 'تقرير طاقات', nameEn: 'Taqat Employment Report', desc: 'تقرير التوظيف لمنصة طاقات', color: '#43a047' },
  { id: 'noor-student', name: 'تقرير نظام نور', nameEn: 'Noor Student Report', desc: 'تقرير الطلاب من نظام نور', color: '#4caf50' },
  { id: 'absher-letter', name: 'خطاب أبشر', nameEn: 'Absher Letter', desc: 'نموذج خطاب لمنصة أبشر', color: '#66bb6a' },
  { id: 'zakat-report', name: 'تقرير الزكاة والضريبة', nameEn: 'ZATCA Report', desc: 'تقرير هيئة الزكاة والضريبة', color: '#81c784' },
  { id: 'mol-saudization', name: 'تقرير التوطين', nameEn: 'Saudization Report', desc: 'تقرير نسبة التوطين لوزارة العمل', color: '#a5d6a7' },
  { id: 'hrdf-claim', name: 'مطالبة هدف', nameEn: 'HRDF Claim', desc: 'نموذج مطالبة صندوق هدف', color: '#c8e6c9' },
  { id: 'gov-correspondence', name: 'مراسلة حكومية', nameEn: 'Government Correspondence', desc: 'نموذج مراسلة جهة حكومية', color: '#00695c' },
  { id: 'license-renewal', name: 'تجديد ترخيص', nameEn: 'License Renewal', desc: 'طلب تجديد ترخيص حكومي', color: '#00796b' },
  { id: 'gov-audit-response', name: 'رد على تدقيق حكومي', nameEn: 'Gov Audit Response', desc: 'رد على ملاحظات التدقيق الحكومي', color: '#00897b' },
  /* ── إنترنت الأشياء والتتبع ── */
  { id: 'iot-device-register', name: 'سجل أجهزة IoT', nameEn: 'IoT Device Register', desc: 'سجل أجهزة إنترنت الأشياء', color: '#e65100' },
  { id: 'gps-tracking-report', name: 'تقرير تتبع GPS', nameEn: 'GPS Tracking Report', desc: 'تقرير تتبع المركبات', color: '#ef6c00' },
  { id: 'bus-route-report', name: 'تقرير مسارات الحافلات', nameEn: 'Bus Route Report', desc: 'تقرير مسارات النقل', color: '#f57c00' },
  { id: 'sensor-alert-log', name: 'سجل تنبيهات المستشعرات', nameEn: 'Sensor Alert Log', desc: 'سجل تنبيهات المستشعرات', color: '#fb8c00' },
  { id: 'smart-building-report', name: 'تقرير المبنى الذكي', nameEn: 'Smart Building Report', desc: 'تقرير أنظمة المبنى الذكي', color: '#ff9800' },
  { id: 'energy-consumption', name: 'تقرير استهلاك الطاقة', nameEn: 'Energy Consumption Report', desc: 'تقرير استهلاك الطاقة والمياه', color: '#ffa726' },
];

export const GovIoTTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'gosi-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير التأمينات الاجتماعية GOSI" subtitle="GOSI Social Insurance Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="رقم المنشأة" value={d.establishmentNo} w="25%" /><Field label="عدد الموظفين" value={d.employeeCount} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="تفاصيل الاشتراكات">
              <EmptyTable cols={6} rows={5} headers={['الفئة', 'العدد', 'إجمالي الأجور', 'حصة المنشأة', 'حصة الموظف', 'الإجمالي']} />
            </Section>
            <Section title="الموظفون الجدد/المنتهين">
              <EmptyTable cols={5} rows={6} headers={['الاسم', 'رقم الهوية', 'نوع العملية', 'التاريخ', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'mudad-payroll':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير الرواتب لمنصة مُدد" subtitle="Mudad Payroll Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الشهر" value={d.month} w="20%" /><Field label="رقم المنشأة" value={d.establishmentNo} w="25%" /><Field label="عدد الموظفين" value={d.employeeCount} w="15%" /><Field label="إجمالي الرواتب" value={d.totalSalaries} w="25%" /></div>
            <Section title="تفاصيل الرواتب">
              <EmptyTable cols={6} rows={10} headers={['الاسم', 'رقم الهوية', 'IBAN', 'الراتب الأساسي', 'البدلات', 'الصافي']} />
            </Section>
            <div style={fieldRow}><Field label="حالة الرفع" value={d.uploadStatus} w="25%" /><Field label="تاريخ الرفع" value={formatDate(d.uploadDate)} w="20%" /></div>
            <SignatureBlock rightLabel="مسؤول الرواتب" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'qiwa-compliance':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير الامتثال لمنصة قوى" subtitle="Qiwa Compliance Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم المنشأة" value={d.establishmentNo} w="25%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="نسبة التوطين" value={d.saudizationRate} w="20%" /><Field label="النطاق" value={d.nitaqatColor} w="15%" /></div>
            <Section title="تفاصيل القوى العاملة">
              <EmptyTable cols={5} rows={4} headers={['الفئة', 'العدد', 'سعودي', 'غير سعودي', 'النسبة']} />
            </Section>
            <Section title="عقود العمل">
              <EmptyTable cols={5} rows={5} headers={['الموظف', 'نوع العقد', 'تاريخ الانتهاء', 'الحالة في قوى', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات الامتثال" value={d.complianceNotes} lines={2} />
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'taqat-employment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير التوظيف لمنصة طاقات" subtitle="Taqat Employment Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="الوظائف المعلنة" value={d.postedJobs} w="20%" /><Field label="المتقدمون" value={d.applicants} w="15%" /><Field label="التعيينات" value={d.hires} w="15%" /></div>
            <Section title="تفاصيل الوظائف المعلنة">
              <EmptyTable cols={5} rows={6} headers={['الوظيفة', 'العدد المطلوب', 'المتقدمون', 'المقبولون', 'الحالة']} />
            </Section>
            <Section title="برامج الدعم">
              <EmptyTable cols={4} rows={4} headers={['البرنامج', 'العدد', 'المبلغ', 'الحالة']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول التوظيف" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'noor-student':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير الطلاب من نظام نور" subtitle="Noor Student Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المدرسة/البرنامج" value={d.school} w="35%" /><Field label="الفصل الدراسي" value={d.semester} w="20%" /><Field label="عدد الطلاب" value={d.studentCount} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="بيانات الطلاب">
              <EmptyTable cols={6} rows={10} headers={['الاسم', 'رقم الهوية', 'الصف', 'الحضور %', 'الدرجات', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات عامة" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="المعلم المسؤول" leftLabel="مدير البرنامج" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'absher-letter':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطاب موجه لمنصة أبشر" subtitle="Absher Official Letter" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={{ lineHeight: 2.2, margin: '20px 0' }}>
              <p>المكرم / الجهة المعنية في منصة أبشر&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;حفظهم الله</p>
              <p>السلام عليكم ورحمة الله وبركاته،</p>
              <p>نفيدكم بأن <strong>{d.employeeName || '____________________'}</strong> يحمل هوية رقم <strong>{d.idNo || '________'}</strong> يعمل لدى مركز الأوائل لتأهيل ذوي الإعاقة بمسمى <strong>{d.position || '________'}</strong>.</p>
              <p>نأمل التكرم بالموافقة على طلبه بخصوص: <strong>{d.requestDetails || '____________________'}</strong></p>
            </div>
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'zakat-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير الزكاة والضريبة ZATCA" subtitle="ZATCA Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="رقم المنشأة" value={d.taxNo} w="25%" /><Field label="نوع الإقرار" value={d.declarationType} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="تفاصيل الإقرار">
              <EmptyTable cols={4} rows={8} headers={['البند', 'المبلغ الخاضع', 'نسبة الضريبة', 'الضريبة المستحقة']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الضريبة" value={d.totalTax} w="25%" /><Field label="حالة السداد" value={d.paymentStatus} w="20%" /></div>
            <SignatureBlock rightLabel="المدير المالي" leftLabel="المراجع" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'mol-saudization':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير نسبة التوطين" subtitle="Saudization Report (MoL)" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="20%" /><Field label="النطاق الحالي" value={d.currentBand} w="15%" /><Field label="نسبة التوطين" value={d.saudizationRate} w="15%" /><Field label="المطلوب" value={d.requiredRate} w="15%" /><Field label="الفارق" value={d.gap} w="15%" /></div>
            <Section title="القوى العاملة حسب الجنسية">
              <EmptyTable cols={5} rows={4} headers={['القسم', 'سعودي', 'غير سعودي', 'الإجمالي', 'النسبة %']} />
            </Section>
            <NotesBox label="خطة تحسين التوطين" value={d.improvementPlan} lines={3} />
            <SignatureBlock rightLabel="مدير الموارد البشرية" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'hrdf-claim':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مطالبة صندوق هدف HRDF" subtitle="HRDF Support Claim" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="البرنامج" value={d.program} w="30%" /><Field label="رقم الطلب" value={d.claimNo} w="15%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="عدد المستفيدين" value={d.beneficiaryCount} w="20%" /></div>
            <Section title="تفاصيل المطالبة">
              <EmptyTable cols={5} rows={6} headers={['الموظف', 'البرنامج', 'المبلغ', 'فترة الدعم', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي المطالبة" value={d.totalClaim} w="25%" /><Field label="حالة المطالبة" value={d.status} w="20%" /></div>
            <SignatureBlock rightLabel="مسؤول هدف" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'gov-correspondence':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مراسلة جهة حكومية" subtitle="Government Correspondence" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الجهة" value={d.govEntity} w="35%" /><Field label="نوع المراسلة" value={d.correspondenceType} w="20%" /><Field label="الأولوية" value={d.priority} w="15%" /></div>
            <NotesBox label="الموضوع" value={d.subject} lines={1} />
            <NotesBox label="المحتوى" value={d.content} lines={6} />
            <NotesBox label="المرفقات" value={d.attachments} lines={1} />
            <SignatureBlock rightLabel="المدير العام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'license-renewal':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="طلب تجديد ترخيص حكومي" subtitle="Government License Renewal" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="نوع الترخيص" value={d.licenseType} w="30%" /><Field label="رقم الترخيص" value={d.licenseNo} w="20%" /><Field label="الجهة المصدرة" value={d.issuer} w="25%" /><Field label="تاريخ الانتهاء" value={formatDate(d.expiryDate)} w="20%" /></div>
            <NotesBox label="المتطلبات" value={d.requirements} lines={2} />
            <Section title="المستندات المرفقة">
              <EmptyTable cols={3} rows={5} headers={['المستند', 'متوفر', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مقدم الطلب" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'gov-audit-response':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="رد على ملاحظات التدقيق الحكومي" subtitle="Government Audit Response" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الجهة المدققة" value={d.auditEntity} w="30%" /><Field label="رقم الزيارة" value={d.visitNo} w="15%" /><Field label="التاريخ" value={formatDate(d.auditDate)} w="15%" /><Field label="عدد الملاحظات" value={d.findingCount} w="15%" /></div>
            <Section title="الملاحظات والردود">
              <EmptyTable cols={5} rows={8} headers={['الملاحظة', 'الأولوية', 'الإجراء التصحيحي', 'المسؤول', 'الموعد']} />
            </Section>
            <NotesBox label="ملاحظات عامة" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مسؤول الجودة" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ IoT / GPS ══════════════ */
    case 'iot-device-register':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل أجهزة إنترنت الأشياء" subtitle="IoT Device Register" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="المسؤول" value={d.responsible} w="25%" /><Field label="إجمالي الأجهزة" value={d.totalDevices} w="15%" /><Field label="فعّالة" value={d.activeDevices} w="15%" /></div>
            <Section title="سجل الأجهزة">
              <EmptyTable cols={7} rows={10} headers={['الجهاز', 'الرقم التسلسلي', 'النوع', 'الموقع', 'الحالة', 'آخر اتصال', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول IoT" leftLabel="مدير تقنية المعلومات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'gps-tracking-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تتبع المركبات GPS" subtitle="GPS Vehicle Tracking Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المركبة" value={d.vehicleNo} w="20%" /><Field label="السائق" value={d.driver} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="إجمالي المسافة" value={d.totalDistance} w="20%" /></div>
            <Section title="سجل المسارات">
              <EmptyTable cols={6} rows={8} headers={['الوقت', 'الموقع', 'السرعة', 'الحالة', 'المدة', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="وقت التشغيل" value={d.runningTime} w="20%" /><Field label="وقت التوقف" value={d.idleTime} w="20%" /><Field label="المخالفات" value={d.violations} w="20%" /></div>
            <SignatureBlock rightLabel="مسؤول التتبع" leftLabel="مدير النقل" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'bus-route-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير مسارات النقل" subtitle="Bus Route Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المسار" value={d.routeName} w="25%" /><Field label="الحافلة" value={d.busNo} w="15%" /><Field label="السائق" value={d.driver} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="الركاب" value={d.passengerCount} w="10%" /></div>
            <Section title="محطات المسار">
              <EmptyTable cols={5} rows={10} headers={['المحطة', 'الوقت المجدول', 'الوقت الفعلي', 'الركاب', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="وقت البدء" value={d.startTime} w="20%" /><Field label="وقت الانتهاء" value={d.endTime} w="20%" /><Field label="الالتزام بالجدول" value={d.compliance} w="20%" /></div>
            <SignatureBlock rightLabel="السائق" leftLabel="مسؤول النقل" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'sensor-alert-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل تنبيهات المستشعرات" subtitle="Sensor Alert Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="إجمالي التنبيهات" value={d.totalAlerts} w="15%" /><Field label="حرجة" value={d.critical} w="12%" /><Field label="تحذيرية" value={d.warnings} w="12%" /><Field label="معلوماتية" value={d.info} w="12%" /></div>
            <Section title="سجل التنبيهات">
              <EmptyTable cols={6} rows={12} headers={['التاريخ/الوقت', 'المستشعر', 'النوع', 'القيمة', 'الحد المسموح', 'الإجراء المتخذ']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول IoT" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'smart-building-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير أنظمة المبنى الذكي" subtitle="Smart Building Systems Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="المبنى" value={d.building} w="25%" /><Field label="المسؤول" value={d.responsible} w="25%" /></div>
            <Section title="حالة الأنظمة">
              <EmptyTable cols={5} rows={8} headers={['النظام', 'الحالة', 'الكفاءة %', 'التنبيهات', 'ملاحظات']} />
            </Section>
            <Section title="الصيانة المجدولة">
              <EmptyTable cols={4} rows={5} headers={['النظام', 'نوع الصيانة', 'التاريخ', 'الحالة']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول الأنظمة" leftLabel="مدير المرافق" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'energy-consumption':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير استهلاك الطاقة والمياه" subtitle="Energy & Water Consumption Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الشهر" value={d.month} w="20%" /><Field label="المبنى" value={d.building} w="25%" /><Field label="المسؤول" value={d.responsible} w="25%" /></div>
            <Section title="استهلاك الكهرباء">
              <EmptyTable cols={5} rows={4} headers={['المنطقة', 'القراءة السابقة', 'القراءة الحالية', 'الاستهلاك (kWh)', 'التكلفة']} />
            </Section>
            <Section title="استهلاك المياه">
              <EmptyTable cols={5} rows={4} headers={['المنطقة', 'القراءة السابقة', 'القراءة الحالية', 'الاستهلاك (م³)', 'التكلفة']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الكهرباء" value={d.totalElectricity} w="25%" /><Field label="إجمالي المياه" value={d.totalWater} w="25%" /><Field label="إجمالي التكلفة" value={d.totalCost} w="25%" /></div>
            <NotesBox label="توصيات التوفير" value={d.savingRecommendations} lines={2} />
            <SignatureBlock rightLabel="مسؤول المرافق" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
