/**
 * Communications Constants — تصنيفات وحالات المراسلات
 */

import {
  Send as SendIcon,
  Drafts as DraftsIcon,
  Archive as ArchiveIcon,
  Reply as ReplyIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
  Visibility as VisibilityIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Message as MessageIcon,
} from '@mui/icons-material';

// تصنيفات المراسلات
export const COMMUNICATION_TYPES = {
  incoming: { label: 'وارد', color: 'primary', icon: <EmailIcon /> },
  outgoing: { label: 'صادر', color: 'success', icon: <SendIcon /> },
  internal: { label: 'داخلي', color: 'info', icon: <MessageIcon /> },
  external: { label: 'خارجي', color: 'warning', icon: <BusinessIcon /> },
};

// حالات المراسلات
export const COMMUNICATION_STATUS = {
  draft: { label: 'مسودة', color: 'default', icon: <DraftsIcon /> },
  pending: { label: 'قيد الانتظار', color: 'warning', icon: <PendingIcon /> },
  sent: { label: 'تم الإرسال', color: 'info', icon: <SendIcon /> },
  delivered: { label: 'تم التسليم', color: 'primary', icon: <CheckCircleIcon /> },
  read: { label: 'تمت القراءة', color: 'success', icon: <VisibilityIcon /> },
  replied: { label: 'تم الرد', color: 'success', icon: <ReplyIcon /> },
  archived: { label: 'مؤرشف', color: 'default', icon: <ArchiveIcon /> },
  failed: { label: 'فشل', color: 'error', icon: <ErrorIcon /> },
};

// مستويات الأولوية
export const PRIORITY_LEVELS = {
  low: { label: 'منخفضة', color: 'default' },
  normal: { label: 'عادية', color: 'info' },
  high: { label: 'عالية', color: 'warning' },
  urgent: { label: 'عاجلة', color: 'error' },
};

export const INITIAL_COMMUNICATION = {
  type: 'outgoing',
  subject: '',
  content: '',
  recipientType: 'external',
  recipientName: '',
  recipientContact: '',
  department: '',
  priority: 'normal',
  category: '',
  tags: [],
  attachments: [],
  requiresApproval: false,
  requiresReply: false,
  dueDate: '',
};
