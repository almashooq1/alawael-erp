/**
 * قوالب إدارة المستندات والتوقيع الإلكتروني والوسائط
 * Document Management, E-Signature & Media Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const DOCUMENT_MANAGEMENT_TEMPLATES = [
  /* ── إدارة المستندات ── */
  { id: 'document-cover-sheet', name: 'غلاف مستند', nameEn: 'Document Cover Sheet', desc: 'غلاف أمامي للمستندات الرسمية', color: '#37474f' },
  { id: 'document-version-history', name: 'سجل إصدارات المستند', nameEn: 'Document Version History', desc: 'سجل تتبع إصدارات المستند', color: '#455a64' },
  { id: 'document-archive-index', name: 'فهرس الأرشيف', nameEn: 'Archive Index', desc: 'فهرس المستندات المؤرشفة', color: '#546e7a' },
  { id: 'document-transmittal', name: 'محضر تسليم مستندات', nameEn: 'Document Transmittal', desc: 'محضر تسليم واستلام مستندات', color: '#607d8b' },
  { id: 'document-register', name: 'سجل المستندات', nameEn: 'Document Register', desc: 'سجل عام للمستندات والملفات', color: '#78909c' },
  /* ── التوقيع والختم الإلكتروني ── */
  { id: 'esign-request-form', name: 'طلب توقيع إلكتروني', nameEn: 'E-Signature Request', desc: 'نموذج طلب توقيع إلكتروني', color: '#1a237e' },
  { id: 'esign-verification', name: 'تحقق من التوقيع', nameEn: 'Signature Verification', desc: 'شهادة تحقق من صحة التوقيع الإلكتروني', color: '#283593' },
  { id: 'esign-audit-trail', name: 'مسار تدقيق التوقيع', nameEn: 'Signature Audit Trail', desc: 'سجل تدقيق عمليات التوقيع', color: '#303f9f' },
  { id: 'estamp-certificate', name: 'شهادة ختم إلكتروني', nameEn: 'E-Stamp Certificate', desc: 'شهادة ختم إلكتروني رسمي', color: '#3949ab' },
  { id: 'estamp-registry', name: 'سجل الأختام الإلكترونية', nameEn: 'E-Stamp Registry', desc: 'سجل الأختام الإلكترونية المعتمدة', color: '#3f51b5' },
  /* ── المسح والوسائط ── */
  { id: 'ocr-processing-report', name: 'تقرير معالجة OCR', nameEn: 'OCR Processing Report', desc: 'تقرير نتائج المسح الضوئي', color: '#4e342e' },
  { id: 'scan-batch-summary', name: 'ملخص دفعة المسح', nameEn: 'Scan Batch Summary', desc: 'ملخص دفعة مسح ضوئي', color: '#5d4037' },
  { id: 'media-album-index', name: 'فهرس ألبوم الوسائط', nameEn: 'Media Album Index', desc: 'فهرس ألبوم الصور والوسائط', color: '#6d4c41' },
  { id: 'media-usage-report', name: 'تقرير استخدام الوسائط', nameEn: 'Media Usage Report', desc: 'تقرير استخدام الوسائط المتعددة', color: '#795548' },
  { id: 'photo-release-form', name: 'نموذج موافقة التصوير', nameEn: 'Photo Release Form', desc: 'نموذج موافقة على نشر الصور', color: '#8d6e63' },
  { id: 'digital-asset-register', name: 'سجل الأصول الرقمية', nameEn: 'Digital Asset Register', desc: 'سجل الأصول الرقمية للمركز', color: '#a1887f' },
];

