/**
 * قوالب المطبخ والمغسلة والمكتبة والبحث — Kitchen, Laundry, Library & Research Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const KITCHEN_LIBRARY_TEMPLATES = [
  /* ── المطبخ والتغذية ── */
  { id: 'meal-plan', name: 'خطة وجبات أسبوعية', nameEn: 'Weekly Meal Plan', desc: 'جدول الوجبات الأسبوعي', color: '#bf360c' },
  { id: 'kitchen-inspection', name: 'فحص نظافة المطبخ', nameEn: 'Kitchen Inspection', desc: 'نموذج فحص نظافة المطبخ', color: '#d84315' },
  { id: 'food-inventory', name: 'جرد مواد غذائية', nameEn: 'Food Inventory', desc: 'جرد مواد المطبخ', color: '#e64a19' },
  { id: 'dietary-plan', name: 'خطة غذائية فردية', nameEn: 'Individual Dietary Plan', desc: 'خطة غذائية خاصة بمستفيد', color: '#f4511e' },
  { id: 'food-safety-checklist', name: 'قائمة سلامة الغذاء', nameEn: 'Food Safety Checklist', desc: 'تدقيق معايير سلامة الغذاء', color: '#ff5722' },
  { id: 'catering-request', name: 'طلب ضيافة', nameEn: 'Catering Request', desc: 'نموذج طلب ضيافة فعالية', color: '#ff7043' },
  /* ── المغسلة ── */
  { id: 'laundry-log', name: 'سجل المغسلة', nameEn: 'Laundry Log', desc: 'سجل المغسلة اليومي', color: '#4e342e' },
  { id: 'laundry-inspection', name: 'فحص المغسلة', nameEn: 'Laundry Inspection', desc: 'نموذج فحص نظافة المغسلة', color: '#5d4037' },
  /* ── المكتبة ── */
  { id: 'library-borrow', name: 'استعارة كتاب', nameEn: 'Book Borrow Form', desc: 'نموذج استعارة كتاب', color: '#1565c0' },
  { id: 'library-inventory', name: 'جرد المكتبة', nameEn: 'Library Inventory', desc: 'جرد محتويات المكتبة', color: '#1976d2' },
  { id: 'new-book-request', name: 'طلب شراء كتاب', nameEn: 'Book Purchase Request', desc: 'طلب شراء كتاب جديد', color: '#1e88e5' },
  { id: 'library-membership', name: 'عضوية المكتبة', nameEn: 'Library Membership', desc: 'بطاقة عضوية المكتبة', color: '#2196f3' },
  /* ── البحث العلمي ── */
  { id: 'research-proposal', name: 'مقترح بحثي', nameEn: 'Research Proposal', desc: 'نموذج مقترح بحث علمي', color: '#283593' },
  { id: 'research-ethics', name: 'موافقة أخلاقيات البحث', nameEn: 'Research Ethics Approval', desc: 'نموذج موافقة لجنة الأخلاقيات', color: '#303f9f' },
  { id: 'research-progress', name: 'تقرير تقدم بحثي', nameEn: 'Research Progress Report', desc: 'تقرير تقدم البحث', color: '#3949ab' },
  { id: 'research-publication', name: 'نموذج نشر بحث', nameEn: 'Publication Form', desc: 'نموذج طلب نشر ورقة بحثية', color: '#3f51b5' },
];

