/**
 * قوالب الرعاية المتكاملة والتعرف الضوئي
 * Integrated Care & OCR/Document Analytics Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const INTEGRATED_CARE_OCR_TEMPLATES = [
  { id: 'care-pathway-doc', name: 'مسار الرعاية المتكاملة', nameEn: 'Integrated Care Pathway', desc: 'وثيقة مسار الرعاية المتكاملة', color: '#00695c' },
  { id: 'care-coordination', name: 'تنسيق الرعاية', nameEn: 'Care Coordination Form', desc: 'نموذج تنسيق الرعاية بين الأقسام', color: '#00796b' },
  { id: 'multidisciplinary-meeting', name: 'اجتماع الفريق متعدد التخصصات', nameEn: 'Multidisciplinary Team Meeting', desc: 'محضر اجتماع الفريق متعدد التخصصات', color: '#00897b' },
  { id: 'care-transition', name: 'انتقال الرعاية', nameEn: 'Care Transition Form', desc: 'نموذج انتقال الرعاية بين المراحل', color: '#009688' },
  { id: 'integrated-assessment', name: 'تقييم متكامل', nameEn: 'Integrated Assessment Form', desc: 'نموذج التقييم المتكامل للحالة', color: '#26a69a' },
  { id: 'care-plan-summary', name: 'ملخص خطة الرعاية', nameEn: 'Care Plan Summary', desc: 'ملخص خطة الرعاية الشاملة', color: '#4db6ac' },
  { id: 'patient-handoff', name: 'تسليم المريض', nameEn: 'Patient Handoff Form', desc: 'نموذج تسليم واستلام المريض', color: '#80cbc4' },
  { id: 'care-outcome-report', name: 'تقرير نتائج الرعاية', nameEn: 'Care Outcome Report', desc: 'تقرير نتائج ومخرجات الرعاية', color: '#1565c0' },
  { id: 'ocr-scan-log', name: 'سجل المسح الضوئي', nameEn: 'OCR Scan Log', desc: 'سجل عمليات المسح الضوئي', color: '#37474f' },
  { id: 'document-digitization', name: 'رقمنة وثائق', nameEn: 'Document Digitization Form', desc: 'نموذج طلب رقمنة مستندات', color: '#455a64' },
  { id: 'ocr-accuracy-report', name: 'تقرير دقة OCR', nameEn: 'OCR Accuracy Report', desc: 'تقرير دقة التعرف الضوئي', color: '#546e7a' },
  { id: 'document-classification', name: 'تصنيف المستندات', nameEn: 'Document Classification Report', desc: 'تقرير تصنيف المستندات الممسوحة', color: '#607d8b' },
  { id: 'archive-index', name: 'فهرس الأرشيف', nameEn: 'Archive Index Report', desc: 'تقرير فهرس الأرشيف الرقمي', color: '#78909c' },
  { id: 'data-extraction', name: 'استخراج البيانات', nameEn: 'Data Extraction Report', desc: 'تقرير استخراج البيانات من المستندات', color: '#6a1b9a' },
  { id: 'document-analytics', name: 'تحليلات المستندات', nameEn: 'Document Analytics Report', desc: 'تقرير تحليلات المستندات', color: '#4527a0' },
  { id: 'ocr-batch-report', name: 'تقرير دفعة OCR', nameEn: 'OCR Batch Processing Report', desc: 'تقرير معالجة دفعة المسح الضوئي', color: '#283593' },
];

export const IntegratedCareOCRTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'care-pathway-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مسار الرعاية المتكاملة" subtitle="Integrated Care Pathway" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم المريض" value={d.patientName} w="30%" /><Field label="رقم الملف" value={d.fileNo} w="20%" /><Field label="التشخيص" value={d.diagnosis} w="30%" /></div>
            <Section title="مراحل المسار">
              <EmptyTable cols={5} rows={6} headers={['المرحلة', 'القسم المسؤول', 'المدة', 'الإجراءات', 'معايير الانتقال']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={3} />
            <SignatureBlock rightLabel="الطبيب المعالج" leftLabel="منسق الرعاية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'care-coordination':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تنسيق الرعاية" subtitle="Care Coordination Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="المريض" value={d.patientName} w="30%" /><Field label="المنسق" value={d.coordinator} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="الأقسام المشاركة">
              <EmptyTable cols={4} rows={5} headers={['القسم', 'المسؤول', 'الدور', 'الحالة']} />
            </Section>
            <Section title="خطة التنسيق">
              <EmptyTable cols={4} rows={4} headers={['الإجراء', 'الموعد', 'المسؤول', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="المنسق" leftLabel="الطبيب المعالج" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'multidisciplinary-meeting':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="محضر اجتماع الفريق متعدد التخصصات" subtitle="Multidisciplinary Team Meeting" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="المريض" value={d.patientName} w="30%" /><Field label="التاريخ" value={formatDate(d.meetingDate) || today()} w="20%" /><Field label="الرئيس" value={d.chairperson} w="25%" /></div>
            <Section title="الحضور">
              <EmptyTable cols={3} rows={6} headers={['الاسم', 'التخصص', 'القسم']} />
            </Section>
            <Section title="القرارات والتوصيات">
              <EmptyTable cols={4} rows={5} headers={['القرار', 'المسؤول', 'الموعد', 'الأولوية']} />
            </Section>
            <SignatureBlock rightLabel="رئيس الاجتماع" leftLabel="المنسق" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'care-transition':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="انتقال الرعاية" subtitle="Care Transition Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="المريض" value={d.patientName} w="25%" /><Field label="من" value={d.fromUnit} w="25%" /><Field label="إلى" value={d.toUnit} w="25%" /><Field label="التاريخ" value={formatDate(d.transitionDate) || today()} w="20%" /></div>
            <Section title="ملخص الحالة">
              <NotesBox label="التشخيص والعلاج الحالي" value={d.currentTreatment} lines={3} />
            </Section>
            <Section title="خطة الانتقال">
              <EmptyTable cols={4} rows={5} headers={['البند', 'الحالة', 'التعليمات', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="الوحدة المحولة" leftLabel="الوحدة المستقبلة" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'integrated-assessment':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="التقييم المتكامل للحالة" subtitle="Integrated Assessment Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="المريض" value={d.patientName} w="30%" /><Field label="رقم الملف" value={d.fileNo} w="20%" /><Field label="تاريخ التقييم" value={formatDate(d.assessDate) || today()} w="25%" /></div>
            <Section title="محاور التقييم">
              <EmptyTable cols={5} rows={8} headers={['المحور', 'الحالة', 'الدرجة', 'الملاحظة', 'التوصية']} />
            </Section>
            <NotesBox label="الملخص العام" value={d.summary} lines={3} />
            <SignatureBlock rightLabel="فريق التقييم" leftLabel="الطبيب المعالج" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'care-plan-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص خطة الرعاية" subtitle="Care Plan Summary" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="المريض" value={d.patientName} w="30%" /><Field label="التشخيص" value={d.diagnosis} w="30%" /><Field label="المدة" value={d.duration} w="20%" /></div>
            <Section title="خطة الرعاية">
              <EmptyTable cols={5} rows={6} headers={['المكون', 'الوصف', 'المسؤول', 'الجدول', 'الحالة']} />
            </Section>
            <Section title="الأهداف">
              <EmptyTable cols={3} rows={4} headers={['الهدف', 'المؤشر', 'الموعد']} />
            </Section>
            <SignatureBlock rightLabel="الطبيب المعالج" leftLabel="المريض/الوصي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'patient-handoff':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تسليم واستلام المريض" subtitle="Patient Handoff Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="المريض" value={d.patientName} w="25%" /><Field label="رقم الملف" value={d.fileNo} w="15%" /><Field label="المسلّم" value={d.fromStaff} w="25%" /><Field label="المستلم" value={d.toStaff} w="25%" /></div>
            <Section title="ملخص الحالة">
              <EmptyTable cols={4} rows={5} headers={['البند', 'القيمة', 'الملاحظة', 'إجراء مطلوب']} />
            </Section>
            <NotesBox label="تعليمات خاصة" value={d.specialInstructions} lines={3} />
            <SignatureBlock rightLabel="المسلّم" leftLabel="المستلم" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'care-outcome-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير نتائج الرعاية" subtitle="Care Outcome Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="القسم" value={d.department} w="25%" /><Field label="المعد" value={d.preparedBy} w="25%" /></div>
            <Section title="مؤشرات النتائج">
              <EmptyTable cols={5} rows={6} headers={['المؤشر', 'الهدف', 'المتحقق', 'الفرق', 'ملاحظات']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={3} />
            <SignatureBlock rightLabel="مدير الجودة" leftLabel="المدير الطبي" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'ocr-scan-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل المسح الضوئي" subtitle="OCR Scan Log" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="المشغّل" value={d.operator} w="25%" /><Field label="عدد الوثائق" value={d.docCount} w="20%" /></div>
            <Section title="سجل المسح">
              <EmptyTable cols={6} rows={10} headers={['التاريخ', 'رقم الوثيقة', 'النوع', 'الدقة', 'الحالة', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="المشغّل" leftLabel="مدير الأرشيف" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'document-digitization':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="طلب رقمنة مستندات" subtitle="Document Digitization Request" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الطالب" value={d.requester} w="30%" /><Field label="القسم" value={d.department} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="المستندات المطلوب رقمنتها">
              <EmptyTable cols={5} rows={6} headers={['الوصف', 'العدد', 'النوع', 'الأولوية', 'ملاحظات']} />
            </Section>
            <NotesBox label="متطلبات خاصة" value={d.requirements} lines={3} />
            <SignatureBlock rightLabel="الطالب" leftLabel="مدير الأرشيف" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'ocr-accuracy-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير دقة التعرف الضوئي" subtitle="OCR Accuracy Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="العينة" value={d.sampleSize} w="20%" /><Field label="الدقة العامة" value={d.overallAccuracy} w="20%" /></div>
            <Section title="الدقة حسب النوع">
              <EmptyTable cols={5} rows={6} headers={['نوع المستند', 'العدد', 'الدقة', 'الأخطاء', 'التوصية']} />
            </Section>
            <NotesBox label="التحليل" value={d.analysis} lines={3} />
            <SignatureBlock rightLabel="محلل الجودة" leftLabel="مدير التقنية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'document-classification':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تصنيف المستندات الممسوحة" subtitle="Document Classification Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="إجمالي المستندات" value={d.totalDocs} w="20%" /><Field label="المصنّف" value={d.classifier} w="25%" /></div>
            <Section title="التصنيف">
              <EmptyTable cols={5} rows={8} headers={['الفئة', 'العدد', 'النسبة', 'الدقة', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="المصنّف" leftLabel="مدير الأرشيف" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'archive-index':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="فهرس الأرشيف الرقمي" subtitle="Digital Archive Index" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="القسم" value={d.department} w="25%" /><Field label="الفترة" value={d.period} w="25%" /><Field label="إجمالي الوثائق" value={d.totalDocs} w="20%" /></div>
            <Section title="فهرس الوثائق">
              <EmptyTable cols={6} rows={10} headers={['رقم', 'العنوان', 'النوع', 'التاريخ', 'الحجم', 'المرجع']} />
            </Section>
            <SignatureBlock rightLabel="أمين الأرشيف" leftLabel="المدير" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'data-extraction':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير استخراج البيانات" subtitle="Data Extraction Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="المصدر" value={d.source} w="30%" /><Field label="عدد المستندات" value={d.docCount} w="20%" /><Field label="الدقة" value={d.accuracy} w="20%" /></div>
            <Section title="البيانات المستخرجة">
              <EmptyTable cols={5} rows={8} headers={['الحقل', 'القيمة', 'الثقة', 'التحقق', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="محلل البيانات" leftLabel="مدير النظام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'document-analytics':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تحليلات المستندات" subtitle="Document Analytics Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="إجمالي المستندات" value={d.totalDocs} w="20%" /><Field label="المعد" value={d.preparedBy} w="30%" /></div>
            <Section title="إحصائيات المستندات">
              <EmptyTable cols={5} rows={6} headers={['الفئة', 'العدد', 'الحجم', 'معدل المعالجة', 'ملاحظات']} />
            </Section>
            <Section title="الاتجاهات">
              <EmptyTable cols={4} rows={4} headers={['المؤشر', 'الحالي', 'السابق', 'التغيير']} />
            </Section>
            <SignatureBlock rightLabel="محلل البيانات" leftLabel="مدير التقنية" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'ocr-batch-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير معالجة دفعة OCR" subtitle="OCR Batch Processing Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="رقم الدفعة" value={d.batchNo} w="20%" /><Field label="التاريخ" value={formatDate(d.processDate) || today()} w="20%" /><Field label="العدد" value={d.docCount} w="15%" /><Field label="الدقة" value={d.accuracy} w="15%" /></div>
            <Section title="تفاصيل المعالجة">
              <EmptyTable cols={5} rows={8} headers={['المستند', 'الحجم', 'الدقة', 'الوقت', 'الحالة']} />
            </Section>
            <NotesBox label="المشاكل والحلول" value={d.issues} lines={3} />
            <SignatureBlock rightLabel="المشغّل" leftLabel="مدير التقنية" />
          </div>
          <OrgFooter />
        </div>
      );
    default:
      return <div style={pageWrapper}><OrgHeader title="قالب الرعاية المتكاملة و OCR" /><div style={bodyPad}><p>لا يوجد قالب مطابق</p></div><OrgFooter /></div>;
  }
};
