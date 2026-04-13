/**
 * Operations constants — statusColors, tabs config, column maps, dialog fields
 */



export const OP_STATUS_COLORS = {
  active: 'success',
  operational: 'success',
  completed: 'info',
  approved: 'success',
  inactive: 'default',
  pending: 'warning',
  'in-progress': 'warning',
  expired: 'error',
  'out-of-service': 'error',
  overdue: 'error',
  rejected: 'error',
};

export const TABS = [
  { label: 'الأصول', icon: <AssetIcon />, key: 'assets' },
  { label: 'المعدات', icon: <EquipmentIcon />, key: 'equipment' },
  { label: 'الصيانة', icon: <MaintenanceIcon />, key: 'maintenance' },
  { label: 'الجداول', icon: <ScheduleIcon />, key: 'schedules' },
  { label: 'التراخيص', icon: <LicenseIcon />, key: 'licenses' },
  { label: 'الفروع', icon: <BranchIcon />, key: 'branches' },
];

export const COL_MAP = {
  assets: {
    cols: ['name', 'type', 'location', 'value', 'status', 'acquisitionDate'],
    headers: ['الاسم', 'النوع', 'الموقع', 'القيمة', 'الحالة', 'تاريخ الاقتناء'],
  },
  equipment: {
    cols: ['name', 'serialNumber', 'department', 'status', 'lastMaintenance', 'nextMaintenance'],
    headers: ['الاسم', 'الرقم التسلسلي', 'القسم', 'الحالة', 'آخر صيانة', 'الصيانة القادمة'],
  },
  maintenance: {
    cols: ['title', 'equipment', 'priority', 'status', 'scheduledDate', 'assignedTo'],
    headers: ['العنوان', 'المعدة', 'الأولوية', 'الحالة', 'التاريخ المجدول', 'المسؤول'],
  },
  schedules: {
    cols: ['title', 'type', 'frequency', 'nextRun', 'status', 'department'],
    headers: ['العنوان', 'النوع', 'التكرار', 'التشغيل القادم', 'الحالة', 'القسم'],
  },
  licenses: {
    cols: ['name', 'issuer', 'number', 'issueDate', 'expiryDate', 'status'],
    headers: ['الاسم', 'الجهة المصدرة', 'الرقم', 'تاريخ الإصدار', 'تاريخ الانتهاء', 'الحالة'],
  },
  branches: {
    cols: ['name', 'city', 'address', 'manager', 'employees', 'status'],
    headers: ['الاسم', 'المدينة', 'العنوان', 'المدير', 'الموظفون', 'الحالة'],
  },
};

export const DIALOG_FIELDS = {
  assets: [
    { key: 'name', label: 'الاسم' },
    { key: 'type', label: 'النوع' },
    { key: 'location', label: 'الموقع' },
    { key: 'value', label: 'القيمة' },
    { key: 'acquisitionDate', label: 'تاريخ الاقتناء', type: 'date' },
  ],
  equipment: [
    { key: 'name', label: 'الاسم' },
    { key: 'serialNumber', label: 'الرقم التسلسلي' },
    { key: 'department', label: 'القسم' },
  ],
  maintenance: [
    { key: 'title', label: 'العنوان' },
    { key: 'equipment', label: 'المعدة' },
    { key: 'scheduledDate', label: 'التاريخ المجدول', type: 'date' },
    { key: 'assignedTo', label: 'المسؤول' },
  ],
  schedules: [
    { key: 'title', label: 'العنوان' },
    { key: 'type', label: 'النوع' },
    { key: 'frequency', label: 'التكرار' },
    { key: 'department', label: 'القسم' },
  ],
  licenses: [
    { key: 'name', label: 'الاسم' },
    { key: 'issuer', label: 'الجهة المصدرة' },
    { key: 'number', label: 'الرقم' },
    { key: 'issueDate', label: 'تاريخ الإصدار', type: 'date' },
    { key: 'expiryDate', label: 'تاريخ الانتهاء', type: 'date' },
  ],
  branches: [
    { key: 'name', label: 'الاسم' },
    { key: 'city', label: 'المدينة' },
    { key: 'address', label: 'العنوان' },
    { key: 'manager', label: 'المدير' },
    { key: 'employees', label: 'عدد الموظفين', type: 'number' },
  ],
};