export const DocumentManagementTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    /* ══════════════ إدارة المستندات ══════════════ */
    case 'document-cover-sheet':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="غلاف مستند رسمي" subtitle="Official Document Cover Sheet" />
          <div style={{ ...bodyPad, textAlign: 'center' }}>
            <div style={{ margin: '40px 0', padding: 30, border: '3px double #333', borderRadius: 8 }}>
              <div style={fieldRow}><Field label="عنوان المستند" value={d.title} w="100%" /></div>
              <div style={fieldRow}><Field label="رقم المستند" value={d.docNo} w="30%" /><Field label="الإصدار" value={d.version} w="15%" /><Field label="التصنيف" value={d.classification} w="20%" /></div>
              <div style={fieldRow}><Field label="القسم المسؤول" value={d.department} w="30%" /><Field label="المعد" value={d.preparedBy} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
              <div style={fieldRow}><Field label="حالة المستند" value={d.status} w="20%" /><Field label="عدد الصفحات" value={d.pageCount} w="15%" /><Field label="المرفقات" value={d.attachments} w="15%" /></div>
            </div>
            <Section title="سجل الاعتمادات">
              <EmptyTable cols={4} rows={3} headers={['الدور', 'الاسم', 'التوقيع', 'التاريخ']} />
            </Section>
          </div>
          <OrgFooter />
        </div>
      );

    case 'document-version-history':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل إصدارات المستند" subtitle="Document Version History" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="عنوان المستند" value={d.title} w="40%" /><Field label="رقم المستند" value={d.docNo} w="20%" /></div>
            <Section title="تاريخ الإصدارات">
              <EmptyTable cols={6} rows={10} headers={['الإصدار', 'التاريخ', 'المعدّل', 'وصف التغيير', 'المراجع', 'المعتمِد']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
          </div>
          <OrgFooter />
        </div>
      );

    case 'document-archive-index':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="فهرس المستندات المؤرشفة" subtitle="Archive Document Index" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم" value={d.department} w="25%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="المسؤول" value={d.archivist} w="25%" /></div>
            <Section title="المستندات المؤرشفة">
              <EmptyTable cols={7} rows={15} headers={['#', 'رقم المستند', 'العنوان', 'التاريخ', 'الموقع', 'الفترة', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي المستندات" value={d.totalDocs} w="20%" /><Field label="تاريخ الأرشفة" value={formatDate(d.archiveDate) || today()} w="15%" /></div>
            <SignatureBlock rightLabel="أمين الأرشيف" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'document-transmittal':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="محضر تسليم واستلام مستندات" subtitle="Document Transmittal" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="من" value={d.from} w="30%" /><Field label="إلى" value={d.to} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="المستندات المسلّمة">
              <EmptyTable cols={5} rows={8} headers={['#', 'وصف المستند', 'العدد', 'نسخ أصلية/صور', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="المُسلِّم" leftLabel="المُستلِم" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'document-register':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل المستندات والملفات" subtitle="Document Register" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم" value={d.department} w="25%" /><Field label="السنة" value={d.year} w="12%" /><Field label="المسؤول" value={d.responsible} w="25%" /></div>
            <Section title="السجل">
              <EmptyTable cols={7} rows={15} headers={['رقم التسلسل', 'رقم المستند', 'العنوان', 'النوع', 'التاريخ', 'الحالة', 'موقع الحفظ']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول المستندات" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ التوقيع والختم ══════════════ */
    case 'esign-request-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="طلب توقيع إلكتروني" subtitle="E-Signature Request Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستند" value={d.documentTitle} w="35%" /><Field label="رقم المستند" value={d.docNo} w="20%" /><Field label="الأولوية" value={d.priority} w="15%" /></div>
            <div style={fieldRow}><Field label="مقدم الطلب" value={d.requester} w="25%" /><Field label="القسم" value={d.department} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="الموقعون المطلوبون">
              <EmptyTable cols={5} rows={5} headers={['الترتيب', 'الاسم', 'المنصب', 'نوع التوقيع', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مقدم الطلب" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'esign-verification':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة التحقق من التوقيع الإلكتروني" subtitle="E-Signature Verification Certificate" />
          <div style={bodyPad}>
            <div style={{ border: '2px solid #1a237e', borderRadius: 8, padding: 20, margin: '20px 0' }}>
              <div style={fieldRow}><Field label="رقم الشهادة" value={d.certNo} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
              <div style={fieldRow}><Field label="المستند" value={d.documentTitle} w="40%" /><Field label="رقم المستند" value={d.docNo} w="20%" /></div>
              <div style={fieldRow}><Field label="الموقِّع" value={d.signer} w="25%" /><Field label="تاريخ التوقيع" value={formatDate(d.signDate)} w="15%" /><Field label="الحالة" value={d.status || '✅ صحيح'} w="15%" /></div>
              <div style={fieldRow}><Field label="بصمة التوقيع" value={d.signatureHash} w="50%" /></div>
              <div style={fieldRow}><Field label="خوارزمية التشفير" value={d.algorithm} w="25%" /><Field label="صالح حتى" value={formatDate(d.validUntil)} w="15%" /></div>
            </div>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
          </div>
          <OrgFooter />
        </div>
      );

    case 'esign-audit-trail':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مسار تدقيق التوقيعات الإلكترونية" subtitle="E-Signature Audit Trail" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستند" value={d.documentTitle} w="40%" /><Field label="رقم المستند" value={d.docNo} w="20%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <Section title="سجل الأحداث">
              <EmptyTable cols={6} rows={12} headers={['التاريخ والوقت', 'الحدث', 'المستخدم', 'عنوان IP', 'الحالة', 'التفاصيل']} />
            </Section>
            <div style={fieldRow}><Field label="عدد التوقيعات" value={d.signatureCount} w="15%" /><Field label="الحالة النهائية" value={d.finalStatus} w="20%" /></div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'estamp-certificate':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة ختم إلكتروني رسمي" subtitle="Official E-Stamp Certificate" />
          <div style={bodyPad}>
            <div style={{ border: '3px double #283593', borderRadius: 10, padding: 25, margin: '20px 0', textAlign: 'center' }}>
              <div style={fieldRow}><Field label="رقم الختم" value={d.stampNo} w="25%" /><Field label="تاريخ الإصدار" value={formatDate(d.issueDate) || today()} w="15%" /></div>
              <div style={fieldRow}><Field label="المستند المختوم" value={d.documentTitle} w="40%" /><Field label="رقم المستند" value={d.docNo} w="20%" /></div>
              <div style={fieldRow}><Field label="الجهة المصدرة" value={d.issuer} w="25%" /><Field label="المخوّل" value={d.authorizedBy} w="25%" /></div>
              <div style={fieldRow}><Field label="بصمة الختم" value={d.stampHash} w="50%" /></div>
              <div style={fieldRow}><Field label="صالح من" value={formatDate(d.validFrom)} w="15%" /><Field label="صالح حتى" value={formatDate(d.validUntil)} w="15%" /></div>
            </div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'estamp-registry':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل الأختام الإلكترونية المعتمدة" subtitle="Approved E-Stamp Registry" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الجهة" value={d.organization} w="30%" /><Field label="المسؤول" value={d.responsible} w="25%" /><Field label="آخر تحديث" value={formatDate(d.lastUpdate) || today()} w="15%" /></div>
            <Section title="الأختام المعتمدة">
              <EmptyTable cols={6} rows={10} headers={['رقم الختم', 'الوصف', 'المخوّل', 'تاريخ الاعتماد', 'الحالة', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول الأختام" leftLabel="المدير" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ المسح والوسائط ══════════════ */
    case 'ocr-processing-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير معالجة المسح الضوئي" subtitle="OCR Processing Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الدفعة" value={d.batchNo} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="المشغّل" value={d.operator} w="25%" /></div>
            <div style={fieldRow}><Field label="عدد المستندات" value={d.documentCount} w="15%" /><Field label="الصفحات" value={d.pageCount} w="12%" /><Field label="دقة التعرف" value={d.accuracy} w="15%" /></div>
            <Section title="نتائج المعالجة">
              <EmptyTable cols={6} rows={8} headers={['المستند', 'الصفحات', 'الدقة %', 'الأخطاء', 'الحالة', 'ملاحظات']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="المشغّل" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'scan-batch-summary':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="ملخص دفعة المسح الضوئي" subtitle="Scan Batch Summary" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الدفعة" value={d.batchNo} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="القسم" value={d.department} w="20%" /><Field label="إجمالي المستندات" value={d.count} w="15%" /></div>
            <Section title="المحتوى">
              <EmptyTable cols={5} rows={10} headers={['#', 'وصف المستند', 'الصفحات', 'الحجم', 'الحالة']} />
            </Section>
            <div style={fieldRow}><Field label="الحجم الإجمالي" value={d.totalSize} w="15%" /><Field label="الصيغة" value={d.format} w="15%" /></div>
            <SignatureBlock rightLabel="مسؤول المسح" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'media-album-index':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="فهرس ألبوم الصور والوسائط" subtitle="Media Album Index" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="عنوان الألبوم" value={d.albumTitle} w="30%" /><Field label="الحدث" value={d.event} w="25%" /><Field label="التاريخ" value={formatDate(d.date)} w="15%" /></div>
            <Section title="المحتوى">
              <EmptyTable cols={5} rows={12} headers={['#', 'اسم الملف', 'النوع', 'الوصف', 'المصور']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الملفات" value={d.fileCount} w="15%" /><Field label="الحجم الكلي" value={d.totalSize} w="15%" /></div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'media-usage-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير استخدام الوسائط المتعددة" subtitle="Media Usage Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="المعد" value={d.preparedBy} w="25%" /></div>
            <Section title="إحصاءات الاستخدام">
              <EmptyTable cols={5} rows={6} headers={['نوع الوسائط', 'الإجمالي', 'المستخدم', 'نسبة الاستخدام', 'سعة التخزين']} />
            </Section>
            <Section title="أكثر الوسائط استخداماً">
              <EmptyTable cols={4} rows={5} headers={['الملف', 'النوع', 'مرات الاستخدام', 'آخر استخدام']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مسؤول الوسائط" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'photo-release-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج موافقة على نشر الصور" subtitle="Photo/Media Release Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الاسم" value={d.name} w="30%" /><Field label="رقم الهوية" value={d.nationalId} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <div style={fieldRow}><Field label="صفة الشخص" value={d.role} w="20%" /><Field label="اسم المستفيد (إن وُجد)" value={d.beneficiary} w="25%" /></div>
            <NotesBox label="الغرض من التصوير/النشر" value={d.purpose} lines={2} />
            <Section title="الموافقات">
              <EmptyTable cols={3} rows={4} headers={['البند', 'أوافق', 'لا أوافق']} />
            </Section>
            <NotesBox label="قيود خاصة (إن وُجدت)" value={d.restrictions} lines={2} />
            <SignatureBlock rightLabel="صاحب الموافقة / ولي الأمر" leftLabel="مسؤول الإعلام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'digital-asset-register':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل الأصول الرقمية" subtitle="Digital Asset Register" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="القسم" value={d.department} w="25%" /><Field label="المسؤول" value={d.responsible} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="الأصول الرقمية">
              <EmptyTable cols={7} rows={12} headers={['#', 'اسم الأصل', 'النوع', 'الحجم', 'الموقع', 'حق الاستخدام', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي الأصول" value={d.totalAssets} w="15%" /><Field label="السعة المستخدمة" value={d.usedStorage} w="15%" /></div>
            <SignatureBlock rightLabel="مسؤول الأصول الرقمية" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
