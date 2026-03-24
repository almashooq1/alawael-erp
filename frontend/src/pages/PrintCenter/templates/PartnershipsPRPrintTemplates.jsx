/**
 * قوالب الشراكات والعلاقات العامة
 * Partnerships & Public Relations Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const PARTNERSHIPS_PR_TEMPLATES = [
  { id: 'partnership-proposal', name: 'عرض شراكة', nameEn: 'Partnership Proposal', desc: 'عرض تقديمي لإبرام شراكة جديدة', color: '#1565c0' },
  { id: 'mou-agreement', name: 'مذكرة تفاهم', nameEn: 'Memorandum of Understanding', desc: 'مذكرة تفاهم بين الأطراف', color: '#0d47a1' },
  { id: 'partner-evaluation', name: 'تقييم الشريك', nameEn: 'Partner Evaluation Form', desc: 'نموذج تقييم أداء الشريك', color: '#1976d2' },
  { id: 'partnership-renewal', name: 'تجديد شراكة', nameEn: 'Partnership Renewal Form', desc: 'نموذج تجديد اتفاقية شراكة', color: '#1e88e5' },
  { id: 'partnership-report', name: 'تقرير الشراكات', nameEn: 'Partnership Activity Report', desc: 'تقرير أنشطة الشراكات', color: '#2196f3' },
  { id: 'pr-campaign-plan', name: 'خطة حملة علاقات عامة', nameEn: 'PR Campaign Plan', desc: 'خطة حملة العلاقات العامة', color: '#6a1b9a' },
  { id: 'press-coverage-report', name: 'تقرير التغطية الإعلامية', nameEn: 'Press Coverage Report', desc: 'تقرير التغطيات الإعلامية', color: '#7b1fa2' },
  { id: 'media-contact-directory', name: 'دليل جهات الإعلام', nameEn: 'Media Contact Directory', desc: 'دليل جهات الاتصال الإعلامية', color: '#4527a0' },
  { id: 'brand-guidelines-doc', name: 'توثيق الهوية البصرية', nameEn: 'Brand Guidelines Document', desc: 'وثيقة إرشادات الهوية البصرية', color: '#283593' },
  { id: 'csr-plan', name: 'خطة المسؤولية الاجتماعية', nameEn: 'CSR Plan', desc: 'خطة المسؤولية الاجتماعية للمؤسسة', color: '#2e7d32' },
  { id: 'sponsorship-request', name: 'طلب رعاية', nameEn: 'Sponsorship Request Form', desc: 'نموذج طلب رعاية فعالية', color: '#00695c' },
  { id: 'stakeholder-map', name: 'خريطة أصحاب المصلحة', nameEn: 'Stakeholder Mapping Report', desc: 'خريطة أصحاب المصلحة وتحليلهم', color: '#0277bd' },
  { id: 'annual-pr-report', name: 'تقرير العلاقات العامة السنوي', nameEn: 'Annual PR Report', desc: 'التقرير السنوي للعلاقات العامة', color: '#37474f' },
  { id: 'partner-directory', name: 'دليل الشركاء', nameEn: 'Partner Directory', desc: 'سجل الشركاء والجهات المتعاونة', color: '#455a64' },
  { id: 'collaboration-agreement', name: 'اتفاقية تعاون', nameEn: 'Collaboration Agreement', desc: 'اتفاقية التعاون المشترك', color: '#558b2f' },
  { id: 'pr-event-brief', name: 'ملخص فعالية علاقات عامة', nameEn: 'PR Event Brief', desc: 'ملخص فعالية العلاقات العامة', color: '#e65100' },
];

export const PartnershipsPRTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'partnership-proposal':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="عرض شراكة" subtitle="Partnership Proposal" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم الجهة المقترحة" value={d.partnerName} w="40%" /><Field label="مجال الشراكة" value={d.area} w="30%" /><Field label="المدة المقترحة" value={d.duration} w="30%" /></div>
            <Section title="أهداف الشراكة">
              <EmptyTable cols={4} rows={6} headers={['الهدف', 'المؤشر', 'القيمة المضافة', 'الجدول الزمني']} />
            </Section>
            <Section title="الموارد المطلوبة">
              <EmptyTable cols={4} rows={4} headers={['المورد', 'من الجهة', 'من المركز', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات إضافية" value={d.notes} lines={3} />
            <SignatureBlock rightLabel="مقدم العرض" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'mou-agreement':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مذكرة تفاهم" subtitle="Memorandum of Understanding" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الطرف الأول" value={d.party1} w="50%" /><Field label="الطرف الثاني" value={d.party2} w="50%" /></div>
            <div style={fieldRow}><Field label="تاريخ البدء" value={formatDate(d.startDate)} w="25%" /><Field label="تاريخ الانتهاء" value={formatDate(d.endDate)} w="25%" /><Field label="الرقم المرجعي" value={d.mouNumber} w="25%" /></div>
            <Section title="بنود مذكرة التفاهم">
              <EmptyTable cols={4} rows={8} headers={['البند', 'التزام الطرف الأول', 'التزام الطرف الثاني', 'الموعد']} />
            </Section>
            <NotesBox label="شروط إضافية" value={d.terms} lines={3} />
            <SignatureBlock rightLabel="الطرف الأول" leftLabel="الطرف الثاني" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'partner-evaluation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقييم أداء الشريك" subtitle="Partner Evaluation Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم الشريك" value={d.partnerName} w="40%" /><Field label="فترة التقييم" value={d.period} w="30%" /><Field label="المقيّم" value={d.evaluator} w="30%" /></div>
            <Section title="معايير التقييم">
              <EmptyTable cols={5} rows={8} headers={['المعيار', 'الوزن', 'الدرجة', 'النتيجة', 'ملاحظات']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="المقيّم" leftLabel="مدير الشراكات" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'partnership-renewal':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تجديد شراكة" subtitle="Partnership Renewal" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم الشريك" value={d.partnerName} w="40%" /><Field label="رقم الاتفاقية" value={d.agreementNo} w="30%" /><Field label="تاريخ الانتهاء" value={formatDate(d.expiryDate)} w="30%" /></div>
            <Section title="ملخص الأداء السابق">
              <EmptyTable cols={4} rows={5} headers={['المؤشر', 'الهدف', 'المتحقق', 'النسبة']} />
            </Section>
            <Section title="التعديلات المقترحة">
              <EmptyTable cols={3} rows={4} headers={['البند', 'الحالي', 'المقترح']} />
            </Section>
            <SignatureBlock rightLabel="مدير الشراكات" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'partnership-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير أنشطة الشراكات" subtitle="Partnership Activity Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="30%" /><Field label="عدد الشراكات النشطة" value={d.activeCount} w="30%" /><Field label="معد التقرير" value={d.preparedBy} w="40%" /></div>
            <Section title="ملخص الأنشطة">
              <EmptyTable cols={5} rows={8} headers={['الشريك', 'النشاط', 'الحالة', 'الأثر', 'ملاحظات']} />
            </Section>
            <NotesBox label="التحديات والفرص" value={d.notes} lines={3} />
            <SignatureBlock rightLabel="مدير الشراكات" leftLabel="نائب المدير" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'pr-campaign-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة حملة علاقات عامة" subtitle="PR Campaign Plan" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم الحملة" value={d.campaignName} w="40%" /><Field label="المدة" value={d.duration} w="20%" /><Field label="الميزانية" value={d.budget} w="20%" /><Field label="المسؤول" value={d.manager} w="20%" /></div>
            <Section title="خطة التنفيذ">
              <EmptyTable cols={5} rows={6} headers={['المرحلة', 'النشاط', 'القناة', 'الجدول', 'المسؤول']} />
            </Section>
            <Section title="مؤشرات الأداء">
              <EmptyTable cols={4} rows={4} headers={['المؤشر', 'الهدف', 'أداة القياس', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مدير العلاقات العامة" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'press-coverage-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير التغطية الإعلامية" subtitle="Press Coverage Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="30%" /><Field label="عدد التغطيات" value={d.coverageCount} w="20%" /><Field label="القيمة الإعلانية" value={d.adValue} w="25%" /></div>
            <Section title="التغطيات الإعلامية">
              <EmptyTable cols={6} rows={8} headers={['الوسيلة', 'العنوان', 'التاريخ', 'النوع', 'النبرة', 'الوصول']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="أخصائي الإعلام" leftLabel="مدير العلاقات العامة" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'media-contact-directory':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="دليل جهات الاتصال الإعلامية" subtitle="Media Contact Directory" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <Section title="جهات الاتصال">
              <EmptyTable cols={6} rows={12} headers={['الاسم', 'المؤسسة', 'المنصب', 'الهاتف', 'البريد', 'التصنيف']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="المختص" leftLabel="مدير العلاقات العامة" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'brand-guidelines-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توثيق الهوية البصرية" subtitle="Brand Guidelines Document" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الإصدار" value={d.version} w="20%" /><Field label="تاريخ الاعتماد" value={formatDate(d.approvedDate)} w="25%" /><Field label="المعد" value={d.preparedBy} w="30%" /></div>
            <Section title="عناصر الهوية">
              <EmptyTable cols={4} rows={8} headers={['العنصر', 'المواصفة', 'الاستخدام المسموح', 'ملاحظات']} />
            </Section>
            <Section title="ألوان ومعايير">
              <EmptyTable cols={4} rows={4} headers={['اللون', 'الكود', 'الاستخدام', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مصمم الهوية" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'csr-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة المسؤولية الاجتماعية" subtitle="CSR Plan" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="السنة" value={d.year} w="20%" /><Field label="الميزانية" value={d.budget} w="25%" /><Field label="المسؤول" value={d.manager} w="30%" /></div>
            <Section title="المبادرات المخططة">
              <EmptyTable cols={5} rows={6} headers={['المبادرة', 'الفئة المستهدفة', 'الميزانية', 'الجدول', 'المسؤول']} />
            </Section>
            <NotesBox label="مؤشرات الأثر" value={d.impactMetrics} lines={3} />
            <SignatureBlock rightLabel="مسؤول CSR" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'sponsorship-request':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="طلب رعاية فعالية" subtitle="Sponsorship Request Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم الفعالية" value={d.eventName} w="40%" /><Field label="التاريخ" value={formatDate(d.eventDate)} w="20%" /><Field label="المبلغ المطلوب" value={d.amount} w="20%" /></div>
            <div style={fieldRow}><Field label="الجهة الراعية" value={d.sponsor} w="40%" /><Field label="نوع الرعاية" value={d.sponsorType} w="30%" /></div>
            <Section title="مزايا الرعاية">
              <EmptyTable cols={3} rows={5} headers={['الميزة', 'التفاصيل', 'القيمة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مدير الفعاليات" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'stakeholder-map':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خريطة أصحاب المصلحة" subtitle="Stakeholder Mapping Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="المشروع / المبادرة" value={d.projectName} w="50%" /><Field label="تاريخ التحديث" value={formatDate(d.updateDate) || today()} w="25%" /></div>
            <Section title="تحليل أصحاب المصلحة">
              <EmptyTable cols={6} rows={10} headers={['الجهة', 'النوع', 'التأثير', 'الاهتمام', 'الاستراتيجية', 'المسؤول']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="المحلل" leftLabel="مدير المشروع" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'annual-pr-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="التقرير السنوي للعلاقات العامة" subtitle="Annual PR Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="السنة" value={d.year} w="20%" /><Field label="عدد الأنشطة" value={d.activityCount} w="25%" /><Field label="معد التقرير" value={d.preparedBy} w="30%" /></div>
            <Section title="ملخص الأنشطة">
              <EmptyTable cols={5} rows={8} headers={['النشاط', 'القناة', 'الحضور/الوصول', 'التكلفة', 'النتائج']} />
            </Section>
            <Section title="الإنجازات الرئيسية">
              <EmptyTable cols={3} rows={4} headers={['الإنجاز', 'الأثر', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مدير العلاقات العامة" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'partner-directory':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="دليل الشركاء" subtitle="Partner Directory" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <Section title="سجل الشركاء">
              <EmptyTable cols={7} rows={12} headers={['الشريك', 'النوع', 'مجال التعاون', 'بداية الشراكة', 'الحالة', 'جهة الاتصال', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مدير الشراكات" leftLabel="نائب المدير" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'collaboration-agreement':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="اتفاقية تعاون مشترك" subtitle="Collaboration Agreement" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الطرف الأول" value={d.party1} w="40%" /><Field label="الطرف الثاني" value={d.party2} w="40%" /></div>
            <div style={fieldRow}><Field label="من تاريخ" value={formatDate(d.startDate)} w="25%" /><Field label="إلى تاريخ" value={formatDate(d.endDate)} w="25%" /><Field label="نوع التعاون" value={d.type} w="25%" /></div>
            <Section title="البنود والالتزامات">
              <EmptyTable cols={4} rows={6} headers={['البند', 'الوصف', 'المسؤول', 'الموعد']} />
            </Section>
            <NotesBox label="شروط خاصة" value={d.specialTerms} lines={3} />
            <SignatureBlock rightLabel="الطرف الأول" leftLabel="الطرف الثاني" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'pr-event-brief':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص فعالية علاقات عامة" subtitle="PR Event Brief" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم الفعالية" value={d.eventName} w="40%" /><Field label="التاريخ" value={formatDate(d.eventDate)} w="20%" /><Field label="المكان" value={d.venue} w="20%" /><Field label="الحضور المتوقع" value={d.expectedAttendance} w="20%" /></div>
            <Section title="البرنامج">
              <EmptyTable cols={4} rows={6} headers={['الوقت', 'الفقرة', 'المتحدث', 'ملاحظات']} />
            </Section>
            <Section title="الوسائط المطلوبة">
              <EmptyTable cols={3} rows={4} headers={['البند', 'المواصفة', 'الحالة']} />
            </Section>
            <SignatureBlock rightLabel="منسق الفعاليات" leftLabel="مدير العلاقات العامة" />
          </div>
          <OrgFooter />
        </div>
      );
    default:
      return <div style={pageWrapper}><OrgHeader title="قالب الشراكات والعلاقات العامة" /><div style={bodyPad}><p>لا يوجد قالب مطابق</p></div><OrgFooter /></div>;
  }
};
