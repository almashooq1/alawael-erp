/**
 * Employee Affairs Phase 2 — Frontend API Service
 * خدمة شؤون الموظفين المرحلة الثانية (الواجهة)
 *
 * Modules: Tasks, Housing, Custody, Work Permits, Rewards, Shifts
 */
import { safeFetch } from './safeFetch';

const BASE = '/api/employee-affairs-phase2';

// ═══════════════════════════════════════════════════════════════════════════
// Dashboard
// ═══════════════════════════════════════════════════════════════════════════
export const getPhase2Dashboard = () => safeFetch(`${BASE}/phase2-dashboard`, {}, DEMO_DASHBOARD);

// ═══════════════════════════════════════════════════════════════════════════
// Tasks — المهام
// ═══════════════════════════════════════════════════════════════════════════
export const getTasks = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return safeFetch(`${BASE}/tasks?${qs}`, {}, { tasks: DEMO_TASKS, total: DEMO_TASKS.length });
};
export const getTaskStats = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return safeFetch(`${BASE}/tasks/stats?${qs}`, {}, DEMO_TASK_STATS);
};
export const createTask = data =>
  safeFetch(`${BASE}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const getTaskById = id => safeFetch(`${BASE}/tasks/${id}`);
export const updateTaskStatus = (id, data) =>
  safeFetch(`${BASE}/tasks/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const addTaskComment = (id, data) =>
  safeFetch(`${BASE}/tasks/${id}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const delegateTask = (id, data) =>
  safeFetch(`${BASE}/tasks/${id}/delegate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const rateTask = (id, data) =>
  safeFetch(`${BASE}/tasks/${id}/rate`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

// ═══════════════════════════════════════════════════════════════════════════
// Housing — السكن
// ═══════════════════════════════════════════════════════════════════════════
export const getHousingUnits = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return safeFetch(
    `${BASE}/housing/units?${qs}`,
    {},
    { units: DEMO_HOUSING_UNITS, total: DEMO_HOUSING_UNITS.length }
  );
};
export const createHousingUnit = data =>
  safeFetch(`${BASE}/housing/units`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const getHousingAssignments = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return safeFetch(`${BASE}/housing/assignments?${qs}`);
};
export const assignHousing = data =>
  safeFetch(`${BASE}/housing/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const getHousingStats = () => safeFetch(`${BASE}/housing/stats`, {}, DEMO_HOUSING_STATS);

// ═══════════════════════════════════════════════════════════════════════════
// Transportation — المواصلات
// ═══════════════════════════════════════════════════════════════════════════
export const getTransportationRoutes = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return safeFetch(`${BASE}/transportation/routes?${qs}`, {}, DEMO_TRANSPORT_ROUTES);
};
export const createTransportationRoute = data =>
  safeFetch(`${BASE}/transportation/routes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const assignEmployeeToRoute = (routeId, employeeId) =>
  safeFetch(`${BASE}/transportation/routes/${routeId}/assign/${employeeId}`, { method: 'PATCH' });

// ═══════════════════════════════════════════════════════════════════════════
// Custody — العهد
// ═══════════════════════════════════════════════════════════════════════════
export const getCustodies = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return safeFetch(
    `${BASE}/custody?${qs}`,
    {},
    { custodies: DEMO_CUSTODIES, total: DEMO_CUSTODIES.length }
  );
};
export const getCustodyStats = () => safeFetch(`${BASE}/custody/stats`, {}, DEMO_CUSTODY_STATS);
export const createCustody = data =>
  safeFetch(`${BASE}/custody`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const getCustodyById = id => safeFetch(`${BASE}/custody/${id}`);
export const returnCustody = (id, data) =>
  safeFetch(`${BASE}/custody/${id}/return`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const reportCustodyIssue = (id, data) =>
  safeFetch(`${BASE}/custody/${id}/issue`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const getEmployeeCustodies = employeeId =>
  safeFetch(`${BASE}/custody/employee/${employeeId}`);

// ═══════════════════════════════════════════════════════════════════════════
// Work Permits — التصاريح والإقامات
// ═══════════════════════════════════════════════════════════════════════════
export const getWorkPermits = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return safeFetch(
    `${BASE}/permits?${qs}`,
    {},
    { permits: DEMO_PERMITS, total: DEMO_PERMITS.length }
  );
};
export const getWorkPermitStats = () => safeFetch(`${BASE}/permits/stats`, {}, DEMO_PERMIT_STATS);
export const getExpiringPermits = (days = 30) => safeFetch(`${BASE}/permits/expiring?days=${days}`);
export const createWorkPermit = data =>
  safeFetch(`${BASE}/permits`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const getWorkPermitById = id => safeFetch(`${BASE}/permits/${id}`);
export const renewWorkPermit = (id, data) =>
  safeFetch(`${BASE}/permits/${id}/renew`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

// ═══════════════════════════════════════════════════════════════════════════
// Rewards — المكافآت
// ═══════════════════════════════════════════════════════════════════════════
export const getRewards = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return safeFetch(
    `${BASE}/rewards?${qs}`,
    {},
    { rewards: DEMO_REWARDS, total: DEMO_REWARDS.length }
  );
};
export const getRewardStats = () => safeFetch(`${BASE}/rewards/stats`, {}, DEMO_REWARD_STATS);
export const createReward = data =>
  safeFetch(`${BASE}/rewards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const getRewardById = id => safeFetch(`${BASE}/rewards/${id}`);
export const approveReward = (id, data) =>
  safeFetch(`${BASE}/rewards/${id}/approve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const disburseReward = (id, data) =>
  safeFetch(`${BASE}/rewards/${id}/disburse`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const getEmployeeRewardPoints = employeeId =>
  safeFetch(`${BASE}/rewards/employee/${employeeId}/points`);

// ═══════════════════════════════════════════════════════════════════════════
// Shifts — الورديات
// ═══════════════════════════════════════════════════════════════════════════
export const getShiftDefinitions = () =>
  safeFetch(`${BASE}/shifts/definitions`, {}, DEMO_SHIFT_DEFS);
export const createShiftDefinition = data =>
  safeFetch(`${BASE}/shifts/definitions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const createShiftAssignment = data =>
  safeFetch(`${BASE}/shifts/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const bulkCreateShiftAssignments = assignments =>
  safeFetch(`${BASE}/shifts/assignments/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignments }),
  });
export const getEmployeeSchedule = (employeeId, startDate, endDate) =>
  safeFetch(
    `${BASE}/shifts/schedule/employee/${employeeId}?startDate=${startDate}&endDate=${endDate}`
  );
export const getDepartmentSchedule = (department, date) =>
  safeFetch(`${BASE}/shifts/schedule/department/${department}?date=${date}`);
export const recordShiftAttendance = (id, data) =>
  safeFetch(`${BASE}/shifts/assignments/${id}/attendance`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const getShiftStats = department =>
  safeFetch(
    `${BASE}/shifts/stats${department ? `?department=${department}` : ''}`,
    {},
    DEMO_SHIFT_STATS
  );
export const createShiftSwapRequest = data =>
  safeFetch(`${BASE}/shifts/swap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
export const approveShiftSwap = (id, data) =>
  safeFetch(`${BASE}/shifts/swap/${id}/approve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

// ═══════════════════════════════════════════════════════════════════════════
// Demo Data
// ═══════════════════════════════════════════════════════════════════════════
const DEMO_TASKS = [
  {
    _id: 'd1',
    taskNumber: 'TSK-2026-00001',
    title: 'إعداد تقرير الأداء الشهري',
    type: 'مهمة عادية',
    priority: 'عالية',
    status: 'قيد التنفيذ',
    progress: 60,
    assignedTo: { firstName: 'أحمد', lastName: 'محمد' },
    assignedBy: { firstName: 'خالد', lastName: 'العلي' },
    dueDate: '2026-03-20',
    department: 'الموارد البشرية',
  },
  {
    _id: 'd2',
    taskNumber: 'TSK-2026-00002',
    title: 'مراجعة عقود الموظفين الجدد',
    type: 'تكليف رسمي',
    priority: 'متوسطة',
    status: 'جديدة',
    progress: 0,
    assignedTo: { firstName: 'سارة', lastName: 'أحمد' },
    assignedBy: { firstName: 'خالد', lastName: 'العلي' },
    dueDate: '2026-03-25',
    department: 'الموارد البشرية',
  },
  {
    _id: 'd3',
    taskNumber: 'TSK-2026-00003',
    title: 'تحديث سياسات الإجازات',
    type: 'مشروع',
    priority: 'حرجة',
    status: 'مراجعة',
    progress: 90,
    assignedTo: { firstName: 'فاطمة', lastName: 'علي' },
    assignedBy: { firstName: 'خالد', lastName: 'العلي' },
    dueDate: '2026-03-15',
    department: 'الموارد البشرية',
  },
];

const DEMO_TASK_STATS = {
  total: 45,
  overdue: 3,
  byStatus: [
    { _id: 'قيد التنفيذ', count: 15 },
    { _id: 'جديدة', count: 10 },
    { _id: 'مكتملة', count: 18 },
    { _id: 'مؤجلة', count: 2 },
  ],
  byPriority: [
    { _id: 'عالية', count: 8 },
    { _id: 'متوسطة', count: 20 },
    { _id: 'حرجة', count: 5 },
  ],
};

const DEMO_HOUSING_UNITS = [
  {
    _id: 'h1',
    unitNumber: 'HU-0001',
    building: 'مبنى A',
    type: 'شقة',
    capacity: 2,
    status: 'متاح',
    address: { city: 'الرياض', district: 'العليا' },
    monthlyRent: 3000,
  },
  {
    _id: 'h2',
    unitNumber: 'HU-0002',
    building: 'مبنى B',
    type: 'غرفة مشتركة',
    capacity: 4,
    status: 'مشغول',
    address: { city: 'الرياض', district: 'النسيم' },
    monthlyRent: 1500,
  },
];

const DEMO_HOUSING_STATS = {
  totalUnits: 50,
  available: 12,
  occupied: 35,
  totalRoutes: 8,
  activeAssignments: 45,
};

const DEMO_TRANSPORT_ROUTES = [
  {
    _id: 'tr1',
    routeNumber: 'TR-001',
    name: 'خط العليا - المقر الرئيسي',
    type: 'باص',
    capacity: 30,
    status: 'نشط',
    driverName: 'سالم العتيبي',
    schedule: { departureTime: '07:00', returnTime: '16:30' },
  },
  {
    _id: 'tr2',
    routeNumber: 'TR-002',
    name: 'خط النسيم - المقر الرئيسي',
    type: 'ميكروباص',
    capacity: 15,
    status: 'نشط',
    driverName: 'محمد الشهري',
    schedule: { departureTime: '07:15', returnTime: '16:30' },
  },
];

const DEMO_CUSTODIES = [
  {
    _id: 'c1',
    custodyNumber: 'CUS-2026-00001',
    assetName: 'لابتوب Dell Latitude',
    assetCategory: 'حاسب محمول',
    serialNumber: 'SN-12345',
    status: 'مسلّمة',
    condition: 'جيد',
    employeeId: { firstName: 'أحمد', lastName: 'محمد' },
    assignedDate: '2026-01-15',
    currentValue: 4500,
  },
  {
    _id: 'c2',
    custodyNumber: 'CUS-2026-00002',
    assetName: 'هاتف iPhone 15',
    assetCategory: 'هاتف جوال',
    serialNumber: 'SN-67890',
    status: 'مسلّمة',
    condition: 'ممتاز',
    employeeId: { firstName: 'سارة', lastName: 'أحمد' },
    assignedDate: '2026-02-01',
    currentValue: 3800,
  },
  {
    _id: 'c3',
    custodyNumber: 'CUS-2026-00003',
    assetName: 'مفاتيح مكتب 301',
    assetCategory: 'مفاتيح',
    status: 'مسلّمة',
    condition: 'جيد',
    employeeId: { firstName: 'فاطمة', lastName: 'علي' },
    assignedDate: '2026-01-10',
    currentValue: 0,
  },
];

const DEMO_CUSTODY_STATS = {
  total: 120,
  byCategory: [
    { _id: 'حاسب محمول', count: 45, totalValue: 202500 },
    { _id: 'هاتف جوال', count: 30, totalValue: 114000 },
    { _id: 'مفاتيح', count: 25, totalValue: 0 },
  ],
  byStatus: [
    { _id: 'مسلّمة', count: 95 },
    { _id: 'مرتجعة', count: 20 },
    { _id: 'قيد الصيانة', count: 5 },
  ],
};

const DEMO_PERMITS = [
  {
    _id: 'p1',
    recordNumber: 'IQA-2026-00001',
    documentType: 'إقامة',
    documentNumber: '2412345678',
    status: 'ساري',
    employeeId: { firstName: 'راجيش', lastName: 'كومار' },
    issueDate: '2025-06-01',
    expiryDate: '2026-06-01',
    fees: { totalCost: 650 },
  },
  {
    _id: 'p2',
    recordNumber: 'WP-2026-00001',
    documentType: 'رخصة عمل',
    documentNumber: 'WP-98765',
    status: 'قارب الانتهاء',
    employeeId: { firstName: 'محمد', lastName: 'عبدالله' },
    issueDate: '2025-04-01',
    expiryDate: '2026-04-01',
    fees: { totalCost: 800 },
  },
  {
    _id: 'p3',
    recordNumber: 'DOC-2026-00001',
    documentType: 'تأشيرة خروج وعودة',
    documentNumber: 'VIS-111222',
    status: 'ساري',
    employeeId: { firstName: 'أحمد', lastName: 'حسن' },
    issueDate: '2026-03-01',
    expiryDate: '2026-05-01',
    fees: { totalCost: 200 },
  },
];

const DEMO_PERMIT_STATS = {
  total: 85,
  expired: 5,
  expiringSoon: 12,
  byType: [
    { _id: 'إقامة', count: 40 },
    { _id: 'رخصة عمل', count: 30 },
    { _id: 'تأشيرة خروج وعودة', count: 15 },
  ],
  byStatus: [
    { _id: 'ساري', count: 60 },
    { _id: 'قارب الانتهاء', count: 12 },
  ],
  totalCost: 52000,
};

const DEMO_REWARDS = [
  {
    _id: 'r1',
    rewardNumber: 'RWD-2026-00001',
    type: 'حافز أداء متميز',
    category: 'مالية',
    amount: 5000,
    status: 'معتمد',
    employeeId: { firstName: 'أحمد', lastName: 'محمد' },
    reason: 'تجاوز أهداف الربع الأول',
    nominatedBy: { firstName: 'خالد', lastName: 'العلي' },
  },
  {
    _id: 'r2',
    rewardNumber: 'RWD-2026-00002',
    type: 'تقدير موظف الشهر',
    category: 'تقديرية',
    amount: 0,
    status: 'تم الصرف',
    employeeId: { firstName: 'سارة', lastName: 'أحمد' },
    reason: 'أداء استثنائي في مشروع التحول الرقمي',
    nominatedBy: { firstName: 'خالد', lastName: 'العلي' },
  },
  {
    _id: 'r3',
    rewardNumber: 'RWD-2026-00003',
    type: 'مكافأة مشروع',
    category: 'مالية',
    amount: 10000,
    status: 'مقترح',
    employeeId: { firstName: 'فاطمة', lastName: 'علي' },
    reason: 'إنجاز مشروع النظام الجديد قبل الموعد',
    nominatedBy: { firstName: 'خالد', lastName: 'العلي' },
  },
];

const DEMO_REWARD_STATS = {
  total: 35,
  byType: [
    { _id: 'حافز أداء متميز', count: 12, total: 60000 },
    { _id: 'مكافأة مشروع', count: 8, total: 80000 },
  ],
  byStatus: [
    { _id: 'تم الصرف', count: 20 },
    { _id: 'معتمد', count: 10 },
  ],
  totalDisbursed: 140000,
  monthlySpend: [
    { _id: 1, total: 30000, count: 5 },
    { _id: 2, total: 45000, count: 8 },
  ],
};

const DEMO_SHIFT_DEFS = [
  {
    _id: 's1',
    shiftCode: 'MORN',
    name: 'وردية صباحية',
    type: 'صباحي',
    startTime: '08:00',
    endTime: '16:00',
    workingHours: 8,
    color: '#4caf50',
    isActive: true,
  },
  {
    _id: 's2',
    shiftCode: 'EVE',
    name: 'وردية مسائية',
    type: 'مسائي',
    startTime: '16:00',
    endTime: '00:00',
    workingHours: 8,
    color: '#ff9800',
    isActive: true,
  },
  {
    _id: 's3',
    shiftCode: 'NGT',
    name: 'وردية ليلية',
    type: 'ليلي',
    startTime: '00:00',
    endTime: '08:00',
    workingHours: 8,
    color: '#7b1fa2',
    nightShiftAllowance: 15,
    isActive: true,
  },
];

const DEMO_SHIFT_STATS = {
  todayStats: [
    { _id: 'حاضر', count: 45 },
    { _id: 'مجدول', count: 10 },
    { _id: 'غائب', count: 3 },
  ],
  shiftTypes: [
    { _id: 'صباحي', count: 30 },
    { _id: 'مسائي', count: 20 },
  ],
  totalDefinitions: 5,
};

const DEMO_DASHBOARD = {
  tasks: DEMO_TASK_STATS,
  housing: DEMO_HOUSING_STATS,
  custody: DEMO_CUSTODY_STATS,
  permits: DEMO_PERMIT_STATS,
  rewards: DEMO_REWARD_STATS,
  shifts: DEMO_SHIFT_STATS,
};
