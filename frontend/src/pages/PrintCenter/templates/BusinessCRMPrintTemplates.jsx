/**
 * قوالب طباعة الأعمال وإدارة العلاقات — Business & CRM Print Templates
 * يشمل: CRM، التجارة الإلكترونية، المشاريع، المخاطر، إدارة الأزمات
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, PrintTable, EmptyTable, RefDateLine, ConfidentialBanner,
  fieldRow, bodyPad, pageWrapper, formatDate, formatMoney, today,
} from '../shared/PrintTemplateShared';

export const BUSINESS_TEMPLATES = [
  // CRM
  { id: 'customer-report', name: 'تقرير عميل', nameEn: 'Customer Report', desc: 'تقرير بيانات العميل', color: '#1565c0' },
  { id: 'sales-quotation', name: 'عرض سعر', nameEn: 'Sales Quotation', desc: 'نموذج عرض سعر', color: '#1976d2' },
  { id: 'service-agreement', name: 'اتفاقية خدمة', nameEn: 'Service Agreement', desc: 'اتفاقية مستوى خدمة SLA', color: '#1e88e5' },
  // E-Commerce
  { id: 'order-confirmation', name: 'تأكيد طلب', nameEn: 'Order Confirmation', desc: 'تأكيد طلب إلكتروني', color: '#2e7d32' },
  { id: 'packing-slip', name: 'كشف تعبئة', nameEn: 'Packing Slip', desc: 'كشف محتويات الشحنة', color: '#388e3c' },
  { id: 'return-auth', name: 'إذن إرجاع', nameEn: 'Return Authorization', desc: 'نموذج إذن إرجاع بضاعة', color: '#43a047' },
  // المشاريع Projects
  { id: 'project-charter', name: 'ميثاق مشروع', nameEn: 'Project Charter', desc: 'وثيقة ميثاق المشروع', color: '#4527a0' },
  { id: 'project-status', name: 'تقرير حالة مشروع', nameEn: 'Project Status Report', desc: 'تقرير حالة المشروع الدوري', color: '#512da8' },
  { id: 'project-completion', name: 'شهادة إنجاز مشروع', nameEn: 'Project Completion Certificate', desc: 'شهادة إتمام مشروع', color: '#5e35b1' },
  // إدارة المخاطر Risk
  { id: 'risk-register', name: 'سجل المخاطر', nameEn: 'Risk Register', desc: 'سجل المخاطر المؤسسية', color: '#c62828' },
  { id: 'risk-assessment', name: 'تقييم مخاطر', nameEn: 'Risk Assessment', desc: 'نموذج تقييم مخاطر', color: '#d32f2f' },
  { id: 'mitigation-plan', name: 'خطة تخفيف مخاطر', nameEn: 'Risk Mitigation Plan', desc: 'خطة معالجة المخاطر', color: '#e53935' },
  // إدارة الأزمات Crisis
  { id: 'crisis-response', name: 'خطة استجابة أزمات', nameEn: 'Crisis Response Plan', desc: 'خطة الاستجابة للأزمات', color: '#b71c1c' },
  { id: 'post-incident', name: 'تقرير ما بعد الحادث', nameEn: 'Post-Incident Report', desc: 'تقرير تحليل ما بعد الحادث', color: '#c62828' },
];

export const BusinessTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'customer-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير عميل" subtitle="Customer Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات العميل">
              <div style={fieldRow}><Field label="اسم العميل" value={d.customerName} w="40%" /><Field label="رقم العميل" value={d.customerNo} w="20%" /><Field label="الفئة" value={d.category} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
              <div style={fieldRow}><Field label="جهة الاتصال" value={d.contact} w="40%" /><Field label="الهاتف" value={d.phone} w="30%" /><Field label="البريد" value={d.email} w="30%" /></div>
            </Section>
            <Section title="سجل التعاملات">
              <EmptyTable cols={5} rows={8} headers={['التاريخ', 'نوع التعامل', 'الوصف', 'القيمة', 'الحالة']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي التعاملات" value={formatMoney(d.totalValue)} w="33%" /><Field label="رصيد مستحق" value={formatMoney(d.outstanding)} w="33%" /><Field label="التصنيف" value={d.rating} w="34%" /></div>
            <NotesBox label="ملاحظات" value={d.notes} />
            <SignatureBlock rightLabel="مدير العلاقات" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'sales-quotation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="عرض سعر" subtitle="Sales Quotation" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات العميل">
              <div style={fieldRow}><Field label="العميل" value={d.customerName} w="40%" /><Field label="جهة الاتصال" value={d.contact} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="30%" /></div>
            </Section>
            <Section title="البنود">
              <EmptyTable cols={6} rows={8} headers={['م', 'الوصف', 'الكمية', 'سعر الوحدة', 'الإجمالي', 'ملاحظات']} />
            </Section>
            <div style={{ textAlign: 'left', margin: '12px 0' }}>
              <div style={fieldRow}><Field label="المجموع" value={formatMoney(d.subtotal)} w="33%" /><Field label="الضريبة (15%)" value={formatMoney(d.tax)} w="33%" /><Field label="الإجمالي" value={formatMoney(d.total)} w="34%" /></div>
            </div>
            <NotesBox label="الشروط والأحكام" value={d.terms || 'العرض ساري لمدة 30 يوم من التاريخ أعلاه.'} />
            <SignatureBlock rightLabel="مسؤول المبيعات" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'service-agreement':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="اتفاقية مستوى خدمة" subtitle="Service Level Agreement (SLA)" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="الأطراف">
              <div style={fieldRow}><Field label="مقدم الخدمة" value={d.provider || 'مركز الأوائل'} w="50%" /><Field label="المستفيد" value={d.client} w="50%" /></div>
            </Section>
            <Section title="نطاق الخدمة">
              <NotesBox value={d.scope} lines={3} />
            </Section>
            <Section title="مؤشرات الأداء">
              <EmptyTable cols={4} rows={6} headers={['المؤشر', 'المستهدف', 'طريقة القياس', 'العقوبة']} />
            </Section>
            <div style={fieldRow}><Field label="مدة الاتفاقية" value={d.duration} w="33%" /><Field label="من" value={formatDate(d.fromDate)} w="33%" /><Field label="إلى" value={formatDate(d.toDate)} w="34%" /></div>
            <NotesBox label="الشروط والأحكام" value={d.terms} lines={4} />
            <SignatureBlock rightLabel="مقدم الخدمة" leftLabel="المستفيد" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'order-confirmation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تأكيد طلب" subtitle="Order Confirmation" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={{ background: '#e8f5e9', padding: 12, borderRadius: 8, textAlign: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 16, fontWeight: 'bold', color: '#2e7d32' }}>تم تأكيد طلبكم بنجاح</span>
            </div>
            <Section title="بيانات الطلب">
              <div style={fieldRow}><Field label="رقم الطلب" value={d.orderNo} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="25%" /><Field label="العميل" value={d.customerName} w="25%" /><Field label="طريقة الدفع" value={d.paymentMethod} w="25%" /></div>
            </Section>
            <Section title="المنتجات">
              <EmptyTable cols={5} rows={6} headers={['الصنف', 'الكمية', 'السعر', 'الإجمالي', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="المجموع" value={formatMoney(d.subtotal)} w="25%" /><Field label="الشحن" value={formatMoney(d.shipping)} w="25%" /><Field label="الضريبة" value={formatMoney(d.tax)} w="25%" /><Field label="الإجمالي" value={formatMoney(d.total)} w="25%" /></div>
            <Section title="عنوان التوصيل">
              <NotesBox value={d.deliveryAddress} />
            </Section>
          </div>
          <OrgFooter />
        </div>
      );

    case 'packing-slip':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="كشف محتويات الشحنة" subtitle="Packing Slip" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الطلب" value={d.orderNo} w="25%" /><Field label="رقم الشحنة" value={d.shipmentNo} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="25%" /><Field label="شركة الشحن" value={d.carrier} w="25%" /></div>
            <div style={fieldRow}><Field label="المرسل إليه" value={d.recipient} w="50%" /><Field label="العنوان" value={d.address} w="50%" /></div>
            <Section title="المحتويات">
              <EmptyTable cols={5} rows={8} headers={['م', 'الصنف', 'SKU', 'الكمية المطلوبة', 'الكمية المرسلة']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي القطع" value={d.totalItems} w="33%" /><Field label="عدد الصناديق" value={d.boxes} w="33%" /><Field label="الوزن الإجمالي" value={d.weight} w="34%" /></div>
            <SignatureBlock rightLabel="مسؤول التعبئة" leftLabel="المستلم" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'return-auth':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إذن إرجاع بضاعة" subtitle="Return Merchandise Authorization" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الطلب الأصلي" value={d.originalOrderNo} w="33%" /><Field label="العميل" value={d.customerName} w="33%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="34%" /></div>
            <Section title="البضاعة المرتجعة">
              <EmptyTable cols={5} rows={5} headers={['الصنف', 'الكمية', 'سبب الإرجاع', 'الحالة', 'القرار']} />
            </Section>
            <div style={fieldRow}><Field label="المبلغ المسترد" value={formatMoney(d.refundAmount)} w="33%" /><Field label="طريقة الاسترداد" value={d.refundMethod} w="33%" /><Field label="الحالة" value={d.status} w="34%" /></div>
            <NotesBox label="ملاحظات" value={d.notes} />
            <SignatureBlock rightLabel="خدمة العملاء" leftLabel="المستودعات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'project-charter':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ميثاق المشروع" subtitle="Project Charter" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المشروع">
              <div style={fieldRow}><Field label="اسم المشروع" value={d.projectName} w="50%" /><Field label="رقم المشروع" value={d.projectNo} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="25%" /></div>
              <div style={fieldRow}><Field label="مدير المشروع" value={d.pm} w="33%" /><Field label="الراعي" value={d.sponsor} w="33%" /><Field label="القسم" value={d.department} w="34%" /></div>
            </Section>
            <NotesBox label="وصف المشروع" value={d.description} lines={3} />
            <NotesBox label="الأهداف" value={d.objectives} lines={3} />
            <NotesBox label="النطاق" value={d.scope} lines={2} />
            <Section title="الجدول الزمني">
              <div style={fieldRow}><Field label="تاريخ البدء" value={formatDate(d.startDate)} w="33%" /><Field label="تاريخ الانتهاء" value={formatDate(d.endDate)} w="33%" /><Field label="الميزانية" value={formatMoney(d.budget)} w="34%" /></div>
            </Section>
            <Section title="فريق المشروع">
              <EmptyTable cols={4} rows={6} headers={['الاسم', 'الدور', 'المسؤولية', 'التخصيص %']} />
            </Section>
            <NotesBox label="المخاطر الرئيسية" value={d.risks} lines={2} />
            <SignatureBlock rightLabel="مدير المشروع" leftLabel="الراعي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'project-status':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حالة المشروع" subtitle="Project Status Report" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المشروع" value={d.projectName} w="40%" /><Field label="المدير" value={d.pm} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="30%" /></div>
            <Section title="ملخص الحالة">
              <div style={fieldRow}><Field label="الصحة العامة" value={d.overallHealth} w="25%" /><Field label="الجدول" value={d.scheduleStatus} w="25%" /><Field label="الميزانية" value={d.budgetStatus} w="25%" /><Field label="النطاق" value={d.scopeStatus} w="25%" /></div>
              <div style={fieldRow}><Field label="% الإنجاز" value={d.completion} w="25%" /><Field label="المرحلة الحالية" value={d.currentPhase} w="25%" /><Field label="المصروف" value={formatMoney(d.spent)} w="25%" /><Field label="المتبقي" value={formatMoney(d.remaining)} w="25%" /></div>
            </Section>
            <Section title="المنجزات هذه الفترة">
              <EmptyTable cols={3} rows={5} headers={['المهمة', 'الحالة', 'ملاحظات']} />
            </Section>
            <Section title="المهام القادمة">
              <EmptyTable cols={4} rows={5} headers={['المهمة', 'المسؤول', 'الموعد', 'الأولوية']} />
            </Section>
            <NotesBox label="مشكلات ومخاطر" value={d.issues} />
            <SignatureBlock rightLabel="مدير المشروع" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'project-completion':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة إنجاز مشروع" subtitle="Project Completion Certificate" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={{ textAlign: 'center', margin: '30px 0' }}>
              <div style={{ fontSize: 14, color: '#666' }}>يشهد مركز الأوائل لتأهيل ذوي الإعاقة بأن</div>
              <h2 style={{ fontSize: 20, color: '#4527a0', margin: '16px 0' }}>{d.projectName || 'اسم المشروع'}</h2>
              <div style={{ fontSize: 14 }}>قد تم إنجازه بنجاح</div>
            </div>
            <Section title="بيانات المشروع">
              <div style={fieldRow}><Field label="مدير المشروع" value={d.pm} w="33%" /><Field label="تاريخ البدء" value={formatDate(d.startDate)} w="33%" /><Field label="تاريخ الإنجاز" value={formatDate(d.completionDate)} w="34%" /></div>
              <div style={fieldRow}><Field label="الميزانية" value={formatMoney(d.budget)} w="33%" /><Field label="التكلفة الفعلية" value={formatMoney(d.actualCost)} w="33%" /><Field label="المخرجات" value={d.deliverables} w="34%" /></div>
            </Section>
            <NotesBox label="ملخص الإنجاز" value={d.summary} lines={3} />
            <SignatureBlock rightLabel="مدير المشروع" leftLabel="الراعي / المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'risk-register':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل المخاطر المؤسسية" subtitle="Risk Register" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم / المشروع" value={d.entity} w="40%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="30%" /><Field label="المسؤول" value={d.owner} w="30%" /></div>
            <Section title="سجل المخاطر">
              <EmptyTable cols={8} rows={10} headers={['م', 'المخاطرة', 'الفئة', 'الاحتمال', 'الأثر', 'المستوى', 'المعالجة', 'المسؤول']} />
            </Section>
            <Section title="ملخص">
              <div style={fieldRow}><Field label="مخاطر عالية" value={d.highRisks} w="25%" /><Field label="مخاطر متوسطة" value={d.mediumRisks} w="25%" /><Field label="مخاطر منخفضة" value={d.lowRisks} w="25%" /><Field label="الإجمالي" value={d.totalRisks} w="25%" /></div>
            </Section>
            <SignatureBlock rightLabel="مدير المخاطر" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'risk-assessment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تقييم مخاطر" subtitle="Risk Assessment Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="النشاط / العملية" value={d.activity} w="50%" /><Field label="القسم" value={d.department} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="25%" /></div>
            <Section title="تحديد المخاطر">
              <EmptyTable cols={6} rows={6} headers={['المخاطرة', 'الأسباب', 'الآثار', 'الاحتمال (1-5)', 'الأثر (1-5)', 'المستوى']} />
            </Section>
            <Section title="الضوابط الحالية">
              <NotesBox value={d.currentControls} lines={3} />
            </Section>
            <Section title="الضوابط الإضافية المطلوبة">
              <EmptyTable cols={4} rows={4} headers={['الإجراء', 'المسؤول', 'الموعد', 'الأولوية']} />
            </Section>
            <SignatureBlock rightLabel="المقيّم" leftLabel="مدير المخاطر" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'mitigation-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة معالجة المخاطر" subtitle="Risk Mitigation Plan" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="المخاطرة">
              <div style={fieldRow}><Field label="وصف المخاطرة" value={d.riskDescription} w="60%" /><Field label="المستوى" value={d.riskLevel} w="20%" /><Field label="الأولوية" value={d.priority} w="20%" /></div>
            </Section>
            <NotesBox label="الآثار المحتملة" value={d.impacts} lines={2} />
            <Section title="خطة المعالجة">
              <EmptyTable cols={5} rows={6} headers={['الإجراء', 'النوع (تجنب/تخفيف/نقل/قبول)', 'المسؤول', 'الموعد', 'الحالة']} />
            </Section>
            <NotesBox label="مؤشرات الإنذار المبكر" value={d.earlyWarning} />
            <NotesBox label="خطة الطوارئ" value={d.contingency} lines={2} />
            <SignatureBlock rightLabel="مدير المخاطر" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'crisis-response':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة الاستجابة للأزمات" subtitle="Crisis Response Plan" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الأزمة">
              <div style={fieldRow}><Field label="نوع الأزمة" value={d.crisisType} w="33%" /><Field label="المستوى" value={d.level} w="33%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="34%" /></div>
            </Section>
            <NotesBox label="وصف السيناريو" value={d.scenario} lines={3} />
            <Section title="فريق الأزمات">
              <EmptyTable cols={4} rows={6} headers={['الاسم', 'الدور', 'الاتصال', 'المسؤولية']} />
            </Section>
            <Section title="إجراءات الاستجابة">
              <EmptyTable cols={4} rows={8} headers={['الخطوة', 'الإجراء', 'المسؤول', 'الإطار الزمني']} />
            </Section>
            <NotesBox label="خطة الاتصال" value={d.communicationPlan} lines={3} />
            <SignatureBlock rightLabel="مدير إدارة الأزمات" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'post-incident':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير ما بعد الحادث" subtitle="Post-Incident Report" />
          <ConfidentialBanner />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الحادث">
              <div style={fieldRow}><Field label="نوع الحادث" value={d.type} w="33%" /><Field label="التاريخ والوقت" value={d.dateTime} w="33%" /><Field label="الموقع" value={d.location} w="34%" /></div>
            </Section>
            <NotesBox label="وصف الحادث" value={d.description} lines={3} />
            <NotesBox label="الإجراءات المتخذة" value={d.actionsTaken} lines={3} />
            <NotesBox label="تحليل السبب الجذري" value={d.rootCause} lines={3} />
            <Section title="الدروس المستفادة">
              <EmptyTable cols={3} rows={4} headers={['الدرس', 'الإجراء التصحيحي', 'المسؤول']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="معد التقرير" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
