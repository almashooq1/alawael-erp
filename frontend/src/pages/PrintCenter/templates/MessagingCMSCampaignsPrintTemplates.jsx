/**
 * قوالب المراسلات وإدارة المحتوى والحملات
 * Messaging, CMS & Campaigns Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const MESSAGING_CMS_CAMPAIGNS_TEMPLATES = [
  { id: 'sms-campaign-plan', name: 'خطة حملة رسائل SMS', nameEn: 'SMS Campaign Plan', desc: 'تخطيط حملة رسائل نصية', color: '#1565c0' },
  { id: 'email-campaign-report', name: 'تقرير حملة بريد إلكتروني', nameEn: 'Email Campaign Report', desc: 'تقرير نتائج حملة البريد', color: '#1976d2' },
  { id: 'push-notification-log', name: 'سجل الإشعارات الفورية', nameEn: 'Push Notification Log', desc: 'سجل الإشعارات المرسلة', color: '#1e88e5' },
  { id: 'content-calendar', name: 'تقويم المحتوى', nameEn: 'Content Calendar', desc: 'تقويم نشر المحتوى الرقمي', color: '#7b1fa2' },
  { id: 'cms-page-inventory', name: 'جرد صفحات CMS', nameEn: 'CMS Page Inventory', desc: 'جرد صفحات نظام إدارة المحتوى', color: '#9c27b0' },
  { id: 'social-media-plan', name: 'خطة وسائل التواصل', nameEn: 'Social Media Plan', desc: 'خطة نشر وسائل التواصل', color: '#e91e63' },
  { id: 'newsletter-template', name: 'قالب النشرة البريدية', nameEn: 'Newsletter Template', desc: 'قالب النشرة البريدية الشهرية', color: '#00695c' },
  { id: 'audience-segmentation', name: 'تصنيف الجمهور', nameEn: 'Audience Segmentation Report', desc: 'تقرير تقسيم الجمهور المستهدف', color: '#2e7d32' },
  { id: 'campaign-roi-report', name: 'تقرير العائد على الحملات', nameEn: 'Campaign ROI Report', desc: 'تقرير عائد الاستثمار', color: '#e65100' },
  { id: 'marketing-budget', name: 'ميزانية التسويق', nameEn: 'Marketing Budget Report', desc: 'تقرير ميزانية التسويق الرقمي', color: '#f57c00' },
  { id: 'unsubscribe-report', name: 'تقرير إلغاء الاشتراك', nameEn: 'Unsubscribe Report', desc: 'تقرير إلغاء اشتراكات القوائم', color: '#c62828' },
  { id: 'broadcast-log', name: 'سجل البث الجماعي', nameEn: 'Broadcast Message Log', desc: 'سجل الرسائل الجماعية', color: '#283593' },
  { id: 'content-approval-form', name: 'نموذج اعتماد محتوى', nameEn: 'Content Approval Form', desc: 'نموذج اعتماد نشر المحتوى', color: '#0277bd' },
  { id: 'media-asset-register', name: 'سجل الأصول المرئية', nameEn: 'Media Asset Register', desc: 'سجل الأصول المرئية والوسائط', color: '#4527a0' },
  { id: 'engagement-analytics', name: 'تحليل التفاعل', nameEn: 'Engagement Analytics Report', desc: 'تقرير تحليل التفاعل الرقمي', color: '#558b2f' },
  { id: 'ab-campaign-test', name: 'اختبار حملات A/B', nameEn: 'A/B Campaign Test Report', desc: 'نتائج اختبار الحملات', color: '#455a64' },
];

export const MessagingCMSCampaignsTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'sms-campaign-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة حملة رسائل SMS" subtitle="SMS Campaign Plan" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="اسم الحملة" value={d.campaignName} w="30%" /><Field label="الفترة" value={d.period} w="15%" /><Field label="الميزانية" value={d.budget} w="12%" /></div>
            <div style={fieldRow}><Field label="الجمهور المستهدف" value={d.targetAudience} w="30%" /><Field label="العدد المقدر" value={d.estimatedCount} w="15%" /></div>
            <Section title="جدول الرسائل">
              <EmptyTable cols={5} rows={6} headers={['الرسالة', 'التوقيت', 'الشريحة', 'العدد', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مدير التسويق" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'email-campaign-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حملة البريد الإلكتروني" subtitle="Email Campaign Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الحملة" value={d.campaignName} w="25%" /><Field label="تاريخ الإرسال" value={formatDate(d.sendDate)} w="15%" /></div>
            <div style={fieldRow}><Field label="المرسل" value={d.sent} w="10%" /><Field label="مفتوح" value={d.opened} w="10%" /><Field label="نقرات" value={d.clicks} w="10%" /><Field label="إلغاء" value={d.unsubscribed} w="10%" /></div>
            <Section title="أداء الروابط">
              <EmptyTable cols={4} rows={6} headers={['الرابط', 'النقرات', 'النسبة %', 'ملاحظات']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مدير التسويق" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'push-notification-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل الإشعارات الفورية" subtitle="Push Notification Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="الإشعارات المرسلة">
              <EmptyTable cols={6} rows={10} headers={['التاريخ', 'العنوان', 'المنصة', 'المستلمين', 'التفاعل', 'الحالة']} />
            </Section>
            <SignatureBlock rightLabel="مدير التقنية" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'content-calendar':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقويم نشر المحتوى الرقمي" subtitle="Content Calendar" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الشهر" value={d.month} w="15%" /><Field label="المسؤول" value={d.manager} w="20%" /></div>
            <Section title="جدول المحتوى">
              <EmptyTable cols={6} rows={12} headers={['التاريخ', 'المحتوى', 'القناة', 'المسؤول', 'الحالة', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مدير المحتوى" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'cms-page-inventory':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="جرد صفحات نظام إدارة المحتوى" subtitle="CMS Page Inventory" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="إجمالي الصفحات" value={d.totalPages} w="12%" /></div>
            <Section title="الصفحات">
              <EmptyTable cols={6} rows={10} headers={['الصفحة', 'القسم', 'آخر تحديث', 'المسؤول', 'الحالة', 'الزيارات']} />
            </Section>
            <NotesBox label="صفحات تحتاج تحديث" value={d.needsUpdate} lines={2} />
            <SignatureBlock rightLabel="مدير المحتوى" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'social-media-plan':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="خطة نشر وسائل التواصل الاجتماعي" subtitle="Social Media Plan" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الشهر" value={d.month} w="12%" /><Field label="المنصات" value={d.platforms} w="30%" /></div>
            <Section title="المنشورات المخططة">
              <EmptyTable cols={6} rows={10} headers={['التاريخ', 'المنصة', 'المحتوى', 'النوع', 'الوقت', 'الحالة']} />
            </Section>
            <NotesBox label="الهاشتاقات" value={d.hashtags} lines={1} />
            <SignatureBlock rightLabel="مدير التواصل" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'newsletter-template':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="قالب النشرة البريدية الشهرية" subtitle="Monthly Newsletter" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الإصدار" value={d.issue} w="10%" /><Field label="الشهر" value={d.month} w="12%" /><Field label="المحرر" value={d.editor} w="20%" /></div>
            <Section title="المحتويات">
              <EmptyTable cols={4} rows={6} headers={['الموضوع', 'الكاتب', 'القسم', 'ملاحظات']} />
            </Section>
            <NotesBox label="كلمة الرئيس" value={d.editorial} lines={3} />
            <SignatureBlock rightLabel="المحرر" leftLabel="المدير العام" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'audience-segmentation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تقسيم الجمهور المستهدف" subtitle="Audience Segmentation Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="الإجمالي" value={d.totalAudience} w="12%" /></div>
            <Section title="الشرائح">
              <EmptyTable cols={5} rows={8} headers={['الشريحة', 'العدد', 'النسبة %', 'المعايير', 'القناة المفضلة']} />
            </Section>
            <NotesBox label="توصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="محلل التسويق" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'campaign-roi-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير عائد الاستثمار على الحملات" subtitle="Campaign ROI Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="الحملات">
              <EmptyTable cols={6} rows={8} headers={['الحملة', 'التكلفة', 'العائد', 'ROI %', 'الوصول', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي التكلفة" value={d.totalCost} w="15%" /><Field label="إجمالي العائد" value={d.totalReturn} w="15%" /></div>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مدير التسويق" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'marketing-budget':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير ميزانية التسويق الرقمي" subtitle="Marketing Budget Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /><Field label="الميزانية الإجمالية" value={d.totalBudget} w="15%" /></div>
            <Section title="توزيع الميزانية">
              <EmptyTable cols={5} rows={8} headers={['البند', 'المخصص', 'المصروف', 'المتبقي', 'النسبة %']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مدير التسويق" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'unsubscribe-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير إلغاء اشتراكات القوائم" subtitle="Unsubscribe Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /><Field label="إجمالي الإلغاء" value={d.totalUnsub} w="12%" /></div>
            <Section title="التفاصيل">
              <EmptyTable cols={5} rows={8} headers={['القائمة', 'الإلغاءات', 'النسبة %', 'السبب الأكثر', 'إجراء']} />
            </Section>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مدير التسويق" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'broadcast-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل الرسائل الجماعية" subtitle="Broadcast Message Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="الرسائل">
              <EmptyTable cols={6} rows={10} headers={['التاريخ', 'القناة', 'الموضوع', 'المستلمين', 'الحالة', 'بواسطة']} />
            </Section>
            <SignatureBlock rightLabel="مدير التواصل" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'content-approval-form':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نموذج اعتماد نشر المحتوى" subtitle="Content Approval Form" />
          <RefDateLine refNo={d.refNo} date={d.date} />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="عنوان المحتوى" value={d.contentTitle} w="30%" /><Field label="القناة" value={d.channel} w="15%" /><Field label="تاريخ النشر" value={formatDate(d.publishDate)} w="15%" /></div>
            <div style={fieldRow}><Field label="الكاتب" value={d.author} w="20%" /><Field label="القسم" value={d.department} w="20%" /></div>
            <NotesBox label="ملخص المحتوى" value={d.summary} lines={3} />
            <NotesBox label="ملاحظات المراجع" value={d.reviewerNotes} lines={2} />
            <SignatureBlock rightLabel="المراجع" leftLabel="المعتمد" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'media-asset-register':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل الأصول المرئية والوسائط" subtitle="Media Asset Register" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="الأصول">
              <EmptyTable cols={6} rows={10} headers={['الملف', 'النوع', 'الحجم', 'المالك', 'الترخيص', 'الاستخدام']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مدير الوسائط" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'engagement-analytics':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تحليل التفاعل الرقمي" subtitle="Engagement Analytics Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="مؤشرات التفاعل">
              <EmptyTable cols={6} rows={8} headers={['القناة', 'المشاهدات', 'الإعجاب', 'المشاركات', 'التعليقات', 'معدل التفاعل']} />
            </Section>
            <NotesBox label="المحتوى الأفضل أداءً" value={d.topContent} lines={2} />
            <NotesBox label="التوصيات" value={d.recommendations} lines={1} />
            <SignatureBlock rightLabel="محلل التسويق" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'ab-campaign-test':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير اختبار حملات A/B" subtitle="A/B Campaign Test Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الحملة" value={d.campaignName} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="النتائج">
              <EmptyTable cols={6} rows={6} headers={['المتغير', 'النسخة A', 'النسخة B', 'الفارق', 'الأهمية', 'الفائز']} />
            </Section>
            <NotesBox label="الخلاصة" value={d.conclusion} lines={2} />
            <SignatureBlock rightLabel="محلل التسويق" leftLabel="مدير التسويق" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
