/**
 * قوالب طباعة المشتريات وسلسلة الإمداد — Procurement & Supply Chain Print Templates
 * يشمل: المشتريات، سلسلة الإمداد، المستودعات
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, PrintTable, EmptyTable, RefDateLine, fieldRow, bodyPad, pageWrapper,
  formatDate, formatMoney, today,
} from '../shared/PrintTemplateShared';

export const PROCUREMENT_TEMPLATES = [
  { id: 'purchase-requisition', name: 'طلب شراء', nameEn: 'Purchase Requisition', desc: 'نموذج طلب شراء داخلي', color: '#e65100' },
  { id: 'rfq', name: 'طلب عرض أسعار', nameEn: 'Request for Quotation', desc: 'طلب عرض سعر من المورد', color: '#ef6c00' },
  { id: 'vendor-comparison', name: 'مقارنة عروض الموردين', nameEn: 'Vendor Comparison Sheet', desc: 'جدول مقارنة عروض الأسعار', color: '#f57c00' },
  { id: 'tender-document', name: 'وثيقة مناقصة', nameEn: 'Tender Document', desc: 'وثيقة مناقصة رسمية', color: '#fb8c00' },
  { id: 'procurement-approval', name: 'موافقة شراء', nameEn: 'Procurement Approval', desc: 'نموذج الموافقة على الشراء', color: '#ff9800' },
  { id: 'shipping-note', name: 'إشعار شحن', nameEn: 'Shipping Note', desc: 'مذكرة شحن بضاعة', color: '#0277bd' },
  { id: 'delivery-receipt', name: 'إيصال تسليم', nameEn: 'Delivery Receipt', desc: 'سند تسليم مواد', color: '#0288d1' },
  { id: 'stock-transfer', name: 'إذن نقل مخزون', nameEn: 'Stock Transfer Note', desc: 'إذن نقل بين المستودعات', color: '#0097a7' },
  { id: 'supplier-evaluation', name: 'تقييم مورد', nameEn: 'Supplier Evaluation Form', desc: 'نموذج تقييم أداء المورد', color: '#00838f' },
  { id: 'material-request', name: 'طلب مواد', nameEn: 'Material Request', desc: 'نموذج طلب مواد من المستودع', color: '#006064' },
  { id: 'goods-receipt', name: 'سند استلام بضاعة', nameEn: 'Goods Receipt Note', desc: 'سند استلام مواد وبضائع', color: '#2e7d32' },
  { id: 'goods-issue', name: 'سند صرف بضاعة', nameEn: 'Goods Issue Note', desc: 'إذن صرف مواد من المستودع', color: '#388e3c' },
  { id: 'stock-count', name: 'كشف جرد المخزون', nameEn: 'Stock Count Sheet', desc: 'نموذج جرد المخزون', color: '#43a047' },
  { id: 'bin-card', name: 'بطاقة الصنف', nameEn: 'Bin Card', desc: 'بطاقة صنف / كرت مخزون', color: '#4caf50' },
  { id: 'warehouse-transfer', name: 'إذن تحويل مخزني', nameEn: 'Warehouse Transfer Slip', desc: 'سند تحويل بين المخازن', color: '#66bb6a' },
];

export const ProcurementTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'purchase-requisition':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="طلب شراء" subtitle="Purchase Requisition" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الطلب">
              <div style={fieldRow}><Field label="القسم الطالب" value={d.department} w="33%" /><Field label="مقدم الطلب" value={d.requestedBy} w="33%" /><Field label="الأولوية" value={d.priority} w="34%" /></div>
            </Section>
            <Section title="الأصناف المطلوبة">
              <PrintTable headers={['م', 'الصنف', 'الوصف', 'الوحدة', 'الكمية', 'ملاحظات']} rows={d.items || []} />
              {(!d.items || !d.items.length) && <EmptyTable cols={6} rows={8} headers={['م', 'الصنف', 'الوصف', 'الوحدة', 'الكمية', 'ملاحظات']} />}
            </Section>
            <NotesBox label="المبررات" value={d.justification} />
            <SignatureBlock rightLabel="مقدم الطلب" leftLabel="مدير القسم" />
            <div style={{ marginTop: 20 }}><SignatureBlock rightLabel="مدير المشتريات" leftLabel="المدير المالي" /></div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'rfq':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="طلب عرض أسعار" subtitle="Request for Quotation (RFQ)" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المورد">
              <div style={fieldRow}><Field label="اسم المورد" value={d.vendorName} w="50%" /><Field label="البريد الإلكتروني" value={d.email} w="50%" /></div>
              <div style={fieldRow}><Field label="العنوان" value={d.address} w="67%" /><Field label="الهاتف" value={d.phone} w="33%" /></div>
            </Section>
            <div style={{ margin: '16px 0', lineHeight: 1.8 }}>
              <p>نأمل منكم تزويدنا بعرض أسعار للأصناف التالية مع مراعاة التسليم قبل <strong>{formatDate(d.deadline) || '________'}</strong>:</p>
            </div>
            <Section title="الأصناف المطلوبة">
              <EmptyTable cols={6} rows={8} headers={['م', 'الصنف', 'المواصفات', 'الوحدة', 'الكمية', 'السعر المتوقع']} />
            </Section>
            <Section title="الشروط">
              <div style={fieldRow}><Field label="مدة صلاحية العرض" value={d.validity} w="33%" /><Field label="شروط الدفع" value={d.paymentTerms} w="33%" /><Field label="مدة التسليم" value={d.deliveryTime} w="34%" /></div>
            </Section>
            <SignatureBlock rightLabel="مدير المشتريات" leftLabel="ختم المركز" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'vendor-comparison':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="جدول مقارنة عروض الموردين" subtitle="Vendor Comparison Sheet" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم طلب الشراء" value={d.prNo} w="33%" /><Field label="الصنف / المشروع" value={d.item} w="67%" /></div>
            <Section title="مقارنة العروض">
              <EmptyTable cols={7} rows={6} headers={['البند', 'المورد الأول', 'المورد الثاني', 'المورد الثالث', 'أفضل سعر', 'الجودة', 'التوصية']} />
            </Section>
            <Section title="ملخص المقارنة">
              <div style={fieldRow}><Field label="المورد الموصى به" value={d.recommended} w="50%" /><Field label="سبب التوصية" value={d.reason} w="50%" /></div>
            </Section>
            <SignatureBlock rightLabel="لجنة الفحص" leftLabel="مدير المشتريات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'tender-document':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="وثيقة مناقصة" subtitle="Tender Document" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="تفاصيل المناقصة">
              <div style={fieldRow}><Field label="عنوان المناقصة" value={d.title} w="67%" /><Field label="رقم المناقصة" value={d.tenderNo} w="33%" /></div>
              <div style={fieldRow}><Field label="تاريخ الفتح" value={formatDate(d.openDate)} w="33%" /><Field label="تاريخ الإغلاق" value={formatDate(d.closeDate)} w="33%" /><Field label="الميزانية التقديرية" value={formatMoney(d.budget)} w="34%" /></div>
            </Section>
            <NotesBox label="نطاق العمل" value={d.scope} lines={6} />
            <Section title="شروط عامة">
              <NotesBox value={d.terms} lines={5} />
            </Section>
            <Section title="معايير التقييم">
              <EmptyTable cols={4} rows={5} headers={['المعيار', 'الوزن %', 'الحد الأدنى', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مدير المشتريات" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'procurement-approval':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج الموافقة على الشراء" subtitle="Procurement Approval" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="تفاصيل الطلب">
              <div style={fieldRow}><Field label="رقم طلب الشراء" value={d.prNo} w="33%" /><Field label="المورد المختار" value={d.vendor} w="34%" /><Field label="القيمة الإجمالية" value={formatMoney(d.total)} w="33%" /></div>
              <div style={fieldRow}><Field label="القسم الطالب" value={d.department} w="33%" /><Field label="بند الميزانية" value={d.budgetLine} w="34%" /><Field label="الرصيد المتاح" value={formatMoney(d.available)} w="33%" /></div>
            </Section>
            <Section title="سلسلة الموافقات">
              <EmptyTable cols={5} rows={5} headers={['المستوى', 'المسؤول', 'القرار', 'التوقيع', 'التاريخ']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} />
          </div>
          <OrgFooter />
        </div>
      );

    case 'shipping-note':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إشعار شحن" subtitle="Shipping Note" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات الشحنة">
              <div style={fieldRow}><Field label="المورد / المرسل" value={d.sender} w="50%" /><Field label="رقم أمر الشراء" value={d.poNo} w="50%" /></div>
              <div style={fieldRow}><Field label="تاريخ الشحن" value={formatDate(d.shipDate)} w="33%" /><Field label="طريقة الشحن" value={d.method} w="33%" /><Field label="رقم التتبع" value={d.trackingNo} w="34%" /></div>
            </Section>
            <Section title="محتويات الشحنة">
              <EmptyTable cols={5} rows={8} headers={['م', 'الصنف', 'الكمية', 'الوزن', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="المرسل" leftLabel="المستلم" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'delivery-receipt':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إيصال تسليم" subtitle="Delivery Receipt" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات التسليم">
              <div style={fieldRow}><Field label="الجهة المسلِّمة" value={d.deliveredBy} w="50%" /><Field label="الجهة المستلِمة" value={d.receivedBy} w="50%" /></div>
              <div style={fieldRow}><Field label="رقم أمر الشراء" value={d.poNo} w="33%" /><Field label="تاريخ التسليم" value={formatDate(d.date) || today()} w="33%" /><Field label="الحالة" value={d.condition} w="34%" /></div>
            </Section>
            <Section title="المواد المستلمة">
              <EmptyTable cols={6} rows={8} headers={['م', 'الصنف', 'الكمية المطلوبة', 'الكمية المستلمة', 'الحالة', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="أمين المستودع" leftLabel="مندوب المورد" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'stock-transfer':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إذن نقل مخزون" subtitle="Stock Transfer Note" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="من مستودع" value={d.fromWarehouse} w="50%" /><Field label="إلى مستودع" value={d.toWarehouse} w="50%" /></div>
            <div style={fieldRow}><Field label="سبب النقل" value={d.reason} w="67%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="33%" /></div>
            <Section title="الأصناف المنقولة">
              <EmptyTable cols={5} rows={8} headers={['م', 'الصنف', 'الكمية', 'الوحدة', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="أمين المستودع (المرسل)" leftLabel="أمين المستودع (المستلم)" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'supplier-evaluation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج تقييم مورد" subtitle="Supplier Evaluation Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <Section title="بيانات المورد">
              <div style={fieldRow}><Field label="اسم المورد" value={d.vendorName} w="50%" /><Field label="فئة التوريد" value={d.category} w="25%" /><Field label="الفترة" value={d.period} w="25%" /></div>
            </Section>
            <Section title="معايير التقييم">
              <EmptyTable cols={5} rows={8} headers={['المعيار', 'الوزن %', 'الدرجة (10)', 'النقاط', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="المجموع" value={d.totalScore} w="25%" /><Field label="التصنيف" value={d.rating} w="25%" /><Field label="التوصية" value={d.recommendation} w="50%" /></div>
            <SignatureBlock rightLabel="مقيّم المشتريات" leftLabel="مدير المشتريات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'material-request':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="طلب مواد من المستودع" subtitle="Material Request" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم الطالب" value={d.department} w="33%" /><Field label="مقدم الطلب" value={d.requestedBy} w="33%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="34%" /></div>
            <Section title="المواد المطلوبة">
              <EmptyTable cols={6} rows={8} headers={['م', 'الصنف', 'رقم الصنف', 'الوحدة', 'الكمية المطلوبة', 'الكمية المصروفة']} />
            </Section>
            <SignatureBlock rightLabel="مقدم الطلب" leftLabel="أمين المستودع" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'goods-receipt':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سند استلام بضاعة" subtitle="Goods Receipt Note (GRN)" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المورد" value={d.vendor} w="33%" /><Field label="رقم أمر الشراء" value={d.poNo} w="33%" /><Field label="رقم الفاتورة" value={d.invoiceNo} w="34%" /></div>
            <Section title="الأصناف المستلمة">
              <EmptyTable cols={7} rows={8} headers={['م', 'الصنف', 'الوحدة', 'الكمية المطلوبة', 'المستلمة', 'المرفوضة', 'ملاحظات']} />
            </Section>
            <NotesBox label="حالة البضاعة" value={d.condition} />
            <SignatureBlock rightLabel="أمين المستودع" leftLabel="مراقب الجودة" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'goods-issue':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إذن صرف بضاعة" subtitle="Goods Issue Note" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم المستلم" value={d.department} w="33%" /><Field label="المستلم" value={d.receivedBy} w="33%" /><Field label="الغرض" value={d.purpose} w="34%" /></div>
            <Section title="الأصناف المصروفة">
              <EmptyTable cols={6} rows={8} headers={['م', 'الصنف', 'رقم الصنف', 'الوحدة', 'الكمية', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="أمين المستودع" leftLabel="مدير القسم المستلم" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'stock-count':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="كشف جرد المخزون" subtitle="Stock Count Sheet" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستودع" value={d.warehouse} w="33%" /><Field label="نوع الجرد" value={d.countType} w="33%" /><Field label="تاريخ الجرد" value={formatDate(d.date) || today()} w="34%" /></div>
            <Section title="بيان الجرد">
              <EmptyTable cols={7} rows={12} headers={['م', 'الصنف', 'الرصيد الدفتري', 'العد الفعلي', 'الفرق', 'القيمة', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات لجنة الجرد" value={d.notes} />
            <SignatureBlock rightLabel="رئيس لجنة الجرد" leftLabel="أمين المستودع" />
            <div style={{ marginTop: 16 }}><SignatureBlock rightLabel="المراجع الداخلي" leftLabel="المدير المالي" /></div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'bin-card':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بطاقة الصنف (كرت المخزون)" subtitle="Bin Card" />
          <div style={bodyPad}>
            <Section title="بيانات الصنف">
              <div style={fieldRow}><Field label="اسم الصنف" value={d.itemName} w="40%" /><Field label="رقم الصنف" value={d.itemCode} w="20%" /><Field label="الوحدة" value={d.unit} w="20%" /><Field label="الموقع" value={d.location} w="20%" /></div>
              <div style={fieldRow}><Field label="الحد الأدنى" value={d.minQty} w="25%" /><Field label="الحد الأقصى" value={d.maxQty} w="25%" /><Field label="نقطة إعادة الطلب" value={d.reorderPoint} w="50%" /></div>
            </Section>
            <Section title="حركة المخزون">
              <EmptyTable cols={7} rows={15} headers={['التاريخ', 'البيان', 'مرجع', 'وارد', 'صادر', 'الرصيد', 'التوقيع']} />
            </Section>
          </div>
          <OrgFooter />
        </div>
      );

    case 'warehouse-transfer':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إذن تحويل مخزني" subtitle="Warehouse Transfer Slip" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="من مخزن" value={d.fromStore} w="50%" /><Field label="إلى مخزن" value={d.toStore} w="50%" /></div>
            <div style={fieldRow}><Field label="السبب" value={d.reason} w="67%" /><Field label="الموافقة" value={d.approvedBy} w="33%" /></div>
            <Section title="الأصناف">
              <EmptyTable cols={5} rows={8} headers={['م', 'الصنف', 'الوحدة', 'الكمية', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مُسلِّم" leftLabel="مُستلِم" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
