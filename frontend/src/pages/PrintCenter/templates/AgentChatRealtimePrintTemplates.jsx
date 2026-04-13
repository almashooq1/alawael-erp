/**
 * قوالب الوكيل الذكي والدردشة والبث المباشر
 * Intelligent Agent, Chat & Realtime Templates
 */
import {
  fieldRow, bodyPad, pageWrapper, formatDate, today,
} from '../shared/PrintTemplateShared';

export const AGENT_CHAT_REALTIME_TEMPLATES = [
  { id: 'agent-config-doc', name: 'إعداد الوكيل الذكي', nameEn: 'Agent Configuration Document', desc: 'وثيقة إعداد وتكوين الوكيل الذكي', color: '#1565c0' },
  { id: 'agent-knowledge-base', name: 'قاعدة معرفة الوكيل', nameEn: 'Agent Knowledge Base', desc: 'وثيقة قاعدة المعرفة للوكيل الذكي', color: '#0d47a1' },
  { id: 'agent-performance-log', name: 'سجل أداء الوكيل', nameEn: 'Agent Performance Log', desc: 'سجل أداء وإحصائيات الوكيل', color: '#1976d2' },
  { id: 'agent-training-doc', name: 'تدريب الوكيل', nameEn: 'Agent Training Document', desc: 'وثيقة تدريب وتحسين الوكيل', color: '#1e88e5' },
  { id: 'chat-transcript', name: 'نسخة المحادثة', nameEn: 'Chat Transcript', desc: 'نسخة مكتوبة من المحادثة', color: '#2e7d32' },
  { id: 'chat-analytics', name: 'تحليلات الدردشة', nameEn: 'Chat Analytics Report', desc: 'تقرير تحليلات المحادثات', color: '#388e3c' },
  { id: 'chat-escalation', name: 'تصعيد محادثة', nameEn: 'Chat Escalation Form', desc: 'نموذج تصعيد محادثة للمشرف', color: '#c62828' },
  { id: 'chat-feedback', name: 'تقييم المحادثة', nameEn: 'Chat Feedback Form', desc: 'نموذج تقييم جودة المحادثة', color: '#e65100' },
  { id: 'realtime-alert-config', name: 'إعداد التنبيهات المباشرة', nameEn: 'Realtime Alert Configuration', desc: 'وثيقة إعداد التنبيهات الفورية', color: '#6a1b9a' },
  { id: 'realtime-dashboard-config', name: 'إعداد لوحة البث المباشر', nameEn: 'Realtime Dashboard Config', desc: 'وثيقة إعداد لوحة المتابعة المباشرة', color: '#4527a0' },
  { id: 'notification-log', name: 'سجل الإشعارات', nameEn: 'Notification Log', desc: 'سجل الإشعارات المرسلة', color: '#283593' },
  { id: 'secretary-task-log', name: 'سجل مهام السكرتير', nameEn: 'Secretary AI Task Log', desc: 'سجل مهام السكرتير الذكي', color: '#37474f' },
  { id: 'whatsapp-campaign', name: 'حملة واتساب', nameEn: 'WhatsApp Campaign Report', desc: 'تقرير حملة الرسائل عبر واتساب', color: '#2e7d32' },
  { id: 'sms-notification-log', name: 'سجل الرسائل النصية', nameEn: 'SMS Notification Log', desc: 'سجل إشعارات الرسائل النصية', color: '#00695c' },
  { id: 'bot-conversation-flow', name: 'مسار محادثة البوت', nameEn: 'Bot Conversation Flow', desc: 'وثيقة مسار محادثة البوت', color: '#0277bd' },
  { id: 'agent-incident-report', name: 'تقرير حادثة الوكيل', nameEn: 'Agent Incident Report', desc: 'تقرير حادثة أو خلل في الوكيل', color: '#bf360c' },
];

