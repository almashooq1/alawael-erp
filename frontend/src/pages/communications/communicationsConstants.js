/**
 * Communications Constants — تصنيفات وحالات المراسلات
 */




// تصنيفات المراسلات
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';
import MessageIcon from '@mui/icons-material/Message';
import BusinessIcon from '@mui/icons-material/Business';
import DraftsIcon from '@mui/icons-material/Drafts';
import PendingIcon from '@mui/icons-material/Pending';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReplyIcon from '@mui/icons-material/Reply';
import ArchiveIcon from '@mui/icons-material/Archive';
import ErrorIcon from '@mui/icons-material/Error';
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
