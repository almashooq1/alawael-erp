/**
 * قوالب التجارة الإلكترونية والبلوك تشين — E-Commerce, CMS, Blockchain & Gamification Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today, formatMoney,
} from '../shared/PrintTemplateShared';

export const ECOMMERCE_BLOCKCHAIN_TEMPLATES = [
  /* ── التجارة الإلكترونية ── */
  { id: 'ecom-order', name: 'أمر شراء إلكتروني', nameEn: 'E-Commerce Order', desc: 'نموذج أمر الشراء الإلكتروني', color: '#e65100' },
  { id: 'ecom-invoice', name: 'فاتورة إلكترونية', nameEn: 'E-Invoice', desc: 'فاتورة البيع الإلكترونية', color: '#ef6c00' },
  { id: 'ecom-return', name: 'طلب إرجاع', nameEn: 'Return Request', desc: 'نموذج طلب إرجاع منتج', color: '#f57c00' },
  { id: 'ecom-analytics', name: 'تحليلات المتجر', nameEn: 'Store Analytics', desc: 'تقرير تحليلات المتجر الإلكتروني', color: '#fb8c00' },
  /* ── إدارة المحتوى ── */
  { id: 'cms-content-plan', name: 'خطة محتوى', nameEn: 'Content Plan', desc: 'خطة المحتوى الرقمي', color: '#ad1457' },
  { id: 'cms-publish-approval', name: 'موافقة نشر', nameEn: 'Publish Approval', desc: 'نموذج موافقة نشر محتوى', color: '#c2185b' },
  /* ── البلوك تشين ── */
  { id: 'blockchain-cert', name: 'شهادة بلوك تشين', nameEn: 'Blockchain Certificate', desc: 'شهادة موثقة على البلوك تشين', color: '#1a237e' },
  { id: 'blockchain-audit-trail', name: 'سجل تدقيق بلوك تشين', nameEn: 'Blockchain Audit Trail', desc: 'سجل التدقيق على البلوك تشين', color: '#283593' },
  /* ── الألعاب والتحفيز ── */
  { id: 'gamification-leaderboard', name: 'لوحة المتصدرين', nameEn: 'Leaderboard Report', desc: 'تقرير لوحة المتصدرين', color: '#ff6f00' },
  { id: 'achievement-badge', name: 'شارة إنجاز', nameEn: 'Achievement Badge', desc: 'شهادة شارة إنجاز', color: '#ff8f00' },
  { id: 'gamification-report', name: 'تقرير التحفيز', nameEn: 'Gamification Report', desc: 'تقرير نظام التحفيز والمكافآت', color: '#ffa000' },
  { id: 'points-statement', name: 'كشف نقاط', nameEn: 'Points Statement', desc: 'كشف حساب النقاط', color: '#ffb300' },
];

