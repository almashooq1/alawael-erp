/**
 * قوالب واتساب والموبايل
 * WhatsApp & Mobile Templates
 */
import React from 'react';
import {
  OrgHeader, OrgFooter, SignatureBlock, Field, Section,
  NotesBox, EmptyTable, RefDateLine,
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const WHATSAPP_MOBILE_TEMPLATES = [
  { id: 'whatsapp-message-log', name: 'سجل رسائل واتساب', nameEn: 'WhatsApp Message Log', desc: 'سجل الرسائل المرسلة عبر واتساب', color: '#25d366' },
  { id: 'whatsapp-broadcast-report', name: 'تقرير بث واتساب', nameEn: 'WhatsApp Broadcast Report', desc: 'تقرير البث الجماعي', color: '#128c7e' },
  { id: 'whatsapp-template-registry', name: 'سجل قوالب واتساب', nameEn: 'WhatsApp Template Registry', desc: 'سجل قوالب الرسائل المعتمدة', color: '#075e54' },
  { id: 'chatbot-conversation-log', name: 'سجل محادثات الروبوت', nameEn: 'Chatbot Conversation Log', desc: 'سجل محادثات الروبوت الذكي', color: '#00bcd4' },
  { id: 'mobile-app-analytics', name: 'تحليلات التطبيق', nameEn: 'Mobile App Analytics', desc: 'تقرير تحليلات تطبيق الجوال', color: '#1565c0' },
  { id: 'mobile-crash-report', name: 'تقرير أعطال التطبيق', nameEn: 'Mobile Crash Report', desc: 'تقرير أعطال تطبيق الجوال', color: '#c62828' },
  { id: 'push-config-doc', name: 'توثيق إعدادات Push', nameEn: 'Push Config Documentation', desc: 'توثيق إعدادات الإشعارات', color: '#6a1b9a' },
  { id: 'api-rate-limit-report', name: 'تقرير حدود API', nameEn: 'API Rate Limit Report', desc: 'تقرير حدود استخدام واتساب API', color: '#e65100' },
  { id: 'delivery-status-report', name: 'تقرير حالة التوصيل', nameEn: 'Delivery Status Report', desc: 'تقرير حالة توصيل الرسائل', color: '#2e7d32' },
  { id: 'opt-in-consent-log', name: 'سجل موافقات الاشتراك', nameEn: 'Opt-In Consent Log', desc: 'سجل موافقات استقبال الرسائل', color: '#283593' },
  { id: 'whatsapp-cost-report', name: 'تقرير تكاليف واتساب', nameEn: 'WhatsApp Cost Report', desc: 'تقرير تكاليف رسائل واتساب', color: '#f57c00' },
  { id: 'mobile-user-feedback', name: 'ملاحظات مستخدمي الجوال', nameEn: 'Mobile User Feedback', desc: 'تقرير ملاحظات المستخدمين', color: '#7b1fa2' },
  { id: 'app-version-tracker', name: 'متتبع إصدارات التطبيق', nameEn: 'App Version Tracker', desc: 'متابعة إصدارات التطبيق', color: '#0277bd' },
  { id: 'mobile-device-report', name: 'تقرير أجهزة المستخدمين', nameEn: 'Mobile Device Report', desc: 'تقرير أنواع الأجهزة', color: '#455a64' },
  { id: 'wa-automation-rules', name: 'قواعد أتمتة واتساب', nameEn: 'WA Automation Rules', desc: 'توثيق قواعد الأتمتة', color: '#558b2f' },
  { id: 'mobile-security-audit', name: 'تدقيق أمان الجوال', nameEn: 'Mobile Security Audit', desc: 'تدقيق أمان تطبيق الجوال', color: '#4527a0' },
];

export const WhatsAppMobileTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'whatsapp-message-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل رسائل واتساب" subtitle="WhatsApp Message Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /><Field label="إجمالي الرسائل" value={d.totalMessages} w="12%" /></div>
            <Section title="الرسائل">
              <EmptyTable cols={6} rows={10} headers={['التاريخ', 'المستلم', 'النوع', 'القالب', 'الحالة', 'الاستجابة']} />
            </Section>
            <SignatureBlock rightLabel="مدير التواصل" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'whatsapp-broadcast-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير البث الجماعي عبر واتساب" subtitle="WhatsApp Broadcast Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الحملة" value={d.campaignName} w="25%" /><Field label="التاريخ" value={formatDate(d.date)} w="15%" /></div>
            <div style={fieldRow}><Field label="المرسل" value={d.sent} w="10%" /><Field label="تم التوصيل" value={d.delivered} w="10%" /><Field label="مقروء" value={d.read} w="10%" /><Field label="فشل" value={d.failed} w="10%" /></div>
            <Section title="التفاصيل حسب الشريحة">
              <EmptyTable cols={5} rows={6} headers={['الشريحة', 'العدد', 'التوصيل', 'القراءة', 'الاستجابة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مدير التسويق" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'whatsapp-template-registry':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل قوالب رسائل واتساب المعتمدة" subtitle="WhatsApp Template Registry" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="إجمالي القوالب" value={d.totalTemplates} w="12%" /></div>
            <Section title="القوالب">
              <EmptyTable cols={6} rows={10} headers={['القالب', 'اللغة', 'الفئة', 'الحالة', 'آخر تعديل', 'الاستخدام']} />
            </Section>
            <SignatureBlock rightLabel="مدير النظام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'chatbot-conversation-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل محادثات الروبوت الذكي" subtitle="Chatbot Conversation Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /><Field label="إجمالي المحادثات" value={d.totalConversations} w="12%" /></div>
            <Section title="المحادثات">
              <EmptyTable cols={6} rows={10} headers={['التاريخ', 'المستخدم', 'الموضوع', 'الحالة', 'التحويل', 'التقييم']} />
            </Section>
            <div style={fieldRow}><Field label="نسبة الحل" value={d.resolutionRate} w="12%" /><Field label="رضا المستخدم" value={d.satisfaction} w="12%" /></div>
            <SignatureBlock rightLabel="مدير التقنية" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'mobile-app-analytics':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تحليلات تطبيق الجوال" subtitle="Mobile App Analytics" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /><Field label="المنصة" value={d.platform} w="12%" /></div>
            <Section title="المؤشرات">
              <EmptyTable cols={5} rows={8} headers={['المؤشر', 'الحالي', 'السابق', 'التغير %', 'ملاحظات']} />
            </Section>
            <Section title="الصفحات الأكثر زيارة">
              <EmptyTable cols={4} rows={5} headers={['الصفحة', 'المشاهدات', 'المدة', 'معدل الخروج']} />
            </Section>
            <SignatureBlock rightLabel="محلل التطبيق" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'mobile-crash-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير أعطال تطبيق الجوال" subtitle="Mobile Crash Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /><Field label="إجمالي الأعطال" value={d.totalCrashes} w="12%" /><Field label="المتأثرين" value={d.affectedUsers} w="12%" /></div>
            <Section title="الأعطال">
              <EmptyTable cols={6} rows={8} headers={['الخطأ', 'الإصدار', 'الجهاز', 'التكرار', 'الأولوية', 'الحالة']} />
            </Section>
            <NotesBox label="الإجراءات" value={d.actions} lines={2} />
            <SignatureBlock rightLabel="فريق التطوير" leftLabel="مدير التقنية" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'push-config-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توثيق إعدادات الإشعارات الفورية" subtitle="Push Notification Config Documentation" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="المنصة" value={d.platform} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="إعدادات الإشعارات">
              <EmptyTable cols={5} rows={8} headers={['الحدث', 'العنوان', 'المحتوى', 'الشرط', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات تقنية" value={d.techNotes} lines={2} />
            <SignatureBlock rightLabel="مطور التطبيق" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'api-rate-limit-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حدود استخدام واتساب API" subtitle="API Rate Limit Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /><Field label="المستوى" value={d.tier} w="12%" /></div>
            <Section title="الاستخدام">
              <EmptyTable cols={5} rows={6} headers={['النوع', 'الحد', 'المستخدم', 'المتبقي', 'النسبة %']} />
            </Section>
            <NotesBox label="تحذيرات" value={d.warnings} lines={2} />
            <SignatureBlock rightLabel="مدير التقنية" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'delivery-status-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حالة توصيل الرسائل" subtitle="Delivery Status Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="إحصائيات التوصيل">
              <EmptyTable cols={5} rows={6} headers={['القناة', 'المرسل', 'تم التوصيل', 'فشل', 'النسبة %']} />
            </Section>
            <Section title="أسباب الفشل">
              <EmptyTable cols={3} rows={5} headers={['السبب', 'العدد', 'الإجراء']} />
            </Section>
            <SignatureBlock rightLabel="مدير النظام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'opt-in-consent-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل موافقات استقبال الرسائل" subtitle="Opt-In Consent Log" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="الموافقات">
              <EmptyTable cols={6} rows={10} headers={['التاريخ', 'الرقم', 'الاسم', 'النوع', 'القناة', 'الحالة']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي المشتركين" value={d.totalOptIn} w="12%" /><Field label="إلغاء الاشتراك" value={d.totalOptOut} w="12%" /></div>
            <SignatureBlock rightLabel="مسؤول الخصوصية" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'whatsapp-cost-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير تكاليف رسائل واتساب" subtitle="WhatsApp Cost Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="التكاليف">
              <EmptyTable cols={5} rows={6} headers={['نوع الرسالة', 'العدد', 'التكلفة/رسالة', 'الإجمالي', 'ملاحظات']} />
            </Section>
            <div style={fieldRow}><Field label="إجمالي التكلفة" value={d.totalCost} w="15%" /></div>
            <NotesBox label="التوصيات" value={d.recommendations} lines={1} />
            <SignatureBlock rightLabel="مدير التسويق" leftLabel="المدير المالي" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'mobile-user-feedback':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير ملاحظات مستخدمي الجوال" subtitle="Mobile User Feedback Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /><Field label="إجمالي الملاحظات" value={d.totalFeedback} w="12%" /></div>
            <Section title="الملاحظات">
              <EmptyTable cols={5} rows={8} headers={['التاريخ', 'المستخدم', 'الملاحظة', 'التقييم', 'الإجراء']} />
            </Section>
            <div style={fieldRow}><Field label="متوسط التقييم" value={d.avgRating} w="12%" /></div>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مدير المنتج" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'app-version-tracker':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="متتبع إصدارات التطبيق" subtitle="App Version Tracker" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التطبيق" value={d.appName} w="20%" /></div>
            <Section title="سجل الإصدارات">
              <EmptyTable cols={6} rows={8} headers={['الإصدار', 'التاريخ', 'المنصة', 'الميزات', 'الإصلاحات', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مدير المنتج" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'mobile-device-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير أنواع أجهزة المستخدمين" subtitle="Mobile Device Report" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="15%" /></div>
            <Section title="توزيع الأجهزة">
              <EmptyTable cols={5} rows={8} headers={['الجهاز/النظام', 'العدد', 'النسبة %', 'الإصدار', 'ملاحظات']} />
            </Section>
            <Section title="الشاشات">
              <EmptyTable cols={3} rows={4} headers={['الدقة', 'العدد', 'النسبة %']} />
            </Section>
            <SignatureBlock rightLabel="محلل التطبيق" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'wa-automation-rules':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="توثيق قواعد أتمتة واتساب" subtitle="WhatsApp Automation Rules" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /><Field label="الإصدار" value={d.version} w="10%" /></div>
            <Section title="القواعد">
              <EmptyTable cols={6} rows={8} headers={['القاعدة', 'المحفز', 'الإجراء', 'الرسالة', 'التأخير', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={1} />
            <SignatureBlock rightLabel="مدير النظام" leftLabel="" />
          </div>
          <OrgFooter />
        </div>
      );

    case 'mobile-security-audit':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تدقيق أمان تطبيق الجوال" subtitle="Mobile Security Audit" />
          <div style={bodyPad}>
            <div style={fieldRow}><Field label="التطبيق" value={d.appName} w="20%" /><Field label="الإصدار" value={d.version} w="10%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="15%" /></div>
            <Section title="نتائج التدقيق">
              <EmptyTable cols={5} rows={8} headers={['البند', 'المخاطر', 'الحالة', 'الإجراء', 'المسؤول']} />
            </Section>
            <div style={fieldRow}><Field label="المستوى العام" value={d.overallRisk} w="12%" /></div>
            <NotesBox label="التوصيات" value={d.recommendations} lines={2} />
            <SignatureBlock rightLabel="مدقق الأمان" leftLabel="مدير التقنية" />
          </div>
          <OrgFooter />
        </div>
      );

    default:
      return <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>القالب غير متوفر</div>;
  }
};
