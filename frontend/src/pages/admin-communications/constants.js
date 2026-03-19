/**
 * Administrative Communications Constants — ثوابت الاتصالات الإدارية
 * ─── متوافقة مع Backend Enums ───
 */

// أنواع المراسلات (متطابق مع CorrespondenceType في السيرفر)
export const CORRESPONDENCE_TYPES = {
  internal_memo: {
    label: 'مذكرة داخلية',
    labelEn: 'Internal Memo',
    color: '#ed6c02',
    bg: '#fff3e0',
  },
  official_letter: {
    label: 'خطاب رسمي',
    labelEn: 'Official Letter',
    color: '#1976d2',
    bg: '#e3f2fd',
  },
  circular: { label: 'تعميم', labelEn: 'Circular', color: '#0288d1', bg: '#e1f5fe' },
  decision: { label: 'قرار', labelEn: 'Decision', color: '#7b1fa2', bg: '#f3e5f5' },
  report: { label: 'تقرير', labelEn: 'Report', color: '#558b2f', bg: '#f1f8e9' },
  request: { label: 'طلب', labelEn: 'Request', color: '#f57c00', bg: '#fff3e0' },
  response: { label: 'رد', labelEn: 'Response', color: '#2e7d32', bg: '#e8f5e9' },
  notification: { label: 'إشعار', labelEn: 'Notification', color: '#0097a7', bg: '#e0f7fa' },
  contract: { label: 'عقد', labelEn: 'Contract', color: '#5d4037', bg: '#efebe9' },
  invitation: { label: 'دعوة', labelEn: 'Invitation', color: '#c2185b', bg: '#fce4ec' },
  minutes: { label: 'محضر', labelEn: 'Minutes', color: '#455a64', bg: '#eceff1' },
};

// اتجاه المراسلة (incoming / outgoing / internal) — يُستخدم في الفلترة والعرض
export const DIRECTION = {
  incoming: { label: 'وارد', labelEn: 'Incoming', color: '#1976d2', bg: '#e3f2fd' },
  outgoing: { label: 'صادر', labelEn: 'Outgoing', color: '#2e7d32', bg: '#e8f5e9' },
  internal: { label: 'داخلي', labelEn: 'Internal', color: '#ed6c02', bg: '#fff3e0' },
};

// حالات المراسلات (متطابق مع Status في السيرفر)
export const CORRESPONDENCE_STATUS = {
  draft: { label: 'مسودة', color: 'default', icon: 'Drafts' },
  pending_review: { label: 'قيد المراجعة', color: 'warning', icon: 'RateReview' },
  pending_approval: { label: 'قيد الاعتماد', color: 'warning', icon: 'PendingActions' },
  approved: { label: 'معتمد', color: 'success', icon: 'CheckCircle' },
  rejected: { label: 'مرفوض', color: 'error', icon: 'Cancel' },
  sent: { label: 'مُرسل', color: 'primary', icon: 'Send' },
  received: { label: 'مُستلم', color: 'info', icon: 'MarkunreadMailbox' },
  in_progress: { label: 'قيد التنفيذ', color: 'info', icon: 'Pending' },
  completed: { label: 'مكتمل', color: 'success', icon: 'TaskAlt' },
  archived: { label: 'مؤرشف', color: 'default', icon: 'Archive' },
  cancelled: { label: 'ملغي', color: 'error', icon: 'DoNotDisturb' },
};

// مستويات الأولوية (متطابق مع Priority في السيرفر)
export const PRIORITY_LEVELS = {
  low: { label: 'منخفضة', color: '#9e9e9e', chipColor: 'default' },
  normal: { label: 'عادية', color: '#2196f3', chipColor: 'info' },
  high: { label: 'عالية', color: '#ff9800', chipColor: 'warning' },
  urgent: { label: 'عاجلة', color: '#f44336', chipColor: 'error' },
};

// مستويات السرية (متطابق مع ConfidentialityLevel في السيرفر)
export const CONFIDENTIALITY_LEVELS = {
  public: { label: 'عام', color: '#4caf50' },
  internal: { label: 'داخلي', color: '#2196f3' },
  confidential: { label: 'سري', color: '#ff9800' },
  highly_confidential: { label: 'سري للغاية', color: '#f44336' },
};

// أنواع المرسل/المستلم (متطابق مع SenderType في السيرفر)
export const SENDER_TYPES = {
  internal: {
    label: 'جهة داخلية',
    icon: 'Business',
    entityModels: ['Branch', 'Department', 'User'],
  },
  external: { label: 'جهة خارجية', icon: 'Public', entityModels: ['ExternalEntity'] },
  government: { label: 'جهة حكومية', icon: 'AccountBalance', entityModels: ['ExternalEntity'] },
  private: { label: 'قطاع خاص', icon: 'Store', entityModels: ['ExternalEntity'] },
};

// نماذج الكيانات
export const ENTITY_MODELS = ['Branch', 'Department', 'User', 'ExternalEntity'];

// الأقسام
export const DEPARTMENTS = [
  { value: 'general_management', label: 'الإدارة العامة' },
  { value: 'hr', label: 'الموارد البشرية' },
  { value: 'finance', label: 'المالية' },
  { value: 'it', label: 'تقنية المعلومات' },
  { value: 'medical', label: 'الشؤون الطبية' },
  { value: 'rehabilitation', label: 'التأهيل' },
  { value: 'education', label: 'التعليم' },
  { value: 'legal', label: 'الشؤون القانونية' },
  { value: 'public_relations', label: 'العلاقات العامة' },
  { value: 'purchasing', label: 'المشتريات' },
  { value: 'maintenance', label: 'الصيانة' },
  { value: 'quality', label: 'الجودة' },
  { value: 'operations', label: 'العمليات' },
  { value: 'executive', label: 'المدير التنفيذي' },
];

// التبويبات الافتراضية
export const DEFAULT_TABS = {
  all: { label: 'الكل', value: '' },
  incoming: { label: 'الوارد', value: 'incoming' },
  outgoing: { label: 'الصادر', value: 'outgoing' },
  internal: { label: 'الداخلي', value: 'internal' },
  draft: { label: 'المسودات', value: 'draft' },
  archived: { label: 'الأرشيف', value: 'archived' },
};