export const EcommerceBlockchainTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'ecom-order':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="أمر شراء إلكتروني" subtitle="E-Commerce Order" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الطلب" value={d.orderNo} w="15%" /><Field label="العميل" value={d.customerName} w="30%" /><Field label="البريد" value={d.email} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <div style={fieldRow}><Field label="الجوال" value={d.phone} w="20%" /><Field label="عنوان الشحن" value={d.shippingAddress} w="40%" /><Field label="طريقة الدفع" value={d.paymentMethod} w="20%" /></div>
            <Section title="المنتجات">
              <EmptyTable cols={6} rows={6} headers={['المنتج', 'الكمية', 'سعر الوحدة', 'الإجمالي', 'الخصم', 'الصافي']} />
            </Section>
            <div style={{ ...fieldRow, justifyContent: 'flex-end' }}>
              <Field label="المجموع الفرعي" value={formatMoney(d.subtotal)} w="20%" />
              <Field label="الشحن" value={formatMoney(d.shipping)} w="15%" />
              <Field label="الضريبة" value={formatMoney(d.tax)} w="15%" />
              <Field label="الإجمالي" value={formatMoney(d.total)} w="20%" />
            </div>
            <SignatureBlock rightLabel="العميل" leftLabel="مسؤول المبيعات" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'ecom-invoice':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="فاتورة إلكترونية" subtitle="Electronic Invoice" />
          <RefDateLine refNo={d.invoiceNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الفاتورة" value={d.invoiceNo} w="20%" /><Field label="رقم الطلب" value={d.orderNo} w="15%" /><Field label="العميل" value={d.customerName} w="30%" /><Field label="الرقم الضريبي" value={d.taxNo} w="20%" /></div>
            <Section title="البنود">
              <EmptyTable cols={5} rows={8} headers={['الوصف', 'الكمية', 'السعر', 'الضريبة', 'الإجمالي']} />
            </Section>
            <div style={{ ...fieldRow, justifyContent: 'flex-end' }}>
              <Field label="المجموع قبل الضريبة" value={formatMoney(d.subtotal)} w="25%" />
              <Field label="ضريبة القيمة المضافة 15%" value={formatMoney(d.vat)} w="25%" />
              <Field label="الإجمالي" value={formatMoney(d.total)} w="20%" />
            </div>
            <div style={{ textAlign: 'center', margin: '12px 0', fontSize: 10, color: '#666' }}>
              فاتورة ضريبية مبسطة وفقاً لمتطلبات هيئة الزكاة والضريبة والجمارك (ZATCA)
            </div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'ecom-return':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="طلب إرجاع منتج" subtitle="Product Return Request" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="رقم الإرجاع" value={d.returnNo} w="15%" /><Field label="رقم الطلب الأصلي" value={d.originalOrderNo} w="15%" /><Field label="العميل" value={d.customerName} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="المنتجات المراد إرجاعها">
              <EmptyTable cols={5} rows={5} headers={['المنتج', 'الكمية', 'السعر', 'سبب الإرجاع', 'الحالة']} />
            </Section>
            <NotesBox label="تفاصيل إضافية" value={d.details} lines={2} />
            <div style={fieldRow}><Field label="المبلغ المسترد" value={formatMoney(d.refundAmount)} w="25%" /><Field label="طريقة الاسترداد" value={d.refundMethod} w="25%" /><Field label="القرار" value={d.decision} w="20%" /></div>
            <SignatureBlock rightLabel="العميل" leftLabel="مسؤول الإرجاع" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'ecom-analytics':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تحليلات المتجر الإلكتروني" subtitle="E-Commerce Analytics Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="إجمالي الطلبات" value={d.totalOrders} w="15%" /><Field label="الإيرادات" value={formatMoney(d.revenue)} w="20%" /><Field label="معدل التحويل" value={d.conversionRate} w="15%" /></div>
            <Section title="أعلى المنتجات مبيعاً">
              <EmptyTable cols={4} rows={5} headers={['المنتج', 'الكمية', 'الإيرادات', 'النسبة %']} />
            </Section>
            <Section title="مصادر الزيارات">
              <EmptyTable cols={4} rows={5} headers={['المصدر', 'الزيارات', 'الطلبات', 'معدل التحويل']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مسؤول التسويق" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'cms-content-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة المحتوى الرقمي" subtitle="Digital Content Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="المسؤول" value={d.contentManager} w="25%" /><Field label="المنصات" value={d.platforms} w="30%" /></div>
            <Section title="خطة المحتوى">
              <EmptyTable cols={6} rows={10} headers={['التاريخ', 'المنصة', 'نوع المحتوى', 'الموضوع', 'المسؤول', 'الحالة']} />
            </Section>
            <NotesBox label="أهداف الفترة" value={d.goals} lines={2} />
            <SignatureBlock rightLabel="مدير المحتوى" leftLabel="مدير التسويق" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'cms-publish-approval':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج موافقة نشر محتوى" subtitle="Content Publish Approval" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="عنوان المحتوى" value={d.contentTitle} w="40%" /><Field label="المنصة" value={d.platform} w="20%" /><Field label="النوع" value={d.contentType} w="15%" /><Field label="تاريخ النشر" value={formatDate(d.publishDate)} w="15%" /></div>
            <NotesBox label="ملخص المحتوى" value={d.summary} lines={3} />
            <NotesBox label="الجمهور المستهدف" value={d.targetAudience} lines={1} />
            <Section title="مراحل المراجعة">
              <EmptyTable cols={4} rows={4} headers={['المرحلة', 'المراجع', 'القرار', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="معد المحتوى" leftLabel="المعتمد" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ البلوك تشين ══════════════ */
    case 'blockchain-cert':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة موثقة على البلوك تشين" subtitle="Blockchain Verified Certificate" />
          <div style={bodyPad}>
            <div style={{ textAlign: 'center', margin: '20px auto', padding: 24, border: '3px solid #1a237e', borderRadius: 12, maxWidth: 500, background: '#e8eaf6' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a237e', marginBottom: 16 }}>🔐 شهادة موثقة رقمياً</div>
              <div style={fieldRow}><Field label="المستفيد" value={d.recipientName} w="50%" /><Field label="نوع الشهادة" value={d.certType} w="50%" /></div>
              <div style={fieldRow}><Field label="تاريخ الإصدار" value={formatDate(d.issueDate) || today()} w="50%" /><Field label="رقم الشهادة" value={d.certNo} w="50%" /></div>
              <div style={fieldRow}><Field label="Hash" value={d.txHash} w="100%" /></div>
              <div style={fieldRow}><Field label="Block #" value={d.blockNumber} w="50%" /><Field label="الشبكة" value={d.network || 'Private'} w="50%" /></div>
            </div>
            <div style={{ fontSize: 10, textAlign: 'center', color: '#666', marginTop: 12 }}>
              يمكن التحقق من صحة هذه الشهادة عبر إدخال رقم Hash في بوابة التحقق.
            </div>
          </div>
          <OrgFooter />
        </div>
      );

    case 'blockchain-audit-trail':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل تدقيق البلوك تشين" subtitle="Blockchain Audit Trail" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المستند/العملية" value={d.documentRef} w="35%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="عدد المعاملات" value={d.transactionCount} w="15%" /></div>
            <Section title="سجل المعاملات">
              <EmptyTable cols={6} rows={10} headers={['التاريخ/الوقت', 'نوع العملية', 'المستخدم', 'Block #', 'Hash', 'الحالة']} />
            </Section>
            <SignatureBlock rightLabel="مسؤول النظام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    /* ══════════════ التحفيز ══════════════ */
    case 'gamification-leaderboard':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير لوحة المتصدرين" subtitle="Leaderboard Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="الفئة" value={d.category} w="25%" /><Field label="إجمالي المشاركين" value={d.totalParticipants} w="20%" /></div>
            <Section title="ترتيب المتصدرين">
              <EmptyTable cols={6} rows={10} headers={['المركز', 'الاسم', 'القسم', 'النقاط', 'الشارات', 'الإنجازات']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مسؤول التحفيز" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'achievement-badge':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="شهادة شارة إنجاز" subtitle="Achievement Badge Certificate" />
          <div style={bodyPad}>
            <div style={{ textAlign: 'center', margin: '30px auto', padding: 24, border: '3px solid #ff6f00', borderRadius: 16, maxWidth: 400, background: '#fff8e1' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#ff6f00', marginBottom: 12 }}>شارة إنجاز</div>
              <div style={fieldRow}><Field label="الحاصل" value={d.recipientName} w="100%" /></div>
              <div style={fieldRow}><Field label="الشارة" value={d.badgeName} w="50%" /><Field label="المستوى" value={d.level} w="50%" /></div>
              <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="50%" /><Field label="النقاط" value={d.points} w="50%" /></div>
              <NotesBox label="سبب المنح" value={d.reason} lines={2} />
            </div>
            <SignatureBlock rightLabel="مسؤول التحفيز" leftLabel="المدير" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'gamification-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير نظام التحفيز والمكافآت" subtitle="Gamification & Rewards Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="المشاركون الفعالون" value={d.activeUsers} w="20%" /><Field label="إجمالي النقاط" value={d.totalPoints} w="20%" /><Field label="الشارات الممنوحة" value={d.badgesAwarded} w="20%" /></div>
            <Section title="أعلى 5 إنجازات">
              <EmptyTable cols={4} rows={5} headers={['الإنجاز', 'العدد', 'النقاط', 'ملاحظات']} />
            </Section>
            <Section title="النشاط حسب القسم">
              <EmptyTable cols={5} rows={5} headers={['القسم', 'المشاركون', 'النقاط', 'الشارات', 'المكافآت']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مسؤول التحفيز" leftLabel="مدير الموارد البشرية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'points-statement':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="كشف حساب النقاط" subtitle="Points Statement" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الاسم" value={d.employeeName} w="30%" /><Field label="الرقم الوظيفي" value={d.empNo} w="15%" /><Field label="القسم" value={d.department} w="20%" /><Field label="الفترة" value={d.period} w="20%" /></div>
            <div style={fieldRow}><Field label="الرصيد السابق" value={d.previousBalance} w="20%" /><Field label="النقاط المكتسبة" value={d.earned} w="20%" /><Field label="النقاط المصروفة" value={d.spent} w="20%" /><Field label="الرصيد الحالي" value={d.currentBalance} w="20%" /></div>
            <Section title="تفاصيل الحركات">
              <EmptyTable cols={5} rows={10} headers={['التاريخ', 'النشاط', 'النقاط (+/-)', 'الرصيد', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="الموظف" leftLabel="مسؤول التحفيز" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