export const KitchenLibraryTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'meal-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة الوجبات الأسبوعية" subtitle="Weekly Meal Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الأسبوع" value={d.week} w="25%" /><Field label="من" value={formatDate(d.fromDate)} w="20%" /><Field label="إلى" value={formatDate(d.toDate)} w="20%" /><Field label="المعد" value={d.preparedBy} w="25%" /></div>
            {['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map((day, i) => (
              <Section key={i} title={day}>
                <EmptyTable cols={4} rows={1} headers={['الفطور', 'الغداء', 'العشاء', 'وجبات خفيفة']} />
              </Section>
            ))}
            <NotesBox label="ملاحظات / حميات خاصة" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="أخصائي التغذية" leftLabel="مدير الخدمات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'kitchen-inspection':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="فحص نظافة المطبخ" subtitle="Kitchen Hygiene Inspection" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="الوقت" value={d.time} w="15%" /><Field label="المفتش" value={d.inspector} w="25%" /><Field label="التقييم العام" value={d.overallRating} w="20%" /></div>
            <Section title="بنود الفحص">
              <EmptyTable cols={4} rows={12} headers={['البند', 'مطابق', 'غير مطابق', 'ملاحظات']} />
            </Section>
            <NotesBox label="إجراءات تصحيحية" value={d.correctiveActions} lines={2} />
            <SignatureBlock rightLabel="المفتش" leftLabel="مسؤول المطبخ" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'food-inventory':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="جرد مواد المطبخ" subtitle="Kitchen Food Inventory" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="المسؤول" value={d.responsible} w="25%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <Section title="المواد الغذائية">
              <EmptyTable cols={7} rows={15} headers={['الصنف', 'الوحدة', 'الرصيد السابق', 'الوارد', 'المنصرف', 'الرصيد الحالي', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="أمين المخزن" leftLabel="المراجع" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'dietary-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة غذائية فردية" subtitle="Individual Dietary Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستفيد" value={d.beneficiary} w="30%" /><Field label="الرقم" value={d.fileNo} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="الأخصائي" value={d.nutritionist} w="25%" /></div>
            <div style={fieldRow}><Field label="الحساسيات" value={d.allergies} w="30%" /><Field label="الحالة الصحية" value={d.healthCondition} w="30%" /><Field label="الوزن/الطول" value={d.weightHeight} w="20%" /></div>
            <Section title="الخطة الغذائية">
              <EmptyTable cols={4} rows={5} headers={['الوجبة', 'المحتوى', 'الكميات', 'ملاحظات']} />
            </Section>
            <NotesBox label="تعليمات خاصة" value={d.specialInstructions} lines={2} />
            <NotesBox label="أهداف التغذية" value={d.goals} lines={2} />
            <SignatureBlock rightLabel="أخصائي التغذية" leftLabel="الطبيب" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'food-safety-checklist':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="قائمة تدقيق سلامة الغذاء" subtitle="Food Safety Checklist" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="المفتش" value={d.inspector} w="25%" /><Field label="الموقع" value={d.location} w="20%" /></div>
            <Section title="معايير سلامة الغذاء">
              <EmptyTable cols={4} rows={12} headers={['المعيار', 'متوفر', 'غير متوفر', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="نسبة الالتزام" value={d.complianceRate} w="20%" /><Field label="التقييم" value={d.rating} w="20%" /></div>
            <NotesBox label="توصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="المفتش" leftLabel="مسؤول سلامة الغذاء" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'catering-request':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="طلب ضيافة فعالية" subtitle="Catering Request" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفعالية" value={d.eventName} w="35%" /><Field label="التاريخ" value={formatDate(d.eventDate)} w="15%" /><Field label="العدد المتوقع" value={d.guestCount} w="15%" /><Field label="القسم الطالب" value={d.department} w="20%" /></div>
            <NotesBox label="المتطلبات" value={d.requirements} lines={3} />
            <Section title="قائمة الضيافة">
              <EmptyTable cols={4} rows={6} headers={['الصنف', 'الكمية', 'ملاحظات خاصة', 'التكلفة التقديرية']} />
            </Section>
            <SignatureBlock rightLabel="مقدم الطلب" leftLabel="مسؤول المطبخ" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'laundry-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل المغسلة اليومي" subtitle="Daily Laundry Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="الوردية" value={d.shift} w="15%" /><Field label="المسؤول" value={d.attendant} w="25%" /></div>
            <Section title="سجل الغسيل">
              <EmptyTable cols={6} rows={12} headers={['القسم/المستفيد', 'نوع الملابس', 'الكمية', 'وقت الاستلام', 'وقت التسليم', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي القطع" value={d.totalPieces} w="20%" /><Field label="حالة المعدات" value={d.equipmentStatus} w="25%" /></div>
            <SignatureBlock rightLabel="مسؤول المغسلة" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'laundry-inspection':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="فحص نظافة المغسلة" subtitle="Laundry Inspection" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="المفتش" value={d.inspector} w="25%" /><Field label="التقييم" value={d.rating} w="15%" /></div>
            <Section title="بنود الفحص">
              <EmptyTable cols={4} rows={10} headers={['البند', 'مطابق', 'غير مطابق', 'ملاحظات']} />
            </Section>
            <NotesBox label="إجراءات تصحيحية" value={d.corrective} lines={2} />
            <SignatureBlock rightLabel="المفتش" leftLabel="مسؤول المغسلة" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ المكتبة ══════════════ */
    case 'library-borrow':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج استعارة كتاب" subtitle="Book Borrowing Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستعير" value={d.borrowerName} w="30%" /><Field label="الرقم الوظيفي" value={d.empNo} w="15%" /><Field label="القسم" value={d.department} w="20%" /><Field label="الجوال" value={d.phone} w="20%" /></div>
            <Section title="الكتب المستعارة">
              <EmptyTable cols={5} rows={5} headers={['عنوان الكتاب', 'رقم التصنيف', 'تاريخ الاستعارة', 'تاريخ الإعادة المتوقع', 'ملاحظات']} />
            </Section>
            <div style={{ fontSize: 11, margin: '12px 0', color: '#666' }}>
              أتعهد بالمحافظة على الكتب المستعارة وإعادتها بحالتها في الموعد المحدد.
            </div>
            <SignatureBlock rightLabel="المستعير" leftLabel="أمين المكتبة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'library-inventory':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="جرد محتويات المكتبة" subtitle="Library Inventory" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /><Field label="المسؤول" value={d.responsible} w="25%" /><Field label="إجمالي الكتب" value={d.totalBooks} w="15%" /><Field label="المتوفرة" value={d.available} w="15%" /><Field label="المستعارة" value={d.borrowed} w="15%" /></div>
            <Section title="الجرد التفصيلي">
              <EmptyTable cols={6} rows={15} headers={['رقم التصنيف', 'العنوان', 'المؤلف', 'الفئة', 'الحالة', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="أمين المكتبة" leftLabel="المراجع" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'new-book-request':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="طلب شراء كتاب جديد" subtitle="Book Purchase Request" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="مقدم الطلب" value={d.requester} w="30%" /><Field label="القسم" value={d.department} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="الكتب المطلوبة">
              <EmptyTable cols={6} rows={5} headers={['العنوان', 'المؤلف', 'الناشر', 'ISBN', 'السعر التقريبي', 'المبرر']} />
            </Section>
            <NotesBox label="مبرر الشراء" value={d.justification} lines={2} />
            <SignatureBlock rightLabel="مقدم الطلب" leftLabel="مدير المكتبة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'library-membership':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بطاقة عضوية المكتبة" subtitle="Library Membership Card" />
          <div style={bodyPad}>
            <div style={{ textAlign: 'center', margin: '20px auto', padding: 20, border: '3px solid #1565c0', borderRadius: 12, maxWidth: 400, background: '#e3f2fd' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1565c0', marginBottom: 12 }}>بطاقة عضوية مكتبة مركز الأوائل</div>
              <div style={fieldRow}><Field label="الاسم" value={d.memberName} w="50%" /><Field label="رقم العضوية" value={d.memberNo} w="50%" /></div>
              <div style={fieldRow}><Field label="القسم" value={d.department} w="50%" /><Field label="الجوال" value={d.phone} w="50%" /></div>
              <div style={fieldRow}><Field label="تاريخ الإصدار" value={formatDate(d.issueDate) || today()} w="50%" /><Field label="صالحة حتى" value={formatDate(d.expiryDate)} w="50%" /></div>
            </div>
            <div style={{ fontSize: 10, textAlign: 'center', color: '#666' }}>يُسمح باستعارة 3 كتب كحد أقصى لمدة أسبوعين.</div>
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ البحث العلمي ══════════════ */
    case 'research-proposal':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج مقترح بحث علمي" subtitle="Research Proposal" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="عنوان البحث" value={d.researchTitle} w="50%" /><Field label="الباحث الرئيسي" value={d.principalInvestigator} w="30%" /></div>
            <div style={fieldRow}><Field label="القسم" value={d.department} w="25%" /><Field label="المدة المتوقعة" value={d.duration} w="20%" /><Field label="الميزانية المقدرة" value={d.estimatedBudget} w="20%" /></div>
            <NotesBox label="المقدمة والمشكلة البحثية" value={d.introduction} lines={3} />
            <NotesBox label="أهداف البحث" value={d.objectives} lines={2} />
            <NotesBox label="منهجية البحث" value={d.methodology} lines={3} />
            <NotesBox label="الأثر المتوقع" value={d.expectedImpact} lines={2} />
            <SignatureBlock rightLabel="الباحث الرئيسي" leftLabel="مدير البحث العلمي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'research-ethics':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج موافقة لجنة أخلاقيات البحث" subtitle="Research Ethics Committee Approval" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="عنوان البحث" value={d.researchTitle} w="50%" /><Field label="الباحث" value={d.researcher} w="25%" /><Field label="رقم الموافقة" value={d.approvalNo} w="20%" /></div>
            <Section title="معايير المراجعة الأخلاقية">
              <EmptyTable cols={4} rows={8} headers={['المعيار', 'متحقق', 'غير متحقق', 'ملاحظات']} />
            </Section>
            <NotesBox label="قرار اللجنة" value={d.decision} lines={2} />
            <NotesBox label="شروط الموافقة" value={d.conditions} lines={2} />
            <div style={fieldRow}><Field label="تاريخ الموافقة" value={formatDate(d.approvalDate)} w="25%" /><Field label="صالحة حتى" value={formatDate(d.validUntil)} w="25%" /></div>
            <SignatureBlock rightLabel="رئيس لجنة الأخلاقيات" leftLabel="الباحث الرئيسي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'research-progress':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تقدم البحث" subtitle="Research Progress Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="عنوان البحث" value={d.researchTitle} w="45%" /><Field label="الباحث" value={d.researcher} w="25%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <div style={fieldRow}><Field label="نسبة الإنجاز" value={d.completion} w="15%" /><Field label="الحالة العامة" value={d.status} w="20%" /><Field label="الميزانية المصروفة" value={d.spentBudget} w="25%" /></div>
            <Section title="الأنشطة المنجزة">
              <EmptyTable cols={3} rows={5} headers={['النشاط', 'الإنجاز', 'ملاحظات']} />
            </Section>
            <NotesBox label="التحديات" value={d.challenges} lines={2} />
            <NotesBox label="الخطوات القادمة" value={d.nextSteps} lines={2} />
            <SignatureBlock rightLabel="الباحث" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'research-publication':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج طلب نشر ورقة بحثية" subtitle="Research Publication Request" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="عنوان الورقة" value={d.paperTitle} w="50%" /><Field label="الباحث" value={d.researcher} w="25%" /><Field label="القسم" value={d.department} w="20%" /></div>
            <div style={fieldRow}><Field label="المجلة/المؤتمر" value={d.journal} w="40%" /><Field label="تاريخ التقديم" value={formatDate(d.submissionDate)} w="20%" /><Field label="نوع النشر" value={d.publicationType} w="20%" /></div>
            <NotesBox label="ملخص الورقة" value={d.abstract} lines={4} />
            <NotesBox label="الكلمات المفتاحية" value={d.keywords} lines={1} />
            <div style={fieldRow}><Field label="الباحثون المشاركون" value={d.coAuthors} w="50%" /><Field label="حالة الورقة" value={d.status} w="20%" /></div>
            <SignatureBlock rightLabel="الباحث الرئيسي" leftLabel="مدير البحث العلمي" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