export const AgentChatRealtimeTemplateRenderer = ({ templateId, data = {} }) => {
  const d = data;
  switch (templateId) {
    case 'agent-config-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إعداد الوكيل الذكي" subtitle="Agent Configuration Document" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم الوكيل" value={d.agentName} w="30%" /><Field label="الإصدار" value={d.version} w="15%" /><Field label="الحالة" value={d.status} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="الإعدادات">
              <EmptyTable cols={4} rows={6} headers={['الإعداد', 'القيمة', 'الوصف', 'ملاحظات']} />
            </Section>
            <Section title="المهارات والقدرات">
              <EmptyTable cols={3} rows={5} headers={['المهارة', 'المستوى', 'الوصف']} />
            </Section>
            <SignatureBlock rightLabel="مدير النظام" leftLabel="المدير التقني" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'agent-knowledge-base':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="قاعدة معرفة الوكيل" subtitle="Agent Knowledge Base" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الوكيل" value={d.agentName} w="30%" /><Field label="عدد المقالات" value={d.articleCount} w="20%" /><Field label="آخر تحديث" value={formatDate(d.lastUpdate)} w="25%" /></div>
            <Section title="فهرس المعرفة">
              <EmptyTable cols={5} rows={8} headers={['القسم', 'الموضوع', 'المقالات', 'آخر تحديث', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات التحسين" value={d.improvementNotes} lines={3} />
            <SignatureBlock rightLabel="محرر المحتوى" leftLabel="مدير النظام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'agent-performance-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل أداء الوكيل الذكي" subtitle="Agent Performance Log" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الوكيل" value={d.agentName} w="25%" /><Field label="الفترة" value={d.period} w="20%" /><Field label="إجمالي التفاعلات" value={d.totalInteractions} w="20%" /><Field label="معدل الحل" value={d.resolutionRate} w="20%" /></div>
            <Section title="إحصائيات الأداء">
              <EmptyTable cols={5} rows={6} headers={['المؤشر', 'الحالي', 'السابق', 'التغيير', 'الهدف']} />
            </Section>
            <Section title="أبرز الأخطاء">
              <EmptyTable cols={4} rows={4} headers={['الخطأ', 'التكرار', 'الأثر', 'الإجراء']} />
            </Section>
            <SignatureBlock rightLabel="محلل الأداء" leftLabel="مدير النظام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'agent-training-doc':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تدريب الوكيل الذكي" subtitle="Agent Training Document" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الوكيل" value={d.agentName} w="25%" /><Field label="دورة التدريب" value={d.trainingCycle} w="20%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="بيانات التدريب">
              <EmptyTable cols={4} rows={6} headers={['المجموعة', 'العدد', 'الدقة قبل', 'الدقة بعد']} />
            </Section>
            <NotesBox label="ملاحظات التحسين" value={d.notes} lines={3} />
            <SignatureBlock rightLabel="مدرب الوكيل" leftLabel="مدير النظام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'chat-transcript':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="نسخة المحادثة" subtitle="Chat Transcript" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="رقم المحادثة" value={d.chatId} w="25%" /><Field label="المستخدم" value={d.userName} w="25%" /><Field label="الوكيل" value={d.agentName} w="20%" /><Field label="المدة" value={d.duration} w="15%" /></div>
            <Section title="المحادثة">
              <EmptyTable cols={4} rows={12} headers={['الوقت', 'المرسل', 'الرسالة', 'ملاحظة']} />
            </Section>
            <div style={fieldRow}><Field label="التقييم" value={d.rating} w="15%" /><Field label="الحالة" value={d.status} w="20%" /></div>
            <SignatureBlock rightLabel="المشرف" leftLabel="مدير الخدمة" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'chat-analytics':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تحليلات الدردشة" subtitle="Chat Analytics Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="إجمالي المحادثات" value={d.totalChats} w="20%" /><Field label="معدل الرضا" value={d.satisfactionRate} w="20%" /></div>
            <Section title="إحصائيات المحادثات">
              <EmptyTable cols={5} rows={6} headers={['المؤشر', 'القيمة', 'المقارنة', 'التغيير', 'الهدف']} />
            </Section>
            <Section title="أكثر المواضيع">
              <EmptyTable cols={3} rows={5} headers={['الموضوع', 'التكرار', 'معدل الحل']} />
            </Section>
            <SignatureBlock rightLabel="محلل البيانات" leftLabel="مدير الخدمة" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'chat-escalation':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تصعيد محادثة" subtitle="Chat Escalation Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="رقم المحادثة" value={d.chatId} w="20%" /><Field label="المستخدم" value={d.userName} w="25%" /><Field label="السبب" value={d.reason} w="30%" /></div>
            <div style={fieldRow}><Field label="الأولوية" value={d.priority} w="20%" /><Field label="المصعّد إليه" value={d.escalatedTo} w="30%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <NotesBox label="تفاصيل التصعيد" value={d.details} lines={4} />
            <NotesBox label="الإجراء المطلوب" value={d.requiredAction} lines={3} />
            <SignatureBlock rightLabel="الوكيل" leftLabel="المشرف" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'chat-feedback':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقييم جودة المحادثة" subtitle="Chat Quality Feedback Form" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="رقم المحادثة" value={d.chatId} w="20%" /><Field label="المقيّم" value={d.evaluator} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="معايير التقييم">
              <EmptyTable cols={4} rows={6} headers={['المعيار', 'الدرجة (1-5)', 'التعليق', 'مجال التحسين']} />
            </Section>
            <NotesBox label="تعليقات عامة" value={d.generalComments} lines={3} />
            <SignatureBlock rightLabel="المقيّم" leftLabel="مدير الجودة" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'realtime-alert-config':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إعداد التنبيهات الفورية" subtitle="Realtime Alert Configuration" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="النظام" value={d.system} w="30%" /><Field label="الإصدار" value={d.version} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="قواعد التنبيه">
              <EmptyTable cols={5} rows={6} headers={['التنبيه', 'الشرط', 'المستلمون', 'القناة', 'الأولوية']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="مدير النظام" leftLabel="المدير التقني" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'realtime-dashboard-config':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="إعداد لوحة المتابعة المباشرة" subtitle="Realtime Dashboard Configuration" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم اللوحة" value={d.dashboardName} w="30%" /><Field label="المالك" value={d.owner} w="25%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="المكونات">
              <EmptyTable cols={5} rows={6} headers={['المكون', 'النوع', 'مصدر البيانات', 'التحديث', 'الحالة']} />
            </Section>
            <NotesBox label="ملاحظات" value={d.notes} lines={2} />
            <SignatureBlock rightLabel="المصمم" leftLabel="مدير النظام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'notification-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل الإشعارات" subtitle="Notification Log" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="إجمالي الإشعارات" value={d.totalNotifications} w="20%" /><Field label="المعد" value={d.preparedBy} w="25%" /></div>
            <Section title="سجل الإشعارات">
              <EmptyTable cols={6} rows={10} headers={['التاريخ', 'النوع', 'المستلم', 'القناة', 'الحالة', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مدير النظام" leftLabel="المدير التقني" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'secretary-task-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل مهام السكرتير الذكي" subtitle="Secretary AI Task Log" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="عدد المهام" value={d.taskCount} w="20%" /><Field label="معدل الإنجاز" value={d.completionRate} w="20%" /></div>
            <Section title="المهام">
              <EmptyTable cols={6} rows={10} headers={['التاريخ', 'المهمة', 'الطالب', 'الحالة', 'المدة', 'النتيجة']} />
            </Section>
            <SignatureBlock rightLabel="مدير النظام" leftLabel="المدير التقني" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'whatsapp-campaign':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حملة واتساب" subtitle="WhatsApp Campaign Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم الحملة" value={d.campaignName} w="30%" /><Field label="التاريخ" value={formatDate(d.campaignDate)} w="20%" /><Field label="المستهدفون" value={d.targetCount} w="20%" /></div>
            <Section title="إحصائيات الحملة">
              <EmptyTable cols={5} rows={5} headers={['المؤشر', 'المرسلة', 'المستلمة', 'المقروءة', 'الردود']} />
            </Section>
            <NotesBox label="التحليل والتوصيات" value={d.analysis} lines={3} />
            <SignatureBlock rightLabel="مدير الحملة" leftLabel="مدير التسويق" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'sms-notification-log':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="سجل الرسائل النصية" subtitle="SMS Notification Log" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الفترة" value={d.period} w="25%" /><Field label="إجمالي الرسائل" value={d.totalSMS} w="20%" /><Field label="معدل التسليم" value={d.deliveryRate} w="20%" /></div>
            <Section title="سجل الرسائل">
              <EmptyTable cols={5} rows={10} headers={['التاريخ', 'المستلم', 'الموضوع', 'الحالة', 'ملاحظات']} />
            </Section>
            <SignatureBlock rightLabel="مدير النظام" leftLabel="المدير التقني" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'bot-conversation-flow':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="مسار محادثة البوت" subtitle="Bot Conversation Flow" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="اسم البوت" value={d.botName} w="25%" /><Field label="المسار" value={d.flowName} w="25%" /><Field label="الإصدار" value={d.version} w="15%" /><Field label="التاريخ" value={formatDate(d.date) || today()} w="20%" /></div>
            <Section title="خطوات المسار">
              <EmptyTable cols={5} rows={8} headers={['الخطوة', 'نوع العقدة', 'الرسالة', 'الشروط', 'الانتقال']} />
            </Section>
            <NotesBox label="ملاحظات التصميم" value={d.designNotes} lines={3} />
            <SignatureBlock rightLabel="مصمم البوت" leftLabel="مدير النظام" />
          </div>
          <OrgFooter />
        </div>
      );
    case 'agent-incident-report':
      return (
        <div style={pageWrapper}>
          <OrgHeader title="تقرير حادثة الوكيل" subtitle="Agent Incident Report" />
          <div style={bodyPad}>
            <RefDateLine refNo={d.refNo} date={d.date} />
            <div style={fieldRow}><Field label="الوكيل" value={d.agentName} w="25%" /><Field label="نوع الحادثة" value={d.incidentType} w="25%" /><Field label="الخطورة" value={d.severity} w="15%" /><Field label="التاريخ" value={formatDate(d.incidentDate) || today()} w="20%" /></div>
            <NotesBox label="وصف الحادثة" value={d.description} lines={4} />
            <Section title="الإجراءات التصحيحية">
              <EmptyTable cols={4} rows={4} headers={['الإجراء', 'المسؤول', 'الموعد', 'الحالة']} />
            </Section>
            <NotesBox label="التوصيات الوقائية" value={d.preventiveActions} lines={3} />
            <SignatureBlock rightLabel="المحلل" leftLabel="مدير النظام" />
          </div>
          <OrgFooter />
        </div>
      );
    default:
      return <div style={pageWrapper}><OrgHeader title="قالب الوكيل والدردشة" /><div style={bodyPad}><p>لا يوجد قالب مطابق</p></div><OrgFooter /></div>;
  }
};
