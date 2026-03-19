/** Status ↔ Chip config */
import { severityColors } from '../../../theme/palette';

export const STATUS_MAP = {
  active: { label: 'نشط', color: 'success' },
  inactive: { label: 'غير نشط', color: 'default' },
  graduated: { label: 'متخرج', color: 'info' },
  suspended: { label: 'موقوف', color: 'warning' },
  transferred: { label: 'محوّل', color: 'secondary' },
  withdrawn: { label: 'منسحب', color: 'error' },
};

/** Severity level config */
export const SEVERITY_MAP = {
  mild: { label: 'خفيفة', color: severityColors.mild },
  moderate: { label: 'متوسطة', color: severityColors.moderate },
  severe: { label: 'شديدة', color: severityColors.severe },
  profound: { label: 'عميقة', color: severityColors.profound },
};

/** Arabic labels for disability types */
export const DISABILITY_LABELS = {
  intellectual: 'إعاقة ذهنية',
  autism: 'اضطراب طيف التوحد',
  cerebral_palsy: 'شلل دماغي',
  down_syndrome: 'متلازمة داون',
  hearing: 'إعاقة سمعية',
  visual: 'إعاقة بصرية',
  physical: 'إعاقة حركية',
  speech: 'اضطراب نطقي',
  learning: 'صعوبات تعلم',
  multiple: 'إعاقة متعددة',
};

/** Table head cell definitions */
export const HEAD_CELLS = [
  { id: 'name', label: 'الاسم', sortable: true },
  { id: 'nationalId', label: 'الهوية', sortable: true },
  { id: 'disabilityType', label: 'نوع الإعاقة', sortable: false },
  { id: 'severity', label: 'الشدة', sortable: false },
  { id: 'programs', label: 'البرامج', sortable: false },
  { id: 'status', label: 'الحالة', sortable: true },
  { id: 'enrollmentDate', label: 'تاريخ التسجيل', sortable: true },
  { id: 'actions', label: 'الإجراءات', sortable: false },
];
