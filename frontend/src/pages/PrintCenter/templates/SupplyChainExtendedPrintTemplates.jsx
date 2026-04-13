/**
 * قوالب سلسلة التوريد الموسعة
 * Supply Chain Extended Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today, formatMoney,
} from '../shared/PrintTemplateShared';

export const SUPPLY_CHAIN_EXTENDED_TEMPLATES = [
  { id: 'demand-forecast', name: 'توقعات الطلب', nameEn: 'Demand Forecast Report', desc: 'تقرير توقعات الطلب على المواد', color: '#1565c0' },
  { id: 'supplier-scorecard', name: 'بطاقة أداء المورد', nameEn: 'Supplier Scorecard', desc: 'تقييم أداء الموردين', color: '#1976d2' },
  { id: 'warehouse-layout', name: 'مخطط المستودع', nameEn: 'Warehouse Layout Plan', desc: 'توثيق تخطيط المستودع', color: '#1e88e5' },
  { id: 'reorder-point-report', name: 'تقرير نقاط إعادة الطلب', nameEn: 'Reorder Point Report', desc: 'تقرير مستويات إعادة الطلب', color: '#0277bd' },
  { id: 'vendor-comparison', name: 'مقارنة عروض الموردين', nameEn: 'Vendor Comparison Sheet', desc: 'ورقة مقارنة عروض أسعار', color: '#00695c' },
  { id: 'abc-analysis', name: 'تحليل ABC للمخزون', nameEn: 'ABC Inventory Analysis', desc: 'تصنيف المخزون حسب القيمة', color: '#2e7d32' },
  { id: 'shipping-manifest', name: 'بيان الشحنة', nameEn: 'Shipping Manifest', desc: 'بيان محتويات الشحنة', color: '#e65100' },
  { id: 'customs-clearance', name: 'إذن التخليص الجمركي', nameEn: 'Customs Clearance Form', desc: 'نموذج التخليص الجمركي', color: '#c62828' },
  { id: 'inbound-quality-check', name: 'فحص جودة الوارد', nameEn: 'Inbound Quality Inspection', desc: 'فحص جودة المواد الواردة', color: '#6a1b9a' },
  { id: 'bin-location-map', name: 'خريطة مواقع التخزين', nameEn: 'Bin Location Map', desc: 'خريطة أماكن التخزين بالمستودع', color: '#7b1fa2' },
  { id: 'safety-stock-report', name: 'تقرير مخزون الأمان', nameEn: 'Safety Stock Report', desc: 'مستويات مخزون الأمان', color: '#283593' },
  { id: 'material-wastage', name: 'تقرير هدر المواد', nameEn: 'Material Wastage Report', desc: 'تقرير هدر المواد والأصناف', color: '#f57c00' },
  { id: 'lead-time-analysis', name: 'تحليل أوقات التوريد', nameEn: 'Lead Time Analysis', desc: 'تحليل أزمنة توصيل الموردين', color: '#455a64' },
  { id: 'consignment-note', name: 'إذن أمانة', nameEn: 'Consignment Note', desc: 'إذن بضاعة أمانة', color: '#558b2f' },
  { id: 'scrap-disposal-form', name: 'نموذج التخلص من التالف', nameEn: 'Scrap Disposal Form', desc: 'نموذج إتلاف وتخريد المواد', color: '#4527a0' },
  { id: 'procurement-pipeline', name: 'خط أنابيب المشتريات', nameEn: 'Procurement Pipeline', desc: 'تتبع مراحل عمليات الشراء', color: '#303f9f' },
];

export const SupplyChainExtendedTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'demand-forecast':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير توقعات الطلب" subtitle="Demand Forecast Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /><Field label="الفئة" value={d.category} w="20%" /></div>
            <Section title="توقعات الطلب">
              <EmptyTable cols={6} rows={10} headers={['الصنف', 'الاستهلاك السابق', 'المتوسط', 'المتوقع', 'التغير %', 'ملاحظات']} />
            </Section>
            <NotesBox label="عوامل مؤثرة" value={d.factors} lines={2} />
            <SignatureBlock rightLabel="مدير المشتريات" leftLabel="مدير العمليات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'supplier-scorecard':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بطاقة أداء المورد" subtitle="Supplier Scorecard" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المورد" value={d.supplierName} w="25%" /><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="معايير التقييم">
              <EmptyTable cols={5} rows={8} headers={['المعيار', 'الوزن %', 'الدرجة', 'المرجح', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="الدرجة الإجمالية" value={d.totalScore} w="15%" /><Field label="التصنيف" value={d.rating} w="15%" /></div>
            <NotesBox label="نقاط القوة" value={d.strengths} lines={1} />
            <NotesBox label="نقاط التحسين" value={d.improvements} lines={1} />
            <SignatureBlock rightLabel="مدير المشتريات" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'warehouse-layout':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مخطط تخطيط المستودع" subtitle="Warehouse Layout Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستودع" value={d.warehouseName} w="25%" /><Field label="المساحة" value={d.area} w="12%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="مناطق التخزين">
              <EmptyTable cols={6} rows={8} headers={['المنطقة', 'النوع', 'السعة', 'المستخدم', 'المتاح', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات السلامة" value={d.safetyNotes} lines={2} />
            <SignatureBlock rightLabel="مدير المستودع" leftLabel="مدير العمليات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'reorder-point-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير نقاط إعادة الطلب" subtitle="Reorder Point Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="الأصناف">
              <EmptyTable cols={6} rows={10} headers={['الصنف', 'الرصيد الحالي', 'نقطة إعادة الطلب', 'الحد الأدنى', 'الحالة', 'إجراء']} />
            </Section>
            <NotesBox label="أصناف تحت الحد" value={d.belowMin} lines={2} />
            <SignatureBlock rightLabel="مدير المستودع" leftLabel="مدير المشتريات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'vendor-comparison':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ورقة مقارنة عروض الموردين" subtitle="Vendor Comparison Sheet" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الصنف/الخدمة" value={d.itemDesc} w="30%" /></div>
            <Section title="العروض المقدمة">
              <EmptyTable cols={6} rows={6} headers={['المورد', 'السعر', 'المدة', 'الضمان', 'الشروط', 'التقييم']} />
            </Section>
            <NotesBox label="التوصية" value={d.recommendation} lines={2} />
            <SignatureBlock rightLabel="لجنة المشتريات" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'abc-analysis':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تحليل ABC للمخزون" subtitle="ABC Inventory Analysis" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="الفئة A (عالية القيمة)">
              <EmptyTable cols={4} rows={5} headers={['الصنف', 'الكمية', 'القيمة', 'النسبة %']} />
            </Section>
            <Section title="الفئة B (متوسطة)">
              <EmptyTable cols={4} rows={5} headers={['الصنف', 'الكمية', 'القيمة', 'النسبة %']} />
            </Section>
            <Section title="الفئة C (منخفضة)">
              <EmptyTable cols={4} rows={5} headers={['الصنف', 'الكمية', 'القيمة', 'النسبة %']} />
            </Section>
            <SignatureBlock rightLabel="مدير المستودع" leftLabel="المراقب المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'shipping-manifest':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="بيان محتويات الشحنة" subtitle="Shipping Manifest" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الشاحن" value={d.shipper} w="25%" /><Field label="المستلم" value={d.receiver} w="25%" /></div>
            <div style={fieldRow}><Field label="وسيلة النقل" value={d.transport} w="15%" /><Field label="رقم التتبع" value={d.trackingNo} w="20%" /></div>
            <Section title="المحتويات">
              <EmptyTable cols={5} rows={8} headers={['الصنف', 'الكمية', 'الوزن', 'الأبعاد', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="المُرسل" leftLabel="المستلم" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'customs-clearance':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج التخليص الجمركي" subtitle="Customs Clearance Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم البوليصة" value={d.billOfLading} w="20%" /><Field label="بلد المنشأ" value={d.origin} w="15%" /><Field label="الميناء" value={d.port} w="15%" /></div>
            <Section title="البضائع">
              <EmptyTable cols={6} rows={6} headers={['الصنف', 'الكمية', 'القيمة', 'الرسوم', 'HS Code', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي القيمة" value={formatMoney(d.totalValue)} w="15%" /><Field label="إجمالي الرسوم" value={formatMoney(d.totalDuties)} w="15%" /></div>
            <SignatureBlock rightLabel="المخلص الجمركي" leftLabel="مدير المشتريات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'inbound-quality-check':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="فحص جودة المواد الواردة" subtitle="Inbound Quality Inspection" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المورد" value={d.supplier} w="25%" /><Field label="أمر الشراء" value={d.poNumber} w="15%" /></div>
            <Section title="نتائج الفحص">
              <EmptyTable cols={6} rows={8} headers={['الصنف', 'الكمية', 'المقبول', 'المرفوض', 'السبب', 'القرار']} />
            </Section>
            <div style={fieldRow}><Field label="نسبة القبول" value={d.acceptRate} w="12%" /></div>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مراقب الجودة" leftLabel="مدير المستودع" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'bin-location-map':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خريطة مواقع التخزين" subtitle="Bin Location Map" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستودع" value={d.warehouse} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="مواقع التخزين">
              <EmptyTable cols={6} rows={10} headers={['الموقع', 'الممر', 'الرف', 'الصنف', 'الكمية', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مدير المستودع" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'safety-stock-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير مخزون الأمان" subtitle="Safety Stock Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="مستويات مخزون الأمان">
              <EmptyTable cols={6} rows={10} headers={['الصنف', 'الحالي', 'مخزون الأمان', 'الفرق', 'الاتجاه', 'إجراء']} />
            </Section>
            <NotesBox label="أصناف حرجة" value={d.criticalItems} lines={2} />
            <SignatureBlock rightLabel="مدير المستودع" leftLabel="مدير المشتريات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'material-wastage':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير هدر المواد" subtitle="Material Wastage Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="المواد المهدرة">
              <EmptyTable cols={6} rows={8} headers={['الصنف', 'الكمية', 'القيمة', 'السبب', 'القسم', 'إجراء']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي قيمة الهدر" value={formatMoney(d.totalWaste)} w="15%" /><Field label="النسبة من المخزون" value={d.wastePercent} w="12%" /></div>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مراقب المستودع" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'lead-time-analysis':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تحليل أزمنة توصيل الموردين" subtitle="Lead Time Analysis" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="التحليل">
              <EmptyTable cols={6} rows={8} headers={['المورد', 'المتوسط (أيام)', 'الأدنى', 'الأقصى', 'الالتزام %', 'الاتجاه']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مدير المشتريات" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'consignment-note':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إذن بضاعة أمانة" subtitle="Consignment Note" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المورد" value={d.supplier} w="25%" /><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="الأصناف">
              <EmptyTable cols={5} rows={6} headers={['الصنف', 'الكمية', 'سعر الوحدة', 'الإجمالي', 'ملاحظات']} />
            </Section>
            <NotesBox label="الشروط" value={d.terms} lines={2} />
            <SignatureBlock rightLabel="المورد" leftLabel="مدير المستودع" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'scrap-disposal-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج إتلاف وتخريد المواد" subtitle="Scrap Disposal Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="سبب الإتلاف" value={d.reason} w="30%" /></div>
            <Section title="المواد المراد إتلافها">
              <EmptyTable cols={5} rows={6} headers={['الصنف', 'الكمية', 'القيمة الدفترية', 'سبب التخريد', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي القيمة" value={formatMoney(d.totalValue)} w="15%" /></div>
            <NotesBox label="طريقة الإتلاف" value={d.disposalMethod} lines={1} />
            <SignatureBlock rightLabel="لجنة الإتلاف" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'procurement-pipeline':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تتبع مراحل عمليات الشراء" subtitle="Procurement Pipeline" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="العمليات الجارية">
              <EmptyTable cols={6} rows={10} headers={['الطلب', 'الصنف/الخدمة', 'المرحلة', 'القيمة', 'المتوقع', 'المسؤول']} />
            </Section>
            <NotesBox label="عمليات متأخرة" value={d.delayed} lines={2} />
            <SignatureBlock rightLabel="مدير المشتريات" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
